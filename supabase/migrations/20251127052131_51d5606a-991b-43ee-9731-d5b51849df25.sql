-- ============================================================================
-- Game Sales MULTI-TENANT ARCHITECTURE MIGRATION
-- ============================================================================

-- 1. CREATE COMPANIES TABLE (Multi-Tenancy Foundation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. CREATE DEALS TABLE (CRM Pipeline)
-- ============================================================================
CREATE TYPE public.deal_stage AS ENUM ('lead', 'contacted', 'qualified', 'proposal', 'won', 'lost');

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC,
  stage public.deal_stage DEFAULT 'lead',
  loss_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- 3. ADD ATTENDANCE STATUS ENUM FOR CALLS
-- ============================================================================
CREATE TYPE public.attendance_status AS ENUM ('pending', 'show', 'no_show');

-- 4. ADD COMPANY_ID TO ALL MAJOR TABLES
-- ============================================================================

-- Add company_id and is_super_admin to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Add company_id to vendas
ALTER TABLE public.vendas 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to metas
ALTER TABLE public.metas 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to metas_consolidadas
ALTER TABLE public.metas_consolidadas 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id and attendance_status to calls
ALTER TABLE public.calls 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attendance_status public.attendance_status DEFAULT 'pending';

-- Add company_id to agendamentos
ALTER TABLE public.agendamentos 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. CREATE DEFAULT COMPANY AND MIGRATE EXISTING DATA
-- ============================================================================
INSERT INTO public.companies (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Game Sales Default', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Assign existing users to default company
UPDATE public.profiles 
SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- Make first user super admin (Markus)
UPDATE public.profiles
SET is_super_admin = true
WHERE id = '9189eaae-8877-42b2-bfc4-a25fef5a54e2';

-- Assign company_id to existing data
UPDATE public.vendas SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.metas SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.metas_consolidadas SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.calls SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.agendamentos SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.produtos SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 6. RLS POLICIES - MULTI-TENANT ARCHITECTURE
-- ============================================================================

-- Companies RLS
CREATE POLICY "Super admins can manage all companies" ON public.companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT USING (
    id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Profiles RLS (update existing)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Super admins bypass profiles RLS" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Admins can view company profiles" ON public.profiles
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view own profile and company profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Vendas RLS (update existing)
DROP POLICY IF EXISTS "Users can view own sales or admins view all" ON public.vendas;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.vendas;
DROP POLICY IF EXISTS "Users can update own sales" ON public.vendas;
DROP POLICY IF EXISTS "Admins can update all sales" ON public.vendas;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.vendas;

CREATE POLICY "Super admins bypass vendas RLS" ON public.vendas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company admins view all company sales" ON public.vendas
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Sellers view own company sales" ON public.vendas
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users insert own company sales" ON public.vendas
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users update own company sales" ON public.vendas
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins delete company sales" ON public.vendas
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Deals RLS
CREATE POLICY "Super admins bypass deals RLS" ON public.deals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company admins view all company deals" ON public.deals
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Sellers view own deals" ON public.deals
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

CREATE POLICY "Sellers manage own deals" ON public.deals
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

CREATE POLICY "Sellers update own deals" ON public.deals
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

-- Calls RLS (update existing)
DROP POLICY IF EXISTS "Users can view own calls or admins view all" ON public.calls;
DROP POLICY IF EXISTS "Users can insert own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can delete own calls" ON public.calls;
DROP POLICY IF EXISTS "Admins can update all calls" ON public.calls;
DROP POLICY IF EXISTS "Admins can delete all calls" ON public.calls;

CREATE POLICY "Super admins bypass calls RLS" ON public.calls
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company users manage company calls" ON public.calls
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Agendamentos RLS (update existing)
DROP POLICY IF EXISTS "Users can view own appointments or admins view all" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Admins can delete all appointments" ON public.agendamentos;

CREATE POLICY "Super admins bypass agendamentos RLS" ON public.agendamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company users manage company appointments" ON public.agendamentos
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Metas RLS (update existing)
DROP POLICY IF EXISTS "Users can view own goals or admins view all" ON public.metas;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.metas;
DROP POLICY IF EXISTS "Users can update own goals" ON public.metas;
DROP POLICY IF EXISTS "Admins can manage goals" ON public.metas;

CREATE POLICY "Super admins bypass metas RLS" ON public.metas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company users manage company goals" ON public.metas
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Metas Consolidadas RLS (update existing)
DROP POLICY IF EXISTS "Everyone can view consolidated goals" ON public.metas_consolidadas;
DROP POLICY IF EXISTS "Admins can manage consolidated goals" ON public.metas_consolidadas;

CREATE POLICY "Super admins bypass metas consolidadas RLS" ON public.metas_consolidadas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company users view company consolidated goals" ON public.metas_consolidadas
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Company admins manage consolidated goals" ON public.metas_consolidadas
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Produtos RLS (update existing)
DROP POLICY IF EXISTS "Everyone can view active products" ON public.produtos;
DROP POLICY IF EXISTS "Admins can manage products" ON public.produtos;

CREATE POLICY "Super admins bypass produtos RLS" ON public.produtos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company users view company products" ON public.produtos
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND ativo = true
  );

CREATE POLICY "Company admins manage products" ON public.produtos
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 7. GOAL PROGRESS AUTO-UPDATE TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month_total NUMERIC;
BEGIN
  -- Calculate total approved sales for the user in current month
  SELECT COALESCE(SUM(valor), 0) INTO current_month_total
  FROM public.vendas
  WHERE user_id = NEW.user_id
    AND company_id = NEW.company_id
    AND date_trunc('month', data_venda) = date_trunc('month', CURRENT_DATE)
    AND status = 'Aprovado';

  -- Update or insert goal progress
  INSERT INTO public.metas (user_id, company_id, mes_referencia, valor_meta)
  VALUES (
    NEW.user_id,
    NEW.company_id,
    date_trunc('month', CURRENT_DATE)::date,
    0 -- placeholder, admin sets actual goal
  )
  ON CONFLICT (user_id, mes_referencia) 
  DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_goal_progress
AFTER INSERT OR UPDATE ON public.vendas
FOR EACH ROW
WHEN (NEW.status = 'Aprovado')
EXECUTE FUNCTION public.update_goal_progress();

-- 8. CREATE UNIQUE CONSTRAINT FOR METAS
-- ============================================================================
ALTER TABLE public.metas 
  DROP CONSTRAINT IF EXISTS metas_user_mes_unique;

ALTER TABLE public.metas 
  ADD CONSTRAINT metas_user_mes_unique UNIQUE (user_id, mes_referencia);

-- 9. UPDATE CONTRIBUICAO VIEW FOR MULTI-TENANCY
-- ============================================================================
DROP VIEW IF EXISTS public.contribuicao_vendedores;

CREATE OR REPLACE VIEW public.contribuicao_vendedores AS
SELECT 
  p.id AS user_id,
  p.nome,
  p.avatar_url,
  p.nivel,
  p.pontos,
  p.company_id,
  mc.mes_referencia,
  mc.valor_meta AS meta_total,
  COALESCE(SUM(v.valor), 0) AS contribuicao,
  CASE 
    WHEN mc.valor_meta > 0 THEN (COALESCE(SUM(v.valor), 0) / mc.valor_meta * 100)
    ELSE 0 
  END AS percentual_contribuicao,
  RANK() OVER (
    PARTITION BY mc.mes_referencia, p.company_id 
    ORDER BY COALESCE(SUM(v.valor), 0) DESC
  ) AS posicao_ranking
FROM public.profiles p
CROSS JOIN public.metas_consolidadas mc
LEFT JOIN public.vendas v ON v.user_id = p.id 
  AND v.company_id = p.company_id
  AND date_trunc('month', v.data_venda)::date = mc.mes_referencia
  AND v.status = 'Aprovado'
WHERE p.company_id = mc.company_id
GROUP BY p.id, p.nome, p.avatar_url, p.nivel, p.pontos, p.company_id, mc.mes_referencia, mc.valor_meta;