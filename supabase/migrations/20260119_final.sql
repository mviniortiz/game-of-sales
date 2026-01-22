-- =========================================
-- FINAL: Apenas índices e RLS (SEM triggers)
-- =========================================

-- Remover policies genéricas
DROP POLICY IF EXISTS "allow_all_activities" ON public.deal_activities;
DROP POLICY IF EXISTS "allow_all_notes" ON public.deal_notes;

-- Índices
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_user_id ON public.deal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_at ON public.deal_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON public.deal_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_user_id ON public.deal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_notes_created_at ON public.deal_notes(created_at DESC);

-- RLS para deal_activities
CREATE POLICY "deal_activities_select" ON public.deal_activities FOR SELECT USING (true);
CREATE POLICY "deal_activities_insert" ON public.deal_activities FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS para deal_notes
CREATE POLICY "deal_notes_select" ON public.deal_notes FOR SELECT USING (true);
CREATE POLICY "deal_notes_insert" ON public.deal_notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "deal_notes_update" ON public.deal_notes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "deal_notes_delete" ON public.deal_notes FOR DELETE USING (user_id = auth.uid());

-- Trigger updated_at
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

SELECT 'Índices e RLS criados!' AS resultado;
