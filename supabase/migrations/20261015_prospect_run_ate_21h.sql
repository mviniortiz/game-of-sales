-- A resposta padrão a quem disse "pode falar" sai sozinha até as 21h (prospect-run);
-- o primeiro contato continua preso à janela de cada instância (window_start/window_end).
DO $$ BEGIN
  PERFORM cron.unschedule('prospect-run-weekdays');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('prospect-run-weekdays', '*/3 11-23 * * 1-5', $$SELECT public.trigger_prospect_run();$$);
