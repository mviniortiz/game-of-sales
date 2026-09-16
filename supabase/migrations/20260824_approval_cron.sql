-- APPROVAL.1 (2026-08-24) — Cron que entrega os rascunhos pendentes no
-- WhatsApp do dono.
--
-- A notificação principal é imediata (o eva-agent-loop chama a edge assim que
-- cria o rascunho). Este cron é a rede de segurança: pega o que falhou por
-- WhatsApp desconectado, timeout do Evolution ou rascunho criado por outro
-- caminho. Roda de 10 em 10 minutos.
--
-- Credenciais no molde da trigger_eva_stale_followup: anon key no Authorization
-- pra passar pelo gateway do Supabase, e x-cron-secret pra edge confiar na
-- chamada. Bearer com service_role_key não passa no gateway.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_approval_cron.sql

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_eva_approval_notify()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url          text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-approval';
    v_cron_secret  text;
    v_anon_key     text;
    v_request_id   bigint;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_approval_notify: segredo ausente no vault, pulando';
        return null;
    end if;

    -- Fecha o que já não pode mais ser enviado antes de olhar a fila.
    perform public.expire_stale_agent_suggestions(48);

    -- Sem companyId: varre todas as empresas. O limite segura o custo por
    -- rodada; o que sobrar sai na próxima.
    select net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := jsonb_build_object('action', 'notify', 'limit', 20),
        -- pg_net corta em 5s por padrao; a edge fala com a Evolution e demora mais.
        timeout_milliseconds := 30000
    ) into v_request_id;

    return v_request_id;
end;
$$;

comment on function public.trigger_eva_approval_notify is
'APPROVAL.1: entrega no WhatsApp do dono os rascunhos pending sem notified_at. Rede de segurança do caminho imediato do eva-agent-loop.';

do $$
begin
    perform cron.unschedule('eva-approval-notify');
exception when others then null;
end $$;

select cron.schedule(
    'eva-approval-notify',
    '*/10 * * * *',
    $$ select public.trigger_eva_approval_notify(); $$
);
