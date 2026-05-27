-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.2 (2026-05-26) — Seed de apresentação: Incorporadora (imobiliário)
--
-- Demonstra personalização do Vyzon para incorporadora: tags operacionais
-- (F6T.1) + dados imobiliários estruturados em deals.source_data.
--   interesse_imobiliario. NÃO mexe na demo de agência (DEMO.1) — usa company,
-- contatos, deals e phones próprios (prefixo d1… / 5511990002xxx).
--
-- COMO RODAR:
--   1. Crie a conta da incorporadora pelo cadastro normal (signup/onboarding).
--   2. Pegue o company_id dessa conta (ex.: select id,name from companies;).
--   3. Substitua __COMPANY_ID__ abaixo pelo UUID da company (find/replace).
--   4. npx supabase db query --linked -f supabase/seed/demo_incorporadora.sql
--
-- IDEMPOTENTE: IDs fixos (prefixo d1) + marcador demo_seed='DEMO.2'. Rodar de
-- novo apaga só as próprias linhas e reinsere. Transacional (DO block).
-- O owner (created_by/user_id) é derivado do 1º profile da company.
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := '__COMPANY_ID__';
  v_owner   uuid;
  v_conn    uuid := 'd1000000-0000-4000-8000-0000000c0000';
BEGIN
  SELECT id INTO v_owner FROM public.profiles
   WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Nenhum profile na company %. Crie a conta da incorporadora (signup) antes de rodar o seed.', v_company;
  END IF;

  -- ── Limpeza idempotente (ordem reversa de FK) ──────────────────────────────
  DELETE FROM public.tag_assignments WHERE company_id = v_company AND (metadata->>'demo_seed') = 'DEMO.2';
  DELETE FROM public.channel_messages WHERE conversation_id IN (
    'd1c00000-0000-4000-8000-000000000011','d1c00000-0000-4000-8000-000000000012',
    'd1c00000-0000-4000-8000-000000000013','d1c00000-0000-4000-8000-000000000014',
    'd1c00000-0000-4000-8000-000000000015');
  DELETE FROM public.channel_conversations WHERE id IN (
    'd1c00000-0000-4000-8000-000000000011','d1c00000-0000-4000-8000-000000000012',
    'd1c00000-0000-4000-8000-000000000013','d1c00000-0000-4000-8000-000000000014',
    'd1c00000-0000-4000-8000-000000000015');
  DELETE FROM public.deals WHERE id IN (
    'd1d00000-0000-4000-8000-000000000001','d1d00000-0000-4000-8000-000000000002',
    'd1d00000-0000-4000-8000-000000000003','d1d00000-0000-4000-8000-000000000004',
    'd1d00000-0000-4000-8000-000000000005');
  DELETE FROM public.channel_contacts WHERE id IN (
    'd1c00000-0000-4000-8000-000000000001','d1c00000-0000-4000-8000-000000000002',
    'd1c00000-0000-4000-8000-000000000003','d1c00000-0000-4000-8000-000000000004',
    'd1c00000-0000-4000-8000-000000000005');
  DELETE FROM public.conversation_summaries WHERE company_id = v_company
    AND chat_phone IN ('5511990002001','5511990002002','5511990002003','5511990002004','5511990002005');
  DELETE FROM public.whatsapp_messages WHERE external_id IN
    ('demo-incorp-1','demo-incorp-2','demo-incorp-3','demo-incorp-4','demo-incorp-5');
  DELETE FROM public.tags WHERE id IN (
    'd1a00000-0000-4000-8000-000000000001','d1a00000-0000-4000-8000-000000000002',
    'd1a00000-0000-4000-8000-000000000003','d1a00000-0000-4000-8000-000000000004',
    'd1a00000-0000-4000-8000-000000000005','d1a00000-0000-4000-8000-000000000006',
    'd1a00000-0000-4000-8000-000000000007','d1a00000-0000-4000-8000-000000000008',
    'd1a00000-0000-4000-8000-000000000009','d1a00000-0000-4000-8000-000000000010');
  DELETE FROM public.channel_connections WHERE id = v_conn;

  -- ── Connection demo (WhatsApp/Evolution, marcada como ativa pra demo) ──────
  INSERT INTO public.channel_connections
    (id, company_id, provider, channel_type, status, display_name, external_id, capabilities, metadata, created_by)
  VALUES
    (v_conn, v_company, 'evolution', 'whatsapp', 'active', 'WhatsApp Comercial',
     'wa_demo_incorp_' || replace(v_company::text, '-', ''), '{}'::jsonb, '{"demo_seed":"DEMO.2"}'::jsonb, v_owner);

  -- ── Tags operacionais da incorporadora (F6T.1) ─────────────────────────────
  INSERT INTO public.tags (id, company_id, name, slug, color, category, description, created_by) VALUES
    ('d1a00000-0000-4000-8000-000000000001', v_company, 'Lead quente',      'lead-quente',      'rose',    'incorporadora', 'Alta intenção de compra', v_owner),
    ('d1a00000-0000-4000-8000-000000000002', v_company, 'Financiamento',    'financiamento',    'blue',    'incorporadora', 'Comprará via financiamento', v_owner),
    ('d1a00000-0000-4000-8000-000000000003', v_company, 'Visita',           'visita',           'sky',     'incorporadora', 'Visita ao decorado/imóvel', v_owner),
    ('d1a00000-0000-4000-8000-000000000004', v_company, 'Investidor',       'investidor',       'violet',  'incorporadora', 'Compra para investimento/renda', v_owner),
    ('d1a00000-0000-4000-8000-000000000005', v_company, 'Moradia',          'moradia',          'emerald', 'incorporadora', 'Compra para morar', v_owner),
    ('d1a00000-0000-4000-8000-000000000006', v_company, 'Objeção de preço', 'objecao-de-preco', 'amber',   'incorporadora', 'Achou o valor alto', v_owner),
    ('d1a00000-0000-4000-8000-000000000007', v_company, 'FGTS',             'fgts',             'sky',     'incorporadora', 'Pretende usar FGTS', v_owner),
    ('d1a00000-0000-4000-8000-000000000008', v_company, 'Alto padrão',      'alto-padrao',      'purple',  'incorporadora', 'Interesse em produto alto padrão', v_owner),
    ('d1a00000-0000-4000-8000-000000000009', v_company, 'Baixo fit',        'baixo-fit',        'slate',   'incorporadora', 'Fora do perfil de compra', v_owner),
    ('d1a00000-0000-4000-8000-000000000010', v_company, 'Entrada baixa',    'entrada-baixa',    'orange',  'incorporadora', 'Pouca entrada disponível', v_owner);

  -- ── Contatos ───────────────────────────────────────────────────────────────
  INSERT INTO public.channel_contacts
    (id, company_id, connection_id, external_contact_id, phone_e164, phone_tail, name, is_group, metadata) VALUES
    ('d1c00000-0000-4000-8000-000000000001', v_company, v_conn, '5511990002001@s.whatsapp.net', '5511990002001', '1990002001', 'Ana Beatriz Moraes', false, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000002', v_company, v_conn, '5511990002002@s.whatsapp.net', '5511990002002', '1990002002', 'Roberto Carvalho',   false, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000003', v_company, v_conn, '5511990002003@s.whatsapp.net', '5511990002003', '1990002003', 'Marcos Lima',        false, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000004', v_company, v_conn, '5511990002004@s.whatsapp.net', '5511990002004', '1990002004', 'Patrícia Souza',     false, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000005', v_company, v_conn, '5511990002005@s.whatsapp.net', '5511990002005', '1990002005', 'Diego Fernandes',    false, '{"demo_seed":"DEMO.2"}'::jsonb);

  -- ── Deals com dados imobiliários estruturados (source_data.interesse_imobiliario) ─
  INSERT INTO public.deals
    (id, company_id, user_id, title, customer_name, customer_phone, stage, value, is_hot, lead_source, probability, source_data, created_at, updated_at) VALUES
    ('d1d00000-0000-4000-8000-000000000001', v_company, v_owner, 'Apto 2 dorm - Residencial Aurora', 'Ana Beatriz Moraes', '+5511990002001', 'qualification', 480000, true, 'meta_ads', 45,
     '{"demo_seed":"DEMO.2","interesse_imobiliario":{"empreendimento_interesse":"Residencial Aurora","tipo_imovel":"Apartamento 2 dormitórios","faixa_orcamento":"R$ 450 mil a R$ 520 mil","entrada_disponivel":"R$ 90.000","financiamento":true,"fgts":true,"prazo_compra":"Até 3 meses","corretor_responsavel":"Bruno Tavares","proxima_acao":"Agendar visita ao decorado"}}'::jsonb,
     now()-interval '1 day', now()-interval '3 hours'),
    ('d1d00000-0000-4000-8000-000000000002', v_company, v_owner, 'Studio para investimento - Vista Park', 'Roberto Carvalho', '+5511990002002', 'proposal', 320000, false, 'indicacao', 60,
     '{"demo_seed":"DEMO.2","interesse_imobiliario":{"empreendimento_interesse":"Vista Park","tipo_imovel":"Studio","faixa_orcamento":"R$ 300 mil a R$ 350 mil","entrada_disponivel":"À vista","financiamento":false,"fgts":false,"prazo_compra":"Até 1 mês","corretor_responsavel":"Bruno Tavares","proxima_acao":"Enviar tabela de valores e rentabilidade"}}'::jsonb,
     now()-interval '5 days', now()-interval '1 day'),
    ('d1d00000-0000-4000-8000-000000000003', v_company, v_owner, 'Apto MCMV - Jardim Sul', 'Marcos Lima', '+5511990002003', 'negotiation', 230000, false, 'meta_ads', 35,
     '{"demo_seed":"DEMO.2","interesse_imobiliario":{"empreendimento_interesse":"Jardim Sul","tipo_imovel":"Apartamento 2 dormitórios","faixa_orcamento":"R$ 210 mil a R$ 240 mil","entrada_disponivel":"R$ 12.000","financiamento":true,"fgts":true,"prazo_compra":"Até 6 meses","corretor_responsavel":"Carla Nunes","proxima_acao":"Simular financiamento usando FGTS"}}'::jsonb,
     now()-interval '10 days', now()-interval '2 days'),
    ('d1d00000-0000-4000-8000-000000000004', v_company, v_owner, 'Cobertura - Residencial Aurora', 'Patrícia Souza', '+5511990002004', 'proposal', 890000, true, 'site', 55,
     '{"demo_seed":"DEMO.2","interesse_imobiliario":{"empreendimento_interesse":"Residencial Aurora","tipo_imovel":"Cobertura 3 suítes","faixa_orcamento":"R$ 850 mil a R$ 950 mil","entrada_disponivel":"R$ 250.000","financiamento":true,"fgts":false,"prazo_compra":"Até 2 meses","corretor_responsavel":"Carla Nunes","proxima_acao":"Confirmar visita de sábado"}}'::jsonb,
     now()-interval '3 days', now()-interval '5 hours'),
    ('d1d00000-0000-4000-8000-000000000005', v_company, v_owner, 'Contato sem fit - Diego Fernandes', 'Diego Fernandes', '+5511990002005', 'qualification', 0, false, 'meta_ads', 10,
     '{"demo_seed":"DEMO.2","interesse_imobiliario":{"empreendimento_interesse":"Não definido","tipo_imovel":"Procura imóvel para alugar","faixa_orcamento":"Não informado","entrada_disponivel":"Não informado","financiamento":false,"fgts":false,"prazo_compra":"Indefinido","corretor_responsavel":"Bruno Tavares","proxima_acao":"Explicar que trabalhamos com venda, não locação"}}'::jsonb,
     now()-interval '2 days', now()-interval '1 day');

  -- ── Conversas (cada contato vinculado ao seu deal) ─────────────────────────
  INSERT INTO public.channel_conversations
    (id, company_id, connection_id, contact_id, deal_id, status, last_message_at, last_inbound_at, last_outbound_at, unread_count, metadata) VALUES
    ('d1c00000-0000-4000-8000-000000000011', v_company, v_conn, 'd1c00000-0000-4000-8000-000000000001', 'd1d00000-0000-4000-8000-000000000001', 'open', now()-interval '2 hours 50 minutes', now()-interval '2 hours 50 minutes', null, 2, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000012', v_company, v_conn, 'd1c00000-0000-4000-8000-000000000002', 'd1d00000-0000-4000-8000-000000000002', 'open', now()-interval '1 day', now()-interval '1 day 1 hour', now()-interval '1 day', 0, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000013', v_company, v_conn, 'd1c00000-0000-4000-8000-000000000003', 'd1d00000-0000-4000-8000-000000000003', 'open', now()-interval '2 days', now()-interval '2 days', now()-interval '2 days', 1, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000014', v_company, v_conn, 'd1c00000-0000-4000-8000-000000000004', 'd1d00000-0000-4000-8000-000000000004', 'open', now()-interval '5 hours', now()-interval '5 hours', now()-interval '4 hours', 1, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1c00000-0000-4000-8000-000000000015', v_company, v_conn, 'd1c00000-0000-4000-8000-000000000005', 'd1d00000-0000-4000-8000-000000000005', 'open', now()-interval '2 days', now()-interval '2 days', now()-interval '2 days', 0, '{"demo_seed":"DEMO.2"}'::jsonb);

  -- ── Mensagens ──────────────────────────────────────────────────────────────
  INSERT INTO public.channel_messages
    (company_id, connection_id, conversation_id, contact_id, provider_message_id, direction, message_type, body, media_ref, status, message_timestamp, metadata) VALUES
    (v_company, v_conn, 'd1c00000-0000-4000-8000-000000000011', 'd1c00000-0000-4000-8000-000000000001', 'demo-ana-1', 'inbound', 'text', 'Oi, vi o anúncio do Residencial Aurora. Tem apartamento de 2 dormitórios?', '{}'::jsonb, 'received', now()-interval '3 hours', '{"demo_seed":"DEMO.2"}'::jsonb),
    (v_company, v_conn, 'd1c00000-0000-4000-8000-000000000011', 'd1c00000-0000-4000-8000-000000000001', 'demo-ana-2', 'inbound', 'text', 'É pra morar. Tenho uns 90 mil de entrada e quero financiar o resto, posso usar FGTS.', '{}'::jsonb, 'received', now()-interval '2 hours 50 minutes', '{"demo_seed":"DEMO.2"}'::jsonb),
    (v_company, v_conn, 'd1c00000-0000-4000-8000-000000000012', 'd1c00000-0000-4000-8000-000000000002', 'demo-roberto-1', 'inbound', 'text', 'Procuro um studio para investir e alugar. Pago à vista se o preço fizer sentido.', '{}'::jsonb, 'received', now()-interval '1 day 1 hour', '{"demo_seed":"DEMO.2"}'::jsonb),
    (v_company, v_conn, 'd1c00000-0000-4000-8000-000000000013', 'd1c00000-0000-4000-8000-000000000003', 'demo-marcos-1', 'inbound', 'text', 'Achei a parcela meio alta. Consigo usar o FGTS pra abater?', '{}'::jsonb, 'received', now()-interval '2 days', '{"demo_seed":"DEMO.2"}'::jsonb),
    (v_company, v_conn, 'd1c00000-0000-4000-8000-000000000014', 'd1c00000-0000-4000-8000-000000000004', 'demo-patricia-1', 'inbound', 'text', 'Quero ver a cobertura pessoalmente. Consigo visitar no sábado?', '{}'::jsonb, 'received', now()-interval '5 hours', '{"demo_seed":"DEMO.2"}'::jsonb),
    (v_company, v_conn, 'd1c00000-0000-4000-8000-000000000015', 'd1c00000-0000-4000-8000-000000000005', 'demo-diego-1', 'inbound', 'text', 'Na verdade eu queria alugar, não comprar. Vocês têm pra locação?', '{}'::jsonb, 'received', now()-interval '2 days', '{"demo_seed":"DEMO.2"}'::jsonb);

  -- ── Análise salva da EVA (conversation_summaries) ──────────────────────────
  INSERT INTO public.conversation_summaries
    (company_id, user_id, chat_phone, summary, message_count, analyzed_at, qualification, cached_analysis) VALUES
    (v_company, v_owner, '5511990002001', 'Compradora de moradia interessada no Residencial Aurora, com entrada e intenção de financiar usando FGTS.', 2, now(),
     '{"servico_interesse":"Apartamento Residencial Aurora","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":80,"score_justificativa":"Entrada disponível, intenção clara de moradia e financiamento viável.","urgencia":"alta","orcamento":"adequado","objecao":null,"info_coletada":["Quer 2 dormitórios para morar","Entrada de 90 mil","Pretende usar FGTS"],"info_faltante":["Renda familiar para aprovação","Data ideal de mudança"],"proxima_acao":"agendar_visita","resposta_sugerida":"Ótimo, Ana! O Aurora tem unidades de 2 dormitórios perfeitas pra morar. Que tal agendarmos uma visita ao decorado essa semana? Já adianto a simulação do financiamento com FGTS.","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.8,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Compradora quente de moradia, pronta para visita.","stage":"Qualificação","nextAction":"Agendar visita ao decorado e simular financiamento","context_present":true,"context_version_used":1}'::jsonb),
    (v_company, v_owner, '5511990002002', 'Investidor buscando studio para renda, pagamento à vista.', 1, now(),
     '{"servico_interesse":"Studio Vista Park","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":75,"score_justificativa":"Investidor com capacidade de pagamento à vista.","urgencia":"media","orcamento":"adequado","objecao":null,"info_coletada":["Perfil investidor","Pagamento à vista"],"info_faltante":["Expectativa de rentabilidade"],"proxima_acao":"responder","resposta_sugerida":"Perfeito, Roberto! O Vista Park tem ótima liquidez pra locação. Te envio a tabela e a projeção de rentabilidade. Qual retorno mensal você busca?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.75,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Investidor qualificado, foco em rentabilidade.","stage":"Proposta","nextAction":"Enviar tabela e projeção de rentabilidade","context_present":true,"context_version_used":1}'::jsonb),
    (v_company, v_owner, '5511990002003', 'Comprador MCMV com objeção de preço, quer abater com FGTS.', 1, now(),
     '{"servico_interesse":"Apartamento Jardim Sul","intencao":"preco","temperatura":"morno","fit_sugerido":"medio","score_sugerido":52,"score_justificativa":"Fit de produto adequado, mas com objeção de parcela e entrada baixa.","urgencia":"media","orcamento":"baixo","objecao":"Acha a parcela alta","info_coletada":["Interesse no Jardim Sul","Quer usar FGTS"],"info_faltante":["Renda comprovada","Valor exato de FGTS disponível"],"proxima_acao":"responder","resposta_sugerida":"Entendo, Marcos. Dá pra usar o FGTS pra abater a entrada e reduzir a parcela. Me passa sua renda aproximada que eu já simulo o melhor cenário.","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.6,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Comprador sensível a preço, FGTS pode destravar.","stage":"Negociação","nextAction":"Simular financiamento com FGTS e renda","context_present":true,"context_version_used":1}'::jsonb),
    (v_company, v_owner, '5511990002004', 'Interessada em cobertura de alto padrão, quer visita no fim de semana.', 1, now(),
     '{"servico_interesse":"Cobertura Residencial Aurora","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":78,"score_justificativa":"Alto padrão, entrada robusta e pedido de visita.","urgencia":"alta","orcamento":"adequado","objecao":null,"info_coletada":["Interesse em cobertura","Entrada de 250 mil","Quer visitar"],"info_faltante":["Confirmação de horário"],"proxima_acao":"agendar_visita","resposta_sugerida":"Maravilha, Patrícia! Tenho horário no sábado de manhã pra te mostrar a cobertura. Prefere 10h ou 11h?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.78,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Lead quente de alto padrão, visita iminente.","stage":"Proposta","nextAction":"Confirmar horário da visita de sábado","context_present":true,"context_version_used":1}'::jsonb),
    (v_company, v_owner, '5511990002005', 'Procura locação, fora do foco de venda da incorporadora.', 1, now(),
     '{"servico_interesse":"Locação","intencao":"duvida","temperatura":"frio","fit_sugerido":"baixo","score_sugerido":15,"score_justificativa":"Demanda de locação, fora do ICP de venda.","urgencia":"baixa","orcamento":"nao_informado","objecao":null,"info_coletada":["Quer alugar, não comprar"],"info_faltante":[],"proxima_acao":"aguardar","resposta_sugerida":"Oi Diego! Hoje trabalhamos com a venda das unidades, não com locação. Se em algum momento pensar em comprar, conta comigo!","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.7,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Fora do ICP: procura locação, não compra.","stage":"Qualificação","nextAction":"Explicar foco em venda e arquivar se não evoluir","context_present":true,"context_version_used":1}'::jsonb);

  -- ── Espelho legado (whatsapp_messages) — só pro tenant guard do whatsapp-copilot ─
  INSERT INTO public.whatsapp_messages
    (external_id, instance_name, user_id, company_id, chat_jid, chat_phone, phone_e164_tail, contact_name, is_group, direction, message_type, body, message_timestamp) VALUES
    ('demo-incorp-1', 'wa_demo_incorporadora', v_owner, v_company, '5511990002001@s.whatsapp.net', '5511990002001', '1990002001', 'Ana Beatriz Moraes', false, 'inbound', 'text', 'Oi, vi o anúncio do Residencial Aurora. Tem apartamento de 2 dormitórios?', now()-interval '3 hours'),
    ('demo-incorp-2', 'wa_demo_incorporadora', v_owner, v_company, '5511990002002@s.whatsapp.net', '5511990002002', '1990002002', 'Roberto Carvalho',   false, 'inbound', 'text', 'Procuro um studio para investir e alugar.', now()-interval '1 day 1 hour'),
    ('demo-incorp-3', 'wa_demo_incorporadora', v_owner, v_company, '5511990002003@s.whatsapp.net', '5511990002003', '1990002003', 'Marcos Lima',        false, 'inbound', 'text', 'Achei a parcela meio alta. Consigo usar o FGTS pra abater?', now()-interval '2 days'),
    ('demo-incorp-4', 'wa_demo_incorporadora', v_owner, v_company, '5511990002004@s.whatsapp.net', '5511990002004', '1990002004', 'Patrícia Souza',     false, 'inbound', 'text', 'Quero ver a cobertura pessoalmente. Consigo visitar no sábado?', now()-interval '5 hours'),
    ('demo-incorp-5', 'wa_demo_incorporadora', v_owner, v_company, '5511990002005@s.whatsapp.net', '5511990002005', '1990002005', 'Diego Fernandes',    false, 'inbound', 'text', 'Na verdade eu queria alugar, não comprar.', now()-interval '2 days');

  -- ── Tag assignments (manual — EVA não aplica tags) ─────────────────────────
  -- deals
  INSERT INTO public.tag_assignments (id, company_id, tag_id, entity_type, entity_id, source, created_by, metadata) VALUES
    ('d1f00000-0000-4000-8000-000000000001', v_company, 'd1a00000-0000-4000-8000-000000000001', 'deal', 'd1d00000-0000-4000-8000-000000000001', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000002', v_company, 'd1a00000-0000-4000-8000-000000000002', 'deal', 'd1d00000-0000-4000-8000-000000000001', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000003', v_company, 'd1a00000-0000-4000-8000-000000000005', 'deal', 'd1d00000-0000-4000-8000-000000000001', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000004', v_company, 'd1a00000-0000-4000-8000-000000000004', 'deal', 'd1d00000-0000-4000-8000-000000000002', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000005', v_company, 'd1a00000-0000-4000-8000-000000000008', 'deal', 'd1d00000-0000-4000-8000-000000000002', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000006', v_company, 'd1a00000-0000-4000-8000-000000000007', 'deal', 'd1d00000-0000-4000-8000-000000000003', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000007', v_company, 'd1a00000-0000-4000-8000-000000000010', 'deal', 'd1d00000-0000-4000-8000-000000000003', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000008', v_company, 'd1a00000-0000-4000-8000-000000000006', 'deal', 'd1d00000-0000-4000-8000-000000000003', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000009', v_company, 'd1a00000-0000-4000-8000-000000000003', 'deal', 'd1d00000-0000-4000-8000-000000000004', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000010', v_company, 'd1a00000-0000-4000-8000-000000000008', 'deal', 'd1d00000-0000-4000-8000-000000000004', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000011', v_company, 'd1a00000-0000-4000-8000-000000000001', 'deal', 'd1d00000-0000-4000-8000-000000000004', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000012', v_company, 'd1a00000-0000-4000-8000-000000000009', 'deal', 'd1d00000-0000-4000-8000-000000000005', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
  -- conversas (contexto no EvaPanel)
    ('d1f00000-0000-4000-8000-000000000013', v_company, 'd1a00000-0000-4000-8000-000000000001', 'conversation', 'd1c00000-0000-4000-8000-000000000011', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000014', v_company, 'd1a00000-0000-4000-8000-000000000007', 'conversation', 'd1c00000-0000-4000-8000-000000000013', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000015', v_company, 'd1a00000-0000-4000-8000-000000000003', 'conversation', 'd1c00000-0000-4000-8000-000000000014', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
  -- contatos
    ('d1f00000-0000-4000-8000-000000000016', v_company, 'd1a00000-0000-4000-8000-000000000004', 'contact', 'd1c00000-0000-4000-8000-000000000002', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb),
    ('d1f00000-0000-4000-8000-000000000017', v_company, 'd1a00000-0000-4000-8000-000000000005', 'contact', 'd1c00000-0000-4000-8000-000000000001', 'manual', v_owner, '{"demo_seed":"DEMO.2"}'::jsonb);

  RAISE NOTICE 'DEMO.2 incorporadora aplicada na company % (owner %).', v_company, v_owner;
END
$do$;
