// Identidade do contato no WhatsApp. A mesma pessoa aparece de dois jeitos:
// pelo telefone (5511…@s.whatsapp.net) nas mensagens ao vivo e pelo LID
// (…@lid, identificador interno do WhatsApp) no histórico. O telefone vence:
// é o que o dono reconhece e o que o rastreio de orçamento cruza. Quando os dois
// aparecem juntos (mensagem ao vivo com remoteLid, evento contacts.upsert), o
// contato do LID vira o do telefone, ou é fundido nele se os dois já existirem.

/** Nome que não é nome: vazio ou só dígitos (o WhatsApp devolve o LID como pushName). */
export function isPlaceholderName(name: string | null | undefined): boolean {
  const n = (name || "").trim();
  return !n || /^\+?\d+$/.test(n);
}

function digits(jid: string): string {
  return jid.split("@")[0].replace(/\D/g, "");
}

async function contactByJid(admin: any, connectionId: string, jid: string) {
  const { data } = await admin
    .from("channel_contacts")
    .select("id, name, metadata")
    .eq("connection_id", connectionId)
    .eq("external_contact_id", jid)
    .maybeSingle();
  return data as { id: string; name: string | null; metadata: Record<string, unknown> | null } | null;
}

/** Junta as conversas do contato `fromId` no contato `toId` e apaga o `fromId`. */
async function mergeContact(admin: any, connectionId: string, fromId: string, toId: string) {
  const { data: fromConvs } = await admin
    .from("channel_conversations")
    .select("id, deal_id, last_message_at, last_inbound_at, last_outbound_at, unread_count")
    .eq("contact_id", fromId);
  const { data: toConv } = await admin
    .from("channel_conversations")
    .select("id, deal_id, last_message_at, last_inbound_at, last_outbound_at, unread_count")
    .eq("connection_id", connectionId)
    .eq("contact_id", toId)
    .maybeSingle();

  for (const fc of (fromConvs || []) as any[]) {
    if (!toConv) {
      await admin.from("channel_conversations").update({ contact_id: toId }).eq("id", fc.id);
      continue;
    }
    // Mesma mensagem pode estar nas duas (histórico e ao vivo): a cópia do LID sai.
    const { data: dupIds } = await admin
      .from("channel_messages")
      .select("provider_message_id")
      .eq("conversation_id", toConv.id);
    const known = new Set(((dupIds || []) as any[]).map((r) => r.provider_message_id));
    const { data: fromMsgs } = await admin
      .from("channel_messages")
      .select("id, provider_message_id")
      .eq("conversation_id", fc.id);
    const toDelete = ((fromMsgs || []) as any[]).filter((m) => known.has(m.provider_message_id)).map((m) => m.id);
    for (let i = 0; i < toDelete.length; i += 200) {
      await admin.from("channel_messages").delete().in("id", toDelete.slice(i, i + 200));
    }
    await admin.from("channel_messages").update({ conversation_id: toConv.id, contact_id: toId }).eq("conversation_id", fc.id);
    for (const table of ["quote_tracking", "eva_replay_moments", "eva_suggestion_feedback", "webhook_logs"]) {
      await admin.from(table).update({ conversation_id: toConv.id }).eq("conversation_id", fc.id);
    }
    const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : new Date(a) > new Date(b) ? a : b);
    await admin.from("channel_conversations").update({
      deal_id: toConv.deal_id || fc.deal_id,
      last_message_at: later(toConv.last_message_at, fc.last_message_at),
      last_inbound_at: later(toConv.last_inbound_at, fc.last_inbound_at),
      last_outbound_at: later(toConv.last_outbound_at, fc.last_outbound_at),
      unread_count: (toConv.unread_count || 0) + (fc.unread_count || 0),
    }).eq("id", toConv.id);
    await admin.from("channel_conversations").delete().eq("id", fc.id);
  }
  await admin.from("quote_tracking").update({ contact_id: toId }).eq("contact_id", fromId);
  await admin.from("channel_messages").update({ contact_id: toId }).eq("contact_id", fromId);
  await admin.from("channel_contacts").delete().eq("id", fromId);
}

/**
 * Liga o LID ao telefone da mesma pessoa. Idempotente: depois da primeira vez,
 * o contato do telefone guarda metadata.lid e o do LID não existe mais.
 */
export async function linkLidToPhone(
  admin: any,
  connectionId: string,
  phoneJid: string,
  lidJid: string,
  name?: string | null,
): Promise<void> {
  if (!phoneJid.endsWith("@s.whatsapp.net") || !lidJid.endsWith("@lid")) return;
  const [byPhone, byLid] = await Promise.all([
    contactByJid(admin, connectionId, phoneJid),
    contactByJid(admin, connectionId, lidJid),
  ]);
  const phone = digits(phoneJid);
  const goodName = name && !isPlaceholderName(name) ? name.trim() : null;

  if (byLid && !byPhone) {
    await admin.from("channel_contacts").update({
      external_contact_id: phoneJid,
      phone_e164: phone,
      phone_tail: phone.slice(-10),
      name: goodName || (isPlaceholderName(byLid.name) ? null : byLid.name),
      metadata: { ...(byLid.metadata || {}), chat_jid: phoneJid, lid: lidJid },
    }).eq("id", byLid.id);
    return;
  }
  if (byPhone) {
    if (byLid) await mergeContact(admin, connectionId, byLid.id, byPhone.id);
    const patch: Record<string, unknown> = {};
    if ((byPhone.metadata as any)?.lid !== lidJid) patch.metadata = { ...(byPhone.metadata || {}), lid: lidJid };
    if (isPlaceholderName(byPhone.name) && (goodName || (byLid && !isPlaceholderName(byLid.name)))) {
      patch.name = goodName || byLid!.name;
    }
    if (Object.keys(patch).length > 0) await admin.from("channel_contacts").update(patch).eq("id", byPhone.id);
  }
}

/** Mapa LID → telefone já conhecido (contatos que guardam metadata.lid). */
export async function knownLidMap(admin: any, connectionId: string, lids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (lids.length === 0) return map;
  for (let i = 0; i < lids.length; i += 200) {
    const { data } = await admin
      .from("channel_contacts")
      .select("external_contact_id, metadata")
      .eq("connection_id", connectionId)
      .in("metadata->>lid", lids.slice(i, i + 200));
    for (const r of (data || []) as any[]) {
      const lid = r?.metadata?.lid;
      if (lid) map.set(lid, r.external_contact_id);
    }
  }
  return map;
}

/**
 * Preenche o nome dos contatos que só têm número, a partir da agenda/pushName
 * que o WhatsApp conhece (lista de contatos da Whatsmiau ou contacts.upsert).
 */
export async function fillContactNames(
  admin: any,
  connectionId: string,
  entries: { jid: string; name: string | null | undefined }[],
): Promise<number> {
  const named = new Map<string, string>();
  for (const e of entries) {
    if (e.jid && e.name && !isPlaceholderName(e.name)) named.set(e.jid, e.name.trim());
  }
  if (named.size === 0) return 0;
  const { data } = await admin
    .from("channel_contacts")
    .select("id, name, external_contact_id, metadata")
    .eq("connection_id", connectionId);
  let updated = 0;
  for (const c of (data || []) as any[]) {
    if (!isPlaceholderName(c.name)) continue;
    const name = named.get(c.external_contact_id) || (c.metadata?.lid ? named.get(c.metadata.lid) : undefined);
    if (!name) continue;
    const { error } = await admin.from("channel_contacts").update({ name }).eq("id", c.id);
    if (!error) updated++;
  }
  return updated;
}
