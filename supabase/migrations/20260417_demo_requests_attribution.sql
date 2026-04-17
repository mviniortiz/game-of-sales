-- Attribution columns on demo_requests
-- Captures UTM params, gclid, fbclid, referrer and landing page for each
-- demo lead so we can attribute paid/organic sources and enable offline
-- conversion upload to Google/Meta Ads when a demo converts.

alter table public.demo_requests
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists referrer text,
  add column if not exists landing_page text;

create index if not exists idx_demo_requests_utm_source on public.demo_requests(utm_source) where utm_source is not null;
create index if not exists idx_demo_requests_gclid on public.demo_requests(gclid) where gclid is not null;
create index if not exists idx_demo_requests_fbclid on public.demo_requests(fbclid) where fbclid is not null;
