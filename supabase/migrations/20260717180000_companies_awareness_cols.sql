-- 2026-07-17 — Conserta o CADASTRO para quem chega com UTM/gclid.
-- O SignupV2 espalha getAttribution() no insert de companies; a migration
-- 20260707_demo_request_awareness criou traffic_source/awareness_hypothesis/
-- query_intent em demo_requests mas ESQUECEU companies — resultado: signup
-- de lead vindo de anúncio/outreach falhava com "Could not find the
-- 'awareness_hypothesis' column of 'companies' in the schema cache".
-- Aditiva e idempotente; aplicar via `npx supabase db query --linked -f`.

alter table public.companies add column if not exists traffic_source text;
alter table public.companies add column if not exists awareness_hypothesis text;
alter table public.companies add column if not exists query_intent text;

-- Recarrega o schema cache do PostgREST imediatamente
notify pgrst, 'reload schema';
