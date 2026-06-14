-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.MSI.PROP (2026-06-12) — Propostas de exemplo para a demo MSI
-- Rodar APÓS demo_msi_comercio.sql e a migration 20260612_proposals.sql.
-- IDEMPOTENTE: IDs fixos (d2b).
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702';
  v_owner   uuid;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Sem profile na company %', v_company; END IF;

  DELETE FROM public.proposals WHERE id IN (
    'd2b00000-0000-4000-8000-000000000001','d2b00000-0000-4000-8000-000000000002');

  INSERT INTO public.proposals
    (id, company_id, deal_id, title, customer_name, customer_phone, items, discount_percent, validity_days, conditions, total, status, created_by, created_at) VALUES
    -- Hallyu Import — proposta ACEITA (o pedido que fechou)
    ('d2b00000-0000-4000-8000-000000000001', v_company, 'd2000000-0000-4000-8000-000000010090',
     'Proposta - Hallyu Import', 'Hallyu Import', '+5511993001005',
     '[{"nome":"Caixa Utilidades Domésticas","descricao":"Mix de maior giro","quantidade":1,"preco_unitario":999,"desconto_percentual":0},
       {"nome":"Caixa Presentes e Acessórios","descricao":"Sortido","quantidade":1,"preco_unitario":870,"desconto_percentual":0},
       {"nome":"Caixa Linha Cozinha","descricao":"Com desconto de fechamento","quantidade":1,"preco_unitario":780,"desconto_percentual":10}]'::jsonb,
     3, 15, E'Pagamento: 50% à vista e 50% em 30 dias\nEntrega em até 3 dias úteis\nDesconto de fechamento aplicado',
     2569, 'aceita', v_owner, now()-interval '6 days'),

    -- Rede Farmais — proposta ENVIADA (trimestral, aguardando)
    ('d2b00000-0000-4000-8000-000000000002', v_company, 'd2000000-0000-4000-8000-000000010081',
     'Proposta Trimestral - Rede Farmais', 'Rede Farmais', '+5511993001001',
     '[{"nome":"Genéricos - lote trimestral","descricao":"Mix de genéricos (70% do pedido)","quantidade":1,"preco_unitario":67368,"desconto_percentual":0},
       {"nome":"Similares - lote trimestral","quantidade":1,"preco_unitario":19248,"desconto_percentual":0},
       {"nome":"Perfumaria e higiene","quantidade":1,"preco_unitario":9624,"desconto_percentual":0}]'::jsonb,
     0, 30, E'Pagamento em 30/60/90\nPreço travado por 90 dias\nEntrega única para as 4 unidades',
     96240, 'enviada', v_owner, now()-interval '47 days');

  RAISE NOTICE 'DEMO.MSI.PROP aplicada: 2 propostas.';
END
$do$;
