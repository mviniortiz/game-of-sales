-- EVA.STUDIO.8B — Simulações persistentes + aprovação formal (uso assistido).
-- Sem service_role no frontend. RLS no padrão do projeto (membro lê, admin escreve).
-- NÃO cria automação: aprovação é só um selo para USO ASSISTIDO (humano aprova ações).

-- ── Resultados de simulação (por empresa; blueprint singleton) ──────────────
create table if not exists public.eva_simulation_results (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  blueprint_id    uuid references public.eva_blueprints(id) on delete set null,
  scenario_id     text not null,
  scenario_title  text not null,
  result          text not null check (result in ('approved','needs_adjustment','rejected')),
  feedback        text,
  is_critical     boolean not null default false,
  evaluated_by    uuid references auth.users(id) on delete set null,
  evaluated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- blueprint é singleton por company → unicidade por (company, cenário) é robusta
  -- (evita problema de NULL em unique quando ainda não há blueprint salvo).
  unique (company_id, scenario_id)
);

create index if not exists idx_eva_sim_results_company on public.eva_simulation_results(company_id);

grant select, insert, update, delete on public.eva_simulation_results to authenticated;
grant all on public.eva_simulation_results to service_role;

alter table public.eva_simulation_results enable row level security;

create policy "eva_sim_results_select" on public.eva_simulation_results for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "eva_sim_results_insert" on public.eva_simulation_results for insert
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "eva_sim_results_update" on public.eva_simulation_results for update
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) )
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "eva_sim_results_delete" on public.eva_simulation_results for delete
  using ( public.is_super_admin() );

drop trigger if exists trg_eva_sim_results_updated on public.eva_simulation_results;
create trigger trg_eva_sim_results_updated
  before update on public.eva_simulation_results
  for each row execute function public.update_updated_at();

-- ── eva_blueprints: status 'approved_assisted' + carimbo de aprovação ───────
alter table public.eva_blueprints drop constraint if exists eva_blueprints_status_check;
alter table public.eva_blueprints
  add constraint eva_blueprints_status_check
  check (status in ('draft','in_review','ready_to_test','prepared','published_preview','partially_applied','approved_assisted'));

alter table public.eva_blueprints add column if not exists approved_at timestamptz;
alter table public.eva_blueprints add column if not exists approved_by uuid references auth.users(id) on delete set null;
