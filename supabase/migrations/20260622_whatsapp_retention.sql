-- ─────────────────────────────────────────────────────────────────────────────
-- Retenção de histórico de WhatsApp (política do Markus, 2026-06-22):
--   MANTÉM: tudo dos últimos 90 dias + as últimas 100 mensagens de CADA conversa.
--   APAGA:  só o que é mais antigo que 90 dias E já passou das 100 mais recentes
--           daquela conversa (conversas ativas/curtas ficam 100% intactas).
--
-- Roda nas duas tabelas: channel_messages (atual, por conversation_id) e
-- whatsapp_messages (legado, por user_id+chat_jid). Job noturno via pg_cron.
-- Aditivo; idempotente (CREATE OR REPLACE + reschedule).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.purge_old_whatsapp_messages()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel integer := 0;
  v_legacy  integer := 0;
begin
  -- channel_messages — partição por conversa
  with victims as (
    select id from (
      select id,
             message_timestamp,
             row_number() over (partition by conversation_id order by message_timestamp desc) as rn
      from public.channel_messages
    ) t
    where t.message_timestamp < now() - interval '90 days' and t.rn > 100
  )
  delete from public.channel_messages cm using victims v where cm.id = v.id;
  get diagnostics v_channel = row_count;

  -- whatsapp_messages (legado) — partição por número/chat
  with victims as (
    select id from (
      select id,
             message_timestamp,
             row_number() over (partition by user_id, chat_jid order by message_timestamp desc) as rn
      from public.whatsapp_messages
    ) t
    where t.message_timestamp < now() - interval '90 days' and t.rn > 100
  )
  delete from public.whatsapp_messages wm using victims v where wm.id = v.id;
  get diagnostics v_legacy = row_count;

  return jsonb_build_object('channel_deleted', v_channel, 'legacy_deleted', v_legacy, 'ran_at', now());
end;
$$;

-- Reagenda de forma idempotente (remove o job antigo se existir, recria).
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-old-whatsapp-messages';
exception when others then
  null; -- pg_cron pode não ter job ainda
end$$;

-- 04:00 UTC (01:00 BRT) — janela de baixo tráfego.
select cron.schedule(
  'purge-old-whatsapp-messages',
  '0 4 * * *',
  $$select public.purge_old_whatsapp_messages();$$
);
