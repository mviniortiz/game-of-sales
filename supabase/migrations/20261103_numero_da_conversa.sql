-- Número da conversa (03/11/2026)
--
-- Uma conexão do WhatsApp (instância por usuário) pode trocar de número: o
-- Markus saiu do pessoal pro chip da Lume. Antes, só o Inbox escondia o número
-- antigo, e por data (numero_desde), o que falha quando o número vai e volta.
-- Agora cada conversa guarda o número conectado quando ela andou pela última
-- vez, e a plataforma inteira mostra só as do número atual.
--
-- channel_conversations.numero         número conectado na última mensagem
-- channel_conversations.numero_antigo  true = de outro número; o app esconde
-- channel_connections.metadata.numero_atual  gravado pelo webhook (connection.update)
--
-- Aditiva: colunas com default, sem mudança de RLS (a tabela já tem).

alter table public.channel_conversations
    add column if not exists numero text,
    add column if not exists numero_antigo boolean not null default false;

create index if not exists channel_conversations_numero_antigo_idx
    on public.channel_conversations (company_id, numero_antigo, last_message_at desc);

-- Mensagem nova numa conversa: ela passa a ser do número conectado agora.
-- Vale para todo escritor (webhook, importação de histórico), porque mora no banco.
create or replace function public.channel_conversations_set_numero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_atual text;
begin
    if tg_op = 'UPDATE' and new.last_message_at is not distinct from old.last_message_at then
        return new;
    end if;
    select nullif(metadata->>'numero_atual', '') into v_atual
      from public.channel_connections where id = new.connection_id;
    if v_atual is not null then
        new.numero := v_atual;
        new.numero_antigo := false;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_channel_conversations_numero on public.channel_conversations;
create trigger trg_channel_conversations_numero
    before insert or update of last_message_at on public.channel_conversations
    for each row execute function public.channel_conversations_set_numero();

