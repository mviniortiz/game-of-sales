// ─────────────────────────────────────────────────────────────────────────────
// kapso-webhook (2026-09-29) — eventos da Kapso (API oficial do WhatsApp).
//
// Recebe dois tipos de webhook, os dois assinados com HMAC-SHA256 no header
// X-Webhook-Signature e com o nome do evento em X-Webhook-Event:
//   - de projeto (configurado no painel da Kapso, segredo do painel):
//       whatsapp.phone_number.created → a empresa terminou o setup link.
//       Grava a conexão, registra o webhook do número e dispara a importação
//       do histórico (kapso-whatsapp action import_history).
//   - por número (registrado aqui mesmo, segredo KAPSO_WEBHOOK_SECRET):
//       whatsapp.message.received / .sent → ingest_channel_message; outbound
//       que é orçamento abre quote_tracking.
//       whatsapp.message.delivered / .read / .failed → status da mensagem.
//
// A conexão é provider='meta_cloud', external_id = phone_number_id da Meta,
// metadata.transport='kapso' (ver migration 20260929_kapso_customers).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KAPSO_API_KEY,
//      KAPSO_WEBHOOK_SECRET, KAPSO_PROJECT_WEBHOOK_SECRET.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    KAPSO_PLATFORM,
    KAPSO_WHATSAPP,
    ingestPayload,
    kapsoFetch,
    normalizeKapsoMessage,
    unwrapWebhookBody,
    verifyKapsoSignature,
    type KapsoMessageEvent,
} from "../_shared/kapso.ts";
import { trackOutboundQuote } from "../_shared/quoteTracking.ts";
import { evaPhoneNumberId, handleEvaInbound } from "../_shared/whatsappApproval.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("KAPSO_WEBHOOK_SECRET") || "";
const PROJECT_WEBHOOK_SECRET = Deno.env.get("KAPSO_PROJECT_WEBHOOK_SECRET") || "";

const MESSAGE_EVENTS = [
    "whatsapp.message.received",
    "whatsapp.message.sent",
    "whatsapp.message.delivered",
    "whatsapp.message.read",
    "whatsapp.message.failed",
];

// Status só avança; 'failed' vale sempre. Evento fora de ordem não rebaixa 'read'.
const STATUS_RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Connection = { id: string; company_id: string; metadata: Record<string, unknown> | null };

function text(status: number, body: string) {
    return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
}

function waitUntil(p: Promise<unknown>) {
    // deno-lint-ignore no-explicit-any
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(p); } catch { /* noop */ }
}

async function findConnection(phoneNumberId: string): Promise<Connection | null> {
    const { data } = await admin
        .from("channel_connections")
        .select("id, company_id, metadata")
        .eq("provider", "meta_cloud")
        .eq("external_id", phoneNumberId)
        .maybeSingle();
    return (data as Connection | null) || null;
}

