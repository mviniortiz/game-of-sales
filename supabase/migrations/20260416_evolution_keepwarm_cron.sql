-- Keep-warm cron: mantém a edge function evolution-whatsapp com isolate Deno quente.
-- Sem isso, a edge sofre cold start de ~500-1000ms quando fica ociosa.
-- Ping a cada 4min cobre o timeout típico de ~5min de ociosidade do Deno Deploy.
--
-- ⚠️ ATENÇÃO: esta migration foi superada pela 20260424_evolution_keepwarm_vault.sql
-- que lê o anon_key do Vault em vez de hardcode (fix C-04 do security audit 2026-04-24).
-- Mantida vazia pra preservar ordem de migrations. Não aplica nada.
--
-- Git history desta migration ANTES do fix continha o JWT anon_key em plaintext.
-- O anon_key é público (aparece no bundle SPA) mas commitá-lo em migration é
-- hygiene ruim (scanners de bot trigueram alerta de leak).
--
-- Se tu precisar recuperar a funcionalidade keepwarm, roda:
--   supabase db query --linked -f supabase/migrations/20260424_evolution_keepwarm_vault.sql

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- No-op: unschedule caso o job antigo ainda esteja rodando (v2 recria com mesmo nome)
DO $$
BEGIN
  PERFORM cron.unschedule('evolution-whatsapp-keepwarm');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
