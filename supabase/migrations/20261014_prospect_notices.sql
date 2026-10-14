-- Qual aviso do grupo de prospecção corresponde a qual código. O dono responde
-- citando o aviso ou reage 👍/👎 nele, e o webhook acha o código por aqui.
create table if not exists public.prospect_notices (
  notice_id text primary key,
  user_id uuid not null,
  code text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.prospect_notices to service_role;
alter table public.prospect_notices enable row level security;
