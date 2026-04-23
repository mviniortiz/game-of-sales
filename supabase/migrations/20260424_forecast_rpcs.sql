-- ═══════════════════════════════════════════════════════════════════
-- Forecast RPCs
-- ═══════════════════════════════════════════════════════════════════
-- Pipeline ponderado por mês de expected_close_date. Separa:
--   - won:        closed_won no mês
--   - weighted:   deals em aberto * probability/100
--   - pipeline:   deals em aberto (valor bruto, pra referência)
--
-- Usado em:
--   - Dashboard interno (via forecast_by_month)
--   - Relatório público (get_public_report embute o resumo)

CREATE OR REPLACE FUNCTION public.forecast_by_month(
  p_company_id UUID,
  p_months_ahead INTEGER DEFAULT 6
)
RETURNS TABLE (
  month_start   DATE,
  won_value     NUMERIC,
  weighted_value NUMERIC,
  pipeline_value NUMERIC,
  deal_count    INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_read BOOLEAN;
BEGIN
  -- Autoriza se: é da company, OU é super_admin
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = p_company_id OR p.is_super_admin = TRUE)
  ) INTO v_can_read;

  IF NOT v_can_read THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', NOW())::DATE,
      (date_trunc('month', NOW()) + ((p_months_ahead - 1) || ' months')::INTERVAL)::DATE,
      '1 month'::INTERVAL
    )::DATE AS m
  ),
  bucketed AS (
    SELECT
      date_trunc('month', COALESCE(expected_close_date, NOW()::DATE))::DATE AS m,
      stage,
      value,
      COALESCE(probability, 50) AS prob
    FROM deals
    WHERE company_id = p_company_id
      AND expected_close_date IS NOT NULL
      AND expected_close_date >= date_trunc('month', NOW())
      AND expected_close_date < date_trunc('month', NOW()) + ((p_months_ahead) || ' months')::INTERVAL
  )
  SELECT
    months.m AS month_start,
    COALESCE(SUM(value) FILTER (WHERE stage = 'closed_won'), 0)::NUMERIC AS won_value,
    COALESCE(SUM(value * prob / 100.0) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0)::NUMERIC AS weighted_value,
    COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0)::NUMERIC AS pipeline_value,
    COALESCE(COUNT(*) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0)::INTEGER AS deal_count
  FROM months
  LEFT JOIN bucketed ON bucketed.m = months.m
  GROUP BY months.m
  ORDER BY months.m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.forecast_by_month(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.forecast_by_month(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION public.forecast_by_month(UUID, INTEGER) IS
  'Retorna forecast (fechado + ponderado + pipeline bruto) por mês de expected_close_date. SECURITY DEFINER autoriza pela company.';

-- ═══════════════════════════════════════════════════════════════════
-- Atualiza get_public_report pra incluir forecast por mês (quando
-- enabled_metrics.forecast = true)
-- ═══════════════════════════════════════════════════════════════════
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
  v_forecast     JSONB;
  v_total_deals  INTEGER;
  v_won_deals    INTEGER;
  v_won_value    NUMERIC;
  v_pipe_value   NUMERIC;
  v_weighted     NUMERIC;
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
  INTO v_total_deals, v_won_deals, v_won_value, v_pipe_value, v_weighted
  FROM deals
  WHERE company_id = v_report.company_id
    AND created_at >= v_since;

  v_metrics := jsonb_build_object(
    'total_deals', v_total_deals,
    'won_deals', v_won_deals,
    'won_value', v_won_value,
    'pipeline_value', v_pipe_value,
    'weighted_forecast', v_weighted,
    'win_rate', CASE WHEN v_total_deals > 0 THEN ROUND(100.0 * v_won_deals / v_total_deals, 1) ELSE 0 END
  );

  -- Forecast por mês (só se habilitado)
  IF COALESCE((v_report.enabled_metrics->>'forecast')::BOOLEAN, TRUE) THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'month', to_char(month_start, 'YYYY-MM'),
        'won', won_value,
        'weighted', weighted_value,
        'pipeline', pipeline_value,
        'deals', deal_count
      ) ORDER BY month_start
    )
    INTO v_forecast
    FROM (
      SELECT
        date_trunc('month', COALESCE(expected_close_date, NOW()::DATE))::DATE AS month_start,
        COALESCE(SUM(value) FILTER (WHERE stage = 'closed_won'), 0) AS won_value,
        COALESCE(SUM(value * COALESCE(probability, 50) / 100.0) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0) AS weighted_value,
        COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0) AS pipeline_value,
        COALESCE(COUNT(*) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')), 0) AS deal_count
      FROM deals
      WHERE company_id = v_report.company_id
        AND expected_close_date IS NOT NULL
        AND expected_close_date >= date_trunc('month', NOW())
        AND expected_close_date < date_trunc('month', NOW()) + INTERVAL '6 months'
      GROUP BY 1
    ) f;
  ELSE
    v_forecast := '[]'::jsonb;
  END IF;

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
    'metrics', v_metrics,
    'forecast_monthly', COALESCE(v_forecast, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
