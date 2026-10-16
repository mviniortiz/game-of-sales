-- Aba Tarefas e aba Arquivos do card.
--
-- Tarefas: o modal "Nova tarefa" gravava em deal_tasks, tabela que nunca existiu
-- no banco (toda tarefa falhava). Passa a gravar em follow_up_reminders, que o
-- sino de lembretes já lê. Ganha o tipo e quem criou, e as policies saem do
-- "só o dono" para a empresa: a tarefa pode ser de outro vendedor e o card
-- mostra as tarefas do time.
alter table public.follow_up_reminders
  add column if not exists task_type text not null default 'tarefa',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

drop policy if exists reminders_select on public.follow_up_reminders;
drop policy if exists reminders_insert on public.follow_up_reminders;
drop policy if exists reminders_update on public.follow_up_reminders;
drop policy if exists reminders_delete on public.follow_up_reminders;
create policy reminders_select on public.follow_up_reminders for select to authenticated
  using (is_super_admin() or company_id = get_my_company_id());
create policy reminders_insert on public.follow_up_reminders for insert to authenticated
  with check (is_super_admin() or company_id = get_my_company_id());
create policy reminders_update on public.follow_up_reminders for update to authenticated
  using (is_super_admin() or company_id = get_my_company_id())
  with check (is_super_admin() or company_id = get_my_company_id());
create policy reminders_delete on public.follow_up_reminders for delete to authenticated
  using (is_super_admin() or company_id = get_my_company_id());

-- Arquivos anexados ao card. O arquivo fica no bucket privado deal-files, no
-- caminho <company_id>/<deal_id>/<nome>; a linha guarda nome, tamanho e tipo.
create table if not exists public.deal_files (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  name text not null,
  path text not null unique,
  size bigint,
  mime text,
  created_at timestamptz not null default now()
);
create index if not exists deal_files_deal_idx on public.deal_files (deal_id, created_at desc);

grant select, insert, update, delete on public.deal_files to authenticated;
grant all on public.deal_files to service_role;
alter table public.deal_files enable row level security;

create policy deal_files_select on public.deal_files for select to authenticated
  using (is_super_admin() or company_id = get_my_company_id());
create policy deal_files_insert on public.deal_files for insert to authenticated
  with check (is_super_admin() or company_id = get_my_company_id());
create policy deal_files_update on public.deal_files for update to authenticated
  using (is_super_admin() or company_id = get_my_company_id())
  with check (is_super_admin() or company_id = get_my_company_id());
create policy deal_files_delete on public.deal_files for delete to authenticated
  using (is_super_admin() or company_id = get_my_company_id());

insert into storage.buckets (id, name, public, file_size_limit)
values ('deal-files', 'deal-files', false, 26214400)
on conflict (id) do nothing;

create policy deal_files_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'deal-files' and ((storage.foldername(name))[1] = get_my_company_id()::text or is_super_admin()));
create policy deal_files_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'deal-files' and ((storage.foldername(name))[1] = get_my_company_id()::text or is_super_admin()));
create policy deal_files_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'deal-files' and ((storage.foldername(name))[1] = get_my_company_id()::text or is_super_admin()));
