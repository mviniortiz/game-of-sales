-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_deals_company_user ON deals(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_stage ON deals(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id, company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id, is_super_admin);
CREATE INDEX IF NOT EXISTS idx_vendas_user_data ON vendas(user_id, data_venda);
CREATE INDEX IF NOT EXISTS idx_deal_custom_field_values_deal ON deal_custom_field_values(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_custom_field_defs_company ON deal_custom_field_definitions(company_id);
