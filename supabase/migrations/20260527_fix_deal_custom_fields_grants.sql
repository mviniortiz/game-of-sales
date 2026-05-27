-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: "permission denied for table deal_custom_field_definitions" (42501)
--
-- As tabelas de campos customizados (deal_custom_field_definitions e
-- deal_custom_field_values) já têm RLS habilitada e as 4 policies por company/
-- deal (dcfd_* / dcfv_*), mas nunca receberam GRANT para os roles do PostgREST.
-- Como a RLS só é avaliada DEPOIS do GRANT de tabela, sem ele o INSERT/SELECT
-- falha com permission denied antes mesmo da policy rodar.
--
-- Padrão do projeto: GRANT para anon/authenticated/service_role; o filtro de
-- tenant continua sendo feito pelas policies existentes.
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_custom_field_definitions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_custom_field_values      TO anon, authenticated, service_role;
