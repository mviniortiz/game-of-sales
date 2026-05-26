-- ─────────────────────────────────────────────────────────────────────────────
-- F4W.4.2 — Backfill metadata.user_id em channel_connections (Evolution)
--
-- Deriva user_id do external_id quando bate o padrão wa_<32 hex>:
--   external_id = 'wa_' || replace(user_id::text, '-', '')
--
-- Idempotente: só atualiza onde metadata.user_id ainda não existe E o
-- external_id é parseável E o uuid derivado existe em profiles.
--
-- Não toca em outras chaves de metadata (preserva via `||`).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TEMP TABLE _f4w4_2_report (k text PRIMARY KEY, v bigint);

INSERT INTO _f4w4_2_report VALUES
('00_total_evolution_connections',
    (SELECT count(*) FROM channel_connections WHERE provider='evolution')),
('01_already_have_user_id',
    (SELECT count(*) FROM channel_connections
      WHERE provider='evolution'
        AND metadata ? 'user_id'
        AND nullif(metadata->>'user_id','') IS NOT NULL)),
('02_eligible_for_backfill',
    (SELECT count(*) FROM channel_connections
      WHERE provider='evolution'
        AND external_id ~ '^wa_[0-9a-f]{32}$'
        AND (metadata IS NULL OR NOT metadata ? 'user_id'
             OR nullif(metadata->>'user_id','') IS NULL)));

-- Derivação: 'wa_aaaabbbbccccdddd...' → uuid 'aaaabbbb-cccc-dddd-...'
WITH parsed AS (
    SELECT
        cc.id,
        cc.metadata,
        (
            substring(cc.external_id from 4  for 8)  || '-' ||
            substring(cc.external_id from 12 for 4)  || '-' ||
            substring(cc.external_id from 16 for 4)  || '-' ||
            substring(cc.external_id from 20 for 4)  || '-' ||
            substring(cc.external_id from 24 for 12)
        )::uuid AS derived_user_id
    FROM channel_connections cc
    WHERE cc.provider='evolution'
      AND cc.external_id ~ '^wa_[0-9a-f]{32}$'
      AND (cc.metadata IS NULL OR NOT cc.metadata ? 'user_id'
           OR nullif(cc.metadata->>'user_id','') IS NULL)
),
valid AS (
    -- Só backfilla se o user existir em profiles (não cria pointer pra órfão)
    SELECT p.id, p.metadata, p.derived_user_id
    FROM parsed p
    JOIN profiles pr ON pr.id = p.derived_user_id
),
upd AS (
    UPDATE channel_connections cc
       SET metadata = COALESCE(cc.metadata, '{}'::jsonb)
                      || jsonb_build_object('user_id', v.derived_user_id::text)
      FROM valid v
     WHERE cc.id = v.id
    RETURNING cc.id, v.derived_user_id
)
INSERT INTO _f4w4_2_report
SELECT '10_backfilled', count(*) FROM upd;

INSERT INTO _f4w4_2_report VALUES
('11_orphan_external_id_no_profile',
    (SELECT count(*) FROM (
        WITH parsed AS (
            SELECT
                (
                    substring(cc.external_id from 4  for 8)  || '-' ||
                    substring(cc.external_id from 12 for 4)  || '-' ||
                    substring(cc.external_id from 16 for 4)  || '-' ||
                    substring(cc.external_id from 20 for 4)  || '-' ||
                    substring(cc.external_id from 24 for 12)
                )::uuid AS derived_user_id
            FROM channel_connections cc
            WHERE cc.provider='evolution'
              AND cc.external_id ~ '^wa_[0-9a-f]{32}$'
              AND (cc.metadata IS NULL OR NOT cc.metadata ? 'user_id')
        )
        SELECT 1
        FROM parsed p
        LEFT JOIN profiles pr ON pr.id = p.derived_user_id
        WHERE pr.id IS NULL
    ) x)),
('12_non_parseable_external_id',
    (SELECT count(*) FROM channel_connections
      WHERE provider='evolution'
        AND external_id !~ '^wa_[0-9a-f]{32}$')),
('20_with_user_id_after',
    (SELECT count(*) FROM channel_connections
      WHERE provider='evolution'
        AND metadata ? 'user_id'
        AND nullif(metadata->>'user_id','') IS NOT NULL));

SELECT k AS metric, v AS value FROM _f4w4_2_report ORDER BY k;

COMMIT;
