-- =====================================================
-- Game Sales Calendar Permissions Setup
-- =====================================================
-- This script sets up the permission hierarchy for calendars:
-- 1. Super Admin (God Mode): Sees all, but NOT other Super Admins
-- 2. Admin (Company): Sees only their company's sellers
-- 3. Seller: Sees only their own calendar
-- =====================================================

-- Ensure is_super_admin column exists on profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure company_id column exists on profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- Add company_id to agendamentos for better filtering (optional but recommended)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agendamentos' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE agendamentos ADD COLUMN company_id UUID REFERENCES companies(id);
    
    -- Populate company_id from the user's profile
    UPDATE agendamentos a
    SET company_id = p.company_id
    FROM profiles p
    WHERE a.user_id = p.id AND a.company_id IS NULL;
  END IF;
END $$;

-- Create trigger to auto-set company_id on new agendamentos
CREATE OR REPLACE FUNCTION set_agendamento_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_agendamento_company_id ON agendamentos;
CREATE TRIGGER trigger_set_agendamento_company_id
  BEFORE INSERT ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION set_agendamento_company_id();

-- =====================================================
-- RLS Policies for Calendar Privacy
-- =====================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own appointments" ON agendamentos;
DROP POLICY IF EXISTS "Admins can view company appointments" ON agendamentos;
DROP POLICY IF EXISTS "Super admins can view all non-superadmin appointments" ON agendamentos;

-- Policy 1: Users can always see their own appointments
CREATE POLICY "Users can view their own appointments"
  ON agendamentos FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Company Admins can see appointments from their company (excluding Super Admins)
CREATE POLICY "Admins can view company appointments"
  ON agendamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM profiles viewer_profile
      WHERE viewer_profile.id = auth.uid()
      AND viewer_profile.company_id = agendamentos.company_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM profiles owner_profile
      WHERE owner_profile.id = agendamentos.user_id
      AND owner_profile.is_super_admin = TRUE
    )
  );

-- Policy 3: Super Admins can see all appointments EXCEPT other Super Admins
CREATE POLICY "Super admins can view all non-superadmin appointments"
  ON agendamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
    )
    AND NOT EXISTS (
      SELECT 1 FROM profiles owner_profile
      WHERE owner_profile.id = agendamentos.user_id
      AND owner_profile.is_super_admin = TRUE
      AND owner_profile.id != auth.uid()  -- Can still see own appointments
    )
  );

-- =====================================================
-- Mark Super Admins (Run this for you and your partner)
-- =====================================================
-- Replace with your actual user IDs:
-- UPDATE profiles SET is_super_admin = TRUE WHERE id = 'your-user-id';
-- UPDATE profiles SET is_super_admin = TRUE WHERE id = 'partner-user-id';

-- Example (uncomment and modify):
-- UPDATE profiles SET is_super_admin = TRUE WHERE email = 'your-email@example.com';

SELECT 'Calendar permissions setup complete!' as status;

