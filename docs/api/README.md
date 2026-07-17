# API interna do Vyzon

Documentação da superfície de API do produto. Hoje a "API" do Vyzon é composta de
três camadas:

1. **Edge Functions** (Supabase, Deno) — 52 endpoints HTTP que cobrem webhooks de
   pagamento, WhatsApp, voz, EVA, agenda, auth e admin. Catálogo completo em
   [`edge-functions.md`](./edge-functions.md).
2. **PostgREST** (Supabase) — CRUD автоgerado das tabelas + RPCs, protegido por RLS
   por `company_id`. Spec OpenAPI nativa exposta pelo Supabase.
3. **Realtime** (Supabase) — canais de assinatura (ex.: inbox ao vivo).

> Status: documentação interna (Fase 1). O objetivo é evoluir para um portal
> público versionado (`/api/v1`) e um **MCP server** para as IAs (EVA, Claude,
> Cursor) consultarem a doc e executarem chamadas. Ver [Roadmap](#roadmap).

## Modelos de autenticação

Os endpoints usam um destes modelos (detalhado por endpoint no catálogo):

| Modelo | Como funciona | Usado por |
|---|---|---|
| **JWT do usuário** | `Authorization: Bearer <user_jwt>`, validado via `auth.getUser()`; checa role/`company_id` | Endpoints chamados pelo app logado (admin-*, deal-call-*, evolution-whatsapp, report-agent, whatsapp-copilot, mercadopago-create/cancel-subscription, twilio-generate-token) |
| **Segredo de webhook** | Token em header próprio (`x-<provedor>-token`) validado contra `integration_configs.hottok` | Webhooks de venda (hotmart, kiwify, asaas, braip, cakto, greenn, pagarme, rdstation, zapier, mercadopago-sales) |
| **HMAC assinado** | Assinatura SHA-256 timing-safe do corpo | kiwify, stripe, mercadopago-webhook, meta-whatsapp-webhook |
| **Segredo de plataforma** | Env secreta (`EVOLUTION_WEBHOOK_SECRET`, `TWILIO_WEBHOOK_SECRET`, `EVA_CRON_SECRET`) via query/header | Receivers Evolution/Twilio, crons da EVA |
| **State HMAC** | Parâmetro `state` assinado (CSRF) | google-oauth-init / callback |
| **Token-como-segredo** | Um token opaco na URL é a própria credencial | public-report (`share_token`), lead-webhook (`slug`+`secret`) |
| **Interno (sem header)** | Sem auth de chamador; protegido por ser invocado por trigger/cron e pela lógica de negócio | admin-lead-digest, calendar-book/slots, create-personalized-demo, sdr-auto-outreach, notify-channel, upload-ads-conversion |

Escritas privilegiadas usam sempre a `SERVICE_ROLE_KEY` (bypassa RLS) — nunca exposta ao cliente.

## Convenções transversais

- **Idempotência de webhooks de venda:** todo webhook de pagamento usa as RPCs
  `claim_webhook_event` / `mark_webhook_event_status` e registra em `webhook_logs`.
  Evento repetido retorna `{ duplicate: true }`.
- **Resultado de venda → pipeline:** pagamentos confirmados viram `deals` em
  `closed_won` + linha em `vendas`; reembolso/cancelamento/chargeback → `closed_lost`.
- **Dual-write de WhatsApp:** mensagens entram em `whatsapp_messages` (legado) e nas
  tabelas `channel_*` (atual).
- **Rate limiting:** RPC `consume_rate_limit` por empresa/usuário em endpoints sensíveis.
- **Enforce de plano:** features pagas (calls, EVA) checam `companies.plan` e
  `company_addons`; `is_super_admin` bypassa.
- **CORS:** todos tratam `OPTIONS` com headers permissivos.

## Roadmap

- [x] **Fase 1 — Inventário** desta doc (catálogo das 52 functions + convenções).
- [ ] **Fase 2 — OpenAPI** (`openapi.yaml`) descrevendo os endpoints chamáveis pelo app.
- [ ] **Fase 3 — Plataforma de docs + MCP**: publicar com Mintlify (docs-as-code MDX,
      API playground e MCP server automático em `/mcp`) ou Docusaurus self-host. O MCP
      permite que a EVA/Claude/Cursor consultem a doc e executem chamadas.
- [ ] **Fase 4 — API pública versionada** (`/api/v1`) para integrações de clientes.

## Biblioteca de produto

Documentação de como funciona cada seção do produto (Inbox, Pipeline, EVA, Agentes,
Metas, Ranking) vive em [`../product/`](../product/) e será incorporada ao mesmo portal.
