-- ============================================================================
-- Eva Unified — PATCH: adiciona cache + dedup + cleanup em banco já criado
-- ============================================================================
-- Este patch é idempotente e adiciona apenas o que ficou faltando quando a
-- migration base (20260414_eva_unified_foundation.sql) foi aplicada antes dos
-- ajustes de cache/dedup.
-- ============================================================================

-- ─── 1. Colunas de cache em conversation_summaries ──────────────────────────
ALTER TABLE public.conversation_summaries
  ADD COLUMN IF NOT EXISTS messages_hash TEXT;

ALTER TABLE public.conversation_summaries
  ADD COLUMN IF NOT EXISTS cached_analysis JSONB;

-- ─── 2. RPC: eva_smart_insert_memory (dedup on write) ──────────────────────
CREATE OR REPLACE FUNCTION public.eva_smart_insert_memory(
  p_company_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_content TEXT,
  p_source TEXT DEFAULT 'auto_learned',
  p_confidence NUMERIC DEFAULT 0.5,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_content_key TEXT;
  v_result_id UUID;
BEGIN
  v_content_key := lower(regexp_replace(substring(p_content, 1, 50), '\s+', ' ', 'g'));

  SELECT id INTO v_existing_id
  FROM public.eva_memory
  WHERE company_id = p_company_id
    AND (
      (p_user_id IS NULL AND user_id IS NULL) OR
      (p_user_id IS NOT NULL AND user_id = p_user_id)
    )
    AND type = p_type
    AND lower(regexp_replace(substring(content, 1, 50), '\s+', ' ', 'g')) = v_content_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.eva_memory
    SET
      confidence = LEAST(1.0, confidence + 0.05),
      usage_count = usage_count + 1,
      last_used_at = now()
    WHERE id = v_existing_id;
    v_result_id := v_existing_id;
  ELSE
    INSERT INTO public.eva_memory (
      company_id, user_id, type, content, source, confidence, metadata,
      usage_count, last_used_at
    )
    VALUES (
      p_company_id, p_user_id, p_type, p_content, p_source, p_confidence, p_metadata,
      1, now()
    )
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.eva_smart_insert_memory(UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, JSONB)
  TO authenticated, service_role;

-- ─── 3. RPC: eva_daily_cleanup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eva_daily_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decayed INTEGER;
  v_pruned INTEGER;
  v_capped INTEGER;
  v_summaries_pruned INTEGER;
BEGIN
  UPDATE public.eva_memory
  SET confidence = GREATEST(0, confidence - 0.02)
  WHERE last_used_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_decayed = ROW_COUNT;

  DELETE FROM public.eva_memory
  WHERE confidence < 0.4
    AND usage_count < 2
    AND created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_pruned = ROW_COUNT;

  WITH ranked AS (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, COALESCE(user_id::TEXT, 'company')
        ORDER BY (confidence + LEAST(usage_count, 20) / 20.0) DESC, last_used_at DESC NULLS LAST
      ) AS rn
    FROM public.eva_memory
  )
  DELETE FROM public.eva_memory
  WHERE id IN (SELECT id FROM ranked WHERE rn > 100);
  GET DIAGNOSTICS v_capped = ROW_COUNT;

  DELETE FROM public.conversation_summaries
  WHERE analyzed_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_summaries_pruned = ROW_COUNT;

  RETURN jsonb_build_object(
    'decayed', v_decayed,
    'pruned', v_pruned,
    'capped', v_capped,
    'summaries_pruned', v_summaries_pruned,
    'ran_at', now()
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.eva_daily_cleanup() TO service_role;

-- ─── 4. pg_cron schedule (best-effort) ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('eva_daily_cleanup')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'eva_daily_cleanup');

    PERFORM cron.schedule(
      'eva_daily_cleanup',
      '0 3 * * *',
      $cron$SELECT public.eva_daily_cleanup();$cron$
    );
    RAISE NOTICE 'eva_daily_cleanup agendado para 3h UTC diariamente';
  ELSE
    RAISE NOTICE 'pg_cron nao disponivel — agendar manualmente';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Nao foi possivel agendar: %', SQLERRM;
END $$;

-- ─── 5. Força reload do schema cache do PostgREST ──────────────────────────
-- Isso faz o Supabase reconhecer imediatamente as colunas e funções novas,
-- sem precisar esperar o reload automático.
NOTIFY pgrst, 'reload schema';
