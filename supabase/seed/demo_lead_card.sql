-- Lead novo de demonstração: conversa qualificada (deve_criar_oportunidade) SEM
-- deal vinculado, pra mostrar o card "Novo lead pronto pro pipeline" da EVA ao
-- vivo no Inbox. Ambiente: Agência Metria Growth. Telefone único 5511987654321.
-- Limpar depois: DELETE pelos ids aa000000-...d001/d101 + summary por chat_phone.

DO $$
DECLARE
  v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702';
  v_conn    uuid := 'de0cfc04-79b8-44b2-baf6-b635790f4ea0';
  v_owner   uuid := '10a4e304-a1a6-4fdf-9778-5aff61f9b71a';
  v_contact uuid := 'aa000000-0000-4000-8000-00000000d001';
  v_conv    uuid := 'aa000000-0000-4000-8000-00000000d101';
BEGIN
  INSERT INTO public.channel_contacts
    (id, company_id, connection_id, external_contact_id, phone_e164, phone_tail, name, is_group, metadata)
  VALUES
    (v_contact, v_company, v_conn, '5511987654321@s.whatsapp.net', '5511987654321', '11987654321',
     'Imobiliária Vista Bela · Rafael', false, '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Conversa SEM deal (fora do pipeline) — lead falou por último, não lida.
  INSERT INTO public.channel_conversations
    (id, company_id, connection_id, contact_id, deal_id, status, last_message_at, last_inbound_at, last_outbound_at, unread_count, metadata)
  VALUES
    (v_conv, v_company, v_conn, v_contact, NULL, 'open',
     now()-interval '4 min', now()-interval '4 min', now()-interval '20 min', 2, '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Conversa de intenção de compra crescente (lead encerra pedindo proposta).
  INSERT INTO public.channel_messages
    (company_id, connection_id, conversation_id, contact_id, provider_message_id, direction, message_type, body, media_ref, status, message_timestamp, metadata)
  VALUES
    (v_company, v_conn, v_conv, v_contact, 'demo-lc-1', 'inbound',  'text', 'Oi! Vi vocês no Instagram. Sou o Rafael, da Imobiliária Vista Bela. Queria gerar mais leads de venda de imóvel.', '{}'::jsonb, 'received', now()-interval '25 min', '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb),
    (v_company, v_conn, v_conv, v_contact, 'demo-lc-2', 'outbound', 'text', 'Oi Rafael, que bom ter vocês aqui! Vocês já investem em tráfego pago hoje?', '{}'::jsonb, 'read', now()-interval '22 min', '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb),
    (v_company, v_conn, v_conv, v_contact, 'demo-lc-3', 'inbound',  'text', 'A gente só impulsionou no Instagram, mas não veio nada qualificado. Queremos algo sério agora.', '{}'::jsonb, 'received', now()-interval '20 min', '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb),
    (v_company, v_conn, v_conv, v_contact, 'demo-lc-4', 'outbound', 'text', 'Entendi. Qual a verba mensal de anúncio que vocês pensam em investir?', '{}'::jsonb, 'read', now()-interval '20 min', '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb),
    (v_company, v_conn, v_conv, v_contact, 'demo-lc-5', 'inbound',  'text', 'Uns R$ 8 mil por mês em anúncio, fora o serviço de vocês. Tô com pressa: temos um lançamento mês que vem.', '{}'::jsonb, 'received', now()-interval '6 min', '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb),
    (v_company, v_conn, v_conv, v_contact, 'demo-lc-6', 'inbound',  'text', 'Consegue me mandar uma proposta? Quero fechar essa semana.', '{}'::jsonb, 'received', now()-interval '4 min', '{"demo_seed":"DEMO.LEAD.CARD"}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- Resumo + qualificação quente → dispara o card "Novo lead pronto pro pipeline".
  INSERT INTO public.conversation_summaries
    (company_id, user_id, chat_phone, summary, message_count, analyzed_at, qualification, cached_analysis)
  VALUES (
    v_company, v_owner, '5511987654321',
    'Rafael, da Imobiliária Vista Bela, quer tráfego pago pra gerar leads de venda de imóvel. Já impulsionou sem resultado, tem verba de R$ 8 mil/mês em anúncio, urgência por um lançamento no mês que vem e pediu proposta pra fechar esta semana.',
    6, now(),
    jsonb_build_object(
      'intencao','compra',
      'temperatura','quente',
      'urgencia','alta',
      'confianca',0.88,
      'orcamento','alto',
      'fit_sugerido','alto',
      'proxima_acao','criar_oportunidade',
      'servico_interesse','Gestão de Tráfego Pago para imobiliária',
      'score_sugerido',86,
      'deve_criar_oportunidade',true,
      'deve_fazer_handoff',false,
      'resposta_sugerida','Rafael, dá pra montar isso sim. Pelo seu cenário (verba de R$ 8 mil/mês e lançamento no mês que vem), faz total sentido começar pelo nosso diagnóstico de 30 min pra desenhar a campanha certa e já te mandar a proposta. Consigo te encaixar ainda esta semana, qual o melhor dia pra você?',
      'info_coletada', jsonb_build_array('Imobiliária Vista Bela','Quer leads de venda de imóvel','Já impulsionou no Instagram sem resultado','Verba de R$ 8 mil/mês em anúncio','Lançamento no mês que vem (urgência)','Pediu proposta pra fechar esta semana'),
      'info_faltante', jsonb_build_array('Cidade/região de atuação','Ticket médio dos imóveis','Quem decide o fechamento')
    ),
    NULL
  )
  ON CONFLICT (user_id, chat_phone) DO UPDATE
    SET qualification = EXCLUDED.qualification, summary = EXCLUDED.summary, analyzed_at = now();
END $$;

SELECT 'lead de demonstração criado' AS ok;
