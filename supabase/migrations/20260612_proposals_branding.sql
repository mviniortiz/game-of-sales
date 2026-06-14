-- ─────────────────────────────────────────────────────────────────────────────
-- PROP.1b (2026-06-12) — Personalização da proposta (logo da empresa, cor da
-- marca, textos e seções liga/desliga reordenáveis). Nível 1 do editor.
--
-- A logo vem de companies.logo_url (já uploadável em Config → Organização).
-- Rodar: npx supabase db query --linked -f supabase/migrations/20260612_proposals_branding.sql
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS intro       TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS about       TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#1556C0';
-- sections: [{ "key": "capa|intro|itens|condicoes|sobre|assinatura", "enabled": bool }]
-- NULL = usa a ordem/visibilidade padrão do app.
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS sections    JSONB;

DO $$ BEGIN RAISE NOTICE 'PROP.1b aplicada (branding da proposta).'; END $$;
