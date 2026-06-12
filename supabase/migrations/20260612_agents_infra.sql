-- VYZON.AGENTS.2.1 (2026-06-12) — Infraestrutura de agentes (aditiva).
--
-- Generaliza a EVA de "assistente único" para "agentes especializados",
-- preservando 100% do EVA Studio atual. Modelo de autonomia: HÍBRIDO —
-- criação/atualização de card no pipeline a partir de lead inbound pode ser
-- automática; qualquer mensagem de SAÍDA fica como rascunho na fila
-- aprovar-e-enviar (status='pending') e exige aprovação humana.
--
-- Tudo aditivo e backward-compatible. Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260612_agents_infra.sql
-- (NUNCA db push). GRANT antes de RLS, escopo por company_id, no padrão eva_*.

-- ── 1) Dimensão agent_key (dormente até multi-agente) ───────────────────────
alter table public.eva_blueprints
  add column if not exists agent_key text not null default 'qualifier';
comment on column public.eva_blueprints.agent_key is
  'VYZON.AGENTS.2: chave do agente. MVP=qualifier. unique(company_id) mantido; multi-agente troca a unicidade em fase futura.';

alter table public.eva_simulation_results
  add column if not exists agent_key text not null default 'qualifier';
comment on column public.eva_simulation_results.agent_key is
  'VYZON.AGENTS.2: chave do agente dono do cenário (cenários do qualifier são namespaced q_*).';

-- ── 2) Log de sugestões dos agentes (auditoria + runtime) ───────────────────
-- Generaliza eva_deal_suggestions (que é específico de follow-up por deal).
-- Cobre Inbox e Deal; registra aceito/ajustado/rejeitado e o que foi aplicado.
create table if not exists public.agent_suggestions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  agent_key       text not null default 'qualifier',
  -- kind: tipo de sugestão. 'qualification' = diagnóstico que pode gerar/atualizar
  -- card no pipeline (automático no híbrido). 'outbound_message' = rascunho de
  -- mensagem de saída (SEMPRE aprovar-e-enviar, nunca automático).
  kind            text not null default 'qualification'
                    check (kind in ('qualification','outbound_message','followup','objection','proposal')),
  conversation_id uuid,
  deal_id         uuid references public.deals(id) on delete set null,
  input_summary   jsonb not null default '{}'::jsonb,   -- resumo do que entrou (sem PII desnecessária)
  suggestion      jsonb not null default '{}'::jsonb,   -- QualifierSuggestion / rascunho serializado
  status          text not null default 'pending'
                    check (status in ('pending','accepted','adjusted','rejected','expired','sent')),
  applied_payload jsonb,                                 -- o que o humano realmente gravou/enviou
  feedback        text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz
);

create index if not exists idx_agent_suggestions_company on public.agent_suggestions(company_id);
create index if not exists idx_agent_suggestions_conv on public.agent_suggestions(conversation_id);
create index if not exists idx_agent_suggestions_deal on public.agent_suggestions(deal_id);
create index if not exists idx_agent_suggestions_pending
  on public.agent_suggestions(company_id, kind) where status = 'pending';

comment on table public.agent_suggestions is
  'VYZON.AGENTS.2: log de sugestões dos agentes. kind=outbound_message é SEMPRE aprovar-e-enviar (status pending→sent só após aprovação humana). kind=qualification pode gerar card no pipeline automaticamente (modelo híbrido).';

grant select, insert, update, delete on public.agent_suggestions to authenticated;
grant all on public.agent_suggestions to service_role;
alter table public.agent_suggestions enable row level security;

-- SELECT/INSERT/UPDATE por membro da empresa (qualquer vendedor registra o
-- desfecho da sugestão que revisou). DELETE só super_admin.
create policy "agent_suggestions_select" on public.agent_suggestions for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_suggestions_insert" on public.agent_suggestions for insert
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_suggestions_update" on public.agent_suggestions for update
  using ( public.is_super_admin() or company_id = public.get_my_company_id() )
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_suggestions_delete" on public.agent_suggestions for delete
  using ( public.is_super_admin() );

do $$
begin
  raise notice 'VYZON.AGENTS.2.1 aplicado: agent_key (blueprints+simulations) + agent_suggestions + RLS (4 ops) + GRANT.';
end $$;
