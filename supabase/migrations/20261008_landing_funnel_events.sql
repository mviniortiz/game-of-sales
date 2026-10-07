-- Funil das páginas de captura (Raio-X), medido no nosso banco.
-- O GA4 só carrega depois da primeira interação (src/lib/analytics.ts), então
-- quem entra e sai sem tocar não aparece lá. Aqui fica todo visitante, com
-- visita, rolagem, clique e formulário presos à origem do anúncio.
-- A página grava pela RPC log_landing_event (anon); ninguém lê sem ser super admin.

create table if not exists public.landing_events (
    id bigserial primary key,
    session_id text not null,
    event text not null,
    page text not null,
    variant text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    fbclid text,
    referrer text,
    props jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists landing_events_created_idx on public.landing_events (created_at desc);
create index if not exists landing_events_session_idx on public.landing_events (session_id);
create index if not exists landing_events_page_idx on public.landing_events (page, variant, created_at desc);

grant select on public.landing_events to authenticated;
grant all on public.landing_events to service_role;
grant usage, select on sequence public.landing_events_id_seq to service_role;

alter table public.landing_events enable row level security;

drop policy if exists landing_events_super_admin_read on public.landing_events;
create policy landing_events_super_admin_read on public.landing_events
    for select to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));

-- Sem policy de insert/update/delete: só a RPC abaixo (security definer) grava.

create or replace function public.log_landing_event(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event text := left(coalesce(payload->>'event', ''), 40);
    v_session text := left(coalesce(payload->>'session_id', ''), 64);
    v_page text := left(coalesce(payload->>'page', ''), 80);
    v_props jsonb := coalesce(payload->'props', '{}'::jsonb);
begin
    if v_event not in ('view', 'scroll_50', 'scroll_90', 'cta_click', 'form_start', 'form_submit', 'form_error', 'whatsapp_click')
       or v_session = '' or v_page = '' then
        return;
    end if;
    if jsonb_typeof(v_props) <> 'object' or length(v_props::text) > 2000 then
        v_props := '{}'::jsonb;
    end if;
    -- Teto por sessão: evita que um script encha a tabela.
    if (select count(*) from public.landing_events where session_id = v_session) >= 60 then
        return;
    end if;

    insert into public.landing_events
        (session_id, event, page, variant, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, referrer, props)
    values (
        v_session, v_event, v_page,
        left(payload->>'variant', 40),
        left(payload->>'utm_source', 120), left(payload->>'utm_medium', 120),
        left(payload->>'utm_campaign', 200), left(payload->>'utm_content', 200),
        left(payload->>'utm_term', 200), left(payload->>'fbclid', 300),
        left(payload->>'referrer', 300), v_props
    );
end;
$$;

revoke all on function public.log_landing_event(jsonb) from public;
grant execute on function public.log_landing_event(jsonb) to anon, authenticated;
