-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.1 cleanup — remove SOMENTE as linhas inseridas pelo seed
-- demo_metria_growth.sql (marcador metadata.demo_seed / source_data.demo_seed /
-- chat_phone 55119900010%). NÃO toca em nenhum outro dado da company.
--
-- Rodar: npx supabase db query --linked -f supabase/seed/demo_metria_growth_cleanup.sql
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;
delete from channel_messages where conversation_id in (
  'd0000000-0000-4000-8000-0000000c0011','d0000000-0000-4000-8000-0000000c0012',
  'd0000000-0000-4000-8000-0000000c0013','d0000000-0000-4000-8000-0000000c0014',
  'd0000000-0000-4000-8000-0000000c0015');
delete from channel_conversations where id in (
  'd0000000-0000-4000-8000-0000000c0011','d0000000-0000-4000-8000-0000000c0012',
  'd0000000-0000-4000-8000-0000000c0013','d0000000-0000-4000-8000-0000000c0014',
  'd0000000-0000-4000-8000-0000000c0015');
delete from deals where id in (
  'd0000000-0000-4000-8000-0000000d0001','d0000000-0000-4000-8000-0000000d0002',
  'd0000000-0000-4000-8000-0000000d0003');
delete from channel_contacts where id in (
  'd0000000-0000-4000-8000-0000000c0001','d0000000-0000-4000-8000-0000000c0002',
  'd0000000-0000-4000-8000-0000000c0003','d0000000-0000-4000-8000-0000000c0004',
  'd0000000-0000-4000-8000-0000000c0005');
delete from conversation_summaries where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and chat_phone in ('5511990001001','5511990001002','5511990001003','5511990001004','5511990001005');
delete from whatsapp_messages where external_id in ('demo-wa-1','demo-wa-2','demo-wa-3','demo-wa-4','demo-wa-5');
COMMIT;
