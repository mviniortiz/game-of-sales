-- ============================================================
-- Adiciona 3 vendedores ao demo@vyzon.com.br + distribui deals/vendas
-- ============================================================
-- Rodar DEPOIS de create-demo-user.sql:
--   npx -y supabase db query --linked -f demo/add-sellers-demo.sql
--
-- Vendedores criados (senha de todos: DemoVyzon2026!):
--   marina@vyzon.com.br — Closer Senior, top performer
--   rafael@vyzon.com.br — Account Executive, 2º lugar
--   pedro@vyzon.com.br  — SDR novo, ranking baixo
-- ============================================================

-- Função helper (dropa ao fim)
CREATE OR REPLACE FUNCTION __demo_create_seller(
  p_email text, p_nome text, p_cargo text,
  p_pontos int, p_nivel text, p_company_id uuid
) RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  IF v_id IS NOT NULL THEN
    DELETE FROM vendas WHERE user_id = v_id;
    DELETE FROM deal_activities WHERE user_id = v_id;
    DELETE FROM deals WHERE user_id = v_id;
    DELETE FROM metas WHERE user_id = v_id;
    DELETE FROM profiles WHERE id = v_id;
    DELETE FROM auth.identities WHERE user_id = v_id;
    DELETE FROM auth.users WHERE id = v_id;
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, crypt('DemoVyzon2026!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_id, jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true), 'email', v_id::text, now(), now(), now());

  INSERT INTO profiles (id, nome, email, company_id, role, cargo, pontos, nivel, onboarding_completed)
  VALUES (v_id, p_nome, p_email, p_company_id, 'seller', p_cargo, p_pontos, p_nivel::user_level, true)
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    company_id = EXCLUDED.company_id,
    role = EXCLUDED.role,
    cargo = EXCLUDED.cargo,
    pontos = EXCLUDED.pontos,
    nivel = EXCLUDED.nivel,
    onboarding_completed = true;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_admin_id uuid;
  v_company_id uuid;
  v_marina_id uuid;
  v_rafael_id uuid;
  v_pedro_id uuid;
BEGIN
  SELECT u.id, p.company_id INTO v_admin_id, v_company_id
  FROM auth.users u JOIN profiles p ON p.id = u.id
  WHERE u.email = 'demo@vyzon.com.br';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'demo@vyzon.com.br não existe. Rode create-demo-user.sql primeiro.';
  END IF;

  v_marina_id := __demo_create_seller('marina@vyzon.com.br', 'Marina Costa',  'Closer Senior',     4800, 'Ouro',   v_company_id);
  v_rafael_id := __demo_create_seller('rafael@vyzon.com.br', 'Rafael Torres', 'Account Executive', 3200, 'Prata',  v_company_id);
  v_pedro_id  := __demo_create_seller('pedro@vyzon.com.br',  'Pedro Lima',    'SDR',                850, 'Bronze', v_company_id);

  -- Redistribui deals
  UPDATE deals SET user_id = v_marina_id
  WHERE user_id = v_admin_id AND customer_name IN (
    'Tech Solutions LTDA', 'Empresa Gamma', 'Distribuidora Lima', 'Empresa XYZ',
    'TechCorp Brasil', 'Lucas Ferreira',
    'Carla Menezes', 'Loja do Zé', 'Distribuidora Sul',
    'João da Silva', 'Pedro Henrique'
  );

  UPDATE deals SET user_id = v_rafael_id
  WHERE user_id = v_admin_id AND customer_name IN (
    'Empresa ACME', 'Mariana Santos', 'Ana Costa', 'Beatriz Lima',
    'Construtora ABC', 'Empresa Beta', 'Roberto Dias',
    'Fernanda Oliveira', 'João Pereira',
    'Empresa XPTO', 'Maria Fernanda'
  );

  UPDATE deals SET user_id = v_pedro_id
  WHERE user_id = v_admin_id AND customer_name IN (
    'Amanda Souza', 'Cliente Instagram', 'Cliente Site',
    'Empresa LinkedIn', 'Contato Evento', 'Prospect Indicação', 'Novo lead orgânico'
  );

  -- Vendas e activities batem com o novo owner
  DELETE FROM vendas WHERE company_id = v_company_id;
  DELETE FROM deal_activities WHERE company_id = v_company_id AND activity_type IN ('won','lost','call_made');

  INSERT INTO vendas (user_id, company_id, cliente_nome, produto_nome, valor, forma_pagamento, data_venda, observacoes, plataforma, status)
  SELECT user_id, company_id, customer_name, title, value, 'CRM', expected_close_date,
         'Sincronizado automaticamente do CRM (deal ' || id::text || ')', 'CRM', 'Aprovado'
  FROM deals WHERE company_id = v_company_id AND stage = 'closed_won';

  INSERT INTO deal_activities (deal_id, user_id, company_id, activity_type, description, created_at)
  SELECT id, user_id, company_id,
         CASE WHEN stage = 'closed_won' THEN 'won' ELSE 'lost' END,
         CASE WHEN stage = 'closed_won' THEN 'Deal fechado' ELSE 'Deal perdido' END,
         created_at + interval '1 day'
  FROM deals WHERE company_id = v_company_id AND stage IN ('closed_won','closed_lost');

  INSERT INTO deal_activities (deal_id, user_id, company_id, activity_type, description, created_at)
  SELECT id, user_id, company_id, 'call_made',
         'Ligação feita. Cliente demonstrou interesse real.',
         created_at + interval '2 days'
  FROM deals WHERE company_id = v_company_id AND stage IN ('negotiation','proposal')
  LIMIT 8;

  -- Metas individuais
  INSERT INTO metas (user_id, company_id, mes_referencia, valor_meta)
  VALUES
    (v_marina_id, v_company_id, '2026-04-01', 50000),
    (v_rafael_id, v_company_id, '2026-04-01', 40000),
    (v_pedro_id,  v_company_id, '2026-04-01', 15000)
  ON CONFLICT (user_id, mes_referencia) DO UPDATE SET valor_meta = EXCLUDED.valor_meta;

  RAISE NOTICE '✅ 3 vendedores adicionados ao demo.';
END $$;

DROP FUNCTION __demo_create_seller(text, text, text, int, text, uuid);
