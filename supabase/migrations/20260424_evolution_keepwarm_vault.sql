-- ════════════════════════════════════════════════════════════════════════
-- Keep-warm v2: remove JWT anon_key hardcoded da migration original
-- (20260416_evolution_keepwarm_cron.sql — C-04 do audit de 2026-04-24).
-- Agora lê do Vault igual ao eva cron.
--
-- Anon key continua sendo "pública" (exposta no frontend SPA bundle), mas
-- tirar do git history é boa prática — scanners de bot não vão pingar.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trigger_evolution_keepwarm()
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
        RAISE WARNING 'trigger_evolution_keepwarm: supabase_anon_key not in vault — skipping';
        RETURN NULL;
    END IF;

    SELECT net.http_post(
        url := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/evolution-whatsapp?ping=1',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
        ),
        body := '{}'::jsonb
    ) INTO v_request_id;

    RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_evolution_keepwarm IS
'Mantém evolution-whatsapp com isolate Deno quente. Chama via pg_cron a cada 4min. Anon key lida do Vault (antes era hardcoded na migration — fix C-04 do audit).';

-- Reschedule com nova função (antigo passava JWT inline no SQL)
DO $$
BEGIN
    PERFORM cron.unschedule('evolution-whatsapp-keepwarm');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'evolution-whatsapp-keepwarm',
    '*/4 * * * *',
    $$SELECT public.trigger_evolution_keepwarm();$$
);
