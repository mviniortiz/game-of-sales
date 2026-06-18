-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.LANDING.FIX (2026-06-18) — cura o ambiente da DEMO da landing.
--
-- Problema: a company da demo (resolvida via landing-demo@vyzon.com.br) tinha
-- conversas/deals copiados do clone MAS 0 channel_connections (o seed esquecia
-- de criar a conexão) → o Inbox filtra conversas por connection ativa e ficava
-- VAZIO. Também acumulou ~49 deals e 0 análises da EVA.
--
-- Esta cura RESETA os dados de canal/deals/summaries da company demo (são
-- descartáveis) e reinsere um conjunto CURADO: 1 conexão ATIVA + 5 contatos +
-- 5 conversas + 10 mensagens + 5 análises da EVA + 3 deals. Resolve company+owner
-- dinamicamente e usa IDs únicos (gen_random_uuid) pra não colidir com a company
-- fonte (que tem os mesmos IDs fixos). Idempotente (reset por company). Atômico.
--
-- Rodar: npx supabase db query --linked -f supabase/seed/demo_landing_curate.sql
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_company uuid;
  v_owner   uuid;
  v_conn    uuid := gen_random_uuid();
  v_inst    text;
  v_c1 uuid := gen_random_uuid(); v_c2 uuid := gen_random_uuid(); v_c3 uuid := gen_random_uuid();
  v_c4 uuid := gen_random_uuid(); v_c5 uuid := gen_random_uuid();
  v_d1 uuid := gen_random_uuid(); v_d2 uuid := gen_random_uuid(); v_d3 uuid := gen_random_uuid();
  v_cv1 uuid := gen_random_uuid(); v_cv2 uuid := gen_random_uuid(); v_cv3 uuid := gen_random_uuid();
  v_cv4 uuid := gen_random_uuid(); v_cv5 uuid := gen_random_uuid();
