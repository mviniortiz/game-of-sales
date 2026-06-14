-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.MSI (2026-06-12) — Seed de apresentação: MSI Comércio (distribuidora B2B)
--
-- Recria o pipeline REAL do cliente MSI Comércio (msicomercio.com.br) como um
-- FUNIL próprio dentro da company demo, usando a feature de múltiplos pipelines
-- (PIPE.1). 11 colunas do print real, com a narrativa de venda:
--   - "Follow Up" com ~R$485k parado e esfriando há +2 meses  (o herói)
--   - "Negociação" VAZIA (o gargalo: nada flui do Follow Up pro fechamento)
--   - "Clientes Inativos" e "Não Qualificados" marcados is_active=false
--     (demonstram o filtro Ativo/Inativo)
--
-- COMO RODAR (na company demo, default abaixo):
--   npx supabase db query --linked -f supabase/seed/demo_msi_comercio.sql
-- PARA UMA CONTA MSI REAL: crie a conta via signup, pegue o company_id e troque
--   o valor de v_company abaixo.
--
-- IDEMPOTENTE: IDs fixos (prefixo d2) + marcador source_data.demo_seed='DEMO.MSI'.
-- Rodar de novo apaga só as próprias linhas e reinsere. Transacional (DO block).
-- O owner (user_id) é derivado do 1º profile da company.
-- Valores do Follow Up são ilustrativos do volume real (63 deals / R$485k no print).
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702'; -- Agência Metria Growth (demo)
  v_owner   uuid;
  v_pipe    uuid := 'd2000000-0000-4000-8000-00000000a001';
  -- estágios (11)
  s_lead    uuid := 'd2000000-0000-4000-8000-000000005001';
  s_inativ  uuid := 'd2000000-0000-4000-8000-000000005002';
  s_tent    uuid := 'd2000000-0000-4000-8000-000000005003';
  s_contato uuid := 'd2000000-0000-4000-8000-000000005004';
  s_qualif  uuid := 'd2000000-0000-4000-8000-000000005005';
  s_standby uuid := 'd2000000-0000-4000-8000-000000005006';
  s_naoqual uuid := 'd2000000-0000-4000-8000-000000005007';
  s_prop    uuid := 'd2000000-0000-4000-8000-000000005008';
  s_follow  uuid := 'd2000000-0000-4000-8000-000000005009';
  s_negoc   uuid := 'd2000000-0000-4000-8000-00000000500a';
  s_fech    uuid := 'd2000000-0000-4000-8000-00000000500b';
