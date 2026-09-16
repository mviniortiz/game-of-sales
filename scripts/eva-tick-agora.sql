-- Roda o tick da EVA na hora, sem esperar as 9h do cron.
-- Escolhe os cards parados de cada empresa com WhatsApp ativo e chama o loop.
-- O argumento é o teto de cards por empresa nesta rodada.
--
--   npx supabase db query --linked -f scripts/eva-tick-agora.sql
--
-- Depois, para ver o que aconteceu:
--   select status, steps_used, result from agent_runs order by started_at desc limit 5;
--   select approval_code, status, notified_at, notify_error from agent_suggestions order by created_at desc limit 5;

select public.trigger_eva_agent_tick(1) as cards_disparados;
