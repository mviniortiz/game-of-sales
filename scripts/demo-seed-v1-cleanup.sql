-- ─────────────────────────────────────────────────────────────────────────────
-- Demo Seed v1 — CLEANUP
--
-- Remove tudo que o demo-seed-v1.sql inseriu na company de demo.
-- NÃO remove eva_business_context (vai ser sobrescrito pelo próximo seed,
-- e se Markus já editou manualmente, é informação dele).
--
-- Como rodar:
--   npx supabase db query --linked -f scripts/demo-seed-v1-cleanup.sql
-- ─────────────────────────────────────────────────────────────────────────────

DO $cleanup$
DECLARE
  v_company_id uuid := '00000000-0000-0000-0000-000000000001';
  v_user_id    uuid := '99289fe5-9bf4-4323-8a18-4ccedef2126b';
  v_msgs       int;
  v_deals      int;
  v_summaries  int;
  v_gaps       int;
BEGIN
  -- whatsapp_messages
  DELETE FROM public.whatsapp_messages
   WHERE company_id = v_company_id
     AND raw_payload->>'demo_seed' = 'v1';
  GET DIAGNOSTICS v_msgs = ROW_COUNT;

  -- deals
  DELETE FROM public.deals
   WHERE company_id = v_company_id
     AND lead_source = 'demo_seed_v1';
  GET DIAGNOSTICS v_deals = ROW_COUNT;

  -- conversation_summaries dos phones demo (qualification + cache)
  DELETE FROM public.conversation_summaries
   WHERE user_id = v_user_id
     AND chat_phone IN (
       '+5511999100001', '+5511999100002', '+5511999100003', '+5511999100004',
       '5511999100001',  '5511999100002',  '5511999100003',  '5511999100004'
     );
  GET DIAGNOSTICS v_summaries = ROW_COUNT;

  -- eva_knowledge_gaps com source dos phones demo
  DELETE FROM public.eva_knowledge_gaps
   WHERE company_id = v_company_id
     AND source_chat_phone IN (
       '+5511999100001', '+5511999100002', '+5511999100003', '+5511999100004',
       '5511999100001',  '5511999100002',  '5511999100003',  '5511999100004'
     );
  GET DIAGNOSTICS v_gaps = ROW_COUNT;

  RAISE NOTICE '🧹 Cleanup demo v1: % messages, % deals, % summaries, % gaps',
    v_msgs, v_deals, v_summaries, v_gaps;
  RAISE NOTICE 'eva_business_context preservado (use UI ou rodar novo seed pra mudar).';
END;
$cleanup$;
