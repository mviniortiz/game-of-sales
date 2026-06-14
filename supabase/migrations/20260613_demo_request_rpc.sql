-- Fix: agendamento de demo falhava com "new row violates row-level security
-- policy for table demo_requests" para visitantes anônimos.
--
-- Causa: o client faz `insert(...).select("id").single()`, e o RETURNING é
-- avaliado contra a policy de SELECT. Só existe policy SELECT para
-- `authenticated`, então o anon insere mas não consegue ler o id de volta,
-- e o Postgres rejeita a operação inteira como violação de RLS.
--
-- Correção: RPC SECURITY DEFINER que insere e devolve o id. Não expomos
-- SELECT direto da tabela ao anon (evita vazar PII de leads via anon key
-- pública). Os triggers AFTER INSERT continuam disparando normalmente.

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
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    gclid, fbclid, referrer, landing_page
  ) values (
    coalesce(nullif(trim(payload->>'name'), ''), 'Lead'),
    v_email,
    nullif(trim(payload->>'company'), ''),
    nullif(trim(payload->>'phone'), ''),
    coalesce(nullif(trim(payload->>'source'), ''), 'landing_page'),
    'pending',
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
