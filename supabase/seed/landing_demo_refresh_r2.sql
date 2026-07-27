-- landing_demo_refresh_r2 — correção do r1 (2026-07-28).
-- O shift de +40d do r1 jogou as conversas 1 dia no FUTURO ("parada há -19h")
-- e deixou as mensagens mais novas que a análise cacheada da EVA (badge
-- "Desatualizada" + banner de reanálise na demo). Este r2:
--   1) recua conversas/mensagens 1 dia (ficam em "hoje de manhã", no passado);
--   2) rejuvenesce conversation_summaries.analyzed_at pra depois das mensagens.
-- Aplicar com: npx supabase db query --linked -f supabase/seed/landing_demo_refresh_r2.sql

begin;

update public.channel_conversations
set created_at = created_at - interval '1 day',
    updated_at = updated_at - interval '1 day',
    last_message_at = last_message_at - interval '1 day',
    last_inbound_at = last_inbound_at - interval '1 day',
    last_outbound_at = last_outbound_at - interval '1 day'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

update public.channel_messages
set created_at = created_at - interval '1 day',
    updated_at = updated_at - interval '1 day',
    message_timestamp = message_timestamp - interval '1 day'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

-- análise da EVA mais nova que a última mensagem → badge "Atualizada",
-- sem banner de reanálise no palco da demo
update public.conversation_summaries
set analyzed_at = now() - interval '25 minutes',
    updated_at = now() - interval '25 minutes'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

commit;
