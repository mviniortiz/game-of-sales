-- =========================================
-- TRIGGERS: Log automático de atividades de deals
-- Execute isto para ativar o histórico automático
-- =========================================

-- Função para registrar criação de deal
CREATE OR REPLACE FUNCTION log_deal_created()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Busca company_id do perfil do usuário
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = NEW.user_id;
    
    INSERT INTO public.deal_activities (deal_id, user_id, company_id, activity_type, description, new_value)
    VALUES (NEW.id, NEW.user_id, v_company_id, 'created', 'Deal criado: ' || NEW.title, NEW.title);
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Se der erro, não bloqueia a criação do deal
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de log de criação
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
    v_activity_type TEXT;
    v_description TEXT;
BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        -- Busca company_id do perfil do usuário
        SELECT company_id INTO v_company_id FROM public.profiles WHERE id = NEW.user_id;
        
        -- Define tipo e descrição baseado no novo estágio
        IF NEW.stage = 'closed_won' THEN
            v_activity_type := 'won';
            v_description := '🎉 Deal ganho!';
        ELSIF NEW.stage = 'closed_lost' THEN
            v_activity_type := 'lost';
            v_description := 'Deal perdido';
        ELSE
            v_activity_type := 'stage_changed';
            v_description := 'Estágio: ' || COALESCE(OLD.stage, '?') || ' → ' || NEW.stage;
        END IF;
        
        INSERT INTO public.deal_activities (deal_id, user_id, company_id, activity_type, description, old_value, new_value)
        VALUES (NEW.id, NEW.user_id, v_company_id, v_activity_type, v_description, OLD.stage, NEW.stage);
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de log de mudança de estágio
DROP TRIGGER IF EXISTS trigger_log_deal_stage_change ON public.deals;
CREATE TRIGGER trigger_log_deal_stage_change
    AFTER UPDATE ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION log_deal_stage_change();


SELECT 'Triggers de log automático criados com sucesso!' AS resultado;
