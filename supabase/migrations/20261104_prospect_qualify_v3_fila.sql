-- prospect-qualify v3: o cron também chama a edge para requalificar quem tem nota de
-- versão anterior. Só muda a condição do IF; o resto é igual a 20261016.
CREATE OR REPLACE FUNCTION public.trigger_prospect_qualify()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/prospect-qualify';
    v_cron_secret text;
    v_anon_key text;
    v_request_id bigint;
BEGIN
    -- Sem fila para qualificar, não chama a edge. Desde 04/11/2026 a fila inclui quem foi
    -- qualificado antes da versão 3 (busca pública do site e do Instagram).
    IF NOT EXISTS (
        SELECT 1 FROM public.prospecting_allowlist
        WHERE is_active AND status IN ('aprovado', 'mapeado') AND sent_at IS NULL
          AND (fit_score IS NULL OR (metadata->'qualif'->>'versao') IS DISTINCT FROM '3')
    ) THEN
        RETURN NULL;
    END IF;
    SELECT decrypted_secret INTO v_cron_secret FROM vault.decrypted_secrets WHERE name = 'eva_cron_secret' LIMIT 1;
    SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1;
    IF v_cron_secret IS NULL OR v_anon_key IS NULL THEN
        RAISE WARNING 'trigger_prospect_qualify: secrets ausentes no vault, pulando';
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
        timeout_milliseconds := 150000
    ) INTO v_request_id;
    RETURN v_request_id;
END;
$$;
