// PROSPECT.2 — Prospecção automatizada de integradoras pelo número do dono.
// Tudo que sai para a integradora passa pela aprovação dele no WhatsApp:
//   - lote do dia: "PA3 1" aprova as primeiras mensagens, "PA3 2" recusa;
//   - resposta de cada integradora: "PR4 1" envia o rascunho da EVA, "PR4 2"
//     descarta, "PR4 <texto>" envia a versão dele.
// Códigos começam com P para não colidir com os da aprovação da EVA (letra+dígito).

import { evolutionRequest, normalizeNumber } from "./whatsappApproval.ts";
import { saveNotice } from "./ownerGroups.ts";
import { llmChat } from "./llm.ts";
import { PREFIXO_AUDIO } from "./transcribe.ts";
import { AUTO_ENVIO_MS, dividirMensagens, firstMessage, ehDistribuidora, IMAGEM_RETOMADA, MARCA_IMAGEM, nextSlots, parseProspectCommand, pausaEntreMensagens, RAIO_X_LINK, randomCode, respostaPorta, tempoDigitando } from "./prospectingText.ts";
export { firstMessage, followupMessage, nextSlots, parseProspectCommand, randomCode } from "./prospectingText.ts";

export const PROSPECT_PREFIX = "PROSPECÇÃO";

export type ProspectRow = {
  id: string;
  company_id: string;
  user_id: string;
  phone_e164: string | null;
  phone_tail: string;
  agency_name: string | null;
  niche?: string | null;
  city: string | null;
  rating_count: number | null;
  status: string;
  first_message: string | null;
  followup_message: string | null;
  last_reply: string | null;
  reply_draft: string | null;
  reply_code: string | null;
  variant?: string | null;
  metadata?: Record<string, unknown> | null;
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

/** Imagem a partir de uma URL pública, com um "digitando…" curto antes. */
export async function sendImage(instanceName: string, number: string, url: string): Promise<void> {
  await evolutionRequest(`/message/sendMedia/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, mediatype: "image", mimetype: "image/png", media: url, delay: 1500, presence: "composing" }),
  }, 40000);
}

/** Rascunho em parágrafos: uma mensagem por parágrafo, com pausa de quem relê entre elas.
 *  O parágrafo [imagem] sai como o print da EVA. */
export async function sendHumanMessages(instanceName: string, number: string, text: string): Promise<void> {
  const partes = dividirMensagens(text);
  for (let i = 0; i < partes.length; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, pausaEntreMensagens()));
    if (partes[i] === MARCA_IMAGEM) await sendImage(instanceName, number, IMAGEM_RETOMADA);
    else await sendHumanText(instanceName, number, partes[i]);
  }
}

/** Áudio de voz (PTT) a partir de uma URL pública, com "gravando áudio…". */
export async function sendVoiceNote(instanceName: string, number: string, audioUrl: string): Promise<void> {
  await evolutionRequest(`/message/sendWhatsAppAudio/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, audio: audioUrl, delay: 3000, presence: "recording" }),
  }, 30000);
}

export type ReplyRead = { kind: "interesse" | "sem_interesse" | "automatico" | "duvida" | "fora_do_perfil"; draft: string; porta: boolean; quer: boolean };

