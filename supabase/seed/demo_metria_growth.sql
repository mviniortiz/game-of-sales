-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.1 (2026-05-26) — Seed de apresentação comercial: Agência Metria Growth
--
-- Alvo: company "Vyzon Demo" (7e2e21ac-d834-448b-a61b-79ca01255702),
--       connection evolution única (de0cfc04-79b8-44b2-baf6-b635790f4ea0),
--       owner admin (10a4e304-a1a6-4fdf-9778-5aff61f9b71a).
--
-- IDEMPOTENTE: usa IDs fixos + marcador metadata.demo_seed='DEMO.1' /
-- source_data.demo_seed. Rodar de novo apaga só as PRÓPRIAS linhas e reinsere.
-- NÃO toca em nenhum outro dado da company. Transacional (tudo ou nada).
--
-- Rodar:  npx supabase db query --linked -f supabase/seed/demo_metria_growth.sql
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- ── Limpeza idempotente (ordem reversa de FK) ───────────────────────────────
delete from channel_messages where conversation_id in (
  'd0000000-0000-4000-8000-0000000c0011','d0000000-0000-4000-8000-0000000c0012',
  'd0000000-0000-4000-8000-0000000c0013','d0000000-0000-4000-8000-0000000c0014',
  'd0000000-0000-4000-8000-0000000c0015');
delete from channel_conversations where id in (
  'd0000000-0000-4000-8000-0000000c0011','d0000000-0000-4000-8000-0000000c0012',
  'd0000000-0000-4000-8000-0000000c0013','d0000000-0000-4000-8000-0000000c0014',
  'd0000000-0000-4000-8000-0000000c0015');
delete from deals where id in (
  'd0000000-0000-4000-8000-0000000d0001','d0000000-0000-4000-8000-0000000d0002',
  'd0000000-0000-4000-8000-0000000d0003');
delete from channel_contacts where id in (
  'd0000000-0000-4000-8000-0000000c0001','d0000000-0000-4000-8000-0000000c0002',
  'd0000000-0000-4000-8000-0000000c0003','d0000000-0000-4000-8000-0000000c0004',
  'd0000000-0000-4000-8000-0000000c0005');
delete from conversation_summaries where company_id='7e2e21ac-d834-448b-a61b-79ca01255702'
  and chat_phone in ('5511990001001','5511990001002','5511990001003','5511990001004','5511990001005');
-- legado: necessário pro tenant guard do whatsapp-copilot (validateChatOwnership
-- checa whatsapp_messages por user_id+chat_phone). Sem isso, "Analisar/Reanalisar"
-- dá TENANT_MISMATCH na demo.
delete from whatsapp_messages where external_id in ('demo-wa-1','demo-wa-2','demo-wa-3','demo-wa-4','demo-wa-5');

-- ── Contatos ────────────────────────────────────────────────────────────────
insert into channel_contacts (id, company_id, connection_id, external_contact_id, phone_e164, phone_tail, name, is_group, metadata) values
('d0000000-0000-4000-8000-0000000c0001','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','5511990001001@s.whatsapp.net','5511990001001','1990001001','Carla Ribeiro',false,'{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0002','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','5511990001002@s.whatsapp.net','5511990001002','1990001002','Mayara Sampaio',false,'{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0003','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','5511990001003@s.whatsapp.net','5511990001003','1990001003','Jean Spinola',false,'{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0004','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','5511990001004@s.whatsapp.net','5511990001004','1990001004','Fernanda Paiva',false,'{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0005','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','5511990001005@s.whatsapp.net','5511990001005','1990001005','Pedro Almeida',false,'{"demo_seed":"DEMO.1"}'::jsonb);

