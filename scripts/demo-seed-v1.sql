-- ─────────────────────────────────────────────────────────────────────────────
-- Demo Seed v1 (2026-05-20) — Agência Metria Growth
--
-- Popula a company demo do Markus (00000000-0000-0000-0000-000000000001) com:
--   1. eva_business_context completo (agência + 2 serviços + ICP)
--   2. 4 conversas reais em whatsapp_messages (sem disparar Evolution)
--   3. 8 deals no pipeline (todos stages cobertos)
--
-- ⚠️ Não envia mensagem real de WhatsApp.
-- ⚠️ Não dispara whatsapp-copilot (Markus aciona via UI na Inbox).
-- ⚠️ Não cria company nem user novos — reaproveita os existentes.
--
-- Idempotência: marcadores fixos (raw_payload->>'demo_seed' = 'v1' nas messages,
-- lead_source = 'demo_seed_v1' nos deals). Rodar 2x não duplica.
--
-- Como rodar:
--   npx supabase db query --linked -f scripts/demo-seed-v1.sql
--
-- Como limpar:
--   npx supabase db query --linked -f scripts/demo-seed-v1-cleanup.sql
-- ─────────────────────────────────────────────────────────────────────────────

DO $demo$
DECLARE
  v_company_id uuid := '00000000-0000-0000-0000-000000000001';
  v_user_id    uuid := '99289fe5-9bf4-4323-8a18-4ccedef2126b';

  v_now       timestamptz := now();
  v_15m_ago   timestamptz := now() - interval '15 minutes';
  v_2h_ago    timestamptz := now() - interval '2 hours';
  v_1d_ago    timestamptz := now() - interval '1 day';
  v_3d_ago    timestamptz := now() - interval '3 days';

  v_deal_carla    uuid;
  v_deal_lucas    uuid;
  v_deal_fernanda uuid;
