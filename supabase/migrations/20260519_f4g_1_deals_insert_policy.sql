-- ─────────────────────────────────────────────────────────────────────────────
-- F4G.1 (2026-05-19) — Corrige policy de INSERT em public.deals
--
-- Bug: a policy "Users can insert their own deals" tinha WITH CHECK =
-- (auth.uid() = user_id). Isso impede:
--   - admin/super_admin criar deal atribuído a outro vendedor da company
--   - super_admin operar cross-company (como fazem nas outras policies)
--
-- Inconsistência: SELECT/UPDATE/DELETE já tinham bypass de super_admin +
-- same-company. Só INSERT ficou restrito ao próprio user. Provável esquecimento
-- da migration original.
--
-- Fix: expande WITH CHECK pra aceitar (mesma lógica do UPDATE):
--   - auth.uid() = user_id  (user comum criando pra si mesmo)
--   - is_super_admin()      (super_admin bypass)
--   - company_id = get_my_company_id()  (admin/membro criando dentro da company)
--
-- Multi-tenant continua garantido — `company_id = get_my_company_id()` impede
-- criar deal em outra company.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert their own deals" ON public.deals;

CREATE POLICY "Users can insert company deals"
  ON public.deals
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id)
    OR public.is_super_admin()
    OR (company_id = public.get_my_company_id())
  );

DO $$
BEGIN
  RAISE NOTICE 'F4G.1 aplicado: policy INSERT em deals expandida (super_admin + same-company).';
END $$;
