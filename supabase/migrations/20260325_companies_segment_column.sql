-- Onboarding flow: add missing columns

-- companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS segment TEXT;

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
