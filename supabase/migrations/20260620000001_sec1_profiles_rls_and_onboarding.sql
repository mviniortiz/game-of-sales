-- ============================================================================
-- SEC.1 (2026-06-20) — Fecha 2 críticos de segurança confirmados em produção:
--
--  (1) profiles estava com policies permit-all (USING true) para o role `public`
--      (inclui anon!), anulando via OR toda RLS real: qualquer um podia ler/
--      editar/deletar qualquer profile, virar admin ou trocar de empresa.
--  (2) RPC onboarding_assign_company era SECURITY DEFINER com EXECUTE p/ PUBLIC,
--      validava só que a company existe e setava role='admin' incondicional →
--      takeover cross-tenant + auto-promoção.
--
-- Fluxos preservados: edges usam service_role (bypassa RLS); signup email+senha
-- vincula via handle_new_user (metadata); SSO usa a RPC (agora travada ao 1o
-- vínculo de company vazia). Updates de nome/avatar do próprio usuário continuam.
-- ============================================================================

-- 1) Remove as policies permit-all perigosas de profiles ------------------------
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all"                      ON public.profiles;
DROP POLICY IF EXISTS "Allow all updates on profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
-- Mantidas (já restritas): profiles_select, profiles_update,
--                          "Service role can update profiles".

-- 2) Trava de escalonamento: o próprio usuário não pode mudar role/is_super_admin/
--    company_id. service_role, funções SECURITY DEFINER (postgres) e super_admin
--    passam livres. INVOKER de propósito, para que current_user reflita o ator.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_super_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'profiles: alteracao de colunas privilegiadas nao permitida';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_privileged ON public.profiles;
CREATE TRIGGER guard_profiles_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_cols();

-- 3) Corrige a RPC de onboarding: só o PRIMEIRO vínculo, e só a company VAZIA ----
CREATE OR REPLACE FUNCTION public.onboarding_assign_company(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_company uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = target_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  SELECT company_id INTO _caller_company FROM public.profiles WHERE id = _caller;

  -- Anti re-tenant / anti auto-promoção: só quem ainda não tem empresa.
  IF _caller_company IS NOT NULL THEN
    RAISE EXCEPTION 'User already assigned to a company';
  END IF;

  -- Anti takeover: só dá pra reivindicar uma company recém-criada (sem membros).
  IF EXISTS (SELECT 1 FROM public.profiles WHERE company_id = target_company_id) THEN
    RAISE EXCEPTION 'Company already has members';
  END IF;

  UPDATE public.profiles
    SET company_id = target_company_id, role = 'admin'
    WHERE id = _caller;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;

  -- Espelha no sistema canônico de papéis.
  INSERT INTO public.user_roles (user_id, role)
    VALUES (_caller, 'admin')
    ON CONFLICT DO NOTHING;
END;
$$;

-- Tira o EXECUTE de PUBLIC/anon; mantém só authenticated.
REVOKE ALL ON FUNCTION public.onboarding_assign_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboarding_assign_company(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.onboarding_assign_company(uuid) TO authenticated;
