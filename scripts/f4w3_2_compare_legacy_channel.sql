-- ─────────────────────────────────────────────────────────────────────────────
-- F4W.3.2 — Legacy vs Channel Consistency Check
--
-- Somente leitura. Compara whatsapp_messages × channel_messages e reporta:
--   - count global elegível e diferença
--   - conversas faltando/extras
--   - count mismatch por conversa
--   - timestamp mismatch
--   - duplicatas em provider_message_id
--   - deal_id missing/mismatch
--   - contact metadata mismatch
--   - distribuição de message_type
--
-- Critério para liberar F4W.4:
--   count_diff explicado apenas pelos filtros esperados,
--   duplicate_provider_message_ids = 0,
--   conversations_missing_in_channel = 0,
--   conversations_with_count_mismatch = 0 (ou lista explicada),
--   timestamp_mismatch = 0 (ou lista explicada),
--   deal_id divergência entendida.
--
-- Não imprime body. Onde precisa comparar texto, usa md5().
-- ─────────────────────────────────────────────────────────────────────────────

-- Sem BEGIN/COMMIT — somente SELECTs.

CREATE TEMP TABLE _f4w3_2_report (k text PRIMARY KEY, v bigint);
CREATE TEMP TABLE _f4w3_2_per_instance (
    instance_name text,
    legacy_count bigint,
    channel_count bigint,
    diff bigint
);
CREATE TEMP TABLE _f4w3_2_msgtype_legacy (
    legacy_type text,
    n bigint
);
CREATE TEMP TABLE _f4w3_2_msgtype_channel (
    channel_type text,
    original_type text,
    n bigint
);
CREATE TEMP TABLE _f4w3_2_mismatches (
    kind text,
    instance_name text,
    chat_jid text,
    legacy_n bigint,
    channel_n bigint,
    legacy_min timestamptz,
    channel_min timestamptz,
    legacy_max timestamptz,
    channel_max timestamptz,
    note text
);

-- Filtro de elegibilidade (idêntico ao backfill F4W.3.1)
-- Cria uma materialized CTE para reuso (PG não tem MV temp, então usamos
-- TEMP TABLE).
CREATE TEMP TABLE _wm_eligible AS
SELECT
    wm.id,
    wm.external_id,
    wm.instance_name,
    wm.user_id,
    wm.company_id,
    wm.chat_jid,
    wm.chat_phone,
    wm.phone_e164_tail,
    wm.contact_name,
    wm.is_group,
    wm.direction,
    wm.message_type,
    wm.body,
    wm.media_url,
    wm.media_mimetype,
    wm.media_caption,
    wm.audio_duration,
    wm.message_timestamp,
    wm.deal_id
FROM whatsapp_messages wm
WHERE wm.external_id IS NOT NULL
  AND wm.chat_jid IS NOT NULL
  AND wm.company_id IS NOT NULL
  AND wm.instance_name LIKE 'wa_%'
  AND wm.chat_jid NOT LIKE '%@broadcast%'
  AND wm.chat_jid NOT LIKE '%@newsletter%'
  AND wm.chat_jid != 'status@broadcast'
  AND NOT (wm.message_type IN ('reaction','protocol') AND wm.body IS NULL);

CREATE INDEX ON _wm_eligible (instance_name, chat_jid);
CREATE INDEX ON _wm_eligible (external_id);

-- ─── 1. Counts globais ──────────────────────────────────────────────────────
INSERT INTO _f4w3_2_report VALUES
('00_legacy_total',                  (SELECT count(*) FROM whatsapp_messages)),
('01_legacy_eligible',               (SELECT count(*) FROM _wm_eligible)),
('02_legacy_filtered_out',           (SELECT count(*) FROM whatsapp_messages) - (SELECT count(*) FROM _wm_eligible)),
('03_channel_messages_total',        (SELECT count(*) FROM channel_messages)),
('04_channel_evolution_total',       (SELECT count(*)
                                       FROM channel_messages cm
                                       JOIN channel_connections cc ON cc.id = cm.connection_id
                                       WHERE cc.provider='evolution')),
('05_count_diff_eligible_vs_channel',
    (SELECT count(*) FROM _wm_eligible)
  - (SELECT count(*) FROM channel_messages cm
       JOIN channel_connections cc ON cc.id = cm.connection_id
       WHERE cc.provider='evolution'));

-- ─── 2. Per instance ────────────────────────────────────────────────────────
INSERT INTO _f4w3_2_per_instance
SELECT
    COALESCE(l.instance_name, c.external_id) AS instance_name,
    COALESCE(l.legacy_count, 0) AS legacy_count,
    COALESCE(c.channel_count, 0) AS channel_count,
    COALESCE(l.legacy_count, 0) - COALESCE(c.channel_count, 0) AS diff
FROM (
    SELECT instance_name, count(*) AS legacy_count
    FROM _wm_eligible
    GROUP BY instance_name
) l
FULL OUTER JOIN (
    SELECT cc.external_id, count(*) AS channel_count
    FROM channel_messages cm
    JOIN channel_connections cc ON cc.id = cm.connection_id
    WHERE cc.provider='evolution'
    GROUP BY cc.external_id
) c ON c.external_id = l.instance_name;

