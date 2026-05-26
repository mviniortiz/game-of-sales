-- ─────────────────────────────────────────────────────────────────────────────
-- F4E.1 (2026-05-19) — Memória Comercial da EVA: tabelas base
--
-- Cria a infraestrutura mínima pra EVA Assistida:
--   1. eva_business_context  — perfil completo da agência em JSONB
--   2. eva_knowledge_gaps    — registro do que a EVA não soube responder
--   3. conversation_summaries.qualification (JSONB) — qualif sugerida por chat
--
-- RLS segue padrão do projeto:
--   - super_admin: bypass total via is_super_admin()
--   - company members: leem o próprio context (get_my_company_id())
--   - company admins: escrevem o próprio context (has_role(uid,'admin'))
--
-- Decisões de design (memory F4E):
--   - JSONB-first: shape ainda iterando, sem decompor em N tabelas
--   - Validação de shape acontece no frontend/edge (zod), não no Postgres
--   - version column pra invalidar cache de conversation_summaries quando
--     contexto da agência muda
--   - EVA é ASSISTIDA: nenhuma policy permite escrita automática sem auth.uid()
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. eva_business_context ─────────────────────────────────────────────
--
-- Singleton por company_id. Guarda contexto da agência em 4 JSONBs:
--   agency:    descrição, tom de voz, horário, handoff, promessas proibidas
--   services:  array de serviços com preço, perguntas, objeções, fit rules
--   icp:       tiers (bom/médio/baixo/sem fit) + scoring rules
--   playbooks: array de sequências (lead campanha, follow-up, etc)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eva_business_context (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,

  agency          JSONB NOT NULL DEFAULT '{}'::jsonb,
  services        JSONB NOT NULL DEFAULT '[]'::jsonb,
  icp             JSONB NOT NULL DEFAULT '{}'::jsonb,
  playbooks       JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Incrementa em UPDATE pra invalidar cache de conversation_summaries
  version         INTEGER NOT NULL DEFAULT 1,
  last_edited_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eva_business_context_company
  ON public.eva_business_context(company_id);

COMMENT ON TABLE public.eva_business_context IS
  'F4E.1: Contexto comercial completo da agência (singleton por company_id). 4 JSONBs cobrem agency/services/icp/playbooks. version invalida cache.';

ALTER TABLE public.eva_business_context ENABLE ROW LEVEL SECURITY;

-- READ: super admin bypass + qualquer membro da company lê
CREATE POLICY "eva_business_context_select"
  ON public.eva_business_context
  FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

-- INSERT: super admin bypass + admin da company cria
CREATE POLICY "eva_business_context_insert"
  ON public.eva_business_context
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- UPDATE: super admin bypass + admin da company edita
CREATE POLICY "eva_business_context_update"
  ON public.eva_business_context
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- DELETE: só super admin (admin da company não deleta o próprio contexto;
-- pode editar campos vazios mas a row em si fica)
CREATE POLICY "eva_business_context_delete"
  ON public.eva_business_context
  FOR DELETE
  USING (public.is_super_admin());

-- Trigger pra updated_at + auto-incrementar version em UPDATE
CREATE OR REPLACE FUNCTION public.eva_business_context_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  -- Incrementa version apenas se algum JSONB mudou (evita bump em metadata-only)
  IF TG_OP = 'UPDATE' AND (
    OLD.agency IS DISTINCT FROM NEW.agency
    OR OLD.services IS DISTINCT FROM NEW.services
    OR OLD.icp IS DISTINCT FROM NEW.icp
    OR OLD.playbooks IS DISTINCT FROM NEW.playbooks
  ) THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eva_business_context_touch ON public.eva_business_context;
CREATE TRIGGER trg_eva_business_context_touch
  BEFORE UPDATE ON public.eva_business_context
  FOR EACH ROW
  EXECUTE FUNCTION public.eva_business_context_touch();


-- ─── 2. eva_knowledge_gaps ───────────────────────────────────────────────
--
-- Registro do que a EVA não soube responder. Detectado durante análise de
-- conversa (insight v1 vai gravar). Manager vê em Configurações > EVA > Lacunas
-- e clica pra editar o contexto que está faltando.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eva_knowledge_gaps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Contexto da detecção
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type       TEXT NOT NULL CHECK (source_type IN ('conversation', 'manual', 'auto_learned')),
  source_chat_phone TEXT,
  source_message    TEXT,

  -- Diagnóstico
  gap_description   TEXT NOT NULL,
  suggested_fix     TEXT,
  fix_target        TEXT CHECK (fix_target IN ('agency', 'services', 'icp', 'playbooks', 'other')),

  -- Estado
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Agrupamento: se gap idêntico aparecer de novo, incrementar contador
  occurrence_count  INTEGER NOT NULL DEFAULT 1,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eva_gaps_company_open
  ON public.eva_knowledge_gaps(company_id, status)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_eva_gaps_company_detected
  ON public.eva_knowledge_gaps(company_id, detected_at DESC);

COMMENT ON TABLE public.eva_knowledge_gaps IS
  'F4E.1: Registra perguntas/contextos que a EVA não soube responder. Manager resolve cadastrando em eva_business_context.';

ALTER TABLE public.eva_knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- READ: super admin + qualquer membro da company
CREATE POLICY "eva_knowledge_gaps_select"
  ON public.eva_knowledge_gaps
  FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

-- INSERT: super admin + qualquer membro da company (qualquer um pode detectar gap)
-- A edge function de insight roda com service_role e ignora RLS.
CREATE POLICY "eva_knowledge_gaps_insert"
  ON public.eva_knowledge_gaps
  FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

-- UPDATE: super admin + admin da company (pra marcar resolved/dismissed)
CREATE POLICY "eva_knowledge_gaps_update"
  ON public.eva_knowledge_gaps
  FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- DELETE: só super admin
CREATE POLICY "eva_knowledge_gaps_delete"
  ON public.eva_knowledge_gaps
  FOR DELETE
  USING (public.is_super_admin());


-- ─── 3. conversation_summaries.qualification (JSONB) ─────────────────────
--
-- Qualificação sugerida pela EVA pra cada conversa. Editável localmente pelo
-- humano (sem persistência inicial — F4E.4+ liga ao backend). Shape sugerido:
--   {
--     servico_interesse: string | null,
--     info_coletada:     { mrr, canal_atual, ticket_medio, ... } | null em cada,
--     info_faltante:     string[],
--     urgencia:          'imediata'|'30d'|'60-90d'|'sem_urgencia' | null,
--     objecao:           string | null,
--     fit_sugerido:      'bom'|'medio'|'baixo'|'sem_fit',
--     score_sugerido:    number 0-100,
--     score_justificativa: string
--   }
--
-- Validação de shape acontece no frontend/edge via zod, não em CHECK constraint.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.conversation_summaries
  ADD COLUMN IF NOT EXISTS qualification JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.conversation_summaries.qualification IS
  'F4E.1: Qualificação sugerida pela EVA (servico/info_coletada/info_faltante/urgencia/objecao/fit/score). Shape validado por zod no frontend/edge.';


-- ─── Validação final ─────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'F4E.1 aplicado. Tabelas: eva_business_context, eva_knowledge_gaps. Coluna: conversation_summaries.qualification.';
END $$;
