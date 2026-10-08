-- SUPORTE.1 (2026-10-08): aba de Suporte do super admin.
--
-- 1. demo_requests tinha SELECT e UPDATE "using (true)" para qualquer usuário
--    logado: cliente de qualquer empresa lia nome, e-mail e telefone dos leads
--    do próprio Vyzon. Quem lê de verdade são as edges (service_role) e a aba
--    de Suporte (super admin); o formulário da home grava pela RPC
--    submit_demo_request. Fica só super admin.
-- 2. Status 'contacted': o Markus chamou o lead e ainda não marcou conversa.
-- 3. support_inbox_state: lido e arquivado dos e-mails de suporte@ (o Resend
--    não guarda esse estado).
--
-- Aditiva no schema; restringe policy.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261008d_suporte_painel.sql

drop policy if exists authenticated_select_demo_requests on public.demo_requests;
drop policy if exists authenticated_update_demo_requests on public.demo_requests;

create policy super_admin_select_demo_requests on public.demo_requests
  for select to authenticated using (public.is_super_admin());

create policy super_admin_update_demo_requests on public.demo_requests
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.demo_requests drop constraint if exists demo_requests_status_check;
alter table public.demo_requests add constraint demo_requests_status_check
  check (status = any (array['pending', 'contacted', 'scheduled', 'completed', 'cancelled']));

create table if not exists public.support_inbox_state (
  email_id text primary key,
  read_at timestamptz,
  archived_at timestamptz,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.support_inbox_state to authenticated;
grant all on public.support_inbox_state to service_role;

alter table public.support_inbox_state enable row level security;

drop policy if exists super_admin_all_support_inbox_state on public.support_inbox_state;
create policy super_admin_all_support_inbox_state on public.support_inbox_state
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
