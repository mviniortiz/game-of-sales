// ─────────────────────────────────────────────────────────────────────────────
// F4W.5 (2026-05-20) — meta-whatsapp-webhook
//
// Receiver SANDBOX da Meta Cloud API (WhatsApp Business Platform).
//
// RECEIVE-ONLY. NÃO envia mensagens. NÃO gera templates. NÃO toca janela 24h.
//
// Endpoints:
//   GET  /meta-whatsapp-webhook  → verification (hub.challenge)
//   POST /meta-whatsapp-webhook  → messages + statuses → channel_*
//
// Tabelas escritas (todas best-effort, isoladas):
//   - channel_connections    (provider='meta_cloud', external_id=phone_number_id)
//   - channel_contacts       (external_contact_id=wa_id)
//   - channel_conversations  (last_message_at, unread_count)
//   - channel_messages       (idempotente por unique (connection_id, provider_message_id))
//   - message_status_events  (sent/delivered/read/failed)
//
// Env vars consumidas:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (standard)
//   - META_WHATSAPP_VERIFY_TOKEN  → echo do hub.challenge
//   - META_APP_SECRET             → HMAC SHA-256 do body (opcional mas recomendado)
//   - META_WHATSAPP_COMPANY_ID    → sandbox: company alvo das rows
//   - META_WHATSAPP_USER_ID       → opcional, vai pra metadata da connection
//
// Sem tokens persistidos. Sem secrets logados. Sem payload completo logado.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_VERIFY_TOKEN  = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
const META_APP_SECRET    = Deno.env.get("META_APP_SECRET") || "";
const META_COMPANY_ID    = Deno.env.get("META_WHATSAPP_COMPANY_ID") || "";
const META_USER_ID       = Deno.env.get("META_WHATSAPP_USER_ID")   || "";

