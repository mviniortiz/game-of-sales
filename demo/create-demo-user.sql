-- ============================================================
-- Cria usuário demo@vyzon.com.br + company + profile + seed 29 deals
-- ============================================================
-- Rodar: npx -y supabase db query --linked -f demo/create-demo-user.sql
-- Login: demo@vyzon.com.br  |  Senha: DemoVyzon2026!
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_email text := 'demo@vyzon.com.br';
  v_password text := 'DemoVyzon2026!';
BEGIN
  -- 1) Limpa demo anterior se existir
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NOT NULL THEN
    DELETE FROM vendas WHERE user_id = v_user_id;
    DELETE FROM deals WHERE user_id = v_user_id;
    DELETE FROM deal_activities WHERE user_id = v_user_id;
    DELETE FROM metas WHERE user_id = v_user_id;
    SELECT company_id INTO v_company_id FROM profiles WHERE id = v_user_id;
    DELETE FROM profiles WHERE id = v_user_id;
    IF v_company_id IS NOT NULL THEN
      DELETE FROM companies WHERE id = v_company_id;
    END IF;
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  -- 2) Cria auth.users
  v_user_id := gen_random_uuid();
  v_company_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Demo Vyzon"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 3) Cria identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 4) Cria company
  INSERT INTO companies (id, name, plan, team_size, referral_source, main_challenge)
  VALUES (v_company_id, 'Vyzon Demo', 'plus', '2-5', 'demonstracao', 'gravacao_video')
  ON CONFLICT (id) DO NOTHING;

  -- 5) Cria profile
  INSERT INTO profiles (id, nome, email, company_id, role, is_super_admin)
  VALUES (v_user_id, 'Demo Vyzon', v_email, v_company_id, 'admin', false)
  ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id, role = 'admin';

  -- 6) Insere deals
  INSERT INTO deals (user_id, company_id, title, customer_name, customer_email, customer_phone, value, stage, position, probability, expected_close_date, notes, created_at)
  VALUES
    -- CLOSED WON (8)
    (v_user_id, v_company_id, 'Tech Solutions — Plano Anual', 'Tech Solutions LTDA', 'contato@techsolutions.com.br', '11 3456-7890', 15000, 'closed_won', 1, 100, '2026-04-10', 'Contrato anual fechado, indicação via Instagram.', now() - interval '14 days'),
    (v_user_id, v_company_id, 'Empresa Gamma — Retainer', 'Empresa Gamma', 'financeiro@gamma.com.br', '(11) 2222-3333', 18500, 'closed_won', 2, 100, '2026-04-23', 'Contrato anual, 12x R$ 1.541.', now() - interval '10 days'),
    (v_user_id, v_company_id, 'Distribuidora Lima — Pacote Pro', 'Distribuidora Lima', 'compras@distlima.com.br', '(11) 3333-4444', 22000, 'closed_won', 3, 100, '2026-04-16', 'Parcelado em 3x sem juros.', now() - interval '7 days'),
    (v_user_id, v_company_id, 'Empresa XYZ — Licença 50 users', 'Empresa XYZ', 'ti@empresaxyz.com.br', '(11) 98888-7777', 12500, 'closed_won', 4, 100, '2026-04-14', 'Expansão prevista em 6 meses.', now() - interval '12 days'),
    (v_user_id, v_company_id, 'Empresa ACME — Plano Starter', 'Empresa ACME', 'ana@acme.com.br', '11 97777-6666', 7800, 'closed_won', 5, 100, '2026-04-20', 'Upsell previsto Q3.', now() - interval '5 days'),
    (v_user_id, v_company_id, 'Mariana Santos — Consultoria', 'Mariana Santos', 'mariana.s@gmail.com', '11 99988-7766', 4500, 'closed_won', 6, 100, '2026-04-12', 'Pacote 3 meses, renovação em julho.', now() - interval '11 days'),
    (v_user_id, v_company_id, 'Ana Costa — Plano Plus', 'Ana Costa', 'ana.costa@email.com', '11 98765-4322', 2300, 'closed_won', 7, 100, '2026-04-10', 'Lead do site, primeira venda.', now() - interval '13 days'),
    (v_user_id, v_company_id, 'Beatriz Lima — Plano Starter', 'Beatriz Lima', 'bea.lima@email.com', '11 93333-2222', 1280, 'closed_won', 8, 100, '2026-04-22', 'Lead do site.', now() - interval '3 days'),

    -- NEGOTIATION (5)
    (v_user_id, v_company_id, 'TechCorp — Enterprise Anual', 'TechCorp Brasil', 'comercial@techcorp.com.br', '(11) 4000-1234', 45000, 'negotiation', 1, 80, '2026-04-30', 'Reunião agendada para 24/04. Precisa aprovação da diretoria.', now() - interval '9 days'),
    (v_user_id, v_company_id, 'Lucas Ferreira — Plano Plus anual', 'Lucas Ferreira', 'lucas.f@empresa.com', '11 99111-2233', 6700, 'negotiation', 2, 75, '2026-04-30', 'Pediu 10% desconto, enviando contraproposta.', now() - interval '6 days'),
    (v_user_id, v_company_id, 'Construtora ABC — Pacote Teams', 'Construtora ABC', 'rh@construtoraabc.com.br', '11 98888-7777', 8900, 'negotiation', 3, 70, '2026-04-25', 'Contrato em análise jurídica.', now() - interval '8 days'),
    (v_user_id, v_company_id, 'Empresa Beta — Pro 20 users', 'Empresa Beta', 'hr@beta.com.br', '(11) 3222-1010', 30000, 'negotiation', 4, 60, '2026-05-05', 'Disputa com concorrente, diferencial é integração WhatsApp.', now() - interval '4 days'),
    (v_user_id, v_company_id, 'Roberto Dias — Plano Plus', 'Roberto Dias', 'roberto.dias@email.com', '11 95555-4444', 3400, 'negotiation', 5, 65, '2026-04-28', 'Aguardando aprovação interna do orçamento.', now() - interval '6 days'),

    -- PROPOSAL (5)
    (v_user_id, v_company_id, 'Carla Menezes — Plano Plus', 'Carla Menezes', 'carla.m@email.com', '11 97777-6666', 1200, 'proposal', 1, 50, '2026-04-28', 'Enviada proposta, decide semana que vem.', now() - interval '6 days'),
    (v_user_id, v_company_id, 'Loja do Zé — Pacote Starter', 'Loja do Zé', 'contato@lojadoze.com.br', '11 96666-5544', 1500, 'proposal', 2, 55, '2026-05-02', 'Primeira loja da rede, se aprovar replicam em 12 unidades.', now() - interval '5 days'),
    (v_user_id, v_company_id, 'Distribuidora Sul — Pro', 'Distribuidora Sul', 'ti@distsul.com.br', '51 3333-4444', 12000, 'proposal', 3, 45, '2026-05-10', 'Demo feita, aguardando retorno.', now() - interval '3 days'),
    (v_user_id, v_company_id, 'Fernanda Oliveira — Starter', 'Fernanda Oliveira', 'fer.oliveira@gmail.com', '11 94444-3322', 890, 'proposal', 4, 60, '2026-04-29', 'Lead do Instagram, perfil ideal.', now() - interval '4 days'),
    (v_user_id, v_company_id, 'João Pereira — Plano Plus', 'João Pereira', 'joao.pereira@email.com', '11 92222-1100', 2100, 'proposal', 5, 50, '2026-05-03', 'Indicação cliente Gamma.', now() - interval '2 days'),

    -- QUALIFICATION (4)
    (v_user_id, v_company_id, 'João da Silva — a qualificar', 'João da Silva', 'joao.silva@email.com', '11 98765-4321', 1500, 'qualification', 1, 30, '2026-05-08', 'Veio por indicação, primeira call agendada.', now() - interval '1 days'),
    (v_user_id, v_company_id, 'Amanda Souza — Starter', 'Amanda Souza', 'amanda.souza@email.com', '11 94444-3333', 980, 'qualification', 2, 35, '2026-05-05', 'Marcou diagnóstico para quarta.', now() - interval '2 days'),
    (v_user_id, v_company_id, 'Lead Instagram — investigar', 'Cliente Instagram', 'instagram@exemplo.com', '', 0, 'qualification', 3, 15, NULL, 'Mandou mensagem no Insta, descobrir fit.', now() - interval '1 days'),
    (v_user_id, v_company_id, 'Cliente novo via site', 'Cliente Site', 'novoteste@exemplo.com', '', 0, 'qualification', 4, 20, NULL, 'Fez cadastro no site, ainda não respondeu.', now() - interval '1 days'),

    -- LEAD (4)
    (v_user_id, v_company_id, 'Lead LinkedIn — Empresa X', 'Empresa LinkedIn', 'prospect@empresax.com.br', '', 0, 'lead', 1, 10, NULL, 'Inbound via LinkedIn Ads.', now() - interval '1 days'),
    (v_user_id, v_company_id, 'Lead Evento Março', 'Contato Evento', 'evento@exemplo.com.br', '', 0, 'lead', 2, 15, NULL, 'Cartão de visita do evento, não respondeu ainda.', now() - interval '14 days'),
    (v_user_id, v_company_id, 'Indicação Carlos', 'Prospect Indicação', 'indicacao@exemplo.com', '', 0, 'lead', 3, 20, NULL, 'Carlos mandou o contato, ainda não falei.', now() - interval '2 days'),
    (v_user_id, v_company_id, 'Lead Google Ads', 'Novo lead orgânico', 'googleads@exemplo.com', '', 0, 'lead', 4, 10, NULL, 'Clicou na landing ontem.', now() - interval '1 days'),

    -- CLOSED LOST (3)
    (v_user_id, v_company_id, 'Pedro Henrique — Plano Plus', 'Pedro Henrique', 'pedro.h@email.com', '11 99876-5432', 3200, 'closed_lost', 1, 0, '2026-04-12', 'Foi para concorrente mais barato.', now() - interval '12 days'),
    (v_user_id, v_company_id, 'Empresa XPTO — Enterprise', 'Empresa XPTO', 'xpto@email.com', '11 98888-9999', 8000, 'closed_lost', 2, 0, '2026-04-15', 'Parou de responder após proposta.', now() - interval '10 days'),
    (v_user_id, v_company_id, 'Maria F. — Starter', 'Maria Fernanda', 'maria.f@email.com', '11 97777-8888', 1800, 'closed_lost', 3, 0, '2026-04-18', 'Sem orçamento esse ano.', now() - interval '7 days');

  -- 7) Meta de abril
  INSERT INTO metas (user_id, company_id, mes_referencia, valor_meta)
  VALUES (v_user_id, v_company_id, '2026-04-01', 120000);

  -- 7.1) Sincroniza vendas a partir dos deals ganhos (alimenta dashboard Faturamento)
  INSERT INTO vendas (user_id, company_id, cliente_nome, produto_nome, valor, forma_pagamento, data_venda, observacoes, plataforma, status)
  SELECT
    v_user_id, v_company_id,
    customer_name,
    title,
    value,
    'CRM',
    expected_close_date,
    'Sincronizado automaticamente do CRM (deal ' || id::text || ')',
    'CRM',
    'Aprovado'
  FROM deals
  WHERE user_id = v_user_id AND stage = 'closed_won';

  -- 8) Deal activities
  INSERT INTO deal_activities (deal_id, user_id, company_id, activity_type, description, created_at)
  SELECT id, v_user_id, v_company_id,
         CASE WHEN stage = 'closed_won' THEN 'won' ELSE 'lost' END,
         CASE WHEN stage = 'closed_won' THEN 'Deal fechado' ELSE 'Deal perdido' END,
         created_at + interval '1 day'
  FROM deals
  WHERE user_id = v_user_id AND stage IN ('closed_won','closed_lost');

  INSERT INTO deal_activities (deal_id, user_id, company_id, activity_type, description, created_at)
  SELECT id, v_user_id, v_company_id, 'call_made',
         'Ligação feita. Cliente demonstrou interesse real.',
         created_at + interval '2 days'
  FROM deals
  WHERE user_id = v_user_id AND stage IN ('negotiation','proposal')
  LIMIT 6;

  RAISE NOTICE '✅ Demo criado!';
  RAISE NOTICE '   Email: %', v_email;
  RAISE NOTICE '   Senha: %', v_password;
  RAISE NOTICE '   user_id: %', v_user_id;
  RAISE NOTICE '   company_id: %', v_company_id;
END $$;