-- Chamada pelo webhook quando a sessão abre (connection.update state=open, wuid).
-- Primeira vez: só registra o número e carimba as conversas sem número.
-- Troca: carimba as sem número com o número que sai, marca como antigas as que
-- não são do número novo (e desmarca as que são, quando um número volta),
-- expira rascunho pendente da EVA dessas conversas e esconde o card cujas
-- conversas nesta conexão são todas antigas. Esconder = is_active false com
-- marca em source_data; quando o número volta, o card volta.
create or replace function public.registrar_numero_conectado(p_instance text, p_numero text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_conn   record;
    v_numero text := regexp_replace(coalesce(p_numero, ''), '\D', '', 'g');
    v_antes  text;
    v_agora  timestamptz := now();
    v_sug    int := 0;
    v_ocult  int := 0;
    v_volta  int := 0;
begin
    if v_numero = '' then
        return jsonb_build_object('ok', false, 'motivo', 'sem numero');
    end if;
    select id, company_id, metadata into v_conn
      from public.channel_connections
     where provider = 'evolution' and external_id = p_instance
     limit 1;
    if v_conn.id is null then
        return jsonb_build_object('ok', false, 'motivo', 'conexao nao encontrada');
    end if;

    v_antes := nullif(regexp_replace(coalesce(v_conn.metadata->>'numero_atual', v_conn.metadata->>'owner_jid', ''), '\D', '', 'g'), '');

    if v_antes is null or v_antes = v_numero then
        update public.channel_connections
           set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('numero_atual', v_numero)
         where id = v_conn.id and coalesce(metadata->>'numero_atual', '') <> v_numero;
        update public.channel_conversations set numero = v_numero
         where connection_id = v_conn.id and numero is null;
        return jsonb_build_object('ok', true, 'troca', false, 'numero', v_numero);
    end if;

    -- Troca de número.
    update public.channel_conversations set numero = v_antes
     where connection_id = v_conn.id and numero is null;
    update public.channel_conversations
       set numero_antigo = (numero is distinct from v_numero)
     where connection_id = v_conn.id
       and numero_antigo is distinct from (numero is distinct from v_numero);

    update public.channel_connections
       set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
               'numero_atual', v_numero,
               'owner_jid', v_numero,
               'numero_desde', to_char(v_agora at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
               'numero_anterior', v_antes)
     where id = v_conn.id;

    with x as (
        update public.agent_suggestions a set status = 'expired'
          from public.channel_conversations c
         where a.status = 'pending' and a.conversation_id = c.id
           and c.connection_id = v_conn.id and c.numero_antigo
        returning 1
    ) select count(*) into v_sug from x;

    with x as (
        update public.deals d
           set is_active = false,
               source_data = coalesce(d.source_data, '{}'::jsonb) || jsonb_build_object(
                   'oculto_por', 'troca_de_numero', 'numero_antigo', v_antes,
                   'conexao', v_conn.id, 'oculto_em', v_agora)
         where d.company_id = v_conn.company_id and d.is_active
           and exists (select 1 from public.channel_conversations c
                        where c.deal_id = d.id and c.connection_id = v_conn.id)
           and not exists (select 1 from public.channel_conversations c
                            where c.deal_id = d.id and c.connection_id = v_conn.id and not c.numero_antigo)
        returning 1
    ) select count(*) into v_ocult from x;

    with x as (
        update public.deals d
           set is_active = true,
               source_data = d.source_data - 'oculto_por' - 'numero_antigo' - 'conexao' - 'oculto_em'
         where d.company_id = v_conn.company_id and not d.is_active
           and d.source_data->>'oculto_por' = 'troca_de_numero'
           and d.source_data->>'conexao' = v_conn.id::text
           and d.source_data->>'numero_antigo' = v_numero
        returning 1
    ) select count(*) into v_volta from x;

    return jsonb_build_object('ok', true, 'troca', true, 'de', v_antes, 'para', v_numero,
        'rascunhos_expirados', v_sug, 'cards_ocultos', v_ocult, 'cards_de_volta', v_volta);
end;
$$;

revoke all on function public.registrar_numero_conectado(text, text) from public, anon, authenticated;
grant execute on function public.registrar_numero_conectado(text, text) to service_role;

-- Retrato de hoje. Conexão com owner_jid passa a ter numero_atual. A do Markus
-- trocou em 04/11 00:42 UTC: o que andou antes disso é do pessoal (554891696887).
update public.channel_connections
   set metadata = metadata || jsonb_build_object('numero_atual', regexp_replace(metadata->>'owner_jid', '\D', '', 'g'))
 where provider = 'evolution'
   and coalesce(metadata->>'owner_jid', '') <> ''
   and coalesce(metadata->>'numero_atual', '') = '';

update public.channel_connections
   set metadata = metadata || jsonb_build_object('numero_anterior', '554891696887')
 where external_id = 'wa_99289fe59bf443238a184ccedef2126b';

update public.channel_conversations c
   set numero = case when c.last_message_at >= (cc.metadata->>'numero_desde')::timestamptz
                     then cc.metadata->>'numero_atual' else '554891696887' end
  from public.channel_connections cc
 where cc.id = c.connection_id and cc.external_id = 'wa_99289fe59bf443238a184ccedef2126b'
   and c.numero is null;

update public.channel_conversations c
   set numero = cc.metadata->>'numero_atual'
  from public.channel_connections cc
 where cc.id = c.connection_id and c.numero is null
   and coalesce(cc.metadata->>'numero_atual', '') <> '';

update public.channel_conversations c
   set numero_antigo = true
  from public.channel_connections cc
 where cc.id = c.connection_id
   and c.numero is not null and c.numero <> cc.metadata->>'numero_atual';

-- Os 6 cards escondidos à mão em 03/11 ganham a conexão na marca, para voltarem
-- se o pessoal voltar a ser conectado aqui.
update public.deals d
   set source_data = d.source_data || jsonb_build_object('conexao', cc.id)
  from public.channel_connections cc
 where cc.external_id = 'wa_99289fe59bf443238a184ccedef2126b'
   and d.company_id = cc.company_id
   and d.source_data->>'oculto_por' = 'troca_de_numero'
   and d.source_data->>'conexao' is null;

-- Orçamento de conversa do número antigo sai do painel e do follow-up da EVA
-- (eva-quote-followup e get_quote_board leem esta view). Mesmas colunas da
-- versão em produção (system_kwp e stop_reason vieram depois de 20260929).
create or replace view public.quote_tracking_live as
    select q.id, q.company_id, q.conversation_id, q.contact_id, q.deal_id, q.amount,
           q.detected_by, q.sent_at, q.status, q.outcome, q.outcome_at,
           q.followup_sent_at, q.last_draft_at,
           t.client_at, t.company_at,
           case
               when q.outcome = 'won'  then 'won'
               when q.outcome = 'lost' then 'lost'
               when q.status = 'closed' and q.closed_reason = 'expired' then 'expired'
               when q.status = 'closed' then 'closed'
               when t.client_at is null then 'no_reply'
               when t.client_at > t.company_at then 'your_turn'
               when t.company_at < now() - interval '3 days' then 'went_quiet'
               else 'talking'
           end as state,
           q.system_kwp, q.stop_reason
      from public.quote_tracking q
      left join public.channel_conversations c on c.id = q.conversation_id
     cross join lateral (
            select case when c.last_inbound_at > q.sent_at then c.last_inbound_at end as client_at,
                   greatest(q.sent_at, c.last_outbound_at)                          as company_at
           ) t
     where q.closed_reason is distinct from 'replaced'
       and coalesce(c.numero_antigo, false) = false;

revoke all on public.quote_tracking_live from public, anon, authenticated;
grant select on public.quote_tracking_live to service_role;

-- ── Prospecção no Início ────────────────────────────────────────────────────
-- O que o dono precisa fazer hoje com as integradoras que o número atual abordou.
-- Só leitura: aprovar continua no grupo do WhatsApp. Escopo: auth.uid() e o que
-- saiu ou chegou desde chip_desde (conversa do número anterior não entra).
create or replace function public.get_prospeccao_hoje()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    with inst as (
        select user_id, numero_chip, chip_desde, pausa_ate
          from public.prospecting_instances
         where user_id = auth.uid() and is_active
         limit 1
    ),
    hoje as (
        select (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as inicio
    ),
    lote as (
        select b.code, b.status, b.created_at, coalesce(array_length(b.contact_ids, 1), 0) as total
          from public.prospecting_batches b, inst, hoje
         where b.user_id = inst.user_id and b.created_at >= hoje.inicio
         order by b.created_at desc
         limit 1
    ),
    itens as (
        select a.id, a.agency_name, a.city, a.status, a.reply_kind, a.replied_at, a.reply_code,
               left(a.last_reply, 240) as last_reply, left(a.reply_draft, 240) as reply_draft,
               a.meeting_at, a.sent_at
          from public.prospecting_allowlist a, inst
         where a.user_id = inst.user_id
           and a.status = 'respondeu'
           and coalesce(a.replied_at, a.sent_at) >= coalesce(inst.chip_desde, '-infinity'::timestamptz)
         order by (a.reply_code is not null) desc, a.replied_at desc nulls last
         limit 20
    )
    select case when not exists (select 1 from inst) then jsonb_build_object('ativo', false)
    else jsonb_build_object(
        'ativo', true,
        'numero', (select numero_chip from inst),
        'desde', (select chip_desde from inst),
        'pausado_ate', (select case when pausa_ate > now() then pausa_ate end from inst),
        'lote', (select to_jsonb(l) from lote l),
        'enviados_hoje', (select count(*) from public.prospecting_allowlist a, inst, hoje
                           where a.user_id = inst.user_id and a.sent_at >= hoje.inicio),
        'seguimentos', (select count(*) from public.prospecting_allowlist a, inst
                         where a.user_id = inst.user_id and a.status = 'enviado'
                           and a.followup_sent_at is null and a.sent_at >= coalesce(inst.chip_desde, '-infinity'::timestamptz)),
        'proximo_seguimento', (select min(a.followup_due_at) from public.prospecting_allowlist a, inst
                                where a.user_id = inst.user_id and a.status = 'enviado'
                                  and a.followup_sent_at is null and a.sent_at >= coalesce(inst.chip_desde, '-infinity'::timestamptz)),
        'itens', coalesce((select jsonb_agg(to_jsonb(i) order by (i.reply_code is not null) desc, i.replied_at desc nulls last) from itens i), '[]'::jsonb)
    ) end;
$$;

revoke all on function public.get_prospeccao_hoje() from public, anon;
grant execute on function public.get_prospeccao_hoje() to authenticated, service_role;
