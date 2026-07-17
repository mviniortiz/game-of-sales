-- 2026-07-17 — Conserta TODOS os webhooks de venda de uma vez.
-- As edges (hotmart, kiwify, pagarme, asaas, braip, cakto, greenn, notazz,
-- mercadopago-sales, stripe, rdstation, zapier, grupozap, clicksign) inserem
-- deals com `source` e `external_id`, mas a tabela nunca teve essas colunas:
-- o insert falhava com "column not found" no PRIMEIRO evento real. Nunca foi
-- percebido porque nenhum webhook externo real chegou até hoje.
-- Aditiva e idempotente; aplicar via `npx supabase db query --linked -f`.

alter table public.deals add column if not exists source text;
alter table public.deals add column if not exists external_id text;

-- Idempotência dos webhooks: busca por (company_id, external_id)
create index if not exists deals_company_external_idx
  on public.deals (company_id, external_id)
  where external_id is not null;
