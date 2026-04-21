-- Marca quando Google Ads Offline Conversion foi enviada pra não duplicar.
-- Usado pela edge function upload-ads-conversion (server-side conversion upload
-- via gclid, imune a adblocker/DNT/gtag timing).

alter table public.demo_requests
  add column if not exists ads_conversion_uploaded_at timestamptz,
  add column if not exists ads_conversion_error text;

create index if not exists idx_demo_requests_ads_conversion_pending
  on public.demo_requests(created_at)
  where gclid is not null and ads_conversion_uploaded_at is null;
