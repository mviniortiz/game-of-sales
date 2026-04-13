-- Fix: handle_new_user() must insert admin role into user_roles for new registrations
-- The 20260331 migration removed this, causing 403 on admin-only edge functions

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
  _role app_role;
BEGIN
  -- Read company_id from signup metadata; fall back to default only if not provided
  _company_id := COALESCE(
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    '00000000-0000-0000-0000-000000000001'
  );

  -- Read role from signup metadata; default to 'admin' for self-registration
  _role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'admin'
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

  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
