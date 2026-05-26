-- F4E.5.2.1 — Cleanup demo seed + transfer pra company Markus

BEGIN;

-- ── 1. Snapshot estado atual antes do cleanup ────────────────────────────
CREATE TEMP TABLE _f4e_snapshot AS
SELECT
    company_id,
    version,
    jsonb_array_length(COALESCE(playbooks,'[]'::jsonb)) AS pb_count,
    jsonb_array_length(COALESCE(services,'[]'::jsonb)) AS svc_count
FROM eva_business_context
WHERE company_id IN (
    '00000000-0000-0000-0000-000000000001',
    '7e2e21ac-d834-448b-a61b-79ca01255702'
);

-- ── 2. Demo seed: archive sugestões + remove items KB do contexto ───────
UPDATE eva_context_suggestions
   SET status = 'archived'
 WHERE document_id = '821d419f-f9e2-4808-8cad-57eaeb48c785';

-- Remove playbooks que vieram da KB (source='knowledge_base')
UPDATE eva_business_context
   SET playbooks = COALESCE((
       SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(playbooks) elem
        WHERE elem->>'source' IS DISTINCT FROM 'knowledge_base'
   ), '[]'::jsonb)
 WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- Remove services que vieram da KB (source='knowledge_base')
UPDATE eva_business_context
   SET services = COALESCE((
       SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(services) elem
        WHERE elem->>'source' IS DISTINCT FROM 'knowledge_base'
   ), '[]'::jsonb)
 WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- ── 3. Markus company: insert doc novo + copia sugestões ────────────────
-- Doc novo na company Markus
WITH new_doc AS (
    INSERT INTO eva_training_documents (
        company_id, uploaded_by, file_name, file_type, file_size,
        raw_text, status, processed_at, metadata
    )
    SELECT
        '7e2e21ac-d834-448b-a61b-79ca01255702',
        NULL,
        file_name,
        file_type,
        file_size,
        raw_text,
        'processed',                   -- pula etapa "processing" (sugestões já existem)
        now(),
        jsonb_build_object(
            'source','f4e5_2_1_transfer',
            'copied_from_demo_doc','821d419f-f9e2-4808-8cad-57eaeb48c785',
            'suggestions_transferred', 10
        )
    FROM eva_training_documents
    WHERE id = '821d419f-f9e2-4808-8cad-57eaeb48c785'
    RETURNING id
)
-- Copia sugestões pendentes com novo doc_id e company_id
INSERT INTO eva_context_suggestions (
    company_id, document_id, suggestion_type, title, content, confidence, status
)
SELECT
    '7e2e21ac-d834-448b-a61b-79ca01255702',
    (SELECT id FROM new_doc),
    s.suggestion_type,
    s.title,
    s.content,
    s.confidence,
    'pending'   -- reset pra pending no novo tenant
FROM eva_context_suggestions s
WHERE s.document_id = '821d419f-f9e2-4808-8cad-57eaeb48c785';

-- ── 4. Relatório ─────────────────────────────────────────────────────────
SELECT '== ANTES ==' AS marker, * FROM _f4e_snapshot
UNION ALL
SELECT '== DEPOIS ==',
       company_id,
       version,
       jsonb_array_length(COALESCE(playbooks,'[]'::jsonb)),
       jsonb_array_length(COALESCE(services,'[]'::jsonb))
FROM eva_business_context
WHERE company_id IN (
    '00000000-0000-0000-0000-000000000001',
    '7e2e21ac-d834-448b-a61b-79ca01255702'
)
ORDER BY marker, company_id;

COMMIT;

-- ── 5. Resumo do novo doc + sugestões transferidas ──────────────────────
SELECT id, file_name, status, metadata->>'suggestions_transferred' AS sug_transferred
FROM eva_training_documents
WHERE company_id = '7e2e21ac-d834-448b-a61b-79ca01255702'
  AND metadata->>'source' = 'f4e5_2_1_transfer'
ORDER BY created_at DESC
LIMIT 1;
