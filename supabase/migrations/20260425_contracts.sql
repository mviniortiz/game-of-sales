-- ═══════════════════════════════════════════════════════════════════
-- Contracts + renewal helpers
-- ═══════════════════════════════════════════════════════════════════
-- Tabela de contratos: valor recorrente (MRR) ou avulso, com janela de
-- renovação. RPCs pra somar portfólio e listar renovações próximas.
-- Sem pg_cron por enquanto — a UI consulta `contracts_due_for_renewal`
-- on-demand; notificação push pode vir depois se a gente quiser.

CREATE TABLE IF NOT EXISTS public.contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deal_id             UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_name         TEXT NOT NULL,
  contact_email       TEXT,
  value               NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  billing_cycle       TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','quarterly','yearly','one_time')),
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','ended')),
  auto_renew          BOOLEAN NOT NULL DEFAULT TRUE,
  notify_days_before  INTEGER NOT NULL DEFAULT 30 CHECK (notify_days_before BETWEEN 1 AND 180),
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.contracts(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_deal_id ON public.contracts(deal_id) WHERE deal_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.contracts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_set_updated_at();

-- ═══ RLS ═══════════════════════════════════════════════════════════
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company members read contracts" ON public.contracts;
CREATE POLICY "company members read contracts"
  ON public.contracts
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles sa WHERE sa.id = auth.uid() AND sa.is_super_admin = TRUE)
  );

DROP POLICY IF EXISTS "company admins manage contracts" ON public.contracts;
CREATE POLICY "company admins manage contracts"
  ON public.contracts
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

GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- Helper: valor mensalizado (pra somar MRR consistente)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.contract_mrr_value(
  p_value NUMERIC,
  p_cycle TEXT
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_cycle
    WHEN 'monthly'   THEN p_value
    WHEN 'quarterly' THEN p_value / 3.0
    WHEN 'yearly'    THEN p_value / 12.0
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.contract_mrr_value(NUMERIC, TEXT) IS
  'Normaliza valor do contrato pra MRR. one_time não entra.';

-- ═══════════════════════════════════════════════════════════════════
-- RPC: contratos com renovação próxima
-- Retorna contratos active cujo end_date entra na janela notify_days_before.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.contracts_due_for_renewal(
  p_company_id UUID,
  p_days_ahead INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  client_name     TEXT,
  contact_email   TEXT,
  value           NUMERIC,
  billing_cycle   TEXT,
  start_date      DATE,
  end_date        DATE,
  days_remaining  INTEGER,
  auto_renew      BOOLEAN,
  notify_days_before INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = p_company_id OR p.is_super_admin = TRUE)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.client_name,
    c.contact_email,
    c.value,
    c.billing_cycle,
    c.start_date,
    c.end_date,
    (c.end_date - CURRENT_DATE)::INTEGER AS days_remaining,
    c.auto_renew,
    c.notify_days_before
  FROM public.contracts c
  WHERE c.company_id = p_company_id
    AND c.status = 'active'
    AND c.end_date IS NOT NULL
    AND c.end_date >= CURRENT_DATE
    AND c.end_date <= CURRENT_DATE + (COALESCE(p_days_ahead, c.notify_days_before) || ' days')::INTERVAL
  ORDER BY c.end_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.contracts_due_for_renewal(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contracts_due_for_renewal(UUID, INTEGER) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- RPC: sumário (MRR ativo, contratos ativos, renovações próximas, churn)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.contracts_summary(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mrr_active       NUMERIC;
  v_count_active     INTEGER;
  v_count_paused     INTEGER;
  v_count_ended      INTEGER;
  v_renewals_30d     INTEGER;
  v_mrr_at_risk_30d  NUMERIC;
  v_ended_last_90d   INTEGER;
  v_mrr_lost_90d     NUMERIC;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = p_company_id OR p.is_super_admin = TRUE)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT
    COALESCE(SUM(public.contract_mrr_value(value, billing_cycle)), 0),
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'paused'),
    COUNT(*) FILTER (WHERE status = 'ended')
  INTO v_mrr_active, v_count_active, v_count_paused, v_count_ended
  FROM public.contracts
  WHERE company_id = p_company_id
    AND (status = 'active' OR status IN ('paused','ended'));

  SELECT
    COUNT(*),
    COALESCE(SUM(public.contract_mrr_value(value, billing_cycle)), 0)
  INTO v_renewals_30d, v_mrr_at_risk_30d
  FROM public.contracts
  WHERE company_id = p_company_id
    AND status = 'active'
    AND end_date IS NOT NULL
    AND end_date >= CURRENT_DATE
    AND end_date <= CURRENT_DATE + INTERVAL '30 days'
    AND auto_renew = FALSE;

  SELECT
    COUNT(*),
    COALESCE(SUM(public.contract_mrr_value(value, billing_cycle)), 0)
  INTO v_ended_last_90d, v_mrr_lost_90d
  FROM public.contracts
  WHERE company_id = p_company_id
    AND status = 'ended'
    AND updated_at >= NOW() - INTERVAL '90 days';

  RETURN jsonb_build_object(
    'mrr_active', v_mrr_active,
    'count_active', v_count_active,
    'count_paused', v_count_paused,
    'count_ended', v_count_ended,
    'renewals_next_30d', v_renewals_30d,
    'mrr_at_risk_30d', v_mrr_at_risk_30d,
    'ended_last_90d', v_ended_last_90d,
    'mrr_lost_90d', v_mrr_lost_90d
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.contracts_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contracts_summary(UUID) TO service_role;

COMMENT ON TABLE public.contracts IS 'Contratos recorrentes ou avulsos da company. Base pra MRR/churn/renewal.';
