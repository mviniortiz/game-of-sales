-- Estende submit_demo_request pra capturar qualificação + horário escolhido no
-- novo fluxo de booking pós-tour da demo (DemoBooking). Aditivo e backward-
-- compatible: callers antigos passam menos campos → ficam NULL (coalesce).
-- Aplicar via: npx supabase db query --linked -f este_arquivo (NUNCA db push).

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
    gclid, fbclid, referrer, landing_page
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
    payload->>'landing_page'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_demo_request(jsonb) from public;
grant execute on function public.submit_demo_request(jsonb) to anon, authenticated;
