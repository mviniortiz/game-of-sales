// Grupos de WhatsApp só do dono, um por assunto. O aviso que pede decisão vai
// para o grupo do assunto; o dono reage 👍/👎 no aviso ou responde citando, e o
// webhook transforma isso no comando de sempre ("PX9 1", "LK4 2", "A2 1").

import { evolutionRequest } from "./whatsappApproval.ts";

export type OwnerTopic = "prospeccao" | "leads" | "eva";

/** jid do grupo do assunto, ou null quando o dono ainda usa o chat com ele mesmo. */
export async function groupJid(admin: any, instanceName: string, topic: OwnerTopic): Promise<string | null> {
  const { data } = await admin.from("owner_notify_groups").select("jid")
    .eq("instance_name", instanceName).eq("topic", topic).maybeSingle();
  return data?.jid || null;
}

/** jid → assunto, para o webhook reconhecer mensagem dentro de um desses grupos. */
export async function groupTopics(admin: any, instanceName: string): Promise<Map<string, OwnerTopic>> {
  const { data } = await admin.from("owner_notify_groups").select("jid, topic").eq("instance_name", instanceName);
  return new Map((data || []).map((g: any) => [g.jid, g.topic as OwnerTopic]));
}

export async function saveNotice(admin: any, userId: string, noticeId: string, code: string): Promise<void> {
  await admin.from("owner_notices").insert({ notice_id: noticeId, user_id: userId, code });
}

/** Reação ou resposta citando um aviso vira o comando com código.
 *  null: não é decisão sobre aviso conhecido. */
export async function commandFromNotice(
  admin: any, userId: string, noticeId: string, acao: { reacao?: string; texto?: string },
): Promise<string | null> {
  const { data } = await admin.from("owner_notices").select("code")
    .eq("notice_id", noticeId).eq("user_id", userId).maybeSingle();
  if (!data?.code) return null;
  if (acao.reacao !== undefined) {
    if (acao.reacao.startsWith("👍")) return `${data.code} 1`;
    if (acao.reacao.startsWith("👎")) return `${data.code} 2`;
    return null;
  }
  return acao.texto ? `${data.code} ${acao.texto}` : null;
}

/** ✅ na mensagem do dono (ou no aviso que ele aprovou) no lugar de uma confirmação em texto. */
export async function reactOk(instanceName: string, key: { remoteJid: string; id: string }): Promise<void> {
  await evolutionRequest(`/message/sendReaction/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ reaction: "✅", key: { remoteJid: key.remoteJid, id: key.id, fromMe: true } }),
  }, 15000);
}

/** Texto simples no grupo (sem prefixo: no grupo só comando é lido). Devolve o id. */
export async function sendToGroup(instanceName: string, jid: string, text: string): Promise<string | null> {
  const resp = await evolutionRequest(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: jid, text, delay: 600 }),
  }, 20000);
  return resp?.key?.id || null;
}
