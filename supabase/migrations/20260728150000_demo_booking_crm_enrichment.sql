-- DEMO.CRM.1 (2026-07-28) — o booking da demo gravava team_size/dor/horário no
-- demo_request, mas o DEAL criado no pipeline da Vyzon ficava só com "Lead —
-- Demo agendada" e notas de UTM. A leitura do site (demo-site-context) nem era
-- persistida. Este patch fecha o circuito: o deal nasce linkado ao request e
-- vai sendo enriquecido conforme o lead avança (site lido → booking concluído).
-- Aplicar com: npx supabase db query --linked -f supabase/migrations/20260728150000_demo_booking_crm_enrichment.sql

-- 1) Colunas novas (aditivas)
alter table public.demo_requests add column if not exists heard_from text;
alter table public.demo_requests add column if not exists site_context jsonb;
alter table public.demo_requests add column if not exists deal_id uuid references public.deals(id) on delete set null;

-- 2) Intake passa a guardar o "onde nos encontrou" (era coletado e descartado)
create or replace function public.submit_demo_intake(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  v_email := lower(nullif(trim(payload->>'email'), ''));
  if v_email is null then
    raise exception 'email is required' using errcode = '23502';
  end if;

  select id into v_id from public.demo_requests
  where email = v_email and created_at > now() - interval '24 hours'
  order by created_at desc limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.demo_requests (
    name, email, company, source, status, notes, heard_from,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    gclid, fbclid, referrer, landing_page
  ) values (
    'Lead',
    v_email,
    nullif(trim(payload->>'company'), ''),
    'demo_intake',
    'pending',
    'Iniciou a demo interativa da landing (lead parcial; ainda não agendou).',
    nullif(trim(payload->>'heard_from'), ''),
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

-- 3) Trigger do deal: linka o deal criado de volta no demo_request e inclui
--    heard_from nas notas quando existir.
create or replace function public.create_deal_from_demo_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

    v_title := coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email) || ' — Demo agendada';

    v_notes := 'Lead da landing page (demo_requests.id=' || new.id || ')'
        || E'\nOrigem: ' || coalesce(new.source, 'landing_page')
        || case when new.heard_from is not null then E'\nOnde nos encontrou: ' || new.heard_from else '' end
        || case when new.utm_source is not null
               then E'\nUTM: ' || new.utm_source
                    || coalesce('/' || new.utm_medium, '')
                    || coalesce(' — ' || new.utm_campaign, '')
               else '' end
        || case when new.gclid is not null then E'\ngclid: ' || new.gclid else '' end
        || case when new.fbclid is not null then E'\nfbclid: ' || new.fbclid else '' end;

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
$$;

-- 4) Leitura do site vira dado persistido + nota no deal ("scraping" que o
--    front já faz via edge demo-site-context, agora aproveitado no CRM).
create or replace function public.attach_demo_site_context(p_id uuid, ctx jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal_id uuid;
  v_name text := left(nullif(trim(ctx->>'name'), ''), 80);
  v_segment text := left(nullif(trim(ctx->>'segment'), ''), 80);
  v_oneliner text := left(nullif(trim(ctx->>'oneliner'), ''), 200);
begin
  if v_name is null and v_segment is null and v_oneliner is null then
    return;
  end if;

  update public.demo_requests
  set site_context = jsonb_build_object('name', v_name, 'segment', v_segment, 'oneliner', v_oneliner)
  where id = p_id and source = 'demo_intake'
  returning deal_id into v_deal_id;

  if v_deal_id is not null then
    update public.deals
    set title = coalesce(v_name, split_part(title, ' — ', 1)) || ' — Demo agendada',
        customer_name = coalesce(v_name, customer_name),
        notes = coalesce(notes, '')
          || E'\n\nLeitura do site (EVA):'
          || coalesce(E'\n· Empresa: ' || v_name, '')
          || coalesce(E'\n· Segmento: ' || v_segment, '')
          || coalesce(E'\n· O que faz: ' || v_oneliner, '')
    where id = v_deal_id
      and notes not like '%Leitura do site (EVA):%'; -- idempotente
  end if;
end;
$$;

revoke all on function public.attach_demo_site_context(uuid, jsonb) from public;
grant execute on function public.attach_demo_site_context(uuid, jsonb) to anon, authenticated;

-- 5) Booking concluído enriquece o DEAL (não só o request): qualificação,
--    horário em Brasília nas notas e previsão de fechamento.
create or replace function public.complete_demo_request(p_id uuid, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_deal_id uuid;
  v_scheduled timestamptz;
  v_team text := nullif(trim(payload->>'team_size'), '');
  v_pain text := nullif(trim(payload->>'biggest_pain'), '');
begin
  v_scheduled := case when nullif(trim(payload->>'scheduled_at'), '') is not null
                      then (payload->>'scheduled_at')::timestamptz end;

  update public.demo_requests set
    company = coalesce(nullif(trim(payload->>'company'), ''), company),
    team_size = coalesce(v_team, team_size),
    biggest_pain = coalesce(v_pain, biggest_pain),
    scheduled_at = coalesce(v_scheduled, scheduled_at),
    status = case when v_scheduled is not null then 'scheduled' else status end,
    notes = 'Concluiu a demo interativa e preencheu o booking.'
  where id = p_id and source = 'demo_intake'
  returning id, deal_id into v_id, v_deal_id;

  if v_id is null then
    raise exception 'demo request not found' using errcode = 'P0002';
  end if;

  if v_deal_id is not null then
    update public.deals
    set notes = coalesce(notes, '')
          || E'\n\nBooking concluído:'
          || coalesce(E'\n· Demo marcada: ' || to_char(v_scheduled at time zone 'America/Sao_Paulo', 'DD/MM às HH24hMI') || ' (Brasília)', '')
          || coalesce(E'\n· Time comercial: ' || v_team || ' pessoas', '')
          || coalesce(E'\n· Maior dor: ' || v_pain, ''),
        expected_close_date = coalesce((v_scheduled at time zone 'America/Sao_Paulo')::date + 7, expected_close_date)
    where id = v_deal_id
      and coalesce(notes, '') not like '%Booking concluído:%'; -- idempotente
  end if;

  return v_id;
end;
$$;
