-- ─────────────────────────────────────────────────────────────────────────────
-- 20260701 — Ingestão canônica de mensagens de canal (fase 1: RPC + logging)
--
-- Contexto: evolution-message-webhook e meta-whatsapp-webhook reimplementam,
-- cada um, o mesmo upsert chain (connection → contact → conversation →
-- message) sobre channel_*. O schema já é canônico (F4W.2); o que falta é
-- centralizar a LÓGICA num único ponto idempotente, chamável por qualquer
-- adapter (Evolution, Meta Cloud, Instagram, formulário...).
--
-- Esta migration NÃO muda nenhum edge function ainda — só cria a RPC e
-- prepara webhook_logs pra rastreabilidade. A troca dos webhooks pra usar a
-- RPC é um passo seguinte e separado (meta primeiro, por ser mais simples e
-- não estar em produção; evolution depois).
--
-- Reaproveita (sem duplicar):
--   - webhook_event_receipts + claim_webhook_event()/mark_webhook_event_status()
--     (20260226_security_idempotency_rate_limits.sql) — dedup de entrega HTTP,
--     fica a cargo do EDGE FUNCTION chamador, não desta RPC.
--   - webhook_logs (20241218_create_integrations_tables.sql) — payload cru +
--     erro. Ganha 2 colunas novas, nullable, só usadas pelos providers de canal.
--   - channel_messages_provider_uniq UNIQUE(connection_id, provider_message_id)
--     (F4W.2) — já garante dedup na escrita da mensagem em si.
-- ─────────────────────────────────────────────────────────────────────────────

-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 1. webhook_logs — rastreabilidade pro caminho de canal                    │
-- ╰───────────────────────────────────────────────────────────────────────────╯

ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS connection_id   UUID REFERENCES public.channel_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.channel_conversations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.webhook_logs.connection_id IS
  'Preenchido só quando platform é um provider de canal (evolution/meta_cloud/instagram). NULL pra webhooks de venda.';
COMMENT ON COLUMN public.webhook_logs.conversation_id IS
  'Idem. Permite achar rápido "todo log de erro dessa conversa".';


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 2. ingest_channel_message() — upsert chain único e idempotente            │
-- │                                                                             │
-- │ p_payload (jsonb) — envelope normalizado que QUALQUER adapter monta:      │
-- │ {                                                                          │
-- │   "connection": { "external_id", "display_name"?, "capabilities"?, "metadata"? }, │
-- │   "contact":    { "external_id", "name"?, "phone_e164"?, "username"?,     │
-- │                    "profile_pic_url"?, "is_group"?, "metadata"? },        │
-- │   "message":    { "provider_message_id", "direction", "message_type"?,   │
-- │                    "body"?, "media_ref"?, "status"?, "message_timestamp"?,│
-- │                    "metadata"? },                                        │
-- │   "raw_payload": { ...payload original do provider, preservado }         │
-- │ }                                                                          │
-- │                                                                             │
-- │ Retorna { connection_id, contact_id, conversation_id, message_id,        │
-- │           is_new_message }. is_new_message=false em retry/reentrega.     │
-- ╰───────────────────────────────────────────────────────────────────────────╯

