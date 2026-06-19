-- ============================================================
-- Popula a company "Vyzon Demo" (ambiente da demo da landing) com uma equipe
-- de 10 vendedores + gestor, meta do time, metas individuais e vendas, pra as
-- telas de Metas e Ranking aparecerem realistas. IDEMPOTENTE (pode re-rodar).
-- Mês de referência = mês atual (date_trunc) → sempre válido ao aplicar.
-- Aplicar: npx -y supabase db query --linked -f demo/seed-landing-ranking.sql
-- ============================================================
create extension if not exists pgcrypto;

create or replace function __vd_seller(
  p_email text, p_nome text, p_cargo text, p_pontos int, p_nivel text, p_company uuid
) returns uuid as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is not null then
    delete from vendas where user_id = v_id;
    delete from metas where user_id = v_id;
    delete from profiles where id = v_id;
    delete from auth.identities where user_id = v_id;
    delete from auth.users where id = v_id;
  end if;
  v_id := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, crypt('DemoVyzon2026!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', p_nome),
    now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true), 'email', v_id::text, now(), now(), now());
  -- um trigger em auth.users já cria o profile; por isso ON CONFLICT (id).
  insert into profiles (id, nome, email, company_id, role, cargo, pontos, nivel, onboarding_completed)
  values (v_id, p_nome, p_email, p_company, 'vendedor', p_cargo, p_pontos, p_nivel::user_level, true)
  on conflict (id) do update set
    nome = excluded.nome, email = excluded.email, company_id = excluded.company_id,
    role = excluded.role, cargo = excluded.cargo, pontos = excluded.pontos,
    nivel = excluded.nivel, onboarding_completed = true;
  return v_id;
end;
$$ language plpgsql;

do $$
declare
  v_company uuid;
  v_mes date := date_trunc('month', current_date)::date;
