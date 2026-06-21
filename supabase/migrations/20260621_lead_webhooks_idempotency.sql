-- ═══════════════════════════════════════════════════════════════════
-- Idempotência para lead-webhook (segurança: anti-duplicação)
-- ═══════════════════════════════════════════════════════════════════
-- Antes: cada POST em /lead-webhook/:slug criava um deal NOVO. Retry da
-- planilha (Google Sheets onEdit) ou do Meta Lead Ads gerava deals
-- duplicados. Fix: a edge function passa um lead_key determinístico
-- (id estável OU hash de email/phone+slug dentro de uma janela de tempo)
-- e a RPC faz claim via public.claim_webhook_event ANTES de inserir.
--
-- Reusa a infra existente (webhook_event_receipts + claim_webhook_event)
-- da migration 20260226_security_idempotency_rate_limits.sql.
--
-- Aditivo e backward-compatible: p_lead_key tem DEFAULT NULL, então a
-- assinatura antiga de 3 args continua funcionando (cai no caminho
-- legado sem dedup). NÃO quebra o Google Sheets recém-consertado.

-- Recria a função adicionando o parâmetro p_lead_key (4º, com default).
-- A assinatura de 3 args (TEXT, TEXT, JSONB) continua existindo via
-- overload do default — mas pra evitar ambiguidade, dropamos a versão
-- antiga de 3 args explicitamente e mantemos só a de 4 args.
DROP FUNCTION IF EXISTS public.ingest_lead_webhook(TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.ingest_lead_webhook(
  p_slug     TEXT,
  p_secret   TEXT,
  p_payload  JSONB,
  p_lead_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hook      public.lead_webhooks%ROWTYPE;
  v_name      TEXT;
  v_email     TEXT;
  v_phone     TEXT;
  v_deal_id   UUID;
  v_owner     UUID;
  v_event_key TEXT;
  v_claimed   BOOLEAN;
BEGIN
  SELECT * INTO v_hook
  FROM public.lead_webhooks
  WHERE slug = p_slug
  LIMIT 1;

  IF v_hook.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_hook.secret <> p_secret THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'invalid_secret'
    WHERE id = v_hook.id;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_secret');
  END IF;

  IF NOT v_hook.enabled THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'disabled'
    WHERE id = v_hook.id;
    RETURN jsonb_build_object('ok', false, 'error', 'disabled');
  END IF;

  -- ─── Idempotência ─────────────────────────────────────────────────
  -- Só quando a edge function manda um lead_key (mantém compat com
  -- chamadas legadas de 3 args, que passam NULL).
  IF p_lead_key IS NOT NULL AND btrim(p_lead_key) <> '' THEN
    v_event_key := p_slug || ':' || p_lead_key;
    v_claimed := public.claim_webhook_event(
      'lead_webhook',
      v_event_key,
      jsonb_build_object('slug', p_slug, 'company_id', v_hook.company_id)
    );
    IF v_claimed IS NOT TRUE THEN
      -- Evento já visto: não cria deal de novo. Atualiza só last_seen.
      UPDATE public.lead_webhooks
      SET last_seen_at = NOW()
      WHERE id = v_hook.id;
      RETURN jsonb_build_object('ok', true, 'duplicate', true);
    END IF;
  END IF;

  v_name  := public.pick_field(p_payload, v_hook.field_mapping->'name');
  v_email := public.pick_field(p_payload, v_hook.field_mapping->'email');
  v_phone := public.pick_field(p_payload, v_hook.field_mapping->'phone');

  IF COALESCE(v_name, v_email, v_phone) IS NULL THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'missing_contact_fields',
        last_seen_at = NOW()
    WHERE id = v_hook.id;
    -- Marca o receipt como ignorado pra não ficar preso em 'processing'.
    IF v_event_key IS NOT NULL THEN
      PERFORM public.mark_webhook_event_status('lead_webhook', v_event_key, 'ignored',
        jsonb_build_object('reason', 'missing_contact_fields'));
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'missing_contact_fields');
  END IF;

  v_owner := COALESCE(
    v_hook.default_owner_id,
    (SELECT p.id FROM profiles p
      WHERE p.company_id = v_hook.company_id
      ORDER BY
        CASE WHEN p.role = 'admin' THEN 0 ELSE 1 END,
        p.created_at
      LIMIT 1)
  );

  IF v_owner IS NULL THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'no_owner_available',
        last_seen_at = NOW()
    WHERE id = v_hook.id;
    IF v_event_key IS NOT NULL THEN
      PERFORM public.mark_webhook_event_status('lead_webhook', v_event_key, 'ignored',
        jsonb_build_object('reason', 'no_owner_available'));
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'no_owner_available');
  END IF;

  INSERT INTO public.deals (
    title,
    customer_name,
    customer_email,
    customer_phone,
    stage,
    user_id,
    company_id,
    product_id,
    lead_source,
    source_data
  ) VALUES (
    COALESCE(NULLIF(v_name, ''), v_email, v_phone, 'Novo lead'),
    COALESCE(NULLIF(v_name, ''), 'Lead sem nome'),
    v_email,
    v_phone,
    'lead',
    v_owner,
    v_hook.company_id,
    v_hook.default_product_id,
    v_hook.source_kind,
    p_payload
  )
  RETURNING id INTO v_deal_id;

  UPDATE public.lead_webhooks
  SET total_received = total_received + 1,
      last_seen_at = NOW(),
      last_error = NULL
  WHERE id = v_hook.id;

  IF v_event_key IS NOT NULL THEN
    PERFORM public.mark_webhook_event_status('lead_webhook', v_event_key, 'processed',
      jsonb_build_object('deal_id', v_deal_id));
  END IF;

  RETURN jsonb_build_object('ok', true, 'deal_id', v_deal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_lead_webhook(TEXT, TEXT, JSONB, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.ingest_lead_webhook(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ingest_lead_webhook(TEXT, TEXT, JSONB, TEXT) IS
  'Chamada por edge function com service_role. Valida, deduplica via lead_key (claim_webhook_event), mapeia e insere deal.';
