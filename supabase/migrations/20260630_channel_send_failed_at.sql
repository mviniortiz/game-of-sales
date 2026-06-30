-- WhatsApp anti-ban (2026-06-30): substitui a sonda-fantasma do watchdog
-- (sendText pra número inválido "000000" a cada 5min — sinal clássico de ban no
-- Baileys/Evolution) por um SINAL REAL. Quando um envio DE VERDADE do usuário
-- estoura timeout (socket preso), marcamos send_failed_at; o heartbeat reinicia
-- só as instâncias com falha real recente. Zero mensagem fake → zero risco de ban.
--
-- Aditivo. service_role escreve (RLS não bloqueia service_role). Nullable.
alter table public.channel_connections
  add column if not exists send_failed_at timestamptz;

comment on column public.channel_connections.send_failed_at is
  'Última falha de envio por TIMEOUT (socket possivelmente preso). O heartbeat reinicia instâncias open com falha recente; limpo no primeiro envio bem-sucedido.';
