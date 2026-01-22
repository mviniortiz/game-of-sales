-- =========================================
-- PARTE 2: Criar tabelas deal_activities e deal_notes
-- Execute isto DEPOIS da PARTE 1
-- =========================================

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
SELECT 'PARTE 2 COMPLETA! Tabelas criadas com sucesso!' AS resultado;