begin
  select id into v_company from companies where name = 'Vyzon Demo' limit 1;
  if v_company is null then raise exception 'company "Vyzon Demo" não encontrada'; end if;

  -- idempotência: limpa metas/vendas da company demo
  delete from vendas where company_id = v_company;
  delete from metas_consolidadas where company_id = v_company and mes_referencia = v_mes;

  -- 10 vendedores (curva de performance do topo ao rodapé)
  perform __vd_seller('vd.marina@vyzon.com.br',   'Marina Costa',    'Closer Senior',     5200, 'Diamante', v_company);
  perform __vd_seller('vd.rafael@vyzon.com.br',   'Rafael Torres',   'Account Executive', 4600, 'Platina',  v_company);
  perform __vd_seller('vd.beatriz@vyzon.com.br',  'Beatriz Lima',    'Closer',            3900, 'Ouro',     v_company);
  perform __vd_seller('vd.lucas@vyzon.com.br',    'Lucas Andrade',   'Closer',            3500, 'Ouro',     v_company);
  perform __vd_seller('vd.fernanda@vyzon.com.br', 'Fernanda Rocha',  'Account Executive', 2800, 'Prata',    v_company);
  perform __vd_seller('vd.diego@vyzon.com.br',    'Diego Martins',   'SDR Sênior',        2400, 'Prata',    v_company);
  perform __vd_seller('vd.camila@vyzon.com.br',   'Camila Souza',    'Closer Jr',         2100, 'Prata',    v_company);
  perform __vd_seller('vd.thiago@vyzon.com.br',   'Thiago Mendes',   'SDR',               1300, 'Bronze',   v_company);
  perform __vd_seller('vd.juliana@vyzon.com.br',  'Juliana Alves',   'SDR',                950, 'Bronze',   v_company);
  perform __vd_seller('vd.pedro@vyzon.com.br',    'Pedro Henrique',  'SDR',                600, 'Bronze',   v_company);

  -- meta do time (quase batida no agregado: ~298k de 300k)
  insert into metas_consolidadas (company_id, mes_referencia, valor_meta, descricao)
  values (v_company, v_mes, 300000, 'Meta do mês');

  -- metas individuais (10 vendedores + o gestor/admin da demo)
  insert into metas (user_id, company_id, mes_referencia, valor_meta)
  select p.id, v_company, v_mes, x.meta
  from (values
    ('vd.marina@vyzon.com.br',35000), ('vd.rafael@vyzon.com.br',32000), ('vd.beatriz@vyzon.com.br',30000),
    ('vd.lucas@vyzon.com.br',30000), ('vd.fernanda@vyzon.com.br',30000), ('vd.diego@vyzon.com.br',28000),
    ('vd.camila@vyzon.com.br',28000), ('vd.thiago@vyzon.com.br',25000), ('vd.juliana@vyzon.com.br',25000),
    ('vd.pedro@vyzon.com.br',22000), ('landing-demo@vyzon.com.br',30000)
  ) as x(email, meta)
  join profiles p on p.email = x.email and p.company_id = v_company
  on conflict (user_id, mes_referencia) do update set valor_meta = excluded.valor_meta;

  -- vendas (status Aprovado, no mês atual) — somam o "vendido" de cada um
  insert into vendas (user_id, company_id, cliente_nome, produto_nome, valor, forma_pagamento, data_venda, status, plataforma)
  select p.id, v_company, x.cliente, x.produto, x.valor, x.forma,
         (v_mes + ((x.dia-1) || ' days')::interval)::date, 'Aprovado', 'CRM'
  from (values
    -- Marina 48k (137%)
    ('vd.marina@vyzon.com.br','Construtora Horizonte','Gestão de Tráfego Pago',18000,'Pix',3),
    ('vd.marina@vyzon.com.br','Rede Sabor & Cia','Lançamento Digital',16000,'Cartão',11),
    ('vd.marina@vyzon.com.br','Clínica Bem Estar','Social Media',14000,'Boleto',19),
    -- Rafael 41k (128%)
    ('vd.rafael@vyzon.com.br','Imobiliária Prime','Gestão de Tráfego Pago',22000,'Pix',5),
    ('vd.rafael@vyzon.com.br','Studio Fitness','Criação de Site',19000,'Cartão',14),
    -- Beatriz 36k (120%)
    ('vd.beatriz@vyzon.com.br','Auto Center Veloz','Social Media',20000,'Pix',4),
    ('vd.beatriz@vyzon.com.br','Doceria da Vó','Identidade Visual',16000,'Cartão',17),
    -- Lucas 33k (110%)
    ('vd.lucas@vyzon.com.br','Pet Shop Amigo Fiel','Gestão de Tráfego Pago',18000,'Boleto',8),
    ('vd.lucas@vyzon.com.br','Escola Saber','Produção de Conteúdo',15000,'Pix',21),
    -- Fernanda 28k (93%)
    ('vd.fernanda@vyzon.com.br','Restaurante Sabor Real','Social Media',16000,'Cartão',6),
    ('vd.fernanda@vyzon.com.br','Barbearia Navalha','Criação de Site',12000,'Pix',18),
    -- Gestor (admin) 27k (90%)
    ('landing-demo@vyzon.com.br','Construtora Cima','Consultoria de Marketing',15000,'Pix',7),
    ('landing-demo@vyzon.com.br','Loja Tech House','Gestão de Tráfego Pago',12000,'Cartão',16),
    -- Diego 24k (86%)
    ('vd.diego@vyzon.com.br','Clínica Odonto Sorriso','SEO',13000,'Boleto',9),
    ('vd.diego@vyzon.com.br','Mercado Bom Preço','Social Media',11000,'Pix',20),
    -- Camila 23k (82%)
    ('vd.camila@vyzon.com.br','Academia Power','Produção de Conteúdo',12000,'Cartão',10),
    ('vd.camila@vyzon.com.br','Floricultura Bela Flor','Identidade Visual',11000,'Pix',22),
    -- Thiago 16k (64%)
    ('vd.thiago@vyzon.com.br','Lava Rápido Cristal','Social Media',9000,'Pix',12),
    ('vd.thiago@vyzon.com.br','Sorveteria Gelato','Criação de Site',7000,'Boleto',23),
    -- Juliana 13k (52%)
    ('vd.juliana@vyzon.com.br','Pizzaria Forno a Lenha','Gestão de Tráfego Pago',13000,'Cartão',13),
    -- Pedro 9k (41%)
    ('vd.pedro@vyzon.com.br','Salão Beleza Pura','Social Media',9000,'Pix',15)
  ) as x(email, cliente, produto, valor, forma, dia)
  join profiles p on p.email = x.email and p.company_id = v_company;

  raise notice 'seed OK: % vendedores, % vendas, meta time %',
    (select count(*) from profiles where company_id = v_company),
    (select count(*) from vendas where company_id = v_company),
    (select valor_meta from metas_consolidadas where company_id = v_company and mes_referencia = v_mes);
end $$;

drop function __vd_seller(text, text, text, int, text, uuid);
