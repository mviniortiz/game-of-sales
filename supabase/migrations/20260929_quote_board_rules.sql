-- QUOTE.3 (2026-09-29) — regras do placar para venda de ciclo longo (solar).
--
-- O estado de um orçamento aberto sai da conversa: quem falou por último e
-- quando (channel_conversations.last_inbound_at / last_outbound_at). Uma função
-- só decide o estado (quote_tracking_live); o painel (get_quote_board) e a
-- retomada (eva-quote-followup, via quote_followup_candidates) leem dela, pra
-- tela e EVA nunca discordarem.
--
-- Orçamento aberto:
--   no_reply    cliente não escreveu depois do orçamento                    → parado
--   went_quiet  cliente respondeu, empresa falou por último há 3+ dias      → parado
--   your_turn   cliente falou por último e está sem resposta                → vez da empresa
--   talking     empresa respondeu o cliente há menos de 3 dias
-- Encerrado: won, lost, expired (30 dias sem o cliente escrever), closed.
-- Orçamento substituído por outro na mesma conversa (closed_reason 'replaced')
-- sai do painel: quem conta é o novo, senão o valor parado duplica.
--
-- "Recuperado" = ganho com retomada enviada antes do ganho. Resposta do cliente
-- depois da retomada não conta: pode ter sido um não.
--
-- Aditiva e idempotente. Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260929_quote_board_rules.sql
-- (NUNCA db push).

-- ── 1) Colunas ──────────────────────────────────────────────────────────────
alter table public.quote_tracking
  add column if not exists closed_reason text
    check (closed_reason in ('replaced','expired','deal_closed')),
  add column if not exists last_draft_at timestamptz;

comment on column public.quote_tracking.closed_reason is
  'QUOTE.3: por que fechou sem desfecho. replaced = orçamento novo na conversa (some do painel); expired = 30 dias sem o cliente escrever; deal_closed = card encerrado fora do fluxo de desfecho.';
comment on column public.quote_tracking.last_draft_at is
  'QUOTE.3: quando a EVA rascunhou a última retomada deste orçamento. Uma retomada por silêncio do cliente: só rascunha de novo se o cliente falou depois disso.';

-- ── 2) Estado de cada orçamento ─────────────────────────────────────────────
-- View do dono (postgres): lê quote_tracking sem RLS. Por isso fica fechada pra
-- anon/authenticated; o painel entra pela get_quote_board, que confere a empresa.
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
           end as state
      from public.quote_tracking q
      left join public.channel_conversations c on c.id = q.conversation_id
     cross join lateral (
            select case when c.last_inbound_at > q.sent_at then c.last_inbound_at end as client_at,
                   greatest(q.sent_at, c.last_outbound_at)                          as company_at
           ) t
     where q.closed_reason is distinct from 'replaced';

revoke all on public.quote_tracking_live from public, anon, authenticated;
grant select on public.quote_tracking_live to service_role;

comment on view public.quote_tracking_live is
  'QUOTE.3: orçamentos com o estado calculado pela conversa (no_reply, went_quiet, your_turn, talking, won, lost, expired, closed). Fonte única do painel e da retomada.';

-- ── 3) Quem a EVA deve retomar ──────────────────────────────────────────────
-- no_reply: uma retomada, 2 dias depois da última mensagem da empresa (se o
-- vendedor já cobrou à mão ontem, espera). went_quiet: uma por silêncio.
create or replace function public.quote_followup_candidates(p_limit int default 50)
returns setof public.quote_tracking_live
language sql
stable
security definer
set search_path = public
as $$
    select l.*
      from public.quote_tracking_live l
     where (l.state = 'no_reply' and l.status = 'open'
            and l.company_at < now() - interval '2 days')
        or (l.state = 'went_quiet'
            and (l.last_draft_at is null or l.last_draft_at < l.client_at))
     order by l.amount desc nulls last, l.sent_at
     limit greatest(coalesce(p_limit, 50), 0);
$$;

-- ── 4) Vencimento ───────────────────────────────────────────────────────────
-- 30 dias sem o cliente escrever (contando do orçamento ou da última mensagem
-- dele) = morreu. Venda solar residencial leva de 15 a 45 dias; 7 era curto.
create or replace function public.quote_tracking_expire(p_days int default 30)
returns int
language sql
volatile
security definer
set search_path = public
as $$
    with x as (
        update public.quote_tracking q
           set status = 'closed', closed_reason = 'expired'
          from public.channel_conversations c
         where c.id = q.conversation_id
           and q.outcome is null
           and q.status <> 'closed'
           and greatest(q.sent_at, case when c.last_inbound_at > q.sent_at then c.last_inbound_at end)
               < now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
        returning 1
    )
    select count(*)::int from x;
$$;

