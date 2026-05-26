-- ─────────────────────────────────────────────────────────────────────────────
-- F4G.2 (2026-05-19) — Adiciona policy INSERT faltante em public.deal_products
--
-- Bug: deal_products tinha SELECT/UPDATE/DELETE policies (super_admin OR
-- same-company) mas ZERO policy de INSERT. Com RLS ativa, ausência de policy
-- pra um comando = default deny. Qualquer INSERT bloqueava silenciosamente.
--
-- Provável causa: migration original do schema pulou a policy. Sintoma só
-- apareceu agora com F4G porque é o primeiro lugar do app que tenta vincular
-- produto a deal no fluxo de criação (NovaOportunidadeModal).
--
-- Fix: policy INSERT no mesmo padrão das outras (super_admin bypass OR
-- company_id = minha). Multi-tenant garantido pelo WITH CHECK.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "deal_products_insert_policy"
  ON public.deal_products
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (company_id = public.get_my_company_id())
  );

DO $$
BEGIN
  RAISE NOTICE 'F4G.2 aplicado: policy INSERT em deal_products criada.';
END $$;
