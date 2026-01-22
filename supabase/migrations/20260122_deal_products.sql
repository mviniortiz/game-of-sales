-- ============================================================================
-- DEAL_PRODUCTS - Associação de Produtos a Deals
-- Data: 2026-01-22
-- 
-- Permite associar produtos cadastrados pela empresa a cada deal,
-- com quantidade, preço e desconto personalizados.
-- ============================================================================

-- ============================================================================
-- 1. TABELA: deal_products
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deal_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Quantidade e preços
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario DECIMAL(15,2) NOT NULL CHECK (preco_unitario >= 0),
    desconto_percentual DECIMAL(5,2) DEFAULT 0 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicatas do mesmo produto no mesmo deal
    UNIQUE(deal_id, produto_id)
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_deal_products_deal_id ON public.deal_products(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_products_produto_id ON public.deal_products(produto_id);
CREATE INDEX IF NOT EXISTS idx_deal_products_company_id ON public.deal_products(company_id);

-- ============================================================================
-- 2. TRIGGER: Auto-preencher company_id
-- ============================================================================

CREATE OR REPLACE FUNCTION set_deal_products_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id
        FROM public.deals
        WHERE id = NEW.deal_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_deal_products_company_id ON public.deal_products;
CREATE TRIGGER trigger_set_deal_products_company_id
    BEFORE INSERT ON public.deal_products
    FOR EACH ROW
    EXECUTE FUNCTION set_deal_products_company_id();

-- ============================================================================
-- 3. TRIGGER: Atualizar updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_deal_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deal_products_updated_at ON public.deal_products;
CREATE TRIGGER trigger_deal_products_updated_at
    BEFORE UPDATE ON public.deal_products
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_products_updated_at();

-- ============================================================================
-- 4. TRIGGER: Recalcular valor do deal quando produtos são alterados
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_deal_value()
RETURNS TRIGGER AS $$
DECLARE
    v_deal_id UUID;
    v_total DECIMAL(15,2);
BEGIN
    -- Determinar qual deal foi afetado
    IF TG_OP = 'DELETE' THEN
        v_deal_id := OLD.deal_id;
    ELSE
        v_deal_id := NEW.deal_id;
    END IF;
    
    -- Calcular o novo total
    SELECT COALESCE(SUM(
        quantidade * preco_unitario * (1 - desconto_percentual / 100)
    ), 0)
    INTO v_total
    FROM public.deal_products
    WHERE deal_id = v_deal_id;
    
    -- Atualizar o deal
    UPDATE public.deals
    SET value = v_total
    WHERE id = v_deal_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recalculate_deal_value_insert ON public.deal_products;
CREATE TRIGGER trigger_recalculate_deal_value_insert
    AFTER INSERT ON public.deal_products
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_deal_value();

DROP TRIGGER IF EXISTS trigger_recalculate_deal_value_update ON public.deal_products;
CREATE TRIGGER trigger_recalculate_deal_value_update
    AFTER UPDATE ON public.deal_products
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_deal_value();

DROP TRIGGER IF EXISTS trigger_recalculate_deal_value_delete ON public.deal_products;
CREATE TRIGGER trigger_recalculate_deal_value_delete
    AFTER DELETE ON public.deal_products
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_deal_value();

-- ============================================================================
-- 5. RLS: Row Level Security
-- ============================================================================

ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;

-- SELECT: Ver produtos dos deals da mesma empresa
CREATE POLICY "deal_products_select_policy" ON public.deal_products
    FOR SELECT USING (
        public.is_super_admin()
        OR company_id = public.get_my_company_id()
    );

-- INSERT: Adicionar produtos a deals da mesma empresa
CREATE POLICY "deal_products_insert_policy" ON public.deal_products
    FOR INSERT WITH CHECK (
        deal_id IN (
            SELECT id FROM public.deals 
            WHERE company_id = public.get_my_company_id()
        )
    );

-- UPDATE: Atualizar produtos dos deals da mesma empresa
CREATE POLICY "deal_products_update_policy" ON public.deal_products
    FOR UPDATE USING (
        public.is_super_admin()
        OR company_id = public.get_my_company_id()
    );

-- DELETE: Remover produtos dos deals da mesma empresa
CREATE POLICY "deal_products_delete_policy" ON public.deal_products
    FOR DELETE USING (
        public.is_super_admin()
        OR company_id = public.get_my_company_id()
    );

-- ============================================================================
-- 6. Permissões
-- ============================================================================

GRANT ALL ON public.deal_products TO authenticated;
GRANT ALL ON public.deal_products TO service_role;

-- ============================================================================
SELECT 'Tabela deal_products criada com sucesso!' AS resultado;
