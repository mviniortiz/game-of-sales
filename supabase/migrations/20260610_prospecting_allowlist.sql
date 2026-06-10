-- PROSPECT.1 (2026-06-10) — Prospecção outbound supervisionada, restrita a allowlist.
--
-- Permite conectar um número (instância wa_<userId>) em MODO PROSPECÇÃO: nesse
-- modo, o webhook evolution-message-webhook SÓ deixa entrar mensagens de números
-- que estão na prospecting_allowlist daquele usuário; tudo o mais (grupos,
-- contatos pessoais, qualquer não-listado) é DESCARTADO antes de gravar. Isso
-- protege a privacidade de quem usa o número pessoal: a vida pessoal nunca entra
-- no Vyzon, e o agente só conversa com a lista.
--
-- O "interruptor" é por usuário/instância (prospecting_instances), não pela
-- channel_connection — que só nasce na 1a mensagem (dual-write), tarde demais
-- pro guard. O userId é resolvido no topo do webhook, antes de qualquer escrita.
--
-- Aplicar via: npx supabase db query --linked -f <este arquivo> (NUNCA db push).

-- ── 1) Interruptor: instâncias em modo prospecção ───────────────────────────
create table if not exists public.prospecting_instances (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  is_active   boolean not null default true,
  label       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_prospecting_instances_user on public.prospecting_instances(user_id) where is_active;

comment on table public.prospecting_instances is
  'PROSPECT.1: marca a instância wa_<user_id> como dedicada a prospecção. Quando ativa, o webhook aplica a allowlist (descarta tudo fora da lista).';

grant select, insert, update, delete on public.prospecting_instances to authenticated;
grant all on public.prospecting_instances to service_role;

alter table public.prospecting_instances enable row level security;

create policy "prospecting_instances_select" on public.prospecting_instances for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "prospecting_instances_insert" on public.prospecting_instances for insert
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "prospecting_instances_update" on public.prospecting_instances for update
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) )
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "prospecting_instances_delete" on public.prospecting_instances for delete
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );

drop trigger if exists trg_prospecting_instances_updated on public.prospecting_instances;
create trigger trg_prospecting_instances_updated
  before update on public.prospecting_instances
  for each row execute function public.update_updated_at();

-- ── 2) Allowlist: contatos que o agente pode conversar ──────────────────────
create table if not exists public.prospecting_allowlist (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  phone_e164   text,
  -- phone_tail = últimos 10 dígitos, ESPELHA o webhook (chatPhone.slice(-10)).
  phone_tail   text not null,
  agency_name  text,
  niche        text,
  instagram    text,
  source_url   text,
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  metadata     jsonb not null default '{}'::jsonb,
  -- um contato por instância de prospecção (match por tail)
  unique (user_id, phone_tail)
);

create index if not exists idx_prospecting_allowlist_lookup
  on public.prospecting_allowlist(user_id, phone_tail) where is_active;

comment on table public.prospecting_allowlist is
  'PROSPECT.1: números que o agente de prospecção pode conversar. Match por phone_tail (últimos 10 dígitos, igual ao webhook). Qualquer um fora daqui é descartado.';

grant select, insert, update, delete on public.prospecting_allowlist to authenticated;
grant all on public.prospecting_allowlist to service_role;

alter table public.prospecting_allowlist enable row level security;

create policy "prospecting_allowlist_select" on public.prospecting_allowlist for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "prospecting_allowlist_insert" on public.prospecting_allowlist for insert
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "prospecting_allowlist_update" on public.prospecting_allowlist for update
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) )
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "prospecting_allowlist_delete" on public.prospecting_allowlist for delete
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );

do $$
begin
  raise notice 'PROSPECT.1 aplicado: prospecting_instances + prospecting_allowlist + RLS (4 ops) + GRANT.';
end $$;
