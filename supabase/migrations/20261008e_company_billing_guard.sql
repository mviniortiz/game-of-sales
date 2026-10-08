-- BILLING.GUARD (2026-10-08): plano e assinatura só mudam pelo servidor ou
-- pelo super admin.
--
-- A policy users_can_update_own_company deixa qualquer membro alterar a
-- própria empresa, e o UPDATE não distingue coluna: dava para gravar
-- plan='pro' e subscription_status='active' pelo navegador e ter o Pro sem
-- pagar. No INSERT, anon e authenticated criam empresa com check (true), então
-- dava para nascer 'active'.
--
-- Este trigger:
--   - INSERT de usuário comum: força o trial padrão (Pro, trialing, 14 dias) e
--     zera os campos do Mercado Pago. É o que o cadastro já grava.
--   - UPDATE de usuário comum: recusa mudança em plano, status, datas da
--     assinatura e ids do Mercado Pago. Nome, segmento e logo seguem livres.
-- service_role (edges), sessões diretas no banco e super admin passam.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261008e_company_billing_guard.sql

create or replace function public.guard_company_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só chamada vinda do site (anon ou authenticated) é travada. Edges com
  -- service_role e sessões diretas no banco (migrations, cron) não têm esse
  -- papel. current_user não serve aqui: em security definer ele é o dono.
  if coalesce(auth.role(), '') not in ('anon', 'authenticated')
     or coalesce(public.is_super_admin(), false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := 'pro';
    new.subscription_status := 'trialing';
    new.trial_ends_at := now() + interval '14 days';
    new.subscription_cancelled_at := null;
    new.subscription_ends_at := null;
    new.mp_subscription_id := null;
    new.mp_plan_id := null;
    new.mp_customer_id := null;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.subscription_cancelled_at is distinct from old.subscription_cancelled_at
     or new.subscription_ends_at is distinct from old.subscription_ends_at
     or new.mp_subscription_id is distinct from old.mp_subscription_id
     or new.mp_plan_id is distinct from old.mp_plan_id
     or new.mp_customer_id is distinct from old.mp_customer_id then
    raise exception 'Plano e assinatura são alterados só pelo Vyzon.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_company_billing on public.companies;
create trigger trg_guard_company_billing
  before insert or update on public.companies
  for each row execute function public.guard_company_billing();

-- O plano Essential (R$ 197, src/config/plans.ts) não cabia no check, que
-- ainda era free/pro/escala: assinar o Essential falhava ao gravar o plano.
alter table public.companies drop constraint if exists companies_plan_check;
alter table public.companies add constraint companies_plan_check
  check (plan = any (array['free', 'essential', 'pro', 'escala']));
