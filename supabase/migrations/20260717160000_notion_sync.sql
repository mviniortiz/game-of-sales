-- NOTION.1 (2026-07-17) — sync do pipeline pro Notion.
-- deals.notion_page_id = idempotência do upsert (1 deal = 1 página).
-- Cron de 15min chama a edge notion-sync (padrão vault + pg_net do projeto).
-- Aditiva e idempotente; aplicar via `npx supabase db query --linked -f`.

alter table public.deals add column if not exists notion_page_id text;

create or replace function public.trigger_notion_sync()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_url text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/notion-sync';
    v_cron_secret text;
    v_anon_key text;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;
    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_notion_sync: secrets ausentes no vault — skip';
        return;
    end if;

    perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := '{}'::jsonb
    );
end $$;

do $$
begin
    perform cron.unschedule('notion-sync-15min');
exception when others then null;
end $$;

select cron.schedule(
    'notion-sync-15min',
    '*/15 * * * *',
    $$select public.trigger_notion_sync();$$
);
