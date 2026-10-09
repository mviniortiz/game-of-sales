// AUTO.1 — Leads que chegam pelo anúncio de conversa no WhatsApp. A cada mensagem
// do lead a EVA relê a conversa inteira, atualiza a qualificação (é integrador?
// quantas propostas? cidade?) e escreve a próxima resposta do dono. Nada sai para
// o lead sem o código do dono: "LK4 1" envia, "LK4 2" descarta, "LK4 <texto>"
// envia o texto dele. Se ele responder o lead direto pelo celular, o rascunho cai.

import { llmChat } from "./llm.ts";
import { brKey, notifyOwner, sendHumanText } from "./prospecting.ts";
import { nextSlots } from "./prospectingText.ts";
import { type AdOrigin, type LeadConfig, parseLeadCommand, randomLeadCode } from "./adLeadsText.ts";
export { detectAdOrigin } from "./adLeadsText.ts";

const STATUS = ["novo", "qualificando", "raio_x_oferecido", "conversa_marcada", "raio_x_feito", "sem_fit", "sem_interesse"];
const STATUS_LABEL: Record<string, string> = {
  novo: "chegou agora",
  qualificando: "ainda entendendo o perfil",
  raio_x_oferecido: "Raio-X oferecido",
  conversa_marcada: "conversa marcada",
  raio_x_feito: "fez o Raio-X",
  sem_fit: "não é integrador",
  sem_interesse: "sem interesse",
};

export async function leadAutomation(admin: any, userId: string): Promise<{ enabled: boolean; config: LeadConfig } | null> {
  const { data } = await admin.from("automations").select("enabled, config")
    .eq("user_id", userId).eq("key", "lead_anuncio").maybeSingle();
  return data ? { enabled: !!data.enabled, config: (data.config || {}) as LeadConfig } : null;
}

/** Números dos leads do anúncio desta instância, pela chave DDD + 8 dígitos.
 *  A trava da prospecção deixa esses passar. */
export async function adLeadKeys(admin: any, userId: string): Promise<Set<string>> {
  const { data } = await admin.from("ad_leads").select("phone_key").eq("user_id", userId);
  return new Set(((data || []) as any[]).map((r) => r.phone_key));
}

type Read = { status: string; is_integrador: boolean | null; propostas_mes: string | null; cidade: string | null; draft: string };

async function readLead(conversa: string, cfg: LeadConfig, nome: string | null): Promise<Read> {
  const system = [
    "Você ajuda o Markus, fundador da Vyzon (Florianópolis), a responder quem chamou no WhatsApp pelo anúncio do Raio-X.",
    "A Vyzon é para integradoras de energia solar que vendem pelo WhatsApp: acompanha cada proposta enviada e avisa quando o cliente para de responder.",
    `Oferta: ${cfg.oferta || "Raio-X grátis das propostas paradas."}`,
    `Link do Raio-X: ${cfg.link || "https://vyzon.com.br/criar-conta?segmento=energia_solar"}`,
    `O que descobrir, uma pergunta por vez e só o que ainda não se sabe: ${(cfg.perguntas || []).join("; ")}.`,
    `Se a pessoa preferir conversar, proponha dois horários entre estes (${cfg.horario_conversa || "dias úteis a partir das 15h"}): ${nextSlots()}.`,
    `Tom: ${cfg.tom || "curto, sem emoji, sem travessão, sem prometer resultado."}`,
    "Regras: até 3 frases; nunca invente preço, resultado ou recurso; o plano custa R$ 497 por mês e só fale disso se perguntarem; se não for integrador (consumidor querendo placa, curioso, vendedor), agradeça e diga com educação que o Raio-X é para integradoras.",
    "Quando já souber que é integrador, ofereça o Raio-X com o link. Se ele disser que já fez ou vai fazer, ofereça ajuda na conversa de 20 minutos.",
    `status: um de ${STATUS.join(", ")}.`,
    'Responda só JSON: {"status": "...", "is_integrador": true|false|null, "propostas_mes": "..."|null, "cidade": "..."|null, "draft": "..."}',
  ].join("\n");
  const user = `${nome ? `Nome no WhatsApp: ${nome}\n` : ""}Conversa até agora (Lead e Markus):\n${conversa}`;
  const res = await llmChat({
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_completion_tokens: 500,
    response_format: { type: "json_object" },
  }, { label: "ad-lead-reply", prefer: "anthropic" });
  if (!res.ok) throw new Error(`IA ${res.status}`);
  const data = await res.json();
  const raw = String(data?.choices?.[0]?.message?.content || "{}").replace(/^```(json)?|```$/g, "").trim();
  const p = JSON.parse(raw);
  const draft = String(p.draft || "").replace(/\s*[—–]\s*/g, ", ").trim();
  if (!draft) throw new Error("IA sem rascunho");
  return {
    status: STATUS.includes(p.status) ? p.status : "qualificando",
    is_integrador: typeof p.is_integrador === "boolean" ? p.is_integrador : null,
    propostas_mes: p.propostas_mes ? String(p.propostas_mes).slice(0, 60) : null,
    cidade: p.cidade ? String(p.cidade).slice(0, 80) : null,
    draft,
  };
}

async function freeCode(admin: any, userId: string): Promise<string> {
  let code = randomLeadCode();
  for (let i = 0; i < 6; i++) {
    const { count } = await admin.from("ad_leads").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("reply_code", code);
    if (!count) break;
    code = randomLeadCode();
  }
  return code;
}

