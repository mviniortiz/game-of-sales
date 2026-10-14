// PROSPECT.2 — Prospecção automatizada de integradoras pelo número do dono.
// Tudo que sai para a integradora passa pela aprovação dele no WhatsApp:
//   - lote do dia: "PA3 1" aprova as primeiras mensagens, "PA3 2" recusa;
//   - resposta de cada integradora: "PR4 1" envia o rascunho da EVA, "PR4 2"
//     descarta, "PR4 <texto>" envia a versão dele.
// Códigos começam com P para não colidir com os da aprovação da EVA (letra+dígito).

import { evolutionRequest, normalizeNumber } from "./whatsappApproval.ts";
import { saveNotice } from "./ownerGroups.ts";
import { llmChat } from "./llm.ts";
import { dividirMensagens, firstMessage, nextSlots, parseProspectCommand, pausaEntreMensagens, PERGUNTA_DOR, RAIO_X_LINK, randomCode, tempoDigitando } from "./prospectingText.ts";
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
  variant?: string | null;
};

// Celular brasileiro chega de dois jeitos: com o 9 da frente (55 48 9 9190-0089,
// como a lista guarda) e sem ele (55 48 9190-0089, como o WhatsApp manda o JID).
// A chave é DDD + últimos 8 dígitos, igual nos dois.
export function brKey(raw: string | null | undefined): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10) return d;
  return d.slice(0, 2) + d.slice(-8);
}

/** brKey dos números que têm WhatsApp. Pergunta com e sem o 9 da frente, porque conta
 *  antiga de celular BR ainda responde pelo formato de 8 dígitos. Devolve null quando a
 *  checagem não é confiável (erro, ou nenhum de 5+ números existe), e aí ninguém é
 *  descartado por ela. */
