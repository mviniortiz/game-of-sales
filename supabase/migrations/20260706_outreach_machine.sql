-- ════════════════════════════════════════════════════════════════════════
-- OUTREACH.1 — Máquina de prospecção por email do próprio Markus (interna,
-- NÃO é feature de produto). Sequência de 3 toques via Resend, disparada por
-- pg_cron em dias úteis, com cap por rodada (ramp de deliverability).
--
-- Fluxo: seed dos prospects + emails (status queued, scheduled_at) →
-- cron 3x/dia útil chama a edge outreach-dispatch → envia no máx. 2 por
-- rodada → follow-up morre sozinho quando o prospect sai de 'active'
-- (replied/opted_out/bounced marcados à mão ou por bounce do Resend).
--
-- Acesso: super_admin only (tabelas internas de operação, não multi-tenant).
-- Segue o padrão de cron do projeto (Vault: eva_cron_secret + anon key).
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Tabelas ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_prospects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  city        text,
  site        text,
  instagram   text,
  niche       text,
  fit_signal  text,
  founder     text,
  email       text,
  priority    text NOT NULL DEFAULT 'A',
  -- active → sequência roda; replied/opted_out/bounced/done → para tudo
  status      text NOT NULL DEFAULT 'active',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outreach_emails (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  uuid NOT NULL REFERENCES public.outreach_prospects(id) ON DELETE CASCADE,
  step         int  NOT NULL,                 -- 1, 2, 3
  subject      text NOT NULL,
  body         text NOT NULL,                 -- texto puro (cold email não é HTML)
  scheduled_at timestamptz NOT NULL,
  -- queued → sent | cancelled | error
  status       text NOT NULL DEFAULT 'queued',
  sent_at      timestamptz,
  resend_id    text,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_emails_due
  ON public.outreach_emails (scheduled_at) WHERE status = 'queued';

-- ── GRANT antes de RLS (regra do projeto) ────────────────────────────────
GRANT ALL ON public.outreach_prospects TO service_role;
GRANT ALL ON public.outreach_emails    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_prospects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_emails    TO authenticated;

ALTER TABLE public.outreach_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_emails    ENABLE ROW LEVEL SECURITY;

-- super_admin only, nas 4 operações (tabela interna de operação)
DROP POLICY IF EXISTS outreach_prospects_super ON public.outreach_prospects;
CREATE POLICY outreach_prospects_super ON public.outreach_prospects
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS outreach_emails_super ON public.outreach_emails;
CREATE POLICY outreach_emails_super ON public.outreach_emails
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS trg_outreach_prospects_updated ON public.outreach_prospects;
CREATE TRIGGER trg_outreach_prospects_updated
  BEFORE UPDATE ON public.outreach_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Cron → edge (mesmo padrão do eva-stale-followup: Vault + pg_net) ─────
CREATE OR REPLACE FUNCTION public.trigger_outreach_dispatch()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/outreach-dispatch';
    v_cron_secret text;
    v_anon_key text;
    v_request_id bigint;
BEGIN
    SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets WHERE name = 'eva_cron_secret' LIMIT 1;
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key' LIMIT 1;

    IF v_cron_secret IS NULL OR v_anon_key IS NULL THEN
        RAISE WARNING 'trigger_outreach_dispatch: secrets ausentes no vault — skip';
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

-- 3 rodadas por dia útil, horário comercial BRT (13/15/18 UTC = 10h/12h/15h).
-- Cap de 2 envios por rodada na edge → máx. 6/dia (ramp suave).
DO $$
BEGIN
    PERFORM cron.unschedule('outreach-dispatch-weekdays');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'outreach-dispatch-weekdays',
    '0 13,15,18 * * 1-5',
    $$SELECT public.trigger_outreach_dispatch();$$
);
