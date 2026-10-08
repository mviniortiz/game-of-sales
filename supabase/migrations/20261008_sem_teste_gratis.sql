-- Sem teste grátis (decisão do Markus, 08/10/2026). Conta nova nasce sem plano;
-- o que é grátis é o Raio-X automático. A EVA só age (lê conversa, escreve
-- retomada, roda o agente, aprende contexto) em empresa paga: assinatura ativa,
-- marcada pelo Markus em AdminCompanyDetail ou pelo service role.

create or replace function public.company_is_paid(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
    select exists (
        select 1 from public.companies
        where id = p_company_id and subscription_status = 'active'
    );
$$;
grant execute on function public.company_is_paid(uuid) to authenticated, service_role;

-- Cadastro pelo site: sem plano e sem teste.
create or replace function public.guard_company_billing()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Só chamada vinda do site (anon ou authenticated) é travada. Edges com
  -- service_role e sessões diretas no banco (migrations, cron) não têm esse
  -- papel. current_user não serve aqui: em security definer ele é o dono.
  if coalesce(auth.role(), '') not in ('anon', 'authenticated')
     or coalesce(public.is_super_admin(), false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := 'free';
    new.subscription_status := 'inactive';
    new.trial_ends_at := null;
    new.subscription_cancelled_at := null;
    new.subscription_ends_at := null;
    new.mp_subscription_id := null;
    new.mp_plan_id := null;
    new.mp_customer_id := null;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.subscription_cancelled_at is distinct from old.subscription_cancelled_at
     or new.subscription_ends_at is distinct from old.subscription_ends_at
     or new.mp_subscription_id is distinct from old.mp_subscription_id
     or new.mp_plan_id is distinct from old.mp_plan_id
     or new.mp_customer_id is distinct from old.mp_customer_id then
    raise exception 'Plano e assinatura são alterados só pelo Vyzon.' using errcode = '42501';
  end if;
  return new;
end;
$function$;

-- Retomada só em empresa paga.
create or replace function public.quote_followup_candidates(p_limit integer default 50)
returns setof quote_tracking_live
language sql
stable
security definer
set search_path to 'public'
as $function$
    select l.*
      from public.quote_tracking_live l
     where ((l.state = 'no_reply' and l.status = 'open'
             and l.company_at < now() - interval '2 days')
         or (l.state = 'went_quiet'
             and (l.last_draft_at is null or l.last_draft_at < l.client_at)))
       and public.company_is_paid(l.company_id)
     order by l.amount desc nulls last, l.sent_at
     limit greatest(coalesce(p_limit, 50), 0);
$function$;

-- Leitura automática: limpa a fila de todas, devolve só as de empresa paga
-- (senão a conversa de conta sem plano ficava vencida e chamava a edge todo minuto).
create or replace function public.claim_eva_reads(p_limit integer default 20)
returns table(conversation_id uuid, company_id uuid, contact_id uuid, deal_id uuid, created_at timestamp with time zone)
language sql
security definer
set search_path to 'public'
as $function$
    with claimed as (
        update public.channel_conversations c
           set eva_read_due_at = null
         where c.id in (
             select id from public.channel_conversations
              where eva_read_due_at <= now()
              order by eva_read_due_at
              limit p_limit
              for update skip locked
         )
        returning c.id, c.company_id, c.contact_id, c.deal_id, c.created_at
    )
    select * from claimed where public.company_is_paid(claimed.company_id);
$function$;

create or replace function public.trigger_eva_agent_tick(p_max_per_company integer default 3)
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
    v_url         text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-agent-loop';
    v_cron_secret text;
    v_anon_key    text;
    v_company     record;
    v_deal        record;
    v_disparos    integer := 0;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_agent_tick: segredo ausente no vault, pulando';
        return 0;
    end if;

    -- Só empresa paga com WhatsApp de pé: sem canal ativo a EVA não tem o que
    -- ler nem por onde pedir aprovação.
    for v_company in
        select c.id
        from companies c
        where public.company_is_paid(c.id)
          and exists (
            select 1 from channel_connections cc
            where cc.company_id = c.id
              and cc.provider = 'evolution'
              and cc.status = 'active'
        )
    loop
        for v_deal in
            select d.id
            from deals d
            where d.company_id = v_company.id
              and d.stage not in ('closed_won', 'closed_lost')
              and d.updated_at < now() - interval '3 days'
            order by d.updated_at asc
            limit p_max_per_company
        loop
            perform net.http_post(
                url := v_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_anon_key,
                    'x-cron-secret', v_cron_secret
                ),
                body := jsonb_build_object(
                    'company_id', v_company.id,
                    'deal_id', v_deal.id,
                    'goal', 'Este card esta parado. Leia o contexto e o resumo da conversa, decida o proximo passo e execute o que for interno. Se o certo for falar com o lead, rascunhe a mensagem para aprovacao.'
                ),
                timeout_milliseconds := 60000
            );
            v_disparos := v_disparos + 1;
        end loop;
    end loop;

    return v_disparos;
end;
$function$;

create or replace function public.trigger_eva_learn_context()
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
    v_url         text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-learn-from-conversations';
    v_cron_secret text;
    v_anon_key    text;
    v_company     record;
    v_disparos    integer := 0;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_learn_context: segredo ausente no vault, pulando';
        return 0;
    end if;

    for v_company in
        select cs.company_id
        from public.conversation_summaries cs
        where public.company_is_paid(cs.company_id)
        group by cs.company_id
        having count(*) >= 3
    loop
        -- Fila de conversa ainda aberta significa que o humano nem olhou a
        -- rodada anterior. Propor mais é ruído.
        if exists (
            select 1 from public.eva_context_suggestions s
            where s.company_id = v_company.company_id
              and s.source = 'conversations'
              and s.status = 'pending'
        ) then
            continue;
        end if;

        perform net.http_post(
            url := v_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'x-cron-secret', v_cron_secret
            ),
            body := jsonb_build_object('company_id', v_company.company_id, 'limit', 25),
            timeout_milliseconds := 120000
        );
        v_disparos := v_disparos + 1;
    end loop;

    return v_disparos;
end;
$function$;

-- Testes que já venceram deixam de ser "trialing".
update public.companies
   set subscription_status = 'inactive', trial_ends_at = null
 where subscription_status = 'trialing';
