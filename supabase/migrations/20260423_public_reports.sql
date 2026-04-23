-- ═══════════════════════════════════════════════════════════════════
-- Public Reports (white-label share link)
-- ═══════════════════════════════════════════════════════════════════
-- Cada linha = um link público (/r/:token) que expõe um dashboard
-- agregado da company. Usa service_role na edge function pra bypass RLS,
-- validando token + expires_at + revoked_at.

CREATE TABLE IF NOT EXISTS public.public_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  share_token      TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL DEFAULT 'Relatório de performance',
  client_name      TEXT,
  logo_url         TEXT,
  enabled_metrics  JSONB NOT NULL DEFAULT '{
    "pipeline_summary": true,
    "cpl_by_campaign": true,
    "funnel_by_origin": true,
    "forecast": true,
    "core_metrics": true
  }'::jsonb,
  period_days      INTEGER NOT NULL DEFAULT 30 CHECK (period_days BETWEEN 7 AND 365),
  expires_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  view_count       INTEGER NOT NULL DEFAULT 0,
  last_viewed_at   TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_reports_company_id ON public.public_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_public_reports_share_token ON public.public_reports(share_token);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.public_reports_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_public_reports_updated_at ON public.public_reports;
CREATE TRIGGER trg_public_reports_updated_at
  BEFORE UPDATE ON public.public_reports
  FOR EACH ROW EXECUTE FUNCTION public.public_reports_set_updated_at();

-- ═══ RLS ═══════════════════════════════════════════════════════════
ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;

-- Admins da company gerenciam os seus relatórios
DROP POLICY IF EXISTS "company admins manage public reports" ON public.public_reports;
CREATE POLICY "company admins manage public reports"
  ON public.public_reports
  FOR ALL
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (SELECT 1 FROM profiles sa WHERE sa.id = auth.uid() AND sa.is_super_admin = TRUE)
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (SELECT 1 FROM profiles sa WHERE sa.id = auth.uid() AND sa.is_super_admin = TRUE)
  );

GRANT ALL ON public.public_reports TO authenticated;
GRANT ALL ON public.public_reports TO service_role;

-- ═══ RPC: agregação do relatório (roda via service_role na edge) ═══
-- Recebe o share_token, valida, retorna JSON agregado e incrementa view_count.
CREATE OR REPLACE FUNCTION public.get_public_report(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report       public.public_reports%ROWTYPE;
  v_company      companies%ROWTYPE;
  v_since        TIMESTAMPTZ;
  v_result       JSONB;
  v_pipeline     JSONB;
  v_metrics      JSONB;
  v_total_deals  INTEGER;
  v_won_deals    INTEGER;
  v_won_value    NUMERIC;
  v_pipe_value   NUMERIC;
  v_forecast     NUMERIC;
BEGIN
  SELECT * INTO v_report
  FROM public.public_reports
  WHERE share_token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF v_report.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT * INTO v_company FROM companies WHERE id = v_report.company_id;
  v_since := NOW() - (v_report.period_days || ' days')::INTERVAL;

  -- Pipeline summary por stage
  SELECT jsonb_agg(
    jsonb_build_object(
      'stage', stage,
      'count', cnt,
      'value', total_value
    ) ORDER BY stage
  )
  INTO v_pipeline
  FROM (
    SELECT stage, COUNT(*) AS cnt, COALESCE(SUM(value), 0) AS total_value
    FROM deals
    WHERE company_id = v_report.company_id
      AND created_at >= v_since
    GROUP BY stage
  ) s;

  -- Métricas core
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE stage = 'closed_won'),
    COALESCE(SUM(value) FILTER (WHERE stage = 'closed_won'), 0),
    COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0),
    COALESCE(SUM(value * COALESCE(probability, 50) / 100.0) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0)
  INTO v_total_deals, v_won_deals, v_won_value, v_pipe_value, v_forecast
  FROM deals
  WHERE company_id = v_report.company_id
    AND created_at >= v_since;

  v_metrics := jsonb_build_object(
    'total_deals', v_total_deals,
    'won_deals', v_won_deals,
    'won_value', v_won_value,
    'pipeline_value', v_pipe_value,
    'weighted_forecast', v_forecast,
    'win_rate', CASE WHEN v_total_deals > 0 THEN ROUND(100.0 * v_won_deals / v_total_deals, 1) ELSE 0 END
  );

  -- Incrementa view count (fire-and-forget)
  UPDATE public.public_reports
  SET view_count = view_count + 1, last_viewed_at = NOW()
  WHERE id = v_report.id;

  v_result := jsonb_build_object(
    'ok', true,
    'report', jsonb_build_object(
      'title', v_report.title,
      'client_name', v_report.client_name,
      'logo_url', v_report.logo_url,
      'period_days', v_report.period_days,
      'enabled_metrics', v_report.enabled_metrics
    ),
    'company', jsonb_build_object(
      'name', v_company.name,
      'logo_url', v_company.logo_url
    ),
    'pipeline', COALESCE(v_pipeline, '[]'::jsonb),
    'metrics', v_metrics
  );

  RETURN v_result;
END;
$$;

-- Expor RPC pra anon (é a camada pública)
GRANT EXECUTE ON FUNCTION public.get_public_report(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_report(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_report(TEXT) TO service_role;

COMMENT ON TABLE public.public_reports IS 'Relatórios white-label com link público. Um token = um dashboard compartilhável.';
COMMENT ON FUNCTION public.get_public_report(TEXT) IS 'Valida token e retorna agregações do dashboard white-label. SECURITY DEFINER pra bypass RLS.';
