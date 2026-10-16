-- Aquecimento de chip na prospecção: o prospect-run compara o número conectado
-- com numero_chip; quando muda, grava chip_desde e o teto diário sobe aos poucos
-- (tetoDoChip). pausa_ate e falhas_envio param o dia depois de falhas em série.
alter table public.prospecting_instances
  add column if not exists numero_chip text,
  add column if not exists chip_desde timestamptz,
  add column if not exists pausa_ate timestamptz,
  add column if not exists falhas_envio jsonb not null default '{}'::jsonb;

-- O número que já está conectado não é chip novo.
update public.prospecting_instances pi
set numero_chip = cc.metadata->>'owner_jid'
from public.channel_connections cc
where cc.provider = 'evolution'
  and cc.external_id = 'wa_' || replace(pi.user_id::text, '-', '')
  and pi.numero_chip is null;
