-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.2.R1 (2026-07-10) — Refresh da demo Incorporadora Aurora
--
-- Roda DEPOIS de reaplicar demo_incorporadora.sql. Faz:
--   1. Renomeia os estágios do funil no BANCO pro vocabulário imobiliário
--      (multi-pipelines substituiu o relabel hardcoded de src/lib/demoPipeline.ts).
--   2. Semeia o feed da EVA (agent_suggestions) com o ciclo sugere→aprova:
--      2 pendentes + 1 aceita + 1 ajustada + 1 rejeitada, ligadas às conversas.
--   3. Reativa a conta: trial Pro por 30 dias.
--   4. Reseta a senha do usuário demo.incorporadora@vyzon.com.br.
--
-- IDEMPOTENTE: marcador demo_seed='DEMO.2.R1' nas suggestions.
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := 'd1e00000-0000-4000-8000-000000000001';
  v_owner   uuid;
BEGIN
  SELECT id INTO v_owner FROM public.profiles
   WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;

  -- ── 1. Funil com vocabulário de incorporadora (só a company da demo) ────────
  UPDATE public.pipeline_stages SET title = CASE legacy_key
      WHEN 'lead'        THEN 'Novo lead'
      WHEN 'proposal'    THEN 'Visita agendada'
      WHEN 'negotiation' THEN 'Proposta enviada'
      WHEN 'closed_won'  THEN 'Vendido'
      ELSE title END,
    updated_at = now()
  WHERE company_id = v_company
    AND legacy_key IN ('lead','proposal','negotiation','closed_won');

  -- ── 2. Feed da EVA (agent_suggestions) ──────────────────────────────────────
  DELETE FROM public.agent_suggestions
   WHERE company_id = v_company AND (input_summary->>'demo_seed') = 'DEMO.2.R1';

  INSERT INTO public.agent_suggestions
    (company_id, agent_key, kind, conversation_id, deal_id, input_summary, suggestion, status, applied_payload, created_by, created_at, resolved_by, resolved_at)
  VALUES
    -- Ana Beatriz (quente, pendente): agendar visita ao decorado
    (v_company, 'qualifier', 'qualification',
     'd1c00000-0000-4000-8000-000000000011', 'd1d00000-0000-4000-8000-000000000001',
     jsonb_build_object('demo_seed','DEMO.2.R1','source','inbox','trigger','eva_reading',
       'analyzedAt', to_char((now() - interval '2 hours') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
     '{"proxima_acao":"agendar_visita","temperatura":"quente","score":82,"resposta_sugerida":"Ana, ótimo! Enquanto você combina os dias com seu marido, já deixo duas opções reservadas: quinta às 18h30 ou sábado às 10h no decorado do Aurora. Qual encaixa melhor? Já levo a simulação do financiamento com FGTS pronta."}'::jsonb,
     'pending', NULL, v_owner, now() - interval '2 hours', NULL, NULL),
    -- Patrícia (quente, pendente): confirmar a visita de sábado 11h
    (v_company, 'qualifier', 'qualification',
     'd1c00000-0000-4000-8000-000000000014', 'd1d00000-0000-4000-8000-000000000004',
     jsonb_build_object('demo_seed','DEMO.2.R1','source','inbox','trigger','eva_reading',
       'analyzedAt', to_char((now() - interval '3 hours') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
     '{"proxima_acao":"confirmar_visita","temperatura":"quente","score":78,"resposta_sugerida":"Perfeito, Patrícia! Confirmado sábado às 11h na cobertura do Residencial Aurora. Vou te esperar na recepção do decorado. Se quiser, já te adianto a tabela de valores por WhatsApp pra você chegar com tudo em mãos."}'::jsonb,
     'pending', NULL, v_owner, now() - interval '3 hours', NULL, NULL),
    -- Marcos (aceita ontem): simulação FGTS aprovada e enviada
    (v_company, 'qualifier', 'qualification',
     'd1c00000-0000-4000-8000-000000000013', 'd1d00000-0000-4000-8000-000000000003',
     jsonb_build_object('demo_seed','DEMO.2.R1','source','inbox','trigger','eva_reading',
       'analyzedAt', to_char((now() - interval '1 day 4 hours') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
     '{"proxima_acao":"responder","temperatura":"morno","score":52,"resposta_sugerida":"Marcos, com renda de R$ 4 mil e R$ 15 mil de FGTS dá pra enquadrar o Jardim Sul no financiamento com parcela reduzida. Preparei a simulação: usando o FGTS na entrada, a parcela cai bem. Quer que eu te mande os números?"}'::jsonb,
     'accepted', NULL, v_owner, now() - interval '1 day 4 hours', v_owner, now() - interval '1 day 3 hours'),
    -- Roberto (ajustada ontem): tabela de rentabilidade, corretor editou o texto
    (v_company, 'qualifier', 'qualification',
     'd1c00000-0000-4000-8000-000000000012', 'd1d00000-0000-4000-8000-000000000002',
     jsonb_build_object('demo_seed','DEMO.2.R1','source','inbox','trigger','eva_reading',
       'analyzedAt', to_char((now() - interval '1 day 1 hour') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
     '{"proxima_acao":"enviar_proposta","temperatura":"quente","score":75,"resposta_sugerida":"Roberto, segue a tabela do Vista Park com valores à vista. Na região, os studios têm alugado na faixa que aproxima o retorno de 0,6% ao mês que você busca. Posso reservar uma unidade de final 4 (as de melhor liquidez) enquanto você analisa?"}'::jsonb,
     'adjusted', NULL, v_owner, now() - interval '1 day 1 hour', v_owner, now() - interval '23 hours'),
    -- Diego (rejeitada, fora do ICP): mostra que o time também descarta
    (v_company, 'qualifier', 'qualification',
     'd1c00000-0000-4000-8000-000000000015', 'd1d00000-0000-4000-8000-000000000005',
     jsonb_build_object('demo_seed','DEMO.2.R1','source','inbox','trigger','eva_reading',
       'analyzedAt', to_char((now() - interval '2 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
     '{"proxima_acao":"aguardar","temperatura":"frio","score":15,"resposta_sugerida":"Diego procura locação e estamos focados em venda. Sugiro arquivar a conversa e marcar como fora do perfil."}'::jsonb,
     'rejected', NULL, v_owner, now() - interval '2 days', v_owner, now() - interval '1 day 22 hours');

  -- ── 3. Reativar a conta: trial Pro por 30 dias ─────────────────────────────
  UPDATE public.companies
     SET subscription_status = 'trialing',
         trial_ends_at = now() + interval '30 days'
   WHERE id = v_company;

  -- ── 4. Reset de senha do usuário demo ──────────────────────────────────────
  UPDATE auth.users
     SET encrypted_password = extensions.crypt('Aurora2026!vyzon', extensions.gen_salt('bf'))
   WHERE email = 'demo.incorporadora@vyzon.com.br';

  RAISE NOTICE 'DEMO.2.R1 aplicado na company % (owner %).', v_company, v_owner;
END
$do$;
