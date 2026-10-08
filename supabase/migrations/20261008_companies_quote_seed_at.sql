-- Última vez que o histórico do WhatsApp foi gravado no placar
-- (quote-seed-history). O webhook usa para não rodar a cada lote do histórico.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS quote_seed_at timestamptz;
