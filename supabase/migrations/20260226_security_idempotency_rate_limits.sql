-- Security primitives: persistent webhook idempotency + DB-backed rate limiting

-- -----------------------------------------------------------------------------
-- Webhook idempotency receipts
-- -----------------------------------------------------------------------------
create table if not exists public.webhook_event_receipts (
  provider text not null,
  event_key text not null,
  status text not null default 'processing',
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (provider, event_key),
  constraint webhook_event_receipts_status_check check (
    status in ('processing', 'processed', 'failed', 'ignored')
  )
);

create index if not exists idx_webhook_event_receipts_provider_received_at
  on public.webhook_event_receipts(provider, received_at desc);

alter table public.webhook_event_receipts enable row level security;

create or replace function public.claim_webhook_event(
  p_provider text,
  p_event_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_inserted integer := 0;
begin
  if p_provider is null or btrim(p_provider) = '' or p_event_key is null or btrim(p_event_key) = '' then
    return false;
  end if;

  insert into public.webhook_event_receipts (provider, event_key, metadata, status)
  values (p_provider, p_event_key, coalesce(p_metadata, '{}'::jsonb), 'processing')
  on conflict (provider, event_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

create or replace function public.mark_webhook_event_status(
  p_provider text,
  p_event_key text,
  p_status text,
  p_metadata_patch jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  update public.webhook_event_receipts
  set
    status = coalesce(nullif(p_status, ''), status),
    processed_at = case
      when coalesce(nullif(p_status, ''), status) in ('processed', 'ignored', 'failed') then now()
      else processed_at
    end,
    metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata_patch, '{}'::jsonb),
    updated_at = now()
  where provider = p_provider
    and event_key = p_event_key;
end;
$$;

-- -----------------------------------------------------------------------------
-- DB-backed rate limiting counters (fixed window)
-- -----------------------------------------------------------------------------
create table if not exists public.api_rate_limit_counters (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bucket, window_start),
  constraint api_rate_limit_counters_count_check check (count >= 0)
);

create index if not exists idx_api_rate_limit_counters_updated_at
  on public.api_rate_limit_counters(updated_at desc);

alter table public.api_rate_limit_counters enable row level security;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_bucket is null or btrim(p_bucket) = '' then
    raise exception 'p_bucket is required';
  end if;
  if p_limit is null or p_limit <= 0 then
    raise exception 'p_limit must be > 0';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'p_window_seconds must be > 0';
  end if;

  v_window_start :=
    to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limit_counters (bucket, window_start, count, created_at, updated_at)
  values (p_bucket, v_window_start, 1, v_now, v_now)
  on conflict (bucket, window_start)
  do update set
    count = public.api_rate_limit_counters.count + 1,
    updated_at = v_now
  returning public.api_rate_limit_counters.count into v_count;

  return query
  select
    (v_count <= p_limit) as allowed,
    v_count as current_count,
    greatest(p_limit - v_count, 0) as remaining,
    (v_window_start + make_interval(secs => p_window_seconds)) as reset_at;
end;
$$;

create or replace function public.cleanup_security_counters(
  p_rate_limit_older_than interval default interval '7 days',
  p_webhook_receipts_older_than interval default interval '90 days'
)
returns jsonb
language plpgsql
as $$
declare
  v_rate_deleted integer := 0;
  v_webhook_deleted integer := 0;
begin
  delete from public.api_rate_limit_counters
  where updated_at < now() - p_rate_limit_older_than;
  get diagnostics v_rate_deleted = row_count;

  delete from public.webhook_event_receipts
  where updated_at < now() - p_webhook_receipts_older_than;
  get diagnostics v_webhook_deleted = row_count;

  return jsonb_build_object(
    'rate_limit_deleted', v_rate_deleted,
    'webhook_receipts_deleted', v_webhook_deleted
  );
end;
$$;

grant all on public.webhook_event_receipts to service_role;
grant all on public.api_rate_limit_counters to service_role;
grant execute on function public.claim_webhook_event(text, text, jsonb) to service_role;
grant execute on function public.mark_webhook_event_status(text, text, text, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.cleanup_security_counters(interval, interval) to service_role;