/** A EVA lê a resposta da integradora e escreve a próxima mensagem do Markus. */
export async function readProspectReply(row: ProspectRow, newText: string, freeSlots: string): Promise<ReplyRead> {
  // A versão "raiox" oferece o link do Raio-X grátis em vez da chamada de 20 minutos.
  const ofereceuLink = row.variant === "raiox";
  const system = [
    "Você ajuda o Markus, fundador da Vyzon (Florianópolis), a conversar com donos de integradoras de energia solar.",
    // Mesmo produto visto do lado da distribuidora: as regras abaixo continuam valendo com outro vocabulário.
    ...(ehDistribuidora(row.niche) ? [
      "ESTA EMPRESA É UMA DISTRIBUIDORA de equipamento solar (vende kits, painéis e inversores para integradoras), não uma integradora. Em todas as regras abaixo, leia 'integradora' como a distribuidora, 'cliente' como o integrador que recebeu a cotação, 'proposta' e 'orçamento' como cotação, e 'o dono' como o dono ou o vendedor. Nos modelos de frase, troque assim: 'Tô montando uma ferramenta pra distribuidora: quando uma cotação fica 2 dias sem resposta do integrador, ela avisa o vendedor no WhatsApp já com a mensagem de retomada pronta. Ele aprova e sai do número dele.' No preço, diga 'as 10 primeiras empresas' em vez de 'as 10 primeiras integradoras'. fora_do_perfil também inclui quem vende direto para o consumidor final (é integradora) e quem só fabrica.",
    ] : []),
    ofereceuLink
      ? "A primeira mensagem do Markus ofereceu o link do Raio-X grátis: uma ferramenta que lê o WhatsApp da integradora e acha as propostas que o cliente visualizou e não respondeu. Objetivo: que o dono ou sócio abra o link. Não fale de preço nem de plano."
      : [
        "Objetivo do Markus: quando a pessoa abrir a porta, mostrar em uma frase e num print o que ele está montando e ouvir se a integradora faz algo assim hoje. Só depois, se aparecer dor ou curiosidade, convidar para 20 minutos online ou oferecer o Raio-X.",
        "Por que mostrar e não perguntar número: perguntar 'quantas propostas ficaram sem resposta' a um desconhecido soa como pedir para confessar que perde venda, e as conversas morreram ou travaram ('Porque eu te falaria isso?'). E quem diz que já resolve costuma ter só o aviso de que o cliente abriu; a diferença é a retomada já escrita (medido em 14/10/2026).",
        "O que é, nestas palavras e sem prometer resultado: a EVA acompanha os orçamentos que a integradora manda no WhatsApp; quando um fica 2 dias sem resposta do cliente, ela avisa o dono no WhatsApp com a mensagem de retomada pronta, ele aprova e ela sai do número dele. Nada sai sem o dono aprovar.",
        `Para mostrar, escreva a linha ${MARCA_IMAGEM} sozinha num parágrafo: ela vira o print de como o aviso chega. Só uma vez por conversa: se a conversa até aqui já tem ${MARCA_IMAGEM}, não mande de novo.`,
        `A primeira mensagem prometeu uma pergunta rápida: não peça reunião antes de a pessoa responder sobre o print. Nunca diga que não está vendendo nada nem esconda o motivo: o Markus e o time estão montando isso e querem saber se o problema é real antes de vender. Preço só se perguntarem, e aí direto, sem enrolar e sem dizer que não tem preço: R$ 197 por mês, tudo liberado, até 10 usuários; as 10 primeiras integradoras pagam R$ 97 por mês nos 3 primeiros meses. Na mesma resposta, ofereça fazer com o Markus o Raio-X grátis de 20 minutos antes de qualquer pagamento, com dois horários entre estes: ${freeSlots}.`,
      ].join(" "),
    `Mal-entendido vem antes de tudo: se a resposta trata o Markus como cliente (pede dados para orçamento, pede desculpa pela demora, diz que vai ver o orçamento dele, acha que ele reclama de outra empresa que sumiu, manda ele para fornecedores), classifique como 'duvida' e desfaça com leveza no primeiro parágrafo: 'Opa, acho que me expliquei mal: não sou cliente.' e diga em uma frase que ele está montando uma ferramenta pra integradora e a pergunta é sobre as propostas que ELES mandam e o cliente visualiza e não responde. Depois siga a regra de 'duvida'. Nunca porta=true nesse caso.`,
    `Texto que começa com ${PREFIXO_AUDIO} veio de áudio e pode ter palavra errada: entenda pelo sentido, não cite a frase dele ao pé da letra e, se algo ficou ambíguo, pergunte em vez de supor.`,
    "Classifique a última resposta da integradora e escreva a próxima mensagem do Markus.",
    ofereceuLink
      ? "kind: 'interesse' (quer o link, diz sim, pede para mandar), 'sem_interesse' (recusou), 'automatico' (robô, menu, IA ou mensagem padrão de atendimento), 'duvida' (pergunta quem é, como funciona, ou pede mais detalhe)."
      : "kind: 'fora_do_perfil' (não é o cliente: só instala para outras empresas, não trabalha mais com solar, número errado ou não é a empresa), 'interesse' (respondeu a pergunta com algo concreto, inclusive 'já fazemos follow-up' ou 'já temos ferramenta', ou pediu para conversar/horário), 'sem_interesse' (só recusa explícita: 'não tenho interesse', 'não quero'), 'automatico' (robô, menu, IA ou mensagem padrão de atendimento), 'duvida' (pessoa abriu a porta sem responder ainda: 'pode perguntar', 'é comigo', 'o que precisa?', 'oi', ou perguntou quem é/do que se trata).",
    "Regras da mensagem: português do Brasil, curta (até 3 frases no total), sem emoji, sem travessão, sem prometer nada, assina só quando for a primeira frase de apresentação.",
    "Tom: como o Markus digita no WhatsApp com alguém da região, não como atendente. Informal e direto ('pra', 'tá', 'beleza', 'show', 'valeu'), frases curtas, uma ideia por frase, ortografia e acentos certos. Proibido frase de atendimento ou de e-mail: 'Obrigado pelo retorno', 'agradeço o contato', 'fico à disposição', 'Que bom saber', 'perfeitamente', 'gostaria de', 'poderia'. Nada de elogio vazio nem de repetir o que a pessoa disse com outras palavras. No máximo um ponto de exclamação. Quando a pessoa conta um problema ou um número ruim, não reaja com 'show', 'que bom' ou 'beleza': reaja como quem leva a sério ('putz', 'pois é', 'entendi').",
    `Pode dividir em DUAS mensagens de texto, como uma pessoa digitando: uma reação curta e depois a pergunta. Separe com uma linha em branco; cada parágrafo sai como uma mensagem. Nunca mais de duas de texto, além do parágrafo ${MARCA_IMAGEM} quando a regra pedir.`,
    ofereceuLink
      ? `- interesse: mande este link exatamente: ${RAIO_X_LINK} . Diga em uma frase que leva uns 3 minutos, que a ferramenta só lê e nada é enviado para os clientes dele.`
      : [
        `- interesse, quando ele diz que já resolve ('fazemos follow-up com todos', 'temos CRM', 'temos uma ferramenta que avisa quando abre'): não feche a conversa e não convide para reunião ainda. Se o print ainda não foi: primeiro parágrafo, uma reação curta ao que ele disse e meia frase do que a EVA faz; segundo, ${MARCA_IMAGEM}; terceiro, UMA pergunta: o de vocês já deixa a mensagem pronta assim ou só avisa? Se o print já foi, pergunte isso sem imagem. Se ele já contou como e mesmo assim não mostrou dor, ofereça conferir de graça com o Raio-X se alguma proposta escapou, sem insistir.`,
        `- interesse, quando ele mostrou dor ou deu número: agradeça, comente em uma frase o que ele contou (com o número dele) e convide para 20 minutos online com dois horários entre estes: ${freeSlots}, ou ofereça mostrar de graça quanto está parado com o Raio-X.`,
        `- interesse, quando ele só pediu para conversar: proponha dois horários entre estes: ${freeSlots} e diga que manda o link da chamada.`,
        `- interesse, quando ele aceitou ver de graça quanto está parado: mande este link exatamente: ${RAIO_X_LINK} e diga só isto sobre a ferramenta: ela lê as conversas do WhatsApp e acha as propostas que ficaram sem resposta do cliente, com o valor parado; leva uns 3 minutos; ela só lê e nada é enviado aos clientes. Não diga que ela sabe se o cliente abriu a proposta.`,
      ].join("\n"),
    ofereceuLink
      ? "- automatico: peça com educação para falar com o dono ou com quem cuida das propostas, e diga que é para mostrar quanto está parado em proposta sem resposta."
      : "- automatico: peça com educação para falar com o dono ou com quem cuida das propostas, dizendo em meia frase que é sobre orçamento que o cliente visualiza e para de responder. Não mande o print nem peça reunião: isso fica para quando uma pessoa responder.",
    ofereceuLink
      ? "- duvida: explique em uma frase que é um Raio-X grátis das propostas paradas no WhatsApp, que só lê e não manda nada para cliente, e pergunte se pode mandar o link."
      : `- duvida ('pode falar', 'é comigo', 'o que precisa?', 'oi', ou perguntou quem é): mostre agora, em três parágrafos. Primeiro: o que estão montando, com o aviso do 2º dia, a mensagem pronta e o envio pelo número dele, adaptando este modelo sem encurtar: 'Tô montando uma ferramenta pra integradora: quando um orçamento fica 2 dias sem resposta do cliente, ela avisa o dono no WhatsApp já com a mensagem de retomada pronta. Ele aprova e sai do número dele.' (se perguntaram quem é, comece por 'Sou o Markus, de Floripa.'). Segundo: ${MARCA_IMAGEM}. Terceiro: só a pergunta 'Vocês fazem algo assim hoje ou fica no braço?' ou uma variação curta dela. Não peça número nem reunião. Se o print já foi e a pessoa ainda não respondeu sobre ele, só repita a pergunta curta.`,
    "- fora_do_perfil: agradeça em uma frase curta e encerre. Não ofereça nada.",
    "- Objeção 'quem visualiza e some não tem interesse' ou 'correr atrás é perder tempo': não discuta nem chame de erro. Concorde em parte em meia frase e faça UMA pergunta: desses que sumiram, algum já voltou depois e fechou com outra empresa? kind: duvida.",
    "- sem_interesse: agradeça, deixe a porta aberta e não insista. Se ele disse que já usa uma ferramenta parecida, pergunte numa frase qual é e o que ela ainda não resolve.",
    "porta: true só quando a nova resposta apenas confirma que é com ela ou manda falar ('pode falar', 'é comigo', 'pode perguntar', 'sou eu', 'o que precisa?'), sem pergunta sobre quem é, sem objeção e sem contar nada. Saudação sozinha ('oi', 'boa tarde') é false.",
    "quer: true só quando a pessoa mostra intenção de usar: pergunta preço, pede pra testar ou ver funcionando, pede o link, ou aceita conversar/marcar horário. Curiosidade ('como funciona?') sozinha é false.",
    'Responda só JSON: {"kind": "...", "porta": false, "quer": false, "draft": "..."}',
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
  const kinds = ["interesse", "sem_interesse", "automatico", "duvida", "fora_do_perfil"];
  const kind = kinds.includes(parsed.kind) ? parsed.kind : "duvida";
  const draft = String(parsed.draft || "").replace(/\s*[—–]\s*/g, ", ").trim();
  if (!draft) throw new Error("IA sem rascunho");
  return { kind, draft, porta: parsed.porta === true, quer: parsed.quer === true };
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
  fora_do_perfil: "não é o cliente (só instala, saiu do solar ou número errado)",
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
      await pronto(`Lote ${cmd.code} aprovado: ${ok?.length || 0} abordagens saem hoje, uma de cada vez, com pausa entre elas.`);
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
    .select("id, agency_name, phone_e164, phone_tail, reply_draft, reply_kind, last_reply, sent_at")
    .eq("user_id", args.userId).eq("reply_code", cmd.code).maybeSingle();
  if (!row) {
    await avisar(`Isso já foi resolvido ou expirou (${cmd.code}). Nada foi enviado agora.`);
    return true;
  }
  const { data: inst } = await admin.from("prospecting_instances").select("chip_desde")
    .eq("user_id", args.userId).maybeSingle();
  if (cmd.intent !== "reject" && inst?.chip_desde && row.sent_at && new Date(row.sent_at) < new Date(inst.chip_desde)) {
    await admin.from("prospecting_allowlist").update({ reply_code: null, reply_draft: null }).eq("id", row.id);
    const texto = cmd.intent === "replace" ? cmd.text : row.reply_draft;
    await avisar(`Não enviei para ${row.agency_name}: essa conversa começou no seu número antigo, e pelo novo eles não sabem quem é. Responda pelo número antigo${texto ? `:\n\n${texto}` : "."}`);
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
  await enviarRascunho(admin, args.instanceName, numero, row, texto);
  await pronto(`Enviado para ${row.agency_name}.`);
  return true;
}

/** Manda o texto (já reivindicado pelo código) e registra na conversa. */
export async function enviarRascunho(
  admin: any, instanceName: string, numero: string,
  row: { id: string; reply_kind: string | null; last_reply: string | null }, texto: string,
): Promise<void> {
  await sendHumanMessages(instanceName, numero, texto);
  await admin.from("prospecting_allowlist").update({
    reply_code: null,
    reply_draft: null,
    status: row.reply_kind === "sem_interesse" ? "sem_interesse" : row.reply_kind === "fora_do_perfil" ? "descartado" : "respondeu",
    last_reply: `${row.last_reply ? row.last_reply + "\n" : ""}Markus: ${texto}`.slice(-3000),
  }).eq("id", row.id);
}

/** Integradora que mostrou intenção vira card em Qualificação no funil do dono,
 *  ligado à conversa para o Inbox mostrar o card. Ação interna: não fala com
 *  ninguém, por isso não pede aprovação. */
export async function cardDoProspect(
  admin: any,
  row: ProspectRow,
  instanceName: string,
  texto: string,
): Promise<string | null> {
  const nome = row.agency_name || (row.phone_e164 ? `+${row.phone_e164}` : "Integradora");
  const socio = (row.metadata?.socio as string | undefined)?.trim();
  const { data: deal, error } = await admin.from("deals").insert({
    title: `${nome} · prospecção`,
    customer_name: socio || nome,
    customer_phone: row.phone_e164,
    account_name: nome,
    stage: "qualification",
    user_id: row.user_id,
    company_id: row.company_id,
    additional_contacts: row.phone_e164 ? [{ phone: row.phone_e164 }] : [],
    lead_source: "prospeccao",
    source: "prospeccao",
    notes: [row.city ? `Cidade: ${row.city}.` : "", `Disse: "${texto.slice(0, 300)}"`].filter(Boolean).join("\n"),
  }).select("id").single();
  if (error || !deal?.id) {
    console.warn(`[prospect] card de ${nome} falhou:`, error?.message);
    return null;
  }
  const { data: conn } = await admin.from("channel_connections").select("id")
    .eq("provider", "evolution").eq("external_id", instanceName).maybeSingle();
  if (conn?.id) {
    const { data: contatos } = await admin.from("channel_contacts").select("id")
      .eq("connection_id", conn.id).eq("phone_tail", brKey(row.phone_e164 || row.phone_tail));
    const ids = (contatos || []).map((c: any) => c.id);
    if (ids.length) {
      await admin.from("channel_conversations").update({ deal_id: deal.id })
        .in("contact_id", ids).is("deal_id", null);
    }
  }
  return deal.id as string;
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
  const code = await codigoLivre(admin, args.userId);
  // Áudio transcrito nunca dispara envio sozinho: a transcrição pode ter errado.
  // Só abriu a porta e ainda não viu o print: a resposta padrão sai sozinha pelo
  // prospect-run (RESPOSTA_PORTA). Mensagem nova antes disso reescreve ou cancela.
  const porta = lido.kind === "duvida" && lido.porta && args.text.length <= 80 && !args.text.startsWith(PREFIXO_AUDIO) &&
    !String(row.last_reply || "").includes(MARCA_IMAGEM);
  const { auto_envio_em: _antigo, ...metadata } = row.metadata || {};
  // Sinal de compra (preço, teste, link, conversa): é o que o painel conta para o
  // critério do nicho de 30/10/2026. Fica a primeira vez, com a frase da pessoa.
  if (lido.quer && !metadata.sinal_compra_em) {
    metadata.sinal_compra_em = agora;
    metadata.sinal_compra_texto = args.text.slice(0, 300);
  }
  let cardNovo = false;
  if ((lido.quer || lido.kind === "interesse") && !metadata.deal_id) {
    const dealId = await cardDoProspect(admin, row as ProspectRow, args.instanceName, args.text);
    if (dealId) {
      metadata.deal_id = dealId;
      cardNovo = true;
    }
  }
  await admin.from("prospecting_allowlist").update({
    status: lido.kind === "sem_interesse" ? "sem_interesse" : lido.kind === "fora_do_perfil" ? "descartado" : "respondeu",
    replied_at: agora,
    followup_due_at: null,
    reply_kind: lido.kind,
    reply_draft: porta ? respostaPorta(row.niche) : lido.draft,
    reply_code: code,
    metadata: porta ? { ...metadata, auto_envio_em: new Date(Date.now() + AUTO_ENVIO_MS).toISOString() } : metadata,
    last_reply: `${row.last_reply ? row.last_reply + "\n" : ""}Eles: ${args.text}`.slice(-3000),
  }).eq("id", row.id);
  if (args.ownerNumber) {
    await notifyDecision(admin, { instanceName: args.instanceName, destino: args.ownerNumber, userId: args.userId, code }, [
      `${nome} respondeu:`,
      `"${args.text.slice(0, 600)}"`,
      porta ? "Abriu a porta. A resposta padrão sai sozinha em uns 2 minutos:" : `Leitura: ${KIND_LABEL[lido.kind]}.`,
      porta ? `"${respostaPorta(row.niche)}"` : `Sugestão:\n"${lido.draft}"`,
      ...(cardNovo ? ["Coloquei no pipeline, em Qualificação."] : []),
    ].join("\n\n"), {
      grupo: porta
        ? "👎 não envia · 👍 envia agora · ou responda esta mensagem com o seu texto"
        : "👍 envia a sugestão · 👎 não responde · ou responda esta mensagem com o seu texto",
      chat: `Responda ${code} 1 para enviar, ${code} 2 para não responder, ou ${code} seguido do seu texto.`,
    });
  }
}

/** Respostas padrão vencidas (RESPOSTA_PORTA): o prospect-run chama a cada rodada.
 *  Quem limpa o código primeiro envia, como no 👍, então nunca sai duas vezes. */
export async function enviarRespostasPorta(admin: any, userId: string, instanceName: string, destino: string): Promise<string[]> {
  const { data: vencidas } = await admin.from("prospecting_allowlist")
    .select("id, agency_name, phone_e164, phone_tail, reply_code, reply_draft, reply_kind, last_reply, metadata")
    .eq("user_id", userId).not("reply_code", "is", null)
    .lte("metadata->>auto_envio_em", new Date().toISOString()).limit(5);
  const enviadas: string[] = [];
  for (const row of vencidas || []) {
    const { data: tomado } = await admin.from("prospecting_allowlist")
      .update({ reply_code: null }).eq("id", row.id).eq("reply_code", row.reply_code).select("id");
    if (!tomado?.length) continue;
    const { auto_envio_em: _feito, ...metadata } = row.metadata || {};
    await admin.from("prospecting_allowlist").update({ metadata }).eq("id", row.id);
    const numero = prospectNumber(row);
    if (!numero || !row.reply_draft) continue;
    await enviarRascunho(admin, instanceName, numero, row, row.reply_draft);
    await notifyOwner(instanceName, destino, `Saiu para ${row.agency_name}: a resposta padrão com o print.`);
    enviadas.push(row.agency_name);
  }
  return enviadas;
}

/** Código curto que nenhuma conversa pendente do dono está usando. */
async function codigoLivre(admin: any, userId: string): Promise<string> {
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const { count } = await admin.from("prospecting_allowlist").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("reply_code", code);
    if (!count) break;
    code = randomCode();
  }
  return code;
}

/** Um lembrete de uma frase para quem parou de responder depois da última mensagem do Markus. */
async function escreverLembrete(row: ProspectRow): Promise<string> {
  const res = await llmChat({
    messages: [
      {
        role: "system",
        content: [
          `Você escreve pelo Markus, fundador da Vyzon (Florianópolis), no WhatsApp de uma ${ehDistribuidora(row.niche) ? "distribuidora de equipamento solar" : "integradora de energia solar"}.`,
          "A empresa parou de responder há um dia, depois da última mensagem do Markus. Escreva UM lembrete de uma frase só, fácil de responder com sim, não ou um número, que retome a última pergunta dele.",
          "No máximo 20 palavras, uma pergunta só. Sem cobrar, sem repetir o que a ferramenta faz, sem oferecer nada novo, sem pedir desculpa, sem emoji, sem travessão. Tom de quem digita no WhatsApp com alguém da região ('pra', 'tá'). Se a última mensagem propôs horário, pergunte se algum dos horários serve.",
          "Nunca pergunte quantas propostas ou cotações, quanto vale ou números do mês: a pergunta de quantidade travou conversas em 14/10/2026. Se a última pergunta do Markus foi de quantidade, troque por uma de sim ou não ('Isso acontece aí ou é raro?').",
          "Responda só o texto do lembrete.",
        ].join("\n"),
      },
      { role: "user", content: `Empresa: ${row.agency_name || "(sem nome)"}.\n\nConversa até aqui:\n${String(row.last_reply).slice(-1500)}` },
    ],
    max_completion_tokens: 120,
  }, { label: "prospect-lembrete", prefer: "anthropic" });
  if (!res.ok) throw new Error(`IA ${res.status}`);
  const data = await res.json();
  const texto = String(data?.choices?.[0]?.message?.content || "").replace(/\s*[—–]\s*/g, ", ").replace(/^"|"$/g, "").trim();
  if (!texto) throw new Error("IA sem lembrete");
  return texto;
}

/** Conversas paradas do lado deles: a última fala é do Markus, faz mais de um dia e nada
 *  espera o dono. A IA escreve um lembrete e o dono decide no grupo, como qualquer
 *  rascunho. Um por conversa e só nas paradas há até 3 dias: cobrar quem sumiu há uma
 *  semana soa como mala direta. O prospect-run chama dentro da janela de envio. */
export async function lembretesDeConversa(
  admin: any, userId: string, instanceName: string, destino: string, chipDesde: string | null = null, maximo = 3,
): Promise<string[]> {
  const agora = Date.now();
  let consulta = admin.from("prospecting_allowlist").select("*")
    .eq("user_id", userId).eq("status", "respondeu").is("reply_code", null)
    .lt("updated_at", new Date(agora - 24 * 3600 * 1000).toISOString())
    .gt("updated_at", new Date(agora - 3 * 24 * 3600 * 1000).toISOString());
  // Conversa aberta pelo número anterior não ganha lembrete do novo: do outro lado
  // ninguém reconhece quem está cobrando.
  if (chipDesde) consulta = consulta.gte("sent_at", chipDesde);
  const { data } = await consulta.order("updated_at", { ascending: false }).limit(30);
  const feitos: string[] = [];
  for (const row of data || []) {
    if (feitos.length >= maximo) break;
    const conversa = String(row.last_reply || "");
    if (row.metadata?.lembrete_em || conversa.lastIndexOf("Markus:") <= conversa.lastIndexOf("Eles:")) continue;
    const lembrete = await escreverLembrete(row as ProspectRow);
    const code = await codigoLivre(admin, userId);
    const { data: marcado } = await admin.from("prospecting_allowlist").update({
      reply_code: code,
      reply_draft: lembrete,
      metadata: { ...(row.metadata || {}), lembrete_em: new Date(agora).toISOString() },
    }).eq("id", row.id).is("reply_code", null).select("id");
    if (!marcado?.length) continue;
    const ultima = conversa.slice(conversa.lastIndexOf("Markus:") + 7).trim().slice(0, 300);
    await notifyDecision(admin, { instanceName, destino, userId, code }, [
      `${row.agency_name || "Uma integradora"} não responde há mais de um dia.`,
      `Sua última mensagem:\n"${ultima}"`,
      `Lembrete sugerido:\n"${lembrete}"`,
    ].join("\n\n"), {
      grupo: "👍 envia o lembrete · 👎 deixa quieto · ou responda esta mensagem com o seu texto",
      chat: `Responda ${code} 1 para enviar, ${code} 2 para não enviar, ou ${code} seguido do seu texto.`,
    });
    feitos.push(row.agency_name);
  }
  return feitos;
}
