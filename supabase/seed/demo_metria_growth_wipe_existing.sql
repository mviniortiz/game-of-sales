-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.1 — Limpeza DESTRUTIVA dos dados PRÉ-EXISTENTES da company Vyzon Demo
-- (7e2e21ac-d834-448b-a61b-79ca01255702), preservando SOMENTE as linhas do
-- seed demo (marcador demo_seed='DEMO.1' / chat_phone 55119900010%).
--
-- Aprovado por Markus (2026-05-26). IRREVERSÍVEL. Transacional.
-- Deleta em ordem de FK (filhos antes dos pais). Renomeia a company no fim.
--
-- Rodar: npx supabase db query --linked -f supabase/seed/demo_metria_growth_wipe_existing.sql
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- 1. message_status_events dos channel_messages não-demo
delete from message_status_events where message_id in (
  select id from channel_messages
  where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
    and (metadata->>'demo_seed') is distinct from 'DEMO.1');

-- 2. channel_messages não-demo
delete from channel_messages
where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and (metadata->>'demo_seed') is distinct from 'DEMO.1';

-- 3. channel_conversations não-demo (libera FK deal_id e contact_id)
delete from channel_conversations
where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and (metadata->>'demo_seed') is distinct from 'DEMO.1';

-- 4. channel_contacts não-demo
delete from channel_contacts
where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and (metadata->>'demo_seed') is distinct from 'DEMO.1';

-- 5. filhos de deals (escopados aos deals NÃO-demo da company)
delete from contracts where deal_id in (
  select id from deals where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
    and (source_data->>'demo_seed') is distinct from 'DEMO.1');
delete from deal_custom_field_values where deal_id in (
  select id from deals where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
    and (source_data->>'demo_seed') is distinct from 'DEMO.1');
delete from deal_tag_assignments where deal_id in (
  select id from deals where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
    and (source_data->>'demo_seed') is distinct from 'DEMO.1');
delete from eva_deal_suggestions where deal_id in (
  select id from deals where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
    and (source_data->>'demo_seed') is distinct from 'DEMO.1');
delete from follow_up_reminders where deal_id in (
  select id from deals where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
    and (source_data->>'demo_seed') is distinct from 'DEMO.1');

-- 6. whatsapp_messages legado (toda a company; nenhuma é demo) — clears deal_id FK
delete from whatsapp_messages where company_id='7e2e21ac-d834-448b-a61b-79ca01255702';

-- 7. conversation_summaries não-demo (antes dos deals: summaries.deal_id FK)
delete from conversation_summaries
where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and chat_phone not in ('5511990001001','5511990001002','5511990001003','5511990001004','5511990001005');

-- 8. deals não-demo
delete from deals
where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and (source_data->>'demo_seed') is distinct from 'DEMO.1';

-- 9. renomeia a company pro nome da demo
update companies set name='Agência Metria Growth'
where id='7e2e21ac-d834-448b-a61b-79ca01255702';

COMMIT;
