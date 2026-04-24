-- ════════════════════════════════════════════════════════════════════════
-- pg_cron job chamando edge function eva-stale-deal-followup a cada 6h.
-- Usa pg_net.http_post com service_role auth.
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função wrapper que resolve URL + auth e dispara o http_post
CREATE OR REPLACE FUNCTION public.trigger_eva_stale_followup()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url text;
    v_service_key text;
    v_request_id bigint;
BEGIN
    -- Lê da tabela de settings (se existir) ou usa hardcoded do projeto
    v_url := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-stale-deal-followup';
    v_service_key := current_setting('app.settings.service_role_key', true);

    -- Fallback: se não estiver setado via ALTER DATABASE, retorna sem disparar
    IF v_service_key IS NULL OR v_service_key = '' THEN
        RAISE WARNING 'trigger_eva_stale_followup: service_role_key não configurada (ALTER DATABASE ... SET app.settings.service_role_key)';
        RETURN NULL;
    END IF;

    SELECT net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
    )
    INTO v_request_id;

    RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_eva_stale_followup IS
'Disparado via pg_cron a cada 6h. Chama a edge function eva-stale-deal-followup com service_role. Requer app.settings.service_role_key configurada via ALTER DATABASE.';

-- Remove job antigo se existir
DO $$
BEGIN
    PERFORM cron.unschedule('eva-stale-deal-followup-every-6h');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Agenda a cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)
SELECT cron.schedule(
    'eva-stale-deal-followup-every-6h',
    '0 */6 * * *',
    $$SELECT public.trigger_eva_stale_followup();$$
);
