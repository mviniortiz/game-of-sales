// PROSPECT.2 — Prospecção automatizada de integradoras pelo número do dono.
// Tudo que sai para a integradora passa pela aprovação dele no WhatsApp:
//   - lote do dia: "PA3 1" aprova as primeiras mensagens, "PA3 2" recusa;
//   - resposta de cada integradora: "PR4 1" envia o rascunho da EVA, "PR4 2"
//     descarta, "PR4 <texto>" envia a versão dele.
// Códigos começam com P para não colidir com os da aprovação da EVA (letra+dígito).

import { evolutionRequest, normalizeNumber } from "./whatsappApproval.ts";
import { llmChat } from "./llm.ts";
import { firstMessage, nextSlots, parseProspectCommand, randomCode } from "./prospectingText.ts";
export { firstMessage, followupMessage, nextSlots, parseProspectCommand, randomCode } from "./prospectingText.ts";

export const PROSPECT_PREFIX = "PROSPECÇÃO";

export type ProspectRow = {
  id: string;
  company_id: string;
  user_id: string;
  phone_e164: string | null;
  phone_tail: string;
  agency_name: string | null;
  city: string | null;
  rating_count: number | null;
  status: string;
  first_message: string | null;
  followup_message: string | null;
  last_reply: string | null;
  reply_draft: string | null;
  reply_code: string | null;
};

export function prospectNumber(row: Pick<ProspectRow, "phone_e164" | "phone_tail">): string | null {
  return normalizeNumber(row.phone_e164 || row.phone_tail);
}

/** Texto com "digitando…" proporcional ao tamanho, como uma pessoa. */
export async function sendHumanText(instanceName: string, number: string, text: string): Promise<void> {
  const delay = Math.min(9000, Math.max(2500, text.length * 18));
  await evolutionRequest(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text, delay, presence: "composing" }),
  }, 30000);
}

