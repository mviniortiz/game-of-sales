-- VYZON.AGENTS.3 (2026-08-21) — Núcleo agéntico com autonomia GRADUADA (aditiva).
--
-- Decisão de produto (Markus, 2026-08-21): substitui o binário "tudo assistido"
-- por graduação. Regras:
--   1. Tools INTERNAS (ler contexto, atualizar card, criar nota) executam
--      sozinhas dentro do loop do agente.
--   2. Tools OUTBOUND (mensagem pro lead) NUNCA enviam: produzem rascunho
--      status='pending' em agent_suggestions (aprovar-e-enviar, padrão 2.1).
--
-- Tabelas novas:
--   agent_tools — catálogo global das ferramentas. A implementação vive no
--                 código (edge eva-agent-loop); aqui ficam contrato, tipo e
--                 disponibilidade. Sem company_id: catálogo é global.
--   agent_runs  — uma execução do loop (planner + tools), com tokens e status.
--   agent_steps — cada passo do run, pra observabilidade e replay de decisão.
--
-- Padrão do repo: aditiva, GRANT antes de RLS, escopo por company_id,
-- 4 operações de RLS auditadas. Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260821_agent_core.sql
-- (NUNCA db push).

-- ── 1) Catálogo global de tools ─────────────────────────────────────────────
create table if not exists public.agent_tools (
  id                uuid primary key default gen_random_uuid(),
  tool_key          text not null unique,
  name              text not null,
  description       text not null,
  -- internal: executa sozinha no loop. outbound: só gera rascunho pending.
  kind              text not null default 'internal'
                      check (kind in ('internal','outbound')),
  parameters_schema jsonb not null default '{}'::jsonb,
  enabled           boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.agent_tools is
  'VYZON.AGENTS.3: catálogo global de ferramentas do agente. kind=outbound NUNCA envia mensagem: grava rascunho pending em agent_suggestions. Escrita só via service_role (migração/edge); authenticated lê.';

insert into public.agent_tools (tool_key, name, description, kind, parameters_schema)
values
  ('get_deal_context',
   'Ler contexto do deal',
   'Retorna deal, últimas notas, últimas atividades e sugestões pendentes. Tool interna, sem efeito colateral.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string","description":"UUID do deal"}},"required":["deal_id"]}'::jsonb),
  ('update_deal_stage',
   'Atualizar estágio do deal',
   'Move o deal para outro estágio do pipeline. Interna: executa sozinha e registra atividade stage_changed.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"stage":{"type":"string","description":"Nome exato do estágio destino"}},"required":["deal_id","stage"]}'::jsonb),
  ('create_deal_note',
   'Criar nota no deal',
   'Grava uma nota curta no deal registrando análise ou decisão da EVA. Interna.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"content":{"type":"string","description":"Texto da nota em pt-BR, até 500 caracteres"}},"required":["deal_id","content"]}'::jsonb),
  ('draft_outbound_message',
   'Rascunhar mensagem para o lead',
   'Gera rascunho de mensagem de saída (WhatsApp/email) na fila aprovar-e-enviar. NUNCA envia: cria agent_suggestions status=pending.',
   'outbound',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"channel":{"type":"string","enum":["whatsapp","email"]},"message_text":{"type":"string","description":"Mensagem pronta, pt-BR, sem emoji, termina com CTA"},"suggestion_text":{"type":"string","description":"Uma linha explicando por que agora"}},"required":["deal_id","channel","message_text"]}'::jsonb)
on conflict (tool_key) do nothing;

grant select on public.agent_tools to authenticated;
grant all on public.agent_tools to service_role;
alter table public.agent_tools enable row level security;

create policy "agent_tools_select" on public.agent_tools for select
  using ( true );

-- ── 2) Runs do loop ─────────────────────────────────────────────────────────
create table if not exists public.agent_runs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  agent_key         text not null default 'eva',
  -- source: quem disparou o run.
  source            text not null default 'manual'
                      check (source in ('manual','cron','webhook','api')),
  deal_id           uuid references public.deals(id) on delete set null,
  conversation_id   uuid,
  goal              text,
  input             jsonb not null default '{}'::jsonb,
  status            text not null default 'running'
                      check (status in ('running','succeeded','failed','cancelled')),
  result            jsonb,
  error             text,
  model             text,
  tokens_prompt     integer not null default 0,
  tokens_completion integer not null default 0,
  steps_used        integer not null default 0,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  updated_at        timestamptz not null default now()
);

comment on table public.agent_runs is
  'VYZON.AGENTS.3: uma execução do loop agéntico. steps_used <= teto de iterações da edge. Tokens somados across iterações.';

create index if not exists idx_agent_runs_company_status
  on public.agent_runs(company_id, status);
create index if not exists idx_agent_runs_deal
  on public.agent_runs(deal_id) where deal_id is not null;
create index if not exists idx_agent_runs_started
  on public.agent_runs(company_id, started_at desc);

grant select, insert, update, delete on public.agent_runs to authenticated;
grant all on public.agent_runs to service_role;
alter table public.agent_runs enable row level security;

create policy "agent_runs_select" on public.agent_runs for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_runs_insert" on public.agent_runs for insert
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_runs_update" on public.agent_runs for update
  using ( public.is_super_admin() or company_id = public.get_my_company_id() )
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_runs_delete" on public.agent_runs for delete
  using ( public.is_super_admin() );

drop trigger if exists trg_agent_runs_updated_at on public.agent_runs;
create trigger trg_agent_runs_updated_at before update on public.agent_runs
  for each row execute procedure public.update_updated_at();

-- ── 3) Steps do run (observabilidade + replay) ──────────────────────────────
create table if not exists public.agent_steps (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.agent_runs(id) on delete cascade,
  -- company_id desnormalizado pra RLS direto sem join.
  company_id  uuid not null references public.companies(id) on delete cascade,
  seq         integer not null,
  kind        text not null check (kind in ('llm_call','tool_call','approval_request','error')),
  tool_key    text,
  arguments   jsonb,
  output      jsonb,
  status      text not null default 'ok' check (status in ('ok','error','denied')),
  error       text,
  duration_ms integer,
  created_at  timestamptz not null default now()
);

comment on table public.agent_steps is
  'VYZON.AGENTS.3: passos de um run. approval_request marca toda chamada de tool outbound (rascunho pending criado). status=denied = tool bloqueada pelo guardrail.';

create index if not exists idx_agent_steps_run on public.agent_steps(run_id, seq);
create index if not exists idx_agent_steps_company on public.agent_steps(company_id);

grant select, insert, update, delete on public.agent_steps to authenticated;
grant all on public.agent_steps to service_role;
alter table public.agent_steps enable row level security;

create policy "agent_steps_select" on public.agent_steps for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_steps_insert" on public.agent_steps for insert
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_steps_update" on public.agent_steps for update
  using ( public.is_super_admin() or company_id = public.get_my_company_id() )
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_steps_delete" on public.agent_steps for delete
  using ( public.is_super_admin() );

do $$
begin
  raise notice 'VYZON.AGENTS.3 aplicado: agent_tools (+4 seeds) + agent_runs + agent_steps + RLS (4 ops) + GRANT.';
end $$;
