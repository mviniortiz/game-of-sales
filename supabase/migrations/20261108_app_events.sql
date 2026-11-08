-- Uso do app pelas integradoras (plano em docs/analytics/plano-de-tagging-app.md).
-- O GA4 não liga evento a empresa; aqui cada linha tem empresa e pessoa, para
-- responder "o que esta integradora fez". O app grava em lote pela RPC
-- log_app_events; ninguém escreve direto na tabela. Só super admin lê.

create table if not exists public.app_events (
    id bigserial primary key,
    company_id uuid references public.companies(id) on delete cascade,
    user_id uuid,
    session_id text not null,
    event text not null,
    tela text,
    aba text,
    props jsonb not null default '{}'::jsonb,
    como_admin boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists app_events_company_idx on public.app_events (company_id, created_at desc);
create index if not exists app_events_event_idx on public.app_events (event, created_at desc);
create index if not exists app_events_user_idx on public.app_events (user_id, created_at desc);

-- GRANT antes do RLS (regra do repo).
grant select on public.app_events to authenticated;
grant all on public.app_events to service_role;
grant usage, select on sequence public.app_events_id_seq to service_role;

alter table public.app_events enable row level security;

drop policy if exists app_events_super_admin_read on public.app_events;
create policy app_events_super_admin_read on public.app_events
    for select to authenticated
    using (public.is_super_admin());

-- Sem policy de insert/update/delete: só a RPC abaixo (security definer) grava.

-- Grava até 50 eventos de uma vez. A pessoa vem do login; a empresa vem do
-- perfil, e só o super admin pode apontar outra (a que ele está operando), e
-- aí a linha sai com como_admin = true para não contar como uso da integradora.
create or replace function public.log_app_events(eventos jsonb, empresa uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_propria uuid;
    v_super boolean;
    v_empresa uuid;
    v_admin boolean := false;
    e jsonb;
    v_props jsonb;
begin
    if v_user is null or jsonb_typeof(eventos) <> 'array' then
        return;
    end if;

    select p.company_id, coalesce(p.is_super_admin, false) into v_propria, v_super
    from public.profiles p where p.id = v_user;

    v_empresa := v_propria;
    if v_super and empresa is not null then
        v_empresa := empresa;
    end if;
    v_admin := v_super;

    -- Teto por pessoa e dia: um laço com defeito não enche a tabela.
    if (select count(*) from public.app_events
        where user_id = v_user and created_at > now() - interval '1 day') >= 3000 then
        return;
    end if;

    for e in select * from jsonb_array_elements(eventos) limit 50 loop
        if coalesce(e->>'event', '') !~ '^[a-z][a-z0-9_]{2,40}$' then
            continue;
        end if;
        v_props := coalesce(e->'props', '{}'::jsonb);
        if jsonb_typeof(v_props) <> 'object' or length(v_props::text) > 1500 then
            v_props := '{}'::jsonb;
        end if;
        insert into public.app_events (company_id, user_id, session_id, event, tela, aba, props, como_admin, created_at)
        values (
            v_empresa,
            v_user,
            left(coalesce(e->>'session_id', ''), 64),
            e->>'event',
            left(e->>'tela', 30),
            left(e->>'aba', 30),
            v_props,
            v_admin,
            -- Hora do clique (o lote chega uns segundos depois), entre 1 h atrás e agora.
            least(greatest(coalesce((e->>'at')::timestamptz, now()), now() - interval '1 hour'), now())
        );
    end loop;
end;
$$;

revoke all on function public.log_app_events(jsonb, uuid) from public, anon;
grant execute on function public.log_app_events(jsonb, uuid) to authenticated;

-- Uso por empresa e dia, sem as sessões de super admin.
create or replace view public.vw_app_uso_empresa_dia
with (security_invoker = true) as
select
    e.company_id,
    c.name as empresa,
    (e.created_at at time zone 'America/Sao_Paulo')::date as dia,
    count(distinct e.user_id) as pessoas,
    count(distinct e.session_id) as sessoes,
    count(*) filter (where e.event = 'screen_viewed') as telas_vistas,
    count(*) filter (where e.event = 'conversation_opened') as conversas_abertas,
    count(*) filter (where e.event = 'message_sent') as mensagens_enviadas,
    count(*) filter (where e.event like 'eva_suggestion_%') as interacoes_lume,
    count(*) filter (where e.event = 'deal_created') as negocios_criados,
    array_agg(distinct e.tela) filter (where e.tela is not null) as telas
from public.app_events e
join public.companies c on c.id = e.company_id
where not e.como_admin
group by 1, 2, 3;

-- Funil de ativação: a primeira vez de cada passo, por empresa.
create or replace view public.vw_app_ativacao
with (security_invoker = true) as
select
    c.id as company_id,
    c.name as empresa,
    c.created_at as conta_criada,
    least(
        (select min(created_at) from public.app_events where company_id = c.id and event = 'whatsapp_connected'),
        (select min(created_at) from public.channel_connections where company_id = c.id)
    ) as whatsapp_conectado,
    (select min(created_at) from public.app_events where company_id = c.id and event = 'raiox_viewed') as raiox_visto,
    (select min(created_at) from public.app_events where company_id = c.id and event = 'conversation_opened' and not como_admin) as primeira_conversa,
    (select min(resolved_at) from public.agent_suggestions
        where company_id = c.id and status in ('accepted', 'adjusted', 'sent', 'agendado')) as primeiro_aviso_aprovado,
    (select min(created_at) from public.app_events
        where company_id = c.id and event = 'app_session_started' and not como_admin
          and created_at >= c.created_at + interval '7 days') as voltou_depois_de_7_dias
from public.companies c;

grant select on public.vw_app_uso_empresa_dia to authenticated;
grant select on public.vw_app_ativacao to authenticated;
