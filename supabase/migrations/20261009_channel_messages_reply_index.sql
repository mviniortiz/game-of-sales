-- A FK reply_to_message_id (on delete set null) precisa de índice: sem ele,
-- cada linha apagada pelo purge_old_whatsapp_messages varre channel_messages
-- inteira para anular as respostas, e o cron das 4h estoura o statement timeout.
create index if not exists idx_channel_messages_reply_to
  on public.channel_messages (reply_to_message_id)
  where reply_to_message_id is not null;
