import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET") || "";

const WEBHOOK_RECEIVER_URL = `${SUPABASE_URL}/functions/v1/evolution-message-webhook`;

// ─────────────────────────────────────────────────────────────
// Profile cache (hot path only)
// Isolates Deno reutilizam o módulo entre requests — Map persiste.
// Keyed por user.id (vindo de JWT validado). TTL curto para minimizar
// janela de permissão stale. Nunca cacheia is_super_admin=true.
// ─────────────────────────────────────────────────────────────
type CachedProfile = {
  id: string;
  company_id: string | null;
  role: string | null;
  is_super_admin: boolean;
  expiresAt: number;
};
const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, CachedProfile>();
const HOT_PATH_ACTIONS = new Set([
  "send", "sendMedia", "sendAudio", "messages", "chats", "profilePic", "getMedia", "status",
]);

async function loadProfile(adminClient: any, userId: string): Promise<CachedProfile | null> {
  const { data } = await adminClient
    .from("profiles")
    .select("id, company_id, is_super_admin, role")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    company_id: data.company_id,
    role: data.role,
    is_super_admin: data.is_super_admin === true,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  };
}

async function getProfile(adminClient: any, userId: string, useCache: boolean): Promise<CachedProfile | null> {
  if (useCache) {
    const cached = profileCache.get(userId);
    if (cached && cached.expiresAt > Date.now() && !cached.is_super_admin) {
      return cached;
    }
  }
  const fresh = await loadProfile(adminClient, userId);
  if (fresh && !fresh.is_super_admin) {
    profileCache.set(userId, fresh);
  } else {
    profileCache.delete(userId);
  }
  return fresh;
}

