-- PROSPECT.2 — agenda a edge prospect-run. A cada 3 minutos de 9h às 18h (BRT,
-- 12h às 20h59 UTC) em dia útil. A edge decide sozinha se envia (janela, teto
-- diário e 2 a 5 minutos entre contatos), então rodadas vazias custam só a chamada.

CREATE OR REPLACE FUNCTION public.trigger_prospect_run()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/prospect-run';
    v_cron_secret text;
    v_anon_key text;
    v_request_id bigint;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.prospecting_instances WHERE is_active) THEN
        RETURN NULL;
    END IF;
    SELECT decrypted_secret INTO v_cron_secret FROM vault.decrypted_secrets WHERE name = 'eva_cron_secret' LIMIT 1;
    SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1;
    IF v_cron_secret IS NULL OR v_anon_key IS NULL THEN
        RAISE WARNING 'trigger_prospect_run: secrets ausentes no vault, pulando';
        RETURN NULL;
    END IF;
    SELECT net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
    ) INTO v_request_id;
    RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_prospect_run() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    PERFORM cron.unschedule('prospect-run-weekdays');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('prospect-run-weekdays', '*/3 12-20 * * 1-5', $$SELECT public.trigger_prospect_run();$$);
