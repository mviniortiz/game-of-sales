-- Um grupo de WhatsApp só do dono por assunto (prospecção, leads do anúncio, EVA).
-- Sem grupo, o aviso continua indo para o chat dele com ele mesmo.
create table if not exists public.owner_notify_groups (
  instance_name text not null,
  topic text not null check (topic in ('prospeccao', 'leads', 'eva')),
  jid text not null,
  created_at timestamptz not null default now(),
  primary key (instance_name, topic)
);
grant select, insert, update, delete on public.owner_notify_groups to service_role;
alter table public.owner_notify_groups enable row level security;

insert into public.owner_notify_groups (instance_name, topic, jid)
select 'wa_' || replace(user_id::text, '-', ''), 'prospeccao', notify_jid
from public.prospecting_instances where notify_jid is not null
on conflict do nothing;

-- O vínculo aviso→código vale para os três assuntos.
alter table if exists public.prospect_notices rename to owner_notices;
