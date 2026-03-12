CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_templates_company ON whatsapp_templates(company_id);
CREATE INDEX idx_whatsapp_templates_category ON whatsapp_templates(company_id, category);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wt_select" ON whatsapp_templates FOR SELECT USING (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
CREATE POLICY "wt_insert" ON whatsapp_templates FOR INSERT WITH CHECK (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
CREATE POLICY "wt_update" ON whatsapp_templates FOR UPDATE USING (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
CREATE POLICY "wt_delete" ON whatsapp_templates FOR DELETE USING (
  public.is_super_admin() OR company_id = public.get_my_company_id()
);
