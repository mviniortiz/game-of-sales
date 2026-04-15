-- ============================================================================
-- Eva Unified Foundation — Fase 1
-- ============================================================================
-- Cria as 2 tabelas que são o "cérebro" da Eva:
--   • eva_memory          → fatos, preferências, padrões aprendidos por vendedor/empresa
--   • conversation_summaries → resumos consultáveis das conversas analisadas
--
-- Ambas são escopadas por company_id (tenant isolation) com RLS alinhada ao
-- padrão do projeto: super_admin bypass, company admins, sellers.
-- ============================================================================

-- ─── 1. eva_memory ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eva_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- user_id IS NULL  → memória da empresa inteira (identidade, produto, scripts globais)
  -- user_id NOT NULL → memória específica do vendedor (tom, estilo, preferências)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de memória
  --   fact               : fato sobre o vendedor/empresa ("Pedro fecha mais às quartas")
  --   preference         : preferência explícita ("prefere call a WhatsApp")
  --   tone_sample        : amostra do tom/estilo de mensagem do vendedor
  --   objection_pattern  : padrão de objeção recorrente e como foi contornada
  --   learning           : aprendizado geral extraído de conversas
  type TEXT NOT NULL CHECK (type IN ('fact', 'preference', 'tone_sample', 'objection_pattern', 'learning')),

  content TEXT NOT NULL,

  -- Origem da memória
  source TEXT NOT NULL DEFAULT 'auto_learned' CHECK (source IN ('whatsapp', 'gestor', 'manual', 'auto_learned')),

  -- Confiança 0-1 (quão certa a Eva tá desse aprendizado)
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),

  -- Decay / reforço
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata livre (chat_phone relacionado, deal_id, etc)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eva_memory_company ON public.eva_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_eva_memory_user ON public.eva_memory(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eva_memory_type ON public.eva_memory(company_id, type);
CREATE INDEX IF NOT EXISTS idx_eva_memory_recent ON public.eva_memory(company_id, last_used_at DESC NULLS LAST);

-- ─── 2. conversation_summaries ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificação do chat (telefone é a chave estável)
  chat_phone TEXT NOT NULL,
  chat_name TEXT,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,

  -- Resumo gerado pelo GPT
  summary TEXT NOT NULL,

  -- Sinais da conversa (espelho do Copilot)
  temperature TEXT CHECK (temperature IN ('quente', 'morno', 'frio')),
  sentiment TEXT,
  stage_suggestion TEXT,
  next_action TEXT,

  -- Estratégia e objeções como arrays
  strategy TEXT[] DEFAULT ARRAY[]::TEXT[],
  objections TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadados da conversa
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,

  -- Último draft sugerido (pra gestor ver o que Eva recomendou)
  last_draft TEXT,

  -- Cache: hash das últimas 30 mensagens + análise completa em JSONB.
  -- Se na próxima análise o hash bater e < 1h, servimos do cache (economia ~30%).
  messages_hash TEXT,
  cached_analysis JSONB,

  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uma conversa = um resumo por vendedor (upsert quando re-analisa)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_summaries_chat
  ON public.conversation_summaries(user_id, chat_phone);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_company ON public.conversation_summaries(company_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user ON public.conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_recent ON public.conversation_summaries(company_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_temperature ON public.conversation_summaries(company_id, temperature);

-- ─── 3. Triggers de updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eva_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_eva_memory_updated ON public.eva_memory;
CREATE TRIGGER trg_eva_memory_updated
  BEFORE UPDATE ON public.eva_memory
  FOR EACH ROW EXECUTE FUNCTION public.eva_set_updated_at();

DROP TRIGGER IF EXISTS trg_conversation_summaries_updated ON public.conversation_summaries;
CREATE TRIGGER trg_conversation_summaries_updated
  BEFORE UPDATE ON public.conversation_summaries
  FOR EACH ROW EXECUTE FUNCTION public.eva_set_updated_at();

-- ─── 4. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.eva_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- eva_memory: super admin bypass
CREATE POLICY "Super admins bypass eva_memory RLS" ON public.eva_memory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- eva_memory: company admins enxergam/gerenciam toda memória da empresa
CREATE POLICY "Company admins manage all eva_memory" ON public.eva_memory
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- eva_memory: vendedores veem memória da empresa (user_id IS NULL) + a própria
CREATE POLICY "Sellers view own + company eva_memory" ON public.eva_memory
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- eva_memory: vendedores podem inserir/atualizar só a própria memória
CREATE POLICY "Sellers insert own eva_memory" ON public.eva_memory
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Sellers update own eva_memory" ON public.eva_memory
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- conversation_summaries: super admin bypass
CREATE POLICY "Super admins bypass conversation_summaries RLS" ON public.conversation_summaries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- conversation_summaries: company admins veem todas as conversas da empresa
CREATE POLICY "Company admins view all conversation_summaries" ON public.conversation_summaries
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- conversation_summaries: vendedores veem só as próprias
CREATE POLICY "Sellers view own conversation_summaries" ON public.conversation_summaries
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- conversation_summaries: vendedores podem inserir/atualizar as próprias
CREATE POLICY "Sellers insert own conversation_summaries" ON public.conversation_summaries
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Sellers update own conversation_summaries" ON public.conversation_summaries
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- ─── 5. RPC: eva_touch_memories (reforço de memórias usadas) ───────────────
-- Incrementa usage_count e atualiza last_used_at quando a Eva consulta uma
-- memória. Usada pelo Copilot ao injetar contexto no prompt.
CREATE OR REPLACE FUNCTION public.eva_touch_memories(p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.eva_memory
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = ANY(p_ids);
END; $$;

GRANT EXECUTE ON FUNCTION public.eva_touch_memories(UUID[]) TO authenticated, service_role;

-- ─── 6. RPC: eva_smart_insert_memory (dedup on write) ──────────────────────
-- Evita memórias duplicadas. Se já existir memória semelhante (mesmo company,
-- user, type e primeiros 50 chars do content), ao invés de inserir nova linha
-- incrementa confidence (com teto em 1.0), usage_count e last_used_at.
-- Retorna a linha afetada (insert ou update).
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
  -- Chave de dedup: primeiros 50 chars normalizados (lowercase, sem whitespace extra)
  v_content_key := lower(regexp_replace(substring(p_content, 1, 50), '\s+', ' ', 'g'));

  -- Procura memória similar já existente
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
    -- Já existe — reforça ao invés de duplicar
    UPDATE public.eva_memory
    SET
      confidence = LEAST(1.0, confidence + 0.05),
      usage_count = usage_count + 1,
      last_used_at = now()
    WHERE id = v_existing_id;
    v_result_id := v_existing_id;
  ELSE
    -- Nova memória
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

-- ─── 7. RPC: eva_daily_cleanup (poda diária) ────────────────────────────────
-- Roda todo dia 3h (via pg_cron). Faz 3 coisas:
--   1. Decay: confidence -= 0.02 quando não usa há 7+ dias
--   2. Prune: apaga memórias com confidence < 0.4 + usage_count < 2 + idade > 30d
--   3. Cap: mantém no máximo 100 memórias por (company, user)
--   4. Summaries: apaga resumos de conversas sem atividade há > 90 dias
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
  -- 1. Decay confidence de memórias paradas
  UPDATE public.eva_memory
  SET confidence = GREATEST(0, confidence - 0.02)
  WHERE last_used_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_decayed = ROW_COUNT;

  -- 2. Prune memórias de baixa qualidade antigas
  DELETE FROM public.eva_memory
  WHERE confidence < 0.4
    AND usage_count < 2
    AND created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_pruned = ROW_COUNT;

  -- 3. Cap: 100 memórias por (company, user). Evict LRU com menor score.
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

  -- 4. Apaga summaries de conversas mortas (> 90 dias)
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

-- ─── 8. Agendamento via pg_cron ─────────────────────────────────────────────
-- Roda diariamente às 3h UTC (0h BRT). Best-effort: se pg_cron não estiver
-- habilitado, o DO block captura o erro e apenas avisa — a função continua
-- disponível para chamada manual.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove schedule antigo se existir (idempotência)
    PERFORM cron.unschedule('eva_daily_cleanup')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'eva_daily_cleanup');

    PERFORM cron.schedule(
      'eva_daily_cleanup',
      '0 3 * * *',
      $cron$SELECT public.eva_daily_cleanup();$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron nao disponivel — agendar manualmente ou via Edge Function';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Nao foi possivel agendar eva_daily_cleanup: %', SQLERRM;
END $$;

-- ─── 9. Comments (documentação inline) ──────────────────────────────────────
COMMENT ON TABLE public.eva_memory IS
  'Cérebro da Eva: fatos, preferências e padrões aprendidos. Escopo por empresa + vendedor (user_id NULL = memória global da empresa).';
COMMENT ON TABLE public.conversation_summaries IS
  'Resumos de conversas WhatsApp analisadas pelo Copilot. Usado pelo Report Agent do gestor para contexto cruzado.';
