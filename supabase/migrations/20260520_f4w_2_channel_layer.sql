-- ─────────────────────────────────────────────────────────────────────────────
-- F4W.2 (2026-05-20) — Channel Provider Layer (schema mínimo)
--
-- Cria 5 tabelas normalizadas pra suportar múltiplos providers no futuro:
--   - channel_connections      (uma conexão de canal por empresa)
--   - channel_contacts         (contato dentro de uma conexão)
--   - channel_conversations    (thread)
--   - channel_messages         (mensagem normalizada)
--   - message_status_events    (sent/delivered/read — Meta Cloud)
--
-- ⚠️ ESTA MIGRATION É SÓ SCHEMA. Nenhum read/write da app usa essas tabelas
-- ainda — F4W.3 (Evolution adapter dual-write) liga o primeiro produtor.
--
-- Não altera:
--   - whatsapp_messages
--   - conversation_summaries
--   - whatsapp_templates
--   - webhook_event_receipts, webhook_logs
--   - deals
--
-- Padrões reaproveitados (sem duplicar):
--   - is_super_admin(), get_my_company_id(), has_role(uid, app_role)
--   - public.update_updated_at() — trigger fn genérico que NEW.updated_at=NOW()
--   - GRANTs pra anon/authenticated/service_role (padrão F4E.1.1)
-- ─────────────────────────────────────────────────────────────────────────────


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 1. channel_connections                                                    │
-- ╰───────────────────────────────────────────────────────────────────────────╯

CREATE TABLE IF NOT EXISTS public.channel_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  channel_type    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  display_name    TEXT,
  external_id     TEXT NOT NULL,
  credentials_ref TEXT,                                  -- chave em vault; NUNCA token cru aqui
  capabilities    JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT channel_connections_provider_chk
    CHECK (provider IN ('evolution','meta_cloud','instagram','messenger')),
  CONSTRAINT channel_connections_channel_type_chk
    CHECK (channel_type IN ('whatsapp','instagram','facebook_messenger')),
  CONSTRAINT channel_connections_status_chk
    CHECK (status IN ('pending','active','disconnected','banned','archived','error')),
  CONSTRAINT channel_connections_provider_external_uniq
    UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_company
  ON public.channel_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_company_status
  ON public.channel_connections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_channel_connections_provider_type
  ON public.channel_connections(provider, channel_type);

COMMENT ON TABLE public.channel_connections IS
  'F4W.2: uma conexão de canal por empresa (Evolution, Meta Cloud, Instagram, Messenger). credentials_ref aponta pra vault, nunca contém token cru.';


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 2. channel_contacts                                                       │
-- ╰───────────────────────────────────────────────────────────────────────────╯

