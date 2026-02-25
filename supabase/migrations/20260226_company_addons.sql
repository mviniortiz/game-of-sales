-- ============================================================================
-- Company Add-ons (MVP)
-- Data: 2026-02-26
-- Objetivo:
--   - Controlar add-ons opcionais por empresa (ex.: Ligacoes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_addons (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  calls_enabled boolean NOT NULL DEFAULT false,
  calls_transcription_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garantir uma linha por empresa (defaults = false)
INSERT INTO public.company_addons (company_id)
SELECT c.id
FROM public.companies c
LEFT JOIN public.company_addons ca ON ca.company_id = c.id
WHERE ca.company_id IS NULL;

DROP TRIGGER IF EXISTS trigger_company_addons_set_updated_at ON public.company_addons;
CREATE TRIGGER trigger_company_addons_set_updated_at
BEFORE UPDATE ON public.company_addons
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.company_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_addons_select_policy" ON public.company_addons;
DROP POLICY IF EXISTS "company_addons_insert_policy" ON public.company_addons;
DROP POLICY IF EXISTS "company_addons_update_policy" ON public.company_addons;
DROP POLICY IF EXISTS "company_addons_delete_policy" ON public.company_addons;

CREATE POLICY "company_addons_select_policy" ON public.company_addons
FOR SELECT USING (
  public.is_super_admin()
  OR company_id = public.get_my_company_id()
);

CREATE POLICY "company_addons_insert_policy" ON public.company_addons
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR (company_id = public.get_my_company_id() AND public.is_admin(auth.uid()))
);

CREATE POLICY "company_addons_update_policy" ON public.company_addons
FOR UPDATE USING (
  public.is_super_admin()
  OR (company_id = public.get_my_company_id() AND public.is_admin(auth.uid()))
)
WITH CHECK (
  public.is_super_admin()
  OR (company_id = public.get_my_company_id() AND public.is_admin(auth.uid()))
);

CREATE POLICY "company_addons_delete_policy" ON public.company_addons
FOR DELETE USING (
  public.is_super_admin()
);

GRANT SELECT ON public.company_addons TO authenticated;
GRANT ALL ON public.company_addons TO service_role;
