-- =========================================
-- PARTE 3: Triggers de log automático
-- Execute isto DEPOIS da PARTE 2
-- =========================================

-- Função para registrar criação de deal
-- Busca company_id do profile do usuário
CREATE OR REPLACE FUNCTION log_deal_created()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = NEW.user_id;
    
    INSERT INTO public.deal_activities (deal_id, user_id, company_id, activity_type, description, new_value)
    VALUES (NEW.id, NEW.user_id, v_company_id, 'created', 'Deal criado: ' || NEW.title, NEW.title);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_deal_created ON public.deals;
CREATE TRIGGER trigger_log_deal_created
    AFTER INSERT ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION log_deal_created();


-- Função para registrar mudança de estágio
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        SELECT company_id INTO v_company_id FROM public.profiles WHERE id = NEW.user_id;
        
        INSERT INTO public.deal_activities (deal_id, user_id, company_id, activity_type, description, old_value, new_value)
        VALUES (
            NEW.id, NEW.user_id, v_company_id,
            CASE 
                WHEN NEW.stage = 'closed_won' THEN 'won'
                WHEN NEW.stage = 'closed_lost' THEN 'lost'
                ELSE 'stage_changed'
            END,
            CASE 
                WHEN NEW.stage = 'closed_won' THEN 'Deal ganho! 🎉'
                WHEN NEW.stage = 'closed_lost' THEN 'Deal perdido'
                ELSE 'Estágio alterado de ' || COALESCE(OLD.stage, 'nenhum') || ' para ' || NEW.stage
            END,
            OLD.stage,
            NEW.stage
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_deal_stage_change ON public.deals;
CREATE TRIGGER trigger_log_deal_stage_change
    AFTER UPDATE ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION log_deal_stage_change();

-- =========================================
SELECT 'PARTE 3 COMPLETA! Triggers de log criados!' AS resultado;
