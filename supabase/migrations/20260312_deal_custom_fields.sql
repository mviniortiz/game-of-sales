-- ============================================================
-- Custom fields for deals: definitions (per company) + values (per deal)
-- ============================================================

-- 1. Field definitions — scoped by company
CREATE TABLE IF NOT EXISTS deal_custom_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'boolean')),
  options JSONB DEFAULT NULL,
  position INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, field_name)
);

-- 2. Field values — one row per deal × field
CREATE TABLE IF NOT EXISTS deal_custom_field_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES deal_custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deal_id, field_definition_id)
);

-- 3. Indexes
CREATE INDEX idx_dcfd_company ON deal_custom_field_definitions(company_id);
CREATE INDEX idx_dcfv_deal ON deal_custom_field_values(deal_id);
CREATE INDEX idx_dcfv_definition ON deal_custom_field_values(field_definition_id);

-- 4. RLS
ALTER TABLE deal_custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_custom_field_values ENABLE ROW LEVEL SECURITY;

-- Definitions: users can manage fields of their own company
CREATE POLICY "dcfd_select" ON deal_custom_field_definitions
  FOR SELECT USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "dcfd_insert" ON deal_custom_field_definitions
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "dcfd_update" ON deal_custom_field_definitions
  FOR UPDATE USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "dcfd_delete" ON deal_custom_field_definitions
  FOR DELETE USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

-- Values: access scoped via the deal's company
CREATE POLICY "dcfv_select" ON deal_custom_field_values
  FOR SELECT USING (
    public.is_super_admin()
    OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
  );

CREATE POLICY "dcfv_insert" ON deal_custom_field_values
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
  );

CREATE POLICY "dcfv_update" ON deal_custom_field_values
  FOR UPDATE USING (
    public.is_super_admin()
    OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
  );

CREATE POLICY "dcfv_delete" ON deal_custom_field_values
  FOR DELETE USING (
    public.is_super_admin()
    OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
  );
