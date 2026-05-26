-- ─────────────────────────────────────────────────────────────────────────────
-- F4E.1.1 (2026-05-19) — GRANTs faltantes em eva_business_context / eva_knowledge_gaps
--
-- Bug: a F4E.1 criou as tabelas + RLS policies mas esqueceu de conceder os
-- privilégios base pros roles `authenticated`, `anon` e `service_role` do
-- Supabase. Postgres avalia GRANT *antes* de RLS, então o cliente Supabase JS
-- (que usa role `authenticated`) batia em "permission denied for table
-- eva_business_context" antes mesmo de a policy rodar.
--
-- Padrão usado: igual ao da tabela `companies` (verificado via
-- information_schema.table_privileges) — privs amplos pros 3 roles, RLS
-- continua sendo a defesa real.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.eva_business_context TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.eva_business_context TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.eva_business_context TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.eva_knowledge_gaps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.eva_knowledge_gaps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.eva_knowledge_gaps TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'F4E.1.1 aplicado: GRANTs base em eva_business_context e eva_knowledge_gaps. RLS continua ativa.';
END $$;
