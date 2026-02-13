-- =====================================================
-- Game Sales CRM - Deals Table (Safe Migration)
-- =====================================================

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS deals CASCADE;

-- Create deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  title VARCHAR(255) NOT NULL,
  value DECIMAL(15, 2) DEFAULT 0,
  
  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Pipeline stage
  stage VARCHAR(50) NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  
  -- Position in column for ordering
  position INTEGER DEFAULT 0,
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  product_id UUID,
  
  -- Metadata
  notes TEXT,
  expected_close_date DATE,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_position ON deals(stage, position);

-- Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON deals TO authenticated;
GRANT ALL ON deals TO service_role;

-- RLS Policies

-- Users can CRUD their own deals
CREATE POLICY "Users can view their own deals"
  ON deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deals"
  ON deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deals"
  ON deals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deals"
  ON deals FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all deals in their company
CREATE POLICY "Admins can view company deals"
  ON deals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Super Admins can view all deals
CREATE POLICY "Super admins can view all deals"
  ON deals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();

-- Auto-set company_id from user profile
CREATE OR REPLACE FUNCTION set_deal_company_id()
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

CREATE TRIGGER trigger_set_deal_company_id
  BEFORE INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_deal_company_id();

SELECT 'Deals table created successfully!' as status;
