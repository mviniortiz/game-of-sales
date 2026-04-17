-- Signup attribution columns on companies
-- Captures UTM params, gclid, fbclid, referrer and landing page at signup
-- so we can attribute paid/organic sources to signups and enable offline
-- conversion upload to Google/Meta Ads when a signup converts to paid.

alter table public.companies
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists referrer text,
  add column if not exists landing_page text;

create index if not exists idx_companies_utm_source on public.companies(utm_source) where utm_source is not null;
create index if not exists idx_companies_gclid on public.companies(gclid) where gclid is not null;
create index if not exists idx_companies_fbclid on public.companies(fbclid) where fbclid is not null;
