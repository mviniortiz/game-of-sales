import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Receiver do Evolution API (evento messages.upsert).
//
// F4W.3 (2026-05-20): dual-write para channel_*.
//   - whatsapp_messages continua sendo o caminho primário (Inbox lê dele).
//   - channel_* é shadow write: connection/contact/conversation/message.
//   - Falha em channel_* NÃO derruba o insert legado nem o response 200.
//   - Idempotente: connection_id+provider_message_id, retry de webhook não
//     duplica nada em channel_messages.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET") || "";
// Secrets do projeto (compartilhados por todas as edges): o webhook usa pra
// BAIXAR a mídia na entrada e guardar no nosso Storage (robusto vs URL .enc).
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const MEDIA_TYPES = new Set(["image", "video", "sticker", "audio", "document"]);

function mediaExt(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("pdf")) return "pdf";
  return "bin";
}
function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Baixa a mídia da Evolution (chave completa) e guarda no bucket privado
// whatsapp-media, gravando o storage_path no media_ref. Best-effort: qualquer
// falha é só logada (o on-demand do getMedia segue como fallback).
async function captureMediaToStorage(
  admin: any,
  p: { messageId: string; companyId: string; wamid: string; remoteJid: string; fromMe: boolean; instanceName: string; mimetype: string },
): Promise<void> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return;
  try {
    const resp = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${p.instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ message: { key: { id: p.wamid, remoteJid: p.remoteJid, fromMe: p.fromMe } }, convertToMp4: false }),
    });
    if (!resp.ok) return;
    const data = await resp.json().catch(() => null);
    const base64 = data?.base64 || data?.mediaBase64 || data?.data || null;
    const mimetype = data?.mimetype || data?.mediaType || p.mimetype || "application/octet-stream";
    if (!base64) return;
    const path = `${p.companyId}/${p.messageId}.${mediaExt(mimetype)}`;
    const up = await admin.storage.from("whatsapp-media").upload(path, bytesFromBase64(base64), { contentType: mimetype, upsert: true });
    if (up.error) return;
    const { data: row } = await admin.from("channel_messages").select("media_ref").eq("id", p.messageId).maybeSingle();
    const mr = (row?.media_ref as Record<string, unknown>) || {};
    await admin.from("channel_messages").update({ media_ref: { ...mr, storage_path: path, mimetype } }).eq("id", p.messageId);
  } catch (err) {
    console.warn("[webhook] captureMediaToStorage failed:", (err as any)?.message);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractDigits(value?: string | null): string {
  if (!value) return "";
  return String(value).split("@")[0].replace(/\D/g, "");
}

function instanceNameToUserId(name: string): string | null {
  if (!name.startsWith("wa_")) return null;
  const hex = name.slice(3);
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseTextFromMessage(msg: any): string | null {
  const m = msg?.message;
  if (!m) {
    if (msg?.body) return msg.body;
    if (msg?.text) return msg.text;
    if (typeof msg?.content === "string") return msg.content;
    return null;
  }
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.buttonsResponseMessage?.selectedDisplayText) return m.buttonsResponseMessage.selectedDisplayText;
  if (m.listResponseMessage?.title) return m.listResponseMessage.title;
  if (m.templateButtonReplyMessage?.selectedDisplayText) return m.templateButtonReplyMessage.selectedDisplayText;
  return null;
}

function detectMessageType(msg: any): { type: string; mimetype?: string; caption?: string; audioDuration?: number; mediaUrl?: string } {
  const m = msg?.message;
  if (!m) return { type: "text" };
  if (m.conversation || m.extendedTextMessage?.text) return { type: "text" };
  if (m.imageMessage) return { type: "image", mimetype: m.imageMessage.mimetype, caption: m.imageMessage.caption, mediaUrl: m.imageMessage.url };
  if (m.videoMessage) return { type: "video", mimetype: m.videoMessage.mimetype, caption: m.videoMessage.caption, mediaUrl: m.videoMessage.url };
  if (m.audioMessage) return {
    type: "audio",
    mimetype: m.audioMessage.mimetype,
    audioDuration: Number(m.audioMessage.seconds || 0) || undefined,
    mediaUrl: m.audioMessage.url,
  };
  if (m.stickerMessage) return { type: "sticker", mimetype: m.stickerMessage.mimetype, mediaUrl: m.stickerMessage.url };
  if (m.documentMessage) return { type: "document", mimetype: m.documentMessage.mimetype, caption: m.documentMessage.fileName, mediaUrl: m.documentMessage.url };
  if (m.locationMessage || m.liveLocationMessage) return { type: "location" };
  if (m.contactMessage) return { type: "contact" };
  if (m.reactionMessage) return { type: "reaction" };
  if (m.protocolMessage || m.senderKeyDistributionMessage) return { type: "protocol" };
  return { type: "other" };
}

// ─── F4W.3 helpers ──────────────────────────────────────────────────────────

/** Mapeia o `type` interno do detectMessageType pro enum aceito por
 *  channel_messages.message_type CHECK. Fallback: 'unknown'. */
function mapChannelMessageType(internal: string): string {
  switch (internal) {
    case "text":
    case "image":
    case "audio":
    case "video":
    case "document":
    case "reaction":
    case "location":
      return internal;
    case "sticker":
      // sem enum 'sticker' em channel_messages — mais próximo é 'image'.
      // metadata.original_type preserva a info exata.
      return "image";
    case "contact":
      return "contacts";
    case "protocol":
    case "other":
    default:
      return "unknown";
  }
}

interface NormalizedMessage {
  externalId: string;
  instanceName: string;
  userId: string;
  companyId: string | null;
  remoteJid: string;
  chatPhone: string;
  phoneTail: string;
  contactName: string | null;
  isGroup: boolean;
  direction: "inbound" | "outbound";
  internalType: string;
  body: string | null;
  mediaUrl: string | null;
  mediaMimetype: string | null;
  mediaCaption: string | null;
  audioDuration: number | null;
  messageTimestamp: string;
  rawMsg: any;
}

interface DualWriteResult {
  ok: boolean;
  step?: "connection" | "contact" | "conversation" | "message";
  connectionId?: string;
  contactId?: string;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

/** Dual-write best-effort. Não joga; retorna `{ok:false, step, error}`.
 *  Cada etapa é isolada — falha em uma não interrompe o loop principal. */
async function dualWriteChannel(
  admin: any,
  n: NormalizedMessage,
): Promise<DualWriteResult> {
  // Pré-condição: precisa de company_id (NOT NULL nas 4 tabelas).
  if (!n.companyId) {
    return { ok: false, step: "connection", error: "missing_company_id" };
  }

  // ── 1. channel_connections (upsert por provider+external_id) ────────────
  // F4W.4.2 — Garante metadata.user_id em INSERT e em UPDATE (via merge).
  // Permite que useChannelInbox bata no lookup nível 1 (metadata->>'user_id').
  if (!n.userId) {
    console.warn("[webhook] dual-write connection: missing user_id; metadata.user_id will not be set");
  }
  const connectionMetadataPatch: Record<string, unknown> = {
    source: "evolution-message-webhook",
    instance_name: n.instanceName,
  };
  if (n.userId) connectionMetadataPatch.user_id = n.userId;

  let connectionId: string | undefined;
  try {
    const { data: existing, error: selErr } = await admin
      .from("channel_connections")
      .select("id, metadata")
      .eq("provider", "evolution")
      .eq("external_id", n.instanceName)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing?.id) {
      connectionId = existing.id;
      // Merge preservando chaves existentes — patch sobrescreve só as nossas.
      const currentMeta = (existing.metadata as Record<string, unknown> | null) || {};
      const mergedMeta = { ...currentMeta, ...connectionMetadataPatch };
      const { error: upErr } = await admin
        .from("channel_connections")
        .update({
          status: "active",
          last_seen_at: new Date().toISOString(),
          metadata: mergedMeta,
        })
        .eq("id", connectionId);
      if (upErr) throw upErr;
    } else {
      const { data: created, error: insErr } = await admin
        .from("channel_connections")
        .insert({
          company_id: n.companyId,
          provider: "evolution",
          channel_type: "whatsapp",
          external_id: n.instanceName,
          display_name: n.instanceName,
          status: "active",
          last_seen_at: new Date().toISOString(),
          metadata: connectionMetadataPatch,
        })
        .select("id")
        .single();
      if (insErr) {
        // Race condition: outro webhook inseriu primeiro. Re-busca.
        if ((insErr as any).code === "23505") {
          const { data: again } = await admin
            .from("channel_connections")
            .select("id")
            .eq("provider", "evolution")
            .eq("external_id", n.instanceName)
            .maybeSingle();
          if (again?.id) {
            connectionId = again.id;
          } else {
            throw insErr;
          }
        } else {
          throw insErr;
        }
      } else {
        connectionId = created.id;
      }
    }
  } catch (err) {
    return {
      ok: false,
      step: "connection",
      error: (err as any)?.message?.slice(0, 200) || String(err),
    };
  }
  if (!connectionId) {
    return { ok: false, step: "connection", error: "no_connection_id" };
  }

  // ── 2. channel_contacts (upsert por connection_id + external_contact_id) ─
  let contactId: string | undefined;
  try {
    const { data: existing, error: selErr } = await admin
      .from("channel_contacts")
      .select("id, name")
      .eq("connection_id", connectionId)
      .eq("external_contact_id", n.remoteJid)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing?.id) {
      contactId = existing.id;
      // Só atualiza name se vier algo novo (evita sobrescrever com null)
      if (n.contactName && n.contactName !== existing.name) {
        const { error: upErr } = await admin
          .from("channel_contacts")
          .update({ name: n.contactName })
          .eq("id", contactId);
        if (upErr) throw upErr;
      }
    } else {
      const { data: created, error: insErr } = await admin
        .from("channel_contacts")
        .insert({
          company_id: n.companyId,
          connection_id: connectionId,
          external_contact_id: n.remoteJid,
          phone_e164: n.chatPhone || null,
          phone_tail: n.phoneTail || null,
          name: n.contactName,
          is_group: n.isGroup,
          metadata: { chat_jid: n.remoteJid },
        })
        .select("id")
        .single();
      if (insErr) {
        if ((insErr as any).code === "23505") {
          const { data: again } = await admin
            .from("channel_contacts")
            .select("id")
            .eq("connection_id", connectionId)
            .eq("external_contact_id", n.remoteJid)
            .maybeSingle();
          if (again?.id) contactId = again.id;
          else throw insErr;
        } else {
          throw insErr;
        }
      } else {
        contactId = created.id;
      }
    }
  } catch (err) {
    return {
      ok: false,
      step: "contact",
      connectionId,
      error: (err as any)?.message?.slice(0, 200) || String(err),
    };
  }
  if (!contactId) {
    return { ok: false, step: "contact", connectionId, error: "no_contact_id" };
  }

  // ── 3. channel_conversations (upsert por connection_id + contact_id) ────
  let conversationId: string | undefined;
  try {
    const { data: existing, error: selErr } = await admin
      .from("channel_conversations")
      .select("id, last_message_at, last_inbound_at, last_outbound_at, unread_count")
      .eq("connection_id", connectionId)
      .eq("contact_id", contactId)
      .maybeSingle();
    if (selErr) throw selErr;

    const ts = n.messageTimestamp;
    if (existing?.id) {
      conversationId = existing.id;
      const patch: Record<string, unknown> = {};
      // Só avança o cursor se a nova mensagem é mais recente
      if (!existing.last_message_at || ts > existing.last_message_at) {
        patch.last_message_at = ts;
      }
      if (n.direction === "inbound") {
        if (!existing.last_inbound_at || ts > existing.last_inbound_at) {
          patch.last_inbound_at = ts;
        }
        // unread_count: +1 só pra inbound. Reset quando a UI ler em F4W.4.
        patch.unread_count = (existing.unread_count ?? 0) + 1;
      } else {
        if (!existing.last_outbound_at || ts > existing.last_outbound_at) {
          patch.last_outbound_at = ts;
        }
      }
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await admin
          .from("channel_conversations")
          .update(patch)
          .eq("id", conversationId);
        if (upErr) throw upErr;
      }
    } else {
      const isInbound = n.direction === "inbound";
      const { data: created, error: insErr } = await admin
        .from("channel_conversations")
        .insert({
          company_id: n.companyId,
          connection_id: connectionId,
          contact_id: contactId,
          status: "open",
          last_message_at: ts,
          last_inbound_at: isInbound ? ts : null,
          last_outbound_at: isInbound ? null : ts,
          unread_count: isInbound ? 1 : 0,
          metadata: {},
        })
        .select("id")
        .single();
      if (insErr) {
        if ((insErr as any).code === "23505") {
          const { data: again } = await admin
            .from("channel_conversations")
            .select("id")
            .eq("connection_id", connectionId)
            .eq("contact_id", contactId)
            .maybeSingle();
          if (again?.id) conversationId = again.id;
          else throw insErr;
        } else {
          throw insErr;
        }
      } else {
        conversationId = created.id;
      }
    }
  } catch (err) {
    return {
      ok: false,
      step: "conversation",
      connectionId,
      contactId,
      error: (err as any)?.message?.slice(0, 200) || String(err),
    };
  }
  if (!conversationId) {
    return {
      ok: false,
      step: "conversation",
      connectionId,
      contactId,
      error: "no_conversation_id",
    };
  }

  // ── 4. channel_messages (idempotente por connection_id + provider_msg_id) ─
  let messageId: string | undefined;
  try {
    // Pré-check pra evitar barulho de 23505 em retries de webhook
    const { data: existing, error: selErr } = await admin
      .from("channel_messages")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("provider_message_id", n.externalId)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing?.id) {
      messageId = existing.id;
    } else {
      const mappedType = mapChannelMessageType(n.internalType);
      const status = n.direction === "inbound" ? "received" : "sent";
      const { data: created, error: insErr } = await admin
        .from("channel_messages")
        .insert({
          company_id: n.companyId,
          connection_id: connectionId,
          conversation_id: conversationId,
          contact_id: contactId,
          provider_message_id: n.externalId,
          direction: n.direction,
          message_type: mappedType,
          body: n.body,
          // media_ref é NOT NULL no schema; mantém {} pra texto puro
          media_ref: (n.mediaUrl || n.mediaMimetype || n.mediaCaption || n.audioDuration)
            ? {
                url: n.mediaUrl || null,
                mimetype: n.mediaMimetype || null,
                caption: n.mediaCaption || null,
                duration: n.audioDuration || null,
              }
            : {},
          status,
          reply_to_message_id: null,
          sent_by_user_id: n.direction === "outbound" ? n.userId : null,
          message_timestamp: n.messageTimestamp,
          raw_payload: n.rawMsg,
          raw_payload_redacted: false,
          raw_payload_expires_at: null,
          metadata: {
            chat_jid: n.remoteJid,
            chat_phone: n.chatPhone,
            instance_name: n.instanceName,
            original_type: n.internalType,
          },
        })
        .select("id")
        .single();
      if (insErr) {
        if ((insErr as any).code === "23505") {
          // Race: outro worker do mesmo retry inseriu. Re-busca silenciosamente.
          const { data: again } = await admin
            .from("channel_messages")
            .select("id")
            .eq("connection_id", connectionId)
            .eq("provider_message_id", n.externalId)
            .maybeSingle();
          if (again?.id) messageId = again.id;
          else throw insErr;
        } else {
          throw insErr;
        }
      } else {
        messageId = created.id;
        // BAIXA a mídia na entrada (não-bloqueante): captura os bytes enquanto a
        // sessão está viva e guarda no nosso Storage, pra nunca ficar "indisponível".
        if (messageId && MEDIA_TYPES.has(n.internalType) && n.mediaMimetype) {
          const task = captureMediaToStorage(admin, {
            messageId,
            companyId: n.companyId,
            wamid: n.externalId,
            remoteJid: n.remoteJid,
            fromMe: n.direction === "outbound",
            instanceName: n.instanceName,
            mimetype: n.mediaMimetype,
          });
          // waitUntil mantém a função viva pra terminar o upload sem segurar o 200.
          try { (globalThis as any).EdgeRuntime?.waitUntil?.(task); } catch { /* noop */ }
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      step: "message",
      connectionId,
      contactId,
      conversationId,
      error: (err as any)?.message?.slice(0, 200) || String(err),
    };
  }

  return {
    ok: true,
    connectionId,
    contactId,
    conversationId,
    messageId,
  };
}

