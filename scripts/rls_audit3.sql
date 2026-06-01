-- Quem pode EXECUTAR as RPCs SECURITY DEFINER sensíveis?
SELECT '10_FN_GRANTS' AS check,
       p.proname AS func,
       p.prosecdef AS security_definer,
       coalesce(
         (SELECT string_agg(DISTINCT g, ',')
          FROM unnest(p.proacl::text[]) AS g), 'default(public)') AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'eva_smart_insert_memory','eva_touch_memories',
    'get_my_company_id','is_super_admin','onboarding_assign_company',
    'get_public_report'
  )
ORDER BY p.proname;
