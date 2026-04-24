-- ════════════════════════════════════════════════════════════════════════
-- SaaS B2B features: accounts, stakeholders, roles SDR/Closer/AM, SLA,
-- eva_deal_suggestions
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Deals: account, stakeholders, handoff, SLA ────────────────────────
ALTER TABLE public.deals
    ADD COLUMN IF NOT EXISTS account_name text,
    ADD COLUMN IF NOT EXISTS account_website text,
    ADD COLUMN IF NOT EXISTS account_industry text,
    ADD COLUMN IF NOT EXISTS additional_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sdr_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS closer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS handoff_at timestamptz,
    ADD COLUMN IF NOT EXISTS sla_hours integer NOT NULL DEFAULT 48,
    ADD COLUMN IF NOT EXISTS sla_breach_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deals_sdr_id ON public.deals(sdr_id) WHERE sdr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_closer_id ON public.deals(closer_id) WHERE closer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_sla_breach ON public.deals(company_id, sla_breach_at)
    WHERE sla_breach_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_updated_at_company ON public.deals(company_id, updated_at DESC);

COMMENT ON COLUMN public.deals.account_name IS 'Nome da empresa-alvo B2B (ex: Acme Corp)';
COMMENT ON COLUMN public.deals.additional_contacts IS 'Array JSON de stakeholders: [{name, email, phone, role}]';
COMMENT ON COLUMN public.deals.sdr_id IS 'SDR que qualificou, pode ser diferente do user_id (dono atual)';
COMMENT ON COLUMN public.deals.closer_id IS 'Closer responsável pelo fechamento';
COMMENT ON COLUMN public.deals.handoff_at IS 'Quando SDR fez handoff pro Closer (setado ao mover pra estágio de handoff)';
COMMENT ON COLUMN public.deals.sla_breach_at IS 'Deadline do SLA do Closer (handoff_at + sla_hours)';

-- ─── 2. Profiles: sales_role (SDR, Closer, AM, Generic) ──────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS sales_role text NOT NULL DEFAULT 'generic'
        CHECK (sales_role IN ('sdr', 'closer', 'am', 'generic'));

CREATE INDEX IF NOT EXISTS idx_profiles_sales_role ON public.profiles(company_id, sales_role);

COMMENT ON COLUMN public.profiles.sales_role IS 'Papel comercial: sdr|closer|am|generic. Usado em ranking, handoff, dashboards.';

-- ─── 3. eva_deal_suggestions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eva_deal_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    suggestion_text text NOT NULL,
    message_draft text NOT NULL,
    reason text,
    days_stale integer,
    sla_context text,
    generated_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'edited', 'skipped', 'expired')),
    final_message text,
    sent_via text CHECK (sent_via IN ('whatsapp', 'email', 'manual')),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eva_sug_deal_status ON public.eva_deal_suggestions(deal_id, status);
CREATE INDEX IF NOT EXISTS idx_eva_sug_pending_company ON public.eva_deal_suggestions(company_id, status)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_eva_sug_generated_at ON public.eva_deal_suggestions(generated_at DESC);

COMMENT ON TABLE public.eva_deal_suggestions IS 'Sugestões geradas pela Eva IA via cron (stale deals). Usuário aceita/edita/pula.';

-- ─── 4. RLS eva_deal_suggestions ──────────────────────────────────────────
ALTER TABLE public.eva_deal_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eva_sug_select_own_company" ON public.eva_deal_suggestions;
CREATE POLICY "eva_sug_select_own_company" ON public.eva_deal_suggestions
    FOR SELECT
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "eva_sug_update_own_company" ON public.eva_deal_suggestions;
CREATE POLICY "eva_sug_update_own_company" ON public.eva_deal_suggestions
    FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Nota: INSERT só via service_role (edge function). Sem policy de INSERT
-- significa que usuários autenticados não podem inserir. Service role bypassa RLS.

-- Grants explícitos pro service_role inserir (RLS bypassa mas precisa GRANT)
GRANT ALL ON TABLE public.eva_deal_suggestions TO service_role;
GRANT SELECT, UPDATE ON TABLE public.eva_deal_suggestions TO authenticated;

-- ─── 5. Trigger: SLA auto-compute ao setar handoff_at ─────────────────────
CREATE OR REPLACE FUNCTION public.deals_sla_compute()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Se handoff_at acabou de ser setado (era NULL, agora tem valor) e sla_breach_at ainda NULL
    IF NEW.handoff_at IS NOT NULL
       AND (OLD.handoff_at IS NULL OR OLD.handoff_at IS DISTINCT FROM NEW.handoff_at)
       AND NEW.sla_breach_at IS NULL THEN
        NEW.sla_breach_at := NEW.handoff_at + make_interval(hours => COALESCE(NEW.sla_hours, 48));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_sla_compute ON public.deals;
CREATE TRIGGER trg_deals_sla_compute
    BEFORE UPDATE OF handoff_at, sla_hours ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION public.deals_sla_compute();

-- INSERT case
CREATE OR REPLACE FUNCTION public.deals_sla_compute_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.handoff_at IS NOT NULL AND NEW.sla_breach_at IS NULL THEN
        NEW.sla_breach_at := NEW.handoff_at + make_interval(hours => COALESCE(NEW.sla_hours, 48));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_sla_compute_insert ON public.deals;
CREATE TRIGGER trg_deals_sla_compute_insert
    BEFORE INSERT ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION public.deals_sla_compute_on_insert();
