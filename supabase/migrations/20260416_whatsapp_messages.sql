-- =========================================
-- WhatsApp messages: persistência + realtime + CRM sync
-- Substitui polling client-side por webhook + Supabase Realtime
-- =========================================

-- 1. Amplia activity_type de deal_activities para aceitar eventos de WhatsApp
ALTER TABLE public.deal_activities
  DROP CONSTRAINT IF EXISTS deal_activities_activity_type_check;

ALTER TABLE public.deal_activities
  ADD CONSTRAINT deal_activities_activity_type_check CHECK (activity_type IN (
    'created', 'stage_changed', 'field_updated', 'won', 'lost',
    'note_added', 'call', 'call_made', 'email_sent', 'meeting_scheduled',
    'whatsapp_received', 'whatsapp_sent'
  ));

-- 2. Tabela principal
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificador estável da Evolution API (previne duplicatas quando o webhook retenta)
  external_id TEXT NOT NULL,

  -- Instância Evolution que recebeu/enviou
  instance_name TEXT NOT NULL,

  -- Scoping multi-tenant
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Chat
  chat_jid TEXT NOT NULL,                         -- e.g. 5511999999999@s.whatsapp.net
  chat_phone TEXT NOT NULL,                       -- dígitos normalizados do jid (ex.: 5511999999999)
  phone_e164_tail TEXT NOT NULL,                  -- últimos 10 dígitos, para match fuzzy com deals.customer_phone
  contact_name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,

  -- Conteúdo
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text',      -- text|image|audio|video|sticker|document|location|other
  body TEXT,
  media_url TEXT,
  media_mimetype TEXT,
  media_caption TEXT,
  audio_duration INTEGER,

  -- CRM match
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,

  -- Timestamps
  message_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Debug / futuros parsers
  raw_payload JSONB,

  CONSTRAINT whatsapp_messages_external_unique UNIQUE (instance_name, external_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_user_chat_time
  ON public.whatsapp_messages (user_id, chat_jid, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_wa_msg_company_time
  ON public.whatsapp_messages (company_id, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_wa_msg_deal
  ON public.whatsapp_messages (deal_id)
  WHERE deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_msg_phone_tail
  ON public.whatsapp_messages (user_id, phone_e164_tail);

-- 3. GRANTs explícitos (Supabase normalmente aplica via hooks do migration runner;
-- aqui garantimos manualmente para rodar via `db query` também)
GRANT ALL ON public.whatsapp_messages TO authenticated, anon, service_role;

-- 4. RLS: vendedor vê seus chats; equipe vê tudo da empresa; super admin bypass
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_select" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

-- Insert é exclusivo da edge function (service role bypassa RLS).
-- Nenhuma policy de insert → nega inserts de clients anon/authenticated.

-- 4. Realtime: habilitar publicação + REPLICA IDENTITY FULL (necessário para
-- que o Realtime aplique RLS de forma confiável em INSERT/UPDATE/DELETE).
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;

-- 5. Função de match com deal + criação de activity no CRM
CREATE OR REPLACE FUNCTION public.whatsapp_message_match_and_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_deal_id UUID;
  matched_company_id UUID;
  activity_kind TEXT;
  preview TEXT;
BEGIN
  -- Só tenta casar se ainda não tem deal vinculado e não é grupo
  IF NEW.deal_id IS NULL AND NEW.is_group = false AND NEW.user_id IS NOT NULL THEN
    SELECT d.id, d.company_id
      INTO matched_deal_id, matched_company_id
    FROM public.deals d
    WHERE d.user_id = NEW.user_id
      AND d.customer_phone IS NOT NULL
      AND regexp_replace(d.customer_phone, '\D', '', 'g') LIKE '%' || NEW.phone_e164_tail
    ORDER BY d.updated_at DESC NULLS LAST
    LIMIT 1;

    IF matched_deal_id IS NOT NULL THEN
      UPDATE public.whatsapp_messages
         SET deal_id = matched_deal_id,
             company_id = COALESCE(company_id, matched_company_id)
       WHERE id = NEW.id;

      activity_kind := CASE WHEN NEW.direction = 'inbound' THEN 'whatsapp_received' ELSE 'whatsapp_sent' END;
      preview := COALESCE(NULLIF(NEW.body, ''), '[' || NEW.message_type || ']');
      IF length(preview) > 200 THEN
        preview := left(preview, 200) || '…';
      END IF;

      INSERT INTO public.deal_activities (
        deal_id, user_id, company_id, activity_type, description, metadata
      ) VALUES (
        matched_deal_id,
        NEW.user_id,
        COALESCE(NEW.company_id, matched_company_id),
        activity_kind,
        preview,
        jsonb_build_object(
          'whatsapp_message_id', NEW.id,
          'chat_jid', NEW.chat_jid,
          'message_type', NEW.message_type,
          'direction', NEW.direction
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_message_match ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_message_match
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.whatsapp_message_match_and_log();

-- 6. Touch conversation_summaries (para Eva enxergar atividade recente sem recomputar)
CREATE OR REPLACE FUNCTION public.whatsapp_message_touch_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_group OR NEW.user_id IS NULL OR NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Apenas atualiza row existente; a Eva cuida de criar (summary/analyzed_at são NOT NULL).
  -- Wrap em EXCEPTION para garantir que trigger NUNCA derrube o insert da mensagem.
  BEGIN
    UPDATE public.conversation_summaries
       SET message_count = message_count + 1,
           last_message_at = GREATEST(COALESCE(last_message_at, NEW.message_timestamp), NEW.message_timestamp),
           chat_name = COALESCE(chat_name, NEW.contact_name),
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND chat_phone = NEW.chat_phone;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_touch_summary ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_touch_summary
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.whatsapp_message_touch_summary();