async function handleConnected(body: { phone_number_id?: string; customer?: { id?: string } }): Promise<string> {
    const phoneNumberId = body.phone_number_id;
    const customerId = body.customer?.id;
    if (!phoneNumberId || !customerId) return "sem phone_number_id ou customer";

    const { data: customer } = await admin
        .from("kapso_customers")
        .select("company_id, requested_by")
        .eq("kapso_customer_id", customerId)
        .maybeSingle();
    if (!customer) return `customer ${customerId} sem empresa no Vyzon`;

    // Número bonito para a tela; se a Kapso não responder, fica o phone_number_id.
    let displayName = phoneNumberId;
    try {
        const info = await kapsoFetch(`${KAPSO_WHATSAPP}/${phoneNumberId}`);
        displayName = info?.display_phone_number || info?.data?.display_phone_number || displayName;
    } catch (e) {
        console.warn("[kapso] leitura do número falhou:", (e as Error).message);
    }

    const existing = await findConnection(phoneNumberId);
    const metadata = {
        ...(existing?.metadata || {}),
        transport: "kapso",
        kapso_customer_id: customerId,
        user_id: customer.requested_by,
    };
    const { data: conn, error } = await admin
        .from("channel_connections")
        .upsert(
            {
                company_id: customer.company_id,
                provider: "meta_cloud",
                channel_type: "whatsapp",
                external_id: phoneNumberId,
                display_name: displayName,
                status: "active",
                last_seen_at: new Date().toISOString(),
                metadata,
                created_by: customer.requested_by,
            },
            { onConflict: "provider,external_id" },
        )
        .select("id")
        .single();
    if (error || !conn) throw new Error(`conexão não gravada: ${error?.message}`);

    try {
        await kapsoFetch(`${KAPSO_PLATFORM}/whatsapp/phone_numbers/${phoneNumberId}/webhooks`, {
            method: "POST",
            body: JSON.stringify({
                whatsapp_webhook: {
                    kind: "kapso",
                    url: `${SUPABASE_URL}/functions/v1/kapso-webhook`,
                    events: MESSAGE_EVENTS,
                    secret_key: WEBHOOK_SECRET,
                },
            }),
        });
    } catch (e) {
        // Reconexão do mesmo número pode já ter o webhook; o erro fica no log e segue.
        console.warn("[kapso] registro do webhook do número falhou:", (e as Error).message);
    }

    waitUntil(
        fetch(`${SUPABASE_URL}/functions/v1/kapso-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ action: "import_history", connectionId: conn.id }),
        }).catch((e) => console.warn("[kapso] disparo da importação falhou:", e?.message)),
    );

    return `conectado ${phoneNumberId} → empresa ${customer.company_id}`;
}

/** Número oficial da EVA: só o dono escreve nele, para aprovar rascunho. Não
 *  tem conexão de cliente e nada dele vai para a Inbox. Áudio e mídia ficam de
 *  fora de propósito: transcrição errada não pode virar mensagem para o lead. */
async function handleEvaMessage(ev: KapsoMessageEvent): Promise<void> {
    const m = ev.message;
    if (!m || m.kapso?.direction !== "inbound") return;
    const texto = m.button?.payload || m.button?.text || m.interactive?.button_reply?.id || m.text?.body || "";
    const from = m.from || ev.conversation?.phone_number || "";
    const r = await handleEvaInbound(admin, { from, text: texto, contextMessageId: m.context?.id || null });
    console.log("[eva] resposta do dono:", r.action || "ignorada");
}

/** Aviso da EVA que a Meta não entregou (template pausado, número inválido...). */
async function handleEvaStatus(event: string, ev: KapsoMessageEvent): Promise<void> {
    if (event !== "whatsapp.message.failed" || !ev.message?.id) return;
    await admin
        .from("agent_suggestions")
        .update({ notify_error: `entrega falhou no número da EVA (${ev.message.kapso?.status || "failed"})` })
        .eq("notify_message_id", ev.message.id);
}

async function handleMessage(ev: KapsoMessageEvent, cache: Map<string, Connection | null>): Promise<void> {
    const phoneNumberId = ev.phone_number_id || ev.conversation?.phone_number_id;
    if (!phoneNumberId) return;
    if (phoneNumberId === evaPhoneNumberId()) return handleEvaMessage(ev);
    if (!cache.has(phoneNumberId)) cache.set(phoneNumberId, await findConnection(phoneNumberId));
    const conn = cache.get(phoneNumberId);
    if (!conn) {
        console.warn(`[kapso] mensagem de número sem conexão: ${phoneNumberId}`);
        return;
    }

    const n = normalizeKapsoMessage(ev.message, ev.conversation);
    if (!n) return;
    const ownerUserId = (conn.metadata?.user_id as string | undefined) || null;

    const { data, error } = await admin.rpc("ingest_channel_message", {
        p_company_id: conn.company_id,
        p_provider: "meta_cloud",
        p_channel_type: "whatsapp",
        p_payload: ingestPayload(n, phoneNumberId, ownerUserId, ev),
    });
    if (error) {
        console.warn("[kapso] ingest falhou:", error.message?.slice(0, 200));
        return;
    }

    if (n.direction === "outbound" && data?.is_new_message === true && data?.conversation_id && data?.message_id) {
        waitUntil(trackOutboundQuote(admin, {
            companyId: conn.company_id,
            userId: ownerUserId,
            conversationId: data.conversation_id,
            contactId: data.contact_id || null,
            messageId: data.message_id,
            type: n.rawType,
            body: n.body,
            caption: n.caption,
            fileName: n.fileName,
            mimetype: n.mimetype,
            sentAt: n.timestamp,
            chatPhone: n.contactPhone,
        }));
    }
}

async function handleStatus(event: string, ev: KapsoMessageEvent, cache: Map<string, Connection | null>): Promise<void> {
    const phoneNumberId = ev.phone_number_id || ev.conversation?.phone_number_id;
    const messageId = ev.message?.id;
    const status = event.split(".").pop() as string;
    if (!phoneNumberId || !messageId) return;
    if (phoneNumberId === evaPhoneNumberId()) return handleEvaStatus(event, ev);
    if (!cache.has(phoneNumberId)) cache.set(phoneNumberId, await findConnection(phoneNumberId));
    const conn = cache.get(phoneNumberId);
    if (!conn) return;

    const { data: row } = await admin
        .from("channel_messages")
        .select("id, status")
        .eq("connection_id", conn.id)
        .eq("provider_message_id", messageId)
        .maybeSingle();
    if (!row) {
        // Status antes da própria mensagem: grava a mensagem pelo payload, que já traz o status.
        await handleMessage(ev, cache);
        return;
    }
    const current = STATUS_RANK[row.status as string] ?? -1;
    if (status !== "failed" && (STATUS_RANK[status] ?? -1) <= current) return;
    await admin.from("channel_messages").update({ status }).eq("id", row.id);
}

serve(async (req) => {
    if (req.method !== "POST") return text(405, "method not allowed");

    const raw = await req.text();
    const ok = await verifyKapsoSignature(raw, req.headers.get("x-webhook-signature"), [WEBHOOK_SECRET, PROJECT_WEBHOOK_SECRET]);
    if (!ok) return text(401, "invalid signature");

    let body: unknown;
    try {
        body = JSON.parse(raw);
    } catch {
        return text(400, "invalid json");
    }
    const event = req.headers.get("x-webhook-event") || (body as { type?: string })?.type || "";

    try {
        if (event === "whatsapp.phone_number.created") {
            console.log("[kapso]", await handleConnected(body as { phone_number_id?: string; customer?: { id?: string } }));
            return text(200, "ok");
        }

        const cache = new Map<string, Connection | null>();
        const events = unwrapWebhookBody<KapsoMessageEvent>(body);
        if (event === "whatsapp.message.received" || event === "whatsapp.message.sent") {
            for (const ev of events) await handleMessage(ev, cache);
        } else if (event === "whatsapp.message.delivered" || event === "whatsapp.message.read" || event === "whatsapp.message.failed") {
            for (const ev of events) await handleStatus(event, ev, cache);
        } else {
            console.log(`[kapso] evento ignorado: ${event}`);
        }
        return text(200, "ok");
    } catch (e) {
        // 500 faz a Kapso reenviar; a gravação é idempotente por provider_message_id.
        console.error(`[kapso] erro em ${event}:`, (e as Error).message);
        return text(500, "error");
    }
});