BEGIN
  -- ────────────────────────────────────────────────────────────────────────
  -- 0. Pre-flight: confere que company e user existem
  -- ────────────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
    RAISE EXCEPTION 'Demo seed abortado: company % não existe', v_company_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Demo seed abortado: user % não existe', v_user_id;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- 1. Cleanup do seed anterior (idempotência)
  -- ────────────────────────────────────────────────────────────────────────
  DELETE FROM public.whatsapp_messages
  WHERE company_id = v_company_id
    AND raw_payload->>'demo_seed' = 'v1';

  DELETE FROM public.deals
  WHERE company_id = v_company_id
    AND lead_source = 'demo_seed_v1';

  -- ────────────────────────────────────────────────────────────────────────
  -- 2. eva_business_context — Agência Metria Growth
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO public.eva_business_context (
    company_id, agency, services, icp, last_edited_by
  ) VALUES (
    v_company_id,
    jsonb_build_object(
      'descricao', 'Agência de tráfego pago e funil comercial. Atendemos clínicas, e-commerces, negócios locais e infoprodutores. Nosso foco é construir aquisição previsível com mídia paga + processo comercial estruturado.',
      'publico_alvo', 'Clínicas (estética, odonto, fitness), e-commerces, negócios locais com atendimento por WhatsApp e infoprodutores em fase de tração.',
      'ticket_medio', 'R$ 3.500/mês (mínimo R$ 2.500, máximo R$ 8.000)',
      'tom_de_voz', 'Consultivo, direto e profissional. Tratamos por você. Sem jargão técnico no primeiro contato.',
      'palavras_proibidas', jsonb_build_array('garanto', 'sempre', 'fácil', 'milagre', 'rápido'),
      'horario_atendimento', jsonb_build_object(
        'dias', 'Segunda a sexta',
        'inicio', '09:00',
        'fim', '18:00',
        'fuso', 'America/Sao_Paulo (UTC-3)'
      ),
      'regras_handoff', 'Avisar humano imediatamente quando o lead: pediu proposta, quer fechar, pediu desconto, demonstrou urgência alta, levantou objeção de preço, pediu contrato, ou quer marcar reunião.',
      'promessas_proibidas', jsonb_build_array(
        'ROI garantido',
        'Resultado em prazo fixo',
        'Leads garantidos',
        'Escalar sem validar orçamento'
      ),
      'observacoes', 'Não trabalhamos com nichos restritivos (jogo de azar, criptoativos, política). Contratos mínimos de 3 meses.'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', 'svc_metria_trafego',
        'nome', 'Gestão de tráfego Meta + Google',
        'descricao', 'Setup de campanhas, gestão diária, criativos, otimização de ROI e relatório semanal. Foco em volume + qualidade de leads.',
        'preco_min', 2500,
        'preco_max', 8000,
        'modelo_cobranca', 'mensal',
        'perguntas_obrigatorias', jsonb_build_array(
          'Já investe em tráfego?',
          'Quanto investe por mês?',
          'Qual meta principal?',
          'Qual ticket médio?',
          'Quer começar quando?'
        ),
        'objecoes', jsonb_build_array(
          jsonb_build_object(
            'objecao', 'Está caro',
            'resposta_sugerida', 'Comparado ao custo de não bater meta de leads esse mês, o investimento se paga já no primeiro ciclo. Posso te mostrar a projeção com seu ticket médio?'
          ),
          jsonb_build_object(
            'objecao', 'Já tenho fornecedor',
            'resposta_sugerida', 'Faz sentido. Posso pelo menos te enviar nossa metodologia para comparação? Sem compromisso de troca.'
          )
        ),
        'criterios_bom_fit', jsonb_build_array(
          'Já investe há 3+ meses em ads',
          'Faturamento acima de R$ 50k/mês',
          'Tem time interno respondendo leads',
          'Quer escalar reuniões'
        ),
        'criterios_baixo_fit', jsonb_build_array(
          'Nunca rodou ads',
          'Sem orçamento mensal definido',
          'Sem operação ativa'
        )
      ),
      jsonb_build_object(
        'id', 'svc_metria_diagnostico',
        'nome', 'Diagnóstico de funil comercial',
        'descricao', 'Auditoria completa do funil de aquisição → conversão. Análise de canais, scripts, pipeline e fechamento.',
        'preco_min', 900,
        'preco_max', 2000,
        'modelo_cobranca', 'unico',
        'perguntas_obrigatorias', jsonb_build_array(
          'Onde os leads chegam hoje?',
          'Quem responde os leads?',
          'Existe pipeline?',
          'Quantas reuniões marca por semana?'
        ),
        'objecoes', jsonb_build_array(
          jsonb_build_object(
            'objecao', 'Já sei onde está o problema',
            'resposta_sugerida', 'Faz sentido. Posso te mandar nosso checklist de diagnóstico pra você validar internamente?'
          )
        ),
        'criterios_bom_fit', jsonb_build_array(
          'Tem volume de leads mas baixa conversão',
          'Quer profissionalizar o processo'
        ),
        'criterios_baixo_fit', jsonb_build_array('Operação completamente nova')
      )
    ),
    jsonb_build_object(
      'descricao', 'Agências, clínicas, e-commerces e infoprodutores com operação ativa, recebendo leads pelo WhatsApp e querendo aumentar volume + previsibilidade de reuniões. Decisor envolvido e verba mensal definida.',
      'criterios_bom_fit', jsonb_build_array(
        'Negócio ativo',
        'Recebe leads pelo WhatsApp',
        'Tem verba mensal',
        'Quer aumentar reuniões',
        'Decisor envolvido na conversa'
      ),
      'criterios_medio_fit', jsonb_build_array(
        'Operação ativa mas orçamento indefinido',
        'Comparando fornecedores',
        'Precisa entender melhor a proposta'
      ),
      'criterios_baixo_fit', jsonb_build_array(
        'Sem orçamento',
        'Sem operação ativa',
        'Pesquisando apenas preço'
      ),
      'criterios_sem_fit', jsonb_build_array(
        'Nicho restritivo (jogo de azar, política, etc)',
        'Sem decisor envolvido'
      ),
      'regras_pontuacao', jsonb_build_array(
        jsonb_build_object('criterio', 'Já investe em ads há 3+ meses', 'pontos', 25),
        jsonb_build_object('criterio', 'Faturamento acima de R$ 50k/mês', 'pontos', 20),
        jsonb_build_object('criterio', 'Pediu proposta ou reunião', 'pontos', 30),
        jsonb_build_object('criterio', 'Decisor confirmado', 'pontos', 15),
        jsonb_build_object('criterio', 'Sem orçamento', 'pontos', -40),
        jsonb_build_object('criterio', 'Empresa não aberta ainda', 'pontos', -50),
        jsonb_build_object('criterio', 'Comparando só preço', 'pontos', -20)
      )
    ),
    v_user_id
  )
  ON CONFLICT (company_id) DO UPDATE
  SET
    agency        = EXCLUDED.agency,
    services      = EXCLUDED.services,
    icp           = EXCLUDED.icp,
    last_edited_by = EXCLUDED.last_edited_by;

  RAISE NOTICE 'eva_business_context: ok';

  -- ────────────────────────────────────────────────────────────────────────
  -- 3. Conversas em whatsapp_messages
  -- raw_payload jsonb tem chave demo_seed=v1 pra cleanup.
  -- chat_phone SEM "+" (convenção da tabela, confirmada em F4E.4.4.1).
  -- ────────────────────────────────────────────────────────────────────────

  -- Conversa 1 — Carla Ribeiro (3 mensagens)
  -- external_id NOT NULL: gerado sinteticamente "demo_v1_<slug>_<n>"
  INSERT INTO public.whatsapp_messages (
    external_id, instance_name, user_id, company_id,
    chat_jid, chat_phone, phone_e164_tail, contact_name,
    is_group, direction, message_type, body,
    message_timestamp, received_at, raw_payload
  ) VALUES
  ('demo_v1_carla_1', 'demo_seed_v1', v_user_id, v_company_id,
    '5511999100001@s.whatsapp.net', '5511999100001', '99100001', 'Carla Ribeiro',
    false, 'inbound', 'text',
    'Oi, vi o anúncio de vocês sobre tráfego para clínicas. Queria entender os planos, estou precisando aumentar os agendamentos esse mês.',
    v_15m_ago - interval '5 min', v_15m_ago - interval '5 min',
    jsonb_build_object('demo_seed', 'v1', 'origin', 'Meta Ads', 'company_context', 'Clínica de Estética')),
  ('demo_v1_carla_2', 'demo_seed_v1', v_user_id, v_company_id,
    '5511999100001@s.whatsapp.net', '5511999100001', '99100001', 'Carla Ribeiro',
    false, 'outbound', 'text',
    'Oi, Carla! Claro, consigo te ajudar. Hoje vocês já investem em tráfego ou estão começando agora?',
    v_15m_ago - interval '3 min', v_15m_ago - interval '3 min',
    jsonb_build_object('demo_seed', 'v1')),
  ('demo_v1_carla_3', 'demo_seed_v1', v_user_id, v_company_id,
    '5511999100001@s.whatsapp.net', '5511999100001', '99100001', 'Carla Ribeiro',
    false, 'inbound', 'text',
    'Já investimos um pouco, mas sem muita consistência. Quero algo mais previsível.',
    v_15m_ago, v_15m_ago,
    jsonb_build_object('demo_seed', 'v1', 'origin', 'Meta Ads'));

  -- Conversa 2 — Lucas Andrade
  INSERT INTO public.whatsapp_messages (
    external_id, instance_name, user_id, company_id,
    chat_jid, chat_phone, phone_e164_tail, contact_name,
    is_group, direction, message_type, body,
    message_timestamp, received_at, raw_payload
  ) VALUES
  ('demo_v1_lucas_1', 'demo_seed_v1', v_user_id, v_company_id,
    '5511999100002@s.whatsapp.net', '5511999100002', '99100002', 'Lucas Andrade',
    false, 'inbound', 'text',
    'Olá! Recebi a proposta de vocês ontem. Gostei bastante, mas achei o valor um pouco alto. Vocês conseguem fazer algo mais em conta?',
    v_2h_ago, v_2h_ago,
    jsonb_build_object('demo_seed', 'v1', 'origin', 'Instagram', 'company_context', 'Odonto Prime'));

  -- Conversa 3 — Bruno Martins
  INSERT INTO public.whatsapp_messages (
    external_id, instance_name, user_id, company_id,
    chat_jid, chat_phone, phone_e164_tail, contact_name,
    is_group, direction, message_type, body,
    message_timestamp, received_at, raw_payload
  ) VALUES
  ('demo_v1_bruno_1', 'demo_seed_v1', v_user_id, v_company_id,
    '5511999100003@s.whatsapp.net', '5511999100003', '99100003', 'Bruno Martins',
    false, 'inbound', 'text',
    'Boa tarde. Só queria saber preço mesmo. Ainda não tenho empresa aberta, estou pesquisando antes de começar.',
    v_1d_ago, v_1d_ago,
    jsonb_build_object('demo_seed', 'v1', 'origin', 'Facebook', 'company_context', 'Sem empresa aberta'));

  -- Conversa 4 — Fernanda Paiva
  INSERT INTO public.whatsapp_messages (
    external_id, instance_name, user_id, company_id,
    chat_jid, chat_phone, phone_e164_tail, contact_name,
    is_group, direction, message_type, body,
    message_timestamp, received_at, raw_payload
  ) VALUES
  ('demo_v1_fernanda_1', 'demo_seed_v1', v_user_id, v_company_id,
    '5511999100004@s.whatsapp.net', '5511999100004', '99100004', 'Fernanda Paiva',
    false, 'inbound', 'text',
    'Oi! Vi vocês no Google. Já invisto R$ 5 mil por mês em tráfego, mas não estou conseguindo escalar. Podemos conversar amanhã às 14h?',
    v_3d_ago + interval '30 min', v_3d_ago + interval '30 min',
    jsonb_build_object('demo_seed', 'v1', 'origin', 'Google Ads', 'company_context', 'E-commerce de Moda'));

  RAISE NOTICE 'whatsapp_messages: 6 mensagens em 4 conversas';

  -- ────────────────────────────────────────────────────────────────────────
  -- 4. Deals no pipeline (todos os stages)
  -- lead_source = 'demo_seed_v1' pra cleanup
  -- ────────────────────────────────────────────────────────────────────────

  -- Capture IDs dos 3 primeiros (Carla, Lucas, Fernanda) pra eventualmente
  -- linkar com whatsapp_messages.deal_id, se Markus quiser depois.

  INSERT INTO public.deals (
    title, customer_name, value, stage, user_id, company_id,
    lead_source, notes, expected_close_date, created_at, updated_at
  )
  VALUES
    ('Tráfego Meta — Carla Ribeiro (Clínica de Estética)',
     'Carla Ribeiro', 3500, 'lead', v_user_id, v_company_id,
     'demo_seed_v1',
     'Lead Meta Ads. Clínica de estética em SP. Quer aumentar agendamentos.',
     CURRENT_DATE + interval '20 days', v_15m_ago, v_15m_ago)
  RETURNING id INTO v_deal_carla;

  INSERT INTO public.deals (
    title, customer_name, value, stage, user_id, company_id,
    lead_source, notes, expected_close_date, created_at, updated_at
  )
  VALUES
    ('Tráfego — Lucas Andrade (Odonto Prime)',
     'Lucas Andrade', 4200, 'qualification', v_user_id, v_company_id,
     'demo_seed_v1',
     'Lead Instagram. Odonto. Levantou objeção de preço.',
     CURRENT_DATE + interval '15 days', v_2h_ago, v_2h_ago)
  RETURNING id INTO v_deal_lucas;

  INSERT INTO public.deals (
    title, customer_name, value, stage, user_id, company_id,
    lead_source, notes, expected_close_date, created_at, updated_at
  )
  VALUES
    ('Tráfego — Fernanda Paiva (E-commerce Moda)',
     'Fernanda Paiva', 6000, 'qualification', v_user_id, v_company_id,
     'demo_seed_v1',
     'Lead Google Ads. E-commerce moda. Já investe R$ 5k/mês, quer escalar.',
     CURRENT_DATE + interval '10 days', v_3d_ago + interval '30 min', v_3d_ago + interval '30 min')
  RETURNING id INTO v_deal_fernanda;

  -- Vincula as conversas aos deals (deal_id)
  UPDATE public.whatsapp_messages SET deal_id = v_deal_carla
   WHERE chat_phone = '5511999100001' AND raw_payload->>'demo_seed' = 'v1';
  UPDATE public.whatsapp_messages SET deal_id = v_deal_lucas
   WHERE chat_phone = '5511999100002' AND raw_payload->>'demo_seed' = 'v1';
  UPDATE public.whatsapp_messages SET deal_id = v_deal_fernanda
   WHERE chat_phone = '5511999100004' AND raw_payload->>'demo_seed' = 'v1';

  -- Demais deals (sem conversa associada)
  INSERT INTO public.deals (
    title, customer_name, value, stage, user_id, company_id,
    lead_source, notes, expected_close_date, created_at, updated_at
  ) VALUES
  ('Diagnóstico — Pedro Almeida (Mentoria Fitness)',
   'Pedro Almeida', 5000, 'proposal', v_user_id, v_company_id,
   'demo_seed_v1',
   'Mentoria fitness. Proposta enviada na semana passada.',
   CURRENT_DATE + interval '7 days', v_3d_ago, v_2h_ago),
  ('Tráfego — Ricardo Nunes (Franquia Local)',
   'Ricardo Nunes', 7800, 'negotiation', v_user_id, v_company_id,
   'demo_seed_v1',
   'Franquia local. Em negociação de prazo e escopo.',
   CURRENT_DATE + interval '5 days', v_3d_ago, v_15m_ago - interval '10 min'),
  ('Tráfego mensal — Clínica Viva Bem',
   'Clínica Viva Bem', 4500, 'closed_won', v_user_id, v_company_id,
   'demo_seed_v1',
   'Ganho. Fechou setup + 3 meses.',
   CURRENT_DATE - interval '5 days', v_3d_ago - interval '7 days', v_3d_ago - interval '5 days'),
  ('Tráfego mensal — Instituto Bella Pele',
   'Instituto Bella Pele', 3200, 'closed_won', v_user_id, v_company_id,
   'demo_seed_v1',
   'Ganho. Cliente recorrente.',
   CURRENT_DATE - interval '12 days', v_3d_ago - interval '20 days', v_3d_ago - interval '12 days'),
  ('Diagnóstico — Loja FitMax',
   'Loja FitMax', 2500, 'closed_lost', v_user_id, v_company_id,
   'demo_seed_v1',
   'Perdido. Sem orçamento aprovado.',
   CURRENT_DATE - interval '10 days', v_3d_ago - interval '15 days', v_3d_ago - interval '10 days');

  RAISE NOTICE 'deals: 8 deals criados (lead/qualification/proposal/negotiation/won/lost)';

  -- ────────────────────────────────────────────────────────────────────────
  -- 5. Bump version do eva_business_context (já feito pelo trigger no UPSERT)
  -- Pra forçar Eva a reanalisar conversas que tinham cached_analysis antigo,
  -- limpamos qualquer conversation_summaries dessas 4 conversas demo.
  -- ────────────────────────────────────────────────────────────────────────
  DELETE FROM public.conversation_summaries
   WHERE user_id = v_user_id
     AND chat_phone IN ('+5511999100001','+5511999100002','+5511999100003','+5511999100004');

  RAISE NOTICE 'conversation_summaries das demos limpas (vão ser geradas ao abrir Inbox)';
  RAISE NOTICE '✅ Demo Seed v1 aplicado com sucesso.';
END;
$demo$;

-- Resumo final pra inspeção rápida
SELECT 'eva_business_context' AS what,
       jsonb_array_length(services) AS svc,
       version
FROM public.eva_business_context
WHERE company_id = '00000000-0000-0000-0000-000000000001';

SELECT 'whatsapp_messages' AS what,
       COUNT(*)::int AS rows,
       COUNT(DISTINCT chat_phone)::int AS conversas
FROM public.whatsapp_messages
WHERE company_id = '00000000-0000-0000-0000-000000000001'
  AND raw_payload->>'demo_seed' = 'v1';

SELECT 'deals' AS what,
       stage,
       COUNT(*)::int AS qtd,
       SUM(value)::int AS total
FROM public.deals
WHERE company_id = '00000000-0000-0000-0000-000000000001'
  AND lead_source = 'demo_seed_v1'
GROUP BY stage
ORDER BY stage;
