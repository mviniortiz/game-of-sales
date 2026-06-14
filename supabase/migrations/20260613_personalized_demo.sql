-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.PERS.1 (2026-06-13) — Demo personalizada por lead
--
-- Depois de agendar a demo, o lead conta o contexto da empresa. Isso dispara
-- (via edge function create-personalized-demo) a clonagem do ambiente base
-- "Agência Metria Growth" renomeado pro negócio dele, e o Markus recebe por
-- email o login/senha do ambiente + o contexto, pra chegar preparado na call.
--
-- Rodar: npx supabase db query --linked -f supabase/migrations/20260613_personalized_demo.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Contexto da empresa + rastreio do ambiente gerado ------------------------
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS company_segment TEXT;
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS company_offer   TEXT;  -- o que vende
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS company_context TEXT;  -- notas livres
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS demo_company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS demo_credentials_sent_at TIMESTAMPTZ;

-- Ao remover um ambiente demo, a referência no lead vira NULL (não bloqueia o delete).
ALTER TABLE public.demo_requests DROP CONSTRAINT IF EXISTS demo_requests_demo_company_id_fkey;
ALTER TABLE public.demo_requests ADD CONSTRAINT demo_requests_demo_company_id_fkey
    FOREIGN KEY (demo_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- 2. Clonagem do ambiente -----------------------------------------------------
-- Copia as 14 tabelas do ambiente, remapeando todos os IDs/FKs por ordem
-- topológica. Usa to_jsonb + jsonb_populate_record pra copiar TODAS as colunas
-- e sobrescrever só as FKs (resiliente a mudanças de schema). Vínculos com
-- profiles (closer_id/sdr_id/last_edited_by) são zerados — o ambiente não
-- clona usuários; o admin é criado depois pela edge function.
CREATE OR REPLACE FUNCTION public.clone_demo_environment(
    p_source_company UUID,
    p_new_name       TEXT,
    p_segment        TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new UUID := gen_random_uuid();
BEGIN
    -- ── company (clona a base, sobrescreve identidade + libera acesso) ──
    INSERT INTO companies
    SELECT (jsonb_populate_record(NULL::companies, to_jsonb(c)
        || jsonb_build_object(
            'id', v_new,
            'name', p_new_name,
            'created_at', now(),
            'updated_at', now(),
            'plan', 'pro',
            'subscription_status', 'trialing',
            'trial_ends_at', (now() + interval '30 days'))
        || CASE WHEN coalesce(p_segment,'') <> ''
                THEN jsonb_build_object('segment', p_segment)
                ELSE '{}'::jsonb END
    )).*
    FROM companies c WHERE c.id = p_source_company;

    -- ── maps old_id → new_id (só das tabelas referenciadas por FK) ──
    CREATE TEMP TABLE _m_pipelines ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM pipelines WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_stages ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM pipeline_stages WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_conns ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM channel_connections WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_contacts ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM channel_contacts WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_tags ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM tags WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_deals ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM deals WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_convs ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM channel_conversations WHERE company_id = p_source_company;
    CREATE TEMP TABLE _m_msgs ON COMMIT DROP AS
        SELECT id AS old_id, gen_random_uuid() AS new_id FROM channel_messages WHERE company_id = p_source_company;

    -- ── inserts em ordem topológica ──
    INSERT INTO pipelines
    SELECT (jsonb_populate_record(NULL::pipelines, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new))).*
    FROM pipelines t JOIN _m_pipelines m ON m.old_id = t.id;

    INSERT INTO pipeline_stages
    SELECT (jsonb_populate_record(NULL::pipeline_stages, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new, 'pipeline_id', pm.new_id))).*
    FROM pipeline_stages t
    JOIN _m_stages m ON m.old_id = t.id
    LEFT JOIN _m_pipelines pm ON pm.old_id = t.pipeline_id;

    -- external_id sobrescrito: a conexão clonada não conecta de verdade e o
    -- par (provider, external_id) é UNIQUE global.
    INSERT INTO channel_connections
    SELECT (jsonb_populate_record(NULL::channel_connections, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new,
            'external_id', 'clone-' || m.new_id::text))).*
    FROM channel_connections t JOIN _m_conns m ON m.old_id = t.id;

    INSERT INTO channel_contacts
    SELECT (jsonb_populate_record(NULL::channel_contacts, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new, 'connection_id', cm.new_id))).*
    FROM channel_contacts t
    JOIN _m_contacts m ON m.old_id = t.id
    LEFT JOIN _m_conns cm ON cm.old_id = t.connection_id;

    INSERT INTO tags
    SELECT (jsonb_populate_record(NULL::tags, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new))).*
    FROM tags t JOIN _m_tags m ON m.old_id = t.id;

    INSERT INTO deals
    SELECT (jsonb_populate_record(NULL::deals, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new,
            'pipeline_id', pm.new_id, 'stage_id', sm.new_id,
            'closer_id', NULL, 'sdr_id', NULL))).*
    FROM deals t
    JOIN _m_deals m ON m.old_id = t.id
    LEFT JOIN _m_pipelines pm ON pm.old_id = t.pipeline_id
    LEFT JOIN _m_stages sm ON sm.old_id = t.stage_id;

    INSERT INTO channel_conversations
    SELECT (jsonb_populate_record(NULL::channel_conversations, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new,
            'connection_id', cm.new_id, 'contact_id', ctm.new_id, 'deal_id', dm.new_id))).*
    FROM channel_conversations t
    JOIN _m_convs m ON m.old_id = t.id
    LEFT JOIN _m_conns cm ON cm.old_id = t.connection_id
    LEFT JOIN _m_contacts ctm ON ctm.old_id = t.contact_id
    LEFT JOIN _m_deals dm ON dm.old_id = t.deal_id;

    INSERT INTO channel_messages
    SELECT (jsonb_populate_record(NULL::channel_messages, to_jsonb(t)
        || jsonb_build_object('id', m.new_id, 'company_id', v_new,
            'connection_id', cm.new_id, 'contact_id', ctm.new_id,
            'conversation_id', convm.new_id, 'reply_to_message_id', rm.new_id))).*
    FROM channel_messages t
    JOIN _m_msgs m ON m.old_id = t.id
    LEFT JOIN _m_conns cm ON cm.old_id = t.connection_id
    LEFT JOIN _m_contacts ctm ON ctm.old_id = t.contact_id
    LEFT JOIN _m_convs convm ON convm.old_id = t.conversation_id
    LEFT JOIN _m_msgs rm ON rm.old_id = t.reply_to_message_id;

    -- conversation_summaries é pulado de propósito: user_id é NOT NULL e aponta
    -- pra profiles da company base (referência órfã cross-tenant) e o par
    -- (user_id, chat_phone) é UNIQUE. A EVA regenera os resumos no ambiente novo.

    INSERT INTO eva_business_context
    SELECT (jsonb_populate_record(NULL::eva_business_context, to_jsonb(t)
        || jsonb_build_object('id', gen_random_uuid(), 'company_id', v_new, 'last_edited_by', NULL))).*
    FROM eva_business_context t
    WHERE t.company_id = p_source_company;

    INSERT INTO tag_assignments
    SELECT (jsonb_populate_record(NULL::tag_assignments, to_jsonb(t)
        || jsonb_build_object('id', gen_random_uuid(), 'company_id', v_new,
            'tag_id', tm.new_id, 'entity_id', dm.new_id))).*
    FROM tag_assignments t
    JOIN _m_tags tm ON tm.old_id = t.tag_id
    JOIN _m_deals dm ON dm.old_id = t.entity_id   -- só tags de deal (entity polimórfico)
    WHERE t.company_id = p_source_company;

    INSERT INTO proposals
    SELECT (jsonb_populate_record(NULL::proposals, to_jsonb(t)
        || jsonb_build_object('id', gen_random_uuid(), 'company_id', v_new, 'deal_id', dm.new_id))).*
    FROM proposals t
    JOIN _m_deals dm ON dm.old_id = t.deal_id
    WHERE t.company_id = p_source_company;

    INSERT INTO whatsapp_templates
    SELECT (jsonb_populate_record(NULL::whatsapp_templates, to_jsonb(t)
        || jsonb_build_object('id', gen_random_uuid(), 'company_id', v_new))).*
    FROM whatsapp_templates t
    WHERE t.company_id = p_source_company;

    -- external_id sobrescrito: par (external_id, instance_name) é UNIQUE global.
    INSERT INTO whatsapp_messages
    SELECT (jsonb_populate_record(NULL::whatsapp_messages, to_jsonb(t)
        || jsonb_build_object('id', gen_random_uuid(), 'company_id', v_new,
            'deal_id', dm.new_id, 'external_id', 'clone-' || gen_random_uuid()::text))).*
    FROM whatsapp_messages t
    LEFT JOIN _m_deals dm ON dm.old_id = t.deal_id
    WHERE t.company_id = p_source_company;

    RETURN v_new;
