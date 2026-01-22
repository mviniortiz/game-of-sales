-- =========================================
-- PARTE 1: Adicionar company_id na tabela deals
-- Execute isto PRIMEIRO
-- =========================================

-- Adicionar coluna company_id se não existir
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);

-- Atualizar deals existentes com company_id do perfil do usuário
UPDATE public.deals d
SET company_id = (SELECT company_id FROM public.profiles WHERE id = d.user_id)
WHERE d.company_id IS NULL;

-- Criar trigger para auto-preencher company_id em novos deals
CREATE OR REPLACE FUNCTION set_deal_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id
        FROM public.profiles
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_deal_company_id ON public.deals;
CREATE TRIGGER trigger_set_deal_company_id
    BEFORE INSERT ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION set_deal_company_id();

SELECT 'PARTE 1 COMPLETA! Agora execute a PARTE 2.' AS resultado;
