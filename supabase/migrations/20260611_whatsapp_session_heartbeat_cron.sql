-- ════════════════════════════════════════════════════════════════════════
-- WhatsApp session heartbeat — pg_cron a cada 5min.
--
-- Reconcilia channel_connections.status com o estado REAL das sessões no
-- Evolution. Sem isto, o status só sobe pra "active" (webhook) e nunca é
-- rebaixado: sessões caídas continuam "active", a UI mostra "conectado" e o
-- vendedor não entende por que nada chega.
--
-- Espelha o padrão de 20260424_evolution_keepwarm_vault.sql: lê o anon key do
-- Vault e chama a edge function via pg_net. A função whatsapp-session-heartbeat
-- aceita anon Bearer (verify_jwt) e escreve com service_role internamente.
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_session_heartbeat()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_anon_key text;
    v_request_id bigint;
BEGIN
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_anon_key'
    LIMIT 1;

    IF v_anon_key IS NULL THEN
        RAISE WARNING 'trigger_whatsapp_session_heartbeat: supabase_anon_key not in vault — skipping';
        RETURN NULL;
    END IF;

    SELECT net.http_post(
        url := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/whatsapp-session-heartbeat',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        ),
        body := '{}'::jsonb
    ) INTO v_request_id;

    RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_whatsapp_session_heartbeat IS
'Reconcilia channel_connections.status com o estado real das sessões Evolution. Chamada via pg_cron a cada 5min. Anon key lida do Vault.';

DO $$
BEGIN
    PERFORM cron.unschedule('whatsapp-session-heartbeat');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'whatsapp-session-heartbeat',
    '*/5 * * * *',
    $$SELECT public.trigger_whatsapp_session_heartbeat();$$
);
