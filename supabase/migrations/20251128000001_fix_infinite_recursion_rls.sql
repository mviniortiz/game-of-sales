-- ============================================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- This migration creates SECURITY DEFINER helper functions and replaces
-- all problematic RLS policies that query profiles within themselves.
-- ============================================================================

-- 1. DROP ALL PROBLEMATIC POLICIES FIRST
-- ============================================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Super admins bypass profiles RLS" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Drop companies policies
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

-- Drop vendas policies
DROP POLICY IF EXISTS "Super admins bypass vendas RLS" ON public.vendas;
DROP POLICY IF EXISTS "Company admins view all company sales" ON public.vendas;
DROP POLICY IF EXISTS "Sellers view own company sales" ON public.vendas;
DROP POLICY IF EXISTS "Users insert own company sales" ON public.vendas;
DROP POLICY IF EXISTS "Users update own company sales" ON public.vendas;
DROP POLICY IF EXISTS "Admins delete company sales" ON public.vendas;
DROP POLICY IF EXISTS "Users can view own sales or admins view all" ON public.vendas;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.vendas;
DROP POLICY IF EXISTS "Users can update own sales" ON public.vendas;
DROP POLICY IF EXISTS "Admins can update all sales" ON public.vendas;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.vendas;

-- Drop deals policies
DROP POLICY IF EXISTS "Super admins bypass deals RLS" ON public.deals;
DROP POLICY IF EXISTS "Company admins view all company deals" ON public.deals;
DROP POLICY IF EXISTS "Sellers view own deals" ON public.deals;
DROP POLICY IF EXISTS "Sellers manage own deals" ON public.deals;
DROP POLICY IF EXISTS "Sellers update own deals" ON public.deals;

-- Drop calls policies
DROP POLICY IF EXISTS "Super admins bypass calls RLS" ON public.calls;
DROP POLICY IF EXISTS "Company users manage company calls" ON public.calls;
DROP POLICY IF EXISTS "Users can view own calls or admins view all" ON public.calls;
DROP POLICY IF EXISTS "Users can insert own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can delete own calls" ON public.calls;
DROP POLICY IF EXISTS "Admins can update all calls" ON public.calls;
DROP POLICY IF EXISTS "Admins can delete all calls" ON public.calls;

-- Drop agendamentos policies
DROP POLICY IF EXISTS "Super admins bypass agendamentos RLS" ON public.agendamentos;
DROP POLICY IF EXISTS "Company users manage company appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can view own appointments or admins view all" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Admins can delete all appointments" ON public.agendamentos;

-- Drop metas policies
DROP POLICY IF EXISTS "Super admins bypass metas RLS" ON public.metas;
DROP POLICY IF EXISTS "Company users manage company goals" ON public.metas;
DROP POLICY IF EXISTS "Users can view own goals or admins view all" ON public.metas;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.metas;
DROP POLICY IF EXISTS "Users can update own goals" ON public.metas;
DROP POLICY IF EXISTS "Admins can manage goals" ON public.metas;

-- Drop metas_consolidadas policies
DROP POLICY IF EXISTS "Super admins bypass metas consolidadas RLS" ON public.metas_consolidadas;
DROP POLICY IF EXISTS "Company users view company consolidated goals" ON public.metas_consolidadas;
DROP POLICY IF EXISTS "Company admins manage consolidated goals" ON public.metas_consolidadas;
DROP POLICY IF EXISTS "Everyone can view consolidated goals" ON public.metas_consolidadas;
DROP POLICY IF EXISTS "Admins can manage consolidated goals" ON public.metas_consolidadas;

-- Drop produtos policies
DROP POLICY IF EXISTS "Super admins bypass produtos RLS" ON public.produtos;
DROP POLICY IF EXISTS "Company users view company products" ON public.produtos;
DROP POLICY IF EXISTS "Company admins manage products" ON public.produtos;
DROP POLICY IF EXISTS "Everyone can view active products" ON public.produtos;
DROP POLICY IF EXISTS "Admins can manage products" ON public.produtos;

