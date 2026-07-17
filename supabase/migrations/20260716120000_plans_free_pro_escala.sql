-- Planos 2026-07-16: simplificação para Free + Pro (R$ 397) + Escala.
-- Fonte única no client: src/config/plans.ts. Trial de 14 dias do Pro no
-- cadastro; ao expirar, o plano EFETIVO degrada pra free em runtime
-- (resolveEffectivePlan) — nenhum cron necessário.
-- Aditiva e idempotente; aplicar via `npx supabase db query --linked -f`.

-- 1) Normaliza valores legados de companies.plan
update public.companies set plan = 'free'   where plan is null or lower(plan) in ('basic', 'starter');
update public.companies set plan = 'pro'    where lower(plan) = 'plus';
update public.companies set plan = 'escala' where lower(plan) = 'enterprise';

-- 2) Default novo: cadastros sem plano explícito caem no free
alter table public.companies alter column plan set default 'free';

-- 3) CHECK: remove o constraint antigo (basic/pro/enterprise, se ainda
--    existir) e garante o novo conjunto
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'companies_plan_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies drop constraint companies_plan_check;
  end if;

  alter table public.companies
    add constraint companies_plan_check
    check (plan in ('free', 'pro', 'escala'));
end $$;
