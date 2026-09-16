-- APPROVAL.2 (2026-08-24) — Travas de segurança da notificação.
--
-- Dois problemas medidos assim que a fila unificada encheu:
--
-- 1. Sessão morta com status mentiroso. A instância wa_99289... estava 'active'
--    em channel_connections e a Evolution respondia "Connection Closed" em todo
--    envio: 29 falhas seguidas. Sem contador, o cron de 10 em 10 minutos ficaria
--    batendo nelas para sempre.
--
-- 2. Enxurrada. O follow-up gerou 31 rascunhos de uma vez. Entregar tudo junto
--    no WhatsApp do dono é spam nele e risco de ban no número.
--
-- Aditiva.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_notify_backoff.sql

alter table public.agent_suggestions
  add column if not exists notify_attempts integer not null default 0;

comment on column public.agent_suggestions.notify_attempts is
  'APPROVAL.2: tentativas de entrega no WhatsApp do dono. Depois do teto a sugestão para de ser tentada e expira sozinha; o erro fica em notify_error.';

-- A fila de notificação passa a excluir quem já falhou demais.
drop index if exists public.idx_agent_suggestions_to_notify;
create index if not exists idx_agent_suggestions_to_notify
  on public.agent_suggestions(company_id, created_at)
  where status = 'pending' and notified_at is null and notify_attempts < 5;

do $$
begin
  raise notice 'APPROVAL.2 aplicado: agent_suggestions.notify_attempts + indice da fila.';
end $$;
