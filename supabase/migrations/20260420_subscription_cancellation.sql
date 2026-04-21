-- Subscription cancellation support
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Index to find recently cancelled subs (for reactivation CTAs & churn analytics)
CREATE INDEX IF NOT EXISTS idx_companies_subscription_cancelled_at
  ON public.companies(subscription_cancelled_at)
  WHERE subscription_cancelled_at IS NOT NULL;
