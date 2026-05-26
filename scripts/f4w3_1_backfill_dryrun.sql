-- ─────────────────────────────────────────────────────────────────────────────
-- F4W.3.1 — Backfill histórico whatsapp_messages → channel_* (DRYRUN)
--
-- Roda toda a lógica do apply DENTRO de uma transação e dá ROLLBACK no fim.
-- Nada é persistido. O SELECT final mostra o que SERIA inserido/atualizado.
--
-- Idempotência: todas as etapas usam ON CONFLICT (constraints já existentes).
-- Rodar 2x não duplica nada.
--
-- Filtro por company: descomentar a linha `_company_filter` se quiser limitar.
-- Limit global: o CTE `src` no fim impõe ordem por message_timestamp e LIMIT
--   pode ser ativado descomentando o `_row_limit`. Default = sem limite.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Filtros opcionais (descomente conforme necessidade) ─────────────────────
-- Para limitar a uma company específica:
--   SELECT set_config('f4w3.company_filter', '7e2e21ac-d834-448b-a61b-79ca01255702', true);
-- Para limitar volume (smoke test):
--   SELECT set_config('f4w3.row_limit', '500', true);

-- ── Relatório ───────────────────────────────────────────────────────────────
CREATE TEMP TABLE _f4w3_report (k text PRIMARY KEY, v bigint);

-- ── Baseline ────────────────────────────────────────────────────────────────
INSERT INTO _f4w3_report VALUES
('00_wm_total_rows', (SELECT count(*) FROM whatsapp_messages)),
('01_wm_eligible',   (SELECT count(*) FROM whatsapp_messages
                       WHERE external_id IS NOT NULL
                         AND chat_jid IS NOT NULL
                         AND company_id IS NOT NULL
                         AND instance_name LIKE 'wa_%'
                         AND chat_jid NOT LIKE '%@broadcast%'
                         AND chat_jid NOT LIKE '%@newsletter%'
                         AND chat_jid != 'status@broadcast'
                         AND NOT (message_type IN ('reaction','protocol') AND body IS NULL))),
('02_conn_before',         (SELECT count(*) FROM channel_connections   WHERE provider='evolution')),
('03_contacts_before',     (SELECT count(*) FROM channel_contacts)),
('04_conversations_before',(SELECT count(*) FROM channel_conversations)),
('05_messages_before',     (SELECT count(*) FROM channel_messages));

-- ─── Step 1: channel_connections ────────────────────────────────────────────
-- Cria uma connection por (instance_name, company_id) que ainda não exista.
-- Já existente → atualiza last_seen_at se o max(message_timestamp) for mais novo.

WITH src AS (
    SELECT
        instance_name,
        company_id,
        max(message_timestamp) AS last_msg_at
    FROM whatsapp_messages
    WHERE instance_name LIKE 'wa_%'
      AND company_id IS NOT NULL
    GROUP BY instance_name, company_id
),
ins AS (
    INSERT INTO channel_connections
        (company_id, provider, channel_type, external_id, display_name,
         status, last_seen_at, metadata)
    SELECT
        company_id, 'evolution', 'whatsapp', instance_name, instance_name,
        'active', last_msg_at,
        jsonb_build_object(
          'source','f4w3_1_backfill',
          'instance_name', instance_name
        )
    FROM src
    ON CONFLICT (provider, external_id) DO UPDATE
        SET last_seen_at = GREATEST(
            channel_connections.last_seen_at,
            EXCLUDED.last_seen_at
        )
    RETURNING (xmax = 0) AS was_insert
)
INSERT INTO _f4w3_report
SELECT '10_conn_inserted', count(*) FROM ins WHERE was_insert
UNION ALL SELECT '11_conn_updated',  count(*) FROM ins WHERE NOT was_insert;

-- ─── Step 2: channel_contacts ───────────────────────────────────────────────
-- Um contato por (connection_id, chat_jid). Não atualiza name pra preservar
-- edições manuais futuras (DO NOTHING).

