-- Adiciona campos de contato básico da empresa
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS phone text;
