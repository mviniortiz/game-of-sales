-- Qualificação antes da primeira mensagem (edge prospect-qualify): nota de
-- encaixe de 0 a 100 em fit_score, evidências em metadata.qualif. O lote do
-- prospect-run só pega fit_score >= 50 (CORTE_ENCAIXE em _shared/prospectFit.ts).
alter table public.prospecting_allowlist add column if not exists fit_score integer;
create index if not exists prospecting_allowlist_fila_idx
  on public.prospecting_allowlist (user_id, status, fit_score desc) where is_active;

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
    -- Sem fila para qualificar, não chama a edge.
    IF NOT EXISTS (
        SELECT 1 FROM public.prospecting_allowlist
        WHERE is_active AND status IN ('aprovado', 'mapeado') AND sent_at IS NULL AND fit_score IS NULL
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

REVOKE ALL ON FUNCTION public.trigger_prospect_qualify() FROM PUBLIC, anon, authenticated;

-- A cada 10 minutos, das 7h às 22h de Brasília, todo dia: qualificar não fala com ninguém.
select cron.unschedule('prospect-qualify') where exists (select 1 from cron.job where jobname = 'prospect-qualify');
select cron.schedule('prospect-qualify', '*/10 10-23,0 * * *', $$select public.trigger_prospect_qualify()$$);