async function ensureWebhook(instanceName: string): Promise<{ ok: boolean; error?: string }> {
  if (!EVOLUTION_WEBHOOK_SECRET) {
    return { ok: false, error: "EVOLUTION_WEBHOOK_SECRET not set" };
  }
  const url = `${WEBHOOK_RECEIVER_URL}?secret=${EVOLUTION_WEBHOOK_SECRET}`;
  try {
    await evolutionRequest(`/webhook/set/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT"],
        },
      }),
    });
    return { ok: true };
  } catch (err: any) {
    const msg = err?.message || "unknown error";
    console.error(`[ensureWebhook] ${instanceName}:`, msg);
    return { ok: false, error: msg };
  }
}

// ── Blindagem anti-ban (EVA guardiã do número) ───────────────────────────────
// Ritmo humano: a Evolution exibe "digitando/gravando" durante `delay` ms antes
// de entregar a mensagem. Um atraso proporcional ao texto (teto 3.5s) tira o
// padrão de bot que dispara banimento — o número parece uma pessoa digitando.
function typingDelayMs(text?: string): number {
  const len = (text || "").trim().length;
  return Math.min(3500, Math.max(800, Math.round(len * 35)));
}

// Rede anti-rajada por instância e por número de destino. Limites GENEROSOS:
// cortam loop/abuso (bug ou outreach descontrolado), não o vendedor respondendo
// no Inbox. Fail-open: erro de infra nunca bloqueia um envio legítimo.
async function outboundAllowed(admin: any, instanceName: string, target: string): Promise<boolean> {
  try {
    const [byInstance, byNumber] = await Promise.all([
      admin.rpc("consume_rate_limit", { p_bucket: `wa-out:${instanceName}`, p_limit: 25, p_window_seconds: 60 }),
      admin.rpc("consume_rate_limit", { p_bucket: `wa-out:${instanceName}:${target}`, p_limit: 12, p_window_seconds: 60 }),
    ]);
    return byInstance.data !== false && byNumber.data !== false;
  } catch {
    return true; // fail-open
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "status"
  | "connect"
  | "chats"
  | "messages"
  | "send"
  | "sendMedia"
  | "sendAudio"
  | "logout"
  | "profilePic"
  | "instances"
  | "getMedia"
  | "monitor"
  | "deleteInstance"
  | "setWebhookAll"
  | "import_history";

type Body = {
  action?: Action;
  companyId?: string | null;
  targetUserId?: string | null;
  chatId?: string;
  text?: string;
  limit?: number;
  number?: string;
  messageId?: string;
  /** Base64-encoded media data (without data URI prefix) */
  mediaBase64?: string;
  /** MIME type of the media */
  mimetype?: string;
  /** Filename for documents */
  fileName?: string;
  /** Caption for images/videos */
  caption?: string;
  /** Instance name for deleteInstance action */
  targetInstanceName?: string;
  /** F4W.7.3 — import_history: limites (com hard caps no handler) */
  maxChats?: number;
  maxMessagesPerChat?: number;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractNumberFromJid(value?: string | null) {
  if (!value) return "";
  return String(value).split("@")[0].replace(/\D/g, "");
}

function getInstanceName(userId: string) {
  return `wa_${userId.replace(/-/g, "")}`;
}

function extractQrBase64(payload: any): string | null {
  return (
    payload?.qrcode?.base64 ||
    payload?.base64 ||
    payload?.qrcode ||
    payload?.qrCode?.base64 ||
    null
  );
}

async function evolutionRequest(
  path: string,
  init: RequestInit = {},
  timeoutMs?: number,
) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error("Evolution API não configurada no servidor");
  }

  // Timeout adaptativo: a VM grátis da Oracle é lenta em operações de leitura
  // pesadas (listar todos os chats / mensagens de um número com histórico
  // grande pode passar de 20s). Operações leves (status/send/logout) ficam
  // curtas pra não pendurar a UI. Default conservador de 8s.
  const effectiveTimeout = timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

  let response: Response;
  try {
    response = await fetch(`${EVOLUTION_API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(
        `Evolution API timeout after ${Math.round(effectiveTimeout / 1000)}s: ${path}`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(
      parsed?.response?.message ||
      parsed?.message ||
      parsed?.error ||
      `Evolution API error (${response.status})`,
    );
    (err as any).status = response.status;
    (err as any).payload = parsed;
    throw err;
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────
// F4W.7.3 — Import de histórico: helpers de normalização.
// Espelham evolution-message-webhook (mesmo schema em channel_*).
// TODO(consolidação): extrair pra módulo _shared usado pelas 2 functions.
// ─────────────────────────────────────────────────────────────
function parseTextFromMsg(msg: any): string | null {
  const m = msg?.message;
  if (!m) return msg?.body || msg?.text || null;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  return null;
}

function detectMsgType(msg: any): { type: string; mimetype?: string; caption?: string; audioDuration?: number; mediaUrl?: string } {
  const m = msg?.message;
  if (!m) return { type: "text" };
  if (m.conversation || m.extendedTextMessage?.text) return { type: "text" };
  if (m.imageMessage) return { type: "image", mimetype: m.imageMessage.mimetype, caption: m.imageMessage.caption, mediaUrl: m.imageMessage.url };
  if (m.videoMessage) return { type: "video", mimetype: m.videoMessage.mimetype, caption: m.videoMessage.caption, mediaUrl: m.videoMessage.url };
  if (m.audioMessage) return { type: "audio", mimetype: m.audioMessage.mimetype, audioDuration: Number(m.audioMessage.seconds || 0) || undefined, mediaUrl: m.audioMessage.url };
  if (m.stickerMessage) return { type: "sticker", mimetype: m.stickerMessage.mimetype, mediaUrl: m.stickerMessage.url };
  if (m.documentMessage) return { type: "document", mimetype: m.documentMessage.mimetype, caption: m.documentMessage.fileName, mediaUrl: m.documentMessage.url };
  if (m.locationMessage || m.liveLocationMessage) return { type: "location" };
  if (m.contactMessage) return { type: "contact" };
  if (m.reactionMessage) return { type: "reaction" };
  if (m.protocolMessage || m.senderKeyDistributionMessage) return { type: "protocol" };
  return { type: "other" };
}

function mapChannelType(internal: string): string {
  switch (internal) {
    case "text": case "image": case "audio": case "video": case "document": case "reaction": case "location": return internal;
    case "sticker": return "image";
    case "contact": return "contacts";
    default: return "unknown";
  }
}

async function importEnsureConnection(admin: any, instanceName: string, companyId: string, userId: string): Promise<string | null> {
  const metaPatch: Record<string, unknown> = { source: "import_history", instance_name: instanceName, user_id: userId };
  try {
    const { data: existing } = await admin.from("channel_connections").select("id, metadata").eq("provider", "evolution").eq("external_id", instanceName).maybeSingle();
    if (existing?.id) {
      const merged = { ...((existing.metadata as Record<string, unknown>) || {}), ...metaPatch };
      await admin.from("channel_connections").update({ status: "active", last_seen_at: new Date().toISOString(), metadata: merged }).eq("id", existing.id);
      return existing.id;
    }
    const { data: created, error } = await admin.from("channel_connections").insert({ company_id: companyId, provider: "evolution", channel_type: "whatsapp", external_id: instanceName, display_name: instanceName, status: "active", last_seen_at: new Date().toISOString(), metadata: metaPatch }).select("id").single();
    if (error) {
      const { data: again } = await admin.from("channel_connections").select("id").eq("provider", "evolution").eq("external_id", instanceName).maybeSingle();
      return again?.id || null;
    }
    return created.id;
  } catch {
    return null;
  }
}

async function importEnsureContact(admin: any, connectionId: string, companyId: string, remoteJid: string, name: string | null, chatPhone: string, phoneTail: string): Promise<string | null> {
  try {
    const { data: existing } = await admin.from("channel_contacts").select("id, name").eq("connection_id", connectionId).eq("external_contact_id", remoteJid).maybeSingle();
    if (existing?.id) {
      if (name && name !== existing.name) {
        await admin.from("channel_contacts").update({ name }).eq("id", existing.id);
      }
      return existing.id;
    }
    const { data: created, error } = await admin.from("channel_contacts").insert({ company_id: companyId, connection_id: connectionId, external_contact_id: remoteJid, phone_e164: chatPhone || null, phone_tail: phoneTail || null, name, is_group: false, metadata: { chat_jid: remoteJid } }).select("id").single();
    if (error) {
      const { data: again } = await admin.from("channel_contacts").select("id").eq("connection_id", connectionId).eq("external_contact_id", remoteJid).maybeSingle();
      return again?.id || null;
    }
    return created.id;
  } catch {
    return null;
  }
}

async function importEnsureConversation(
  admin: any,
  connectionId: string,
  companyId: string,
  contactId: string,
  lastMessageAt: string,
  lastInboundAt: string | null,
  lastOutboundAt: string | null,
): Promise<{ id: string | null; isNew: boolean }> {
  try {
    const { data: existing } = await admin.from("channel_conversations").select("id").eq("connection_id", connectionId).eq("contact_id", contactId).maybeSingle();
    if (existing?.id) return { id: existing.id, isNew: false };
    // Conversa nova: import NÃO infla unread (mensagens históricas já lidas).
    const { data: created, error } = await admin.from("channel_conversations").insert({
      company_id: companyId,
      connection_id: connectionId,
      contact_id: contactId,
      status: "open",
      last_message_at: lastMessageAt,
      last_inbound_at: lastInboundAt,
      last_outbound_at: lastOutboundAt,
      unread_count: 0,
      metadata: {},
    }).select("id").single();
    if (error) {
      const { data: again } = await admin.from("channel_conversations").select("id").eq("connection_id", connectionId).eq("contact_id", contactId).maybeSingle();
      return { id: again?.id || null, isNew: false };
    }
    return { id: created.id, isNew: true };
  } catch {
    return { id: null, isNew: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Keep-warm ping: curto-circuito antes de auth/DB. Mantém o isolate do Deno quente
  // sem gastar latência com verificações. Usado pelo cron pg_cron a cada 4min.
  const url = new URL(req.url);
  if (url.searchParams.get("ping") === "1") {
    return json(200, { ok: true, ts: Date.now() });
  }

  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return json(500, {
        error: "Evolution API não configurada no servidor",
        code: "EVOLUTION_NOT_CONFIGURED",
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const body = (await req.json()) as Body;
    const action = body.action;
    if (!action) return json(400, { error: "action is required" });

    // Cache só no hot path. Admin ops/operações privilegiadas sempre buscam fresh.
    const useCache = HOT_PATH_ACTIONS.has(action);
    const profile = await getProfile(adminSupabase, user.id, useCache);

    if (!profile) return json(403, { error: "Profile not found" });

    const isSuperAdmin = profile.is_super_admin === true;
    const isAdmin = isSuperAdmin || profile.role === "admin";

    if (!isSuperAdmin && body.companyId && body.companyId !== profile.company_id) {
      return json(403, { error: "Forbidden company context" });
    }

    const targetCompanyId = isSuperAdmin
      ? (body.companyId || profile.company_id)
      : profile.company_id;

    if (!targetCompanyId) {
      return json(400, { error: "No company context" });
    }

    // Determine which user's instance to operate on
    let effectiveUserId = user.id;

    if (body.targetUserId && isAdmin) {
      // Verify the target user belongs to the same company (unless super admin)
      if (!isSuperAdmin) {
        const targetProfile = await getProfile(adminSupabase, body.targetUserId, useCache);
        if (!targetProfile || targetProfile.company_id !== profile.company_id) {
          return json(403, { error: "Target user not in your company" });
        }
      }
      effectiveUserId = body.targetUserId;
    }

    const instanceName = getInstanceName(effectiveUserId);

    if (action === "status") {
      try {
        const data = await evolutionRequest(`/instance/connectionState/${instanceName}`, {
          method: "GET",
        });
        const state = data?.instance?.state || data?.state || "unknown";
        const isOpen = String(state).toLowerCase() === "open";

        // INBOX.STATUS — persiste o estado real no banco. O webhook só SOBE
        // status pra "active" e NUNCA rebaixa; sem isto a connection fica
        // "active" eterno mesmo com a sessão caída (a UI mostra "conectado"
        // mas nenhuma mensagem chega). O check da UI (mount/focus) passa por
        // aqui, então persistir aqui já reconcilia. Best-effort: falha não
        // derruba a resposta.
        try {
          await adminSupabase
            .from("channel_connections")
            .update(
              isOpen
                ? { status: "active", last_seen_at: new Date().toISOString() }
                : { status: "disconnected" },
            )
            .eq("provider", "evolution")
            .eq("external_id", instanceName);
        } catch (persistErr: any) {
          console.warn("[status] persist failed:", persistErr?.message);
        }

        return json(200, {
          success: true,
          instanceName,
          state,
          connected: isOpen,
        });
      } catch (error: any) {
        const errStatus = Number((error as any)?.status);
        const errMsg = String((error as any)?.message || "").toLowerCase();
        if (errStatus === 404 || errMsg.includes("not exist") || errMsg.includes("not found")) {
          return json(200, {
            success: true,
            instanceName,
            state: "not_created",
            connected: false,
          });
        }
        throw error;
      }
    }

    if (action === "connect") {
      // 1. Check if already connected
      try {
        const stateRes = await evolutionRequest(`/instance/connectionState/${instanceName}`, { method: "GET" });
        const state = stateRes?.instance?.state || stateRes?.state;
        if (String(state).toLowerCase() === "open") {
          return json(200, {
            success: true,
            instanceName,
            state: "open",
            connected: true,
            qrCodeBase64: null,
          });
        }
      } catch {
        // Instance doesn't exist yet — that's fine, we'll create it
      }

      let qrCodeBase64: string | null = null;

      // 2. Try to create instance
      try {
        const createBody: any = {
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        };
        if (EVOLUTION_WEBHOOK_SECRET) {
          createBody.webhook = {
            url: `${WEBHOOK_RECEIVER_URL}?secret=${EVOLUTION_WEBHOOK_SECRET}`,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
          };
        }
        const createRes = await evolutionRequest("/instance/create", {
          method: "POST",
          body: JSON.stringify(createBody),
        });
        console.log("[connect] create response:", JSON.stringify(createRes));
        qrCodeBase64 = extractQrBase64(createRes);
        console.log("[connect] qr from create:", qrCodeBase64 ? "found" : "null");
      } catch (err: any) {
        console.log("[connect] create error:", err?.message, "status:", (err as any)?.status, "payload:", JSON.stringify((err as any)?.payload));
      }

      // 2.5. Ensure webhook is set (works for both fresh create and pre-existing instance)
      const whRes = await ensureWebhook(instanceName);
      console.log("[connect] ensureWebhook:", whRes);

      // 3. If no QR yet, try connect endpoint
      if (!qrCodeBase64) {
        try {
          const connectRes = await evolutionRequest(`/instance/connect/${instanceName}`, { method: "GET" });
          console.log("[connect] connect response:", JSON.stringify(connectRes));
          qrCodeBase64 = extractQrBase64(connectRes);
          console.log("[connect] qr from connect:", qrCodeBase64 ? "found" : "null");
        } catch (err: any) {
          console.log("[connect] connect error:", err?.message, "status:", (err as any)?.status, "payload:", JSON.stringify((err as any)?.payload));
        }
      }

      return json(200, {
        success: true,
        instanceName,
        state: "connecting",
        connected: false,
        qrCodeBase64,
      });
    }

    if (action === "chats") {
      const chats = await evolutionRequest(`/chat/findChats/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({}),
      }, 25000);
      return json(200, { success: true, instanceName, chats });
    }

    // ── F4W.7.3 — IMPORT_HISTORY: Evolution é fonte do IMPORT; channel_* é a
    // verdade. Importa conversas/mensagens recentes (sem grupos, com limites).
    if (action === "import_history") {
      const MAX_CHATS_CAP = 30;
      const MAX_MSGS_CAP = 100;
      const TOTAL_CAP = 1000;
      const maxChats = Math.max(1, Math.min(Number(body.maxChats || 20), MAX_CHATS_CAP));
      const maxMsgs = Math.max(1, Math.min(Number(body.maxMessagesPerChat || 50), MAX_MSGS_CAP));

      // 1. Garante a connection row (mesma resolução do webhook)
      const connectionId = await importEnsureConnection(adminSupabase, instanceName, targetCompanyId, effectiveUserId);
      if (!connectionId) {
        return json(500, { error: "Não consegui resolver a conexão para importar" });
      }

      // 2. Busca chats recentes
      let chatsRaw: any;
      try {
        chatsRaw = await evolutionRequest(`/chat/findChats/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({}),
        }, 25000);
      } catch (err: any) {
        return json(502, { error: `Falha ao buscar conversas: ${err?.message || err}` });
      }
      const chatArr: any[] = Array.isArray(chatsRaw)
        ? chatsRaw
        : Array.isArray(chatsRaw?.chats)
          ? chatsRaw.chats
          : Array.isArray(chatsRaw?.chats?.records)
            ? chatsRaw.chats.records
            : Array.isArray(chatsRaw?.records)
              ? chatsRaw.records
              : [];

      let skippedGroups = 0;
      const candidatesChats = chatArr
        .map((c: any) => ({
          jid: String(c?.remoteJid || c?.id || ""),
          name: (c?.pushName || c?.name || c?.contactName || c?.verifiedName || null) as string | null,
          updatedAt: String(c?.updatedAt || c?.updated_at || ""),
        }))
        .filter((c) => {
          if (!c.jid) return false;
          if (c.jid.includes("@g.us")) { skippedGroups++; return false; }
          if (c.jid.includes("@broadcast") || c.jid.includes("@newsletter")) return false;
          // V1: só contatos individuais
          return c.jid.endsWith("@s.whatsapp.net") || c.jid.endsWith("@lid");
        });
      // Mais recentes primeiro quando há updatedAt
      candidatesChats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const selectedChats = candidatesChats.slice(0, maxChats);

      let importedChats = 0;
      let importedMessages = 0;
      let skippedDuplicates = 0;
      let errors = 0;

      for (const chat of selectedChats) {
        if (importedMessages >= TOTAL_CAP) break;
        const remoteJid = chat.jid;
        const chatPhone = extractNumberFromJid(remoteJid);
        const phoneTail = chatPhone.slice(-10);
        try {
          // 3. Busca mensagens recentes do chat
          const remaining = TOTAL_CAP - importedMessages;
          const limit = Math.min(maxMsgs, remaining);
          const msgsRaw = await evolutionRequest(`/chat/findMessages/${instanceName}`, {
            method: "POST",
            body: JSON.stringify({ where: { key: { remoteJid } }, limit }),
          }, 25000);
          const msgs: any[] = Array.isArray(msgsRaw)
            ? msgsRaw
            : Array.isArray(msgsRaw?.messages)
              ? msgsRaw.messages
              : Array.isArray(msgsRaw?.messages?.records)
                ? msgsRaw.messages.records
                : Array.isArray(msgsRaw?.records)
                  ? msgsRaw.records
                  : [];

          // Normaliza candidatos (descarta sem id / reaction|protocol vazios)
          const candidates = msgs
            .map((msg: any) => {
              const externalId = msg?.key?.id ? String(msg.key.id) : "";
              if (!externalId) return null;
              const t = detectMsgType(msg);
              const text = parseTextFromMsg(msg);
              if ((t.type === "reaction" || t.type === "protocol") && !text) return null;
              const fromMe = msg?.key?.fromMe === true;
              const tsSec = Number(msg?.messageTimestamp || msg?.timestamp || 0);
              const ts = tsSec ? new Date(tsSec * 1000).toISOString() : new Date().toISOString();
              return { raw: msg, externalId, direction: fromMe ? "outbound" : "inbound", ts, body: text, t };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

          if (candidates.length === 0) continue;

          let maxTs = candidates[0].ts;
          let lastIn: string | null = null;
          let lastOut: string | null = null;
          // F4W.7.4 — nome do contato só do pushName de mensagem INBOUND
          // (outbound traz o nome do dono da conta). Fallback: nome do chat.
          let inboundName: string | null = null;
          let inboundNameTs = "";
          for (const c of candidates) {
            if (c.ts > maxTs) maxTs = c.ts;
            if (c.direction === "inbound") {
              if (!lastIn || c.ts > lastIn) lastIn = c.ts;
              const pn = c.raw?.pushName ? String(c.raw.pushName).trim() : "";
              if (pn && c.ts >= inboundNameTs) { inboundName = pn; inboundNameTs = c.ts; }
            } else {
              if (!lastOut || c.ts > lastOut) lastOut = c.ts;
            }
          }
          const contactName = inboundName || chat.name;

          // 4. Contato + conversa (idempotentes)
          const contactId = await importEnsureContact(adminSupabase, connectionId, targetCompanyId, remoteJid, contactName, chatPhone, phoneTail);
          if (!contactId) { errors++; continue; }
          const conv = await importEnsureConversation(adminSupabase, connectionId, targetCompanyId, contactId, maxTs, lastIn, lastOut);
          if (!conv.id) { errors++; continue; }
          const conversationId = conv.id;

          // 5. Mensagens (idempotente por connection_id + provider_message_id)
          let chatImported = 0;
          for (const c of candidates) {
            if (importedMessages >= TOTAL_CAP) break;
            try {
              const { data: existsMsg } = await adminSupabase
                .from("channel_messages")
                .select("id")
                .eq("connection_id", connectionId)
                .eq("provider_message_id", c.externalId)
                .maybeSingle();
              if (existsMsg?.id) { skippedDuplicates++; continue; }

              const mediaRef = (c.t.mediaUrl || c.t.mimetype || c.t.caption || c.t.audioDuration)
                ? { url: c.t.mediaUrl || null, mimetype: c.t.mimetype || null, caption: c.t.caption || null, duration: c.t.audioDuration || null }
                : {};
              const { error: insErr } = await adminSupabase.from("channel_messages").insert({
                company_id: targetCompanyId,
                connection_id: connectionId,
                conversation_id: conversationId,
                contact_id: contactId,
                provider_message_id: c.externalId,
                direction: c.direction,
                message_type: mapChannelType(c.t.type),
                body: c.body,
                media_ref: mediaRef,
                status: c.direction === "inbound" ? "received" : "sent",
                reply_to_message_id: null,
                sent_by_user_id: c.direction === "outbound" ? effectiveUserId : null,
                message_timestamp: c.ts,
                raw_payload: c.raw,
                raw_payload_redacted: false,
                raw_payload_expires_at: null,
                metadata: { chat_jid: remoteJid, instance_name: instanceName, original_type: c.t.type, imported: true },
              });
              if (insErr) {
                if ((insErr as any).code === "23505") { skippedDuplicates++; }
                else { errors++; }
              } else {
                importedMessages++;
                chatImported++;
              }
            } catch {
              errors++;
            }
          }

          // 6. Conversa existente: avança cursores só pra frente (não mexe unread)
          if (!conv.isNew) {
            const { data: cur } = await adminSupabase
              .from("channel_conversations")
              .select("last_message_at, last_inbound_at, last_outbound_at")
              .eq("id", conversationId)
              .maybeSingle();
            const patch: Record<string, unknown> = {};
            if (!cur?.last_message_at || maxTs > cur.last_message_at) patch.last_message_at = maxTs;
            if (lastIn && (!cur?.last_inbound_at || lastIn > cur.last_inbound_at)) patch.last_inbound_at = lastIn;
            if (lastOut && (!cur?.last_outbound_at || lastOut > cur.last_outbound_at)) patch.last_outbound_at = lastOut;
            if (Object.keys(patch).length > 0) {
              await adminSupabase.from("channel_conversations").update(patch).eq("id", conversationId);
            }
          }

          if (chatImported > 0) importedChats++;
        } catch (err: any) {
          errors++;
          console.error(`[import_history] chat error jid_tail=${remoteJid.slice(-6)}: ${String(err?.message || err).slice(0, 120)}`);
        }
      }

      console.log(`[import_history] done instance=${instanceName} chats=${importedChats} msgs=${importedMessages} dup=${skippedDuplicates} groups=${skippedGroups} errors=${errors}`);

      return json(200, {
        success: true,
        importedChats,
        importedMessages,
        skippedGroups,
        skippedDuplicates,
        errors,
      });
    }

    if (action === "messages") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      const limit = Math.max(1, Math.min(Number(body.limit || 50), 100));
      const rawMessages = await evolutionRequest(`/chat/findMessages/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          where: { key: { remoteJid: body.chatId } },
          limit,
        }),
      }, 25000);

      // Normalize: Evolution API v2.3.7 may return messages in different formats
      let messages: any[];
      if (Array.isArray(rawMessages)) {
        messages = rawMessages;
      } else if (Array.isArray(rawMessages?.messages)) {
        messages = rawMessages.messages;
      } else if (Array.isArray(rawMessages?.messages?.records)) {
        messages = rawMessages.messages.records;
      } else if (Array.isArray(rawMessages?.records)) {
        messages = rawMessages.records;
      } else {
        messages = [];
      }

      console.log(`[messages] chatId=${body.chatId} rawType=${typeof rawMessages} isArray=${Array.isArray(rawMessages)} count=${messages.length}`);
      if (messages.length > 0) {
        console.log("[messages] sample keys:", JSON.stringify(Object.keys(messages[0])));
      }

      return json(200, { success: true, instanceName, messages });
    }

    if (action === "send") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.text || !String(body.text).trim()) return json(400, { error: "text is required" });

      // For groups (@g.us), send using the full remoteJid.
      // For contacts (@s.whatsapp.net), extract the number.
      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup ? body.chatId : extractNumberFromJid(body.chatId);
      if (!target) return json(400, { error: "invalid chatId/number" });

      console.log(`[send] target=${target} isGroup=${isGroup} chatId=${body.chatId} instanceName=${instanceName}`);

      if (!(await outboundAllowed(adminSupabase, instanceName, target))) {
        return json(429, { error: "rate_limited", message: "Muitas mensagens em sequência neste canal. Aguarde alguns segundos." });
      }

      try {
        const typingMs = typingDelayMs(body.text);
        const sendRes = await evolutionRequest(`/message/sendText/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number: target,
            text: String(body.text).trim(),
            // ritmo humano: "digitando…" por typingMs antes de entregar
            delay: typingMs,
            presence: "composing",
          }),
        }, typingMs + 8000);
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[send] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        throw sendErr;
      }
    }

    if (action === "profilePic") {
      if (!body.number) return json(400, { error: "number is required" });
      try {
        const data = await evolutionRequest(`/chat/fetchProfilePictureUrl/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({ number: body.number }),
        });
        return json(200, { success: true, profilePicUrl: data?.profilePictureUrl || data?.url || null });
      } catch {
        return json(200, { success: true, profilePicUrl: null });
      }
    }

    if (action === "sendMedia") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.mediaBase64) return json(400, { error: "mediaBase64 is required" });
      if (!body.mimetype) return json(400, { error: "mimetype is required" });

      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup ? body.chatId : extractNumberFromJid(body.chatId);
      if (!target) return json(400, { error: "invalid chatId/number" });

      const mime = String(body.mimetype).toLowerCase();
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");

      const payload: any = {
        number: target,
        mediatype: isImage ? "image" : isVideo ? "video" : "document",
        mimetype: body.mimetype,
        media: body.mediaBase64,
      };

      if (body.caption) payload.caption = body.caption;
      if (body.fileName) payload.fileName = body.fileName;
      // ritmo humano: leve "digitando…" antes da mídia
      payload.delay = 600;
      payload.presence = "composing";

      console.log(`[sendMedia] target=${target} type=${payload.mediatype} mime=${body.mimetype} base64Length=${body.mediaBase64.length}`);

      if (!(await outboundAllowed(adminSupabase, instanceName, target))) {
        return json(429, { error: "rate_limited", message: "Muitas mensagens em sequência neste canal. Aguarde alguns segundos." });
      }

      try {
        const sendRes = await evolutionRequest(`/message/sendMedia/${instanceName}`, {
          method: "POST",
          body: JSON.stringify(payload),
        }, 12000);
        console.log("[sendMedia] success:", JSON.stringify(sendRes));
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[sendMedia] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        return json(sendErr?.status || 502, { error: sendErr?.message || "Evolution API error", details: sendErr?.payload });
      }
    }

    if (action === "sendAudio") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.mediaBase64) return json(400, { error: "mediaBase64 is required" });

      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup ? body.chatId : extractNumberFromJid(body.chatId);
      if (!target) return json(400, { error: "invalid chatId/number" });

      // Accept mimetype from client, default to audio/mp4 (widely supported by WhatsApp)
      const audioMime = body.mimetype || "audio/mp4";
      console.log(`[sendAudio] target=${target} mime=${audioMime} base64Length=${body.mediaBase64.length}`);

      if (!(await outboundAllowed(adminSupabase, instanceName, target))) {
        return json(429, { error: "rate_limited", message: "Muitas mensagens em sequência neste canal. Aguarde alguns segundos." });
      }

      try {
        const sendRes = await evolutionRequest(`/message/sendWhatsAppAudio/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            number: target,
            audio: `data:${audioMime};base64,${body.mediaBase64}`,
            // ritmo humano: "gravando áudio…" antes de entregar
            delay: 800,
            presence: "recording",
          }),
        }, 12000);
        console.log("[sendAudio] success:", JSON.stringify(sendRes));
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[sendAudio] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        return json(sendErr?.status || 502, { error: sendErr?.message || "Evolution API error", details: sendErr?.payload });
      }
    }

    if (action === "getMedia") {
      if (!body.messageId) return json(400, { error: "messageId is required" });
      try {
        // Evolution API v2: convert message to base64
        const data = await evolutionRequest(`/chat/getBase64FromMediaMessage/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            message: { key: { id: body.messageId } },
            convertToMp4: false,
          }),
        });
        const base64 = data?.base64 || data?.mediaBase64 || data?.data || null;
        const mimetype = data?.mimetype || data?.mediaType || "audio/ogg";
        if (!base64) {
          return json(404, { error: "Media not found or expired" });
        }
        return json(200, {
          success: true,
          base64,
          mimetype,
        });
      } catch (err: any) {
        console.error("[getMedia] error:", err?.message);
        return json(500, { error: err?.message || "Failed to fetch media" });
      }
    }

    if (action === "logout") {
      try {
        await evolutionRequest(`/instance/logout/${instanceName}`, { method: "DELETE" });
      } catch {
        try {
          await evolutionRequest(`/instance/logout/${instanceName}`, { method: "POST", body: JSON.stringify({}) });
        } catch {
          // best effort
        }
      }
      return json(200, { success: true, instanceName });
    }

    // INBOX.STATUS — re-aplica o webhook config (com os eventos atuais, ex.
    // MESSAGES_UPDATE) na instância do próprio usuário, sem precisar reconectar.
    if (action === "resyncWebhook") {
      const r = await ensureWebhook(instanceName);
      if (!r.ok) return json(500, { error: r.error || "failed to set webhook", instanceName });
      return json(200, { success: true, instanceName });
    }

    if (action === "instances") {
      if (!isAdmin) {
        return json(403, { error: "Only admins can list instances" });
      }

      const { data: companyUsers } = await (adminSupabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("company_id", targetCompanyId);

      if (!companyUsers || companyUsers.length === 0) {
        return json(200, { success: true, sellers: [] });
      }

      // Process sellers in batches of 5 to avoid overwhelming the API
      const BATCH_SIZE = 5;
      const sellers: any[] = [];
      for (let i = 0; i < companyUsers.length; i += BATCH_SIZE) {
        const batch = companyUsers.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (u: any) => {
            const uInstanceName = getInstanceName(u.id);
            let connectedStatus = false;
            try {
              const stateRes = await evolutionRequest(
                `/instance/connectionState/${uInstanceName}`,
                { method: "GET" },
              );
              const state = stateRes?.instance?.state || stateRes?.state || "";
              connectedStatus = String(state).toLowerCase() === "open";
            } catch {
              // instance doesn't exist or error — not connected
            }
            return {
              userId: u.id,
              name: u.full_name || "Sem nome",
              avatarUrl: u.avatar_url || null,
              role: u.role || "seller",
              connected: connectedStatus,
            };
          }),
        );
        sellers.push(...batchResults);
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < companyUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return json(200, { success: true, sellers });
    }

    // ── DELETE INSTANCE: Super admin can remove any Evolution instance ──
    if (action === "deleteInstance") {
      if (!isSuperAdmin) {
        return json(403, { error: "Only super admins can delete instances" });
      }

      const targetName = body.targetInstanceName;
      if (!targetName) {
        return json(400, { error: "targetInstanceName is required" });
      }

      // Try logout first, then delete
      try {
        await evolutionRequest(`/instance/logout/${targetName}`, { method: "DELETE" });
      } catch {
        // may not be connected, ignore
      }

      try {
        await evolutionRequest(`/instance/delete/${targetName}`, { method: "DELETE" });
      } catch (err: any) {
        // Some Evolution versions use different endpoint
        try {
          await evolutionRequest(`/instance/delete/${targetName}`, { method: "POST", body: JSON.stringify({}) });
        } catch {
          // best effort
        }
      }

      return json(200, { success: true, deleted: targetName });
    }

    // ── MONITOR: Super admin overview of ALL Evolution instances ──
    if (action === "monitor") {
      if (!isSuperAdmin) {
        return json(403, { error: "Only super admins can access monitor" });
      }

      // 1. Fetch all instances from Evolution API
      let allInstances: any[] = [];
      try {
        const res = await evolutionRequest("/instance/fetchInstances", { method: "GET" });
        allInstances = Array.isArray(res) ? res : [];
      } catch (err: any) {
        return json(200, {
          success: true,
          evolutionOnline: false,
          error: err?.message || "Could not reach Evolution API",
          instances: [],
          summary: { total: 0, connected: 0, disconnected: 0, estimatedRamMb: 0 },
        });
      }

      // 2. Map instance names back to users
      const instanceNames = allInstances.map((i: any) => i.instance?.instanceName || i.instanceName || "");
      const userIds = instanceNames
        .filter((n: string) => n.startsWith("wa_"))
        .map((n: string) => {
          const hex = n.slice(3);
          if (hex.length === 32) {
            return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
          }
          return null;
        })
        .filter(Boolean);

      // 3. Fetch profiles for those users
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (adminSupabase as any)
          .from("profiles")
          .select("id, full_name, avatar_url, company_id")
          .in("id", userIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = p;
          }
        }
      }

      // 4. Fetch company names
      const companyIds = [...new Set(Object.values(profileMap).map((p: any) => p.company_id).filter(Boolean))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await (adminSupabase as any)
          .from("companies")
          .select("id, name")
          .in("id", companyIds);
        if (companies) {
          for (const c of companies) {
            companyMap[c.id] = c.name;
          }
        }
      }

      // 5. Build instance details
      const RAM_PER_INSTANCE_MB = 150;
      let connectedCount = 0;

      const instances = allInstances.map((inst: any) => {
        const name = inst.instance?.instanceName || inst.instanceName || "";
        const state = String(
          inst.instance?.state || inst.instance?.connectionStatus || inst.state || "unknown"
        ).toLowerCase();
        const isConnected = state === "open";
        if (isConnected) connectedCount++;

        // Reverse map to user
        const hex = name.startsWith("wa_") ? name.slice(3) : "";
        let userId: string | null = null;
        if (hex.length === 32) {
          userId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        }
        const profile = userId ? profileMap[userId] : null;
        const companyName = profile?.company_id ? companyMap[profile.company_id] : null;

        return {
          instanceName: name,
          state,
          connected: isConnected,
          userId,
          userName: profile?.full_name || null,
          avatarUrl: profile?.avatar_url || null,
          companyId: profile?.company_id || null,
          companyName,
        };
      });

      const total = instances.length;
      const disconnected = total - connectedCount;

      return json(200, {
        success: true,
        evolutionOnline: true,
        instances,
        summary: {
          total,
          connected: connectedCount,
          disconnected,
          estimatedRamMb: total * RAM_PER_INSTANCE_MB,
        },
      });
    }

    // ── SET WEBHOOK (ALL): backfill webhook config em todas as instâncias existentes ──
    if (action === "setWebhookAll") {
      if (!isSuperAdmin) {
        return json(403, { error: "Only super admins can backfill webhooks" });
      }
      if (!EVOLUTION_WEBHOOK_SECRET) {
        return json(500, { error: "EVOLUTION_WEBHOOK_SECRET not configured" });
      }

      let all: any[] = [];
      try {
        const res = await evolutionRequest("/instance/fetchInstances", { method: "GET" });
        all = Array.isArray(res) ? res : [];
      } catch (err: any) {
        return json(502, { error: `Failed to list instances: ${err?.message || err}` });
      }

      const results: Array<{ instanceName: string; ok: boolean; error?: string }> = [];
      for (const inst of all) {
        const name = inst.instance?.instanceName || inst.instanceName || inst.name;
        if (!name || !String(name).startsWith("wa_")) continue;
        const r = await ensureWebhook(name);
        results.push({ instanceName: name, ok: r.ok, error: r.error });
      }

      const okCount = results.filter((r) => r.ok).length;
      return json(200, {
        success: true,
        total: results.length,
        configured: okCount,
        failed: results.length - okCount,
        webhookUrl: `${WEBHOOK_RECEIVER_URL}?secret=***`,
        results,
      });
    }

    return json(400, { error: "invalid action" });
  } catch (error: any) {
    console.error("[evolution-whatsapp] error:", error);
    return json(500, {
      error: error?.message || "Internal server error",
      code: "EVOLUTION_PROXY_ERROR",
    });
  }
});
