-- Limpa TODAS as companies de teste, mantém só a Vyzon.
-- ATENÇÃO: destrutivo. Roda em transaction — se algo der errado, rollback.

do $$
declare
    v_vyzon_id uuid := '00000000-0000-0000-0000-000000000001';
    v_deleted_users int;
    v_deleted_profiles int;
    v_deleted_companies int;
    v_deleted_demo_reqs int;
    v_user_ids uuid[];
begin
    -- 1. Captura auth user_ids pra apagar depois (profiles.id = auth.users.id)
    select array_agg(id) into v_user_ids
        from public.profiles
        where company_id is null
           or company_id != v_vyzon_id;

    -- 2. Apaga demo_requests que geraram deals em outras companies
    --    (demo_requests não tem company_id; identifica via email/phone que bate com deals)
    delete from public.demo_requests dr
        where exists (
            select 1 from public.deals d
            where d.customer_email = dr.email
              and d.company_id != v_vyzon_id
              and d.company_id is not null
        );
    get diagnostics v_deleted_demo_reqs = row_count;

    -- 3. Apaga deals das companies não-Vyzon (também pega os órfãos com company_id NULL)
    delete from public.deals where company_id != v_vyzon_id or company_id is null;

    -- 4. Apaga profiles das companies não-Vyzon
    delete from public.profiles where company_id != v_vyzon_id or company_id is null;
    get diagnostics v_deleted_profiles = row_count;

    -- 5. Apaga companies (exceto Vyzon) — CASCADE trata dependentes restantes
    delete from public.companies where id != v_vyzon_id;
    get diagnostics v_deleted_companies = row_count;

    -- 6. Apaga auth.users órfãos
    if v_user_ids is not null then
        delete from auth.users where id = any(v_user_ids);
        get diagnostics v_deleted_users = row_count;
    else
        v_deleted_users := 0;
    end if;

    raise notice '[cleanup] demo_requests=% profiles=% companies=% auth_users=%',
        v_deleted_demo_reqs, v_deleted_profiles, v_deleted_companies, v_deleted_users;
end $$;

-- Verificação pós-cleanup
select
    (select count(*) from public.companies) as companies_left,
    (select count(*) from public.profiles) as profiles_left,
    (select count(*) from public.deals) as deals_left,
    (select count(*) from public.demo_requests) as demo_requests_left;
