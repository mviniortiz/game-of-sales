-- =============================================================================
-- FIX: Critical tenant isolation bugs
-- 1. handle_new_user() trigger now reads company_id from auth metadata
-- 2. Create onboarding_assign_company RPC (was missing)
-- =============================================================================

-- 1. Fix handle_new_user() to use company_id from signup metadata
-- Previously hardcoded to default company, ignoring the company created during registration
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

-- 2. Create onboarding_assign_company RPC
-- Called from Onboarding Step 2 to reassign user to their new company
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.onboarding_assign_company(UUID) TO authenticated;