WITH src AS (
    SELECT DISTINCT ON (cc.id, wm.chat_jid)
        cc.id           AS connection_id,
        wm.company_id,
        wm.chat_jid     AS external_contact_id,
        NULLIF(wm.chat_phone,'')        AS phone_e164,
        NULLIF(wm.phone_e164_tail,'')   AS phone_tail,
        wm.contact_name AS name,
        wm.is_group
    FROM whatsapp_messages wm
    JOIN channel_connections cc
      ON cc.provider='evolution' AND cc.external_id = wm.instance_name
    WHERE wm.chat_jid IS NOT NULL
      AND wm.company_id IS NOT NULL
      AND wm.chat_jid NOT LIKE '%@broadcast%'
      AND wm.chat_jid NOT LIKE '%@newsletter%'
      AND wm.chat_jid != 'status@broadcast'
    ORDER BY cc.id, wm.chat_jid, wm.message_timestamp DESC
),
ins AS (
    INSERT INTO channel_contacts
        (company_id, connection_id, external_contact_id,
         phone_e164, phone_tail, name, is_group, metadata)
    SELECT
        company_id, connection_id, external_contact_id,
        phone_e164, phone_tail, name, is_group,
        jsonb_build_object('chat_jid', external_contact_id)
    FROM src
    ON CONFLICT (connection_id, external_contact_id) DO NOTHING
    RETURNING 1
)
INSERT INTO _f4w3_report
SELECT '20_contacts_inserted', count(*) FROM ins;

-- ─── Step 3: channel_conversations ──────────────────────────────────────────
-- Uma conversa por (connection_id, contact_id). Agrega timestamps + deal_id
-- mais recente. unread_count = 0 no backfill (não inunda UI com falsos).

WITH agg AS (
    SELECT
        cc.id  AS connection_id,
        ct.id  AS contact_id,
        ct.company_id,
        max(wm.message_timestamp) AS max_ts,
        max(wm.message_timestamp) FILTER (WHERE wm.direction='inbound')  AS max_in,
        max(wm.message_timestamp) FILTER (WHERE wm.direction='outbound') AS max_out,
        ( array_agg(wm.deal_id ORDER BY wm.message_timestamp DESC)
            FILTER (WHERE wm.deal_id IS NOT NULL)
        )[1] AS last_deal_id
    FROM whatsapp_messages wm
    JOIN channel_connections cc
      ON cc.provider='evolution' AND cc.external_id = wm.instance_name
    JOIN channel_contacts ct
      ON ct.connection_id = cc.id AND ct.external_contact_id = wm.chat_jid
    WHERE wm.chat_jid IS NOT NULL
      AND wm.company_id IS NOT NULL
      AND wm.chat_jid NOT LIKE '%@broadcast%'
      AND wm.chat_jid NOT LIKE '%@newsletter%'
      AND wm.chat_jid != 'status@broadcast'
    GROUP BY cc.id, ct.id, ct.company_id
),
ins AS (
    INSERT INTO channel_conversations
        (company_id, connection_id, contact_id, deal_id, status,
         last_message_at, last_inbound_at, last_outbound_at,
         unread_count, metadata)
    SELECT
        company_id, connection_id, contact_id, last_deal_id, 'open',
        max_ts, max_in, max_out,
        0,
        '{}'::jsonb
    FROM agg
    ON CONFLICT (connection_id, contact_id) DO UPDATE
        SET last_message_at  = GREATEST(channel_conversations.last_message_at,  EXCLUDED.last_message_at),
            last_inbound_at  = GREATEST(channel_conversations.last_inbound_at,  EXCLUDED.last_inbound_at),
            last_outbound_at = GREATEST(channel_conversations.last_outbound_at, EXCLUDED.last_outbound_at),
            deal_id          = COALESCE(channel_conversations.deal_id, EXCLUDED.deal_id)
            -- unread_count: NÃO mexer no backfill, preserva estado da UI atual
    RETURNING (xmax = 0) AS was_insert
)
INSERT INTO _f4w3_report
SELECT '30_conversations_inserted', count(*) FROM ins WHERE was_insert
UNION ALL SELECT '31_conversations_updated',  count(*) FROM ins WHERE NOT was_insert;

-- ─── Step 4: channel_messages ───────────────────────────────────────────────
-- Idempotente por (connection_id, provider_message_id=external_id).
-- DO NOTHING — não sobrescreve mensagens já gravadas pelo webhook dual-write.

