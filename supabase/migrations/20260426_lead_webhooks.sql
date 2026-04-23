-- ═══════════════════════════════════════════════════════════════════
-- Lead Webhooks (Meta Lead Ads, Zapier, Make, custom)
-- ═══════════════════════════════════════════════════════════════════
-- Cada linha = uma URL pública no formato /lead-webhook/:slug que
-- aceita POST com payload de lead. A edge function valida shared
-- secret e chama ingest_lead_webhook pra criar o deal.
--
-- Sem OAuth direto (Meta Lead Ads via Facebook Graph exige review
-- caro). Caminho prático: o cliente conecta Zapier/Make/Make Lead
-- Ads Sync (grátis) que manda webhook pra cá.

-- Campos extras em deals pra rastrear origem
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS source_data JSONB;

CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON public.deals(lead_source)
  WHERE lead_source IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.lead_webhooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  secret          TEXT NOT NULL,
  label           TEXT NOT NULL DEFAULT 'Webhook de leads',
  source_kind     TEXT NOT NULL DEFAULT 'custom'
    CHECK (source_kind IN ('meta_lead_ads','google_lead_form','zapier','make','custom')),
  field_mapping   JSONB NOT NULL DEFAULT '{
    "name":  ["full_name","name","nome","customer_name","lead_name"],
    "email": ["email","e-mail","e_mail","customer_email"],
    "phone": ["phone","phone_number","telefone","whatsapp","customer_phone"]
  }'::jsonb,
  default_product_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  default_owner_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  total_received  INTEGER NOT NULL DEFAULT 0,
  total_rejected  INTEGER NOT NULL DEFAULT 0,
  last_seen_at    TIMESTAMPTZ,
  last_error      TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_webhooks_company_id ON public.lead_webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_webhooks_slug ON public.lead_webhooks(slug);

CREATE OR REPLACE FUNCTION public.lead_webhooks_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_webhooks_updated_at ON public.lead_webhooks;
CREATE TRIGGER trg_lead_webhooks_updated_at
  BEFORE UPDATE ON public.lead_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.lead_webhooks_set_updated_at();

-- ═══ RLS ═══════════════════════════════════════════════════════════
ALTER TABLE public.lead_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company admins manage lead_webhooks" ON public.lead_webhooks;
CREATE POLICY "company admins manage lead_webhooks"
  ON public.lead_webhooks
  FOR ALL
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (SELECT 1 FROM profiles sa WHERE sa.id = auth.uid() AND sa.is_super_admin = TRUE)
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (SELECT 1 FROM profiles sa WHERE sa.id = auth.uid() AND sa.is_super_admin = TRUE)
  );

GRANT ALL ON public.lead_webhooks TO authenticated;
GRANT ALL ON public.lead_webhooks TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- RPC: pick_field — procura um valor no payload usando os aliases
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.pick_field(
  p_payload JSONB,
  p_aliases JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_alias TEXT;
  v_value TEXT;
  v_flat  JSONB;
  v_item  JSONB;
BEGIN
  IF p_payload IS NULL OR p_aliases IS NULL THEN
    RETURN NULL;
  END IF;

  -- Meta Lead Ads encapsula campos em field_data: [{name, values:[...]}]
  v_flat := p_payload;
  IF jsonb_typeof(p_payload->'field_data') = 'array' THEN
    SELECT jsonb_object_agg(
      LOWER(COALESCE(item->>'name','')),
      COALESCE(item->'values'->>0, '')
    )
    INTO v_flat
    FROM jsonb_array_elements(p_payload->'field_data') item;
  END IF;

  FOR v_alias IN SELECT jsonb_array_elements_text(p_aliases)
  LOOP
    v_value := NULLIF(COALESCE(
      v_flat->>(v_alias),
      v_flat->>LOWER(v_alias),
      p_payload->>(v_alias),
      p_payload->>LOWER(v_alias)
    ), '');
    IF v_value IS NOT NULL THEN
      RETURN v_value;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- RPC: ingest_lead_webhook
-- Chamada pela edge function com service_role. Valida slug+secret,
-- mapeia campos, cria deal em stage=lead. Retorna {ok, deal_id}.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ingest_lead_webhook(
  p_slug    TEXT,
  p_secret  TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hook    public.lead_webhooks%ROWTYPE;
  v_name    TEXT;
  v_email   TEXT;
  v_phone   TEXT;
  v_deal_id UUID;
  v_owner   UUID;
BEGIN
  SELECT * INTO v_hook
  FROM public.lead_webhooks
  WHERE slug = p_slug
  LIMIT 1;

  IF v_hook.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_hook.secret <> p_secret THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'invalid_secret'
    WHERE id = v_hook.id;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_secret');
  END IF;

  IF NOT v_hook.enabled THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'disabled'
    WHERE id = v_hook.id;
    RETURN jsonb_build_object('ok', false, 'error', 'disabled');
  END IF;

  v_name  := public.pick_field(p_payload, v_hook.field_mapping->'name');
  v_email := public.pick_field(p_payload, v_hook.field_mapping->'email');
  v_phone := public.pick_field(p_payload, v_hook.field_mapping->'phone');

  IF COALESCE(v_name, v_email, v_phone) IS NULL THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'missing_contact_fields',
        last_seen_at = NOW()
    WHERE id = v_hook.id;
    RETURN jsonb_build_object('ok', false, 'error', 'missing_contact_fields');
  END IF;

  v_owner := COALESCE(
    v_hook.default_owner_id,
    (SELECT p.id FROM profiles p
      WHERE p.company_id = v_hook.company_id
      ORDER BY
        CASE WHEN p.role = 'admin' THEN 0 ELSE 1 END,
        p.created_at
      LIMIT 1)
  );

  IF v_owner IS NULL THEN
    UPDATE public.lead_webhooks
    SET total_rejected = total_rejected + 1,
        last_error = 'no_owner_available',
        last_seen_at = NOW()
    WHERE id = v_hook.id;
    RETURN jsonb_build_object('ok', false, 'error', 'no_owner_available');
  END IF;

  INSERT INTO public.deals (
    title,
    customer_name,
    customer_email,
    customer_phone,
    stage,
    user_id,
    company_id,
    product_id,
    lead_source,
    source_data
  ) VALUES (
    COALESCE(NULLIF(v_name, ''), v_email, v_phone, 'Novo lead'),
    COALESCE(NULLIF(v_name, ''), 'Lead sem nome'),
    v_email,
    v_phone,
    'lead',
    v_owner,
    v_hook.company_id,
    v_hook.default_product_id,
    v_hook.source_kind,
    p_payload
  )
  RETURNING id INTO v_deal_id;

  UPDATE public.lead_webhooks
  SET total_received = total_received + 1,
      last_seen_at = NOW(),
      last_error = NULL
  WHERE id = v_hook.id;

  RETURN jsonb_build_object('ok', true, 'deal_id', v_deal_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_lead_webhook(TEXT, TEXT, JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION public.ingest_lead_webhook(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.lead_webhooks IS 'Endpoints públicos (slug+secret) que recebem payloads de lead e criam deals.';
COMMENT ON FUNCTION public.ingest_lead_webhook(TEXT, TEXT, JSONB) IS 'Chamada por edge function com service_role. Valida, mapeia e insere deal.';
