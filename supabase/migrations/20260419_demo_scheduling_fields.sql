-- Campos pra scheduler nativo (substitui Calendly).
-- scheduled_at: hora exata confirmada
-- google_event_id: id do evento no GCal do super_admin
-- google_meet_link: link do Meet gerado pelo GCal

alter table public.demo_requests
  add column if not exists scheduled_at timestamptz,
  add column if not exists google_event_id text,
  add column if not exists google_meet_link text;

comment on column public.demo_requests.scheduled_at is 'Horário confirmado da demo (timestamp com timezone)';
comment on column public.demo_requests.google_event_id is 'ID do evento criado no Google Calendar do super_admin';
comment on column public.demo_requests.google_meet_link is 'Link do Google Meet gerado automaticamente no evento';
