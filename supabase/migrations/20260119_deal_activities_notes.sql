-- =========================================
-- Migração: Adicionar company_id na tabela deals (se não existir)
-- + Criar tabelas deal_activities e deal_notes
-- Data: 2026-01-19
-- =========================================

-- =========================================
-- 0. PRIMEIRO: Garantir que deals tem company_id
-- =========================================

-- Adicionar coluna company_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'deals' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.deals ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);
        
        RAISE NOTICE 'Coluna company_id adicionada à tabela deals';
    ELSE
        RAISE NOTICE 'Coluna company_id já existe na tabela deals';
    END IF;
END $$;

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


-- =========================================
-- 1. TABELA: deal_activities
-- =========================================

CREATE TABLE IF NOT EXISTS public.deal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'created', 'stage_changed', 'field_updated', 'won', 'lost',
        'note_added', 'call_made', 'email_sent', 'meeting_scheduled'
    )),
    
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_user_id ON public.deal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_company_id ON public.deal_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_at ON public.deal_activities(created_at DESC);

ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_activities_select" ON public.deal_activities;
CREATE POLICY "deal_activities_select" ON public.deal_activities FOR SELECT 
USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "deal_activities_insert" ON public.deal_activities;
CREATE POLICY "deal_activities_insert" ON public.deal_activities FOR INSERT WITH CHECK (user_id = auth.uid());


-- =========================================
-- 2. TABELA: deal_notes
-- =========================================

CREATE TABLE IF NOT EXISTS public.deal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON public.deal_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_user_id ON public.deal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_company_id ON public.deal_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_created_at ON public.deal_notes(created_at DESC);

ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_notes_select" ON public.deal_notes;
CREATE POLICY "deal_notes_select" ON public.deal_notes FOR SELECT 
USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "deal_notes_insert" ON public.deal_notes;
CREATE POLICY "deal_notes_insert" ON public.deal_notes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "deal_notes_update" ON public.deal_notes;
CREATE POLICY "deal_notes_update" ON public.deal_notes FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "deal_notes_delete" ON public.deal_notes;
CREATE POLICY "deal_notes_delete" ON public.deal_notes FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_deal_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deal_notes_updated_at ON public.deal_notes;
CREATE TRIGGER trigger_deal_notes_updated_at
    BEFORE UPDATE ON public.deal_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_notes_updated_at();


-- =========================================
-- 3. TRIGGERS para log automático
-- =========================================

CREATE OR REPLACE FUNCTION log_deal_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.deal_activities (deal_id, user_id, company_id, activity_type, description, new_value)
    VALUES (NEW.id, NEW.user_id, NEW.company_id, 'created', 'Deal criado: ' || NEW.title, NEW.title);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_deal_created ON public.deals;
CREATE TRIGGER trigger_log_deal_created
    AFTER INSERT ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION log_deal_created();


CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        INSERT INTO public.deal_activities (deal_id, user_id, company_id, activity_type, description, old_value, new_value)
        VALUES (
            NEW.id, NEW.user_id, NEW.company_id,
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
SELECT 'Migração completa! company_id garantido + tabelas criadas!' AS resultado;
