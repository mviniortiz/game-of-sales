-- eva_help_logs — registra as perguntas feitas à orb de ajuda (EVA "Holly").
-- Serve pra entender onde os clientes têm dúvida (casa com o Clarity). Escrita só
-- pela edge function eva-help (service_role); leitura por super_admin ou admin da
-- própria empresa. GRANT antes de habilitar RLS (convenção do projeto).

create table if not exists public.eva_help_logs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  question    text not null,
  answer      text,
  page        text,
  created_at  timestamptz not null default now()
);

grant select on public.eva_help_logs to authenticated;
grant all    on public.eva_help_logs to service_role;
-- anon: sem acesso (sem grant)

alter table public.eva_help_logs enable row level security;

-- Leitura: super admin OU admin da mesma empresa (analytics interno).
drop policy if exists "eva_help_logs_select" on public.eva_help_logs;
create policy "eva_help_logs_select" on public.eva_help_logs
  for select using (
    public.is_super_admin()
    or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role))
  );

-- Sem policy de INSERT: só a edge function (service_role) grava, bypassa RLS.

create index if not exists eva_help_logs_company_idx on public.eva_help_logs (company_id, created_at desc);
