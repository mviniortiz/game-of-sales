-- Desfazer a aprovação da retomada (17/10/2026): o "1" do dono agenda o envio para
-- daqui a 20 segundos em vez de mandar na hora; "desfazer" nesse intervalo devolve o
-- rascunho para pending. Status novo 'agendado' e a hora do envio em send_at.
alter table public.agent_suggestions add column if not exists send_at timestamptz;

alter table public.agent_suggestions drop constraint if exists agent_suggestions_status_check;
alter table public.agent_suggestions add constraint agent_suggestions_status_check
  check (status = any (array['pending', 'agendado', 'accepted', 'adjusted', 'rejected', 'expired', 'sent']));

create index if not exists agent_suggestions_agendado_idx on public.agent_suggestions (send_at) where status = 'agendado';
