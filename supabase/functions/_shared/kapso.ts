// Kapso: API oficial do WhatsApp (Cloud API da Meta) por intermediário.
// Docs: https://docs.kapso.ai (API em /api/introduction, webhooks em
// /docs/platform/webhooks). Uma API key de projeto autentica as duas APIs:
//   - WhatsApp (formato Graph da Meta): https://api.kapso.ai/meta/whatsapp/v24.0
//   - Platform (customers, setup links, webhooks): https://api.kapso.ai/platform/v1
//
// A parte pura (assinatura, envelope de webhook, normalização de mensagem) não
// toca em Deno, para os testes do front importarem em Node.

const KAPSO_ORIGIN = "https://api.kapso.ai";
export const KAPSO_WHATSAPP = "/meta/whatsapp/v24.0";
export const KAPSO_PLATFORM = "/platform/v1";

/** Janela de histórico que a Meta libera na coexistência. */
export const HISTORY_DAYS = 180;

// ── Tipos do payload (só o que o Vyzon lê) ─────────────────────────────────

type MediaPart = { caption?: string; filename?: string; mime_type?: string };

export type KapsoMessage = {
    id?: string;
    timestamp?: string;
    type?: string;
    from?: string;
    to?: string;
    from_user_id?: string;
    text?: { body?: string };
    image?: MediaPart;
    video?: MediaPart;
    audio?: MediaPart;
    document?: MediaPart;
    kapso?: {
        direction?: string;
        status?: string;
        origin?: string;
        content?: string;
        phone_number?: string;
        contact_name?: string;
        whatsapp_conversation_id?: string;
        media_url?: string;
        media_data?: { url?: string; filename?: string; content_type?: string };
        message_type_data?: { caption?: string; filename?: string };
    };
};

export type KapsoConversation = {
    id?: string;
    contact_name?: string;
    phone_number?: string;
    phone_number_id?: string;
    business_scoped_user_id?: string;
};

/** Corpo de whatsapp.message.* (v2). Com buffering, vários vêm num envelope batch. */
export type KapsoMessageEvent = {
    message?: KapsoMessage;
    conversation?: KapsoConversation;
    phone_number_id?: string;
};

export type NormalizedKapsoMessage = {
    providerMessageId: string;
    direction: "inbound" | "outbound";
    /** Tipo aceito por channel_messages.message_type. */
    messageType: string;
    /** Tipo cru da Meta, que o detectQuote espera ("document", "text"...). */
    rawType: string;
    body: string | null;
    caption: string | null;
    fileName: string | null;
    mimetype: string | null;
    mediaUrl: string | null;
    status: string;
    timestamp: string;
    contactExternalId: string;
    contactPhone: string | null;
    contactName: string | null;
    origin: string | null;
    kapsoConversationId: string | null;
};

// ── Assinatura ──────────────────────────────────────────────────────────────

/** HMAC-SHA256 do corpo cru, em hex, no header X-Webhook-Signature. Aceita
 *  mais de um segredo: o do webhook de projeto vem do painel da Kapso, o dos
 *  webhooks por número é o nosso. */
export async function verifyKapsoSignature(rawBody: string, header: string | null, secrets: string[]): Promise<boolean> {
    if (!header) return false;
    const given = header.trim().toLowerCase();
    for (const secret of secrets) {
        if (!secret) continue;
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
        const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
        if (expected.length !== given.length) continue;
        let diff = 0;
        for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
        if (diff === 0) return true;
    }
    return false;
}

/** Com buffering ligado, o corpo é { type, batch: true, data: [...] }. */
export function unwrapWebhookBody<T>(body: unknown): T[] {
    const b = body as { batch?: boolean; data?: unknown };
    if (b && b.batch === true && Array.isArray(b.data)) return b.data as T[];
    return [body as T];
}

// ── Normalização ────────────────────────────────────────────────────────────

const CHANNEL_TYPES = new Set(["text", "image", "audio", "video", "document", "reaction", "location", "contacts", "template"]);

function channelType(raw: string): string {
    if (CHANNEL_TYPES.has(raw)) return raw;
    // Sem enum 'sticker' em channel_messages; o tipo cru fica em metadata.
    if (raw === "sticker") return "image";
    return "unknown";
}

function digits(value: string | undefined | null): string | null {
    const d = (value || "").replace(/\D/g, "");
    return d.length >= 8 ? d : null;
}

const OUTBOUND_STATUS = new Set(["queued", "sent", "delivered", "read", "failed"]);

