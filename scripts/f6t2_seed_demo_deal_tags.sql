-- ─────────────────────────────────────────────────────────────────────────────
-- F6T.2 — Seed demo: assignments de tags em deals da demo Metria Growth.
--
-- OPCIONAL. Aplica APENAS a 3 deals (Mayara Sampaio, Jean Spinola, Loja FitMax)
-- pra dar prova visual de chips no Pipeline e do bloco "Tags comerciais" no
-- DealCommandCenter. Não cobre todos os deals — propositalmente.
--
-- Requer: scripts/f6t1_seed_demo_tags.sql aplicado antes (cria as tags).
-- Idempotente via ON CONFLICT DO NOTHING (constraint tag_assignments_unique).
--
-- Aplicação:
--   npx supabase db query --linked -f scripts/f6t2_seed_demo_deal_tags.sql
-- ─────────────────────────────────────────────────────────────────────────────

WITH demo AS (
  SELECT id AS company_id FROM public.companies
  WHERE id = '00000000-0000-0000-0000-000000000001'
),
deals_demo AS (
  SELECT
    id,
    customer_name,
    company_id
  FROM public.deals
  WHERE company_id = (SELECT company_id FROM demo)
),
tags_demo AS (
  SELECT id, slug, company_id
  FROM public.tags
  WHERE company_id = (SELECT company_id FROM demo)
)
INSERT INTO public.tag_assignments (company_id, tag_id, entity_type, entity_id, source, created_by)
SELECT
  d.company_id,
  t.id,
  'deal',
  d.id,
  'manual',
  NULL
FROM deals_demo d
JOIN tags_demo t ON t.company_id = d.company_id
WHERE
  -- Mayara Sampaio: lead quente + diagnóstico + proposta pendente
  (d.customer_name = 'Mayara Sampaio' AND t.slug IN ('lead-quente','diagnostico','proposta-pendente'))
  -- Jean Spinola: tráfego pago + follow-up
  OR (d.customer_name = 'Jean Spinola'  AND t.slug IN ('trafego-pago','follow-up'))
  -- Loja FitMax: objeção preço (lead com objeção de orçamento)
  OR (d.customer_name = 'Loja FitMax'   AND t.slug IN ('objecao-preco'))
ON CONFLICT (company_id, tag_id, entity_type, entity_id) DO NOTHING;