/** Mensagem do lead (nova ou de quem já está na lista). */
export async function onAdLeadInbound(
  admin: any,
  args: {
    userId: string; companyId: string; instanceName: string; ownerNumber: string | null;
    phone: string; name: string | null; text: string; mediaType?: string; ad: AdOrigin | null;
  },
): Promise<void> {
  const auto = await leadAutomation(admin, args.userId);
  if (!auto) return;
  const key = brKey(args.phone);
  const agora = new Date().toISOString();
  const linha = `Lead: ${args.text || `[${args.mediaType || "mídia"}]`}`;

  const { data: existente } = await admin.from("ad_leads").select("*").eq("user_id", args.userId).eq("phone_key", key).maybeSingle();
  let lead = existente;
  if (!lead) {
    const { data: criado, error } = await admin.from("ad_leads").insert({
      company_id: args.companyId, user_id: args.userId, instance_name: args.instanceName,
      phone_e164: args.phone, phone_key: key, contact_name: args.name,
      ad_id: args.ad?.adId || null, ad_headline: args.ad?.headline || null, ctwa_clid: args.ad?.ctwaClid || null,
      conversa: linha, last_inbound_at: agora,
    }).select("*").single();
    if (error) throw error;
    lead = criado;
  } else {
    lead.conversa = `${lead.conversa ? lead.conversa + "\n" : ""}${linha}`.slice(-4000);
    await admin.from("ad_leads").update({ conversa: lead.conversa, last_inbound_at: agora, contact_name: lead.contact_name || args.name }).eq("id", lead.id);
  }

  const nome = lead.contact_name || "Lead do anúncio";
  if (!args.ownerNumber) return;
  if (!auto.enabled) {
    if (!existente) await notifyOwner(args.instanceName, args.ownerNumber, `Novo lead do anúncio: ${nome} (${args.phone}). A automação está desligada, responda direto pelo celular.`);
    return;
  }
  if (!args.text) {
    await notifyOwner(args.instanceName, args.ownerNumber, `${nome}, do anúncio, mandou ${args.mediaType === "audio" ? "um áudio" : "uma mídia"}. Ouça no celular e me diga o que responder.`);
    return;
  }

  const lido = await readLead(lead.conversa, auto.config, lead.contact_name);
  const code = await freeCode(admin, args.userId);
  await admin.from("ad_leads").update({
    status: lido.status,
    is_integrador: lido.is_integrador ?? lead.is_integrador,
    propostas_mes: lido.propostas_mes ?? lead.propostas_mes,
    cidade: lido.cidade ?? lead.cidade,
    reply_draft: lido.draft,
    reply_code: code,
  }).eq("id", lead.id);

  const perfil = [
    lido.is_integrador === true ? "integrador" : lido.is_integrador === false ? "não parece integrador" : null,
    lido.propostas_mes ? `${lido.propostas_mes} propostas/mês` : null,
    lido.cidade,
  ].filter(Boolean).join(", ");
  await notifyOwner(args.instanceName, args.ownerNumber, [
    `[${code}] ${existente ? "" : "Novo lead do anúncio. "}${nome} escreveu:`,
    `"${args.text.slice(0, 600)}"`,
    `Leitura: ${STATUS_LABEL[lido.status]}${perfil ? ` (${perfil})` : ""}.`,
    `Sugestão:\n"${lido.draft}"`,
    `Responda ${code} 1 para enviar, ${code} 2 para não responder, ou ${code} seguido do seu texto.`,
  ].join("\n\n"));
}

/** O dono respondeu o lead direto pelo celular: entra na conversa e o rascunho cai. */
export async function onOwnerMessageToLead(admin: any, userId: string, phone: string, text: string): Promise<void> {
  const { data: lead } = await admin.from("ad_leads").select("id, conversa").eq("user_id", userId).eq("phone_key", brKey(phone)).maybeSingle();
  if (!lead || !text) return;
  // O envio aprovado por código também volta por aqui como mensagem do dono.
  if (String(lead.conversa || "").endsWith(`Markus: ${text}`)) return;
  await admin.from("ad_leads").update({
    conversa: `${lead.conversa ? lead.conversa + "\n" : ""}Markus: ${text}`.slice(-4000),
    reply_code: null, reply_draft: null,
  }).eq("id", lead.id);
}

/** Resolve "LK4 1" etc. no chat do dono. false quando o texto não é desse fluxo. */
export async function handleLeadCommand(
  admin: any,
  args: { userId: string; instanceName: string; ownerNumber: string; text: string },
): Promise<boolean> {
  const cmd = parseLeadCommand(args.text);
  if (!cmd) return false;
  const avisar = (t: string) => notifyOwner(args.instanceName, args.ownerNumber, t);
  const { data: lead } = await admin.from("ad_leads").select("id, contact_name, phone_e164, reply_draft, conversa, status")
    .eq("user_id", args.userId).eq("reply_code", cmd.code).maybeSingle();
  if (!lead) {
    await avisar(`Não achei nada pendente com o código ${cmd.code}.`);
    return true;
  }
  const nome = lead.contact_name || "o lead";
  if (cmd.intent === "reject") {
    await admin.from("ad_leads").update({ reply_code: null, reply_draft: null }).eq("id", lead.id);
    await avisar(`Ok, não respondi ${nome}.`);
    return true;
  }
  const texto = cmd.intent === "replace" ? cmd.text! : lead.reply_draft;
  if (!texto) {
    await avisar(`Não consegui enviar para ${nome}: falta o texto.`);
    return true;
  }
  await sendHumanText(args.instanceName, lead.phone_e164, texto);
  await admin.from("ad_leads").update({
    reply_code: null, reply_draft: null,
    status: lead.status === "novo" ? "qualificando" : lead.status,
    conversa: `${lead.conversa ? lead.conversa + "\n" : ""}Markus: ${texto}`.slice(-4000),
  }).eq("id", lead.id);
  await avisar(`Enviado para ${nome}.`);
  return true;
}
