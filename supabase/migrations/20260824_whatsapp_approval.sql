-- APPROVAL.1 (2026-08-24) — Aprovação do rascunho no WhatsApp do dono.
--
-- Medido em 2026-08-24: 162 de 175 agent_suggestions seguiam 'pending'. A fila
-- não anda porque aprovar exige abrir o app, e o dono de agência não abre. A
-- aprovação passa a acontecer no WhatsApp que ele já usa o dia inteiro: a EVA
-- manda o rascunho com um código curto, ele responde 1 (envia), 2 (descarta)
-- ou escreve o texto corrigido.
--
-- A regra de produto NÃO muda: nenhuma mensagem sai sem humano aprovar. Só
-- muda onde o humano aprova.
--
-- Aditiva. Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_whatsapp_approval.sql

alter table public.agent_suggestions
  add column if not exists approval_code   text,
  add column if not exists notified_at     timestamptz,
  add column if not exists notify_channel  text,
  add column if not exists notify_error    text,
  add column if not exists resolved_via    text;

comment on column public.agent_suggestions.approval_code is
  'APPROVAL.1: código curto (letra+dígito, ex "A7") que o dono cita no WhatsApp para resolver esta sugestão. Único entre as pendentes da empresa.';
comment on column public.agent_suggestions.notified_at is
  'APPROVAL.1: quando o rascunho foi entregue no WhatsApp do dono. Null = ainda não notificado.';
comment on column public.agent_suggestions.resolved_via is
  'APPROVAL.1: por onde veio a decisão humana (app | whatsapp). Sem valor default: sugestão antiga fica null.';

-- Código só precisa ser único entre as PENDENTES: depois de resolvida ele pode
-- ser reciclado, e a fila de um dono nunca tem 36*10 rascunhos abertos.
create unique index if not exists uq_agent_suggestions_pending_code
  on public.agent_suggestions(company_id, approval_code)
  where status = 'pending' and approval_code is not null;

-- Fila de notificação: pendentes ainda não avisadas, mais antigas primeiro.
create index if not exists idx_agent_suggestions_to_notify
  on public.agent_suggestions(company_id, created_at)
  where status = 'pending' and notified_at is null;

-- Resolução por WhatsApp: acha rápido a pendente notificada mais recente.
create index if not exists idx_agent_suggestions_notified
  on public.agent_suggestions(company_id, notified_at desc)
  where status = 'pending' and notified_at is not null;

do $$
begin
  raise notice 'APPROVAL.1 aplicado: agent_suggestions +approval_code/notified_at/notify_channel/notify_error/resolved_via + 3 indices.';
end $$;
