-- Pinga o admin no WhatsApp quando alguém CRIA UMA CONTA (signup self-service).
-- Dispara a edge function notify-signup via pg_net. Filtro WHEN (new.plan IS NOT
-- NULL): signup real preenche plan (starter/plus/pro); contas-demo auto-criadas
-- pelo admin-lead-digest têm plan NULL → não duplicam ping. Falha não bloqueia o
-- insert. Aplicar via: npx supabase db query --linked -f (NUNCA db push).

create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_new_signup()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_url is null or v_key is null then
    raise warning '[notify-signup] vault secrets ausentes; pulando';
    return new;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/notify-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', new.id,
        'name', new.name,
        'plan', new.plan,
        'subscription_status', new.subscription_status
      )
    )
  );
  return new;
exception
  when others then
    raise warning '[notify-signup] erro: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists trg_new_signup on public.companies;

create trigger trg_new_signup
  after insert on public.companies
  for each row
  when (new.plan is not null)
  execute function public.trigger_new_signup();

comment on function public.trigger_new_signup() is
  'Pinga o admin no WhatsApp (via notify-signup + Evolution) quando uma company com plano é criada (signup self-service). Falhas nao bloqueiam o insert.';
