-- Chat da EVA na landing (visitante anônimo, edge eva-landing-chat).
-- Tabela de log + rate-limit por IP. Acesso SÓ via service_role (a edge);
-- anon/authenticated não recebem GRANT — RLS ligado sem policies nega o resto.
create table if not exists public.landing_chat_logs (
    id uuid primary key default gen_random_uuid(),
    ip text not null,
    question text not null,
    answer text,
    created_at timestamptz not null default now()
);

-- GRANT antes do RLS (padrão do projeto). Só service_role.
grant all on table public.landing_chat_logs to service_role;

alter table public.landing_chat_logs enable row level security;

-- Rate-limit: consulta por (ip, hora)
create index if not exists landing_chat_logs_ip_created_at_idx
    on public.landing_chat_logs (ip, created_at desc);