-- ── Deals (2 vinculados: Carla qualificação + Jean proposta; Fernanda parada) ─
insert into deals (id, company_id, user_id, title, customer_name, customer_phone, stage, value, is_hot, lead_source, probability, source_data, created_at, updated_at) values
('d0000000-0000-4000-8000-0000000d0001','7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','Tráfego pago - Carla Ribeiro','Carla Ribeiro','+5511990001001','qualification',4500,true,'meta_ads',40,'{"demo_seed":"DEMO.1"}'::jsonb, now()-interval '1 day', now()-interval '2 hours'),
('d0000000-0000-4000-8000-0000000d0002','7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','Tráfego local - Jean Spinola','Jean Spinola','+5511990001003','proposal',3200,false,'indicacao',60,'{"demo_seed":"DEMO.1"}'::jsonb, now()-interval '4 days', now()-interval '1 day'),
('d0000000-0000-4000-8000-0000000d0003','7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','Gestão de tráfego - Fernanda Paiva','Fernanda Paiva','+5511990001004','negotiation',2800,false,'meta_ads',30,'{"demo_seed":"DEMO.1"}'::jsonb, now()-interval '12 days', now()-interval '9 days');

-- ── Conversas (Carla/Jean vinculadas a deal) ────────────────────────────────
insert into channel_conversations (id, company_id, connection_id, contact_id, deal_id, status, last_message_at, last_inbound_at, last_outbound_at, unread_count, metadata) values
('d0000000-0000-4000-8000-0000000c0011','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0001','d0000000-0000-4000-8000-0000000d0001','open', now()-interval '2 hours 55 minutes', now()-interval '2 hours 55 minutes', null, 2, '{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0012','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0002',null,'open', now()-interval '6 hours', now()-interval '6 hours', null, 1, '{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0013','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0003','d0000000-0000-4000-8000-0000000d0002','open', now()-interval '2 days', now()-interval '3 days', now()-interval '2 days', 0, '{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0014','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0004',null,'open', now()-interval '8 days 23 hours', now()-interval '9 days', now()-interval '8 days 23 hours', 0, '{"demo_seed":"DEMO.1"}'::jsonb),
('d0000000-0000-4000-8000-0000000c0015','7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0005',null,'open', now()-interval '4 days 23 hours', now()-interval '5 days', now()-interval '4 days 23 hours', 0, '{"demo_seed":"DEMO.1"}'::jsonb);

-- ── Mensagens ───────────────────────────────────────────────────────────────
insert into channel_messages (company_id, connection_id, conversation_id, contact_id, provider_message_id, direction, message_type, body, media_ref, status, message_timestamp, metadata) values
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0011','d0000000-0000-4000-8000-0000000c0001','demo-carla-1','inbound','text','Oi, vi o anúncio e queria entender os planos.','{}'::jsonb,'received', now()-interval '3 hours', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0011','d0000000-0000-4000-8000-0000000c0001','demo-carla-2','inbound','text','Tenho uma clínica de estética e quero rodar tráfego pago.','{}'::jsonb,'received', now()-interval '2 hours 55 minutes', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0012','d0000000-0000-4000-8000-0000000c0002','demo-mayara-1','inbound','text','Oi! Queria um diagnóstico comercial da minha operação.','{}'::jsonb,'received', now()-interval '6 hours', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0013','d0000000-0000-4000-8000-0000000c0003','demo-jean-1','inbound','text','Vim por indicação do Rafael. Faço tráfego pra um negócio local.','{}'::jsonb,'received', now()-interval '3 days', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0013','d0000000-0000-4000-8000-0000000c0003','demo-jean-2','outbound','text','Boa, Jean! Já preparo uma proposta de tráfego local pra você.','{}'::jsonb,'sent', now()-interval '2 days', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0014','d0000000-0000-4000-8000-0000000c0004','demo-fernanda-1','inbound','text','Achei o valor um pouco alto pra agência.','{}'::jsonb,'received', now()-interval '9 days', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0014','d0000000-0000-4000-8000-0000000c0004','demo-fernanda-2','outbound','text','Entendo, Fernanda. Posso te mostrar o retorno esperado antes de fechar?','{}'::jsonb,'sent', now()-interval '8 days 23 hours', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0015','d0000000-0000-4000-8000-0000000c0005','demo-pedro-1','inbound','text','Vocês fazem site? Não quero tráfego.','{}'::jsonb,'received', now()-interval '5 days', '{"demo_seed":"DEMO.1"}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','de0cfc04-79b8-44b2-baf6-b635790f4ea0','d0000000-0000-4000-8000-0000000c0015','d0000000-0000-4000-8000-0000000c0005','demo-pedro-2','outbound','text','Oi Pedro! Nosso foco é tráfego e comercial, não criação de site.','{}'::jsonb,'sent', now()-interval '4 days 23 hours', '{"demo_seed":"DEMO.1"}'::jsonb);

