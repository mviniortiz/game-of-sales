-- F4W.3 dry-run: simula o dual-write com a mesma lógica da edge function,
-- usando dados do Markus. Roda em transação e dá ROLLBACK no fim.
-- Valida enums/uniques/tipos sem persistir nada.

BEGIN;

-- Vars de teste (mesma instance real do Markus)
DO $$
DECLARE
    v_instance text := 'wa_f4w3dryrun00000000000000000000ab';
    v_user uuid := '10a4e304-a1a6-4fdf-9778-5aff61f9b71a';
    v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702';
    v_jid text := '5511999999999@s.whatsapp.net';
    v_phone text := '5511999999999';
    v_phone_tail text := '11999999999';
    v_external_id text := 'F4W3_DRYRUN_MSG_1';
    v_ts timestamptz := now();
    v_connection_id uuid;
    v_contact_id uuid;
    v_conversation_id uuid;
    v_message_id uuid;
BEGIN
    -- 1. channel_connections
    INSERT INTO channel_connections (
        company_id, provider, channel_type, external_id, display_name,
        status, last_seen_at, metadata
    ) VALUES (
        v_company, 'evolution', 'whatsapp', v_instance, v_instance,
        'active', now(),
        jsonb_build_object('source','evolution-message-webhook','instance_name', v_instance)
    )
    RETURNING id INTO v_connection_id;
    RAISE NOTICE 'connection_id=%', v_connection_id;

    -- 2. channel_contacts
    INSERT INTO channel_contacts (
        company_id, connection_id, external_contact_id,
        phone_e164, phone_tail, name, is_group, metadata
    ) VALUES (
        v_company, v_connection_id, v_jid,
        v_phone, v_phone_tail, 'Markus Test', false,
        jsonb_build_object('chat_jid', v_jid)
    )
    RETURNING id INTO v_contact_id;
    RAISE NOTICE 'contact_id=%', v_contact_id;

    -- 3. channel_conversations
    INSERT INTO channel_conversations (
        company_id, connection_id, contact_id, status,
        last_message_at, last_inbound_at, unread_count, metadata
    ) VALUES (
        v_company, v_connection_id, v_contact_id, 'open',
        v_ts, v_ts, 1, '{}'::jsonb
    )
    RETURNING id INTO v_conversation_id;
    RAISE NOTICE 'conversation_id=%', v_conversation_id;

    -- 4. channel_messages (inbound text)
    INSERT INTO channel_messages (
        company_id, connection_id, conversation_id, contact_id,
        provider_message_id, direction, message_type, body, media_ref,
        status, reply_to_message_id, sent_by_user_id, message_timestamp,
        raw_payload, raw_payload_redacted, metadata
    ) VALUES (
        v_company, v_connection_id, v_conversation_id, v_contact_id,
        v_external_id, 'inbound', 'text', 'Olá, isso é um teste', '{}'::jsonb,
        'received', NULL, NULL, v_ts,
        '{"dryrun":true}'::jsonb, false,
        jsonb_build_object('chat_jid', v_jid, 'chat_phone', v_phone,
                          'instance_name', v_instance, 'original_type', 'text')
    )
    RETURNING id INTO v_message_id;
    RAISE NOTICE 'message_id=%', v_message_id;

    -- 5. Idempotência: tenta inserir a MESMA mensagem
    BEGIN
        INSERT INTO channel_messages (
            company_id, connection_id, conversation_id, contact_id,
            provider_message_id, direction, message_type, status, message_timestamp,
            media_ref
        ) VALUES (
            v_company, v_connection_id, v_conversation_id, v_contact_id,
            v_external_id, 'inbound', 'text', 'received', v_ts, '{}'::jsonb
        );
        RAISE EXCEPTION 'idempotency_broken: duplicate did not raise';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'idempotency_ok: duplicate raised unique_violation as expected';
    END;

    -- 6. Sticker → image mapping
    INSERT INTO channel_messages (
        company_id, connection_id, conversation_id, contact_id,
        provider_message_id, direction, message_type, status, message_timestamp,
        media_ref, metadata
    ) VALUES (
        v_company, v_connection_id, v_conversation_id, v_contact_id,
        'F4W3_DRYRUN_STICKER', 'inbound', 'image', 'received', v_ts,
        '{}'::jsonb, jsonb_build_object('original_type','sticker')
    );
    RAISE NOTICE 'sticker_mapped_to_image_ok';

    -- 7. Protocol/other → unknown
    INSERT INTO channel_messages (
        company_id, connection_id, conversation_id, contact_id,
        provider_message_id, direction, message_type, status, message_timestamp,
        media_ref, metadata
    ) VALUES (
        v_company, v_connection_id, v_conversation_id, v_contact_id,
        'F4W3_DRYRUN_OTHER', 'inbound', 'unknown', 'received', v_ts,
        '{}'::jsonb, jsonb_build_object('original_type','other')
    );
    RAISE NOTICE 'other_mapped_to_unknown_ok';

    -- 8. Contact → contacts
    INSERT INTO channel_messages (
        company_id, connection_id, conversation_id, contact_id,
        provider_message_id, direction, message_type, status, message_timestamp,
        media_ref, metadata
    ) VALUES (
        v_company, v_connection_id, v_conversation_id, v_contact_id,
        'F4W3_DRYRUN_CONTACT', 'inbound', 'contacts', 'received', v_ts,
        '{}'::jsonb, jsonb_build_object('original_type','contact')
    );
    RAISE NOTICE 'contact_mapped_to_contacts_ok';

    -- 9. Outbound
    INSERT INTO channel_messages (
        company_id, connection_id, conversation_id, contact_id,
        provider_message_id, direction, message_type, status, message_timestamp,
        media_ref, sent_by_user_id
    ) VALUES (
        v_company, v_connection_id, v_conversation_id, v_contact_id,
        'F4W3_DRYRUN_OUT', 'outbound', 'text', 'sent', v_ts,
        '{}'::jsonb, v_user
    );
    RAISE NOTICE 'outbound_sent_status_ok';

    RAISE NOTICE '=== F4W.3 DRYRUN OK ===';
END $$;

ROLLBACK;