-- ── 5) Painel ───────────────────────────────────────────────────────────────
create or replace function public.get_quote_board(p_company_id uuid, p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_result jsonb;
begin
    -- coalesce: sem profile os helpers devolvem null e o not(...) deixaria passar
    if not (coalesce(public.is_super_admin(), false)
            or coalesce(p_company_id = public.get_my_company_id(), false)) then
        raise exception 'acesso negado' using errcode = '42501';
    end if;

    with base as (
        select l.*,
               coalesce(nullif(trim(ct.name), ''), d.customer_name) as contact_name,
               coalesce(ct.phone_e164, d.customer_phone)            as contact_phone,
               l.state in ('no_reply','went_quiet')                 as parked,
               (l.outcome = 'won' and l.followup_sent_at is not null
                and l.followup_sent_at <= coalesce(l.outcome_at, now())) as recovered,
               -- desde quando o estado atual vale (o que a tela conta em dias)
               case l.state
                   when 'no_reply' then l.sent_at
                   when 'went_quiet' then l.client_at
                   when 'your_turn' then l.client_at
                   when 'talking' then l.client_at
                   when 'expired' then greatest(l.sent_at, l.client_at)
                   when 'won' then coalesce(l.outcome_at, l.sent_at)
                   when 'lost' then coalesce(l.outcome_at, l.sent_at)
                   else l.sent_at
               end as since,
               s.status     as draft_status,
               s.created_at as draft_at
          from public.quote_tracking_live l
          left join public.channel_contacts ct on ct.id = l.contact_id
          left join public.deals d on d.id = l.deal_id
          left join lateral (
                select a.status, a.created_at
                  from public.agent_suggestions a
                 where a.company_id = l.company_id
                   and a.kind = 'followup'
                   and a.input_summary->>'quote_id' = l.id::text
                 order by a.created_at desc
                 limit 1
               ) s on true
         where l.company_id = p_company_id
           and l.sent_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 0))
    ),
    ranked as (
        select b.*,
               greatest(0, floor(extract(epoch from (now() - b.since)) / 86400))::int as days,
               row_number() over (
                   order by case when b.state = 'your_turn' then 0
                                 when b.parked then 1
                                 when b.state = 'talking' then 2
                                 else 3 end,
                            case when b.state in ('your_turn','no_reply','went_quiet','talking') then b.amount end desc nulls last,
                            b.since desc
               ) as rn
          from base b
    )
    select jsonb_build_object(
        'totals', jsonb_build_object(
            'parked_amount',     coalesce(sum(amount) filter (where parked), 0),
            'parked_count',      count(*) filter (where parked),
            'no_reply_count',    count(*) filter (where state = 'no_reply'),
            'went_quiet_count',  count(*) filter (where state = 'went_quiet'),
            'your_turn_amount',  coalesce(sum(amount) filter (where state = 'your_turn'), 0),
            'your_turn_count',   count(*) filter (where state = 'your_turn'),
            'talking_count',     count(*) filter (where state = 'talking'),
            'recovered_amount',  coalesce(sum(amount) filter (where recovered), 0),
            'recovered_count',   count(*) filter (where recovered),
            'won_amount',        coalesce(sum(amount) filter (where outcome = 'won'), 0),
            'won_count',         count(*) filter (where outcome = 'won'),
            'lost_count',        count(*) filter (where state = 'lost'),
            'expired_count',     count(*) filter (where state = 'expired'),
            'total_count',       count(*)
        ),
        'items', coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'deal_id', deal_id,
                    'conversation_id', conversation_id,
                    'contact_name', contact_name,
                    'contact_phone', contact_phone,
                    'amount', amount,
                    'detected_by', detected_by,
                    'sent_at', sent_at,
                    'state', state,
                    'days', days,
                    'outcome', outcome,
                    'recovered', recovered,
                    'followup_sent_at', followup_sent_at,
                    'draft_status', draft_status,
                    'draft_at', draft_at
                ) order by rn
            ) filter (where rn <= 200),
            '[]'::jsonb
        )
    ) into v_result
    from ranked;

    return v_result;
end;
$$;

comment on function public.get_quote_board(uuid, int) is
'QUOTE.3: painel de orçamentos da empresa. Estado por item vem da quote_tracking_live; parado = no_reply + went_quiet; recuperado = ganho depois da retomada.';

-- ── 6) Permissões ───────────────────────────────────────────────────────────
revoke all on function public.quote_followup_candidates(int) from public, anon, authenticated;
revoke all on function public.quote_tracking_expire(int) from public, anon, authenticated;
grant execute on function public.quote_followup_candidates(int) to service_role;
grant execute on function public.quote_tracking_expire(int) to service_role;
revoke all on function public.get_quote_board(uuid, int) from public, anon;
grant execute on function public.get_quote_board(uuid, int) to authenticated, service_role;

do $$
begin
  raise notice 'QUOTE.3 aplicado: closed_reason + last_draft_at, view quote_tracking_live, quote_followup_candidates, quote_tracking_expire, get_quote_board por estado.';
end $$;
