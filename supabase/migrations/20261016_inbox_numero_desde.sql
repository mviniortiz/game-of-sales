-- Troca de chip de 16/10/2026 13:03 UTC: o Inbox passa a mostrar só o número
-- novo (metadata.numero_desde, gravado pelo prospect-run nas próximas trocas).
update public.channel_connections cc
set metadata = coalesce(cc.metadata, '{}'::jsonb) || jsonb_build_object('numero_desde', to_jsonb(pi.chip_desde))
from public.prospecting_instances pi
where cc.provider = 'evolution'
  and cc.external_id = 'wa_' || replace(pi.user_id::text, '-', '')
  and pi.chip_desde is not null
  and not (cc.metadata ? 'numero_desde');