-- ─── 3. Per conversa (count + min/max) ──────────────────────────────────────
-- Agrega legado por (instance_name, chat_jid) e channel por
-- (channel_connections.external_id, channel_contacts.external_contact_id).
-- Faz FULL OUTER JOIN pra detectar missing/extra.

WITH leg AS (
    SELECT
        instance_name,
        chat_jid,
        count(*)                          AS n,
        min(message_timestamp)            AS min_ts,
        max(message_timestamp)            AS max_ts
    FROM _wm_eligible
    GROUP BY instance_name, chat_jid
),
chn AS (
    SELECT
        cc.external_id                    AS instance_name,
        ct.external_contact_id            AS chat_jid,
        count(*)                          AS n,
        min(cm.message_timestamp)         AS min_ts,
        max(cm.message_timestamp)         AS max_ts
    FROM channel_messages cm
    JOIN channel_connections cc ON cc.id = cm.connection_id
    JOIN channel_contacts    ct ON ct.id = cm.contact_id
    WHERE cc.provider='evolution'
    GROUP BY cc.external_id, ct.external_contact_id
),
joined AS (
    SELECT
        COALESCE(leg.instance_name, chn.instance_name) AS instance_name,
        COALESCE(leg.chat_jid,      chn.chat_jid)      AS chat_jid,
        leg.n      AS legacy_n,
        chn.n      AS channel_n,
        leg.min_ts AS legacy_min,
        chn.min_ts AS channel_min,
        leg.max_ts AS legacy_max,
        chn.max_ts AS channel_max
    FROM leg
    FULL OUTER JOIN chn
      ON chn.instance_name = leg.instance_name
     AND chn.chat_jid      = leg.chat_jid
)
INSERT INTO _f4w3_2_mismatches
SELECT
    CASE
        WHEN channel_n IS NULL THEN 'missing_in_channel'
        WHEN legacy_n  IS NULL THEN 'extra_in_channel'
        WHEN legacy_n <> channel_n THEN 'count_mismatch'
        WHEN legacy_min IS DISTINCT FROM channel_min THEN 'min_timestamp_mismatch'
        WHEN legacy_max IS DISTINCT FROM channel_max THEN 'max_timestamp_mismatch'
        ELSE NULL
    END AS kind,
    instance_name,
    chat_jid,
    legacy_n,
    channel_n,
    legacy_min,
    channel_min,
    legacy_max,
    channel_max,
    NULL::text
FROM joined
WHERE (
    channel_n IS NULL
    OR legacy_n IS NULL
    OR legacy_n <> channel_n
    OR legacy_min IS DISTINCT FROM channel_min
    OR legacy_max IS DISTINCT FROM channel_max
);

INSERT INTO _f4w3_2_report VALUES
('10_conversations_legacy',          (SELECT count(*) FROM (SELECT 1 FROM _wm_eligible GROUP BY instance_name, chat_jid) s)),
('11_conversations_channel',         (SELECT count(*) FROM channel_conversations cv
                                       JOIN channel_connections cc ON cc.id = cv.connection_id
                                       WHERE cc.provider='evolution')),
('12_conversations_missing_in_channel', (SELECT count(*) FROM _f4w3_2_mismatches WHERE kind='missing_in_channel')),
('13_conversations_extra_in_channel',   (SELECT count(*) FROM _f4w3_2_mismatches WHERE kind='extra_in_channel')),
('14_conversations_count_mismatch',     (SELECT count(*) FROM _f4w3_2_mismatches WHERE kind='count_mismatch')),
('15_conversations_min_ts_mismatch',    (SELECT count(*) FROM _f4w3_2_mismatches WHERE kind='min_timestamp_mismatch')),
('16_conversations_max_ts_mismatch',    (SELECT count(*) FROM _f4w3_2_mismatches WHERE kind='max_timestamp_mismatch'));

-- ─── 4. Duplicates em provider_message_id ──────────────────────────────────
-- Unique constraint deveria garantir 0; verificação defensiva.
INSERT INTO _f4w3_2_report
SELECT '20_duplicate_provider_message_ids',
       COALESCE(SUM(extra), 0)
FROM (
    SELECT count(*) - 1 AS extra
    FROM channel_messages
    GROUP BY connection_id, provider_message_id
    HAVING count(*) > 1
) d;

-- ─── 5. Deal linkage ───────────────────────────────────────────────────────
-- Por conversa: deal_id mais recente no legado vs deal_id no channel_conversations.
WITH leg_deal AS (
    SELECT
        instance_name,
        chat_jid,
        ( array_agg(deal_id ORDER BY message_timestamp DESC)
            FILTER (WHERE deal_id IS NOT NULL)
        )[1] AS legacy_deal_id
    FROM _wm_eligible
    GROUP BY instance_name, chat_jid
),
chn_deal AS (
    SELECT
        cc.external_id        AS instance_name,
        ct.external_contact_id AS chat_jid,
        cv.deal_id            AS channel_deal_id
    FROM channel_conversations cv
    JOIN channel_connections cc ON cc.id = cv.connection_id
    JOIN channel_contacts    ct ON ct.id = cv.contact_id
    WHERE cc.provider='evolution'
)
INSERT INTO _f4w3_2_report
SELECT '30_deal_missing_in_channel',
       count(*)
