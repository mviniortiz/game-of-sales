-- Parte 2: isolamento de tenant + funções SECURITY DEFINER

-- 7) Policies cujo USING não referencia company_id NEM auth.uid (potencial vazamento de tenant)
--    (ignora policies só de service_role)
SELECT '7_NO_TENANT_FILTER' AS check, tablename, policyname, cmd, roles,
       qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND NOT ('service_role' = ANY(roles))
  AND coalesce(qual,'') !~* 'company_id'
  AND coalesce(qual,'') !~* 'auth.uid'
  AND coalesce(qual,'') !~* 'is_super_admin'
  AND cmd <> 'INSERT'
ORDER BY tablename, policyname;

-- 8) Funções SECURITY DEFINER no schema public que recebem company_id como argumento
SELECT '8_SECDEF_FUNCS' AS check,
       p.proname AS func,
       pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND pg_get_function_arguments(p.oid) ILIKE '%company%'
ORDER BY p.proname;

-- 9) Corpo da eva_smart_insert_memory (para confirmar se valida pertencimento)
SELECT '9_EVA_FN_SRC' AS check, p.proname AS func,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('eva_smart_insert_memory','eva_touch_memories');
