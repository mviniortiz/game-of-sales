-- Raio-X das propostas paradas, gerado pelo Markus na conversa de 20 minutos
-- (edge raio-x-build) a partir do WhatsApp que o integrador conectou. O link
-- /relatorio/:token mostra o resultado sem login: o token é longo e aleatório,
-- e a página só exibe primeiro nome, valor, dias e a retomada sugerida.

create table if not exists public.raio_x_reports (
    id uuid primary key default gen_random_uuid(),
    token text not null unique,
    company_id uuid not null references public.companies(id) on delete cascade,
    demo_request_id uuid references public.demo_requests(id) on delete set null,
    created_by uuid references auth.users(id) on delete set null,
    company_name text,
    summary jsonb not null,
    items jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists raio_x_reports_company_idx on public.raio_x_reports (company_id, created_at desc);

grant select on public.raio_x_reports to authenticated;
grant all on public.raio_x_reports to service_role;

alter table public.raio_x_reports enable row level security;

drop policy if exists raio_x_reports_super_admin_read on public.raio_x_reports;
create policy raio_x_reports_super_admin_read on public.raio_x_reports
    for select to authenticated
    using (public.is_super_admin());

-- Escrita só pela edge (service_role). Sem policy de insert/update/delete.

create or replace function public.get_raio_x_report(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'company_name', r.company_name,
        'created_at', r.created_at,
        'summary', r.summary,
        'items', r.items
    )
    from public.raio_x_reports r
    where r.token = p_token and length(p_token) >= 24;
$$;

revoke all on function public.get_raio_x_report(text) from public;
grant execute on function public.get_raio_x_report(text) to anon, authenticated;
