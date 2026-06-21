-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics da EVA — Fase 2 (BACKEND)
--
-- Atribuição de funil à EVA: vincula um deal à agent_suggestion que originou
-- a oportunidade. Aditivo e backward-compatible (default NULL): deals antigos
-- ficam sem vínculo (honesto — não eram atribuíveis à EVA).
--
-- A coluna nova herda as policies de RLS existentes de public.deals (não há
-- GRANT/RLS novo aqui: a tabela já está liberada para authenticated/service_role
-- e protegida por company_id). ON DELETE SET NULL: apagar a sugestão NÃO apaga
-- o deal, só zera o vínculo.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS agent_suggestion_id uuid
  REFERENCES public.agent_suggestions(id) ON DELETE SET NULL;

-- Index para o painel: counts de funil por empresa filtrando deals atribuíveis
-- à EVA (agent_suggestion_id IS NOT NULL), escopados por company_id.
CREATE INDEX IF NOT EXISTS idx_deals_company_agent_suggestion
  ON public.deals (company_id, agent_suggestion_id);
