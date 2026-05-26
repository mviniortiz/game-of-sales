-- ─────────────────────────────────────────────────────────────────────────────
-- F6T.1 — Tag System Foundation
--
-- Camada transversal de tags para organizar conversas, deals, contatos e
-- itens de conhecimento. Schema polimórfico via entity_type.
--
-- NÃO substitui deal_tags / deal_tag_assignments (legado deal-only). As duas
-- coexistem; uma fase futura pode migrar deal_tags → tags + tag_assignments
-- quando houver UI/uso real, mas isso não é parte de F6T.1.
--
-- Esta migration não altera comportamento de Inbox, Pipeline, Central,
-- DealCommandCenter, Evolution, Meta, edge functions ou automações. Sem IA.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ tags ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text,
  category text,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT tags_slug_not_empty CHECK (length(trim(slug)) > 0),
  CONSTRAINT tags_company_slug_unique UNIQUE (company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_tags_company
  ON public.tags (company_id);

CREATE INDEX IF NOT EXISTS idx_tags_company_slug
  ON public.tags (company_id, slug);

CREATE INDEX IF NOT EXISTS idx_tags_company_category
  ON public.tags (company_id, category)
  WHERE category IS NOT NULL;

-- updated_at trigger (padrão do projeto: função própria por tabela)
CREATE OR REPLACE FUNCTION public.tags_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tags_updated_at ON public.tags;
CREATE TRIGGER trg_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.tags_set_updated_at();


-- ═══ tag_assignments ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  confidence numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tag_assignments_entity_type_check
    CHECK (entity_type IN ('conversation','deal','contact','knowledge_item')),
  CONSTRAINT tag_assignments_source_check
    CHECK (source IN ('manual','eva_suggested','system')),
  CONSTRAINT tag_assignments_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT tag_assignments_unique
    UNIQUE (company_id, tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_company_entity
  ON public.tag_assignments (company_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_company_tag
  ON public.tag_assignments (company_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_company_source
  ON public.tag_assignments (company_id, source);


-- ═══ RLS ════════════════════════════════════════════════════════════════════
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;

-- Grants (RLS só roda DEPOIS de GRANT — padrão obrigatório do projeto)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_assignments TO anon, authenticated, service_role;

-- ── tags policies ──────────────────────────────────────────────────────────
-- SELECT: qualquer membro da company OU super_admin
CREATE POLICY tags_select
  ON public.tags
  FOR SELECT
  USING (public.is_super_admin() OR (company_id = public.get_my_company_id()));

-- INSERT/UPDATE/DELETE: apenas admin da company OU super_admin
CREATE POLICY tags_insert
  ON public.tags
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY tags_update
  ON public.tags
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY tags_delete
  ON public.tags
  FOR DELETE
  USING (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  );

-- ── tag_assignments policies ───────────────────────────────────────────────
CREATE POLICY tag_assignments_select
  ON public.tag_assignments
  FOR SELECT
  USING (public.is_super_admin() OR (company_id = public.get_my_company_id()));

CREATE POLICY tag_assignments_insert
  ON public.tag_assignments
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY tag_assignments_update
  ON public.tag_assignments
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  )
  WITH CHECK (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY tag_assignments_delete
  ON public.tag_assignments
  FOR DELETE
  USING (
    public.is_super_admin()
    OR ((company_id = public.get_my_company_id()) AND public.has_role(auth.uid(), 'admin'::app_role))
  );

COMMENT ON TABLE public.tags IS 'F6T.1 — Tags transversais por company. entity_type da junction define escopo.';
COMMENT ON TABLE public.tag_assignments IS 'F6T.1 — Atribuição polimórfica de tags a conversation/deal/contact/knowledge_item.';
COMMENT ON COLUMN public.tag_assignments.source IS 'manual | eva_suggested | system. EVA NÃO grava aqui em F6T.1 (camada só preparada).';
COMMENT ON COLUMN public.tag_assignments.confidence IS 'Reservado para futuras sugestões EVA. NULL para source=manual.';
