-- ─────────────────────────────────────────────────────────────────────────────
-- 20260929 — Kapso (API oficial do WhatsApp via intermediário)
--
-- Cada empresa do Vyzon vira um "customer" na Kapso. O setup link é gerado para
-- esse customer, e o webhook whatsapp.phone_number.created devolve só o id do
-- customer: esta tabela é o caminho de volta customer → empresa.
--
-- A conexão em si NÃO fica aqui: vai para channel_connections com
-- provider='meta_cloud' e external_id = phone_number_id da Meta, com
-- metadata.transport='kapso'. O phone_number_id é o mesmo com ou sem Kapso,
-- então migrar para Tech Provider próprio não quebra conversa nem histórico.
--
-- Escrita só pelas edge functions (service_role). Leitura para quem é da empresa.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kapso_customers (
  company_id           UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  kapso_customer_id    TEXT NOT NULL UNIQUE,
  requested_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  setup_link_id        TEXT,
  setup_link_url       TEXT,
  setup_link_expires_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kapso_customers IS
  'Empresa ↔ customer da Kapso. requested_by = quem gerou o link; vira metadata.user_id da conexão (dono que recebe as aprovações).';

GRANT SELECT ON public.kapso_customers TO authenticated;
GRANT ALL ON public.kapso_customers TO service_role;

ALTER TABLE public.kapso_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kapso_customers_select ON public.kapso_customers;
CREATE POLICY kapso_customers_select ON public.kapso_customers
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() OR public.is_super_admin());
-- INSERT/UPDATE/DELETE: sem policy para authenticated = negado. Só service_role escreve.

DROP TRIGGER IF EXISTS trg_kapso_customers_updated_at ON public.kapso_customers;
CREATE TRIGGER trg_kapso_customers_updated_at
  BEFORE UPDATE ON public.kapso_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
