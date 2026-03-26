-- Allow authenticated users to INSERT into companies (needed for onboarding/registration)
-- Users can only create new companies, not modify existing ones (UPDATE/DELETE still restricted)
CREATE POLICY "authenticated_users_can_create_companies"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow anon users to create companies during registration
-- (user is created AFTER company in the registration flow)
CREATE POLICY "anon_users_can_create_companies"
  ON public.companies
  FOR INSERT
  TO anon
  WITH CHECK (true);
