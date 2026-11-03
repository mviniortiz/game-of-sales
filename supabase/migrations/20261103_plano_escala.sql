-- PLANO.ESCALA (2026-11-03): plano sob medida para quem vende por mais de um
-- WhatsApp. Sem preço: a página /escala tem um formulário que entra na mesma
-- fila de leads do site (demo_requests, source='plano_escala'). De lá:
--   - trg_create_deal_from_demo cria o card "Escala: <empresa>" no funil do
--     Markus, com as respostas nas notas;
--   - trg_admin_lead_digest avisa o Markus, como todo lead;
--   - trg_sdr_auto_outreach NÃO dispara: quem conversa é o Markus.
--
-- Aditiva: nenhuma coluna nova; as respostas vão em team_size, biggest_pain e
-- notes. Funções recriadas a partir da versão em produção de 03/11/2026.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261103_plano_escala.sql

create or replace function public.submit_escala_request(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
  v_phone text;
begin
  v_email := lower(nullif(trim(payload->>'email'), ''));
  v_phone := nullif(regexp_replace(coalesce(payload->>'phone', ''), '\D', '', 'g'), '');
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email is required' using errcode = '23502';
  end if;
  if v_phone is null or length(v_phone) < 10 then
    raise exception 'phone is required' using errcode = '23502';
  end if;

  insert into public.demo_requests (
    name, email, company, phone, source, status, team_size, biggest_pain, notes,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    gclid, fbclid, referrer, landing_page
  ) values (
    left(coalesce(nullif(trim(payload->>'name'), ''), 'Lead'), 120),
    v_email,
    left(nullif(trim(payload->>'company'), ''), 120),
    v_phone,
    'plano_escala',
    'pending',
    left(nullif(trim(payload->>'team_size'), ''), 40),
    left(nullif(trim(payload->>'need'), ''), 1500),
    'Números de WhatsApp: ' || coalesce(left(nullif(trim(payload->>'numbers'), ''), 40), 'não informado')
      || E'\nPropostas por mês: ' || coalesce(left(nullif(trim(payload->>'proposals'), ''), 40), 'não informado')
      || E'\nVendedores: ' || coalesce(left(nullif(trim(payload->>'team_size'), ''), 40), 'não informado'),
    payload->>'utm_source',
    payload->>'utm_medium',
    payload->>'utm_campaign',
    payload->>'utm_term',
    payload->>'utm_content',
    payload->>'gclid',
    payload->>'fbclid',
    payload->>'referrer',
    payload->>'landing_page'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_escala_request(jsonb) from public;
grant execute on function public.submit_escala_request(jsonb) to anon, authenticated;

-- Card no funil: título próprio e as respostas do formulário nas notas.
create or replace function public.create_deal_from_demo_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_super_admin_id uuid;
    v_title text;
    v_notes text;
    v_deal_id uuid;
begin
    select id
        into v_super_admin_id
        from public.profiles
        where is_super_admin = true
        order by created_at asc
        limit 1;

    if v_super_admin_id is null then
        raise warning '[demo→deal] nenhum super_admin encontrado; pulando criação de deal para %', new.email;
        return new;
    end if;

    v_title := case
        when new.source = 'orcamento_teste'
            then 'Raio-X: ' || coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email)
        when new.source = 'plano_escala'
            then 'Escala: ' || coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email)
        else coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email) || ' — Demo agendada'
    end;

    v_notes := 'Lead da landing page (demo_requests.id=' || new.id || ')'
        || E'\nOrigem: ' || coalesce(new.source, 'landing_page')
        || case when new.source = 'plano_escala' and new.notes is not null then E'\n' || new.notes else '' end
        || case when new.source = 'plano_escala' and new.biggest_pain is not null then E'\nO que precisa: ' || new.biggest_pain else '' end
        || case when new.heard_from is not null then E'\nOnde nos encontrou: ' || new.heard_from else '' end
        || case when new.utm_source is not null
               then E'\nUTM: ' || new.utm_source
                    || coalesce('/' || new.utm_medium, '')
                    || coalesce(' — ' || new.utm_campaign, '')
               else '' end
        || case when new.gclid is not null then E'\ngclid: ' || new.gclid else '' end
        || case when new.fbclid is not null then E'\nfbclid: ' || new.fbclid else '' end
        || case when new.landing_page is not null then E'
Página: ' || new.landing_page else '' end
        || case when new.utm_content is not null then E'
Anúncio: ' || new.utm_content else '' end;

    insert into public.deals (
        title, customer_name, customer_email, customer_phone, stage, user_id, notes
    ) values (
        v_title,
        coalesce(nullif(new.name, ''), 'Lead'),
        new.email,
        new.phone,
        'lead',
        v_super_admin_id,
        v_notes
    )
    returning id into v_deal_id;

    -- link de volta (trigger é de INSERT; este update não re-dispara o deal)
    update public.demo_requests set deal_id = v_deal_id where id = new.id;

    return new;
exception
    when others then
        raise warning '[demo→deal] erro criando deal para %: %', new.email, sqlerrm;
        return new;
end;
$function$;

-- Pedido do Escala não recebe mensagem automática: o Markus chama.
create or replace function public.trigger_sdr_outreach()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $function$
declare
    v_project_url text;
    v_service_key text;
    v_cron_secret text;
    v_request_id bigint;
begin
    if new.source in ('orcamento_teste', 'plano_escala') then
        return new;
    end if;

    select decrypted_secret into v_project_url
        from vault.decrypted_secrets
        where name = 'project_url'
        limit 1;

    select decrypted_secret into v_service_key
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1;

    select decrypted_secret into v_cron_secret
        from vault.decrypted_secrets
        where name = 'eva_cron_secret'
        limit 1;

    if v_project_url is null or v_service_key is null then
        raise warning '[sdr] secrets do Vault (project_url/service_role_key) não encontradas; pulando outreach';
        return new;
    end if;

    if new.email is null or new.phone is null then
        return new;
    end if;

    select net.http_post(
        url := v_project_url || '/functions/v1/sdr-auto-outreach',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key,
            'x-cron-secret', coalesce(v_cron_secret, '')
        ),
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'id', new.id,
                'name', new.name,
                'email', new.email,
                'company', new.company,
                'phone', new.phone,
                'source', new.source
            )
        )
    ) into v_request_id;

    return new;
exception
    when others then
        raise warning '[sdr] erro ao disparar outreach: %', sqlerrm;
        return new;
end;
$function$;