-- 2. CREATE SECURITY DEFINER HELPER FUNCTIONS
-- These functions bypass RLS to safely retrieve user info
-- ============================================================================

-- Helper: Get user's company_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: Check if user is super admin without triggering RLS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- 3. CREATE NEW SIMPLE RLS POLICIES
-- ============================================================================

-- PROFILES: Simple policies that don't cause recursion
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id  -- Users can always see their own profile
    OR public.is_super_admin()  -- Super admins see all
    OR company_id = public.get_my_company_id()  -- Same company
  );

CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_super_admin()
  );

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (
    public.is_super_admin()
  );

-- COMPANIES: Simple policies
CREATE POLICY "companies_select_policy" ON public.companies
  FOR SELECT USING (
    public.is_super_admin()
    OR id = public.get_my_company_id()
  );

CREATE POLICY "companies_all_policy" ON public.companies
  FOR ALL USING (
    public.is_super_admin()
  );

-- VENDAS: Simple policies
CREATE POLICY "vendas_select_policy" ON public.vendas
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "vendas_insert_policy" ON public.vendas
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "vendas_update_policy" ON public.vendas
  FOR UPDATE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "vendas_delete_policy" ON public.vendas
  FOR DELETE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
  );

-- DEALS: Simple policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "deals_all_policy" ON public.deals FOR ALL USING (
      public.is_super_admin()
      OR owner_id = auth.uid()
      OR company_id = public.get_my_company_id()
    )';
  END IF;
END $$;

-- CALLS: Simple policies
CREATE POLICY "calls_select_policy" ON public.calls
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "calls_insert_policy" ON public.calls
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "calls_update_policy" ON public.calls
  FOR UPDATE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "calls_delete_policy" ON public.calls
  FOR DELETE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
  );

-- AGENDAMENTOS: Simple policies
CREATE POLICY "agendamentos_select_policy" ON public.agendamentos
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "agendamentos_insert_policy" ON public.agendamentos
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "agendamentos_update_policy" ON public.agendamentos
  FOR UPDATE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "agendamentos_delete_policy" ON public.agendamentos
  FOR DELETE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
  );

-- METAS: Simple policies
CREATE POLICY "metas_select_policy" ON public.metas
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "metas_insert_policy" ON public.metas
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "metas_update_policy" ON public.metas
  FOR UPDATE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "metas_delete_policy" ON public.metas
  FOR DELETE USING (
    public.is_super_admin()
  );

-- METAS_CONSOLIDADAS: Simple policies
CREATE POLICY "metas_consolidadas_select_policy" ON public.metas_consolidadas
  FOR SELECT USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "metas_consolidadas_insert_policy" ON public.metas_consolidadas
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "metas_consolidadas_update_policy" ON public.metas_consolidadas
  FOR UPDATE USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "metas_consolidadas_delete_policy" ON public.metas_consolidadas
  FOR DELETE USING (
    public.is_super_admin()
  );

-- PRODUTOS: Simple policies
CREATE POLICY "produtos_select_policy" ON public.produtos
  FOR SELECT USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "produtos_insert_policy" ON public.produtos
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "produtos_update_policy" ON public.produtos
  FOR UPDATE USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "produtos_delete_policy" ON public.produtos
  FOR DELETE USING (
    public.is_super_admin()
  );

-- 4. ENSURE USER HAS PROFILE AND COMPANY ASSIGNMENT
-- ============================================================================

-- Create trigger to auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    '00000000-0000-0000-0000-000000000001'  -- Default company
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_id = COALESCE(profiles.company_id, '00000000-0000-0000-0000-000000000001');
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure default company exists
INSERT INTO public.companies (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Game Sales Default', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Assign any orphan profiles to default company
UPDATE public.profiles 
SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

