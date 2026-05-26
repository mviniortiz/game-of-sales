-- ─────────────────────────────────────────────────────────────────────────────
-- F4E.5 — Base de Conhecimento da EVA
--
-- 2 tabelas novas:
--   - eva_training_documents:  materiais enviados pela agência (texto/doc)
--   - eva_context_suggestions: sugestões estruturadas geradas a partir dos
--     documentos, esperando aprovação manual antes de virar
--     eva_business_context.
--
-- Não altera eva_business_context. Só uma nova UI de aprovação manual via app
-- vai chamar upsert em eva_business_context quando o admin aprovar.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── eva_training_documents ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eva_training_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  storage_path text,
  raw_text text,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','processing','processed','failed','archived')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_eva_training_documents_company_created
  ON public.eva_training_documents (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eva_training_documents_status
  ON public.eva_training_documents (status);

ALTER TABLE public.eva_training_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eva_training_documents TO anon, authenticated, service_role;

CREATE POLICY eva_training_documents_select
  ON public.eva_training_documents
  FOR SELECT
  USING (is_super_admin() OR (company_id = get_my_company_id()));

CREATE POLICY eva_training_documents_insert
  ON public.eva_training_documents
  FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY eva_training_documents_update
  ON public.eva_training_documents
  FOR UPDATE
  USING (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY eva_training_documents_delete
  ON public.eva_training_documents
  FOR DELETE
  USING (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  );

-- ── eva_context_suggestions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eva_context_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.eva_training_documents(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL
    CHECK (suggestion_type IN (
      'agency','service','icp','playbook',
      'tone','forbidden_promise','faq','objection'
    )),
  title text NOT NULL,
  content jsonb NOT NULL,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','archived')),
  applied_at timestamptz,
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eva_context_suggestions_company_status
  ON public.eva_context_suggestions (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eva_context_suggestions_document
  ON public.eva_context_suggestions (document_id);

ALTER TABLE public.eva_context_suggestions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eva_context_suggestions TO anon, authenticated, service_role;

CREATE POLICY eva_context_suggestions_select
  ON public.eva_context_suggestions
  FOR SELECT
  USING (is_super_admin() OR (company_id = get_my_company_id()));

CREATE POLICY eva_context_suggestions_insert
  ON public.eva_context_suggestions
  FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY eva_context_suggestions_update
  ON public.eva_context_suggestions
  FOR UPDATE
  USING (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY eva_context_suggestions_delete
  ON public.eva_context_suggestions
  FOR DELETE
  USING (
    is_super_admin()
    OR ((company_id = get_my_company_id()) AND has_role(auth.uid(), 'admin'::app_role))
  );
