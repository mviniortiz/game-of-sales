-- ─────────────────────────────────────────────────────────────────────────────
-- PROP.1 (2026-06-12) — Propostas comerciais salvas (editor + PDF)
--
-- Substitui o gerador de PDF "voador" (que só baixava, sem salvar) por propostas
-- persistidas e vinculadas a um deal. Itens livres em JSONB (não dependem de
-- produto pré-cadastrado). Base para futuro envio/tracking (PROP.2).
--
-- Rodar: npx supabase db query --linked -f supabase/migrations/20260612_proposals.sql
-- IDEMPOTENTE: CREATE IF NOT EXISTS, guardas via pg_policies/pg_trigger.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  deal_id         UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  customer_name   TEXT,
  customer_email  TEXT,
  customer_phone  TEXT,
  -- itens: [{ nome, descricao, quantidade, preco_unitario, desconto_percentual }]
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  validity_days   INTEGER NOT NULL DEFAULT 30,
  conditions      TEXT,
  total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviada','aceita','recusada')),
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_company ON public.proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_deal    ON public.proposals(deal_id);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.proposals TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposals' AND policyname='proposals_all_policy') THEN
    CREATE POLICY "proposals_all_policy" ON public.proposals
      FOR ALL
      USING (public.is_super_admin() OR company_id = public.get_my_company_id())
      WITH CHECK (public.is_super_admin() OR company_id = public.get_my_company_id());
  END IF;
END $$;

-- updated_at + derivar company_id do deal/profile em insert
CREATE OR REPLACE FUNCTION public.set_proposal_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.set_proposal_company_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    IF NEW.deal_id IS NOT NULL THEN
      SELECT company_id INTO NEW.company_id FROM public.deals WHERE id = NEW.deal_id;
    END IF;
    IF NEW.company_id IS NULL AND NEW.created_by IS NOT NULL THEN
      SELECT company_id INTO NEW.company_id FROM public.profiles WHERE id = NEW.created_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_proposals_updated_at') THEN
    CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON public.proposals
      FOR EACH ROW EXECUTE FUNCTION public.set_proposal_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_proposals_company_id') THEN
    CREATE TRIGGER trg_proposals_company_id BEFORE INSERT ON public.proposals
      FOR EACH ROW EXECUTE FUNCTION public.set_proposal_company_id();
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'PROP.1 aplicada (tabela proposals).'; END $$;
