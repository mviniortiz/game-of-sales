-- Migration: Add onboarding/checkout columns to companies table
-- Purpose: Support onboarding data collection and Mercado Pago subscription

-- Add team_size column
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS team_size TEXT;

-- Add referral_source column
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add main_challenge column
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS main_challenge TEXT;

-- Add Mercado Pago subscription columns
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS mp_customer_id TEXT;

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS mp_plan_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.companies.team_size IS 'Team size range selected during onboarding (e.g., 1-5, 6-15)';
COMMENT ON COLUMN public.companies.referral_source IS 'How the user found out about the product (e.g., instagram, google)';
COMMENT ON COLUMN public.companies.main_challenge IS 'Main sales challenge selected during onboarding';
COMMENT ON COLUMN public.companies.mp_subscription_id IS 'Mercado Pago subscription ID';
COMMENT ON COLUMN public.companies.mp_customer_id IS 'Mercado Pago customer/payer ID';
COMMENT ON COLUMN public.companies.mp_plan_id IS 'Mercado Pago plan ID';
