-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.MSI.CONV (2026-06-12 rev2) — Conversas LONGAS + EVA em ação (demo MSI)
--
-- 5 conversas ricas ligadas a deals do funil MSI:
--   1. Hallyu Import   → JORNADA COMPLETA até o FECHAMENTO da venda (a estrela)
--   2. Rede Farmais    → Follow Up R$96k, prometeu retorno e sumiu (esquecido)
--   3. Drogaria Efata  → Stand By R$66k, pediu tabela e esfriou
--   4. ICITIALI        → Qualificação quente, rede de 3 lojas
--   5. Conecta         → Follow Up R$23k, negociação de volume parada
--
-- Rodar APÓS demo_msi_comercio.sql:
--   npx supabase db query --linked -f supabase/seed/demo_msi_conversas.sql
-- IDEMPOTENTE: IDs fixos (prefixo d2c) + marcador metadata.demo_seed='DEMO.MSI'.
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702';
  v_owner   uuid;
  v_conn    uuid := 'de0cfc04-79b8-44b2-baf6-b635790f4ea0';
  c1 uuid := 'd2c00000-0000-4000-8000-00000000c001'; -- Rede Farmais
  c2 uuid := 'd2c00000-0000-4000-8000-00000000c002'; -- Drogaria Efata
  c3 uuid := 'd2c00000-0000-4000-8000-00000000c003'; -- ICITIALI
  c4 uuid := 'd2c00000-0000-4000-8000-00000000c004'; -- Conecta
  c5 uuid := 'd2c00000-0000-4000-8000-00000000c005'; -- Hallyu Import
  e1 uuid := 'd2c00000-0000-4000-8000-00000000e001';
  e2 uuid := 'd2c00000-0000-4000-8000-00000000e002';
  e3 uuid := 'd2c00000-0000-4000-8000-00000000e003';
  e4 uuid := 'd2c00000-0000-4000-8000-00000000e004';
  e5 uuid := 'd2c00000-0000-4000-8000-00000000e005';
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Sem profile na company %', v_company; END IF;

  -- ── Limpeza idempotente ─────────────────────────────────────────────────────
  DELETE FROM public.channel_messages WHERE conversation_id IN (e1,e2,e3,e4,e5);
  DELETE FROM public.channel_conversations WHERE id IN (e1,e2,e3,e4,e5);
  DELETE FROM public.channel_contacts WHERE id IN (c1,c2,c3,c4,c5);
  DELETE FROM public.conversation_summaries WHERE company_id = v_company
    AND chat_phone IN ('5511993001001','5511993001002','5511993001003','5511993001004','5511993001005');
  DELETE FROM public.whatsapp_messages WHERE external_id IN ('demo-msi-1','demo-msi-2','demo-msi-3','demo-msi-4','demo-msi-5');

  UPDATE public.channel_connections SET status = 'active' WHERE id = v_conn;

  -- ── Contatos ────────────────────────────────────────────────────────────────
  INSERT INTO public.channel_contacts
    (id, company_id, connection_id, external_contact_id, phone_e164, phone_tail, name, is_group, metadata) VALUES
    (c1, v_company, v_conn, '5511993001001@s.whatsapp.net', '5511993001001', '11993001001', 'Rede Farmais (Compras)', false, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (c2, v_company, v_conn, '5511993001002@s.whatsapp.net', '5511993001002', '11993001002', 'Drogaria Efata', false, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (c3, v_company, v_conn, '5511993001003@s.whatsapp.net', '5511993001003', '11993001003', 'ICITIALI Soluções', false, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (c4, v_company, v_conn, '5511993001004@s.whatsapp.net', '5511993001004', '11993001004', 'Conecta Soluções', false, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (c5, v_company, v_conn, '5511993001005@s.whatsapp.net', '5511993001005', '11993001005', 'Hallyu Import (Bruna)', false, '{"demo_seed":"DEMO.MSI"}'::jsonb);

  -- ── Conversas ───────────────────────────────────────────────────────────────
  INSERT INTO public.channel_conversations
    (id, company_id, connection_id, contact_id, deal_id, status, last_message_at, last_inbound_at, last_outbound_at, unread_count, metadata) VALUES
    (e1, v_company, v_conn, c1, 'd2000000-0000-4000-8000-000000010081', 'open', now()-interval '45 days', now()-interval '45 days', now()-interval '46 days', 1, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (e2, v_company, v_conn, c2, 'd2000000-0000-4000-8000-000000010050', 'open', now()-interval '38 days', now()-interval '38 days', now()-interval '39 days', 1, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (e3, v_company, v_conn, c3, 'd2000000-0000-4000-8000-000000010040', 'open', now()-interval '4 days',  now()-interval '4 days',  now()-interval '5 days',  1, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (e4, v_company, v_conn, c4, 'd2000000-0000-4000-8000-000000010083', 'open', now()-interval '34 days', now()-interval '34 days', now()-interval '35 days', 1, '{"demo_seed":"DEMO.MSI"}'::jsonb),
    (e5, v_company, v_conn, c5, 'd2000000-0000-4000-8000-000000010090', 'open', now()-interval '5 days',  now()-interval '5 days',  now()-interval '5 days',  0, '{"demo_seed":"DEMO.MSI"}'::jsonb);

  -- ── Mensagens ───────────────────────────────────────────────────────────────
  INSERT INTO public.channel_messages
    (company_id, connection_id, conversation_id, contact_id, provider_message_id, direction, message_type, body, media_ref, status, message_timestamp, metadata) VALUES

  -- ══ 1. HALLYU IMPORT — jornada completa até o FECHAMENTO ════════════════════
  (v_company, v_conn, e5, c5, 'msi-hallyu-01', 'inbound',  'text', 'Oi! Vi vocês por indicação da loja da minha prima. Trabalho com importados e variedades, vocês fornecem pra revenda?', '{}'::jsonb, 'received', now()-interval '19 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-02', 'outbound', 'text', 'Oi, Bruna! Tudo bem? Aqui é da MSI Comércio. Fornecemos sim pra revenda, com pronta entrega na região. Sua loja é mais focada em quê: utilidades, presentes, papelaria?', '{}'::jsonb, 'sent', now()-interval '19 days 5 hours 50 minutes', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-03', 'inbound',  'text', 'É uma loja de variedades mesmo, tipo 1,99. Vende um pouco de tudo: utilidade doméstica, presente, acessório.', '{}'::jsonb, 'received', now()-interval '19 days 5 hours 40 minutes', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-04', 'outbound', 'text', 'Perfeito, é o nosso forte. Pra eu te montar a melhor condição: você já tem CNPJ ativo e qual o volume de compra que costuma fazer por mês?', '{}'::jsonb, 'sent', now()-interval '19 days 5 hours 30 minutes', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-05', 'inbound',  'text', 'Tenho CNPJ sim. Hoje compro uns 3 a 4 mil por mês, mas tô querendo aumentar o mix pro fim de ano.', '{}'::jsonb, 'received', now()-interval '18 days 8 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-06', 'outbound', 'text', 'Show. Vou te mandar a tabela com os itens de maior giro pra loja de variedades e já marco os campeões de margem. Te envio agora o PDF em anexo.', '{}'::jsonb, 'sent', now()-interval '18 days 7 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-08', 'inbound',  'text', 'Recebi a tabela! Gostei do mix. Só achei alguns itens de cozinha um pouco mais caros que meu fornecedor atual.', '{}'::jsonb, 'received', now()-interval '17 days 9 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-09', 'outbound', 'text', 'Entendo. Nesses itens a gente trabalha com qualidade um pouco acima, mas consigo equilibrar: fechando o mix completo eu aplico um desconto na linha de cozinha pra ficar competitivo. Topa eu montar um pedido sugerido?', '{}'::jsonb, 'sent', now()-interval '17 days 8 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-10', 'inbound',  'text', 'Pode montar. Mas preciso de prazo, não consigo pagar tudo à vista agora.', '{}'::jsonb, 'received', now()-interval '16 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-11', 'outbound', 'text', 'Sem problema. Pro primeiro pedido eu consigo 30/60 e, a partir do segundo, abro 30/60/90. Montei um pedido de R$ 2.569 com o mix de variedades + a linha de cozinha já com desconto. Quer que eu te mande o resumo?', '{}'::jsonb, 'sent', now()-interval '16 days 5 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-12', 'inbound',  'text', 'Manda o resumo. E se eu pagar metade à vista, melhora alguma coisa?', '{}'::jsonb, 'received', now()-interval '12 days 7 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-13', 'outbound', 'text', 'Consigo sim: 50% à vista e 50% em 30 dias, com 3% de desconto no total. Fica R$ 2.492. Resumo do pedido: 1 caixa utilidades, 1 caixa presentes, 1 caixa cozinha (com desconto). Entrega em até 3 dias úteis.', '{}'::jsonb, 'sent', now()-interval '12 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-14', 'inbound',  'text', 'Fechado! Pode faturar nessa condição então. 50% à vista e 50% em 30.', '{}'::jsonb, 'received', now()-interval '6 days 8 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-15', 'outbound', 'text', 'Maravilha, Bruna! Vou precisar confirmar o endereço de entrega e a razão social pra emitir a NF.', '{}'::jsonb, 'sent', now()-interval '6 days 7 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-16', 'inbound',  'text', 'Hallyu Import Comércio de Variedades. Endereço é Rua das Flores, 240, Centro. Pode mandar o Pix do sinal.', '{}'::jsonb, 'received', now()-interval '6 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-17', 'outbound', 'text', 'Pedido faturado e a NF já foi enviada no seu e-mail. A entrega sai amanhã e chega em até 3 dias úteis. Obrigado pela confiança, Bruna! Qualquer reposição é só me chamar por aqui.', '{}'::jsonb, 'sent', now()-interval '5 days 2 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e5, c5, 'msi-hallyu-18', 'inbound',  'text', 'Perfeito, muito obrigada! Já volto a comprar mês que vem com o mix maior pro fim de ano.', '{}'::jsonb, 'received', now()-interval '5 days', '{"demo_seed":"DEMO.MSI"}'::jsonb),

  -- ══ 2. REDE FARMAIS — Follow Up esquecido ═══════════════════════════════════
  (v_company, v_conn, e1, c1, 'msi-farmais-01', 'inbound',  'text', 'Boa tarde! Somos a Rede Farmais, temos 4 unidades. Estamos buscando um distribuidor de genéricos com pronta entrega.', '{}'::jsonb, 'received', now()-interval '60 days 5 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-02', 'outbound', 'text', 'Boa tarde! Atendemos várias redes na região com genéricos e pronta entrega. Pra 4 unidades consigo uma condição de escala. Qual o volume mensal aproximado somando as lojas?', '{}'::jsonb, 'sent', now()-interval '60 days 4 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-03', 'inbound',  'text', 'Gira em torno de 90 a 100 mil por mês no total. Hoje compramos de dois fornecedores e queremos centralizar.', '{}'::jsonb, 'received', now()-interval '59 days 8 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-04', 'outbound', 'text', 'Ótimo volume. Centralizando comigo você ganha em preço e em logística (uma entrega só). Te preparo uma tabela trimestral com trava de preço. Qual o mix que mais pesa: genérico, similar ou perfumaria?', '{}'::jsonb, 'sent', now()-interval '59 days 7 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-05', 'inbound',  'text', 'Genérico é o que mais sai, uns 70%. O resto é similar e um pouco de perfumaria.', '{}'::jsonb, 'received', now()-interval '58 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-06', 'outbound', 'text', 'Perfeito. Montei a tabela trimestral focada em genérico com preço travado por 90 dias. Te envio o arquivo em anexo.', '{}'::jsonb, 'sent', now()-interval '50 days 4 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-08', 'inbound',  'text', 'Recebi a tabela trimestral. A condição de pagamento em 30/60/90 está mantida pra esse volume?', '{}'::jsonb, 'received', now()-interval '47 days 3 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-09', 'outbound', 'text', 'Está sim, mantemos 30/60/90 pra pedidos acima de R$ 80 mil. Posso fechar o pedido trimestral pra você?', '{}'::jsonb, 'sent', now()-interval '47 days 2 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e1, c1, 'msi-farmais-10', 'inbound',  'text', 'Perfeito. Vou alinhar internamente o mix com o sócio e te retorno até sexta pra fechar.', '{}'::jsonb, 'received', now()-interval '45 days', '{"demo_seed":"DEMO.MSI"}'::jsonb),

  -- ══ 3. DROGARIA EFATA — Stand By ════════════════════════════════════════════
  (v_company, v_conn, e2, c2, 'msi-efata-01', 'inbound',  'text', 'Oi, queria reabrir o cadastro de vocês. Trabalham com linha de genéricos e perfumaria?', '{}'::jsonb, 'received', now()-interval '44 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e2, c2, 'msi-efata-02', 'outbound', 'text', 'Oi! Trabalhamos sim, com pronta entrega na região. Você já foi cliente? Consigo puxar seu histórico pra agilizar.', '{}'::jsonb, 'sent', now()-interval '44 days 5 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e2, c2, 'msi-efata-03', 'inbound',  'text', 'Fui sim, há uns 2 anos. Parei de comprar porque mudei de fornecedor, mas não tô satisfeita com a entrega de agora.', '{}'::jsonb, 'received', now()-interval '43 days 4 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e2, c2, 'msi-efata-04', 'outbound', 'text', 'Entendo, entrega é justamente nosso ponto forte. Pra te mandar a tabela atualizada e o pedido mínimo: qual o volume mensal que você gira hoje?', '{}'::jsonb, 'sent', now()-interval '43 days 3 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e2, c2, 'msi-efata-05', 'inbound',  'text', 'Gira uns 60 mil/mês. Manda a tabela que eu analiso com o sócio.', '{}'::jsonb, 'received', now()-interval '42 days', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e2, c2, 'msi-efata-06', 'outbound', 'text', 'Fechado, já te envio a tabela com pronta entrega e as condições pro seu volume. Te mando ainda hoje.', '{}'::jsonb, 'sent', now()-interval '41 days', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e2, c2, 'msi-efata-07', 'inbound',  'text', 'Beleza, fico no aguardo então.', '{}'::jsonb, 'received', now()-interval '38 days', '{"demo_seed":"DEMO.MSI"}'::jsonb),

  -- ══ 4. ICITIALI — Qualificação quente ═══════════════════════════════════════
  (v_company, v_conn, e3, c3, 'msi-icitiali-01', 'inbound',  'text', 'Bom dia! Somos uma rede com 3 lojas, queremos centralizar a compra de descartáveis e embalagens. Vocês atendem com entrega programada?', '{}'::jsonb, 'received', now()-interval '6 days 5 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e3, c3, 'msi-icitiali-02', 'outbound', 'text', 'Bom dia! Atendemos sim, com entrega programada semanal. Pra 3 lojas consigo uma condição de escala. Qual o ticket mensal estimado somando elas?', '{}'::jsonb, 'sent', now()-interval '6 days 4 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e3, c3, 'msi-icitiali-03', 'inbound',  'text', 'Uns 18 a 20 mil por mês somando as 3. Hoje cada loja compra separado e é uma bagunça.', '{}'::jsonb, 'received', now()-interval '5 days 8 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e3, c3, 'msi-icitiali-04', 'outbound', 'text', 'Centralizando comigo resolve isso: um pedido só, uma fatura e entrega programada por loja. Os itens são mais descartável (copo, marmita) ou embalagem (sacola, bobina)?', '{}'::jsonb, 'sent', now()-interval '5 days 7 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e3, c3, 'msi-icitiali-05', 'inbound',  'text', 'Os dois, mas descartável é o que mais consome. Sacola plástica também sai bastante.', '{}'::jsonb, 'received', now()-interval '5 days 5 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e3, c3, 'msi-icitiali-06', 'outbound', 'text', 'Anotado. Você é o decisor da compra das 3 lojas ou precisa validar com mais alguém?', '{}'::jsonb, 'sent', now()-interval '5 days 4 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e3, c3, 'msi-icitiali-07', 'inbound',  'text', 'Sou eu que decido. Pode me passar a condição e o prazo de pagamento?', '{}'::jsonb, 'received', now()-interval '4 days', '{"demo_seed":"DEMO.MSI"}'::jsonb),

  -- ══ 5. CONECTA — Follow Up de volume ════════════════════════════════════════
  (v_company, v_conn, e4, c4, 'msi-conecta-01', 'inbound',  'text', 'Opa, sobre aquele pedido que conversamos: ainda tá de pé a condição?', '{}'::jsonb, 'received', now()-interval '40 days 6 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e4, c4, 'msi-conecta-02', 'outbound', 'text', 'Opa! Tá de pé sim. Você tinha fechado 1 palete, certo? Quer manter ou ajustar?', '{}'::jsonb, 'sent', now()-interval '40 days 5 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e4, c4, 'msi-conecta-03', 'inbound',  'text', 'É que eu tava pensando em subir. Se eu subir pra 2 paletes vocês conseguem melhorar o preço unitário?', '{}'::jsonb, 'received', now()-interval '36 days 4 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e4, c4, 'msi-conecta-04', 'outbound', 'text', 'Consigo! Em 2 paletes aplico 6% de desconto e ainda coloco o frete por nossa conta. Quer que eu já monte o pedido nessa condição?', '{}'::jsonb, 'sent', now()-interval '36 days 3 hours', '{"demo_seed":"DEMO.MSI"}'::jsonb),
  (v_company, v_conn, e4, c4, 'msi-conecta-05', 'inbound',  'text', 'Boa, gostei. Deixa eu confirmar o espaço no estoque e te falo essa semana.', '{}'::jsonb, 'received', now()-interval '34 days', '{"demo_seed":"DEMO.MSI"}'::jsonb);

  -- ── Análise da EVA (conversation_summaries) ─────────────────────────────────
  INSERT INTO public.conversation_summaries
    (company_id, user_id, chat_phone, summary, message_count, analyzed_at, qualification, cached_analysis) VALUES
    (v_company, v_owner, '5511993001005', 'Hallyu Import (loja de variedades) fechou o primeiro pedido de R$ 2.569 após negociar mix, prazo e desconto. Cliente satisfeita e sinalizou recompra maior pro fim de ano.', 18, now(),
     '{"servico_interesse":"Variedades e importados","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":90,"score_justificativa":"Pedido fechado e faturado; cliente sinalizou recompra. Oportunidade de aumentar ticket.","urgencia":"baixa","orcamento":"adequado","objecao":"Resolvida (preço/prazo)","info_coletada":["Loja de variedades com CNPJ","Compra ~R$3-4 mil/mês","Fechou 50% à vista + 50% em 30 dias","Quer ampliar mix no fim de ano"],"info_faltante":[],"proxima_acao":"pos_venda","resposta_sugerida":"Bruna, que bom que deu tudo certo! Já anoto seu interesse em ampliar o mix pro fim de ano. Início do mês que vem te mando uma curadoria de itens sazonais com uma condição especial de recompra. Pode ser?","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.9,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Venda fechada com sucesso — relacionamento aberto para recompra.","stage":"Fechamento","nextAction":"Pós-venda: agendar recompra de fim de ano com mix maior","context_present":true,"context_version_used":1}'::jsonb),

    (v_company, v_owner, '5511993001001', 'Rede Farmais (4 lojas, ~R$96k/mês) aceitou a condição 30/60/90 e prometeu retorno "até sexta" — sem follow-up há 45 dias. Pedido trimestral parado a um empurrão de fechar.', 10, now(),
     '{"servico_interesse":"Pedido trimestral (genéricos)","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":85,"score_justificativa":"Rede com alto volume, condição aceita e intenção clara; só faltou o follow-up.","urgencia":"alta","orcamento":"adequado","objecao":null,"info_coletada":["4 lojas","Volume ~R$90-100 mil/mês","70% genérico","Aceitou 30/60/90","Prometeu retorno até sexta"],"info_faltante":["Confirmação do mix final com o sócio"],"proxima_acao":"retomar_followup","resposta_sugerida":"Oi! Voltando aqui sobre o pedido trimestral das 4 lojas. Você chegou a alinhar o mix com o sócio? Seguro a condição 30/60/90 com preço travado e já deixo o pedido pronto pra faturar essa semana.","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.85,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Follow-up quente esquecido há 45 dias — alto risco de perder por inação.","stage":"Follow Up","nextAction":"Retomar hoje: confirmar mix e fechar o pedido trimestral","context_present":true,"context_version_used":1}'::jsonb),

    (v_company, v_owner, '5511993001002', 'Drogaria Efata (ex-cliente, ~R$60k/mês) quer reabrir cadastro por insatisfação com a entrega do fornecedor atual. Pediu tabela há 38 dias e não recebeu retorno.', 7, now(),
     '{"servico_interesse":"Reativação (genéricos + perfumaria)","intencao":"compra","temperatura":"morno","fit_sugerido":"bom","score_sugerido":72,"score_justificativa":"Ex-cliente com volume relevante e dor clara (entrega ruim do concorrente); esfriou por falta de follow-up.","urgencia":"media","orcamento":"adequado","objecao":"Insatisfação com entrega atual (a nosso favor)","info_coletada":["Ex-cliente de 2 anos atrás","Giro de ~R$60 mil/mês","Insatisfeita com entrega do concorrente"],"info_faltante":["Tabela foi enviada?","Pedido mínimo aceito"],"proxima_acao":"retomar_followup","resposta_sugerida":"Oi! Preparei a tabela com pronta entrega pro seu giro de ~60 mil/mês — e entrega é justamente onde a gente faz diferença. Quer que eu monte um pedido inicial pra você sentir o serviço na prática?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.72,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Conta de R$66k em Stand By, esfriando — reativar com proposta concreta e destacar entrega.","stage":"Stand By","nextAction":"Enviar tabela + pedido inicial sugerido","context_present":true,"context_version_used":1}'::jsonb),

    (v_company, v_owner, '5511993001003', 'Rede de 3 lojas quer centralizar compra de descartáveis/embalagens, ticket ~R$18-20k/mês. Decisor confirmado, pediu condição e prazo. Lead quente aguardando proposta.', 7, now(),
     '{"servico_interesse":"Compra centralizada (3 lojas)","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":83,"score_justificativa":"Rede com volume previsível, decisor confirmado e pedido explícito de condição; pronto para proposta.","urgencia":"alta","orcamento":"adequado","objecao":null,"info_coletada":["3 lojas","Ticket de R$ 18-20 mil/mês","Descartável é o maior consumo","Decisor confirmado"],"info_faltante":["Forma de pagamento preferida"],"proxima_acao":"enviar_proposta","resposta_sugerida":"Show! Pra 3 lojas com ~20 mil/mês fecho condição de escala: pedido único, entrega programada por loja e pagamento em 28 dias. Te mando a proposta detalhada ainda hoje, pode ser?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.83,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Lead quente de rede, decisor confirmado, pronto para proposta — responder rápido.","stage":"Qualificação","nextAction":"Enviar proposta de escala com prazo de pagamento","context_present":true,"context_version_used":1}'::jsonb),

    (v_company, v_owner, '5511993001004', 'Conecta quer subir o pedido de 1 para 2 paletes; acordamos 6% off + frete grátis. Ficou de confirmar espaço no estoque e sumiu há 34 dias. Pedido de ~R$23k a um passo do fechamento.', 5, now(),
     '{"servico_interesse":"Pedido de volume (2 paletes)","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":80,"score_justificativa":"Upsell de 1 para 2 paletes com desconto e frete já acordados; só falta confirmação de estoque do cliente.","urgencia":"alta","orcamento":"adequado","objecao":"Espaço de estoque","info_coletada":["Subiu de 1 para 2 paletes","6% de desconto acordado","Frete por nossa conta"],"info_faltante":["Confirmação de espaço no estoque"],"proxima_acao":"retomar_followup","resposta_sugerida":"Opa! Conseguiu confirmar o espaço no estoque? A condição dos 2 paletes com 6% e frete grátis está reservada pra você até sexta. Fecho o pedido?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.8,"knowledge_gaps":[]}'::jsonb,
     '{"sentiment":"Negócio de R$23k quase fechado, parado por follow-up — retomar com prazo.","stage":"Follow Up","nextAction":"Confirmar estoque e fechar os 2 paletes","context_present":true,"context_version_used":1}'::jsonb);

  -- ── Espelho legado (whatsapp_messages) p/ tenant guard ──────────────────────
  INSERT INTO public.whatsapp_messages
    (external_id, instance_name, user_id, company_id, chat_jid, chat_phone, phone_e164_tail, contact_name, is_group, direction, message_type, body, message_timestamp) VALUES
    ('demo-msi-1', 'wa_demo_msi', v_owner, v_company, '5511993001001@s.whatsapp.net', '5511993001001', '11993001001', 'Rede Farmais (Compras)', false, 'inbound', 'text', 'Vou alinhar o mix com o sócio e te retorno até sexta.', now()-interval '45 days'),
    ('demo-msi-2', 'wa_demo_msi', v_owner, v_company, '5511993001002@s.whatsapp.net', '5511993001002', '11993001002', 'Drogaria Efata', false, 'inbound', 'text', 'Beleza, fico no aguardo então.', now()-interval '38 days'),
    ('demo-msi-3', 'wa_demo_msi', v_owner, v_company, '5511993001003@s.whatsapp.net', '5511993001003', '11993001003', 'ICITIALI Soluções', false, 'inbound', 'text', 'Pode me passar a condição e o prazo de pagamento?', now()-interval '4 days'),
    ('demo-msi-4', 'wa_demo_msi', v_owner, v_company, '5511993001004@s.whatsapp.net', '5511993001004', '11993001004', 'Conecta Soluções', false, 'inbound', 'text', 'Deixa eu confirmar o espaço no estoque e te falo.', now()-interval '34 days'),
    ('demo-msi-5', 'wa_demo_msi', v_owner, v_company, '5511993001005@s.whatsapp.net', '5511993001005', '11993001005', 'Hallyu Import (Bruna)', false, 'inbound', 'text', 'Já volto a comprar mês que vem com o mix maior.', now()-interval '5 days');

  RAISE NOTICE 'DEMO.MSI.CONV rev2 aplicada: 5 conversas longas + EVA na company %.', v_company;
END
$do$;
