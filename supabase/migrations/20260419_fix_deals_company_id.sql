-- Fix: deals criados via trigger (demo_requests) estavam com company_id = NULL,
-- deixando o pipeline do CRM vazio (CRM.tsx filtra por company_id).
-- Causa: migration 20260119_part1_add_company_id.sql nunca aplicada no remote.

-- 1. Recria a função de auto-preenchimento
create or replace function public.set_deal_company_id()
returns trigger
language plpgsql
as $$
begin
    if new.company_id is null then
        select company_id
            into new.company_id
            from public.profiles
            where id = new.user_id;
    end if;
    return new;
end;
$$;

-- 2. Instala trigger BEFORE INSERT
drop trigger if exists trigger_set_deal_company_id on public.deals;
create trigger trigger_set_deal_company_id
    before insert on public.deals
    for each row
    execute function public.set_deal_company_id();

-- 3. Backfill: todo deal órfão recebe company_id do dono
update public.deals d
    set company_id = p.company_id
    from public.profiles p
    where d.user_id = p.id
      and d.company_id is null
      and p.company_id is not null;

-- 4. Remove trigger duplicado em demo_requests (criava deals em dobro)
drop trigger if exists trg_demo_request_create_deal on public.demo_requests;

-- 5. Dedup de deals existentes: mantém o mais antigo por (user_id, customer_email, stage)
--    criado nos últimos 3 dias (janela dos duplicados do trigger duplo)
delete from public.deals d1
using public.deals d2
where d1.id > d2.id
  and d1.user_id = d2.user_id
  and d1.customer_email is not null
  and d1.customer_email = d2.customer_email
  and d1.stage = d2.stage
  and d1.created_at >= now() - interval '7 days'
  and d2.created_at >= now() - interval '7 days'
  and date_trunc('second', d1.created_at) = date_trunc('second', d2.created_at);

comment on function public.set_deal_company_id() is
    'Auto-preenche deals.company_id a partir de profiles.company_id do user_id. Evita órfãos quando deals são criados via trigger (ex: demo_requests).';
