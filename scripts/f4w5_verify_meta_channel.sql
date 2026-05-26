-- F4W.5 — Verificação da camada Meta Cloud em channel_*.
-- Somente leitura. Roda todas as seções num resultset unificado.

CREATE TEMP TABLE _f4w5 (section text, label text, label2 text, n bigint, ts1 timestamptz);

INSERT INTO _f4w5 VALUES
('1_connections', 'meta_cloud_total', NULL,
    (SELECT count(*) FROM channel_connections WHERE provider='meta_cloud'), NULL),
('1_connections', 'meta_cloud_active', NULL,
    (SELECT count(*) FROM channel_connections WHERE provider='meta_cloud' AND status='active'), NULL),
('2_messages',    'meta_cloud_total', NULL,
    (SELECT count(*) FROM channel_messages cm
       JOIN channel_connections cc ON cc.id=cm.connection_id
      WHERE cc.provider='meta_cloud'), NULL),
('3_status_events','meta_cloud_total', NULL,
    (SELECT count(*) FROM message_status_events ev
       JOIN channel_connections cc ON cc.id=ev.connection_id
      WHERE cc.provider='meta_cloud'), NULL);

-- Conexões meta_cloud
INSERT INTO _f4w5
SELECT '4_connection_rows', cc.external_id, cc.status, NULL, cc.last_seen_at
FROM channel_connections cc
WHERE cc.provider='meta_cloud'
ORDER BY cc.last_seen_at DESC NULLS LAST
LIMIT 10;

-- Últimas messages meta_cloud
INSERT INTO _f4w5
SELECT '5_recent_messages',
       cm.provider_message_id,
       cm.message_type || ' / ' || (cm.metadata->>'meta_message_type'),
       NULL,
       cm.message_timestamp
FROM channel_messages cm
JOIN channel_connections cc ON cc.id=cm.connection_id
WHERE cc.provider='meta_cloud'
ORDER BY cm.message_timestamp DESC
LIMIT 10;

-- Últimos status events meta_cloud
INSERT INTO _f4w5
SELECT '6_recent_status_events',
       ev.provider_message_id,
       ev.status,
       NULL,
       ev.occurred_at
FROM message_status_events ev
JOIN channel_connections cc ON cc.id=ev.connection_id
WHERE cc.provider='meta_cloud'
ORDER BY ev.occurred_at DESC
LIMIT 10;

-- Por message_type
INSERT INTO _f4w5
SELECT '7_message_type_dist',
       cm.message_type,
       (cm.metadata->>'meta_message_type'),
       count(*),
       NULL
FROM channel_messages cm
JOIN channel_connections cc ON cc.id=cm.connection_id
WHERE cc.provider='meta_cloud'
GROUP BY cm.message_type, (cm.metadata->>'meta_message_type');

SELECT section, label, label2, n, ts1
FROM _f4w5
ORDER BY section, label NULLS FIRST, label2 NULLS FIRST;
