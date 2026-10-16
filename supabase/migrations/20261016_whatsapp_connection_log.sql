-- Registro de cada abertura e queda de sessão do WhatsApp (evento connection.update da
-- Whatsmiau). Em 16/10/2026 o chip novo caiu duas vezes logo após mensagem fria e nada
-- ficou gravado: só o vigia de 5 em 5 minutos via o estado, sem motivo.
create table if not exists public.whatsapp_connection_log (
  id bigint generated always as identity primary key,
  instance_name text not null,
  state text not null,
  status_reason int,
  wuid text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_connection_log_instance_idx on public.whatsapp_connection_log (instance_name, created_at desc);

grant select, insert on public.whatsapp_connection_log to service_role;
grant usage, select on sequence public.whatsapp_connection_log_id_seq to service_role;
-- Só a edge (service_role) escreve e lê: sem policy, ninguém autenticado acessa.
alter table public.whatsapp_connection_log enable row level security;
