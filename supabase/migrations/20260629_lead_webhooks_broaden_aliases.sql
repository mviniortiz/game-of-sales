-- Google Sheets sem atrito (#3): amplia os aliases de coluna do lead-webhook pra
-- cobrir nomes BR comuns (Celular, Tel, Fone, Nome completo, Cliente, etc.), que
-- antes caíam em reject silencioso (missing_contact_fields). Aditivo (mais matches,
-- nunca menos). Atualiza só os webhooks que ainda usam o default antigo — mapeamentos
-- customizados são preservados.

-- 1) novo default (linhas novas)
ALTER TABLE public.lead_webhooks
  ALTER COLUMN field_mapping SET DEFAULT '{
    "name":  ["full_name","name","nome","customer_name","lead_name","nome completo","nome do cliente","nome do lead","cliente"],
    "email": ["email","e-mail","e_mail","customer_email","e mail","mail","email do cliente"],
    "phone": ["phone","phone_number","telefone","whatsapp","customer_phone","celular","tel","fone","telefone celular","whatsapp do cliente","numero","número"]
  }'::jsonb;

-- 2) backfill: só onde ainda está o default ANTIGO (não toca em mapeamento custom)
UPDATE public.lead_webhooks
SET field_mapping = '{
    "name":  ["full_name","name","nome","customer_name","lead_name","nome completo","nome do cliente","nome do lead","cliente"],
    "email": ["email","e-mail","e_mail","customer_email","e mail","mail","email do cliente"],
    "phone": ["phone","phone_number","telefone","whatsapp","customer_phone","celular","tel","fone","telefone celular","whatsapp do cliente","numero","número"]
  }'::jsonb
WHERE field_mapping = '{
    "name":  ["full_name","name","nome","customer_name","lead_name"],
    "email": ["email","e-mail","e_mail","customer_email"],
    "phone": ["phone","phone_number","telefone","whatsapp","customer_phone"]
  }'::jsonb;
