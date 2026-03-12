CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  remind_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_user_pending ON follow_up_reminders(user_id, completed, remind_at);
CREATE INDEX idx_reminders_deal ON follow_up_reminders(deal_id);
CREATE INDEX idx_reminders_company ON follow_up_reminders(company_id);

ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_select" ON follow_up_reminders FOR SELECT USING (
  public.is_super_admin() OR (company_id = public.get_my_company_id() AND user_id = auth.uid())
);
CREATE POLICY "reminders_insert" ON follow_up_reminders FOR INSERT WITH CHECK (
  public.is_super_admin() OR (company_id = public.get_my_company_id() AND user_id = auth.uid())
);
CREATE POLICY "reminders_update" ON follow_up_reminders FOR UPDATE USING (
  public.is_super_admin() OR (company_id = public.get_my_company_id() AND user_id = auth.uid())
);
CREATE POLICY "reminders_delete" ON follow_up_reminders FOR DELETE USING (
  public.is_super_admin() OR (company_id = public.get_my_company_id() AND user_id = auth.uid())
);
