-- ─────────────────────────────────────────────────────────────────────────────
-- EVA.STUDIO.F3 (2026-06-09) — eva_replay_moments
--
-- Os MOMENTOS-CHAVE pré-computados do replay de prova de confiança. Cada linha é
-- um ponto de tensão de uma conversa REAL (perdida/sumida/ganha) onde a EVA
-- mostra como teria respondido. Gerados pela edge `generate-eva-replay-moments`
-- (service_role), revisados manualmente na aba Simulações.
--
-- O JULGAMENTO (mandaria / faria diferente / inaceitável) NÃO vive aqui: reusa
-- eva_simulation_results (scenario_id = id deste momento). Esta tabela é só a
-- matéria-prima gerada.
--
-- Espelha a interface ReplayMoment (GuidedSimulationReplay.tsx).
-- Padrões reaproveitados: is_super_admin(), get_my_company_id(),
-- has_role(uid, app_role), public.update_updated_at(). RLS = padrão eva_*
-- (membro lê, admin escreve; service_role pra geração).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eva_replay_moments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Origem real (rastreabilidade). SET NULL pra não perder o momento se a
  -- conversa/deal/mensagem forem apagados.
  conversation_id    UUID REFERENCES public.channel_conversations(id) ON DELETE SET NULL,
  deal_id            UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  source_message_id  UUID REFERENCES public.channel_messages(id) ON DELETE SET NULL,

  lead_name          TEXT NOT NULL,
  tension            TEXT NOT NULL,
  critical           BOOLEAN NOT NULL DEFAULT false,
  outcome            TEXT NOT NULL,
  outcome_detail     TEXT NOT NULL,
  context            TEXT NOT NULL,
  lead_message       TEXT NOT NULL,
  eva_reply          TEXT NOT NULL,
  seller_reply       TEXT,

  model              TEXT,                                  -- qual modelo gerou
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT eva_replay_moments_outcome_chk
    CHECK (outcome IN ('lost','ghosted','won')),
  -- 1 momento-chave por conversa (o mais revelador). Evita encher a fila com a
  -- mesma conversa e dá upsert estável por (company, conversa).
  CONSTRAINT eva_replay_moments_company_conv_uniq
    UNIQUE (company_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_eva_replay_moments_company
  ON public.eva_replay_moments(company_id);
CREATE INDEX IF NOT EXISTS idx_eva_replay_moments_company_outcome
  ON public.eva_replay_moments(company_id, outcome);
CREATE INDEX IF NOT EXISTS idx_eva_replay_moments_deal
  ON public.eva_replay_moments(deal_id) WHERE deal_id IS NOT NULL;

-- ── GRANT antes da RLS (RLS só vale depois do GRANT) ────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eva_replay_moments TO authenticated;
GRANT ALL ON public.eva_replay_moments TO service_role;

ALTER TABLE public.eva_replay_moments ENABLE ROW LEVEL SECURITY;

-- SELECT: super_admin OU membro da company
CREATE POLICY "eva_replay_moments_select" ON public.eva_replay_moments FOR SELECT
  USING ( public.is_super_admin() OR company_id = public.get_my_company_id() );
-- INSERT: super_admin OU admin da company (geração real entra via service_role,
-- que ignora RLS; este caminho cobre seed/correção manual por admin)
CREATE POLICY "eva_replay_moments_insert" ON public.eva_replay_moments FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR ( company_id = public.get_my_company_id()
         AND public.has_role(auth.uid(), 'admin'::public.app_role) )
  );
-- UPDATE: super_admin OU admin da company
CREATE POLICY "eva_replay_moments_update" ON public.eva_replay_moments FOR UPDATE
  USING (
    public.is_super_admin()
    OR ( company_id = public.get_my_company_id()
         AND public.has_role(auth.uid(), 'admin'::public.app_role) )
  )
  WITH CHECK (
    public.is_super_admin()
    OR ( company_id = public.get_my_company_id()
         AND public.has_role(auth.uid(), 'admin'::public.app_role) )
  );
-- DELETE: super_admin (admin descarta logicamente revisando, não apagando)
CREATE POLICY "eva_replay_moments_delete" ON public.eva_replay_moments FOR DELETE
  USING ( public.is_super_admin() );

DROP TRIGGER IF EXISTS trg_eva_replay_moments_updated ON public.eva_replay_moments;
CREATE TRIGGER trg_eva_replay_moments_updated
  BEFORE UPDATE ON public.eva_replay_moments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.eva_replay_moments IS
  'EVA.STUDIO.F3: momentos-chave pré-computados do replay de prova de confiança. Gerados por generate-eva-replay-moments (service_role). Julgamento vive em eva_simulation_results (scenario_id = id do momento).';

DO $$
BEGIN
  RAISE NOTICE 'EVA.STUDIO.F3 aplicado: eva_replay_moments + RLS (4 ops) + GRANT + trigger.';
END $$;