BEGIN
  select p.company_id, p.id into v_company, v_owner
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = 'landing-demo@vyzon.com.br'
  order by p.created_at asc
  limit 1;

  if v_company is null then
    raise exception 'Demo company (landing-demo@vyzon.com.br) não encontrada — abra a demo uma vez pra criá-la.';
  end if;
  v_inst := 'wa_' || replace(v_owner::text, '-', '');

  -- ── Reset total dos dados de canal/pipeline da company demo (descartáveis) ──
  delete from public.channel_messages       where company_id = v_company;
  delete from public.channel_conversations   where company_id = v_company;
  delete from public.channel_contacts        where company_id = v_company;
  delete from public.deals                   where company_id = v_company;
  delete from public.conversation_summaries  where company_id = v_company;
  delete from public.whatsapp_messages       where company_id = v_company;
  delete from public.channel_connections     where company_id = v_company;

  -- ── Conexão ATIVA (o que faltava → Inbox vazio) ─────────────────────────────
  insert into public.channel_connections
    (id, company_id, provider, channel_type, status, display_name, external_id, capabilities, metadata, created_by)
  values
    (v_conn, v_company, 'evolution', 'whatsapp', 'active', 'WhatsApp Comercial', v_inst, '{}'::jsonb, '{"demo_seed":"DEMO.1"}'::jsonb, v_owner);

  -- ── Contatos ────────────────────────────────────────────────────────────────
  insert into public.channel_contacts (id, company_id, connection_id, external_contact_id, phone_e164, phone_tail, name, is_group, metadata) values
  (v_c1, v_company, v_conn, '5511990001001@s.whatsapp.net','5511990001001','1990001001','Carla Ribeiro',false,'{"demo_seed":"DEMO.1"}'::jsonb),
  (v_c2, v_company, v_conn, '5511990001002@s.whatsapp.net','5511990001002','1990001002','Mayara Sampaio',false,'{"demo_seed":"DEMO.1"}'::jsonb),
  (v_c3, v_company, v_conn, '5511990001003@s.whatsapp.net','5511990001003','1990001003','Jean Spinola',false,'{"demo_seed":"DEMO.1"}'::jsonb),
  (v_c4, v_company, v_conn, '5511990001004@s.whatsapp.net','5511990001004','1990001004','Fernanda Paiva',false,'{"demo_seed":"DEMO.1"}'::jsonb),
  (v_c5, v_company, v_conn, '5511990001005@s.whatsapp.net','5511990001005','1990001005','Pedro Almeida',false,'{"demo_seed":"DEMO.1"}'::jsonb);

  -- ── Deals (curados: 3) ───────────────────────────────────────────────────────
  insert into public.deals (id, company_id, user_id, title, customer_name, customer_phone, stage, value, is_hot, lead_source, probability, source_data, created_at, updated_at) values
  (v_d1, v_company, v_owner, 'Tráfego pago - Carla Ribeiro','Carla Ribeiro','+5511990001001','qualification',4500,true,'meta_ads',40,'{"demo_seed":"DEMO.1"}'::jsonb, now()-interval '1 day', now()-interval '2 hours'),
  (v_d2, v_company, v_owner, 'Tráfego local - Jean Spinola','Jean Spinola','+5511990001003','proposal',3200,false,'indicacao',60,'{"demo_seed":"DEMO.1"}'::jsonb, now()-interval '4 days', now()-interval '1 day'),
  (v_d3, v_company, v_owner, 'Gestão de tráfego - Fernanda Paiva','Fernanda Paiva','+5511990001004','negotiation',2800,false,'meta_ads',30,'{"demo_seed":"DEMO.1"}'::jsonb, now()-interval '12 days', now()-interval '9 days');

  -- ── Enriquece a lead que a demo ABRE (Carla, 1ª de qualificação) ────────────
  update public.deals set
    customer_email = 'carla@clinicaessenza.com.br',
    expected_close_date = (now() + interval '12 days')::date,
    notes = 'Clínica de estética (Essenza) que veio do Meta Ads querendo escalar tráfego pago. Primeiro contato pelo WhatsApp; quer entender os planos e quanto investir por mês.'
  where id = v_d1;

  insert into public.deal_notes (deal_id, user_id, company_id, content, created_at) values
  (v_d1, v_owner, v_company, 'Primeiro contato pelo WhatsApp, veio do anúncio no Meta Ads. Tem uma clínica de estética e quer começar tráfego pago.', now() - interval '3 hours'),
  (v_d1, v_owner, v_company, 'A EVA leu a conversa: intenção de preço, temperatura quente (score 82). Próximo passo sugerido: perguntar orçamento mensal e a cidade/raio de atendimento.', now() - interval '2 hours 50 minutes'),
  (v_d1, v_owner, v_company, 'Pediu pra entender os planos. Preparar resposta com um diagnóstico inicial antes de cravar valor.', now() - interval '2 hours');

  insert into public.deal_activities (deal_id, user_id, company_id, activity_type, description, new_value, created_at) values
  (v_d1, v_owner, v_company, 'created', 'Oportunidade criada a partir de um lead no WhatsApp', 'lead', now() - interval '1 day'),
  (v_d1, v_owner, v_company, 'stage_changed', 'Movida para Qualificação pela EVA', 'qualification', now() - interval '23 hours'),
  (v_d1, v_owner, v_company, 'note_added', 'Análise da EVA salva: lead quente, intenção de preço', null, now() - interval '2 hours 50 minutes'),
  (v_d1, v_owner, v_company, 'field_updated', 'Probabilidade ajustada para 40%', '40', now() - interval '2 hours');

  -- ── Conversas (Carla/Jean vinculadas a deal) ────────────────────────────────
  insert into public.channel_conversations (id, company_id, connection_id, contact_id, deal_id, status, last_message_at, last_inbound_at, last_outbound_at, unread_count, metadata) values
  (v_cv1, v_company, v_conn, v_c1, v_d1, 'open', now()-interval '2 hours 55 minutes', now()-interval '2 hours 55 minutes', null, 2, '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_cv2, v_company, v_conn, v_c2, null, 'open', now()-interval '6 hours', now()-interval '6 hours', null, 1, '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_cv3, v_company, v_conn, v_c3, v_d2, 'open', now()-interval '2 days', now()-interval '3 days', now()-interval '2 days', 0, '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_cv4, v_company, v_conn, v_c4, null, 'open', now()-interval '8 days 23 hours', now()-interval '9 days', now()-interval '8 days 23 hours', 0, '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_cv5, v_company, v_conn, v_c5, null, 'open', now()-interval '4 days 23 hours', now()-interval '5 days', now()-interval '4 days 23 hours', 0, '{"demo_seed":"DEMO.1"}'::jsonb);

  -- ── Mensagens ───────────────────────────────────────────────────────────────
  insert into public.channel_messages (company_id, connection_id, conversation_id, contact_id, provider_message_id, direction, message_type, body, media_ref, status, message_timestamp, metadata) values
  (v_company, v_conn, v_cv1, v_c1, gen_random_uuid()::text,'inbound','text','Oi, vi o anúncio e queria entender os planos.','{}'::jsonb,'received', now()-interval '3 hours', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv1, v_c1, gen_random_uuid()::text,'inbound','text','Tenho uma clínica de estética e quero rodar tráfego pago.','{}'::jsonb,'received', now()-interval '2 hours 55 minutes', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv2, v_c2, gen_random_uuid()::text,'inbound','text','Oi! Queria um diagnóstico comercial da minha operação.','{}'::jsonb,'received', now()-interval '6 hours', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv3, v_c3, gen_random_uuid()::text,'inbound','text','Vim por indicação do Rafael. Faço tráfego pra um negócio local.','{}'::jsonb,'received', now()-interval '3 days', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv3, v_c3, gen_random_uuid()::text,'outbound','text','Boa, Jean! Já preparo uma proposta de tráfego local pra você.','{}'::jsonb,'sent', now()-interval '2 days', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv4, v_c4, gen_random_uuid()::text,'inbound','text','Achei o valor um pouco alto pra agência.','{}'::jsonb,'received', now()-interval '9 days', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv4, v_c4, gen_random_uuid()::text,'outbound','text','Entendo, Fernanda. Posso te mostrar o retorno esperado antes de fechar?','{}'::jsonb,'sent', now()-interval '8 days 23 hours', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv5, v_c5, gen_random_uuid()::text,'inbound','text','Vocês fazem site? Não quero tráfego.','{}'::jsonb,'received', now()-interval '5 days', '{"demo_seed":"DEMO.1"}'::jsonb),
  (v_company, v_conn, v_cv5, v_c5, gen_random_uuid()::text,'outbound','text','Oi Pedro! Nosso foco é tráfego e comercial, não criação de site.','{}'::jsonb,'sent', now()-interval '4 days 23 hours', '{"demo_seed":"DEMO.1"}'::jsonb);

  -- ── Análise salva da EVA (conversation_summaries) ───────────────────────────
  insert into public.conversation_summaries (company_id, user_id, chat_phone, summary, message_count, analyzed_at, qualification, cached_analysis) values
  (v_company, v_owner, '5511990001001','Clínica de estética veio do Meta Ads querendo entender planos de tráfego pago.',2, now(),
   '{"servico_interesse":"Tráfego pago","intencao":"preco","temperatura":"quente","fit_sugerido":"bom","score_sugerido":82,"score_justificativa":"Clínica com intenção clara de escalar tráfego.","urgencia":"alta","orcamento":"nao_informado","objecao":null,"info_coletada":["Segmento: clínica de estética","Veio de anúncio Meta"],"info_faltante":["Orçamento mensal","Cidade e raio de atendimento"],"proxima_acao":"responder","resposta_sugerida":"Perfeito, Carla! Hoje vocês já investem em tráfego ou estão começando agora? Me diz o orçamento mensal que eu já te mostro o melhor caminho.","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.82,"knowledge_gaps":[]}'::jsonb,
   '{"sentiment":"Lead quente de clínica de estética interessada em tráfego pago.","stage":"Qualificação","nextAction":"Perguntar orçamento e cidade antes de propor","context_present":true,"context_version_used":1}'::jsonb),
  (v_company, v_owner, '5511990001002','Quer um diagnóstico comercial; ainda sem urgência definida.',1, now(),
   '{"servico_interesse":"Diagnóstico comercial","intencao":"duvida","temperatura":"morno","fit_sugerido":"medio","score_sugerido":55,"score_justificativa":"Interesse em diagnóstico, sem urgência clara.","urgencia":"media","orcamento":"nao_informado","objecao":null,"info_coletada":["Quer diagnóstico comercial"],"info_faltante":["Tamanho do time comercial","Principal gargalo hoje"],"proxima_acao":"qualificar","resposta_sugerida":"Oi Mayara! Pra montar o diagnóstico certo, me conta: quantas pessoas no comercial e qual o maior gargalo hoje?","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.6,"knowledge_gaps":[]}'::jsonb,
   '{"sentiment":"Lead pedindo diagnóstico comercial, aguardando retorno.","stage":"Qualificação","nextAction":"Coletar tamanho do time e gargalo","context_present":true,"context_version_used":1}'::jsonb),
  (v_company, v_owner, '5511990001003','Veio por indicação; tráfego para negócio local, pronto para proposta.',2, now(),
   '{"servico_interesse":"Tráfego pago","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":78,"score_justificativa":"Indicação qualificada, pronto para receber proposta.","urgencia":"alta","orcamento":"adequado","objecao":null,"info_coletada":["Indicação do Rafael","Negócio local"],"info_faltante":["Ticket médio atual"],"proxima_acao":"criar_oportunidade","resposta_sugerida":"Boa, Jean! Já te preparo a proposta de tráfego local. Qual seu ticket médio hoje pra eu calibrar a meta?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.78,"knowledge_gaps":[]}'::jsonb,
   '{"sentiment":"Indicação quente para tráfego local, em fase de proposta.","stage":"Proposta","nextAction":"Enviar proposta de tráfego local","context_present":true,"context_version_used":1}'::jsonb),
  (v_company, v_owner, '5511990001004','Fit ok, mas travou no preço da agência.',2, now(),
   '{"servico_interesse":"Gestão de tráfego","intencao":"preco","temperatura":"morno","fit_sugerido":"medio","score_sugerido":50,"score_justificativa":"Fit adequado, mas com objeção de preço.","urgencia":"media","orcamento":"baixo","objecao":"Acha o valor alto para uma agência","info_coletada":["Comparando preço"],"info_faltante":["Faturamento atual"],"proxima_acao":"responder","resposta_sugerida":"Entendo, Fernanda. Posso te mostrar o retorno esperado e desenhar um escopo que cabe no seu momento?","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.6,"knowledge_gaps":[]}'::jsonb,
   '{"sentiment":"Lead com objeção de preço; precisa de prova de retorno.","stage":"Negociação","nextAction":"Apresentar retorno esperado e escopo flexível","context_present":true,"context_version_used":1}'::jsonb),
  (v_company, v_owner, '5511990001005','Procura criação de site; fora do ICP de tráfego e comercial.',2, now(),
   '{"servico_interesse":"Criação de site","intencao":"duvida","temperatura":"frio","fit_sugerido":"baixo","score_sugerido":20,"score_justificativa":"Demanda fora do foco da agência (site, não tráfego).","urgencia":"baixa","orcamento":"nao_informado","objecao":null,"info_coletada":["Quer site, não tráfego"],"info_faltante":[],"proxima_acao":"aguardar","resposta_sugerida":"Oi Pedro! Hoje nosso foco é tráfego pago e operação comercial, não criação de site. Se mudar o foco, é só chamar!","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.7,"knowledge_gaps":[]}'::jsonb,
   '{"sentiment":"Fora do ICP: procura site, não tráfego.","stage":"Novo lead","nextAction":"Educar sobre o foco e arquivar se não evoluir","context_present":true,"context_version_used":1}'::jsonb);

  -- ── Espelho legado (whatsapp_messages) — tenant guard do copilot ────────────
  insert into public.whatsapp_messages (external_id, instance_name, user_id, company_id, chat_jid, chat_phone, phone_e164_tail, contact_name, is_group, direction, message_type, body, message_timestamp) values
  (gen_random_uuid()::text, v_inst, v_owner, v_company, '5511990001001@s.whatsapp.net','5511990001001','1990001001','Carla Ribeiro',false,'inbound','text','Oi, vi o anúncio e queria entender os planos.', now()-interval '3 hours'),
  (gen_random_uuid()::text, v_inst, v_owner, v_company, '5511990001002@s.whatsapp.net','5511990001002','1990001002','Mayara Sampaio',false,'inbound','text','Oi! Queria um diagnóstico comercial da minha operação.', now()-interval '6 hours'),
  (gen_random_uuid()::text, v_inst, v_owner, v_company, '5511990001003@s.whatsapp.net','5511990001003','1990001003','Jean Spinola',false,'inbound','text','Vim por indicação do Rafael. Faço tráfego pra um negócio local.', now()-interval '3 days'),
  (gen_random_uuid()::text, v_inst, v_owner, v_company, '5511990001004@s.whatsapp.net','5511990001004','1990001004','Fernanda Paiva',false,'inbound','text','Achei o valor um pouco alto pra agência.', now()-interval '9 days'),
  (gen_random_uuid()::text, v_inst, v_owner, v_company, '5511990001005@s.whatsapp.net','5511990001005','1990001005','Pedro Almeida',false,'inbound','text','Vocês fazem site? Não quero tráfego.', now()-interval '5 days');

  raise notice 'Demo curada na company % (owner %, conn %)', v_company, v_owner, v_conn;
END $$;
