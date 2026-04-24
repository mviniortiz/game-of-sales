-- ════════════════════════════════════════════════════════════════════════
-- v2: pg_cron chama eva-stale-deal-followup passando x-cron-secret do Vault.
-- Substitui v1 (20260424_eva_cron_stale_followup.sql) que tentava usar
-- current_setting que nunca foi configurado.
--
-- Requer que secret 'eva_cron_secret' exista em vault.secrets.
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_eva_stale_followup()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-stale-deal-followup';
    v_cron_secret text;
    v_anon_key text;
    v_request_id bigint;
BEGIN
    -- Lê o shared secret do Vault (criado via vault.create_secret)
    SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets
    WHERE name = 'eva_cron_secret'
    LIMIT 1;

    -- Anon key pra passar pelo gateway do Supabase
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_anon_key'
    LIMIT 1;

    IF v_cron_secret IS NULL THEN
        RAISE WARNING 'trigger_eva_stale_followup: eva_cron_secret not in vault — skipping';
        RETURN NULL;
    END IF;

    IF v_anon_key IS NULL THEN
        RAISE WARNING 'trigger_eva_stale_followup: supabase_anon_key not in vault — skipping';
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

COMMENT ON FUNCTION public.trigger_eva_stale_followup IS
'Disparado via pg_cron a cada 6h. Autentica via x-cron-secret header lido do Vault. Edge function valida o secret contra o valor em Deno.env.EVA_CRON_SECRET.';

-- Reschedule (unschedule antigo + schedule novo)
DO $$
BEGIN
    PERFORM cron.unschedule('eva-stale-deal-followup-every-6h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'eva-stale-deal-followup-every-6h',
    '0 */6 * * *',
    $$SELECT public.trigger_eva_stale_followup();$$
);
