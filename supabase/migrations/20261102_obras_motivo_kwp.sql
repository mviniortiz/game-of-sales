-- OBRAS.1 (2026-11-02) — o que vem depois da venda, e mais dado por orçamento.
--
-- 1) quote_tracking ganha system_kwp e stop_reason. O kWp sai do texto da mensagem
--    (trigger abaixo) ou do PDF (edge quote-pdf-amount); o motivo, das últimas
--    mensagens do cliente (edge eva-quote-followup).
-- 2) agendamentos ganha tipo: visita técnica, instalação, vistoria ou outro.
-- 3) obras e obra_documentos: venda fechada vira obra sozinha, pelo trigger em
--    deals. A etapa é manual nesta versão: quem sabe do protocolo é o dono.
--
-- Aditiva: nada existente some. Aplicar ANTES do deploy do front:
-- npx supabase db query --linked -f <este arquivo> (NUNCA db push).

-- ── 1) Orçamento ───────────────────────────────────────────────────────────
alter table public.quote_tracking
  add column if not exists system_kwp numeric,
  add column if not exists stop_reason text
    check (stop_reason in ('parcela','decisor','comparando','credito'));

create or replace function public.kwp_do_texto(p_texto text)
returns numeric
language sql
immutable
as $$
    select replace(substring(p_texto from '(\d{1,3}(?:[.,]\d{1,2})?)\s*[kK][wW][pP]'), ',', '.')::numeric;
$$;

create or replace function public.quote_tracking_kwp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.system_kwp is null then
        select public.kwp_do_texto(m.body) into new.system_kwp
          from public.channel_messages m
         where m.id = new.channel_message_id;
    end if;
    return new;
end;
$$;

drop trigger if exists quote_tracking_kwp on public.quote_tracking;
create trigger quote_tracking_kwp
  before insert on public.quote_tracking
  for each row execute function public.quote_tracking_kwp();

update public.quote_tracking q
   set system_kwp = public.kwp_do_texto(m.body)
  from public.channel_messages m
 where m.id = q.channel_message_id
   and q.system_kwp is null
   and m.body ~* '\d\s*kwp';

-- Coluna nova em view só entra no fim.
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
     where q.closed_reason is distinct from 'replaced';

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
                    'draft_at', draft_at,
                    'system_kwp', system_kwp,
                    'stop_reason', stop_reason
                ) order by rn
            ) filter (where rn <= 200),
            '[]'::jsonb
        )
    ) into v_result
    from ranked;

    return v_result;
end;
$$;

-- ── 2) Agenda ──────────────────────────────────────────────────────────────
alter table public.agendamentos
  add column if not exists tipo text
    check (tipo in ('visita','instalacao','vistoria','outro'));

-- ── 3) Obras ───────────────────────────────────────────────────────────────
create table if not exists public.obras (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  deal_id      uuid references public.deals(id) on delete set null,
  cliente      text not null,
  system_kwp   numeric,
  valor        numeric,
  etapa        text not null default 'documentos'
                 check (etapa in ('documentos','protocolo','parecer','instalacao','vistoria','medidor','ligada')),
  com_quem     text not null default 'cliente'
                 check (com_quem in ('cliente','concessionaria','voce','instalador')),
  etapa_desde  timestamptz not null default now(),
  nota         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint obras_deal_uniq unique (deal_id)
);

create table if not exists public.obra_documentos (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  obra_id     uuid not null references public.obras(id) on delete cascade,
  nome        text not null,
  recebido    boolean not null default false,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists obras_empresa_idx on public.obras (company_id, etapa, etapa_desde);
create index if not exists obra_documentos_obra_idx on public.obra_documentos (obra_id, ordem);

-- GRANT antes de RLS.
grant select, insert, update, delete on public.obras to authenticated;
grant select, insert, update, delete on public.obra_documentos to authenticated;
grant all on public.obras to service_role;
grant all on public.obra_documentos to service_role;

alter table public.obras enable row level security;
alter table public.obra_documentos enable row level security;

drop policy if exists obras_select on public.obras;
create policy obras_select on public.obras for select to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obras_insert on public.obras;
create policy obras_insert on public.obras for insert to authenticated
  with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obras_update on public.obras;
create policy obras_update on public.obras for update to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin())
  with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obras_delete on public.obras;
create policy obras_delete on public.obras for delete to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin());

drop policy if exists obra_documentos_select on public.obra_documentos;
create policy obra_documentos_select on public.obra_documentos for select to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obra_documentos_insert on public.obra_documentos;
create policy obra_documentos_insert on public.obra_documentos for insert to authenticated
  with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obra_documentos_update on public.obra_documentos;
create policy obra_documentos_update on public.obra_documentos for update to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin())
  with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obra_documentos_delete on public.obra_documentos;
create policy obra_documentos_delete on public.obra_documentos for delete to authenticated
  using (company_id = public.get_my_company_id() or public.is_super_admin());

drop trigger if exists obras_updated_at on public.obras;
create trigger obras_updated_at before update on public.obras
  for each row execute function public.update_updated_at();
drop trigger if exists obra_documentos_updated_at on public.obra_documentos;
create trigger obra_documentos_updated_at before update on public.obra_documentos
  for each row execute function public.update_updated_at();

-- Obra nova já nasce com a lista de documentos da concessionária.
create or replace function public.obra_documentos_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.obra_documentos (company_id, obra_id, nome, ordem)
    select new.company_id, new.id, d.nome, d.ordem
      from (values ('Conta de luz', 1), ('RG e CPF', 2), ('Procuração com firma', 3),
                   ('ART', 4), ('Diagrama unifilar', 5), ('Memorial descritivo', 6)) as d(nome, ordem);
    return new;
end;
$$;

drop trigger if exists obras_documentos_padrao on public.obras;
create trigger obras_documentos_padrao
  after insert on public.obras
  for each row execute function public.obra_documentos_padrao();

-- Fechou no funil, virou obra: vale para o app, para a Lume e para o desfecho do placar.
create or replace function public.deal_ganho_vira_obra()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.stage = 'closed_won' and old.stage is distinct from 'closed_won' and new.company_id is not null then
        insert into public.obras (company_id, deal_id, cliente, system_kwp, valor)
        values (
            new.company_id,
            new.id,
            coalesce(nullif(trim(new.customer_name), ''), nullif(trim(new.title), ''), 'Cliente'),
            (select q.system_kwp from public.quote_tracking q
              where q.deal_id = new.id and q.system_kwp is not null
              order by q.sent_at desc limit 1),
            new.value
        )
        on conflict (deal_id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists deal_ganho_vira_obra on public.deals;
create trigger deal_ganho_vira_obra
  after update of stage on public.deals
  for each row execute function public.deal_ganho_vira_obra();

revoke all on function public.quote_tracking_kwp() from public, anon, authenticated;
revoke all on function public.obra_documentos_padrao() from public, anon, authenticated;
revoke all on function public.deal_ganho_vira_obra() from public, anon, authenticated;
