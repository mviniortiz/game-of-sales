-- QUOTE.1 (2026-09-16) — "orçamento que some".
--
-- A agência manda o orçamento pelo WhatsApp (PDF ou texto com valor) e o lead
-- some. A evolution-message-webhook detecta o orçamento na mensagem outbound
-- (_shared/quoteDetection.ts), garante um card no pipeline e grava uma linha
-- aqui. A edge eva-quote-followup roda a cada 30 min: se o lead respondeu,
-- marca 'replied'; se passou 2 dias sem resposta, gera o rascunho de retomada
-- em agent_suggestions (kind='followup'), que segue pela aprovação no WhatsApp
-- do dono. Nada sai pro lead sem o dono responder 1.
--
-- Aditiva e idempotente. Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260916_quote_tracking.sql
-- (NUNCA db push). GRANT antes de RLS, escopo por company_id.

-- ── 1) Rastreio de orçamento enviado ────────────────────────────────────────
create table if not exists public.quote_tracking (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  conversation_id     uuid not null references public.channel_conversations(id) on delete cascade,
  contact_id          uuid references public.channel_contacts(id) on delete set null,
  deal_id             uuid references public.deals(id) on delete set null,
  channel_message_id  uuid not null references public.channel_messages(id) on delete cascade,
  amount              numeric,
  detected_by         text not null check (detected_by in ('pdf','text')),
  sent_at             timestamptz not null,
  -- open: esperando resposta · replied: lead respondeu · followup_suggested:
  -- rascunho criado · closed: substituído por orçamento novo, 7 dias sem ação
  -- ou desfecho (won/lost) registrado
  status              text not null default 'open'
                        check (status in ('open','replied','followup_suggested','closed')),
  replied_at          timestamptz,
  suggestion_id       uuid references public.agent_suggestions(id) on delete set null,
  -- quando o rascunho de retomada saiu de fato pro lead (aprovado no WhatsApp)
  followup_sent_at    timestamptz,
  -- desfecho comercial, sincronizado com o card (ganho/perdido) nos dois sentidos
  outcome             text check (outcome in ('won','lost')),
  outcome_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Trava de idempotência do webhook: retry da Evolution não duplica rastreio nem card.
  constraint quote_tracking_message_uniq unique (channel_message_id)
);

create index if not exists idx_quote_tracking_status_sent
  on public.quote_tracking(status, sent_at);
create index if not exists idx_quote_tracking_company_sent
  on public.quote_tracking(company_id, sent_at desc);
create index if not exists idx_quote_tracking_conversation
  on public.quote_tracking(conversation_id);
create index if not exists idx_quote_tracking_deal
  on public.quote_tracking(deal_id) where deal_id is not null;

comment on table public.quote_tracking is
  'QUOTE.1: orçamento enviado pela empresa no WhatsApp. Escrito pela evolution-message-webhook, lido pela eva-quote-followup (2 dias sem resposta vira rascunho de follow-up com aprovação humana).';

drop trigger if exists trg_quote_tracking_updated_at on public.quote_tracking;
create trigger trg_quote_tracking_updated_at before update on public.quote_tracking
  for each row execute procedure public.update_updated_at();

grant select, insert, update, delete on public.quote_tracking to authenticated;
grant all on public.quote_tracking to service_role;
alter table public.quote_tracking enable row level security;

-- SELECT/INSERT/UPDATE por membro da empresa. DELETE só super_admin.
drop policy if exists "quote_tracking_select" on public.quote_tracking;
create policy "quote_tracking_select" on public.quote_tracking for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
drop policy if exists "quote_tracking_insert" on public.quote_tracking;
create policy "quote_tracking_insert" on public.quote_tracking for insert
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
drop policy if exists "quote_tracking_update" on public.quote_tracking;
create policy "quote_tracking_update" on public.quote_tracking for update
  using ( public.is_super_admin() or company_id = public.get_my_company_id() )
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
drop policy if exists "quote_tracking_delete" on public.quote_tracking;
create policy "quote_tracking_delete" on public.quote_tracking for delete
  using ( public.is_super_admin() );

