-- Integradoras que já mostraram interesse antes de cardDoProspect existir ganham
-- o mesmo card em Qualificação, ligado à conversa. Roda uma vez (metadata.deal_id).
with quentes as (
  select pa.*, left(split_part(regexp_replace(coalesce(pa.last_reply, ''), '^.*Eles: ', ''), E'\n', 1), 300) as disse
  from public.prospecting_allowlist pa
  where (pa.metadata ? 'sinal_compra_em' or pa.reply_kind = 'interesse')
    and not (pa.metadata ? 'deal_id')
),
novos as (
  insert into public.deals (title, customer_name, customer_phone, account_name, stage, user_id, company_id,
    additional_contacts, lead_source, source, notes, external_id)
  select coalesce(q.agency_name, 'Integradora') || ' · prospecção',
    coalesce(nullif(trim(q.metadata->>'socio'), ''), q.agency_name, 'Integradora'),
    q.phone_e164, q.agency_name, 'qualification', q.user_id, q.company_id,
    case when q.phone_e164 is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('phone', q.phone_e164)) end,
    'prospeccao', 'prospeccao',
    concat_ws(E'\n', case when q.city is not null then 'Cidade: ' || q.city || '.' end, 'Disse: "' || q.disse || '"'),
    'prospect:' || q.id
  from quentes q
  returning id, external_id
),
marca as (
  update public.prospecting_allowlist pa
  set metadata = pa.metadata || jsonb_build_object('deal_id', n.id)
  from novos n where n.external_id = 'prospect:' || pa.id
  returning pa.id, pa.agency_name, pa.phone_e164, pa.user_id, n.id as deal_id
)
update public.channel_conversations v
set deal_id = m.deal_id
from marca m, public.channel_contacts c, public.channel_connections cc
where c.id = v.contact_id and cc.id = c.connection_id
  and cc.provider = 'evolution' and cc.external_id = 'wa_' || replace(m.user_id::text, '-', '')
  and c.phone_tail = substr(regexp_replace(m.phone_e164, '^55', ''), 1, 2) || right(m.phone_e164, 8)
  and v.deal_id is null;
