-- Migration: Create tables for integrations
-- Run this in the Supabase SQL Editor

-- Table to store integration configurations per company
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL, -- 'hotmart', 'kiwify', 'celetus', etc.
  hottok TEXT, -- Secret token for webhook validation
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}', -- Additional platform-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, platform)
);

-- Table to log all webhook events received
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received', -- 'received', 'processing', 'success', 'error'
  error_message TEXT,
  processed_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source and external_id columns to deals table for tracking origin
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_external_id ON deals(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_source ON deals(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_company_platform ON webhook_logs(company_id, platform);
CREATE INDEX IF NOT EXISTS idx_integration_configs_platform_hottok ON integration_configs(platform, hottok);

-- Enable RLS
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_configs
-- Users can view their company integrations
CREATE POLICY "integration_configs_select_policy"
  ON integration_configs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can manage their company integrations (is_super_admin or same company)
CREATE POLICY "integration_configs_all_policy"
  ON integration_configs FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- RLS Policies for webhook_logs
CREATE POLICY "webhook_logs_select_policy"
  ON webhook_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Allow service role full access (for Edge Functions)
CREATE POLICY "integration_configs_service_role"
  ON integration_configs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "webhook_logs_service_role"
  ON webhook_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_integration_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_integration_configs_timestamp ON integration_configs;
CREATE TRIGGER update_integration_configs_timestamp
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_config_timestamp();

-- Grant permissions
GRANT ALL ON integration_configs TO authenticated;
GRANT ALL ON webhook_logs TO authenticated;
GRANT ALL ON integration_configs TO service_role;
GRANT ALL ON webhook_logs TO service_role;