FROM leg_deal l
JOIN chn_deal c
  ON c.instance_name=l.instance_name AND c.chat_jid=l.chat_jid
WHERE l.legacy_deal_id IS NOT NULL
  AND c.channel_deal_id IS NULL;

WITH leg_deal AS (
    SELECT
        instance_name,
        chat_jid,
        ( array_agg(deal_id ORDER BY message_timestamp DESC)
            FILTER (WHERE deal_id IS NOT NULL)
        )[1] AS legacy_deal_id
    FROM _wm_eligible
    GROUP BY instance_name, chat_jid
),
chn_deal AS (
    SELECT
        cc.external_id         AS instance_name,
        ct.external_contact_id AS chat_jid,
        cv.deal_id             AS channel_deal_id
    FROM channel_conversations cv
    JOIN channel_connections cc ON cc.id = cv.connection_id
    JOIN channel_contacts    ct ON ct.id = cv.contact_id
    WHERE cc.provider='evolution'
)
INSERT INTO _f4w3_2_report
SELECT '31_deal_mismatch',
       count(*)
FROM leg_deal l
JOIN chn_deal c
  ON c.instance_name=l.instance_name AND c.chat_jid=l.chat_jid
WHERE l.legacy_deal_id IS NOT NULL
  AND c.channel_deal_id IS NOT NULL
  AND l.legacy_deal_id <> c.channel_deal_id;

-- ─── 6. Contact metadata ───────────────────────────────────────────────────
-- Por contato: pega o legado mais recente, compara com channel_contacts.
-- Considera "mismatch" se phone, name ou is_group divergir.
WITH leg_contact AS (
    SELECT DISTINCT ON (instance_name, chat_jid)
        instance_name,
        chat_jid,
        NULLIF(chat_phone,'')      AS chat_phone,
        NULLIF(phone_e164_tail,'') AS phone_tail,
        contact_name,
        is_group
    FROM _wm_eligible
    ORDER BY instance_name, chat_jid, message_timestamp DESC
),
chn_contact AS (
    SELECT
        cc.external_id         AS instance_name,
        ct.external_contact_id AS chat_jid,
        ct.phone_e164,
        ct.phone_tail,
        ct.name,
        ct.is_group
    FROM channel_contacts ct
    JOIN channel_connections cc ON cc.id = ct.connection_id
    WHERE cc.provider='evolution'
)
INSERT INTO _f4w3_2_report
SELECT '40_contact_mismatch',
       count(*)
FROM leg_contact l
JOIN chn_contact c
  ON c.instance_name=l.instance_name AND c.chat_jid=l.chat_jid
WHERE
       l.chat_phone   IS DISTINCT FROM c.phone_e164
    OR l.phone_tail   IS DISTINCT FROM c.phone_tail
    OR l.contact_name IS DISTINCT FROM c.name
    OR l.is_group     IS DISTINCT FROM c.is_group;

-- ─── 7. Message type mapping ───────────────────────────────────────────────
INSERT INTO _f4w3_2_msgtype_legacy
SELECT message_type, count(*) AS n
FROM _wm_eligible
GROUP BY message_type;

INSERT INTO _f4w3_2_msgtype_channel
SELECT cm.message_type,
       (cm.metadata->>'original_type') AS original_type,
       count(*) AS n
FROM channel_messages cm
JOIN channel_connections cc ON cc.id = cm.connection_id
WHERE cc.provider='evolution'
GROUP BY cm.message_type, (cm.metadata->>'original_type');

-- ─── Saída unificada (CLI do Supabase só retorna o último resultset) ──────
-- Todas as seções em uma única tabela com colunas padronizadas.
SELECT
    '1_metrics' AS section,
    k           AS label,
    NULL::text  AS label2,
    NULL::text  AS label3,
    v           AS n1,
    NULL::bigint AS n2,
    NULL::timestamptz AS ts1,
    NULL::timestamptz AS ts2
FROM _f4w3_2_report
UNION ALL
SELECT
    '2_per_instance',
    instance_name,
    NULL, NULL,
    legacy_count,
    channel_count,
    NULL, NULL
FROM _f4w3_2_per_instance
UNION ALL
SELECT
    '3_mismatches',
    COALESCE(kind, 'OK'),
    instance_name,
    chat_jid,
    legacy_n,
    channel_n,
    legacy_max,
    channel_max
FROM _f4w3_2_mismatches
WHERE kind IS NOT NULL
UNION ALL
SELECT
    '4_msgtype_legacy',
    legacy_type,
    NULL, NULL,
    n,
    NULL, NULL, NULL
FROM _f4w3_2_msgtype_legacy
UNION ALL
SELECT
    '4_msgtype_channel',
    channel_type,
    COALESCE(original_type, '(null)'),
    NULL,
    n,
    NULL, NULL, NULL
FROM _f4w3_2_msgtype_channel
ORDER BY section, label, label2 NULLS FIRST;