type EvolutionPayload = {
  event?: string;
  instance?: string;
  data?: any;
};

// ── INBOX.STATUS — checks de entrega/leitura (evento messages.update) ───────
// Mapa do status numérico do WhatsApp (Baileys) → nosso enum, com rank pra
// impedir downgrade (read nunca volta pra delivered).
const WA_ACK_STATUS: Record<number, { status: string; rank: number }> = {
  0: { status: "failed", rank: 0 },
  2: { status: "sent", rank: 1 },       // SERVER_ACK (✓)
  3: { status: "delivered", rank: 2 },  // DELIVERY_ACK (✓✓)
  4: { status: "read", rank: 3 },       // READ (✓✓ azul)
  5: { status: "read", rank: 3 },       // PLAYED (áudio ouvido) → tratado como lido
};
const CH_STATUS_RANK: Record<string, number> = {
  queued: 0, failed: 0, received: 1, sent: 1, delivered: 2, read: 3,
};

async function handleMessagesUpdate(payload: any): Promise<Response> {
  const instanceName: string | undefined = payload.instance || payload.data?.instance;
  if (!instanceName) return json(200, { ok: true, ignored: "no_instance" });
  const userId = instanceNameToUserId(instanceName);
  if (!userId) return json(200, { ok: true, ignored: "instance_not_mapped" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await (admin as any)
    .from("profiles").select("company_id").eq("id", userId).single();
  const companyId: string | null = profile?.company_id || null;
  if (!companyId) return json(200, { ok: true, ignored: "no_company" });

  const updates: any[] = Array.isArray(payload.data) ? payload.data : [payload.data];
  let applied = 0;
  for (const u of updates) {
    const id = u?.key?.id;
    const waStatus = u?.update?.status;
    if (!id || typeof waStatus !== "number") continue;
    const mapped = WA_ACK_STATUS[waStatus];
    if (!mapped) continue;
    // só-sobe: atualiza apenas mensagens cujo status atual tem rank MENOR que o novo.
    const allowedFrom = Object.entries(CH_STATUS_RANK)
      .filter(([, r]) => r < mapped.rank).map(([s]) => s);
    if (allowedFrom.length === 0) continue;
    const { error, count } = await (admin as any)
      .from("channel_messages")
      .update({ status: mapped.status }, { count: "exact" })
      .eq("company_id", companyId)
      .eq("provider_message_id", id)
      .in("status", allowedFrom);
    if (!error && typeof count === "number") applied += count;
  }
  return json(200, { ok: true, status_updates_applied: applied });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  // Autenticação: secret via query param (?secret=...) ou header x-webhook-secret.
  // Fail-CLOSED: se o EVOLUTION_WEBHOOK_SECRET não estiver configurado no
  // ambiente, NÃO aceitamos requests (antes era fail-open: qualquer POST passava).
  // Sem secret não há como autenticar o Evolution, então recusamos tudo.
  if (!EVOLUTION_WEBHOOK_SECRET) {
    console.error("[webhook] EVOLUTION_WEBHOOK_SECRET not configured; rejecting request");
    return json(500, { error: "webhook secret not configured" });
  }
  {
    const url = new URL(req.url);
    const provided = url.searchParams.get("secret") || req.headers.get("x-webhook-secret") || "";
    if (provided !== EVOLUTION_WEBHOOK_SECRET) {
      return json(401, { error: "invalid webhook secret" });
    }
  }

  let payload: EvolutionPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const event = payload?.event || "";

  // INBOX.STATUS — atualiza os checks (entregue/lido) das mensagens enviadas.
  if (event === "messages.update") {
    return await handleMessagesUpdate(payload);
  }

  if (event !== "messages.upsert") {
    return json(200, { ok: true, ignored: event || "unknown" });
  }

  const instanceName: string | undefined = payload.instance || payload.data?.instance;
  if (!instanceName) return json(400, { error: "missing instance" });

  const userId = instanceNameToUserId(instanceName);
  if (!userId) {
    return json(200, { ok: true, ignored: "instance_not_mapped", instanceName });
  }

  const messages: any[] = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.data?.messages)
      ? payload.data.messages
      : [payload.data];

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("id, company_id")
    .eq("id", userId)
    .single();

  const companyId: string | null = profile?.company_id || null;

  // PROSPECT.1 — Modo prospecção desta instância (wa_<userId>). Quando ativo,
  // SÓ números na prospecting_allowlist passam; grupos e qualquer não-listado
  // (inclusive contatos pessoais do dono do número) são descartados ANTES de
  // gravar. É a trava que mantém a vida pessoal fora do Vyzon.
  let prospectingActive = false;
  const allowlistTails = new Set<string>();
  {
    const { data: pInst } = await (admin as any)
      .from("prospecting_instances")
      .select("user_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (pInst) {
      prospectingActive = true;
      const { data: al } = await (admin as any)
        .from("prospecting_allowlist")
        .select("phone_tail")
        .eq("user_id", userId)
        .eq("is_active", true);
      for (const r of (al || []) as any[]) {
        if (r?.phone_tail) allowlistTails.add(r.phone_tail as string);
      }
    }
  }

  const inserted: string[] = [];
  const skipped: string[] = [];
  // F4W.3 — contadores observáveis pra dual-write
  let dualOk = 0;
  let dualSkipped = 0;
  let dualErr = 0;

  for (const msg of messages) {
    if (!msg || !msg.key) {
      skipped.push("no_key");
      continue;
    }

    const remoteJid: string = msg.key.remoteJid || "";
    if (!remoteJid) {
      skipped.push("no_jid");
      continue;
    }

    if (remoteJid.includes("@broadcast") || remoteJid.includes("@newsletter") || remoteJid === "status@broadcast") {
      skipped.push("system_jid");
      continue;
    }

    const externalId: string = msg.key.id || "";
    if (!externalId) {
      skipped.push("no_external_id");
      continue;
    }

    const fromMe: boolean = msg.key.fromMe === true;
    const isGroup = remoteJid.includes("@g.us");
    const chatPhone = extractDigits(remoteJid);
    const phoneTail = chatPhone.slice(-10);

    // PROSPECT.1 — trava: em modo prospecção, descarta grupos e qualquer
    // número fora da allowlist (não grava em whatsapp_messages nem channel_*).
    // Vale pros dois sentidos (inbound da agência e outbound enviado por nós).
    if (prospectingActive) {
      if (isGroup) {
        skipped.push("prospecting_group_blocked");
        continue;
      }
      if (!allowlistTails.has(phoneTail)) {
        skipped.push("prospecting_not_allowlisted");
        continue;
      }
    }

    const body = parseTextFromMessage(msg);
    const meta = detectMessageType(msg);

    if ((meta.type === "reaction" || meta.type === "protocol") && !body) {
      skipped.push(meta.type);
      // Não vale dual-write — sem conteúdo útil
      continue;
    }

    const timestampSec = Number(msg.messageTimestamp || msg.timestamp || 0);
    const messageTimestamp = timestampSec
      ? new Date(timestampSec * 1000).toISOString()
      : new Date().toISOString();

    // ── Insert legado em whatsapp_messages (continua sendo primário) ─────
    const direction: "inbound" | "outbound" = fromMe ? "outbound" : "inbound";
    const { error: insertErr } = await (admin as any)
      .from("whatsapp_messages")
      .insert({
        external_id: externalId,
        instance_name: instanceName,
        user_id: userId,
        company_id: companyId,
        chat_jid: remoteJid,
        chat_phone: chatPhone,
        phone_e164_tail: phoneTail,
        contact_name: msg.pushName || null,
        is_group: isGroup,
        direction,
        message_type: meta.type,
        body,
        media_url: meta.mediaUrl || null,
        media_mimetype: meta.mimetype || null,
        media_caption: meta.caption || null,
        audio_duration: meta.audioDuration || null,
        message_timestamp: messageTimestamp,
        raw_payload: msg,
      });

    let legacyDuplicate = false;
    if (insertErr) {
      if ((insertErr as any).code === "23505") {
        skipped.push("duplicate");
        legacyDuplicate = true;
      } else {
        console.error("[webhook] legacy insert error:", JSON.stringify(insertErr));
        skipped.push(`db_error:${(insertErr as any).code || "unknown"}:${(insertErr as any).message?.slice(0, 160) || ""}`);
      }
    } else {
      inserted.push(externalId);
    }

    // ── F4W.3 — Dual-write para channel_* (best-effort, isolado) ─────────
    // Roda mesmo em duplicate do legado, pois channel_messages tem sua
    // própria unique constraint e dá no-op (idempotente).
    // Se whatsapp_messages teve erro NÃO-duplicate, ainda tentamos porque
    // o channel_* pode estar atrasado em relação ao legado.
    if (!companyId) {
      dualSkipped++;
      console.warn("[webhook] dual-write skipped: missing_company_id user=" + userId);
      continue;
    }

    const normalized: NormalizedMessage = {
      externalId,
      instanceName,
      userId,
      companyId,
      remoteJid,
      chatPhone,
      phoneTail,
      // F4W.7.4: pushName é o nome de QUEM ENVIOU. Em outbound (fromMe) isso é
      // o DONO da conta — usar aqui renomeava o contato pro nome do vendedor
      // (ex.: "Amor" virava "Markus"). Só nomeia o contato a partir de inbound.
      contactName: direction === "inbound" ? (msg.pushName || null) : null,
      isGroup,
      direction,
      internalType: meta.type,
      body,
      mediaUrl: meta.mediaUrl || null,
      mediaMimetype: meta.mimetype || null,
      mediaCaption: meta.caption || null,
      audioDuration: meta.audioDuration || null,
      messageTimestamp,
      rawMsg: msg,
    };

    try {
      const result = await dualWriteChannel(admin as any, normalized);
      if (result.ok) {
        dualOk++;
        console.log(
          `[webhook] dual_write_success step=message external_id=${externalId} ` +
          `connection_id=${result.connectionId} contact_id=${result.contactId} ` +
          `conversation_id=${result.conversationId} message_id=${result.messageId} ` +
          `legacy_duplicate=${legacyDuplicate}`,
        );
      } else {
        dualErr++;
        console.error(
          `[webhook] dual_write_error step=${result.step} external_id=${externalId} ` +
          `connection_id=${result.connectionId || "-"} contact_id=${result.contactId || "-"} ` +
          `conversation_id=${result.conversationId || "-"} error=${result.error}`,
        );
      }
    } catch (err) {
      // Última linha de defesa — se algo escapar do best-effort, não falha o webhook.
      dualErr++;
      console.error(
        `[webhook] dual_write_unexpected external_id=${externalId} err=`,
        (err as any)?.message?.slice(0, 200) || String(err),
      );
    }
  }

  return json(200, {
    ok: true,
    inserted: inserted.length,
    skipped,
    dual_write: { success: dualOk, skipped: dualSkipped, error: dualErr },
  });
});
