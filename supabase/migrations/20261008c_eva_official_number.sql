-- EVA.OFICIAL (2026-10-08): o aviso de rascunho pode sair do número oficial da
-- EVA (API oficial do WhatsApp, via Kapso) em vez do próprio número do dono.
-- Guardamos o id da mensagem entregue para ligar a resposta do dono ao
-- rascunho quando ele responde citando o aviso (sem digitar o código).
--
-- Aditiva.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261008c_eva_official_number.sql

alter table public.agent_suggestions
  add column if not exists notify_message_id text;

comment on column public.agent_suggestions.notify_message_id is
  'EVA.OFICIAL: id (wamid) do aviso entregue pelo número oficial da EVA. A resposta do dono citando esse aviso chega com context.id igual a ele.';

create index if not exists idx_agent_suggestions_notify_message_id
  on public.agent_suggestions(notify_message_id)
  where notify_message_id is not null;
