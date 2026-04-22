-- ============================================================
-- SEED DEMO VYZON — cenário "depois" para gravação do vídeo
-- ============================================================
-- Como usar:
--   1. Faça login no Vyzon e pegue seu user_id:
--        SELECT auth.uid();
--      (ou copie do painel Supabase → Authentication → Users)
--   2. Substitua '<<SEU_USER_ID>>' pelo UUID nas 2 ocorrências abaixo.
--   3. Rode:
--        npx -y supabase db query --linked -f demo/seed-vyzon-demo.sql
--      (ou cole no SQL Editor do dashboard)
--   4. Para limpar depois:
--        DELETE FROM deals WHERE notes LIKE '[DEMO]%' AND user_id='<<SEU_USER_ID>>';
--        DELETE FROM metas WHERE user_id='<<SEU_USER_ID>>' AND mes_referencia='2026-04-01';
-- ============================================================

DO $$
DECLARE
  v_user_id uuid := '<<SEU_USER_ID>>'::uuid;
  v_company_id uuid;
BEGIN
  -- Pega company_id ativa do usuário
  SELECT company_id INTO v_company_id
  FROM profiles WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % sem company_id em profiles. Complete o onboarding primeiro.', v_user_id;
  END IF;

  -- Limpa deals de demo prévios (identificados por [DEMO] no notes)
  DELETE FROM deals
  WHERE user_id = v_user_id AND notes LIKE '[DEMO]%';

  -- ===================== DEALS =====================
  INSERT INTO deals (user_id, company_id, title, customer_name, customer_email, customer_phone, value, stage, position, probability, expected_close_date, notes, created_at)
  VALUES
    -- ============ CLOSED WON (8 deals, ~R$ 113K) ============
    (v_user_id, v_company_id, 'Tech Solutions — Plano Anual', 'Tech Solutions LTDA', 'contato@techsolutions.com.br', '11 3456-7890', 15000, 'closed_won', 1, 100, '2026-04-10', '[DEMO] Contrato anual fechado, indicação via Instagram.', now() - interval '14 days'),
    (v_user_id, v_company_id, 'Empresa Gamma — Retainer', 'Empresa Gamma', 'financeiro@gamma.com.br', '(11) 2222-3333', 18500, 'closed_won', 2, 100, '2026-04-23', '[DEMO] Contrato anual, 12x R$ 1.541.', now() - interval '10 days'),
    (v_user_id, v_company_id, 'Distribuidora Lima — Pacote Pro', 'Distribuidora Lima', 'compras@distlima.com.br', '(11) 3333-4444', 22000, 'closed_won', 3, 100, '2026-04-16', '[DEMO] Parcelado em 3x sem juros.', now() - interval '7 days'),
    (v_user_id, v_company_id, 'Empresa XYZ — Licença 50 users', 'Empresa XYZ', 'ti@empresaxyz.com.br', '(11) 98888-7777', 12500, 'closed_won', 4, 100, '2026-04-14', '[DEMO] Expansão prevista em 6 meses.', now() - interval '12 days'),
    (v_user_id, v_company_id, 'Empresa ACME — Plano Starter', 'Empresa ACME', 'ana@acme.com.br', '11 97777-6666', 7800, 'closed_won', 5, 100, '2026-04-20', '[DEMO] Upsell previsto Q3.', now() - interval '5 days'),
    (v_user_id, v_company_id, 'Mariana Santos — Consultoria', 'Mariana Santos', 'mariana.s@gmail.com', '11 99988-7766', 4500, 'closed_won', 6, 100, '2026-04-12', '[DEMO] Pacote 3 meses, renovação em julho.', now() - interval '11 days'),
    (v_user_id, v_company_id, 'Ana Costa — Plano Plus', 'Ana Costa', 'ana.costa@email.com', '11 98765-4322', 2300, 'closed_won', 7, 100, '2026-04-10', '[DEMO] Lead do site, primeira venda.', now() - interval '13 days'),
    (v_user_id, v_company_id, 'Beatriz Lima — Plano Starter', 'Beatriz Lima', 'bea.lima@email.com', '11 93333-2222', 1280, 'closed_won', 8, 100, '2026-04-22', '[DEMO] Lead do site.', now() - interval '3 days'),

    -- ============ NEGOTIATION (5 deals, ~R$ 95K em pipeline quente) ============
    (v_user_id, v_company_id, 'TechCorp — Enterprise Anual', 'TechCorp Brasil', 'comercial@techcorp.com.br', '(11) 4000-1234', 45000, 'negotiation', 1, 80, '2026-04-30', '[DEMO] Reunião agendada para 24/04. Precisa aprovação da diretoria.', now() - interval '9 days'),
    (v_user_id, v_company_id, 'Lucas Ferreira — Plano Plus anual', 'Lucas Ferreira', 'lucas.f@empresa.com', '11 99111-2233', 6700, 'negotiation', 2, 75, '2026-04-30', '[DEMO] Pediu 10% desconto, enviando contraproposta.', now() - interval '6 days'),
    (v_user_id, v_company_id, 'Construtora ABC — Pacote Teams', 'Construtora ABC', 'rh@construtoraabc.com.br', '11 98888-7777', 8900, 'negotiation', 3, 70, '2026-04-25', '[DEMO] Contrato em análise jurídica.', now() - interval '8 days'),
    (v_user_id, v_company_id, 'Empresa Beta — Pro 20 users', 'Empresa Beta', 'hr@beta.com.br', '(11) 3222-1010', 30000, 'negotiation', 4, 60, '2026-05-05', '[DEMO] Disputa com concorrente, diferencial é integração WhatsApp.', now() - interval '4 days'),
    (v_user_id, v_company_id, 'Roberto Dias — Plano Plus', 'Roberto Dias', 'roberto.dias@email.com', '11 95555-4444', 3400, 'negotiation', 5, 65, '2026-04-28', '[DEMO] Aguardando aprovação interna do orçamento.', now() - interval '6 days'),

    -- ============ PROPOSAL (5 deals) ============
    (v_user_id, v_company_id, 'Carla Menezes — Plano Plus', 'Carla Menezes', 'carla.m@email.com', '11 97777-6666', 1200, 'proposal', 1, 50, '2026-04-28', '[DEMO] Enviada proposta, decide semana que vem.', now() - interval '6 days'),
    (v_user_id, v_company_id, 'Loja do Zé — Pacote Starter', 'Loja do Zé', 'contato@lojadoze.com.br', '11 96666-5544', 1500, 'proposal', 2, 55, '2026-05-02', '[DEMO] Primeira loja da rede, se aprovar replicam em 12 unidades.', now() - interval '5 days'),
    (v_user_id, v_company_id, 'Distribuidora Sul — Pro', 'Distribuidora Sul', 'ti@distsul.com.br', '51 3333-4444', 12000, 'proposal', 3, 45, '2026-05-10', '[DEMO] Demo feita, aguardando retorno.', now() - interval '3 days'),
    (v_user_id, v_company_id, 'Fernanda Oliveira — Starter', 'Fernanda Oliveira', 'fer.oliveira@gmail.com', '11 94444-3322', 890, 'proposal', 4, 60, '2026-04-29', '[DEMO] Lead do Instagram, perfil ideal.', now() - interval '4 days'),
    (v_user_id, v_company_id, 'João Pereira — Plano Plus', 'João Pereira', 'joao.pereira@email.com', '11 92222-1100', 2100, 'proposal', 5, 50, '2026-05-03', '[DEMO] Indicação cliente Gamma.', now() - interval '2 days'),

    -- ============ QUALIFICATION (4 deals) ============
    (v_user_id, v_company_id, 'João da Silva — a qualificar', 'João da Silva', 'joao.silva@email.com', '11 98765-4321', 1500, 'qualification', 1, 30, '2026-05-08', '[DEMO] Veio por indicação, primeira call agendada.', now() - interval '1 days'),
    (v_user_id, v_company_id, 'Amanda Souza — Starter', 'Amanda Souza', 'amanda.souza@email.com', '11 94444-3333', 980, 'qualification', 2, 35, '2026-05-05', '[DEMO] Marcou diagnóstico para quarta.', now() - interval '2 days'),
    (v_user_id, v_company_id, 'Lead Instagram — investigar', 'Cliente Instagram', 'aguardando@exemplo.com', '', 0, 'qualification', 3, 15, NULL, '[DEMO] Mandou mensagem no Insta, descobrir fit.', now() - interval '1 days'),
    (v_user_id, v_company_id, 'Cliente novo via site', 'Cliente Site', 'novoteste@exemplo.com', '', 0, 'qualification', 4, 20, NULL, '[DEMO] Fez cadastro no site, ainda não respondeu.', now() - interval '1 days'),

    -- ============ LEAD (4 deals frios) ============
    (v_user_id, v_company_id, 'Lead LinkedIn — Empresa X', 'Empresa LinkedIn', 'prospect@empresax.com.br', '', 0, 'lead', 1, 10, NULL, '[DEMO] Inbound via LinkedIn Ads.', now() - interval '1 days'),
    (v_user_id, v_company_id, 'Lead Evento Março', 'Contato Evento', 'evento@exemplo.com.br', '', 0, 'lead', 2, 15, NULL, '[DEMO] Cartão de visita do evento, não respondeu ainda.', now() - interval '14 days'),
    (v_user_id, v_company_id, 'Indicação Carlos', 'Prospect Indicação', 'indicacao@exemplo.com', '', 0, 'lead', 3, 20, NULL, '[DEMO] Carlos mandou o contato, ainda não falei.', now() - interval '2 days'),
    (v_user_id, v_company_id, 'Lead Google Ads', 'Novo lead orgânico', 'googleads@exemplo.com', '', 0, 'lead', 4, 10, NULL, '[DEMO] Clicou na landing ontem.', now() - interval '1 days'),

    -- ============ CLOSED LOST (3 deals) ============
    (v_user_id, v_company_id, 'Pedro Henrique — Plano Plus', 'Pedro Henrique', 'pedro.h@email.com', '11 99876-5432', 3200, 'closed_lost', 1, 0, '2026-04-12', '[DEMO] Foi para concorrente mais barato.', now() - interval '12 days'),
    (v_user_id, v_company_id, 'Empresa XPTO — Enterprise', 'Empresa XPTO', 'xpto@email.com', '11 98888-9999', 8000, 'closed_lost', 2, 0, '2026-04-15', '[DEMO] Parou de responder após proposta.', now() - interval '10 days'),
    (v_user_id, v_company_id, 'Maria F. — Starter', 'Maria Fernanda', 'maria.f@email.com', '11 97777-8888', 1800, 'closed_lost', 3, 0, '2026-04-18', '[DEMO] Sem orçamento esse ano.', now() - interval '7 days');

  -- ===================== META DE ABRIL =====================
  INSERT INTO metas (user_id, company_id, mes_referencia, valor_meta)
  VALUES (v_user_id, v_company_id, '2026-04-01', 120000)
  ON CONFLICT (user_id, mes_referencia) DO UPDATE SET valor_meta = EXCLUDED.valor_meta;

  -- ===================== DEAL ACTIVITIES =====================
  INSERT INTO deal_activities (deal_id, user_id, company_id, activity_type, description, created_at)
  SELECT id, v_user_id, v_company_id, 'stage_change',
         'Movido para ' || stage,
         created_at + interval '1 day'
  FROM deals
  WHERE user_id = v_user_id AND notes LIKE '[DEMO]%' AND stage IN ('closed_won','closed_lost');

  INSERT INTO deal_activities (deal_id, user_id, company_id, activity_type, description, created_at)
  SELECT id, v_user_id, v_company_id, 'note',
         'Ligação feita. Cliente demonstrou interesse real.',
         created_at + interval '2 days'
  FROM deals
  WHERE user_id = v_user_id AND notes LIKE '[DEMO]%' AND stage IN ('negotiation','proposal')
  LIMIT 6;

  RAISE NOTICE '✅ Seed concluído: 29 deals, meta abril R$ 120.000, activities geradas.';
  RAISE NOTICE 'user_id: %, company_id: %', v_user_id, v_company_id;
END $$;
