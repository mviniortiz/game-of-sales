-- Fix: whatsapp_message_touch_summary estava tentando INSERT mas conversation_summaries
-- tem várias colunas NOT NULL (summary, analyzed_at) que a Eva preenche posteriormente.
-- Novo comportamento: só UPDATE se já existir row; nunca derruba o insert da mensagem.

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
  BEGIN
    UPDATE public.conversation_summaries
       SET message_count = message_count + 1,
           last_message_at = GREATEST(COALESCE(last_message_at, NEW.message_timestamp), NEW.message_timestamp),
           chat_name = COALESCE(chat_name, NEW.contact_name),
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND chat_phone = NEW.chat_phone;
  EXCEPTION WHEN OTHERS THEN
    -- trigger nunca deve derrubar o insert da mensagem
    NULL;
  END;
  RETURN NEW;
END;
$$;
