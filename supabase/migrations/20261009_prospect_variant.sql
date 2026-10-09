-- PROSPECT.2 — teste de abordagens: cada integradora recebe uma variante da
-- primeira mensagem; o painel compara a taxa de resposta por variante.
alter table public.prospecting_allowlist add column if not exists variant text;
create index if not exists prospecting_allowlist_variant_idx on public.prospecting_allowlist (user_id, variant);