-- ── Análise salva da EVA (conversation_summaries) ───────────────────────────
insert into conversation_summaries (company_id, user_id, chat_phone, summary, message_count, analyzed_at, qualification, cached_analysis) values
('7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','5511990001001','Clínica de estética veio do Meta Ads querendo entender planos de tráfego pago.',2, now(),
 '{"servico_interesse":"Tráfego pago","intencao":"preco","temperatura":"quente","fit_sugerido":"bom","score_sugerido":82,"score_justificativa":"Clínica com intenção clara de escalar tráfego.","urgencia":"alta","orcamento":"nao_informado","objecao":null,"info_coletada":["Segmento: clínica de estética","Veio de anúncio Meta"],"info_faltante":["Orçamento mensal","Cidade e raio de atendimento"],"proxima_acao":"responder","resposta_sugerida":"Perfeito, Carla! Hoje vocês já investem em tráfego ou estão começando agora? Me diz o orçamento mensal que eu já te mostro o melhor caminho.","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.82,"knowledge_gaps":[]}'::jsonb,
 '{"sentiment":"Lead quente de clínica de estética interessada em tráfego pago.","stage":"Qualificação","nextAction":"Perguntar orçamento e cidade antes de propor","context_present":true,"context_version_used":1}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','5511990001002','Quer um diagnóstico comercial; ainda sem urgência definida.',1, now(),
 '{"servico_interesse":"Diagnóstico comercial","intencao":"duvida","temperatura":"morno","fit_sugerido":"medio","score_sugerido":55,"score_justificativa":"Interesse em diagnóstico, sem urgência clara.","urgencia":"media","orcamento":"nao_informado","objecao":null,"info_coletada":["Quer diagnóstico comercial"],"info_faltante":["Tamanho do time comercial","Principal gargalo hoje"],"proxima_acao":"qualificar","resposta_sugerida":"Oi Mayara! Pra montar o diagnóstico certo, me conta: quantas pessoas no comercial e qual o maior gargalo hoje?","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.6,"knowledge_gaps":[]}'::jsonb,
 '{"sentiment":"Lead pedindo diagnóstico comercial, aguardando retorno.","stage":"Qualificação","nextAction":"Coletar tamanho do time e gargalo","context_present":true,"context_version_used":1}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','5511990001003','Veio por indicação; tráfego para negócio local, pronto para proposta.',2, now(),
 '{"servico_interesse":"Tráfego pago","intencao":"compra","temperatura":"quente","fit_sugerido":"bom","score_sugerido":78,"score_justificativa":"Indicação qualificada, pronto para receber proposta.","urgencia":"alta","orcamento":"adequado","objecao":null,"info_coletada":["Indicação do Rafael","Negócio local"],"info_faltante":["Ticket médio atual"],"proxima_acao":"criar_oportunidade","resposta_sugerida":"Boa, Jean! Já te preparo a proposta de tráfego local. Qual seu ticket médio hoje pra eu calibrar a meta?","deve_criar_oportunidade":true,"deve_fazer_handoff":false,"confianca":0.78,"knowledge_gaps":[]}'::jsonb,
 '{"sentiment":"Indicação quente para tráfego local, em fase de proposta.","stage":"Proposta","nextAction":"Enviar proposta de tráfego local","context_present":true,"context_version_used":1}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','5511990001004','Fit ok, mas travou no preço da agência.',2, now(),
 '{"servico_interesse":"Gestão de tráfego","intencao":"preco","temperatura":"morno","fit_sugerido":"medio","score_sugerido":50,"score_justificativa":"Fit adequado, mas com objeção de preço.","urgencia":"media","orcamento":"baixo","objecao":"Acha o valor alto para uma agência","info_coletada":["Comparando preço"],"info_faltante":["Faturamento atual"],"proxima_acao":"responder","resposta_sugerida":"Entendo, Fernanda. Posso te mostrar o retorno esperado e desenhar um escopo que cabe no seu momento?","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.6,"knowledge_gaps":[]}'::jsonb,
 '{"sentiment":"Lead com objeção de preço; precisa de prova de retorno.","stage":"Negociação","nextAction":"Apresentar retorno esperado e escopo flexível","context_present":true,"context_version_used":1}'::jsonb),
