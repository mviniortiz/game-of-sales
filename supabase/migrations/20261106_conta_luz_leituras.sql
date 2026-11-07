-- ─────────────────────────────────────────────────────────────────────────────
-- CONTA.1 (06/11/2026): a Lume lê a conta de luz que o cliente manda no WhatsApp.
--
-- A edge conta-luz-ler grava aqui o que tirou da foto ou do PDF. O dono vê no
-- painel da conversa e confirma, corrige ou descarta. Só entram os dados que
-- servem pra venda; CPF, endereço, unidade consumidora e titular ficam de fora
-- (LGPD: mínimo necessário).
--
-- Fica numa tabela própria porque conversation_summaries.qualification é
-- reescrita inteira a cada leitura da conversa.
--
-- Aditiva: nada existente muda. Aplicar ANTES do deploy da edge e do front:
-- npx supabase db query --linked -f <este arquivo> (NUNCA db push).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.conta_luz_leituras (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  conversation_id  uuid not null references public.channel_conversations(id) on delete cascade,
  contact_id       uuid references public.channel_contacts(id) on delete set null,
  deal_id          uuid references public.deals(id) on delete set null,
  message_id       uuid not null references public.channel_messages(id) on delete cascade,
  storage_path     text,
  fonte            text not null check (fonte in ('foto', 'pdf')),
  consumo_kwh      numeric check (consumo_kwh is null or consumo_kwh > 0),
  valor_reais      numeric check (valor_reais is null or valor_reais > 0),
  distribuidora    text,
  cidade           text,
  uf               text check (uf is null or uf ~ '^[A-Z]{2}$'),
  classe           text check (classe is null or classe in ('residencial', 'comercial', 'rural', 'industrial')),
  mes_referencia   text check (mes_referencia is null or mes_referencia ~ '^\d{4}-\d{2}$'),
  confianca        numeric not null check (confianca between 0 and 1),
  status           text not null default 'lida'
                   check (status in ('lida', 'confirmada', 'corrigida', 'descartada')),
  revisado_por     uuid references auth.users(id) on delete set null,
  revisado_em      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint conta_luz_leituras_msg_uniq unique (message_id)
);

create index if not exists conta_luz_leituras_conversa_idx
  on public.conta_luz_leituras (conversation_id, created_at desc);
create index if not exists conta_luz_leituras_empresa_idx
  on public.conta_luz_leituras (company_id, created_at desc);

-- GRANT antes de RLS.
grant select, insert, update, delete on public.conta_luz_leituras to authenticated;
grant all on public.conta_luz_leituras to service_role;

alter table public.conta_luz_leituras enable row level security;

drop policy if exists conta_luz_leituras_select on public.conta_luz_leituras;
create policy conta_luz_leituras_select on public.conta_luz_leituras for select to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists conta_luz_leituras_insert on public.conta_luz_leituras;
create policy conta_luz_leituras_insert on public.conta_luz_leituras for insert to authenticated
  with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists conta_luz_leituras_update on public.conta_luz_leituras;
create policy conta_luz_leituras_update on public.conta_luz_leituras for update to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin())
  with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists conta_luz_leituras_delete on public.conta_luz_leituras;
create policy conta_luz_leituras_delete on public.conta_luz_leituras for delete to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin());

drop trigger if exists conta_luz_leituras_updated_at on public.conta_luz_leituras;
create trigger conta_luz_leituras_updated_at before update on public.conta_luz_leituras
  for each row execute function public.update_updated_at();

comment on table public.conta_luz_leituras is
  'CONTA.1: conta de luz lida pela Lume no WhatsApp (só dados de venda). O dono confirma, corrige ou descarta no painel da conversa.';
