-- AWARENESS.1 — instrumenta a hipótese de consciência (5 níveis) no lead.
-- O client já deriva traffic_source / awareness_hypothesis / query_intent a
-- partir dos sinais de origem (src/lib/attribution.ts) e manda no payload; aqui
-- persistimos em colunas próprias pra dar pra segmentar conversão por estágio
-- mental (não só olhar a média, que esconde o desperdício de tráfego alto-intenção).
--
-- Aditivo e backward-compatible: colunas nullable, callers antigos ficam NULL.
-- Aplicar via: npx supabase db query --linked -f este_arquivo (NUNCA db push).

alter table public.demo_requests
  add column if not exists traffic_source text,
  add column if not exists awareness_hypothesis text,
  add column if not exists query_intent text;

-- Índice pra segmentar leads por estágio de consciência sem full scan.
create index if not exists idx_demo_requests_awareness
  on public.demo_requests(awareness_hypothesis)
  where awareness_hypothesis is not null;

-- ── submit_demo_request: caminho de INSERT completo (booking direto) ──────────
create or replace function public.submit_demo_request(payload jsonb)
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

  insert into public.demo_requests (
    name, email, company, phone, source, status,
    team_size, uses_spreadsheets, biggest_pain, improvement_goal, scheduled_at,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    gclid, fbclid, referrer, landing_page,
    traffic_source, awareness_hypothesis, query_intent
  ) values (
    coalesce(nullif(trim(payload->>'name'), ''), 'Lead'),
    v_email,
    nullif(trim(payload->>'company'), ''),
    nullif(trim(payload->>'phone'), ''),
    coalesce(nullif(trim(payload->>'source'), ''), 'landing_page'),
    'pending',
    nullif(trim(payload->>'team_size'), ''),
    case when payload ? 'uses_spreadsheets'
         then (payload->>'uses_spreadsheets')::boolean else null end,
    nullif(trim(payload->>'biggest_pain'), ''),
    nullif(trim(payload->>'improvement_goal'), ''),
    case when nullif(trim(payload->>'scheduled_at'), '') is not null
         then (payload->>'scheduled_at')::timestamptz else null end,
    payload->>'utm_source',
    payload->>'utm_medium',
    payload->>'utm_campaign',
    payload->>'utm_term',
    payload->>'utm_content',
    payload->>'gclid',
    payload->>'fbclid',
    payload->>'referrer',
    payload->>'landing_page',
    payload->>'traffic_source',
    payload->>'awareness_hypothesis',
    payload->>'query_intent'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_demo_request(jsonb) from public;
grant execute on function public.submit_demo_request(jsonb) to anon, authenticated;

-- ── submit_demo_intake: caminho de INSERT parcial (lead que ainda não agendou) ─
-- É onde o first-touch é gravado primeiro; complete_demo_request só faz UPDATE
-- da mesma row depois, então a atribuição já fica setada aqui.
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
    name, email, company, source, status, notes,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    gclid, fbclid, referrer, landing_page,
    traffic_source, awareness_hypothesis, query_intent
  ) values (
    'Lead',
    v_email,
    nullif(trim(payload->>'company'), ''),
    'demo_intake',
    'pending',
    'Iniciou a demo interativa da landing (lead parcial; ainda não agendou).',
    payload->>'utm_source',
    payload->>'utm_medium',
    payload->>'utm_campaign',
    payload->>'utm_term',
    payload->>'utm_content',
    payload->>'gclid',
    payload->>'fbclid',
    payload->>'referrer',
    payload->>'landing_page',
    payload->>'traffic_source',
    payload->>'awareness_hypothesis',
    payload->>'query_intent'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_demo_intake(jsonb) from public;
grant execute on function public.submit_demo_intake(jsonb) to anon, authenticated;
