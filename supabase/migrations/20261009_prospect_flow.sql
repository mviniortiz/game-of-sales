-- PROSPECT.2 — Prospecção automatizada com aprovação do dono pelo WhatsApp.
-- A prospecting_allowlist (PROSPECT.1) vira o funil: cada integradora mapeada
-- ganha status, mensagens, datas e a resposta. O dono aprova o lote do dia
-- respondendo um código no próprio WhatsApp; o envio sai do número dele, com
-- ritmo humano, pela edge prospect-run (cron a cada 10 min em horário comercial).

alter table public.prospecting_allowlist
  add column if not exists city            text,
  add column if not exists rating          numeric(2,1),
  add column if not exists rating_count    integer,
  add column if not exists score           smallint,
  add column if not exists signal          text,
  add column if not exists status          text not null default 'mapeado',
  add column if not exists first_message   text,
  add column if not exists followup_message text,
  add column if not exists approved_at     timestamptz,
  add column if not exists sent_at         timestamptz,
  add column if not exists followup_due_at timestamptz,
  add column if not exists followup_sent_at timestamptz,
  add column if not exists replied_at      timestamptz,
  add column if not exists reply_kind      text,
  add column if not exists last_reply      text,
  add column if not exists reply_draft     text,
  add column if not exists reply_code      text,
  add column if not exists meeting_at      timestamptz,
  add column if not exists notes           text,
  add column if not exists updated_at      timestamptz not null default now();

do $$ begin
  alter table public.prospecting_allowlist
    add constraint prospecting_allowlist_status_chk check (status in
      ('mapeado','aguardando_aprovacao','aprovado','enviado','respondeu',
       'conversa_marcada','sem_interesse','descartado'));
exception when duplicate_object then null; end $$;

create index if not exists prospecting_allowlist_status_idx
  on public.prospecting_allowlist (user_id, status);

drop trigger if exists prospecting_allowlist_updated_at on public.prospecting_allowlist;
create trigger prospecting_allowlist_updated_at
  before update on public.prospecting_allowlist
  for each row execute function public.update_updated_at();

-- Ritmo por instância: teto diário, janela de envio (hora de Brasília) e o
-- momento do último envio, para espaçar 2 a 5 minutos entre contatos.
alter table public.prospecting_instances
  add column if not exists daily_cap      smallint not null default 10,
  add column if not exists window_start   smallint not null default 9,
  add column if not exists window_end     smallint not null default 18,
  add column if not exists next_send_at   timestamptz,
  add column if not exists followup_audio_url text;

-- Lote do dia: o dono aprova "PA3 1" ou recusa "PA3 2" no WhatsApp.
create table if not exists public.prospecting_batches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  contact_ids uuid[] not null,
  status      text not null default 'pendente' check (status in ('pendente','aprovado','recusado','expirado')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists prospecting_batches_user_idx on public.prospecting_batches (user_id, status, created_at desc);

grant select, insert, update, delete on public.prospecting_batches to authenticated;
grant all on public.prospecting_batches to service_role;
alter table public.prospecting_batches enable row level security;

drop policy if exists prospecting_batches_select on public.prospecting_batches;
create policy prospecting_batches_select on public.prospecting_batches
  for select to authenticated using (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists prospecting_batches_insert on public.prospecting_batches;
create policy prospecting_batches_insert on public.prospecting_batches
  for insert to authenticated with check (public.is_super_admin());
drop policy if exists prospecting_batches_update on public.prospecting_batches;
create policy prospecting_batches_update on public.prospecting_batches
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists prospecting_batches_delete on public.prospecting_batches;
create policy prospecting_batches_delete on public.prospecting_batches
  for delete to authenticated using (public.is_super_admin());