END;
$$;

-- Só service_role chama (via edge function). Nunca exposta ao client/anon.
REVOKE ALL ON FUNCTION public.clone_demo_environment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_demo_environment(UUID, TEXT, TEXT) TO service_role;

-- 3. Remoção do ambiente (cleanup de demos expiradas / teste) -----------------
-- Apaga em ordem inversa de FK. Não toca em auth.users (o admin do ambiente é
-- removido separadamente pela edge function / rotina de expiração).
CREATE OR REPLACE FUNCTION public.delete_demo_environment(p_company UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM whatsapp_messages      WHERE company_id = p_company;
    DELETE FROM whatsapp_templates     WHERE company_id = p_company;
    DELETE FROM proposals              WHERE company_id = p_company;
    DELETE FROM tag_assignments        WHERE company_id = p_company;
    DELETE FROM eva_business_context   WHERE company_id = p_company;
    DELETE FROM channel_messages       WHERE company_id = p_company;
    DELETE FROM channel_conversations  WHERE company_id = p_company;
    DELETE FROM deals                  WHERE company_id = p_company;
    DELETE FROM channel_contacts       WHERE company_id = p_company;
    DELETE FROM channel_connections    WHERE company_id = p_company;
    DELETE FROM tags                   WHERE company_id = p_company;
    DELETE FROM pipeline_stages        WHERE company_id = p_company;
    DELETE FROM pipelines              WHERE company_id = p_company;
    DELETE FROM profiles               WHERE company_id = p_company;
    DELETE FROM companies              WHERE id = p_company;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_demo_environment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_demo_environment(UUID) TO service_role;
