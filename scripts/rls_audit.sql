-- ============================================================
-- Auditoria de RLS / multi-tenant no banco de PRODUÇÃO (read-only)
-- ============================================================

-- 1) Tabelas do schema public com RLS DESABILITADO
SELECT '1_RLS_DISABLED' AS check, c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- 2) Tabelas com RLS habilitado mas SEM nenhuma policy (= bloqueio total p/ não-admin, ou risco se forced=false)
SELECT '2_RLS_ON_NO_POLICY' AS check, c.relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- 3) Policies permissivas demais: USING(true) ou WITH CHECK(true)
SELECT '3_PERMISSIVE_TRUE' AS check, tablename, policyname, roles, cmd,
       qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- 4) Policies que dão acesso ao role anon
SELECT '4_ANON_POLICIES' AS check, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;

-- 5) GRANTs de escrita (INSERT/UPDATE/DELETE) ao role anon em tabelas
SELECT '5_ANON_WRITE_GRANTS' AS check, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND privilege_type IN ('INSERT','UPDATE','DELETE')
ORDER BY table_name, privilege_type;

-- 6) Cobertura de policies por tabela (quais comandos têm policy)
SELECT '6_POLICY_COVERAGE' AS check, tablename,
       string_agg(DISTINCT cmd, ',' ORDER BY cmd) AS cmds_com_policy
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