CREATE TABLE IF NOT EXISTS public.channel_contacts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id        UUID NOT NULL REFERENCES public.channel_connections(id) ON DELETE CASCADE,
  external_contact_id  TEXT NOT NULL,                   -- chat_jid (evo) | wa_id (meta) | ig user_id
  phone_e164           TEXT,                            -- pra match com deals (NULL pra IG)
  phone_tail           TEXT,                            -- últimos 8-10 dígitos pra index/match
  username             TEXT,                            -- IG/Messenger usernames
  name                 TEXT,
  profile_pic_url      TEXT,
  is_group             BOOLEAN NOT NULL DEFAULT false,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT channel_contacts_connection_external_uniq
    UNIQUE (connection_id, external_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_contacts_company
  ON public.channel_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_connection
  ON public.channel_contacts(connection_id);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_phone_e164
  ON public.channel_contacts(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_contacts_phone_tail
  ON public.channel_contacts(phone_tail) WHERE phone_tail IS NOT NULL;

COMMENT ON TABLE public.channel_contacts IS
  'F4W.2: contato dentro de uma conexão. phone_e164 NULL quando provider não usa telefone (Instagram, Messenger).';


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 3. channel_conversations                                                  │
-- ╰───────────────────────────────────────────────────────────────────────────╯

CREATE TABLE IF NOT EXISTS public.channel_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id     UUID NOT NULL REFERENCES public.channel_connections(id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL REFERENCES public.channel_contacts(id) ON DELETE CASCADE,
  deal_id           UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'open',
  assignee_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at   TIMESTAMPTZ,
  last_inbound_at   TIMESTAMPTZ,
  last_outbound_at  TIMESTAMPTZ,
  unread_count      INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT channel_conversations_status_chk
    CHECK (status IN ('open','snoozed','closed','archived')),
  CONSTRAINT channel_conversations_connection_contact_uniq
    UNIQUE (connection_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_conversations_company
  ON public.channel_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_connection
  ON public.channel_conversations(connection_id);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_contact
  ON public.channel_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_deal
  ON public.channel_conversations(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_conversations_company_status
  ON public.channel_conversations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_channel_conversations_last_msg
  ON public.channel_conversations(last_message_at DESC NULLS LAST);

COMMENT ON TABLE public.channel_conversations IS
  'F4W.2: thread entre empresa e contato. UNIQUE(connection_id, contact_id) garante 1 thread por par.';


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 4. channel_messages                                                       │
-- ╰───────────────────────────────────────────────────────────────────────────╯

CREATE TABLE IF NOT EXISTS public.channel_messages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id            UUID NOT NULL REFERENCES public.channel_connections(id) ON DELETE CASCADE,
  conversation_id          UUID NOT NULL REFERENCES public.channel_conversations(id) ON DELETE CASCADE,
  contact_id               UUID REFERENCES public.channel_contacts(id) ON DELETE SET NULL,
  provider_message_id      TEXT NOT NULL,                -- external_id atual (evo) | wamid (meta)
  direction                TEXT NOT NULL,
  message_type             TEXT NOT NULL,
  body                     TEXT,
  media_ref                JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {url, mimetype, caption, duration, media_id...}
  status                   TEXT NOT NULL DEFAULT 'received',
  reply_to_message_id      UUID REFERENCES public.channel_messages(id) ON DELETE SET NULL,
  sent_by_user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_timestamp        TIMESTAMPTZ NOT NULL,
  raw_payload              JSONB,
  raw_payload_redacted     BOOLEAN NOT NULL DEFAULT false,
  raw_payload_expires_at   TIMESTAMPTZ,                 -- LGPD: hint pra cron de retenção
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT channel_messages_direction_chk
    CHECK (direction IN ('inbound','outbound')),
  CONSTRAINT channel_messages_type_chk
    CHECK (message_type IN ('text','image','audio','video','document','template','reaction','location','contacts','unknown')),
  CONSTRAINT channel_messages_status_chk
    CHECK (status IN ('received','queued','sent','delivered','read','failed')),
  CONSTRAINT channel_messages_provider_uniq
    UNIQUE (connection_id, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_messages_company
  ON public.channel_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_connection
  ON public.channel_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_conversation
  ON public.channel_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_contact
  ON public.channel_messages(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_messages_provider_msg
  ON public.channel_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_timestamp
  ON public.channel_messages(message_timestamp DESC);
-- Acelera o "puxa últimas N da conversa", que vai ser o uso mais comum:
CREATE INDEX IF NOT EXISTS idx_channel_messages_conv_timestamp
  ON public.channel_messages(conversation_id, message_timestamp DESC);

COMMENT ON TABLE public.channel_messages IS
  'F4W.2: mensagem normalizada. raw_payload preserva o original do provider; raw_payload_expires_at é hint pra retenção LGPD (cron futuro).';


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ 5. message_status_events                                                  │
-- ╰───────────────────────────────────────────────────────────────────────────╯

CREATE TABLE IF NOT EXISTS public.message_status_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id        UUID NOT NULL REFERENCES public.channel_connections(id) ON DELETE CASCADE,
  message_id           UUID REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  provider_message_id  TEXT,                            -- útil quando o status chega antes do INSERT
  status               TEXT NOT NULL,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload          JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT message_status_events_status_chk
    CHECK (status IN ('queued','sent','delivered','read','failed'))
);

CREATE INDEX IF NOT EXISTS idx_message_status_events_company
  ON public.message_status_events(company_id);
CREATE INDEX IF NOT EXISTS idx_message_status_events_connection
  ON public.message_status_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_message_status_events_message
  ON public.message_status_events(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_status_events_provider_msg
  ON public.message_status_events(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_status_events_occurred
  ON public.message_status_events(occurred_at DESC);

COMMENT ON TABLE public.message_status_events IS
  'F4W.2: eventos de status (sent/delivered/read/failed). Meta Cloud manda em endpoint separado; o status chega antes da própria mensagem em alguns casos — provider_message_id permite resolver depois.';


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ Triggers updated_at (reusa public.update_updated_at)                      │
-- │ message_status_events não tem updated_at (eventos imutáveis)              │
-- ╰───────────────────────────────────────────────────────────────────────────╯

DROP TRIGGER IF EXISTS trg_channel_connections_updated_at ON public.channel_connections;
CREATE TRIGGER trg_channel_connections_updated_at
  BEFORE UPDATE ON public.channel_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_channel_contacts_updated_at ON public.channel_contacts;
CREATE TRIGGER trg_channel_contacts_updated_at
  BEFORE UPDATE ON public.channel_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_channel_conversations_updated_at ON public.channel_conversations;
CREATE TRIGGER trg_channel_conversations_updated_at
  BEFORE UPDATE ON public.channel_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_channel_messages_updated_at ON public.channel_messages;
CREATE TRIGGER trg_channel_messages_updated_at
  BEFORE UPDATE ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ RLS — padrão multi-tenant Vyzon                                           │
-- │ SELECT: super_admin OR mesma company                                      │
-- │ INSERT/UPDATE: super_admin OR (admin da mesma company)                    │
-- │ DELETE: super_admin (admin usa status='archived' pra "deletar lógico")    │
-- ╰───────────────────────────────────────────────────────────────────────────╯

ALTER TABLE public.channel_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status_events  ENABLE ROW LEVEL SECURITY;

-- ── channel_connections ─────────────────────────────────────────────────────
CREATE POLICY "channel_connections_select"
  ON public.channel_connections FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_connections_insert"
  ON public.channel_connections FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "channel_connections_update"
  ON public.channel_connections FOR UPDATE
  USING (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      company_id = public.get_my_company_id()
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
CREATE POLICY "channel_connections_delete"
  ON public.channel_connections FOR DELETE
  USING (public.is_super_admin());

-- ── channel_contacts ────────────────────────────────────────────────────────
CREATE POLICY "channel_contacts_select"
  ON public.channel_contacts FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_contacts_insert"
  ON public.channel_contacts FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_contacts_update"
  ON public.channel_contacts FOR UPDATE
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_contacts_delete"
  ON public.channel_contacts FOR DELETE
  USING (public.is_super_admin());

-- ── channel_conversations ───────────────────────────────────────────────────
CREATE POLICY "channel_conversations_select"
  ON public.channel_conversations FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_conversations_insert"
  ON public.channel_conversations FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_conversations_update"
  ON public.channel_conversations FOR UPDATE
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_conversations_delete"
  ON public.channel_conversations FOR DELETE
  USING (public.is_super_admin());

-- ── channel_messages ────────────────────────────────────────────────────────
CREATE POLICY "channel_messages_select"
  ON public.channel_messages FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_messages_insert"
  ON public.channel_messages FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_messages_update"
  ON public.channel_messages FOR UPDATE
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "channel_messages_delete"
  ON public.channel_messages FOR DELETE
  USING (public.is_super_admin());

-- ── message_status_events ───────────────────────────────────────────────────
CREATE POLICY "message_status_events_select"
  ON public.message_status_events FOR SELECT
  USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
CREATE POLICY "message_status_events_insert"
  ON public.message_status_events FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
-- Status events são imutáveis: sem UPDATE.
CREATE POLICY "message_status_events_delete"
  ON public.message_status_events FOR DELETE
  USING (public.is_super_admin());


-- ╭───────────────────────────────────────────────────────────────────────────╮
-- │ GRANTs — padrão F4E.1.1 (anon/authenticated/service_role).                │
-- │ RLS continua sendo a defesa real.                                         │
-- ╰───────────────────────────────────────────────────────────────────────────╯

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.channel_connections TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.channel_contacts TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.channel_conversations TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.channel_messages TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.message_status_events TO anon, authenticated, service_role;


DO $$
BEGIN
  RAISE NOTICE 'F4W.2 aplicado: 5 tabelas channel_* + RLS + triggers + GRANTs. Nenhum read/write da app usa ainda.';
END $$;
