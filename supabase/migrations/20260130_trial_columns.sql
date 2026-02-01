-- Migration: Add trial columns to companies table
-- Purpose: Support 7-day reverse trial for new users

-- Add trial_ends_at column (nullable timestamptz)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add subscription_status column with default 'active'
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Add check constraint for valid subscription status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'companies_subscription_status_check'
    ) THEN
        ALTER TABLE public.companies
        ADD CONSTRAINT companies_subscription_status_check
        CHECK (subscription_status IN ('active', 'trialing', 'expired', 'cancelled'));
    END IF;
END $$;

-- Update existing companies to have 'active' status if null
UPDATE public.companies
SET subscription_status = 'active'
WHERE subscription_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.trial_ends_at IS 'Timestamp when the trial period ends (null for non-trial accounts)';
COMMENT ON COLUMN public.companies.subscription_status IS 'Subscription status: active, trialing, expired, or cancelled';
