-- Avisos da prospecção num grupo só do dono, fora da conversa com ele mesmo.
alter table public.prospecting_instances add column if not exists notify_jid text;

-- O WhatsApp às vezes entrega a mesma mensagem duas vezes ao webhook. Comando do
-- dono ("PX9 1") só pode valer uma vez: quem grava primeiro o id da mensagem trata.
create table if not exists public.owner_command_log (
  instance_name text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  primary key (instance_name, external_id)
);
grant select, insert, delete on public.owner_command_log to service_role;
alter table public.owner_command_log enable row level security;
