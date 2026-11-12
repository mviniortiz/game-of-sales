-- QUOTE.4 (2026-11-12) — o cliente viu a mensagem do orçamento?
--
-- O tique azul do WhatsApp já chega: a evolution-message-webhook (messages.update)
-- e a kapso-webhook sobem channel_messages.status até 'read'. Aqui o orçamento
-- passa a saber disso:
--   * seen: a mensagem do orçamento está como lida. Vem da própria mensagem, então
--     vale também quando o tique chegou antes do rastreio existir.
--   * seen_at: quando o tique azul chegou. Gravado por trigger no momento em que o
--     status vira 'read'; fica vazio se o tique veio antes do rastreio (aí a tela
--     mostra "viu" sem hora) e nunca é inventado.
-- Tique azul = abriu a conversa e a mensagem apareceu. Não prova que abriu o PDF,
-- e quem desligou a confirmação de leitura nunca aparece como visto.
--
-- Aditiva: nada existente some. Aplicar ANTES do deploy do front:
-- npx supabase db query --linked -f <este arquivo> (NUNCA db push).

-- ── 1) Coluna ───────────────────────────────────────────────────────────────
alter table public.quote_tracking
  add column if not exists seen_at timestamptz;

comment on column public.quote_tracking.seen_at is
  'QUOTE.4: quando o tique azul da mensagem do orçamento chegou. Vazio = não chegou ou chegou antes do rastreio.';

-- ── 2) Trigger: status da mensagem virou 'read' ─────────────────────────────
-- WHEN no trigger: só roda na troca para 'read', o resto dos updates de
-- channel_messages nem entra na função.
create or replace function public.quote_tracking_marca_visto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.quote_tracking
       set seen_at = now()
     where channel_message_id = new.id
       and seen_at is null;
    return null;
end;
$$;

revoke all on function public.quote_tracking_marca_visto() from public, anon, authenticated;

drop trigger if exists quote_tracking_marca_visto on public.channel_messages;
create trigger quote_tracking_marca_visto
  after update of status on public.channel_messages
  for each row
  when (new.status = 'read' and old.status is distinct from 'read')
  execute function public.quote_tracking_marca_visto();

-- ── 3) View: colunas novas só no fim ────────────────────────────────────────
-- Igual à definição em produção de 12/11/2026 (com numero_antigo), mais seen e seen_at.
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
           q.system_kwp, q.stop_reason,
           coalesce(m.status = 'read', false) as seen,
           q.seen_at
      from public.quote_tracking q
      left join public.channel_conversations c on c.id = q.conversation_id
      left join public.channel_messages m on m.id = q.channel_message_id
     cross join lateral (
            select case when c.last_inbound_at > q.sent_at then c.last_inbound_at end as client_at,
                   greatest(q.sent_at, c.last_outbound_at)                          as company_at
           ) t
     where q.closed_reason is distinct from 'replaced'
       and coalesce(c.numero_antigo, false) = false;

-- ── 4) Painel: seen e seen_at em cada item ──────────────────────────────────
-- Igual à definição em produção de 12/11/2026, mais os dois campos no item.
create or replace function public.get_quote_board(p_company_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
                    'draft_at', draft_at,
                    'system_kwp', system_kwp,
                    'stop_reason', stop_reason,
                    'seen', seen,
                    'seen_at', seen_at
                ) order by rn
            ) filter (where rn <= 200),
            '[]'::jsonb
        )
    ) into v_result
    from ranked;

    return v_result;
end;
$function$;

do $$ begin
  raise notice 'QUOTE.4 aplicado: quote_tracking.seen_at, trigger quote_tracking_marca_visto em channel_messages, seen/seen_at na view e no get_quote_board.';
end $$;
