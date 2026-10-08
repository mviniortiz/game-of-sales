-- WA.HEALTH (2026-10-08): vigia do servidor de WhatsApp (Whatsmiau no Railway).
-- A edge whatsapp-health roda a cada 5 minutos, grava o estado aqui e manda
-- e-mail ao Markus quando o servidor cai (2 falhas seguidas) e quando volta.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261008f_whatsapp_health.sql

create table if not exists public.service_health (
  service text primary key,
  status text not null check (status in ('up', 'down')),
  since timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  consecutive_fails integer not null default 0,
  last_error text,
  details jsonb not null default '{}'::jsonb
);

grant select on public.service_health to authenticated;
grant all on public.service_health to service_role;

alter table public.service_health enable row level security;

drop policy if exists super_admin_select_service_health on public.service_health;
create policy super_admin_select_service_health on public.service_health
  for select to authenticated using (public.is_super_admin());

create or replace function public.trigger_whatsapp_health()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url          text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/whatsapp-health';
    v_cron_secret  text;
    v_anon_key     text;
    v_request_id   bigint;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_whatsapp_health: segredo ausente no vault, pulando';
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
        timeout_milliseconds := 30000
    ) into v_request_id;

    return v_request_id;
end;
$$;

do $$
begin
    perform cron.unschedule('whatsapp-health-every-5m');
exception when others then null;
end $$;

select cron.schedule(
    'whatsapp-health-every-5m',
    '*/5 * * * *',
    $$select public.trigger_whatsapp_health();$$
);
