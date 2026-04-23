-- ═══════════════════════════════════════════════════════════════════
-- Adiciona google_sheets ao source_kind de lead_webhooks
-- ═══════════════════════════════════════════════════════════════════
-- Permite que o usuário configure um Apps Script trigger onEdit no
-- Google Sheets que manda POST pro lead-webhook a cada linha nova.

ALTER TABLE public.lead_webhooks
  DROP CONSTRAINT IF EXISTS lead_webhooks_source_kind_check;

ALTER TABLE public.lead_webhooks
  ADD CONSTRAINT lead_webhooks_source_kind_check
  CHECK (source_kind IN ('meta_lead_ads','google_lead_form','google_sheets','zapier','make','custom'));
