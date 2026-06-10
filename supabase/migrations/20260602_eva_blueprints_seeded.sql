-- VYZON.AGENTS.3.1 — Estado 'seeded' + dimensão agent_key (aditivo).
-- "seeded" = Padrão de Agência pronto para SUGERIR desde o dia 1. A segurança
-- continua na aprovação humana POR SUGESTÃO (1 toque), não no estado do blueprint.
-- approved_assisted continua existindo (vira selo de "afinado para meu negócio").
-- Nada operacional é automatizado: não envia, não grava em deal/conversa, não cria
-- tag/pipeline. Só amplia o enum de status e adiciona a coluna agent_key.
-- Aplicar via: npx supabase db query --linked -f <este arquivo> (NUNCA db push).

-- 1) status agora aceita 'seeded' (mantém todos os anteriores)
alter table public.eva_blueprints drop constraint if exists eva_blueprints_status_check;
alter table public.eva_blueprints
  add constraint eva_blueprints_status_check
  check (status in (
    'seeded',
    'draft','in_review','ready_to_test','prepared','published_preview',
    'partially_applied','approved_assisted'
  ));

-- 2) dimensão de agente (MVP = qualifier). Default backfilla linhas existentes.
--    unique(company_id) é mantido de propósito: ainda 1 agente por empresa no MVP.
--    A troca para unique(company_id, agent_key) fica para a Fase B (2º agente).
alter table public.eva_blueprints
  add column if not exists agent_key text not null default 'qualifier';

comment on column public.eva_blueprints.agent_key is
  'VYZON.AGENTS: chave do agente. MVP=qualifier. Multi-agente troca o unique em fase futura.';
comment on column public.eva_blueprints.status is
  'VYZON.AGENTS.3.1: inclui seeded = Padrão de Agência pronto para sugerir (segurança = aprovação humana por sugestão).';