function isoFromUnix(ts: string | undefined): string {
    const n = Number(ts);
    return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : new Date().toISOString();
}

/** Mensagem da Kapso (webhook v2 ou GET /messages) → forma que o Vyzon grava.
 *  null quando falta o mínimo (id, direção ou alguém do outro lado). */
export function normalizeKapsoMessage(msg: KapsoMessage | undefined, conv?: KapsoConversation): NormalizedKapsoMessage | null {
    if (!msg?.id) return null;
    const k = msg.kapso || {};
    const direction = k.direction === "inbound" || k.direction === "outbound" ? k.direction : null;
    if (!direction) return null;

    // BSUID: a Meta pode mandar identidade sem telefone; o contato ainda precisa de um id estável.
    const contactPhone = digits(direction === "inbound" ? msg.from : msg.to) || digits(conv?.phone_number) || digits(k.phone_number);
    const contactExternalId = contactPhone || msg.from_user_id || conv?.business_scoped_user_id || null;
    if (!contactExternalId) return null;

    const rawType = msg.type || "unknown";
    const media = (msg[rawType as "image" | "video" | "audio" | "document"] as MediaPart | undefined) || {};
    const caption = media.caption || k.message_type_data?.caption || null;
    const fileName = media.filename || k.media_data?.filename || k.message_type_data?.filename || null;
    const mimetype = media.mime_type || k.media_data?.content_type || null;

    let body: string | null = msg.text?.body ?? null;
    if (body === null && rawType !== "text") body = caption || (channelType(rawType) === "unknown" ? k.content || null : null);

    const status = direction === "inbound"
        ? "received"
        : OUTBOUND_STATUS.has(k.status || "") ? (k.status as string) : k.status === "pending" ? "queued" : "sent";

    return {
        providerMessageId: msg.id,
        direction,
        messageType: channelType(rawType),
        rawType,
        body,
        caption,
        fileName,
        mimetype,
        mediaUrl: k.media_url || k.media_data?.url || null,
        status,
        timestamp: isoFromUnix(msg.timestamp),
        contactExternalId,
        contactPhone,
        contactName: direction === "inbound" ? conv?.contact_name || k.contact_name || null : null,
        origin: k.origin || null,
        kapsoConversationId: conv?.id || k.whatsapp_conversation_id || null,
    };
}

/** Envelope da RPC ingest_channel_message (provider 'meta_cloud'). */
export function ingestPayload(n: NormalizedKapsoMessage, phoneNumberId: string, ownerUserId: string | null, raw: unknown) {
    const hasMedia = Boolean(n.mediaUrl || n.mimetype || n.caption || n.fileName);
    return {
        connection: { external_id: phoneNumberId, metadata: { transport: "kapso" } },
        contact: {
            external_id: n.contactExternalId,
            name: n.contactName,
            phone_e164: n.contactPhone,
            is_group: false,
            metadata: {},
        },
        message: {
            provider_message_id: n.providerMessageId,
            direction: n.direction,
            message_type: n.messageType,
            body: n.body,
            // media_ref é NOT NULL no schema; {} pra texto puro
            media_ref: hasMedia
                ? { url: n.mediaUrl, mimetype: n.mimetype, caption: n.caption, file_name: n.fileName }
                : {},
            status: n.status,
            sent_by_user_id: n.direction === "outbound" ? ownerUserId : null,
            message_timestamp: n.timestamp,
            metadata: {
                transport: "kapso",
                origin: n.origin,
                original_type: n.rawType,
                kapso_conversation_id: n.kapsoConversationId,
                chat_phone: n.contactPhone,
            },
        },
        raw_payload: raw,
    };
}

// ── Cliente HTTP ────────────────────────────────────────────────────────────

// Lida dentro da função, não no topo: os testes em Node não têm o global Deno.
function kapsoApiKey(): string {
    const env = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env;
    const key = env?.get("KAPSO_API_KEY");
    if (!key) throw new Error("KAPSO_API_KEY não configurada");
    return key;
}

// deno-lint-ignore no-explicit-any
export async function kapsoFetch(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<any> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${KAPSO_ORIGIN}${path}`, {
            ...init,
            signal: ctrl.signal,
            headers: { "Content-Type": "application/json", "X-API-Key": kapsoApiKey(), ...(init.headers || {}) },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Kapso ${res.status} ${path}: ${text.slice(0, 300)}`);
        return text ? JSON.parse(text) : null;
    } finally {
        clearTimeout(timer);
    }
}