-- ── 2) Cron a cada 30 min ───────────────────────────────────────────────────
-- Credenciais no molde da trigger_eva_approval_notify: anon key no
-- Authorization pra passar pelo gateway, x-cron-secret pra edge confiar.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_eva_quote_followup()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url          text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-quote-followup';
    v_cron_secret  text;
    v_anon_key     text;
    v_request_id   bigint;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_quote_followup: segredo ausente no vault, pulando';
        return null;
    end if;

    select net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := '{}'::jsonb,
        -- a edge chama LLM e Evolution em série; 5s padrão do pg_net não basta.
        timeout_milliseconds := 60000
    ) into v_request_id;

    return v_request_id;
end;
$$;

comment on function public.trigger_eva_quote_followup is
'QUOTE.1: chama a eva-quote-followup, que marca orçamentos respondidos e gera rascunho de retomada para os sem resposta há 2 dias.';

do $$
begin
    perform cron.unschedule('eva-quote-followup-every-30m');
exception when others then null;
end $$;

select cron.schedule(
    'eva-quote-followup-every-30m',
    '*/30 * * * *',
    $$ select public.trigger_eva_quote_followup(); $$
);

-- ── 3) Lead respondeu: marcado no próprio insert da mensagem ────────────────
-- Trigger em vez de código na webhook: vale pra qualquer caminho que grave
-- channel_messages e roda na mesma transação do insert. Grupo não precisa de
-- filtro: trackOutboundQuote nunca rastreia conversa de grupo, então o update
-- não casa nada lá. Reação não conta como resposta.
create or replace function public.quote_tracking_mark_replied()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_ts timestamptz := coalesce(new.message_timestamp, new.created_at, now());
begin
    if new.direction <> 'inbound' or new.conversation_id is null
       or new.message_type = 'reaction' then
        return new;
    end if;

    update public.quote_tracking
       set status = 'replied', replied_at = v_ts
     where conversation_id = new.conversation_id
       and status in ('open','followup_suggested')
       and replied_at is null
       and outcome is null
       and sent_at <= v_ts;

    return new;
end;
$$;

drop trigger if exists trg_quote_tracking_mark_replied on public.channel_messages;
create trigger trg_quote_tracking_mark_replied
  after insert on public.channel_messages
  for each row
  when (new.direction = 'inbound')
  execute function public.quote_tracking_mark_replied();

-- ── 4) Retomada saiu pro lead ───────────────────────────────────────────────
-- whatsappApproval grava 'sent' (ou 'adjusted' com via=whatsapp quando o dono
-- troca o texto) depois do sendText. 'accepted' do app é cópia, não envio.
create or replace function public.quote_tracking_mark_followup_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_quote text := new.input_summary->>'quote_id';
begin
    if v_quote is null
       or v_quote !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return new;
    end if;
    if not (new.status = 'sent'
            or (new.status = 'adjusted' and new.applied_payload->>'via' = 'whatsapp')) then
        return new;
    end if;

    update public.quote_tracking
       set followup_sent_at = coalesce(new.resolved_at, now())
     where id = v_quote::uuid
       and company_id = new.company_id
       and followup_sent_at is null;

    return new;
end;
$$;

drop trigger if exists trg_quote_tracking_followup_sent on public.agent_suggestions;
create trigger trg_quote_tracking_followup_sent
  after update of status on public.agent_suggestions
  for each row
  when (new.status is distinct from old.status and new.status in ('sent','adjusted'))
  execute function public.quote_tracking_mark_followup_sent();

-- ── 5) Desfecho sincronizado com o card ─────────────────────────────────────
-- Ganho/perdido = pipeline_stages.kind do stage_id; o legado deals.stage
-- ('closed_won'/'closed_lost') cobre quem só escreve a coluna antiga.
create or replace function public.quote_deal_stage_outcome(p_stage_id uuid, p_stage text)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (select case s.kind when 'won' then 'won' when 'lost' then 'lost' end
           from public.pipeline_stages s where s.id = p_stage_id),
        case p_stage when 'closed_won' then 'won' when 'closed_lost' then 'lost' end
    );