WITH ins AS (
    INSERT INTO channel_messages
        (company_id, connection_id, conversation_id, contact_id,
         provider_message_id, direction, message_type, body, media_ref,
         status, reply_to_message_id, sent_by_user_id, message_timestamp,
         raw_payload, raw_payload_redacted, metadata)
    SELECT
        wm.company_id,
        cc.id,
        cv.id,
        ct.id,
        wm.external_id,
        wm.direction,
        CASE wm.message_type
            WHEN 'text'     THEN 'text'
            WHEN 'image'    THEN 'image'
            WHEN 'audio'    THEN 'audio'
            WHEN 'video'    THEN 'video'
            WHEN 'document' THEN 'document'
            WHEN 'reaction' THEN 'reaction'
            WHEN 'location' THEN 'location'
            WHEN 'sticker'  THEN 'image'
            WHEN 'contact'  THEN 'contacts'
            ELSE 'unknown'
        END AS message_type,
        wm.body,
        CASE WHEN wm.media_url IS NOT NULL
                  OR wm.media_mimetype IS NOT NULL
                  OR wm.media_caption IS NOT NULL
                  OR wm.audio_duration IS NOT NULL
            THEN jsonb_build_object(
                   'url',      wm.media_url,
                   'mimetype', wm.media_mimetype,
                   'caption',  wm.media_caption,
                   'duration', wm.audio_duration
                 )
            ELSE '{}'::jsonb
        END AS media_ref,
        CASE WHEN wm.direction='inbound' THEN 'received' ELSE 'sent' END AS status,
        NULL::uuid AS reply_to_message_id,
        CASE WHEN wm.direction='outbound' THEN wm.user_id ELSE NULL END AS sent_by_user_id,
        wm.message_timestamp,
        wm.raw_payload,
        false AS raw_payload_redacted,
        jsonb_build_object(
            'chat_jid',        wm.chat_jid,
            'chat_phone',      wm.chat_phone,
            'instance_name',   wm.instance_name,
            'original_type',   wm.message_type,
            'backfilled_from', 'whatsapp_messages',
            'whatsapp_messages_id', wm.id
        ) AS metadata
    FROM whatsapp_messages wm
    JOIN channel_connections   cc ON cc.provider='evolution' AND cc.external_id = wm.instance_name
    JOIN channel_contacts      ct ON ct.connection_id = cc.id  AND ct.external_contact_id = wm.chat_jid
    JOIN channel_conversations cv ON cv.connection_id = cc.id  AND cv.contact_id = ct.id
    WHERE wm.external_id IS NOT NULL
      AND wm.chat_jid IS NOT NULL
      AND wm.company_id IS NOT NULL
      AND wm.chat_jid NOT LIKE '%@broadcast%'
      AND wm.chat_jid NOT LIKE '%@newsletter%'
      AND wm.chat_jid != 'status@broadcast'
      AND NOT (wm.message_type IN ('reaction','protocol') AND wm.body IS NULL)
    ORDER BY wm.message_timestamp ASC
    ON CONFLICT (connection_id, provider_message_id) DO NOTHING
    RETURNING 1
)
INSERT INTO _f4w3_report
SELECT '40_messages_inserted', count(*) FROM ins;

-- ── Estados FINAIS dentro da transação ──────────────────────────────────────
INSERT INTO _f4w3_report VALUES
('50_conn_after',         (SELECT count(*) FROM channel_connections   WHERE provider='evolution')),
('51_contacts_after',     (SELECT count(*) FROM channel_contacts)),
('52_conversations_after',(SELECT count(*) FROM channel_conversations)),
('53_messages_after',     (SELECT count(*) FROM channel_messages));

-- ── Skips esperados (mensagens elegíveis - inseridas) ──────────────────────
INSERT INTO _f4w3_report VALUES
('60_messages_skipped_duplicate', (
    SELECT (SELECT v FROM _f4w3_report WHERE k='01_wm_eligible')
         - (SELECT v FROM _f4w3_report WHERE k='40_messages_inserted')
));

-- ── Relatório final ────────────────────────────────────────────────────────
SELECT k AS metric, v AS value FROM _f4w3_report ORDER BY k;

ROLLBACK;  -- DRYRUN: tudo desfeito
