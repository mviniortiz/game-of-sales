-- =============================================================================
-- FIX: Onboarding company isolation bugs
--
-- Problems fixed:
-- 1. Users could not update their own company (no UPDATE policy for non-super-admins)
-- 2. handle_new_user() trigger might still use old version without metadata reading
-- 3. onboarding_assign_company RPC might be missing
-- =============================================================================

-- 1. Add UPDATE policy so authenticated users can update ONLY their own company
-- (Previously only super_admins could update companies via companies_all_policy)
DROP POLICY IF EXISTS "users_can_update_own_company" ON public.companies;
CREATE POLICY "users_can_update_own_company" ON public.companies
  FOR UPDATE
  TO authenticated
  USING (id = public.get_my_company_id())
  WITH CHECK (id = public.get_my_company_id());

-- 2. Re-apply handle_new_user() trigger to read company_id from signup metadata
-- This ensures new users are assigned to the company created during registration,
-- NOT the hardcoded default company.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
BEGIN
  -- Read company_id from signup metadata; fall back to default only if not provided
  _company_id := COALESCE(
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    '00000000-0000-0000-0000-000000000001'
  );

  INSERT INTO public.profiles (id, nome, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    _company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_id = COALESCE(EXCLUDED.company_id, profiles.company_id);

  RETURN NEW;
END;
$$;

-- 3. Ensure onboarding_assign_company RPC exists
CREATE OR REPLACE FUNCTION public.onboarding_assign_company(target_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the target company exists
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = target_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  -- Update the calling user's profile to the target company
  UPDATE public.profiles
  SET company_id = target_company_id, role = 'admin'
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.onboarding_assign_company(UUID) TO authenticated;

-- 4. Ensure the trigger exists on auth.users
-- (This is idempotent - drops if exists then recreates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