const corsHeaders = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "content-type, x-hub-signature-256",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function text(status: number, body: string) {
    return new Response(body, {
        status,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
}

// ─── HMAC verification (SHA-256, timing-safe) ────────────────────────────────

async function verifyMetaSignature(rawBody: string, header: string | null): Promise<{ valid: boolean; reason: string }> {
    if (!META_APP_SECRET) return { valid: false, reason: "no_app_secret_configured" };
    if (!header)          return { valid: false, reason: "missing_header" };
    if (!header.startsWith("sha256=")) return { valid: false, reason: "bad_header_format" };

    const expectedHex = header.slice(7).toLowerCase();
    try {
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(META_APP_SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
        const computedHex = Array.from(new Uint8Array(sigBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        if (computedHex.length !== expectedHex.length) return { valid: false, reason: "length_mismatch" };
        let diff = 0;
        for (let i = 0; i < computedHex.length; i++) {
            diff |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
        }
        return { valid: diff === 0, reason: diff === 0 ? "ok" : "digest_mismatch" };
    } catch (err) {
        return { valid: false, reason: `hmac_error:${String(err).slice(0, 60)}` };
    }
}

// ─── Type mapping Meta → channel_messages enum ───────────────────────────────

function mapMetaMessageType(metaType: string | undefined): string {
    switch (metaType) {
        case "text":
        case "image":
        case "audio":
        case "video":
        case "document":
        case "location":
        case "reaction":
            return metaType;
        case "contacts":
            return "contacts";
        case "sticker":
            return "image"; // sem 'sticker' no enum; original_type preserva
        case "button":
        case "interactive":
        case "order":
        case "system":
        case "unsupported":
        default:
            return "unknown";
    }
}

function extractBody(msg: any): string | null {
    if (!msg) return null;
    const t = msg.type;
    if (t === "text")     return msg.text?.body ?? null;
    if (t === "image")    return msg.image?.caption ?? null;
    if (t === "video")    return msg.video?.caption ?? null;
    if (t === "document") return msg.document?.caption ?? msg.document?.filename ?? null;
    if (t === "reaction") return msg.reaction?.emoji ?? null;
    if (t === "button")   return msg.button?.text ?? null;
    if (t === "interactive") {
        return (
            msg.interactive?.button_reply?.title
            ?? msg.interactive?.list_reply?.title
            ?? null
        );
    }
    return null;
}

function extractMediaRef(msg: any): Record<string, unknown> {
    const t = msg?.type;
    const m = msg?.[t];
    if (!m) return {};
    const ref: Record<string, unknown> = {};
    if (m.id)        ref.media_id = m.id;
    if (m.mime_type) ref.mime_type = m.mime_type;
    if (m.sha256)    ref.sha256 = m.sha256;
    if (m.caption)   ref.caption = m.caption;
    if (m.filename)  ref.filename = m.filename;
    if (msg.location) {
        ref.location = {
            lat:  msg.location.latitude,
            lng:  msg.location.longitude,
            name: msg.location.name,
            address: msg.location.address,
        };
    }
    return ref;
}

function metaTsToIso(ts: string | number | undefined): string {
    if (!ts) return new Date().toISOString();
    const n = Number(ts);
    if (!Number.isFinite(n)) return new Date().toISOString();
    return new Date(n * 1000).toISOString();
}

function mapStatus(metaStatus: string | undefined): string | null {
    if (!metaStatus) return null;
    if (["sent", "delivered", "read", "failed"].includes(metaStatus)) return metaStatus;
    return null;
}

// ─── Upsert helpers (best-effort, retornam ID ou throw) ─────────────────────

async function upsertConnection(
    admin: any,
    phoneNumberId: string,
    displayPhone: string | null,
): Promise<string> {
    const metaPatch: Record<string, unknown> = {
        source: "meta-whatsapp-webhook",
        phone_number_id: phoneNumberId,
    };
    if (displayPhone)   metaPatch.display_phone_number = displayPhone;
    if (META_USER_ID)   metaPatch.user_id = META_USER_ID;

    const { data: existing, error: e1 } = await admin
        .from("channel_connections")
        .select("id, metadata")
        .eq("provider", "meta_cloud")
        .eq("external_id", phoneNumberId)
        .maybeSingle();
    if (e1) throw e1;

    if (existing?.id) {
        const merged = { ...((existing.metadata as Record<string, unknown>) || {}), ...metaPatch };
        const { error: e2 } = await admin
            .from("channel_connections")
            .update({
                status: "active",
                last_seen_at: new Date().toISOString(),
                display_name: displayPhone || phoneNumberId,
                metadata: merged,
            })
            .eq("id", existing.id);
        if (e2) throw e2;
        return existing.id;
    }

    const { data: created, error: e3 } = await admin
        .from("channel_connections")
        .insert({
            company_id:   META_COMPANY_ID,
            provider:     "meta_cloud",
            channel_type: "whatsapp",
            external_id:  phoneNumberId,
            display_name: displayPhone || phoneNumberId,
            status:       "active",
            last_seen_at: new Date().toISOString(),
            capabilities: { receive: true, send: false, templates: false },
            metadata:     metaPatch,
        })
        .select("id")
        .single();
    if (e3) {
        if ((e3 as any).code === "23505") {
            const { data: again } = await admin
                .from("channel_connections")
                .select("id")
                .eq("provider", "meta_cloud")
                .eq("external_id", phoneNumberId)
                .maybeSingle();
            if (again?.id) return again.id;
        }
        throw e3;
    }
    return created.id;
}

async function upsertContact(
    admin: any,
    connectionId: string,
    waId: string,
    name: string | null,
): Promise<string> {
    const phoneE164 = waId; // wa_id já é E.164 sem '+'
    const phoneTail = waId.slice(-10);

    const { data: existing, error: e1 } = await admin
        .from("channel_contacts")
        .select("id, name")
        .eq("connection_id", connectionId)
        .eq("external_contact_id", waId)
        .maybeSingle();
    if (e1) throw e1;

    if (existing?.id) {
        if (name && name !== existing.name) {
            const { error: e2 } = await admin
                .from("channel_contacts")
                .update({ name })
                .eq("id", existing.id);
            if (e2) throw e2;
        }
        return existing.id;
    }

    const { data: created, error: e3 } = await admin
        .from("channel_contacts")
        .insert({
            company_id:          META_COMPANY_ID,
            connection_id:       connectionId,
            external_contact_id: waId,
            phone_e164:          phoneE164,
            phone_tail:          phoneTail,
            name:                name,
            is_group:            false,
            metadata:            { wa_id: waId, source: "meta_cloud" },
        })
        .select("id")
        .single();
    if (e3) {
        if ((e3 as any).code === "23505") {
            const { data: again } = await admin
                .from("channel_contacts")
                .select("id")
                .eq("connection_id", connectionId)
                .eq("external_contact_id", waId)
                .maybeSingle();
            if (again?.id) return again.id;
        }
        throw e3;
    }
    return created.id;
}

async function upsertConversation(
    admin: any,
    connectionId: string,
    contactId: string,
    msgTs: string,
    direction: "inbound" | "outbound",
): Promise<string> {
    const { data: existing, error: e1 } = await admin
        .from("channel_conversations")
        .select("id, last_message_at, last_inbound_at, last_outbound_at, unread_count")
        .eq("connection_id", connectionId)
        .eq("contact_id", contactId)
        .maybeSingle();
    if (e1) throw e1;

    if (existing?.id) {
        const patch: Record<string, unknown> = {};
        if (!existing.last_message_at || msgTs > existing.last_message_at) {
            patch.last_message_at = msgTs;
        }
        if (direction === "inbound") {
            if (!existing.last_inbound_at || msgTs > existing.last_inbound_at) patch.last_inbound_at = msgTs;
            patch.unread_count = (existing.unread_count ?? 0) + 1;
        } else {
            if (!existing.last_outbound_at || msgTs > existing.last_outbound_at) patch.last_outbound_at = msgTs;
        }
        if (Object.keys(patch).length > 0) {
            const { error: e2 } = await admin
                .from("channel_conversations")
                .update(patch)
                .eq("id", existing.id);
            if (e2) throw e2;
        }
        return existing.id;
    }

    const isInbound = direction === "inbound";
    const { data: created, error: e3 } = await admin
        .from("channel_conversations")
        .insert({
            company_id:       META_COMPANY_ID,
            connection_id:    connectionId,
            contact_id:       contactId,
            status:           "open",
            last_message_at:  msgTs,
            last_inbound_at:  isInbound ? msgTs : null,
            last_outbound_at: isInbound ? null  : msgTs,
            unread_count:     isInbound ? 1     : 0,
            metadata:         { source: "meta_cloud" },
        })
        .select("id")
        .single();
    if (e3) {
        if ((e3 as any).code === "23505") {
            const { data: again } = await admin
                .from("channel_conversations")
                .select("id")
                .eq("connection_id", connectionId)
                .eq("contact_id", contactId)
                .maybeSingle();
            if (again?.id) return again.id;
        }
        throw e3;
    }
    return created.id;
}

async function insertChannelMessage(
    admin: any,
    args: {
        connectionId: string;
        conversationId: string;
        contactId: string;
        providerMessageId: string;
        direction: "inbound" | "outbound";
        messageType: string;
        body: string | null;
        mediaRef: Record<string, unknown>;
        status: string;
        messageTimestamp: string;
        rawPayload: any;
        metadata: Record<string, unknown>;
    },
): Promise<{ id: string | null; isNew: boolean }> {
    // Pré-check idempotência
    const { data: existing, error: e1 } = await admin
        .from("channel_messages")
        .select("id")
        .eq("connection_id", args.connectionId)
        .eq("provider_message_id", args.providerMessageId)
        .maybeSingle();
    if (e1) throw e1;
    if (existing?.id) return { id: existing.id, isNew: false };

    const { data: created, error: e2 } = await admin
        .from("channel_messages")
        .insert({
            company_id:             META_COMPANY_ID,
            connection_id:          args.connectionId,
            conversation_id:        args.conversationId,
            contact_id:             args.contactId,
            provider_message_id:    args.providerMessageId,
            direction:              args.direction,
            message_type:           args.messageType,
            body:                   args.body,
            media_ref:              Object.keys(args.mediaRef).length ? args.mediaRef : {},
            status:                 args.status,
            reply_to_message_id:    null,
            sent_by_user_id:        null,
            message_timestamp:      args.messageTimestamp,
            raw_payload:            args.rawPayload,
            raw_payload_redacted:   false,
            raw_payload_expires_at: null,
            metadata:               args.metadata,
        })
        .select("id")
        .single();
    if (e2) {
        if ((e2 as any).code === "23505") {
            const { data: again } = await admin
                .from("channel_messages")
                .select("id")
                .eq("connection_id", args.connectionId)
                .eq("provider_message_id", args.providerMessageId)
                .maybeSingle();
            if (again?.id) return { id: again.id, isNew: false };
        }
        throw e2;
    }
    return { id: created.id, isNew: true };
}

async function insertStatusEvent(
    admin: any,
    args: {
        connectionId: string;
        messageId: string | null;
        providerMessageId: string;
        status: string;
        occurredAt: string;
        rawPayload: any;
    },
): Promise<{ inserted: boolean; reason?: string }> {
    // Sem unique constraint nativa — deduplica por (connection_id, provider_message_id, status, occurred_at)
    const { data: dup, error: e1 } = await admin
        .from("message_status_events")
        .select("id")
        .eq("connection_id", args.connectionId)
        .eq("provider_message_id", args.providerMessageId)
        .eq("status", args.status)
        .eq("occurred_at", args.occurredAt)
        .maybeSingle();
    if (e1) throw e1;
    if (dup?.id) return { inserted: false, reason: "duplicate" };

    const { error: e2 } = await admin
        .from("message_status_events")
        .insert({
            company_id:          META_COMPANY_ID,
            connection_id:       args.connectionId,
            message_id:          args.messageId,
            provider_message_id: args.providerMessageId,
            status:              args.status,
            occurred_at:         args.occurredAt,
            raw_payload:         args.rawPayload,
        });
    if (e2) throw e2;
    return { inserted: true };
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async function handleGet(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const mode      = url.searchParams.get("hub.mode");
    const token     = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge")    || "";

    if (mode === "subscribe" && META_VERIFY_TOKEN && token === META_VERIFY_TOKEN) {
        console.log("[meta-webhook] verify_ok");
        return text(200, challenge);
    }
    console.warn(`[meta-webhook] verify_failed mode=${mode || "none"} token_match=false`);
    return text(403, "forbidden");
}

async function handlePost(req: Request): Promise<Response> {
    // Lê body raw pra HMAC + reparse JSON
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const sig = await verifyMetaSignature(rawBody, signatureHeader);
    if (!sig.valid) {
        if (META_APP_SECRET) {
            // Em prod com APP_SECRET configurado, rejeitamos
            console.warn(`[meta-webhook] signature_invalid reason=${sig.reason}`);
            return json(401, { ok: false, error: "invalid_signature", reason: sig.reason });
        }
        // Sandbox sem APP_SECRET: aceita com warn
        console.warn(`[meta-webhook] signature_skipped reason=${sig.reason} (sandbox sem APP_SECRET — TODO produção: setar META_APP_SECRET)`);
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return json(400, { ok: false, error: "invalid_json" });
    }

    if (payload?.object !== "whatsapp_business_account") {
        // Aceita 200 pra Meta não fazer retry — só não processa
        return json(200, { ok: true, ignored: "non_whatsapp_object", object: payload?.object || null });
    }

    if (!META_COMPANY_ID) {
        console.warn("[meta-webhook] skipped: META_WHATSAPP_COMPANY_ID not configured");
        return json(200, { ok: true, ignored: "no_company_configured" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let receivedMessagesCount = 0;
    let statusesCount         = 0;
    let insertedMessagesCount = 0;
    let skippedDuplicatesCount = 0;
    let statusEventsInsertedCount = 0;
    let statusEventsSkippedCount  = 0;
    let errorsCount            = 0;

    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
            if (change?.field !== "messages") continue;
            const value = change.value;
            if (!value) continue;

            const phoneNumberId   = value.metadata?.phone_number_id;
            const displayPhone    = value.metadata?.display_phone_number || null;
            if (!phoneNumberId) {
                errorsCount++;
                console.error("[meta-webhook] missing phone_number_id in change.value.metadata");
                continue;
            }

            // Connection (1× por change)
            let connectionId: string;
            try {
                connectionId = await upsertConnection(admin, phoneNumberId, displayPhone);
            } catch (err) {
                errorsCount++;
                console.error(`[meta-webhook] connection_error phone_number_id=${phoneNumberId} err=${(err as any)?.message?.slice(0, 200)}`);
                continue;
            }

            // ── Messages ────────────────────────────────────────────────
            const contactsArr = Array.isArray(value.contacts) ? value.contacts : [];
            const contactsByWaId = new Map<string, any>();
            for (const c of contactsArr) {
                if (c?.wa_id) contactsByWaId.set(String(c.wa_id), c);
            }

            const messagesArr = Array.isArray(value.messages) ? value.messages : [];
            for (const m of messagesArr) {
                receivedMessagesCount++;
                try {
                    const waId = String(m.from || "");
                    if (!waId || !m.id) {
                        errorsCount++;
                        console.error("[meta-webhook] message missing from/id");
                        continue;
                    }
                    const contactRow = contactsByWaId.get(waId);
                    const contactName = contactRow?.profile?.name || null;

                    const contactId = await upsertContact(admin, connectionId, waId, contactName);
                    const msgTs = metaTsToIso(m.timestamp);
                    const conversationId = await upsertConversation(admin, connectionId, contactId, msgTs, "inbound");

                    const internalType = mapMetaMessageType(m.type);
                    const result = await insertChannelMessage(admin, {
                        connectionId,
                        conversationId,
                        contactId,
                        providerMessageId: String(m.id),
                        direction: "inbound",
                        messageType: internalType,
                        body: extractBody(m),
                        mediaRef: extractMediaRef(m),
                        status: "received",
                        messageTimestamp: msgTs,
                        rawPayload: m,
                        metadata: {
                            source: "meta_cloud",
                            phone_number_id: phoneNumberId,
                            wa_id: waId,
                            meta_message_type: m.type || "unknown",
                        },
                    });
                    if (result.isNew) insertedMessagesCount++;
                    else              skippedDuplicatesCount++;
                } catch (err) {
                    errorsCount++;
                    console.error(`[meta-webhook] message_error provider_id=${m?.id || "-"} err=${(err as any)?.message?.slice(0, 200)}`);
                }
            }

            // ── Statuses ────────────────────────────────────────────────
            const statusesArr = Array.isArray(value.statuses) ? value.statuses : [];
            for (const s of statusesArr) {
                statusesCount++;
                try {
                    const providerMessageId = String(s.id || "");
                    const mapped = mapStatus(s.status);
                    if (!providerMessageId || !mapped) {
                        errorsCount++;
                        console.error(`[meta-webhook] status_invalid provider_id=${providerMessageId} status=${s?.status}`);
                        continue;
                    }
                    const occurredAt = metaTsToIso(s.timestamp);

                    // Localiza message_id se existir
                    const { data: msgRow } = await admin
                        .from("channel_messages")
                        .select("id")
                        .eq("connection_id", connectionId)
                        .eq("provider_message_id", providerMessageId)
                        .maybeSingle();
                    const messageId = msgRow?.id || null;

                    const insRes = await insertStatusEvent(admin, {
                        connectionId,
                        messageId,
                        providerMessageId,
                        status: mapped,
                        occurredAt,
                        rawPayload: s,
                    });
                    if (insRes.inserted) statusEventsInsertedCount++;
                    else                 statusEventsSkippedCount++;

                    // Atualiza status da mensagem para o mais recente
                    if (messageId) {
                        await admin
                            .from("channel_messages")
                            .update({ status: mapped })
                            .eq("id", messageId);
                    }
                } catch (err) {
                    errorsCount++;
                    console.error(`[meta-webhook] status_error err=${(err as any)?.message?.slice(0, 200)}`);
                }
            }
        }
    }

    const summary = {
        ok: true,
        received_messages_count:    receivedMessagesCount,
        inserted_messages_count:    insertedMessagesCount,
        skipped_duplicates_count:   skippedDuplicatesCount,
        statuses_count:             statusesCount,
        status_events_inserted:     statusEventsInsertedCount,
        status_events_skipped:      statusEventsSkippedCount,
        errors_count:               errorsCount,
    };
    console.log(`[meta-webhook] summary ${JSON.stringify(summary)}`);
    return json(200, summary);
}

// ─── Entry ──────────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method === "GET")  return handleGet(req);
    if (req.method === "POST") return handlePost(req);
    return json(405, { ok: false, error: "method_not_allowed" });
});
