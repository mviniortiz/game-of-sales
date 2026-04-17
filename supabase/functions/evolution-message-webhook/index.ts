import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Receiver do Evolution API (evento messages.upsert).
// Evolution → POST aqui → insere em whatsapp_messages → trigger faz match com deal e cria activity.
// Supabase Realtime notifica a UI via WebSocket (<1s vs 3-15s do polling).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET") || "";

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

type EvolutionPayload = {
  event?: string;
  instance?: string;
  data?: any;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  // Autenticação: secret via query param (?secret=...) ou header x-webhook-secret
  if (EVOLUTION_WEBHOOK_SECRET) {
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
  if (event !== "messages.upsert") {
    // Evolution pode mandar vários eventos no mesmo endpoint; ignoramos outros.
    return json(200, { ok: true, ignored: event || "unknown" });
  }

  const instanceName: string | undefined = payload.instance || payload.data?.instance;
  if (!instanceName) return json(400, { error: "missing instance" });

  const userId = instanceNameToUserId(instanceName);
  if (!userId) {
    return json(200, { ok: true, ignored: "instance_not_mapped", instanceName });
  }

  // `data` pode ser uma única mensagem ou array (Evolution varia com versão)
  const messages: any[] = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.data?.messages)
      ? payload.data.messages
      : [payload.data];

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Busca company_id do usuário uma vez
  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("id, company_id")
    .eq("id", userId)
    .single();

  const companyId: string | null = profile?.company_id || null;

  const inserted: string[] = [];
  const skipped: string[] = [];

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

    // Ignora broadcast/newsletter/status
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

    const body = parseTextFromMessage(msg);
    const meta = detectMessageType(msg);

    // Ignora reaction/protocol sem conteúdo útil
    if ((meta.type === "reaction" || meta.type === "protocol") && !body) {
      skipped.push(meta.type);
      continue;
    }

    const timestampSec = Number(msg.messageTimestamp || msg.timestamp || 0);
    const messageTimestamp = timestampSec
      ? new Date(timestampSec * 1000).toISOString()
      : new Date().toISOString();

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
        direction: fromMe ? "outbound" : "inbound",
        message_type: meta.type,
        body,
        media_url: meta.mediaUrl || null,
        media_mimetype: meta.mimetype || null,
        media_caption: meta.caption || null,
        audio_duration: meta.audioDuration || null,
        message_timestamp: messageTimestamp,
        raw_payload: msg,
      });

    if (insertErr) {
      // 23505 = duplicate (unique violation) — webhook retry
      if ((insertErr as any).code === "23505") {
        skipped.push("duplicate");
      } else {
        console.error("[webhook] insert error:", JSON.stringify(insertErr));
        skipped.push(`db_error:${(insertErr as any).code || "unknown"}:${(insertErr as any).message?.slice(0, 160) || ""}`);
      }
    } else {
      inserted.push(externalId);
    }
  }

  return json(200, { ok: true, inserted: inserted.length, skipped });
});
