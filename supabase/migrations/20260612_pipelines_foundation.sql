-- ─────────────────────────────────────────────────────────────────────────────
-- PIPE.1 (2026-06-12) — Fundação de MÚLTIPLOS PIPELINES (funis) customizáveis
--
-- Hoje os estágios do CRM vivem em localStorage por navegador e `deals.stage` é
-- travado em 6 valores (CHECK/enum). Esta migration persiste funis no banco e
-- permite estágios arbitrários por funil, mantendo `deals.stage` legado em
-- DUAL-WRITE (via `pipeline_stages.legacy_key`) para não quebrar triggers,
-- webhooks de pagamento e RPCs de forecast/relatório que ainda leem `stage`.
--
-- COMO RODAR:
--   npx supabase db query --linked -f supabase/migrations/20260612_pipelines_foundation.sql
--
-- IDEMPOTENTE: CREATE ... IF NOT EXISTS, guardas via pg_policies/pg_constraint/
-- pg_trigger, e inserts com NOT EXISTS. Reexecutar é seguro.
--
-- NÃO altera o tipo/CHECK de `deals.stage` (fases A/B mantêm dual-write).
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABELAS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pipelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  name        VARCHAR(120) NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_company ON public.pipelines(company_id);
-- No máximo 1 funil default por company
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pipeline_default_per_company
  ON public.pipelines(company_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id         UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL,
  title               VARCHAR(120) NOT NULL,
  kind                VARCHAR(8) NOT NULL DEFAULT 'open' CHECK (kind IN ('open','won','lost')),
  icon_id             VARCHAR(32) NOT NULL DEFAULT 'target',
  color_id            VARCHAR(32) NOT NULL DEFAULT 'gray',
  position            INTEGER NOT NULL DEFAULT 0,
  default_probability INTEGER DEFAULT 50 CHECK (default_probability BETWEEN 0 AND 100),
  -- Casa o estágio novo com o `deals.stage` legado (lead..closed_lost).
  -- NULL para estágios criados pelo usuário.
  legacy_key          VARCHAR(50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON public.pipeline_stages(pipeline_id, position);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company  ON public.pipeline_stages(company_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. COLUNAS NOVAS EM deals (FKs adicionadas após o backfill, na seção 6)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS pipeline_id UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS stage_id    UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_deals_pipeline  ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id  ON public.deals(stage_id, position);
CREATE INDEX IF NOT EXISTS idx_deals_is_active ON public.deals(is_active);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RLS + GRANTS  (reusa helpers SECURITY DEFINER de 20251128000001 p/ evitar
--    recursão: public.get_my_company_id() e public.is_super_admin())
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pipelines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.pipelines       TO authenticated, service_role;
GRANT ALL ON public.pipeline_stages TO authenticated, service_role;
-- anon NÃO recebe grant (relatórios públicos usam RPCs SECURITY DEFINER).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipelines' AND policyname='pipelines_all_policy') THEN
    CREATE POLICY "pipelines_all_policy" ON public.pipelines
      FOR ALL
      USING (public.is_super_admin() OR company_id = public.get_my_company_id())
      WITH CHECK (public.is_super_admin() OR company_id = public.get_my_company_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pipeline_stages' AND policyname='pipeline_stages_all_policy') THEN
    CREATE POLICY "pipeline_stages_all_policy" ON public.pipeline_stages
      FOR ALL
      USING (public.is_super_admin() OR company_id = public.get_my_company_id())
      WITH CHECK (public.is_super_admin() OR company_id = public.get_my_company_id());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGERS DE MANUTENÇÃO
-- ══════════════════════════════════════════════════════════════════════════════

-- updated_at em pipelines / pipeline_stages
CREATE OR REPLACE FUNCTION public.set_pipeline_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pipelines_updated_at') THEN
    CREATE TRIGGER trg_pipelines_updated_at BEFORE UPDATE ON public.pipelines
      FOR EACH ROW EXECUTE FUNCTION public.set_pipeline_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pipeline_stages_updated_at') THEN
    CREATE TRIGGER trg_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages
      FOR EACH ROW EXECUTE FUNCTION public.set_pipeline_updated_at();
  END IF;
END $$;

-- Deriva company_id do pipeline ao inserir stage (espelha set_deal_company_id)
CREATE OR REPLACE FUNCTION public.set_pipeline_stage_company_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.pipelines WHERE id = NEW.pipeline_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_set_pipeline_stage_company_id') THEN
    CREATE TRIGGER trg_set_pipeline_stage_company_id BEFORE INSERT ON public.pipeline_stages
      FOR EACH ROW EXECUTE FUNCTION public.set_pipeline_stage_company_id();
  END IF;
END $$;

-- PEÇA NÃO-NEGOCIÁVEL: preenche pipeline_id/stage_id em inserts de deals que não
-- os informam (webhooks de pagamento, create_deal_from_demo_request, imports).
-- Casa pelo legacy_key = NEW.stage no funil default da company; se não casar,
-- usa o 1º estágio do funil default.
CREATE OR REPLACE FUNCTION public.set_deal_default_pipeline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pipeline UUID;
  v_stage    UUID;
BEGIN
  IF NEW.pipeline_id IS NOT NULL AND NEW.stage_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- company pode ainda estar NULL aqui; set_deal_company_id também é BEFORE INSERT,
  -- então derivamos de profiles como fallback para garantir ordem-independência.
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;

  IF NEW.company_id IS NULL THEN
    RETURN NEW; -- sem company não há funil; deixa nulo (caso de borda)
  END IF;

  SELECT id INTO v_pipeline FROM public.pipelines
    WHERE company_id = NEW.company_id AND is_default LIMIT 1;

  -- Company sem funil ainda: cria um default on-the-fly com os 6 estágios padrão.
  IF v_pipeline IS NULL THEN
    INSERT INTO public.pipelines (company_id, name, position, is_default)
      VALUES (NEW.company_id, 'Pipeline de Vendas', 0, true)
      RETURNING id INTO v_pipeline;
    INSERT INTO public.pipeline_stages
      (pipeline_id, company_id, title, kind, icon_id, color_id, position, default_probability, legacy_key)
    VALUES
      (v_pipeline, NEW.company_id, 'Lead',        'open', 'target',   'gray',    0, 10,  'lead'),
      (v_pipeline, NEW.company_id, 'Qualificação','open', 'users',    'blue',    1, 25,  'qualification'),
      (v_pipeline, NEW.company_id, 'Proposta',    'open', 'dollar',   'indigo',  2, 55,  'proposal'),
      (v_pipeline, NEW.company_id, 'Negociação',  'open', 'trending', 'amber',   3, 80,  'negotiation'),
      (v_pipeline, NEW.company_id, 'Ganho',       'won',  'check',    'emerald', 4, 100, 'closed_won'),
      (v_pipeline, NEW.company_id, 'Perdido',     'lost', 'target',   'gray',    5, 0,   'closed_lost');
  END IF;

  IF NEW.pipeline_id IS NULL THEN
    NEW.pipeline_id := v_pipeline;
  END IF;

  IF NEW.stage_id IS NULL THEN
    SELECT id INTO v_stage FROM public.pipeline_stages
      WHERE pipeline_id = NEW.pipeline_id AND legacy_key = NEW.stage LIMIT 1;
    IF v_stage IS NULL THEN
      SELECT id INTO v_stage FROM public.pipeline_stages
        WHERE pipeline_id = NEW.pipeline_id ORDER BY position LIMIT 1;
    END IF;
    NEW.stage_id := v_stage;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_set_deal_default_pipeline') THEN
    -- Nome com 'zzz' para ordenar DEPOIS de set_deal_company_id (triggers BEFORE
    -- correm em ordem alfabética do nome). Garante company_id já resolvido.
    CREATE TRIGGER zzz_set_deal_default_pipeline BEFORE INSERT ON public.deals
      FOR EACH ROW EXECUTE FUNCTION public.set_deal_default_pipeline();
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. MIGRAÇÃO DE DADOS (idempotente)
-- ══════════════════════════════════════════════════════════════════════════════

-- (a) 1 funil default por company que já tem deals
INSERT INTO public.pipelines (company_id, name, position, is_default)
SELECT DISTINCT d.company_id, 'Pipeline de Vendas', 0, true
FROM public.deals d
WHERE d.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.pipelines p
    WHERE p.company_id = d.company_id AND p.is_default
  );

-- (b) os 6 estágios padrão por funil default (kind + legacy_key)
WITH defs(legacy_key, title, kind, icon_id, color_id, pos, prob) AS (
  VALUES
    ('lead',          'Lead',         'open', 'target',   'gray',    0, 10),
    ('qualification', 'Qualificação', 'open', 'users',    'blue',    1, 25),
    ('proposal',      'Proposta',     'open', 'dollar',   'indigo',  2, 55),
    ('negotiation',   'Negociação',   'open', 'trending', 'amber',   3, 80),
    ('closed_won',    'Ganho',        'won',  'check',    'emerald', 4, 100),
    ('closed_lost',   'Perdido',      'lost', 'target',   'gray',    5, 0)
)
INSERT INTO public.pipeline_stages
  (pipeline_id, company_id, title, kind, icon_id, color_id, position, default_probability, legacy_key)
SELECT p.id, p.company_id, defs.title, defs.kind, defs.icon_id, defs.color_id, defs.pos, defs.prob, defs.legacy_key
FROM public.pipelines p
CROSS JOIN defs
WHERE p.is_default
  AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages s
    WHERE s.pipeline_id = p.id AND s.legacy_key = defs.legacy_key
  );

-- (c) backfill: casa company + legacy_key = deal.stage
UPDATE public.deals d
SET pipeline_id = p.id, stage_id = s.id
FROM public.pipelines p
JOIN public.pipeline_stages s ON s.pipeline_id = p.id
WHERE p.company_id = d.company_id
  AND p.is_default
  AND s.legacy_key = d.stage
  AND (d.pipeline_id IS NULL OR d.stage_id IS NULL);

-- (d) fallback: deal com stage fora do conjunto (ou nulo) -> 1º estágio do funil
UPDATE public.deals d
SET pipeline_id = p.id,
    stage_id = (
      SELECT s2.id FROM public.pipeline_stages s2
      WHERE s2.pipeline_id = p.id ORDER BY s2.position LIMIT 1
    )
FROM public.pipelines p
WHERE p.company_id = d.company_id
  AND p.is_default
  AND d.pipeline_id IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. FKs em deals (após backfill, idempotentes via pg_constraint)
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_pipeline_id_fkey') THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_pipeline_id_fkey
      FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_stage_id_fkey') THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_stage_id_fkey
      FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. VALIDAÇÃO (informativo nos logs)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_orphans INTEGER;
BEGIN
  SELECT count(*) INTO v_orphans
  FROM public.deals
  WHERE company_id IS NOT NULL AND pipeline_id IS NULL;
  RAISE NOTICE 'PIPE.1 aplicada. Deals com company mas sem pipeline_id (deveria ser 0): %', v_orphans;
END $$;
