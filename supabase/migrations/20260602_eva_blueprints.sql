-- EVA.STUDIO.3 — Blueprint persistente por empresa (rascunho editável).
-- Singleton por company_id. A EVA sugere, o humano revisa/salva como rascunho.
-- NÃO aplica nada na operação (publicação real fica para fase futura).
-- RLS no mesmo padrão de eva_business_context: membro lê, admin edita, super_admin bypass.

create table if not exists public.eva_blueprints (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null unique references public.companies(id) on delete cascade,
  status               text not null default 'draft'
                         check (status in ('draft','in_review','ready_to_test','prepared','published_preview')),
  agent_name           text,
  segment              text,
  objective            text,
  pipeline_stages      jsonb not null default '[]'::jsonb,
  detected_fields      jsonb not null default '[]'::jsonb,
  suggested_tags       jsonb not null default '[]'::jsonb,
  suggested_rules      jsonb not null default '[]'::jsonb,
  knowledge_gaps       jsonb not null default '[]'::jsonb,
  simulation_scenarios jsonb not null default '[]'::jsonb,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_eva_blueprints_company on public.eva_blueprints(company_id);

comment on table public.eva_blueprints is
  'EVA.STUDIO.3: blueprint da operação (singleton por company). Rascunho revisável; não aplica nada na operação automaticamente.';

-- GRANT antes da RLS (padrão obrigatório do projeto)
grant select, insert, update, delete on public.eva_blueprints to authenticated;
grant all on public.eva_blueprints to service_role;

alter table public.eva_blueprints enable row level security;

create policy "eva_blueprints_select"
  on public.eva_blueprints for select
  using (
    public.is_super_admin()
    or company_id = public.get_my_company_id()
  );

create policy "eva_blueprints_insert"
  on public.eva_blueprints for insert
  with check (
    public.is_super_admin()
    or (
      company_id = public.get_my_company_id()
      and public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

create policy "eva_blueprints_update"
  on public.eva_blueprints for update
  using (
    public.is_super_admin()
    or (
      company_id = public.get_my_company_id()
      and public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  with check (
    public.is_super_admin()
    or (
      company_id = public.get_my_company_id()
      and public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

create policy "eva_blueprints_delete"
  on public.eva_blueprints for delete
  using (public.is_super_admin());

drop trigger if exists trg_eva_blueprints_updated on public.eva_blueprints;
create trigger trg_eva_blueprints_updated
  before update on public.eva_blueprints
  for each row execute function public.update_updated_at();
