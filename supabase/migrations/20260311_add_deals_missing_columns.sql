-- Add missing columns to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_hot boolean DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS loss_reason text;
