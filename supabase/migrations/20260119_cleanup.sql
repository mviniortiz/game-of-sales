-- =========================================
-- LIMPEZA: Remove triggers antigos que podem estar causando erro
-- Execute isto PRIMEIRO
-- =========================================

-- Remover triggers antigos que podem estar com erro
DROP TRIGGER IF EXISTS trigger_log_deal_created ON public.deals;
DROP TRIGGER IF EXISTS trigger_log_deal_stage_change ON public.deals;
DROP TRIGGER IF EXISTS trigger_set_deal_company_id ON public.deals;

-- Remover funções antigas
DROP FUNCTION IF EXISTS log_deal_created();
DROP FUNCTION IF EXISTS log_deal_stage_change();
DROP FUNCTION IF EXISTS set_deal_company_id();

SELECT 'Triggers antigos removidos!' AS resultado;
