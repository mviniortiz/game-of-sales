# Catálogo de Edge Functions

52 endpoints HTTP (Supabase Functions, Deno). Base URL:
`https://<project>.supabase.co/functions/v1/<nome>`. Todos tratam `OPTIONS` (CORS).
Ver [modelos de auth e convenções](./README.md).

Índice: [Webhooks de venda](#webhooks-de-venda) · [Assinatura Vyzon](#assinatura-vyzon-mercado-pago) ·
[WhatsApp](#whatsapp) · [EVA](#eva) · [Calls/Voz](#callsvoz) · [Agenda](#agenda-google-calendar) ·
[Auth](#auth-google-oauth) · [Admin](#admin) · [Demo e Leads](#demo-e-leads) · [Ads](#ads)

---

## Webhooks de venda

Recebem eventos de provedores de pagamento/checkout e materializam `deals` + `vendas`.
Padrão comum: auth por segredo em `integration_configs.hottok`, idempotência via
`claim_webhook_event`/`mark_webhook_event_status`, log em `webhook_logs`,
`{ success, event, deal_id }` ou `{ duplicate: true }`. Todos POST.

| Endpoint | Auth | Notas |
|---|---|---|
| `hotmart-webhook` | header `x-hotmart-hottok` | buyer/purchase/product |
| `kiwify-webhook` | **HMAC** `x-kiwify-signature` (timing-safe) | order_status |
| `asaas-webhook` | header `asaas-access-token` | re-busca cliente na API Asaas |
| `braip-webhook` | header `x-braip-token` | order.paid/refunded/... |
| `cakto-webhook` | header `x-cakto-token` | purchase_approved/... |
| `greenn-webhook` | header `x-greenn-token` | purchase_approved/... |
| `pagarme-webhook` | **Basic Auth** | order/charge/subscription (API v5) |
| `stripe-webhook` | **HMAC** `Stripe-Signature` (raw body) | re-busca customer na Stripe API |
| `rdstation-webhook` | header configurável vs `hottok` | Marketing + CRM |
| `zapier-webhook` | header `x-zapier-token` | payload genérico normalizado |
| `mercadopago-sales-webhook` | header `x-mp-access-token` | re-busca `GET /v1/payments/:id`; vendas da agência (≠ assinatura Vyzon) |
| `notazz-webhook` | header `x-notazz-token` | nota fiscal; só anota `deals.notes`, não cria venda |

## Assinatura Vyzon (Mercado Pago)

Cobrança da própria assinatura do Vyzon (trial 14 dias, checkout transparente).

- **`mercadopago-create-subscription`** — POST · JWT do usuário + ownership do tenant ·
  body `token`, `email`, `planId`, `companyId`, `payerInfo`, `billingConfig`, `upgrade` ·
  cria preapproval, atualiza `companies` (mp_subscription_id, subscription_status, trial_ends_at).
- **`mercadopago-cancel-subscription`** — POST · JWT + admin/super_admin · body `companyId`, `reason` ·
  cancela preapproval, atualiza `companies`.
- **`mercadopago-webhook`** — POST · **HMAC** `x-signature`+`x-request-id` vs `MERCADOPAGO_WEBHOOK_SECRET` ·
  evento `subscription_preapproval`; responde `{ received: true }` e sincroniza status em background.

## WhatsApp

- **`evolution-whatsapp`** — POST · JWT do usuário · proxy do app para a Evolution API.
  `action`: status/connect(QR)/chats/messages/send/sendMedia/sendAudio/logout/profilePic/
  instances/monitor/import_history/... · resposta varia por ação.
- **`evolution-message-webhook`** — POST · `EVOLUTION_WEBHOOK_SECRET` · receiver Evolution;
  persiste `messages.upsert`/`messages.update` com dual-write `whatsapp_messages` + `channel_*`;
  trava de modo prospecção (PROSPECT.1) descarta grupos e não-allowlisted.
- **`evolution-backfill-webhooks`** — qualquer método · `EVOLUTION_WEBHOOK_SECRET` ·
  one-off admin: configura/inspeciona o webhook em todas as instâncias `wa_*`.
- **`meta-whatsapp-webhook`** — GET(verify)+POST · `hub.verify_token` + **HMAC** `x-hub-signature-256` ·
  receiver sandbox da Meta Cloud API; **receive-only**, grava em `channel_*` + `message_status_events`.
- **`whatsapp-session-heartbeat`** — POST (pg_cron ~5min) · anon Bearer · checa
  `connectionState` de cada instância Evolution e rebaixa sessões mortas em `channel_connections`.

## EVA

- **`whatsapp-copilot`** — POST · JWT do usuário (`company_id` do JWT, nunca do payload) ·
  body `messages[]`, `contactName`, `objective` · EVA Comercial: sentiment, draft, qualification,
  knowledge gaps · OpenAI `gpt-5.4-nano` · `validateChatOwnership` fail-closed · cache em
  `conversation_summaries` + `eva_memory`.
- **`report-agent`** — POST · JWT do usuário · body `question` (+`companyId` só super_admin) ·
  EVA analítica sobre métricas reais (`vendas`/`metas`/`produtos`/`eva_memory`) · OpenAI `gpt-5.4-mini`.
- **`eva-stale-deal-followup`** — POST (cron 6h) · `x-cron-secret` ou service_role ·
  varre deals parados em todos os tenants e gera rascunhos de follow-up em `eva_deal_suggestions`
  (pending) · Claude Haiku (`claude-haiku-4-5-20251001`) com fallback OpenAI.
- **`generate-eva-context-suggestions`** — POST · JWT do usuário · body `documentId` ·
  extrai sugestões de contexto de `eva_training_documents` → `eva_context_suggestions` (pending) · `gpt-5.4-nano`.
- **`generate-eva-replay-moments`** — POST · JWT do usuário · gera "momentos de replay" de
  conversas com desfecho → `eva_replay_moments` · `gpt-5.4-nano`.
- **`notify-channel`** — POST · interno (SSRF allowlist Slack/Discord) · posta venda fechada /
  meta batida no canal do time; copy escrita por `gpt-5.4-mini` (fallback template).

## Calls/Voz

Pipeline de ligação no deal. Detalhe em [`../product/`] e na ideia EVA-no-Meet.

- **`deal-call-initiate`** — POST · JWT + plano plus/pro + add-on calls · body `dealId`,
  `sellerPhone`, `customerPhone`, `mode` (demo|twilio|webrtc) · cria `deal_calls` e chamadas Twilio.
- **`deal-call-transcribe`** — POST · service_role **ou** JWT · body `callId` · baixa gravação,
  transcreve via **OpenAI Whisper** (`whisper-1`), dispara insights.
- **`deal-call-generate-insights`** — POST · service_role **ou** JWT · body `callId` ·
  resumo/objeções/próximos passos via `gpt-4o-mini` (fallback heurístico) → `deal_call_insights`.
- **`twilio-generate-token`** — POST · JWT + plano + add-on · Access Token WebRTC (TTL 3600s).
- **`twilio-voice-bridge`** — GET/POST · `?secret=` `TWILIO_WEBHOOK_SECRET` · TwiML conference por perna.
- **`twilio-voice-recording-webhook`** — POST(form) · `?secret=` · salva `recording_url` e dispara transcribe.
- **`twilio-voice-status-webhook`** — POST(form) · `?secret=` · reconcilia status/duração da ligação.
- **`twilio-voice-webrtc-handler`** — POST(form) · TwiML App Voice URL para o SDK do navegador.

## Agenda (Google Calendar)

- **`calendar-slots`** — GET/POST · interno · slots livres (30min, 9–18h BRT, 14 dias) do super_admin via freeBusy.
- **`calendar-book`** — POST · interno · body `demo_request_id`, `start_iso`, `end_iso` · cria
  evento + Meet link e atualiza `demo_requests`.
- **`google-calendar-sync`** — POST · `userId` no body + token OAuth · create/update/delete/sync_all em `agendamentos`.
- **`google-calendar-auto-sync`** — POST (cron) · interno · roda `sync_all` para todos os usuários conectados.
- **`google-calendar-webhook`** — POST · `GOOGLE_CALENDAR_WEBHOOK_SECRET` opcional · push notifications → `agendamentos`.

## Auth (Google OAuth)

- **`google-oauth-init`** — POST · body `userId` · gera `state` assinado (CSRF, 15min) e retorna `authUrl`.
- **`google-oauth-callback`** — GET · valida `state` HMAC · troca code por tokens, salva em `profiles`, redirect.

## Admin

- **`admin-create-seller`** — POST · JWT + admin/super_admin · body `nome`, `email`, `sendPassword`,
  `companyId` · enforce de limite de vendedores do plano; cria user + profile + email Resend.
- **`admin-delete-seller`** — POST · JWT + admin/super_admin · body `sellerId` · remove user/profile/roles
  (bloqueia auto-deleção e cross-company).
- **`admin-lead-digest`** — POST · interno (trigger) · enriquece lead (Tavily), resumo (`gpt-5.4-mini`),
  WhatsApp ao admin (Evolution) e cria conta demo pré-populada.
- **`admin-support-inbox`** — POST · JWT + super_admin · `action` list/get/reply · caixa de suporte via Resend.

## Demo e Leads

- **`create-personalized-demo`** — POST · interno (anti-abuso: só após agendar, 1/lead) · clona o
  ambiente base e envia credenciais por email. Ver [demo personalizada](../product/).
- **`sdr-auto-outreach`** — POST · interno (trigger) · SDR "Markus": WhatsApp + email ao lead recém-agendado,
  copy por `gpt-5.4-mini`.
- **`public-report`** — GET/POST · `token` opaco (`share_token`) · relatório white-label público via RPC `get_public_report`.
- **`lead-webhook`** — GET(verify)+POST · `secret` por slug · ingere leads externos (Meta Lead Ads/Zapier/Make)
  via RPC `ingest_lead_webhook`.

## Ads

- **`upload-ads-conversion`** — POST · interno · body `lead_id` · upload server-side de conversão offline
  ao Google Ads (v21) a partir do `gclid` (email/phone hashed SHA-256).