BEGIN
  SELECT id INTO v_owner FROM public.profiles
   WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Nenhum profile na company %. Crie a conta antes de rodar o seed.', v_company;
  END IF;

  -- ── Limpeza idempotente ────────────────────────────────────────────────────
  DELETE FROM public.deals          WHERE pipeline_id = v_pipe;
  DELETE FROM public.pipeline_stages WHERE pipeline_id = v_pipe;
  DELETE FROM public.pipelines      WHERE id = v_pipe;

  -- ── Funil ───────────────────────────────────────────────────────────────────
  INSERT INTO public.pipelines (id, company_id, name, position, is_default, is_archived, created_by)
  VALUES (v_pipe, v_company, 'MSI Comércio · Distribuição B2B', 1, false, false, v_owner);

  -- ── Estágios (11, na ordem do print) ───────────────────────────────────────
  INSERT INTO public.pipeline_stages
    (id, pipeline_id, company_id, title, kind, icon_id, color_id, position, default_probability, legacy_key) VALUES
    (s_lead,    v_pipe, v_company, 'Lead',                 'open', 'target',   'gray',    0, 10,  'lead'),
    (s_inativ,  v_pipe, v_company, 'Clientes Inativos',    'open', 'users',    'rose',    1, 10,  'lead'),
    (s_tent,    v_pipe, v_company, 'Tentativa de Contato', 'open', 'users',    'amber',   2, 15,  'lead'),
    (s_contato, v_pipe, v_company, 'Contato Feito',        'open', 'check',    'blue',    3, 25,  'qualification'),
    (s_qualif,  v_pipe, v_company, 'Qualificação',         'open', 'star',     'indigo',  4, 35,  'qualification'),
    (s_standby, v_pipe, v_company, 'Stand By',             'open', 'alert',    'cyan',    5, 30,  'qualification'),
    (s_naoqual, v_pipe, v_company, 'Não Qualificados',     'lost', 'x',        'gray',    6, 0,   'closed_lost'),
    (s_prop,    v_pipe, v_company, 'Proposta enviada',     'open', 'dollar',   'purple',  7, 55,  'proposal'),
    (s_follow,  v_pipe, v_company, 'Follow Up',            'open', 'trending', 'amber',   8, 70,  'negotiation'),
    (s_negoc,   v_pipe, v_company, 'Negociação',           'open', 'dollar',   'blue',    9, 85,  'negotiation'),
    (s_fech,    v_pipe, v_company, 'Fechamento',           'won',  'check',    'emerald', 10, 100, 'closed_won');

  -- ── Deals (nomes reais do print; Negociação fica vazia de propósito) ────────
  -- helper de metadados
  -- stage = valor legado (dual-write); is_active=false em Inativos/Não Qualificados.
  INSERT INTO public.deals
    (id, company_id, user_id, pipeline_id, stage_id, stage, is_active, title, customer_name,
     value, is_hot, lead_source, probability, source_data, created_at, updated_at) VALUES

  -- Lead (frios, volume)
  ('d2000000-0000-4000-8000-000000010001', v_company, v_owner, v_pipe, s_lead, 'lead', true, 'Guerreiro Prime LTDA', 'Guerreiro Prime LTDA', 0, true, 'inbound', 10, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '2 days', now()-interval '6 hours'),
  ('d2000000-0000-4000-8000-000000010002', v_company, v_owner, v_pipe, s_lead, 'lead', true, 'Empório e Distribuidora Sagrada Natureza', 'Sagrada Natureza', 0, false, 'inbound', 10, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '2 days', now()-interval '8 hours'),
  ('d2000000-0000-4000-8000-000000010003', v_company, v_owner, v_pipe, s_lead, 'lead', true, 'Holding Muniz de Negócios Digitais LTDA', 'Holding Muniz', 0, false, 'inbound', 10, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '3 days', now()-interval '1 day'),
  ('d2000000-0000-4000-8000-000000010004', v_company, v_owner, v_pipe, s_lead, 'lead', true, 'Kleon Imports', 'Kleon Imports', 0, false, 'inbound', 10, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '3 days', now()-interval '1 day'),

  -- Clientes Inativos (INATIVOS, esfriando há meses)
  ('d2000000-0000-4000-8000-000000010010', v_company, v_owner, v_pipe, s_inativ, 'lead', false, 'Cirúrgica Sinete Com. Dist. Import. Prod. Médicos', 'Cirúrgica Sinete', 0, false, 'base', 5, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '200 days', now()-interval '162 days'),
  ('d2000000-0000-4000-8000-000000010011', v_company, v_owner, v_pipe, s_inativ, 'lead', false, 'A M O Rede de Drogarias LTDA - Loja 5', 'A M O Rede de Drogarias', 0, false, 'base', 5, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '210 days', now()-interval '169 days'),
  ('d2000000-0000-4000-8000-000000010012', v_company, v_owner, v_pipe, s_inativ, 'lead', false, 'Drogaria Imperial de Peruíbe LTDA', 'Drogaria Imperial', 0, false, 'base', 5, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '215 days', now()-interval '170 days'),
  ('d2000000-0000-4000-8000-000000010013', v_company, v_owner, v_pipe, s_inativ, 'lead', false, 'Perfumaria Orquídea', 'Perfumaria Orquídea', 0, false, 'base', 5, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '42 days'),

  -- Tentativa de Contato
  ('d2000000-0000-4000-8000-000000010020', v_company, v_owner, v_pipe, s_tent, 'lead', true, 'Distribuidora Cabeça 2 LTDA', 'Distribuidora Cabeça 2', 0, false, 'outbound', 15, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '8 days', now()-interval '2 days'),
  ('d2000000-0000-4000-8000-000000010021', v_company, v_owner, v_pipe, s_tent, 'lead', false, 'My Mom Fraldas', 'My Mom Fraldas', 0, false, 'outbound', 15, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '7 days', now()-interval '3 days'),
  ('d2000000-0000-4000-8000-000000010022', v_company, v_owner, v_pipe, s_tent, 'lead', false, 'Drogaria Vitallis', 'Drogaria Vitallis', 0, false, 'outbound', 15, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '6 days', now()-interval '2 days'),
  ('d2000000-0000-4000-8000-000000010023', v_company, v_owner, v_pipe, s_tent, 'lead', false, 'Farmácia Comercial Barcelos LTDA (São José)', 'Farmácia São José', 0, false, 'outbound', 15, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '9 days', now()-interval '4 days'),

  -- Contato Feito
  ('d2000000-0000-4000-8000-000000010030', v_company, v_owner, v_pipe, s_contato, 'qualification', false, 'Eterno Shop', 'Eterno Shop', 1200, false, 'outbound', 25, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '20 days', now()-interval '13 days'),
  ('d2000000-0000-4000-8000-000000010031', v_company, v_owner, v_pipe, s_contato, 'qualification', false, 'Oriental Panda', 'Oriental Panda', 980, false, 'outbound', 25, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '35 days', now()-interval '28 days'),
  ('d2000000-0000-4000-8000-000000010032', v_company, v_owner, v_pipe, s_contato, 'qualification', false, 'NLCorrea Farmácia LTDA', 'NLCorrea Farmácia', 648, false, 'outbound', 25, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '40 days', now()-interval '34 days'),

  -- Qualificação (~R$44k)
  ('d2000000-0000-4000-8000-000000010040', v_company, v_owner, v_pipe, s_qualif, 'qualification', true, 'ICITIALI Soluções e Serviços LTDA', 'ICITIALI Soluções', 18400, true, 'inbound', 35, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '15 days', now()-interval '4 days'),
  ('d2000000-0000-4000-8000-000000010041', v_company, v_owner, v_pipe, s_qualif, 'qualification', false, 'Loja Pediu Chegou', 'Loja Pediu Chegou', 9750, false, 'inbound', 35, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '18 days', now()-interval '6 days'),
  ('d2000000-0000-4000-8000-000000010042', v_company, v_owner, v_pipe, s_qualif, 'qualification', false, 'Box Farma Loja 3', 'Box Farma', 8200, false, 'inbound', 35, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '12 days', now()-interval '5 days'),
  ('d2000000-0000-4000-8000-000000010043', v_company, v_owner, v_pipe, s_qualif, 'qualification', false, 'Drogaria Poupe Bem LTDA', 'Drogaria Poupe Bem', 7745, false, 'inbound', 35, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '14 days', now()-interval '7 days'),

  -- Stand By (~R$77k; Drogaria Efata é o grande)
  ('d2000000-0000-4000-8000-000000010050', v_company, v_owner, v_pipe, s_standby, 'qualification', true, 'Drogaria Efata', 'Drogaria Efata', 66840, false, 'inbound', 30, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '60 days', now()-interval '38 days'),
  ('d2000000-0000-4000-8000-000000010051', v_company, v_owner, v_pipe, s_standby, 'qualification', false, 'Atacado dos Presentes LTDA', 'Atacado dos Presentes', 7200, false, 'inbound', 30, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '50 days', now()-interval '30 days'),
  ('d2000000-0000-4000-8000-000000010052', v_company, v_owner, v_pipe, s_standby, 'qualification', false, 'Anderclau Embalagens Descartáveis LTDA', 'Anderclau Embalagens', 1285, false, 'inbound', 30, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '45 days', now()-interval '25 days'),
  ('d2000000-0000-4000-8000-000000010053', v_company, v_owner, v_pipe, s_standby, 'qualification', false, 'Pannolino Distribuidora', 'Pannolino Distribuidora', 2040, false, 'inbound', 30, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '48 days', now()-interval '28 days'),

  -- Não Qualificados (LOST + inativos)
  ('d2000000-0000-4000-8000-000000010060', v_company, v_owner, v_pipe, s_naoqual, 'closed_lost', false, 'Espaço da Família', 'Espaço da Família', 0, false, 'inbound', 0, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '70 days', now()-interval '60 days'),
  ('d2000000-0000-4000-8000-000000010061', v_company, v_owner, v_pipe, s_naoqual, 'closed_lost', false, 'Bassi Indústria de Cosméticos', 'Bassi Cosméticos', 0, false, 'inbound', 0, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '80 days', now()-interval '65 days'),
  ('d2000000-0000-4000-8000-000000010062', v_company, v_owner, v_pipe, s_naoqual, 'closed_lost', false, 'Crystal Pharma', 'Crystal Pharma', 0, false, 'inbound', 0, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '75 days', now()-interval '62 days'),

  -- Proposta enviada
  ('d2000000-0000-4000-8000-000000010070', v_company, v_owner, v_pipe, s_prop, 'proposal', true, 'Magazine Akemi LTDA', 'Magazine Akemi', 1916, false, 'inbound', 55, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '40 days', now()-interval '33 days'),
  ('d2000000-0000-4000-8000-000000010071', v_company, v_owner, v_pipe, s_prop, 'proposal', false, 'P2M Comércio LTDA', 'P2M Comércio', 3480, false, 'inbound', 55, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '48 days', now()-interval '41 days'),
  ('d2000000-0000-4000-8000-000000010072', v_company, v_owner, v_pipe, s_prop, 'proposal', false, 'Plad Importados', 'Plad Importados', 5240, false, 'inbound', 55, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '46 days', now()-interval '42 days'),

  -- Follow Up (HERÓI — ~R$485k esfriando há +2 meses)
  ('d2000000-0000-4000-8000-000000010080', v_company, v_owner, v_pipe, s_follow, 'negotiation', true, 'Atacadão Distribuição Norte', 'Atacadão Distribuição Norte', 148500, true, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '95 days', now()-interval '60 days'),
  ('d2000000-0000-4000-8000-000000010081', v_company, v_owner, v_pipe, s_follow, 'negotiation', true, 'Rede Farmais - Compra Trimestral', 'Rede Farmais', 96240, true, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '80 days', now()-interval '45 days'),
  ('d2000000-0000-4000-8000-000000010082', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Supermercados União', 'Supermercados União', 74880, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '100 days', now()-interval '70 days'),
  ('d2000000-0000-4000-8000-000000010083', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Conecta Soluções Comerciais', 'Conecta Soluções', 23168, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '60 days', now()-interval '34 days'),
  ('d2000000-0000-4000-8000-000000010084', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Carlos Eduardo de Souza Camurça', 'Carlos Eduardo Camurça', 18000, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '69 days'),
  ('d2000000-0000-4000-8000-000000010085', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Beller Comércio de Papéis LTDA', 'Beller Papéis', 14683, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '69 days'),
  ('d2000000-0000-4000-8000-000000010086', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Kittes USA Brasil Importados', 'Kittes USA Brasil', 12912, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '69 days'),
  ('d2000000-0000-4000-8000-000000010087', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Promax Distribuidora', 'Promax Distribuidora', 11820, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '69 days'),
  ('d2000000-0000-4000-8000-000000010088', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Lúcio Correia', 'Lúcio Correia', 10404, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '69 days'),
  ('d2000000-0000-4000-8000-000000010089', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Three Moda', 'Three Moda', 3976, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '90 days', now()-interval '69 days'),
  ('d2000000-0000-4000-8000-00000001008a', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Giovanny Silva dos Santos', 'Giovanny Silva', 2431, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '75 days', now()-interval '55 days'),
  ('d2000000-0000-4000-8000-00000001008b', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Karina Ribeiro Rocha Miller', 'Karina Ribeiro Miller', 2434, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '100 days', now()-interval '83 days'),
  ('d2000000-0000-4000-8000-00000001008c', v_company, v_owner, v_pipe, s_follow, 'negotiation', false, 'Esmalteria Pink LTDA', 'Esmalteria Pink', 580, false, 'inbound', 70, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '85 days', now()-interval '69 days'),

  -- Negociação: VAZIA de propósito (o gargalo)

  -- Fechamento (vendido)
  ('d2000000-0000-4000-8000-000000010090', v_company, v_owner, v_pipe, s_fech, 'closed_won', false, 'Hallyu Import', 'Hallyu Import', 2569, false, 'inbound', 100, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '20 days', now()-interval '5 days'),
  ('d2000000-0000-4000-8000-000000010091', v_company, v_owner, v_pipe, s_fech, 'closed_won', false, 'Gêmeas Confecções', 'Gêmeas Confecções', 2007, false, 'inbound', 100, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '25 days', now()-interval '7 days'),
  ('d2000000-0000-4000-8000-000000010092', v_company, v_owner, v_pipe, s_fech, 'closed_won', false, 'Drogaria Pharma Ravy LTDA', 'Drogaria Pharma Ravy', 560, false, 'inbound', 100, '{"demo_seed":"DEMO.MSI"}'::jsonb, now()-interval '18 days', now()-interval '3 days');

  -- Ativo/Inativo determinístico: só Clientes Inativos e Não Qualificados são inativos.
  UPDATE public.deals
     SET is_active = (stage_id NOT IN (s_inativ, s_naoqual))
   WHERE pipeline_id = v_pipe;

  RAISE NOTICE 'DEMO.MSI aplicada na company % (owner %). Funil % criado.', v_company, v_owner, v_pipe;
END
$do$;
