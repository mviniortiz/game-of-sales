-- Tags table (company-scoped)
CREATE TABLE IF NOT EXISTS deal_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Junction table for deal-tag relationships
CREATE TABLE IF NOT EXISTS deal_tag_assignments (
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES deal_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, tag_id)
);

-- Indexes
CREATE INDEX idx_deal_tags_company ON deal_tags(company_id);
CREATE INDEX idx_deal_tag_assignments_deal ON deal_tag_assignments(deal_id);
CREATE INDEX idx_deal_tag_assignments_tag ON deal_tag_assignments(tag_id);

-- RLS
ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_tags_select" ON deal_tags FOR SELECT USING (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
CREATE POLICY "deal_tags_insert" ON deal_tags FOR INSERT WITH CHECK (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
CREATE POLICY "deal_tags_update" ON deal_tags FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
CREATE POLICY "deal_tags_delete" ON deal_tags FOR DELETE USING (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);

CREATE POLICY "deal_tag_assign_select" ON deal_tag_assignments FOR SELECT USING (
  public.is_super_admin() OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
);
CREATE POLICY "deal_tag_assign_insert" ON deal_tag_assignments FOR INSERT WITH CHECK (
  public.is_super_admin() OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
);
CREATE POLICY "deal_tag_assign_delete" ON deal_tag_assignments FOR DELETE USING (
  public.is_super_admin() OR deal_id IN (SELECT id FROM deals WHERE company_id = public.get_my_company_id())
);