CREATE OR REPLACE FUNCTION public.ingest_channel_message(
  p_company_id   UUID,
  p_provider     TEXT,
  p_channel_type TEXT,
  p_payload      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_conn    JSONB := p_payload->'connection';
  v_contact JSONB := p_payload->'contact';
  v_msg     JSONB := p_payload->'message';
  v_raw     JSONB := p_payload->'raw_payload';

  v_connection_id       UUID;
  v_contact_id          UUID;
  v_conversation_id     UUID;
  v_message_id          UUID;
  v_is_new_message      BOOLEAN := false;
  v_conversation_is_new BOOLEAN := false;

  v_direction TEXT        := coalesce(v_msg->>'direction', 'inbound');
  v_msg_ts    TIMESTAMPTZ := coalesce((v_msg->>'message_timestamp')::timestamptz, now());
BEGIN
  IF p_company_id IS NULL OR p_provider IS NULL OR p_channel_type IS NULL
     OR coalesce(v_conn->>'external_id', '') = ''
     OR coalesce(v_contact->>'external_id', '') = ''
     OR coalesce(v_msg->>'provider_message_id', '') = ''
     OR v_direction NOT IN ('inbound', 'outbound') THEN
    RAISE EXCEPTION 'ingest_channel_message: payload incompleto ou inválido: %', p_payload;
  END IF;

  -- 1) connection ------------------------------------------------------------
  INSERT INTO public.channel_connections (
    company_id, provider, channel_type, external_id, display_name, status,
    last_seen_at, capabilities, metadata
  )
  VALUES (
    p_company_id, p_provider, p_channel_type, v_conn->>'external_id',
    coalesce(v_conn->>'display_name', v_conn->>'external_id'), 'active',
    now(), coalesce(v_conn->'capabilities', '{}'::jsonb), coalesce(v_conn->'metadata', '{}'::jsonb)
  )
  ON CONFLICT (provider, external_id) DO UPDATE SET
    status       = 'active',
    last_seen_at = now(),
    display_name = coalesce(EXCLUDED.display_name, public.channel_connections.display_name),
    metadata     = public.channel_connections.metadata || EXCLUDED.metadata
  RETURNING id INTO v_connection_id;

  -- 2) contact -----------------------------------------------------------
  INSERT INTO public.channel_contacts (
    company_id, connection_id, external_contact_id, phone_e164, phone_tail,
    username, name, profile_pic_url, is_group, metadata
  )
  VALUES (
    p_company_id, v_connection_id, v_contact->>'external_id',
    v_contact->>'phone_e164', right(v_contact->>'phone_e164', 10),
    v_contact->>'username', v_contact->>'name', v_contact->>'profile_pic_url',
    coalesce((v_contact->>'is_group')::boolean, false),
    coalesce(v_contact->'metadata', '{}'::jsonb)
  )
  ON CONFLICT (connection_id, external_contact_id) DO UPDATE SET
    name = coalesce(EXCLUDED.name, public.channel_contacts.name)
  RETURNING id INTO v_contact_id;

  -- 3) conversation — garante que existe; stats só mudam depois do passo 4 --
  SELECT id INTO v_conversation_id
  FROM public.channel_conversations
  WHERE connection_id = v_connection_id AND contact_id = v_contact_id;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.channel_conversations (company_id, connection_id, contact_id, status, metadata)
    VALUES (p_company_id, v_connection_id, v_contact_id, 'open', jsonb_build_object('source', p_provider))
    RETURNING id INTO v_conversation_id;
    v_conversation_is_new := true;
  END IF;

  -- 4) message — idempotente por (connection_id, provider_message_id) ------
  INSERT INTO public.channel_messages (
    company_id, connection_id, conversation_id, contact_id,
    provider_message_id, direction, message_type, body, media_ref, status,
    message_timestamp, raw_payload, metadata
  )
  VALUES (
    p_company_id, v_connection_id, v_conversation_id, v_contact_id,
    v_msg->>'provider_message_id', v_direction,
    coalesce(v_msg->>'message_type', 'unknown'), v_msg->>'body',
    coalesce(v_msg->'media_ref', '{}'::jsonb), coalesce(v_msg->>'status', 'received'),
    v_msg_ts, v_raw, coalesce(v_msg->'metadata', '{}'::jsonb)
  )
  ON CONFLICT (connection_id, provider_message_id) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NOT NULL THEN
    v_is_new_message := true;
  ELSE
    -- Reentrega: a mensagem já existia. Busca o id pra devolver mesmo assim.
    SELECT id INTO v_message_id
    FROM public.channel_messages
    WHERE connection_id = v_connection_id AND provider_message_id = v_msg->>'provider_message_id';
  END IF;

  -- 5) stats da conversa — só avançam quando a mensagem é de fato nova -----
  IF v_conversation_is_new THEN
    UPDATE public.channel_conversations SET
      last_message_at  = v_msg_ts,
      last_inbound_at  = CASE WHEN v_direction = 'inbound' THEN v_msg_ts END,
      last_outbound_at = CASE WHEN v_direction = 'outbound' THEN v_msg_ts END,
      unread_count     = CASE WHEN v_direction = 'inbound' THEN 1 ELSE 0 END
    WHERE id = v_conversation_id;
  ELSIF v_is_new_message THEN
    UPDATE public.channel_conversations SET
      last_message_at  = GREATEST(coalesce(last_message_at, v_msg_ts), v_msg_ts),
      last_inbound_at  = CASE WHEN v_direction = 'inbound'
                            THEN GREATEST(coalesce(last_inbound_at, v_msg_ts), v_msg_ts)
                            ELSE last_inbound_at END,
      last_outbound_at = CASE WHEN v_direction = 'outbound'
                            THEN GREATEST(coalesce(last_outbound_at, v_msg_ts), v_msg_ts)
                            ELSE last_outbound_at END,
      unread_count     = CASE WHEN v_direction = 'inbound' THEN unread_count + 1 ELSE unread_count END
    WHERE id = v_conversation_id;
  END IF;
  -- Retry (is_new_message=false, conversation não nova): nenhuma stat muda.

  RETURN jsonb_build_object(
    'connection_id', v_connection_id,
    'contact_id', v_contact_id,
    'conversation_id', v_conversation_id,
    'message_id', v_message_id,
    'is_new_message', v_is_new_message
  );
END;
$$;

COMMENT ON FUNCTION public.ingest_channel_message(UUID, TEXT, TEXT, JSONB) IS
  'Upsert chain único pra qualquer provider de canal (Evolution, Meta Cloud, Instagram...). Idempotente via UNIQUE(connection_id, provider_message_id). Chamada só por edge functions com service_role — dedup de entrega HTTP e log do payload cru ficam por conta do adapter chamador (claim_webhook_event + webhook_logs).';

-- RPC interna: só o backend (service_role) chama, nunca client direto.
GRANT EXECUTE ON FUNCTION public.ingest_channel_message(UUID, TEXT, TEXT, JSONB) TO service_role;


DO $$
BEGIN
  RAISE NOTICE '20260701 aplicado: ingest_channel_message() criada + webhook_logs.connection_id/conversation_id. Nenhum edge function foi alterado ainda.';
END $$;
