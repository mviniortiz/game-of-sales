-- DIST.0 (2026-10-22) — Fila interna do time de distribuição (docs/distribuicao/time-de-bots.md).
--
-- Ferramenta interna para gerir e crescer o Vyzon, não feature de cliente. Os
-- agentes (OpenBot, no Mac do Markus) entregam rascunho pela edge
-- distribuicao-inbox; o rascunho fica nesta tabela, separada da fila da EVA
-- (agent_suggestions), e o aviso vai só para o WhatsApp do Markus com código
-- próprio (D + letra + dígito, ex.: DK4). Ele responde "DK4 1" para aprovar,
-- "DK4 2" para descartar ou "DK4 <texto>" para aprovar com correção. Aprovar
-- não publica nada: publicar é com ele ou com um executor que só age sobre o
-- que foi aprovado.
--
-- distribuicao_painel() entrega ao time só números agregados e trechos de
-- resposta da prospecção com telefone, e-mail, empresa e cidade trocados por
-- marcador. Só a service_role executa (a edge chama com o segredo do time); o
-- OpenBot nunca recebe chave do banco.
--
-- Aditiva: tabela, função e índices novos. Nada existente muda.
-- Aplicar via: npx supabase db query --linked -f <este arquivo> (NUNCA db push).

-- ── 1) Fila interna ─────────────────────────────────────────────────────────
create table if not exists public.distribuicao_rascunhos (
  id                 uuid primary key default gen_random_uuid(),
  agente             text not null check (agente in ('analista','prospeccao','parcerias','conteudo','criativos','midia')),
  canal              text not null check (canal in ('instagram','blog','meta_ads','google_ads','parceiro','prospeccao_copy')),
  titulo             text not null,
  texto              text not null,
  por_que_agora      text,
  anexo_url          text,
  acao_apos_aprovar  text not null default 'manual' check (acao_apos_aprovar in ('manual','merge_pr','ads_apply')),
  alvo               jsonb,
  status             text not null default 'pendente'
                       check (status in ('pendente','aprovado','corrigido','descartado','expirado')),
  codigo             text,
  notificado_em      timestamptz,
  aviso_message_id   text,
  aviso_erro         text,
  tentativas         integer not null default 0,
  texto_final        text,
  resolvido_em       timestamptz,
  executado_em       timestamptz,
  resultado          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.distribuicao_rascunhos is
  'DIST.0: rascunhos do time interno de distribuição (OpenBot). Aprovados pelo Markus no WhatsApp com código D; aprovar não publica. Separada de agent_suggestions de propósito: nada aqui toca o fluxo dos clientes.';

create unique index if not exists distribuicao_rascunhos_codigo_uidx
  on public.distribuicao_rascunhos (codigo) where status = 'pendente' and codigo is not null;
create index if not exists distribuicao_rascunhos_fila_idx
  on public.distribuicao_rascunhos (status, created_at);
create index if not exists distribuicao_rascunhos_agente_idx
  on public.distribuicao_rascunhos (agente, created_at desc);

-- GRANT antes de RLS.
grant select on public.distribuicao_rascunhos to authenticated;
grant all on public.distribuicao_rascunhos to service_role;

alter table public.distribuicao_rascunhos enable row level security;

-- Só super admin lê pelo app. Escrita só pela service_role (edges), que ignora
-- RLS: sem policy de insert, update e delete para authenticated.
drop policy if exists distribuicao_rascunhos_super_admin_read on public.distribuicao_rascunhos;
create policy distribuicao_rascunhos_super_admin_read on public.distribuicao_rascunhos
  for select to authenticated
  using (public.is_super_admin());

drop trigger if exists distribuicao_rascunhos_updated_at on public.distribuicao_rascunhos;
create trigger distribuicao_rascunhos_updated_at
  before update on public.distribuicao_rascunhos
  for each row execute function public.update_updated_at();

-- ── 2) Painel do time ───────────────────────────────────────────────────────
create or replace function public.distribuicao_painel(p_company_id uuid, p_dias integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_dias  integer := least(greatest(coalesce(p_dias, 7), 1), 90);
    v_desde timestamptz := now() - make_interval(days => v_dias);
    v_out   jsonb;
begin
    if p_company_id is null then
        raise exception 'p_company_id obrigatorio';
    end if;

    select jsonb_build_object(
        'periodo', jsonb_build_object('dias', v_dias, 'desde', v_desde, 'ate', now()),

        -- Sessões distintas por etapa, por página e variante.
        'landing_funil', coalesce((
            select jsonb_agg(f order by f.page, f.variant)
            from (
                select page, coalesce(variant, '') as variant,
                       count(distinct session_id) filter (where event = 'view')           as view,
                       count(distinct session_id) filter (where event = 'scroll_50')      as scroll_50,
                       count(distinct session_id) filter (where event = 'scroll_90')      as scroll_90,
                       count(distinct session_id) filter (where event = 'cta_click')      as cta_click,
                       count(distinct session_id) filter (where event = 'whatsapp_click') as whatsapp_click,
                       count(distinct session_id) filter (where event = 'form_start')     as form_start,
                       count(distinct session_id) filter (where event = 'form_submit')    as form_submit,
                       count(distinct session_id) filter (where event = 'form_error')     as form_error
                from public.landing_events
                where created_at >= v_desde
                group by page, coalesce(variant, '')
            ) f
        ), '[]'::jsonb),

        -- De onde veio quem chegou ao WhatsApp ou ao formulário.
        'landing_origem', coalesce((
            select jsonb_agg(o order by o.sessoes desc)
            from (
                select coalesce(utm_source, '(direto)') as utm_source,
                       coalesce(utm_campaign, '') as utm_campaign,
                       count(distinct session_id) as sessoes,
                       count(distinct session_id) filter (where event = 'whatsapp_click') as whatsapp_click,
                       count(distinct session_id) filter (where event = 'form_submit')    as form_submit
                from public.landing_events
                where created_at >= v_desde
                group by 1, 2
                order by 3 desc
                limit 20
            ) o
        ), '[]'::jsonb),

        'cadastros', (select count(*) from public.companies where created_at >= v_desde),
        'empresas_pagas', (select count(*) from public.companies where subscription_status = 'active'),

        'demo_requests', coalesce((
            select jsonb_object_agg(fonte, n)
            from (
                select coalesce(source, '(sem)') as fonte, count(*) as n
                from public.demo_requests
                where created_at >= v_desde
                group by 1
            ) d
        ), '{}'::jsonb),

        -- Prospecção do próprio Vyzon. "conversas_marcadas" usa updated_at de
        -- quem está em conversa_marcada: é quando o status mudou pela última vez.
        'prospeccao_status', coalesce((
            select jsonb_object_agg(status, n)
            from (
                select status, count(*) as n
                from public.prospecting_allowlist
                where company_id = p_company_id and is_active
                group by status
            ) s
        ), '{}'::jsonb),

        'prospeccao_variantes', coalesce((
            select jsonb_agg(v order by v.variante)
            from (
                select coalesce(variant, '(sem)') as variante,
                       count(*) filter (where sent_at >= v_desde)    as enviados,
                       count(*) filter (where replied_at >= v_desde) as responderam,
                       count(*) filter (where replied_at >= v_desde and coalesce(reply_kind, '') <> 'automatico') as responderam_pessoa,
                       count(*) filter (where status = 'conversa_marcada' and updated_at >= v_desde) as conversas_marcadas,
                       count(*) filter (where status = 'sem_interesse' and updated_at >= v_desde)    as sem_interesse
                from public.prospecting_allowlist
                where company_id = p_company_id
                group by 1
            ) v
        ), '[]'::jsonb),

        'prospeccao_respostas', coalesce((
            select jsonb_agg(r order by r.respondeu_em desc)
            from (
                select a.variant as variante,
                       a.reply_kind as tipo,
                       a.replied_at as respondeu_em,
                       left(
                           regexp_replace(
                           regexp_replace(
                           regexp_replace(
                           regexp_replace(a.last_reply,
                               '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[email]', 'g'),
                               '\+?[0-9][0-9 ().-]{6,}[0-9]', '[número]', 'g'),
                               case when length(coalesce(a.agency_name, '')) >= 3
                                    then regexp_replace(a.agency_name, '([.*+?^${}()|\[\]\\])', '\\\1', 'g')
                                    else '(?!x)x' end, '[empresa]', 'gi'),
                               case when length(coalesce(a.city, '')) >= 3
                                    then regexp_replace(a.city, '([.*+?^${}()|\[\]\\])', '\\\1', 'g')
                                    else '(?!x)x' end, '[cidade]', 'gi'),
                           280) as trecho
                from public.prospecting_allowlist a
                where a.company_id = p_company_id
                  and a.replied_at >= v_desde
                  and coalesce(a.last_reply, '') <> ''
                order by a.replied_at desc
                limit 30
            ) r
        ), '[]'::jsonb),

        -- Como o Markus está respondendo aos rascunhos do time.
        'fila_distribuicao', coalesce((
            select jsonb_agg(q order by q.agente, q.status)
            from (
                select agente, status, count(*) as n
                from public.distribuicao_rascunhos
                where created_at >= v_desde
                group by agente, status
            ) q
        ), '[]'::jsonb)
    ) into v_out;

    return v_out;
end;
$$;

comment on function public.distribuicao_painel(uuid, integer) is
'DIST.0: números agregados para o time interno de distribuição (landing, cadastros, demo_requests, prospecção, fila). Sem dado pessoal: trechos de resposta saem com telefone, e-mail, empresa e cidade trocados por marcador. Só service_role.';

revoke all on function public.distribuicao_painel(uuid, integer) from public;
revoke all on function public.distribuicao_painel(uuid, integer) from anon, authenticated;
grant execute on function public.distribuicao_painel(uuid, integer) to service_role;

do $$ begin
  raise notice 'DIST.0 aplicado: distribuicao_rascunhos (RLS: só super admin lê) + distribuicao_painel().';
end $$;
