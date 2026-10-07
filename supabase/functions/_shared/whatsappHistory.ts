// Importação de histórico do WhatsApp (Whatsmiau) para channel_*.
// Duas portas de entrada usam este módulo: o evento messages.set, que a
// Whatsmiau dispara sozinha quando o número conecta (syncFullHistory), e a
// ação import_history, que pede mensagens mais antigas de conversas já
// conhecidas. Histórico nunca abre rastreio de orçamento nem infla não lidas:
// senão o cron de retomada rascunharia follow-up de conversa de meses atrás.

import { isPlaceholderName, knownLidMap } from "./whatsappContacts.ts";

// Igual à retenção (purge_old_whatsapp_messages): importar mais que isso só
// gasta banco e rede com mensagem que a limpeza apaga em seguida.
export const HISTORY_MAX_AGE_DAYS = 90;

export function extractNumberFromJid(value?: string | null) {
  if (!value) return "";
  return String(value).split("@")[0].replace(/\D/g, "");
}

export function parseTextFromMsg(msg: any): string | null {
  const m = msg?.message;
  if (!m) return msg?.body || msg?.text || null;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  return null;
}

export function detectMsgType(msg: any): { type: string; mimetype?: string; caption?: string; audioDuration?: number; mediaUrl?: string } {
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

export function mapChannelType(internal: string): string {
  switch (internal) {
    case "text": case "image": case "audio": case "video": case "document": case "reaction": case "location": return internal;
    case "sticker": return "image";
    case "contact": return "contacts";
    default: return "unknown";
  }
}

/** Só conversa individual entra no Vyzon (sem grupo, status ou canal). */
export function isIndividualJid(jid: string): boolean {
  if (!jid || jid.includes("@g.us") || jid.includes("@broadcast") || jid.includes("@newsletter")) return false;
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
}

export async function ensureConnection(admin: any, instanceName: string, companyId: string, userId: string): Promise<string | null> {
  const metaPatch: Record<string, unknown> = { instance_name: instanceName, user_id: userId };
  try {
    const { data: existing } = await admin.from("channel_connections").select("id, company_id, metadata").eq("provider", "evolution").eq("external_id", instanceName).maybeSingle();
    // O número pertence a uma empresa só: super admin operando outra empresa
    // não grava histórico dele com o company_id errado.
    if (existing?.id && existing.company_id !== companyId) return null;
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

async function ensureContact(admin: any, connectionId: string, companyId: string, remoteJid: string, name: string | null, chatPhone: string, phoneTail: string): Promise<string | null> {
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

async function ensureConversation(
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

export interface HistoryImportResult {
  importedChats: number;
  importedMessages: number;
  skippedOld: number;
  skippedGroups: number;
  errors: number;
}

/**
 * Grava mensagens de histórico (formato Baileys/Whatsmiau: key, pushName,
 * message, messageTimestamp) agrupadas por conversa. Idempotente pelo índice
 * único (connection_id, provider_message_id).
 */
export async function importHistoryMessages(
  admin: any,
  p: { instanceName: string; companyId: string; userId: string; connectionId: string; messages: any[] },
): Promise<HistoryImportResult> {
  const result: HistoryImportResult = { importedChats: 0, importedMessages: 0, skippedOld: 0, skippedGroups: 0, errors: 0 };
  const cutoffMs = Date.now() - HISTORY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  // Histórico chega pelo LID; se o telefone da pessoa já é conhecido, a
  // mensagem vai para a conversa do telefone.
  const lids = [...new Set(p.messages.map((m: any) => String(m?.key?.remoteJid || "")).filter((j) => j.endsWith("@lid")))];
  const lidToPhone = await knownLidMap(admin, p.connectionId, lids);

  const byChat = new Map<string, any[]>();
  for (const msg of p.messages) {
    const rawJid = String(msg?.key?.remoteJid || "");
    const jid = lidToPhone.get(rawJid) || rawJid;
    if (!msg?.key?.id || !jid) continue;
    if (!isIndividualJid(jid)) { result.skippedGroups++; continue; }
    const tsSec = Number(msg?.messageTimestamp || 0);
    if (!tsSec || tsSec * 1000 < cutoffMs) { result.skippedOld++; continue; }
    const list = byChat.get(jid) || [];
    list.push(msg);
    byChat.set(jid, list);
  }

  for (const [remoteJid, msgs] of byChat) {
    // LID não é telefone: os dígitos dele não servem para ligar nem para cruzar.
    const chatPhone = remoteJid.endsWith("@s.whatsapp.net") ? extractNumberFromJid(remoteJid) : "";
    const phoneTail = chatPhone.slice(-10);
    try {
      const candidates = msgs
        .map((msg: any) => {
          const t = detectMsgType(msg);
          const text = parseTextFromMsg(msg);
          if ((t.type === "reaction" || t.type === "protocol") && !text) return null;
          const fromMe = msg.key.fromMe === true;
          const ts = new Date(Number(msg.messageTimestamp) * 1000).toISOString();
          return { raw: msg, externalId: String(msg.key.id), direction: fromMe ? "outbound" : "inbound", ts, body: text, t };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (candidates.length === 0) continue;

      let maxTs = candidates[0].ts;
      let lastIn: string | null = null;
      let lastOut: string | null = null;
      // Nome do contato só do pushName de mensagem recebida: na enviada, o
      // pushName é o do dono da conta.
      let contactName: string | null = null;
      let contactNameTs = "";
      for (const c of candidates) {
        if (c.ts > maxTs) maxTs = c.ts;
        if (c.direction === "inbound") {
          if (!lastIn || c.ts > lastIn) lastIn = c.ts;
          const pn = c.raw?.pushName ? String(c.raw.pushName).trim() : "";
          if (!isPlaceholderName(pn) && c.ts >= contactNameTs) { contactName = pn; contactNameTs = c.ts; }
        } else if (!lastOut || c.ts > lastOut) {
          lastOut = c.ts;
        }
      }

      const contactId = await ensureContact(admin, p.connectionId, p.companyId, remoteJid, contactName, chatPhone, phoneTail);
      if (!contactId) { result.errors++; continue; }
      const conv = await ensureConversation(admin, p.connectionId, p.companyId, contactId, maxTs, lastIn, lastOut);
      if (!conv.id) { result.errors++; continue; }

      const rows = candidates.map((c) => ({
        company_id: p.companyId,
        connection_id: p.connectionId,
        conversation_id: conv.id,
        contact_id: contactId,
        provider_message_id: c.externalId,
        direction: c.direction,
        message_type: mapChannelType(c.t.type),
        body: c.body,
        media_ref: (c.t.mediaUrl || c.t.mimetype || c.t.caption || c.t.audioDuration)
          ? { url: c.t.mediaUrl || null, mimetype: c.t.mimetype || null, caption: c.t.caption || null, duration: c.t.audioDuration || null }
          : {},
        status: c.direction === "inbound" ? "received" : "sent",
        reply_to_message_id: null,
        sent_by_user_id: c.direction === "outbound" ? p.userId : null,
        message_timestamp: c.ts,
        raw_payload: c.raw,
        raw_payload_redacted: false,
        raw_payload_expires_at: null,
        metadata: { chat_jid: remoteJid, instance_name: p.instanceName, original_type: c.t.type, imported: true },
      }));
      const { data: insertedRows, error: insErr } = await admin
        .from("channel_messages")
        .upsert(rows, { onConflict: "connection_id,provider_message_id", ignoreDuplicates: true })
        .select("id");
      if (insErr) { result.errors++; continue; }
      const imported = (insertedRows || []).length;
      result.importedMessages += imported;
      if (imported > 0) result.importedChats++;

      // Conversa existente: cursores só andam para frente; não mexe em não lidas.
      if (!conv.isNew) {
        const { data: cur } = await admin
          .from("channel_conversations")
          .select("last_message_at, last_inbound_at, last_outbound_at")
          .eq("id", conv.id)
          .maybeSingle();
        const patch: Record<string, unknown> = {};
        if (!cur?.last_message_at || new Date(maxTs) > new Date(cur.last_message_at)) patch.last_message_at = maxTs;
        if (lastIn && (!cur?.last_inbound_at || new Date(lastIn) > new Date(cur.last_inbound_at))) patch.last_inbound_at = lastIn;
        if (lastOut && (!cur?.last_outbound_at || new Date(lastOut) > new Date(cur.last_outbound_at))) patch.last_outbound_at = lastOut;
        if (Object.keys(patch).length > 0) {
          await admin.from("channel_conversations").update(patch).eq("id", conv.id);
        }
      }
    } catch (err: any) {
      result.errors++;
      console.error(`[history] chat error jid_tail=${remoteJid.slice(-6)}: ${String(err?.message || err).slice(0, 120)}`);
    }
  }

  return result;
}