('7e2e21ac-d834-448b-a61b-79ca01255702','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','5511990001005','Procura criação de site; fora do ICP de tráfego e comercial.',2, now(),
 '{"servico_interesse":"Criação de site","intencao":"duvida","temperatura":"frio","fit_sugerido":"baixo","score_sugerido":20,"score_justificativa":"Demanda fora do foco da agência (site, não tráfego).","urgencia":"baixa","orcamento":"nao_informado","objecao":null,"info_coletada":["Quer site, não tráfego"],"info_faltante":[],"proxima_acao":"aguardar","resposta_sugerida":"Oi Pedro! Hoje nosso foco é tráfego pago e operação comercial, não criação de site. Se mudar o foco, é só chamar!","deve_criar_oportunidade":false,"deve_fazer_handoff":false,"confianca":0.7,"knowledge_gaps":[]}'::jsonb,
 '{"sentiment":"Fora do ICP: procura site, não tráfego.","stage":"Novo lead","nextAction":"Educar sobre o foco e arquivar se não evoluir","context_present":true,"context_version_used":1}'::jsonb);

-- ── Espelho legado (whatsapp_messages) — só pro tenant guard do copilot ──────
-- user_id = admin (apresentador). 1 inbound por contato basta pro guard passar.
insert into whatsapp_messages (external_id, instance_name, user_id, company_id, chat_jid, chat_phone, phone_e164_tail, contact_name, is_group, direction, message_type, body, message_timestamp) values
('demo-wa-1','wa_10a4e304a1a64fdf97785aff61f9b71a','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','7e2e21ac-d834-448b-a61b-79ca01255702','5511990001001@s.whatsapp.net','5511990001001','1990001001','Carla Ribeiro',false,'inbound','text','Oi, vi o anúncio e queria entender os planos.', now()-interval '3 hours'),
('demo-wa-2','wa_10a4e304a1a64fdf97785aff61f9b71a','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','7e2e21ac-d834-448b-a61b-79ca01255702','5511990001002@s.whatsapp.net','5511990001002','1990001002','Mayara Sampaio',false,'inbound','text','Oi! Queria um diagnóstico comercial da minha operação.', now()-interval '6 hours'),
('demo-wa-3','wa_10a4e304a1a64fdf97785aff61f9b71a','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','7e2e21ac-d834-448b-a61b-79ca01255702','5511990001003@s.whatsapp.net','5511990001003','1990001003','Jean Spinola',false,'inbound','text','Vim por indicação do Rafael. Faço tráfego pra um negócio local.', now()-interval '3 days'),
('demo-wa-4','wa_10a4e304a1a64fdf97785aff61f9b71a','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','7e2e21ac-d834-448b-a61b-79ca01255702','5511990001004@s.whatsapp.net','5511990001004','1990001004','Fernanda Paiva',false,'inbound','text','Achei o valor um pouco alto pra agência.', now()-interval '9 days'),
('demo-wa-5','wa_10a4e304a1a64fdf97785aff61f9b71a','10a4e304-a1a6-4fdf-9778-5aff61f9b71a','7e2e21ac-d834-448b-a61b-79ca01255702','5511990001005@s.whatsapp.net','5511990001005','1990001005','Pedro Almeida',false,'inbound','text','Vocês fazem site? Não quero tráfego.', now()-interval '5 days');

COMMIT;
