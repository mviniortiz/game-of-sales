-- ─────────────────────────────────────────────────────────────────────────────
-- 20260701b — ingest_channel_message v2 (pré-requisito pra plugar o
-- evolution-message-webhook na RPC).
--
-- Duas lacunas da v1 que o webhook atual cobre e a RPC não cobria:
--   1. `is_new_conversation` no retorno — o gate EVA.AUTO.1 (auto-qualificação
--      no 1º contato de número novo) precisa saber se a CONVERSA nasceu agora,
--      não só se a mensagem é nova.
--   2. `sent_by_user_id` — mensagens outbound gravavam o vendedor que enviou;
--      a v1 deixava NULL. Agora aceita `message.sent_by_user_id` no envelope.
--
-- CREATE OR REPLACE: aditivo, mesma assinatura, retrocompatível com qualquer
-- chamador da v1 (campos novos são só adições ao jsonb de retorno).
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_sent_by   UUID        := nullif(coalesce(v_msg->>'sent_by_user_id', ''), '')::uuid;
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
    sent_by_user_id, message_timestamp, raw_payload, metadata
  )
  VALUES (
    p_company_id, v_connection_id, v_conversation_id, v_contact_id,
    v_msg->>'provider_message_id', v_direction,
    coalesce(v_msg->>'message_type', 'unknown'), v_msg->>'body',
    coalesce(v_msg->'media_ref', '{}'::jsonb), coalesce(v_msg->>'status', 'received'),
    v_sent_by, v_msg_ts, v_raw, coalesce(v_msg->'metadata', '{}'::jsonb)
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
    'is_new_message', v_is_new_message,
    'is_new_conversation', v_conversation_is_new
  );
END;
$$;

COMMENT ON FUNCTION public.ingest_channel_message(UUID, TEXT, TEXT, JSONB) IS
  'Upsert chain único pra qualquer provider de canal (Evolution, Meta Cloud, Instagram...). Idempotente via UNIQUE(connection_id, provider_message_id). v2: retorna is_new_conversation e aceita message.sent_by_user_id. Chamada só por edge functions com service_role.';

GRANT EXECUTE ON FUNCTION public.ingest_channel_message(UUID, TEXT, TEXT, JSONB) TO service_role;

DO $$
BEGIN
  RAISE NOTICE '20260701b aplicado: ingest_channel_message v2 (is_new_conversation + sent_by_user_id).';
END $$;
