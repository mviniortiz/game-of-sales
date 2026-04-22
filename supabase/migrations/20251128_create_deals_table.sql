-- =====================================================
-- Game Sales CRM - Deals Table (Safe Migration)
-- =====================================================
-- IMPORTANTE: arquivo neutralizado. O DROP TABLE CASCADE original era
-- destrutivo em prod. A tabela `deals` já existe no remote e foi muito
-- evoluída por migrations posteriores (ver 20260119_*, 20260311_*, etc).
-- Este arquivo permanece só como registro histórico; todas as operações
-- são idempotent e não tocam em dados existentes.

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  value DECIMAL(15, 2) DEFAULT 0,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  stage VARCHAR(50) NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  position INTEGER DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  product_id UUID,
  notes TEXT,
  expected_close_date DATE,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_position ON deals(stage, position);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

GRANT ALL ON deals TO authenticated;
GRANT ALL ON deals TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users can view their own deals') THEN
    CREATE POLICY "Users can view their own deals" ON deals FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users can insert their own deals') THEN
    CREATE POLICY "Users can insert their own deals" ON deals FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users can update their own deals') THEN
    CREATE POLICY "Users can update their own deals" ON deals FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users can delete their own deals') THEN
    CREATE POLICY "Users can delete their own deals" ON deals FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Admins can view company deals') THEN
    CREATE POLICY "Admins can view company deals" ON deals FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Super admins can view all deals') THEN
    CREATE POLICY "Super admins can view all deals" ON deals FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = TRUE)
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_deals_updated_at') THEN
    CREATE TRIGGER trigger_update_deals_updated_at
      BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_deals_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_deal_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_deal_company_id') THEN
    CREATE TRIGGER trigger_set_deal_company_id
      BEFORE INSERT ON deals FOR EACH ROW EXECUTE FUNCTION set_deal_company_id();
  END IF;
END $$;
