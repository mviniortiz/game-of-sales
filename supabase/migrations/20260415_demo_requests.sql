-- Demo scheduling requests from landing page
create table if not exists public.demo_requests (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    company text,
    phone text,
    source text default 'landing_page',
    status text default 'pending' check (status in ('pending', 'scheduled', 'completed', 'cancelled')),
    calendly_event_uri text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for querying by status and date
create index if not exists idx_demo_requests_status on public.demo_requests(status);
create index if not exists idx_demo_requests_email on public.demo_requests(email);

-- RLS: allow anonymous inserts (landing page visitors), restrict reads to authenticated admins
alter table public.demo_requests enable row level security;

-- Anyone can submit a demo request (public form)
create policy "Anyone can insert demo requests"
    on public.demo_requests for insert
    to anon, authenticated
    with check (true);

-- Only authenticated users can view demo requests
create policy "Authenticated users can view demo requests"
    on public.demo_requests for select
    to authenticated
    using (true);

-- Only authenticated users can update demo requests
create policy "Authenticated users can update demo requests"
    on public.demo_requests for update
    to authenticated
    using (true)
    with check (true);

-- Auto-update updated_at
create or replace function public.update_demo_requests_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_demo_requests_updated_at
    before update on public.demo_requests
    for each row
    execute function public.update_demo_requests_updated_at();
