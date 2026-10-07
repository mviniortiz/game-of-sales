import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ensureConnection,
  extractNumberFromJid,
  importHistoryMessages,
} from "../_shared/whatsappHistory.ts";
import { fillContactNames } from "../_shared/whatsappContacts.ts";

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
  "send", "sendMedia", "sendAudio", "profilePic", "getMedia", "status",
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

// A Whatsmiau manda o arquivo de mídia dentro do próprio webhook (base64), o
// histórico recente no evento messages.set, logo depois que o número conecta, e
// nome/telefone dos contatos em contacts.upsert.
const WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_SET", "CONTACTS_UPSERT"];

function webhookConfig() {
  return {
    enabled: true,
    url: `${WEBHOOK_RECEIVER_URL}?secret=${EVOLUTION_WEBHOOK_SECRET}`,
    base64: true,
    events: WEBHOOK_EVENTS,
  };
}

// A Whatsmiau não devolve pelo webhook o que foi enviado pela própria API
// (a Evolution devolvia). Sem isto a mensagem sai no WhatsApp e não aparece no
// Inbox nem abre rastreio de orçamento. Grava pelo mesmo caminho do webhook;
// se o evento vier depois, o índice único evita duplicar.
async function recordOutbound(instanceName: string, sendRes: any, message: Record<string, unknown>): Promise<void> {
  const id = sendRes?.key?.id;
  const remoteJid = sendRes?.key?.remoteJid;
  if (!id || !remoteJid || !EVOLUTION_WEBHOOK_SECRET) return;
  try {
    await fetch(`${WEBHOOK_RECEIVER_URL}?secret=${EVOLUTION_WEBHOOK_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "messages.upsert",
        instance: instanceName,
        data: {
          key: { remoteJid, fromMe: true, id },
          message,
          messageTimestamp: Number(sendRes?.messageTimestamp) || Math.floor(Date.now() / 1000),
        },
      }),
    });
  } catch (err: any) {
    console.warn("[recordOutbound]", err?.message);
  }
}

async function ensureWebhook(instanceName: string): Promise<{ ok: boolean; error?: string }> {
  if (!EVOLUTION_WEBHOOK_SECRET) {
    return { ok: false, error: "EVOLUTION_WEBHOOK_SECRET not set" };
  }
  try {
    await evolutionRequest(`/webhook/set/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({ webhook: webhookConfig() }),
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

// Anti-ban: sinal REAL de socket preso (sem sonda-fantasma). Um envio do usuário
// que ESTOURA timeout marca send_failed_at; o heartbeat reinicia só quem falhou
// de verdade. O primeiro envio bem-sucedido limpa o sinal. Best-effort: nunca
// quebra o envio.
async function markSendStuck(admin: any, instanceName: string) {
  try {
    await admin.from("channel_connections")
      .update({ send_failed_at: new Date().toISOString() })
      .eq("provider", "evolution").eq("external_id", instanceName);
  } catch { /* noop */ }
}
async function clearSendStuck(admin: any, instanceName: string) {
  try {
    await admin.from("channel_connections")
      .update({ send_failed_at: null })
      .eq("provider", "evolution").eq("external_id", instanceName)
      .not("send_failed_at", "is", null);
  } catch { /* noop */ }
}

function getInstanceName(userId: string) {
  return `wa_${userId.replace(/-/g, "")}`;
}

// Mídia guardada no Storage privado whatsapp-media volta ao front em base64.
function base64FromBytes(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
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

  // Operações leves (status/send/logout) ficam curtas pra não pendurar a UI.
  // Quem depende do celular responder (syncMessages) passa um prazo maior.
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
        const createBody: any = { instanceName, syncFullHistory: true };
        if (EVOLUTION_WEBHOOK_SECRET) createBody.webhook = webhookConfig();
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

    // IMPORT_HISTORY: o histórico recente chega sozinho por messages.set quando
    // o número conecta. Aqui o celular manda mensagens mais antigas de cada
    // conversa já conhecida, a partir da mais antiga gravada.
    if (action === "import_history") {
      const maxChats = Math.max(1, Math.min(Number(body.maxChats || 10), 20));
      const perChat = Math.max(1, Math.min(Number(body.maxMessagesPerChat || 50), 100));
      const deadline = Date.now() + 100_000;

      const connectionId = await ensureConnection(adminSupabase, instanceName, targetCompanyId, effectiveUserId);
      if (!connectionId) {
        return json(500, { error: "Não consegui resolver a conexão para importar" });
      }

      // Nome dos contatos que só aparecem como número, pela agenda do WhatsApp.
      let contactsNamed = 0;
      try {
        const list = await evolutionRequest(`/contact/fetchAll/${instanceName}`, { method: "GET" }, 20000);
        if (Array.isArray(list)) {
          contactsNamed = await fillContactNames(adminSupabase, connectionId, list.map((c: any) => ({
            jid: String(c?.jid || ""),
            name: c?.fullName || c?.firstName || c?.businessName || c?.pushName,
          })));
        }
      } catch (err: any) {
        console.warn(`[import_history] contact/fetchAll: ${String(err?.message || err).slice(0, 120)}`);
      }

      const { data: convs } = await adminSupabase
        .from("channel_conversations")
        .select("id, contact:channel_contacts(external_contact_id, is_group)")
        .eq("connection_id", connectionId)
        .order("last_message_at", { ascending: false })
        .limit(maxChats);

      const fetched: any[] = [];
      let chatsAsked = 0;
      let phoneTimeouts = 0;
      for (const conv of (convs || []) as any[]) {
        if (Date.now() > deadline) break;
        const jid = conv?.contact?.external_contact_id as string | undefined;
        if (!jid || conv?.contact?.is_group) continue;
        const { data: oldest } = await adminSupabase
          .from("channel_messages")
          .select("provider_message_id, direction")
          .eq("conversation_id", conv.id)
          .order("message_timestamp", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!oldest?.provider_message_id) continue;
        chatsAsked++;
        try {
          const page = await evolutionRequest(`/chat/syncMessages/${instanceName}`, {
            method: "POST",
            body: JSON.stringify({
              number: jid,
              id: oldest.provider_message_id,
              fromMe: oldest.direction === "outbound",
              count: perChat,
            }),
          }, 35000);
          if (Array.isArray(page)) fetched.push(...page);
        } catch (err: any) {
          if (Number(err?.status) === 504) phoneTimeouts++;
          console.warn(`[import_history] syncMessages jid_tail=${jid.slice(-6)}: ${String(err?.message || err).slice(0, 120)}`);
        }
      }

      const result = await importHistoryMessages(adminSupabase, {
        instanceName,
        companyId: targetCompanyId,
        userId: effectiveUserId,
        connectionId,
        messages: fetched,
      });
      console.log(`[import_history] instance=${instanceName} asked=${chatsAsked} fetched=${fetched.length} chats=${result.importedChats} msgs=${result.importedMessages} timeouts=${phoneTimeouts} errors=${result.errors}`);

      return json(200, {
        success: true,
        chatsAsked,
        phoneTimeouts,
        contactsNamed,
        ...result,
      });
    }

    if (action === "send") {
      if (!body.chatId) return json(400, { error: "chatId is required" });
      if (!body.text || !String(body.text).trim()) return json(400, { error: "text is required" });

      // For groups (@g.us), send using the full remoteJid.
      // For contacts (@s.whatsapp.net), extract the number.
      const isGroup = String(body.chatId).includes("@g.us");
      const target = isGroup || String(body.chatId).endsWith("@lid") ? body.chatId : extractNumberFromJid(body.chatId);
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
        // Envio OK → socket vivo: limpa qualquer sinal de "preso".
        await clearSendStuck(adminSupabase, instanceName);
        await recordOutbound(instanceName, sendRes, { conversation: String(body.text).trim() });
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[send] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        // Timeout (sem status HTTP) = socket possivelmente preso → marca pro
        // heartbeat reiniciar. Erro COM status = o socket respondeu (vivo), não marca.
        if (!sendErr?.status) await markSendStuck(adminSupabase, instanceName);
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
      const target = isGroup || String(body.chatId).endsWith("@lid") ? body.chatId : extractNumberFromJid(body.chatId);
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
        const mediaKey = isImage ? "imageMessage" : isVideo ? "videoMessage" : "documentMessage";
        await recordOutbound(instanceName, sendRes, {
          [mediaKey]: { mimetype: body.mimetype, caption: body.caption || undefined, fileName: body.fileName || undefined },
          base64: body.mediaBase64,
        });
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
      const target = isGroup || String(body.chatId).endsWith("@lid") ? body.chatId : extractNumberFromJid(body.chatId);
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
        await recordOutbound(instanceName, sendRes, { audioMessage: { mimetype: audioMime }, base64: body.mediaBase64 });
        return json(200, { success: true, instanceName, result: sendRes });
      } catch (sendErr: any) {
        console.error("[sendAudio] error:", sendErr?.message, "status:", sendErr?.status, "payload:", JSON.stringify(sendErr?.payload));
        return json(sendErr?.status || 502, { error: sendErr?.message || "Evolution API error", details: sendErr?.payload });
      }
    }

    if (action === "getMedia") {
      if (!body.messageId) return json(400, { error: "messageId is required" });

      // A mídia é guardada no Storage quando a mensagem chega pelo webhook.
      const { data: row } = await adminSupabase
        .from("channel_messages")
        .select("company_id, media_ref")
        .eq("id", body.messageId)
        .maybeSingle();
      const mediaRef = (row?.media_ref as Record<string, any>) || {};
      const storedPath = (mediaRef.storage_path as string) || null;
      if (!row || row.company_id !== targetCompanyId || !storedPath) {
        return json(404, { error: "Media not found or expired" });
      }
      const { data: file, error: dlErr } = await adminSupabase.storage.from("whatsapp-media").download(storedPath);
      if (dlErr || !file) return json(404, { error: "Media not found or expired" });
      const buf = new Uint8Array(await file.arrayBuffer());
      return json(200, { success: true, base64: base64FromBytes(buf), mimetype: (mediaRef.mimetype as string) || (file as any).type || "application/octet-stream" });
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