export async function whatsappKeys(instanceName: string, numeros: string[]): Promise<Set<string> | null> {
  const consulta = new Set<string>();
  for (const n of numeros) {
    const d = String(n).replace(/\D/g, "");
    consulta.add(d);
    if (d.length === 13 && d.startsWith("55") && d[4] === "9") consulta.add(d.slice(0, 4) + d.slice(5));
  }
  try {
    const resp = await evolutionRequest(`/chat/whatsappNumbers/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({ numbers: [...consulta] }),
    }, 30000);
    const lista: Array<{ exists?: boolean; number?: string; jid?: string }> = Array.isArray(resp) ? resp : [];
    const existe = new Set(lista.filter((x) => x.exists).map((x) => brKey(x.number || x.jid)));
    if (!lista.length || (numeros.length >= 5 && existe.size === 0)) return null;
    return existe;
  } catch {
    return null;
  }
}

export function prospectNumber(row: Pick<ProspectRow, "phone_e164" | "phone_tail">): string | null {
  return normalizeNumber(row.phone_e164 || row.phone_tail);
}

/** Texto com "digitando…" proporcional ao tamanho, como uma pessoa. */
export async function sendHumanText(instanceName: string, number: string, text: string): Promise<void> {
  await evolutionRequest(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text, delay: tempoDigitando(text), presence: "composing" }),
  }, 40000);
}

/** Rascunho em parágrafos: uma mensagem por parágrafo, com pausa de quem relê entre elas. */
export async function sendHumanMessages(instanceName: string, number: string, text: string): Promise<void> {
  const partes = dividirMensagens(text);
  for (let i = 0; i < partes.length; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, pausaEntreMensagens()));
    await sendHumanText(instanceName, number, partes[i]);
  }
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
  // A versão "raiox" oferece o link do Raio-X grátis em vez da chamada de 20 minutos.
  const ofereceuLink = row.variant === "raiox";
  const system = [
    "Você ajuda o Markus, fundador da Vyzon (Florianópolis), a conversar com donos de integradoras de energia solar.",
    ofereceuLink
      ? "A primeira mensagem do Markus ofereceu o link do Raio-X grátis: uma ferramenta que lê o WhatsApp da integradora e acha as propostas que o cliente visualizou e não respondeu. Objetivo: que o dono ou sócio abra o link. Não fale de preço nem de plano."
      : [
        "Objetivo do Markus: fazer AQUI no WhatsApp a pergunta que valida a dor, e só depois, se a resposta mostrar dor, convidar para 20 minutos online.",
        `A pergunta: "${PERGUNTA_DOR}"`,
        "A primeira mensagem prometeu uma pergunta rápida: trocar por pedido de reunião antes de perguntar quebra a promessa e a conversa morre (medido em 14/10/2026: 4 de 4 sumiram assim).",
        "Não abra pelo produto. Mas nunca diga que não está vendendo nada nem esconda o motivo: o Markus e o time estão montando uma estrutura para recuperar os orçamentos que se perdem no meio das conversas do WhatsApp, e querem saber se o problema é real antes de vender. Use essas palavras quando explicar o motivo. Preço e funcionalidades só se perguntarem.",
      ].join(" "),
    "Classifique a última resposta da integradora e escreva a próxima mensagem do Markus.",
    ofereceuLink
      ? "kind: 'interesse' (quer o link, diz sim, pede para mandar), 'sem_interesse' (recusou), 'automatico' (robô, menu, IA ou mensagem padrão de atendimento), 'duvida' (pergunta quem é, como funciona, ou pede mais detalhe)."
      : "kind: 'interesse' (respondeu a pergunta com algo concreto, inclusive 'já fazemos follow-up' ou 'já temos ferramenta', ou pediu para conversar/horário), 'sem_interesse' (só recusa explícita: 'não tenho interesse', 'não quero'), 'automatico' (robô, menu, IA ou mensagem padrão de atendimento), 'duvida' (pessoa abriu a porta sem responder ainda: 'pode perguntar', 'é comigo', 'o que precisa?', 'oi', ou perguntou quem é/do que se trata).",
    "Regras da mensagem: português do Brasil, curta (até 3 frases no total), sem emoji, sem travessão, sem prometer nada, assina só quando for a primeira frase de apresentação.",
    "Tom: como o Markus digita no WhatsApp com alguém da região, não como atendente. Informal e direto ('pra', 'tá', 'beleza', 'show', 'valeu'), frases curtas, uma ideia por frase, ortografia e acentos certos. Proibido frase de atendimento ou de e-mail: 'Obrigado pelo retorno', 'agradeço o contato', 'fico à disposição', 'Que bom saber', 'perfeitamente', 'gostaria de', 'poderia'. Nada de elogio vazio nem de repetir o que a pessoa disse com outras palavras. No máximo um ponto de exclamação. Quando a pessoa conta um problema ou um número ruim, não reaja com 'show', 'que bom' ou 'beleza': reaja como quem leva a sério ('putz', 'pois é', 'entendi').",
    "Pode dividir em DUAS mensagens, como uma pessoa digitando: uma reação curta e depois a pergunta. Separe as duas com uma linha em branco; cada parágrafo sai como uma mensagem. Nunca mais de duas.",
    ofereceuLink
      ? `- interesse: mande este link exatamente: ${RAIO_X_LINK} . Diga em uma frase que leva uns 3 minutos, que a ferramenta só lê e nada é enviado para os clientes dele.`
      : [
        "- interesse, quando ele diz que já resolve ('fazemos follow-up com todos', 'temos CRM', 'temos uma ferramenta'): não feche a conversa e não convide para reunião ainda. Primeira mensagem: uma reação curta ao que ele disse. Segunda: diga em meia frase que pergunta porque estão montando uma estrutura para recuperar orçamentos que se perdem no meio das conversas, e faça UMA pergunta de como: como controlam (planilha, CRM, alguém lembra de cabeça) e, desses follow-ups, quantos voltam a responder. Se ele já contou como e mesmo assim não mostrou dor, ofereça conferir de graça com o Raio-X se alguma proposta escapou, sem insistir.",
        `- interesse, quando ele mostrou dor ou deu número: agradeça, comente em uma frase o que ele contou (com o número dele) e convide para 20 minutos online com dois horários entre estes: ${freeSlots}, ou ofereça mostrar de graça quanto está parado com o Raio-X.`,
        `- interesse, quando ele só pediu para conversar: proponha dois horários entre estes: ${freeSlots} e diga que manda o link da chamada.`,
        `- interesse, quando ele aceitou ver de graça quanto está parado: mande este link exatamente: ${RAIO_X_LINK} e diga só isto sobre a ferramenta: ela lê as conversas do WhatsApp e acha as propostas que ficaram sem resposta do cliente, com o valor parado; leva uns 3 minutos; ela só lê e nada é enviado aos clientes. Não diga que ela sabe se o cliente abriu a proposta.`,
      ].join("\n"),
    ofereceuLink
      ? "- automatico: peça com educação para falar com o dono ou com quem cuida das propostas, e diga que é para mostrar quanto está parado em proposta sem resposta."
      : "- automatico: peça com educação para falar com quem cuida das propostas e já deixe a pergunta escrita, para a pessoa responder quando ler. Não peça reunião.",
    ofereceuLink
      ? "- duvida: explique em uma frase que é um Raio-X grátis das propostas paradas no WhatsApp, que só lê e não manda nada para cliente, e pergunte se pode mandar o link."
      : "- duvida: faça a pergunta agora, curta e direta. Se perguntaram quem é, por que ele quer saber ou o que ganham com isso: diga com franqueza que é o Markus, de Floripa, e que estão montando uma estrutura para recuperar os orçamentos que se perdem no meio das conversas do WhatsApp, e que quer entender se isso acontece mesmo antes de vender; ofereça em troca mostrar de graça quanto está parado em proposta no WhatsApp deles; feche com uma pergunta curta sobre se isso acontece aí. Não peça reunião.",
    "- sem_interesse: agradeça, deixe a porta aberta e não insista. Se ele disse que já usa uma ferramenta parecida, pergunte numa frase qual é e o que ela ainda não resolve.",
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

/** destino: o grupo de avisos da prospecção (…@g.us) ou, sem grupo, o número do dono.
 *  No chat do dono o aviso leva o prefixo para o webhook reconhecer e ignorar; no grupo
 *  só comando é lido, então o prefixo seria ruído. Devolve o id da mensagem enviada. */
export async function notifyOwner(instanceName: string, destino: string, text: string): Promise<string | null> {
  const noGrupo = destino.endsWith("@g.us");
  const resp = await evolutionRequest(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: destino, text: noGrupo ? text : `${PROSPECT_PREFIX}\n${text}`, delay: 600 }),
  }, 20000);
  return resp?.key?.id || null;
}

/** Aviso que pede decisão. No grupo, o dono decide reagindo ou respondendo o próprio
 *  aviso, sem digitar código; o vínculo aviso→código fica em owner_notices. */
export async function notifyDecision(
  admin: any, args: { instanceName: string; destino: string; userId: string; code: string },
  corpo: string, comoDecidir: { grupo: string; chat: string },
): Promise<void> {
  const noGrupo = args.destino.endsWith("@g.us");
  const id = await notifyOwner(args.instanceName, args.destino, `${corpo}\n\n${noGrupo ? comoDecidir.grupo : comoDecidir.chat}`);
  if (noGrupo && id) await saveNotice(admin, args.userId, id, args.code);
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
  args: { userId: string; instanceName: string; ownerNumber: string; text: string; confirmar?: () => Promise<void> },
): Promise<boolean> {
  const cmd = parseProspectCommand(args.text);
  if (!cmd) return false;
  const avisar = (t: string) => notifyOwner(args.instanceName, args.ownerNumber, t);
  // Deu certo: no grupo vira ✅ na mensagem dele; sem grupo, segue o texto de antes.
  const pronto = (t: string) => (args.confirmar ? args.confirmar() : avisar(t));

  const { data: batch } = await admin.from("prospecting_batches")
    .select("id, contact_ids").eq("user_id", args.userId).eq("code", cmd.code).eq("status", "pendente")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (batch) {
    if (cmd.intent === "send") {
      const { data: ok } = await admin.from("prospecting_allowlist")
        .update({ status: "aprovado", approved_at: new Date().toISOString() })
        .in("id", batch.contact_ids).eq("status", "aguardando_aprovacao").select("id");
      await admin.from("prospecting_batches").update({ status: "aprovado", decided_at: new Date().toISOString() }).eq("id", batch.id);
      await pronto(`Lote ${cmd.code} aprovado: ${ok?.length || 0} abordagens saem hoje, com 2 a 5 minutos entre elas.`);
    } else if (cmd.intent === "reject") {
      await admin.from("prospecting_allowlist").update({ status: "mapeado" })
        .in("id", batch.contact_ids).eq("status", "aguardando_aprovacao");
      await admin.from("prospecting_batches").update({ status: "recusado", decided_at: new Date().toISOString() }).eq("id", batch.id);
      await pronto(`Lote ${cmd.code} recusado. Nada foi enviado.`);
    } else {
      await avisar(`Para o lote ${cmd.code}, responda ${cmd.code} 1 para enviar ou ${cmd.code} 2 para não enviar.`);
    }
    return true;
  }

  const { data: row } = await admin.from("prospecting_allowlist")
    .select("id, agency_name, phone_e164, phone_tail, reply_draft, reply_kind, last_reply")
    .eq("user_id", args.userId).eq("reply_code", cmd.code).maybeSingle();
  if (!row) {
    await avisar(`Isso já foi resolvido ou expirou (${cmd.code}). Nada foi enviado agora.`);
    return true;
  }
  // Quem limpa o código primeiro é quem envia: duas leituras do mesmo comando não
  // mandam a resposta duas vezes para a integradora.
  const { data: tomado } = await admin.from("prospecting_allowlist")
    .update({ reply_code: null }).eq("id", row.id).eq("reply_code", cmd.code).select("id");
  if (!tomado?.length) return true;
  if (cmd.intent === "reject") {
    await admin.from("prospecting_allowlist").update({ reply_draft: null }).eq("id", row.id);
    await pronto(`Ok, não respondi ${row.agency_name}.`);
    return true;
  }
  const texto = cmd.intent === "replace" ? cmd.text! : row.reply_draft;
  const numero = prospectNumber(row);
  if (!texto || !numero) {
    await admin.from("prospecting_allowlist").update({ reply_code: cmd.code }).eq("id", row.id);
    await avisar(`Não consegui enviar para ${row.agency_name}: falta texto ou número.`);
    return true;
  }
  await sendHumanMessages(args.instanceName, numero, texto);
  await admin.from("prospecting_allowlist").update({
    reply_code: null,
    reply_draft: null,
    status: row.reply_kind === "sem_interesse" ? "sem_interesse" : "respondeu",
    last_reply: `${row.last_reply ? row.last_reply + "\n" : ""}Markus: ${texto}`.slice(-3000),
  }).eq("id", row.id);
  await pronto(`Enviado para ${row.agency_name}.`);
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
  // phoneTail aqui já vem da própria lista (o webhook casa pela brKey).
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
    await notifyDecision(admin, { instanceName: args.instanceName, destino: args.ownerNumber, userId: args.userId, code }, [
      `${nome} respondeu:`,
      `"${args.text.slice(0, 600)}"`,
      `Leitura: ${KIND_LABEL[lido.kind]}.`,
      `Sugestão:\n"${lido.draft}"`,
    ].join("\n\n"), {
      grupo: "👍 envia a sugestão · 👎 não responde · ou responda esta mensagem com o seu texto",
      chat: `Responda ${code} 1 para enviar, ${code} 2 para não responder, ou ${code} seguido do seu texto.`,
    });
  }
}
