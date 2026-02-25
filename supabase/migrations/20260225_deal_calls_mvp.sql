-- ============================================================================
-- MVP: Ligações de Deal + Transcrição + Insights
-- Data: 2026-02-25
-- Objetivo:
--   - Registrar chamadas iniciadas a partir do Deal
--   - Salvar transcrição no contexto do deal
--   - Permitir geração manual de insights por chamada
-- ============================================================================

-- 1) Tabela de chamadas do deal
CREATE TABLE IF NOT EXISTS public.deal_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider text NOT NULL DEFAULT 'demo',
  provider_call_id text NULL,
  direction text NOT NULL DEFAULT 'outbound',
  status text NOT NULL DEFAULT 'queued',

  seller_phone text NULL,
  customer_phone text NULL,
  from_number text NULL,
  to_number text NULL,

  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  duration_seconds integer NULL,
  recording_url text NULL,

  transcript_status text NOT NULL DEFAULT 'pending',
  transcript_language text NULL,
  transcript_preview text NULL,
  transcript_text text NULL,
  transcript_segments jsonb NOT NULL DEFAULT '[]'::jsonb,

  last_error text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deal_calls_provider_call_id_unique UNIQUE (provider_call_id),
  CONSTRAINT deal_calls_status_check CHECK (
    status IN ('queued', 'dialing', 'in_progress', 'completed', 'failed', 'canceled', 'demo')
  ),
  CONSTRAINT deal_calls_direction_check CHECK (direction IN ('outbound', 'inbound')),
  CONSTRAINT deal_calls_transcript_status_check CHECK (
    transcript_status IN ('pending', 'processing', 'completed', 'failed', 'not_requested')
  )
);

CREATE INDEX IF NOT EXISTS idx_deal_calls_deal_id ON public.deal_calls(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_calls_company_id ON public.deal_calls(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_calls_user_id ON public.deal_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_calls_created_at ON public.deal_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_calls_status ON public.deal_calls(status);

-- 2) Tabela de insights por chamada (geração manual)
CREATE TABLE IF NOT EXISTS public.deal_call_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.deal_calls(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'completed',
  model text NULL,

  summary text NULL,
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_message text NULL,
  suggested_stage text NULL,
  raw_output jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT deal_call_insights_call_unique UNIQUE (call_id),
  CONSTRAINT deal_call_insights_status_check CHECK (status IN ('completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_deal_call_insights_call_id ON public.deal_call_insights(call_id);
CREATE INDEX IF NOT EXISTS idx_deal_call_insights_deal_id ON public.deal_call_insights(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_call_insights_company_id ON public.deal_call_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_call_insights_created_at ON public.deal_call_insights(created_at DESC);

-- 3) updated_at trigger helper (reutilizável)
CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_deal_calls_set_updated_at ON public.deal_calls;
CREATE TRIGGER trigger_deal_calls_set_updated_at
BEFORE UPDATE ON public.deal_calls
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trigger_deal_call_insights_set_updated_at ON public.deal_call_insights;
CREATE TRIGGER trigger_deal_call_insights_set_updated_at
BEFORE UPDATE ON public.deal_call_insights
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

-- 4) Enable RLS
ALTER TABLE public.deal_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_call_insights ENABLE ROW LEVEL SECURITY;

-- 5) Policies (multi-tenant)
DROP POLICY IF EXISTS "deal_calls_select_policy" ON public.deal_calls;
DROP POLICY IF EXISTS "deal_calls_insert_policy" ON public.deal_calls;
DROP POLICY IF EXISTS "deal_calls_update_policy" ON public.deal_calls;
DROP POLICY IF EXISTS "deal_calls_delete_policy" ON public.deal_calls;

CREATE POLICY "deal_calls_select_policy" ON public.deal_calls
FOR SELECT USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

CREATE POLICY "deal_calls_insert_policy" ON public.deal_calls
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

CREATE POLICY "deal_calls_update_policy" ON public.deal_calls
FOR UPDATE USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

CREATE POLICY "deal_calls_delete_policy" ON public.deal_calls
FOR DELETE USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "deal_call_insights_select_policy" ON public.deal_call_insights;
DROP POLICY IF EXISTS "deal_call_insights_insert_policy" ON public.deal_call_insights;
DROP POLICY IF EXISTS "deal_call_insights_update_policy" ON public.deal_call_insights;
DROP POLICY IF EXISTS "deal_call_insights_delete_policy" ON public.deal_call_insights;

CREATE POLICY "deal_call_insights_select_policy" ON public.deal_call_insights
FOR SELECT USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

CREATE POLICY "deal_call_insights_insert_policy" ON public.deal_call_insights
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

CREATE POLICY "deal_call_insights_update_policy" ON public.deal_call_insights
FOR UPDATE USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

CREATE POLICY "deal_call_insights_delete_policy" ON public.deal_call_insights
FOR DELETE USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
  OR user_id = auth.uid()
);

-- 6) Grants
GRANT ALL ON public.deal_calls TO authenticated;
GRANT ALL ON public.deal_call_insights TO authenticated;
GRANT ALL ON public.deal_calls TO service_role;
GRANT ALL ON public.deal_call_insights TO service_role;
