-- Keep-warm cron: mantém a edge function evolution-whatsapp com isolate Deno quente.
-- Sem isso, a edge sofre cold start de ~500-1000ms quando fica ociosa.
-- Ping a cada 4min cobre o timeout típico de ~5min de ociosidade do Deno Deploy.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job antigo se existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('evolution-whatsapp-keepwarm');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- A cada 4min, POST ?ping=1 na edge. A função curto-circuita antes de auth/DB
-- quando detecta ?ping=1 e retorna em <50ms, mantendo o isolate quente.
-- A anon key no header é necessária só pra passar pelo gateway do Supabase
-- (a edge faz validação real de user no handler principal).
SELECT cron.schedule(
  'evolution-whatsapp-keepwarm',
  '*/4 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/evolution-whatsapp?ping=1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tc2RranprcGhmbHB3bmJhZXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTQ1MDAsImV4cCI6MjA3OTc5MDUwMH0.8M9FPjljtS10tF5EVAZRHXIVczK4qiWhPvrOMp0PavA'
    ),
    body := '{}'::jsonb
  );
  $cmd$
);
