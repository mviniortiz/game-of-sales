-- ============================================================================
-- Game Sales - ONBOARDING STEP-BY-STEP MIGRATION
-- Adiciona campos para coletar dados valiosos durante o onboarding
-- ============================================================================

-- Adicionar novos campos à tabela companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS team_size TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS main_challenge TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.companies.team_size IS 'Quantidade de vendedores no time (1-5, 6-15, 16-50, 51-100, 100+)';
COMMENT ON COLUMN public.companies.referral_source IS 'Por onde conheceu o Game Sales (instagram, youtube, linkedin, google, indicacao, email, outro)';
COMMENT ON COLUMN public.companies.main_challenge IS 'Maior dificuldade do time comercial';
