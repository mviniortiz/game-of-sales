-- DEMO.A2 — captura o lead JÁ NO INTAKE da demo (hoje só quem chega ao booking
-- vira registro; quem abandona no meio é lead perdido).
-- Fluxo: intake INSERE via submit_demo_intake (triggers de insert — deal + SDR —
-- rodam uma vez aqui); o booking ATUALIZA a mesma row via complete_demo_request
-- (update não re-dispara os triggers de insert, sem deal/outreach duplicado).

-- Insere o lead parcial do intake. Dedup: mesmo email nas últimas 24h reusa a row.
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
    gclid, fbclid, referrer, landing_page
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
    payload->>'landing_page'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_demo_intake(jsonb) from public;
grant execute on function public.submit_demo_intake(jsonb) to anon, authenticated;

-- Completa a row do intake com os dados do booking (qualificação + horário).
-- Guard: só atualiza rows criadas pelo intake da demo (não vira editor genérico).
create or replace function public.complete_demo_request(p_id uuid, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.demo_requests set
    company = coalesce(nullif(trim(payload->>'company'), ''), company),
    team_size = coalesce(nullif(trim(payload->>'team_size'), ''), team_size),
    biggest_pain = coalesce(nullif(trim(payload->>'biggest_pain'), ''), biggest_pain),
    scheduled_at = case when nullif(trim(payload->>'scheduled_at'), '') is not null
                        then (payload->>'scheduled_at')::timestamptz else scheduled_at end,
    status = case when nullif(trim(payload->>'scheduled_at'), '') is not null
                  then 'scheduled' else status end,
    notes = 'Concluiu a demo interativa e preencheu o booking.'
  where id = p_id and source = 'demo_intake'
  returning id into v_id;

  if v_id is null then
    raise exception 'demo request not found' using errcode = 'P0002';
  end if;

  return v_id;
end;
$$;

revoke all on function public.complete_demo_request(uuid, jsonb) from public;
grant execute on function public.complete_demo_request(uuid, jsonb) to anon, authenticated;