$$;

-- Status que o orçamento volta a ter quando o desfecho é desfeito.
create or replace function public.quote_status_without_outcome(q public.quote_tracking)
returns text
language sql
immutable
as $$
    select case
        when q.replied_at is not null then 'replied'
        when q.suggestion_id is not null then 'followup_suggested'
        else 'open'
    end;
$$;

create or replace function public.quote_tracking_sync_deal_outcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old text;
    v_new text;
    v_id  uuid;
begin
    -- set_quote_outcome já gravou o orçamento certo antes de mover o card.
    if coalesce(current_setting('vyzon.quote_outcome_sync', true), '') = 'on' then
        return new;
    end if;

    v_old := public.quote_deal_stage_outcome(old.stage_id, old.stage);
    v_new := public.quote_deal_stage_outcome(new.stage_id, new.stage);
    if v_new is not distinct from v_old then
        return new;
    end if;

    if v_new is not null then
        select id into v_id from public.quote_tracking
         where deal_id = new.id and outcome is null
         order by sent_at desc limit 1;
        if v_id is not null then
            update public.quote_tracking
               set outcome = v_new, outcome_at = now(), status = 'closed'
             where id = v_id;
        end if;
    else
        -- Card voltou pra estágio aberto: desfaz o desfecho que ele tinha gerado.
        select id into v_id from public.quote_tracking
         where deal_id = new.id and outcome = v_old
         order by outcome_at desc nulls last limit 1;
        if v_id is not null then
            update public.quote_tracking q
               set outcome = null, outcome_at = null,
                   status = public.quote_status_without_outcome(q)
             where q.id = v_id;
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_quote_tracking_sync_deal_outcome on public.deals;
create trigger trg_quote_tracking_sync_deal_outcome
  after update of stage, stage_id on public.deals
  for each row
  when (new.stage is distinct from old.stage or new.stage_id is distinct from old.stage_id)
  execute function public.quote_tracking_sync_deal_outcome();

-- ── 6) RPCs do painel ───────────────────────────────────────────────────────
create or replace function public.get_quote_board(p_company_id uuid, p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_result jsonb;
begin
    -- coalesce: sem profile os helpers devolvem null e o not(...) deixaria passar
    if not (coalesce(public.is_super_admin(), false)
            or coalesce(p_company_id = public.get_my_company_id(), false)) then
        raise exception 'acesso negado' using errcode = '42501';
    end if;

    with base as (
        select q.id, q.deal_id, q.conversation_id, q.amount, q.sent_at, q.status,
               q.outcome, q.replied_at, q.followup_sent_at,
               coalesce(nullif(trim(c.name), ''), d.customer_name) as contact_name,
               coalesce(c.phone_e164, d.customer_phone)            as contact_phone,
               (q.outcome is null and q.status in ('open','followup_suggested')
                and q.replied_at is null)                          as parked,
               (q.followup_sent_at is not null
                and (q.replied_at > q.followup_sent_at or q.outcome = 'won')) as recovered,
               greatest(0, floor(extract(epoch from (now() - q.sent_at)) / 86400))::int as days_waiting
          from public.quote_tracking q
          left join public.channel_contacts c on c.id = q.contact_id
          left join public.deals d on d.id = q.deal_id
         where q.company_id = p_company_id
           and q.sent_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 0))
    ),
    ranked as (
        select b.*,
               row_number() over (
                   order by b.parked desc,
                            case when b.parked then b.amount end desc nulls last,
                            b.sent_at desc
               ) as rn
          from base b
    )
    select jsonb_build_object(
        'totals', jsonb_build_object(
            'parked_amount',    coalesce(sum(amount) filter (where parked), 0),
            'parked_count',     count(*) filter (where parked),
            'recovered_amount', coalesce(sum(amount) filter (where recovered), 0),
            'recovered_count',  count(*) filter (where recovered),
            'won_amount',       coalesce(sum(amount) filter (where outcome = 'won'), 0),
            'won_count',        count(*) filter (where outcome = 'won'),
            'lost_count',       count(*) filter (where outcome = 'lost'),
            'replied_count',    count(*) filter (where replied_at is not null),
            'total_count',      count(*)
        ),
        'items', coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'deal_id', deal_id,
                    'conversation_id', conversation_id,
                    'contact_name', contact_name,
                    'contact_phone', contact_phone,
                    'amount', amount,
                    'sent_at', sent_at,
                    'status', status,
                    'outcome', outcome,
                    'replied_at', replied_at,
                    'followup_sent_at', followup_sent_at,
                    'recovered', recovered,
                    'days_waiting', days_waiting
                ) order by rn
            ) filter (where rn <= 200),
            '[]'::jsonb
        )
    ) into v_result
    from ranked;

    return v_result;