/** Áudio de voz (PTT) a partir de uma URL pública, com "gravando áudio…". */
export async function sendVoiceNote(instanceName: string, number: string, audioUrl: string): Promise<void> {
  await evolutionRequest(`/message/sendWhatsAppAudio/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, audio: audioUrl, delay: 3000, presence: "recording" }),
  }, 30000);
}

export type ReplyRead = { kind: "interesse" | "sem_interesse" | "automatico" | "duvida"; draft: string };

/** A EVA lê a resposta da integradora e escreve a próxima mensagem do Markus. */
export async function readProspectReply(row: ProspectRow, newText: string, freeSlots: string): Promise<ReplyRead> {
  const system = [
    "Você ajuda o Markus, fundador da Vyzon (Florianópolis), a conversar com donos de integradoras de energia solar.",
    "Objetivo do Markus: marcar uma conversa online de 20 minutos com o DONO ou sócio para entender como eles acompanham propostas que o cliente visualiza e não responde. Não é venda; não fale do produto nem de preço.",
    "Classifique a última resposta da integradora e escreva a próxima mensagem do Markus.",
    "kind: 'interesse' (topa conversar ou pergunta horário), 'sem_interesse' (recusou), 'automatico' (robô, menu, IA ou mensagem padrão de atendimento), 'duvida' (pergunta quem é, do que se trata, ou pede mais detalhe).",
    "Regras da mensagem: português do Brasil, tom de conversa, curta (até 3 frases), sem emoji, sem travessão, sem prometer nada, assina só quando for a primeira frase de apresentação.",
    `- interesse: agradeça e proponha dois horários entre estes: ${freeSlots}. Diga que manda o link da chamada.`,
    "- automatico: peça com educação para falar com o dono ou com quem cuida do comercial, e diga que tem horário a partir das 15h.",
    "- duvida: explique em uma frase que está conversando com donos de integradora da região para entender como acompanham as propostas, e repita o convite de 20 minutos.",
    "- sem_interesse: agradeça, deixe a porta aberta e não insista.",
    'Responda só JSON: {"kind": "...", "draft": "..."}',
  ].join("\n");
  const user = [
    `Empresa: ${row.agency_name || "(sem nome)"}${row.city ? `, ${row.city}` : ""}.`,
    `Primeira mensagem do Markus:\n${row.first_message || firstMessage(row)}`,
    row.last_reply ? `Conversa até aqui (integradora):\n${row.last_reply}` : "",
    `Nova resposta da integradora:\n${newText}`,
  ].filter(Boolean).join("\n\n");
  const res = await llmChat({
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_completion_tokens: 400,
    response_format: { type: "json_object" },
  }, { label: "prospect-reply", prefer: "anthropic" });
  if (!res.ok) throw new Error(`IA ${res.status}`);
  const data = await res.json();
  const raw = String(data?.choices?.[0]?.message?.content || "{}").replace(/^```(json)?|```$/g, "").trim();
  const parsed = JSON.parse(raw);
  const kinds = ["interesse", "sem_interesse", "automatico", "duvida"];
  const kind = kinds.includes(parsed.kind) ? parsed.kind : "duvida";
  const draft = String(parsed.draft || "").replace(/\s*[—–]\s*/g, ", ").trim();
  if (!draft) throw new Error("IA sem rascunho");
  return { kind, draft };
}

;

/** Aviso do Vyzon no chat do dono. O prefixo faz o webhook ignorar a própria mensagem. */
export async function notifyOwner(instanceName: string, ownerNumber: string, text: string): Promise<void> {
  await evolutionRequest(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: ownerNumber, text: `${PROSPECT_PREFIX}\n${text}`, delay: 600 }),
  }, 20000);
}

const KIND_LABEL: Record<string, string> = {
  interesse: "quer conversar",
  sem_interesse: "não tem interesse",
  automatico: "atendimento automático",
  duvida: "tem dúvida",
};

/** Resolve "PK4 1" etc. no chat do dono. Devolve false quando o texto não é comando
 *  de prospecção, para o fluxo normal seguir. */
export async function handleProspectCommand(
  admin: any,
  args: { userId: string; instanceName: string; ownerNumber: string; text: string },
): Promise<boolean> {
  const cmd = parseProspectCommand(args.text);
  if (!cmd) return false;
  const avisar = (t: string) => notifyOwner(args.instanceName, args.ownerNumber, t);

  const { data: batch } = await admin.from("prospecting_batches")
    .select("id, contact_ids").eq("user_id", args.userId).eq("code", cmd.code).eq("status", "pendente")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (batch) {
    if (cmd.intent === "send") {
      const { data: ok } = await admin.from("prospecting_allowlist")
        .update({ status: "aprovado", approved_at: new Date().toISOString() })
        .in("id", batch.contact_ids).eq("status", "aguardando_aprovacao").select("id");
      await admin.from("prospecting_batches").update({ status: "aprovado", decided_at: new Date().toISOString() }).eq("id", batch.id);
      await avisar(`Lote ${cmd.code} aprovado: ${ok?.length || 0} abordagens saem hoje, com 2 a 5 minutos entre elas.`);
    } else if (cmd.intent === "reject") {
      await admin.from("prospecting_allowlist").update({ status: "mapeado" })
        .in("id", batch.contact_ids).eq("status", "aguardando_aprovacao");
      await admin.from("prospecting_batches").update({ status: "recusado", decided_at: new Date().toISOString() }).eq("id", batch.id);
      await avisar(`Lote ${cmd.code} recusado. Nada foi enviado.`);
    } else {
      await avisar(`Para o lote ${cmd.code}, responda ${cmd.code} 1 para enviar ou ${cmd.code} 2 para não enviar.`);
    }
    return true;
  }

  const { data: row } = await admin.from("prospecting_allowlist")
    .select("id, agency_name, phone_e164, phone_tail, reply_draft, reply_kind, last_reply")
    .eq("user_id", args.userId).eq("reply_code", cmd.code).maybeSingle();
  if (!row) {
    await avisar(`Não achei nada pendente com o código ${cmd.code}.`);
    return true;
  }
  if (cmd.intent === "reject") {
    await admin.from("prospecting_allowlist").update({ reply_code: null, reply_draft: null }).eq("id", row.id);
    await avisar(`Ok, não respondi ${row.agency_name}.`);
    return true;
  }
  const texto = cmd.intent === "replace" ? cmd.text! : row.reply_draft;
  const numero = prospectNumber(row);
  if (!texto || !numero) {
    await avisar(`Não consegui enviar para ${row.agency_name}: falta texto ou número.`);
    return true;
  }
  await sendHumanText(args.instanceName, numero, texto);
  await admin.from("prospecting_allowlist").update({
    reply_code: null,
    reply_draft: null,
    status: row.reply_kind === "sem_interesse" ? "sem_interesse" : "respondeu",
    last_reply: `${row.last_reply ? row.last_reply + "\n" : ""}Markus: ${texto}`.slice(-3000),
  }).eq("id", row.id);
  await avisar(`Enviado para ${row.agency_name}.`);
  return true;
}

/** Integradora da lista respondeu: a EVA lê, escreve a próxima mensagem e pede
 *  a aprovação do dono. O seguimento do dia 4 é cancelado. */
export async function onProspectInbound(
  admin: any,
  args: { userId: string; instanceName: string; ownerNumber: string | null; phoneTail: string; text: string; mediaType?: string },
): Promise<void> {
  const { data: row } = await admin.from("prospecting_allowlist")
    .select("*").eq("user_id", args.userId).eq("phone_tail", args.phoneTail).eq("is_active", true).maybeSingle();
  if (!row || !["enviado", "respondeu", "conversa_marcada"].includes(row.status)) return;
  const nome = row.agency_name || "Uma integradora";
  const agora = new Date().toISOString();

  if (!args.text) {
    await admin.from("prospecting_allowlist").update({
      status: "respondeu", replied_at: agora, followup_due_at: null,
      last_reply: `${row.last_reply ? row.last_reply + "\n" : ""}Eles: [${args.mediaType || "mídia"}]`.slice(-3000),
    }).eq("id", row.id);
    if (args.ownerNumber) await notifyOwner(args.instanceName, args.ownerNumber, `${nome} respondeu com ${args.mediaType === "audio" ? "um áudio" : "uma mídia"}. Ouça no celular e me diga o que responder.`);
    return;
  }

  const lido = await readProspectReply(row as ProspectRow, args.text, nextSlots());
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const { count } = await admin.from("prospecting_allowlist").select("id", { count: "exact", head: true })
      .eq("user_id", args.userId).eq("reply_code", code);
    if (!count) break;
    code = randomCode();
  }
  await admin.from("prospecting_allowlist").update({
    status: lido.kind === "sem_interesse" ? "sem_interesse" : "respondeu",
    replied_at: agora,
    followup_due_at: null,
    reply_kind: lido.kind,
    reply_draft: lido.draft,
    reply_code: code,
    last_reply: `${row.last_reply ? row.last_reply + "\n" : ""}Eles: ${args.text}`.slice(-3000),
  }).eq("id", row.id);
  if (args.ownerNumber) {
    await notifyOwner(args.instanceName, args.ownerNumber, [
      `[${code}] ${nome} respondeu:`,
      `"${args.text.slice(0, 600)}"`,
      `Leitura: ${KIND_LABEL[lido.kind]}.`,
      `Sugestão:\n"${lido.draft}"`,
      `Responda ${code} 1 para enviar, ${code} 2 para não responder, ou ${code} seguido do seu texto.`,
    ].join("\n\n"));
  }
}
