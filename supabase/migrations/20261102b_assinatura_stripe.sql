-- ASSINATURA.STRIPE (2026-11-02): a assinatura do Vyzon passa a ser cobrada
-- pelo Stripe (edges assinatura-checkout, assinatura-portal e
-- assinatura-webhook). Colunas mp_* ficam para histórico; nada novo grava nelas.
--
-- Aditiva: duas colunas e o guard de cobrança protegendo as duas, igual às
-- mp_*. Só service_role (o webhook) e super admin mudam.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261102b_assinatura_stripe.sql

alter table public.companies add column if not exists stripe_customer_id text;
alter table public.companies add column if not exists stripe_subscription_id text;
create unique index if not exists companies_stripe_customer_id_key
  on public.companies (stripe_customer_id) where stripe_customer_id is not null;

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
    new.plan := 'free';
    new.subscription_status := 'inactive';
    new.trial_ends_at := null;
    new.subscription_cancelled_at := null;
    new.subscription_ends_at := null;
    new.mp_subscription_id := null;
    new.mp_plan_id := null;
    new.mp_customer_id := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.subscription_cancelled_at is distinct from old.subscription_cancelled_at
     or new.subscription_ends_at is distinct from old.subscription_ends_at
     or new.mp_subscription_id is distinct from old.mp_subscription_id
     or new.mp_plan_id is distinct from old.mp_plan_id
     or new.mp_customer_id is distinct from old.mp_customer_id
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id then
    raise exception 'Plano e assinatura são alterados só pelo Vyzon.' using errcode = '42501';
  end if;
  return new;
end;
$$;