end;
$$;

comment on function public.get_quote_board(uuid, int) is
'QUOTE.1: painel de orçamentos da empresa (totais + até 200 itens, parados primeiro por valor).';

create or replace function public.set_quote_outcome(p_quote_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_q     public.quote_tracking;
    v_deal  public.deals;
    v_stage public.pipeline_stages;
begin
    if p_outcome is not null and p_outcome not in ('won','lost') then
        raise exception 'outcome inválido: %', p_outcome using errcode = '22023';
    end if;

    select * into v_q from public.quote_tracking where id = p_quote_id for update;
    if not found then
        raise exception 'orçamento não encontrado' using errcode = 'P0002';
    end if;
    if not (coalesce(public.is_super_admin(), false)
            or coalesce(v_q.company_id = public.get_my_company_id(), false)) then
        raise exception 'acesso negado' using errcode = '42501';
    end if;

    if p_outcome is null then
        update public.quote_tracking q
           set outcome = null, outcome_at = null,
               status = case when q.outcome is null then q.status
                             else public.quote_status_without_outcome(q) end
         where q.id = p_quote_id;
        return;
    end if;

    update public.quote_tracking
       set outcome = p_outcome, outcome_at = now(), status = 'closed'
     where id = p_quote_id;

    if v_q.deal_id is null then
        return;
    end if;

    select * into v_deal from public.deals where id = v_q.deal_id;
    if not found or public.quote_deal_stage_outcome(v_deal.stage_id, v_deal.stage) = p_outcome then
        return;
    end if;

    select * into v_stage from public.pipeline_stages
     where pipeline_id = v_deal.pipeline_id and kind = p_outcome
     order by position limit 1;

    -- a trigger de deals não deve reescolher o orçamento: este já foi gravado.
    perform set_config('vyzon.quote_outcome_sync', 'on', true);
    update public.deals
       set stage_id = coalesce(v_stage.id, stage_id),
           stage    = coalesce(v_stage.legacy_key,
                               case p_outcome when 'won' then 'closed_won' else 'closed_lost' end)
     where id = v_deal.id;
    perform set_config('vyzon.quote_outcome_sync', 'off', true);
end;
$$;

comment on function public.set_quote_outcome(uuid, text) is
'QUOTE.1: registra ganho/perdido do orçamento (null desfaz) e move o card pro estágio equivalente.';

revoke all on function public.get_quote_board(uuid, int) from public, anon;
revoke all on function public.set_quote_outcome(uuid, text) from public, anon;
grant execute on function public.get_quote_board(uuid, int) to authenticated, service_role;
grant execute on function public.set_quote_outcome(uuid, text) to authenticated, service_role;
revoke all on function public.quote_deal_stage_outcome(uuid, text) from public, anon;
grant execute on function public.quote_deal_stage_outcome(uuid, text) to authenticated, service_role;

do $$
begin
  raise notice 'QUOTE.1 aplicado: quote_tracking + RLS (4 ops) + GRANT + cron + triggers (resposta, retomada enviada, desfecho do card) + RPCs get_quote_board/set_quote_outcome.';
end $$;
