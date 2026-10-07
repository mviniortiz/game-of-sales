-- metas_consolidadas estava sem RLS e com acesso total para anon: qualquer um
-- com a chave pública do site lia, alterava e apagava a meta de todas as
-- empresas (achado em 07/10/2026). A meta do mês é lida pelo Início
-- (useCockpitData) e gravada pela Gestão (aba Meta do mês).

revoke all on public.metas_consolidadas from anon;
grant select, insert, update, delete on public.metas_consolidadas to authenticated;
grant all on public.metas_consolidadas to service_role;

alter table public.metas_consolidadas enable row level security;

drop policy if exists metas_consolidadas_all on public.metas_consolidadas;

create policy metas_consolidadas_select on public.metas_consolidadas
    for select to authenticated
    using (company_id = public.get_my_company_id() or public.is_super_admin());

create policy metas_consolidadas_insert on public.metas_consolidadas
    for insert to authenticated
    with check (
        (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::app_role))
        or public.is_super_admin()
    );

create policy metas_consolidadas_update on public.metas_consolidadas
    for update to authenticated
    using (
        (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::app_role))
        or public.is_super_admin()
    )
    with check (
        (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::app_role))
        or public.is_super_admin()
    );

create policy metas_consolidadas_delete on public.metas_consolidadas
    for delete to authenticated
    using (
        (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::app_role))
        or public.is_super_admin()
    );
