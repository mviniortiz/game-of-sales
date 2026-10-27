// PROSPECT.2 — Partes puras da prospecção (sem rede nem banco): textos, códigos e
// horários. Separadas para teste e para não puxar o SDK de IA quem só precisa do texto.
// Nicho novo (vidraçaria em diante) tem o próprio texto em prospectNichos.ts.

import { perfilDoNicho, primeiraMensagemDoNicho, respostaPortaDoNicho } from "./prospectNichos.ts";

const CODE_LETTERS = "ABCDEFGHJKLMNQRSTUVWXYZ";
const CODE_DIGITS = "23456789";

/** Código curto P + letra + dígito (ex.: PK4). Lotes e respostas usam o mesmo formato;
 *  quem resolve procura o código nas duas tabelas. */
export function randomCode(): string {
  const l = CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  const d = CODE_DIGITS[Math.floor(Math.random() * CODE_DIGITS.length)];
  return `P${l}${d}`;
}

export type ProspectVariant = "pergunta" | "numero" | "curta" | "encaminha" | "raiox" | "time" | "aberta";
/** Versões em uso. Até 15/10/2026 a encaminha trouxe pessoa de verdade em 10 de 17 envios,
 *  a curta em 1 de 16 (9 robôs) e a raiox em 1 de 15; ficou só a encaminha. As outras
 *  continuam em firstMessage/readProspectReply para as conversas que já começaram com elas.
 *  Sem "Não é venda": a resposta seguinte mostra a ferramenta, e a frase viraria mentira. */
export const VARIANTS: ProspectVariant[] = ["aberta"];
/** Desde 27/10/2026 (decisão do Markus) só a aberta: em 29 respostas de pessoa às outras
 *  versões, nenhuma confirmou que perde proposta parada. Antes de mostrar produto, ouvir
 *  o que de fato faz a integradora perder venda. A distribuidora segue na encaminha: o
 *  texto dela só existe nessa versão. */

/** Teste de dores até 30/10/2026 (decisão do Markus em 19/10): o formato da encaminha,
 *  que é o que faz pessoa responder, com três assuntos. encaminha = proposta parada,
 *  time = acompanhar as propostas dos vendedores, aberta = pergunta o que mais faz perder
 *  venda, sem mostrar produto. A divisão conta só o que entrou desde TESTE_DORES_DESDE. */
export const TESTE_DORES_DESDE = "2026-10-19T15:30:00Z";
/** A distribuidora para durante o teste: a amostra de cada dor já é pequena. */
export const DISTRIBUIDORA_PAUSADA_ATE = "2026-10-31T03:00:00Z";

/** Distribuidora de kit solar é um teste à parte (decisão de 16/10/2026): a integradora
 *  segue sendo o público do critério de 30/10, e a distribuidora entra como 1 de cada 5
 *  envios, com o mesmo produto visto do lado dela (cotação que o integrador visualiza e
 *  não responde). O segmento fica em prospecting_allowlist.niche. */
export const NICHO_DISTRIBUIDORA = "distribuidora solar";
export const ehDistribuidora = (niche?: string | null) => niche === NICHO_DISTRIBUIDORA;

/** A pergunta que valida ou mata o ICP. Vai no WhatsApp antes de qualquer convite de reunião. */
export const PERGUNTA_DOR =
  "Quando o cliente visualiza a proposta e some, vocês chamam de novo ou deixam pra lá? Quantas ficaram assim no último mês, mais ou menos?";
const PERGUNTA_DOR_DISTRIBUIDORA =
  "Quando o integrador visualiza a cotação e some, vocês chamam de novo ou deixam pra lá? Quantas ficaram assim no último mês, mais ou menos?";

export const RAIO_X_LINK = "https://vyzon.com.br/criar-conta?segmento=energia_solar&utm_source=prospeccao&utm_content=raiox";

/** Linha do rascunho que vira o print da EVA no envio. Fica visível no aviso do grupo,
 *  para o dono saber que a imagem vai junto. A imagem segue o aviso real
 *  (conteudo/prospeccao/eva-retomada.html). */
export const MARCA_IMAGEM = "[imagem]";
export const IMAGEM_RETOMADA = "https://omsdkjzkphflpwnbaeye.supabase.co/storage/v1/object/public/marketing/prospeccao/eva-retomada.png";

/** Resposta a quem só abriu a porta ("pode falar", "é comigo"). Decisão do Markus em
 *  15/10/2026: esta sai sozinha, sem o 👍, porque a conversa morria esperando a
 *  aprovação (Elesan ficou mais de 24h sem resposta). Qualquer outra resposta espera.
 *  Sai AUTO_ENVIO_MS depois da última mensagem deles: costumam mandar "Oi", "tudo bem?"
 *  e "pode falar" em sequência, e só a última conta. */
export const RESPOSTA_PORTA = [
  "Tô montando uma ferramenta pra integradora: quando um orçamento fica 2 dias sem resposta do cliente, ela avisa o dono no WhatsApp já com a mensagem de retomada pronta. Ele aprova e sai do número dele.",
  MARCA_IMAGEM,
  "Vocês fazem algo assim hoje ou fica no braço?",
].join("\n\n");
const RESPOSTA_PORTA_DISTRIBUIDORA = [
  "Tô montando uma ferramenta pra distribuidora: quando uma cotação fica 2 dias sem resposta do integrador, ela avisa o vendedor no WhatsApp já com a mensagem de retomada pronta. Ele aprova e sai do número dele.",
  MARCA_IMAGEM,
  "Vocês fazem algo assim hoje ou fica no braço?",
].join("\n\n");
// Só o que existe: cada vendedor conecta o próprio número (evolution-whatsapp,
// instância por usuário), as propostas de todos caem no placar da empresa
// (get_quote_board) e o aviso vai para o dono do número (quoteTracking). O dono NÃO vê
// de qual vendedor é cada proposta nem lê a conversa do vendedor.
const RESPOSTA_PORTA_TIME = [
  "Tô montando uma ferramenta pra integradora com equipe de venda: cada vendedor conecta o WhatsApp dele, e toda proposta que sai entra numa lista só, que você vê: quanto vale, há quantos dias e se o cliente respondeu. No 2º dia sem resposta, o vendedor recebe a mensagem pronta pra retomar.",
  "Hoje você consegue ver isso ou depende de perguntar pra cada um?",
].join("\n\n");
const RESPOSTA_PORTA_ABERTA =
  "Valeu! Hoje, o que mais te dá dor de cabeça na integradora?";
export const respostaPorta = (niche?: string | null, variant?: string | null) => {
  const perfil = perfilDoNicho(niche);
  if (perfil) return respostaPortaDoNicho(perfil);
  return ehDistribuidora(niche) ? RESPOSTA_PORTA_DISTRIBUIDORA
    : variant === "time" ? RESPOSTA_PORTA_TIME
    : variant === "aberta" ? RESPOSTA_PORTA_ABERTA
    : RESPOSTA_PORTA;
};
/** A resposta padrão já foi nesta conversa? O print marca a da encaminha; as outras
 *  não têm print, então vale o começo do próprio texto. */
export const portaJaFoi = (conversa: string | null | undefined, niche?: string | null, variant?: string | null) => {
  const c = String(conversa || "");
  return c.includes(MARCA_IMAGEM) || c.includes(respostaPorta(niche, variant).slice(0, 60));
};
export const AUTO_ENVIO_MS = 90_000;

type ProspectTarget = {
  agency_name: string | null; city: string | null; rating_count: number | null;
  niche?: string | null;
  /** socio: nome do sócio administrador, do cadastro do CNPJ na Receita. */
  metadata?: { socio?: string | null } | null;
};

/** 0, 1 ou 2, fixo para o mesmo texto. */
function redacao(chave: string): number {
  let h = 0;
  for (const c of chave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 3;
}

/** "PAULO HENRIQUE KEEN CHAVES" vira "Paulo". Nome curto demais ou com número não serve. */
export function primeiroNome(nome?: string | null): string | null {
  const p = String(nome || "").trim().split(/\s+/)[0] || "";
  if (p.length < 3 || /[^A-Za-zÀ-ÿ]/.test(p)) return null;
  return p[0].toUpperCase() + p.slice(1).toLowerCase();
}

/** Primeira mensagem em três versões, para descobrir qual faz o dono responder:
 *  - pergunta: o formato aprovado em 09/10/2026 (quem é, por que eles, pergunta, pedido de 20 min);
 *  - numero: abre com o dado da Greener (22 orçamentos por mês) e pergunta quantos somem;
 *  - curta: uma pergunta só, sem pedir reunião; o convite vem depois que ele responder. */
export function firstMessage(row: ProspectTarget, variant: ProspectVariant = "pergunta", sender = "Markus"): string {
  const nome = row.agency_name || "sua empresa";
  const dono = primeiroNome(row.metadata?.socio);
  // Nicho novo: um formato só (o da encaminha), no vocabulário dele.
  const perfil = perfilDoNicho(row.niche);
  if (perfil) return primeiraMensagemDoNicho(perfil, { nome, dono, redacao: redacao(nome) }, sender);
  if (variant === "numero") {
    return [
      `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis.`,
      "Uma pesquisa da Greener com integradoras mostrou que quem tem mais de dois anos de mercado manda em média 22 orçamentos por mês. Fiquei curioso com a outra metade da conta: quantos desses o cliente visualiza e simplesmente some?",
      `Estou conversando com donos de integradora da região sobre isso. Você toparia me contar como é aí na ${nome}, numa chamada online de 20 minutos? Não é venda.`,
      sender,
    ].join("\n\n");
  }
  // Quem atende primeiro é robô ou atendente: pedir a pessoa certa, com o assunto
  // em uma linha, é o que eles sabem encaminhar. O assunto diz de que lado o Markus está
  // ("propostas que vocês mandam", "ferramenta pra integradora"): sem isso, PG Energy e
  // Envolty leram como cliente reclamando de orçamento sem resposta (15/10/2026).
  // Três redações do mesmo pedido: texto idêntico para todo mundo é marca de disparo
  // em massa, e o chip novo tomou restrição do WhatsApp em 16/10/2026. A redação sai
  // do nome da empresa, então a mesma empresa sempre recebe o mesmo texto.
  if (variant === "encaminha") {
    const i = redacao(nome);
    if (ehDistribuidora(row.niche)) {
      if (dono) return [
        `Oi, ${dono}, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra distribuidora de equipamento solar e queria te fazer uma pergunta rápida sobre as cotações que vocês mandam e o integrador visualiza e não responde. É você que cuida disso na ${nome}?`,
        `Oi, ${dono}, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para distribuidoras de equipamento solar e tenho uma pergunta rápida sobre as cotações que vocês enviam e o integrador visualiza mas não responde. Quem cuida disso na ${nome} é você?`,
        `Oi, ${dono}! Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra distribuidora solar e queria te fazer uma pergunta rápida sobre cotação que o integrador visualiza e deixa sem resposta. Você que cuida disso na ${nome}?`,
      ][i];
      return [
        `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra distribuidora de equipamento solar e queria fazer uma pergunta rápida sobre as cotações que vocês mandam e o integrador visualiza e não responde. Consegue me passar pra quem cuida do comercial na ${nome}?`,
        `Oi, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para distribuidoras de equipamento solar e tenho uma pergunta rápida sobre as cotações que vocês enviam e o integrador visualiza mas não responde. Pode me passar para quem cuida do comercial na ${nome}?`,
        `Olá, tudo certo? Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra distribuidora solar e queria fazer uma pergunta rápida sobre cotação que o integrador visualiza e deixa sem resposta. Quem cuida do comercial aí na ${nome}?`,
      ][i];
    }
    if (dono) return [
      `Oi, ${dono}, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra integradora solar e queria te fazer uma pergunta rápida sobre as propostas que vocês mandam e o cliente visualiza e não responde. É você que cuida disso na ${nome}?`,
      `Oi, ${dono}, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para integradoras de energia solar e tenho uma pergunta rápida sobre os orçamentos que vocês enviam e o cliente visualiza mas não responde. Quem cuida disso na ${nome} é você?`,
      `Oi, ${dono}! Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra integradora solar e queria te fazer uma pergunta rápida sobre proposta que o cliente visualiza e deixa sem resposta. Você que cuida disso na ${nome}?`,
    ][i];
    return [
      `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra integradora solar e queria fazer uma pergunta rápida sobre as propostas que vocês mandam e o cliente visualiza e não responde. Consegue me passar pra quem cuida disso na ${nome}?`,
      `Oi, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para integradoras de energia solar e tenho uma pergunta rápida sobre os orçamentos que vocês enviam e o cliente visualiza mas não responde. Pode me passar para quem cuida disso na ${nome}?`,
      `Olá, tudo certo? Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra integradora solar e queria fazer uma pergunta rápida sobre proposta que o cliente visualiza e deixa sem resposta. Quem cuida disso aí na ${nome}?`,
    ][i];
  }
  if (variant === "time") {
    const i = redacao(nome);
    if (dono) return [
      `Oi, ${dono}, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra integradora solar com equipe de vendas e queria te fazer uma pergunta rápida sobre como você acompanha as propostas que seus vendedores mandam pelo WhatsApp. É você que cuida disso na ${nome}?`,
      `Oi, ${dono}, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para integradoras de energia solar que têm vendedores e tenho uma pergunta rápida sobre como você acompanha as propostas que eles mandam no WhatsApp. Quem cuida disso na ${nome} é você?`,
      `Oi, ${dono}! Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra integradora solar com time de venda e queria te fazer uma pergunta rápida sobre como você acompanha as propostas que os vendedores mandam no WhatsApp. Você que cuida disso na ${nome}?`,
    ][i];
    return [
      `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra integradora solar com equipe de vendas e queria fazer uma pergunta rápida sobre como o dono acompanha as propostas que os vendedores mandam pelo WhatsApp. Consegue me passar pra quem cuida disso na ${nome}?`,
      `Oi, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para integradoras de energia solar que têm vendedores e tenho uma pergunta rápida sobre como o dono acompanha as propostas que eles mandam no WhatsApp. Pode me passar para quem cuida disso na ${nome}?`,
      `Olá, tudo certo? Aqui é o ${sender}, de Floripa. Tô montando uma ferramenta pra integradora solar com time de venda e queria fazer uma pergunta rápida sobre como o dono acompanha as propostas dos vendedores no WhatsApp. Quem cuida disso aí na ${nome}?`,
    ][i];
  }
  // Desde 27/10/2026: pergunta pelo maior problema da integradora, não só de venda
  // (gestão, instalação, equipe). Sem listar áreas: a pessoa diz com as palavras dela.
  if (variant === "aberta") {
    const i = redacao(nome);
    if (dono) return [
      `Oi, ${dono}, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra integradora solar e, antes de terminar, quero entender qual é o maior problema de vocês hoje. Posso te fazer uma pergunta rápida? É você que toca a ${nome}?`,
      `Oi, ${dono}, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para integradoras de energia solar e quero entender, com quem está no dia a dia, qual é hoje o maior problema de uma integradora. Posso te fazer uma pergunta rápida? Você é o responsável pela ${nome}?`,
      `Oi, ${dono}! Aqui é o ${sender}, de Floripa. Tô ouvindo dono de integradora solar pra entender qual é o maior problema hoje, antes de fechar uma ferramenta. Posso te fazer uma pergunta rápida? Você que toca a ${nome}?`,
    ][i];
    return [
      `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis. Tô montando uma ferramenta pra integradora solar e, antes de terminar, quero entender qual é o maior problema de vocês hoje. Consegue me passar pro dono ou pra quem toca a ${nome}?`,
      `Oi, tudo bem? Sou o ${sender}, de Florianópolis. Estou desenvolvendo uma ferramenta para integradoras de energia solar e quero entender qual é hoje o maior problema de uma integradora. Pode me passar para o dono ou responsável pela ${nome}?`,
      `Olá, tudo certo? Aqui é o ${sender}, de Floripa. Tô ouvindo dono de integradora solar pra entender qual é o maior problema hoje, antes de fechar uma ferramenta. Quem é o dono aí na ${nome}?`,
    ][i];
  }
  // Em vez de pedir 20 minutos, oferece ver o próprio número; o link só vai se ele quiser.
  if (variant === "raiox") {
    return `Oi, ${dono ? `${dono}, ` : ""}tudo bem? Aqui é o ${sender}, de Florianópolis. Fiz uma ferramenta que lê o WhatsApp da integradora e acha as propostas que o cliente visualizou e não respondeu. Quer que eu te mande o link pra ver quanto está parado aí na ${nome}? É grátis.`;
  }
  if (variant === "curta") {
    if (dono) return `Oi, ${dono}, tudo bem? Aqui é o ${sender}, de Floripa. Pergunta rápida sobre a ${nome}: quando o cliente visualiza a proposta e some, vocês chamam de novo ou deixam pra lá? Estou entendendo como as integradoras de SC lidam com isso.`;
    return `Oi, tudo bem? Aqui é o ${sender}, de Floripa. Pergunta rápida pra quem cuida do comercial da ${nome}: quando o cliente visualiza a proposta e some, vocês chamam de novo ou deixam pra lá? Estou entendendo como as integradoras de SC lidam com isso.`;
  }
  const aval = row.rating_count || 0;
  const pedestal = aval >= 20
    ? `Vi a ${nome} no Google, com ${aval} avaliações, então imagino que vocês mandem bastante orçamento.`
    : `Vi a ${nome} no Google${row.city ? `, atendendo ${row.city}` : ""}.`;
  return [
    `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis. Estou desenvolvendo uma solução para integradoras de energia solar e, antes de avançar, quero entender como funciona na prática para quem vende todo dia.`,
    pedestal,
    "Minha dúvida é bem específica: o que acontece aí quando o cliente recebe a proposta, visualiza e para de responder?",
    "Você toparia me contar isso numa chamada online de 20 minutos, no dia e horário que for melhor pra você? Não é venda. Se não fizer sentido, é só me avisar.",
    sender,
  ].join("\n\n");
}

/** A variante em teste menos usada até agora, para elas crescerem por igual. */
export function nextVariant(counts: Partial<Record<ProspectVariant, number>>): ProspectVariant {
  return [...VARIANTS].sort((a, b) => (counts[a] || 0) - (counts[b] || 0))[0];
}

/** Milissegundos de "digitando…" antes de mandar o texto. Gente no celular digita uns 3 a
 *  4 caracteres por segundo; o teto de 15 s segura o envio (o servidor espera dentro da
 *  requisição). A variação evita que toda mensagem tenha o mesmo ritmo. */
export function tempoDigitando(texto: string, sorte = Math.random()): number {
  const base = String(texto || "").length * 90;
  return Math.round(Math.min(15000, Math.max(4000, base)) * (0.85 + sorte * 0.3));
}

/** Pausa entre a primeira e a segunda mensagem, como quem relê antes de continuar. */
export function pausaEntreMensagens(sorte = Math.random()): number {
  return Math.round(1500 + sorte * 2500);
}

/** Cada parágrafo (separado por linha em branco) sai como uma mensagem de WhatsApp. */
export function dividirMensagens(texto: string): string[] {
  return String(texto || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

const PERGUNTA_TIME =
  "Hoje você consegue ver as propostas que cada vendedor mandou e quais o cliente não respondeu, ou depende de perguntar pra cada um?";
const PERGUNTA_ABERTA = "Hoje, o que mais te dá dor de cabeça na integradora?";

/** Seguimento do dia 4 para quem não respondeu: a mesma pergunta da dor, sem pedir reunião. */
export function followupMessage(row?: Pick<ProspectTarget, "metadata" | "niche"> & { variant?: string | null }, sender = "Markus"): string {
  const dono = primeiroNome(row?.metadata?.socio);
  const perfil = perfilDoNicho(row?.niche);
  const pergunta = perfil ? perfil.perguntaDor
    : ehDistribuidora(row?.niche) ? PERGUNTA_DOR_DISTRIBUIDORA
    : row?.variant === "time" ? PERGUNTA_TIME
    : row?.variant === "aberta" ? PERGUNTA_ABERTA
    : PERGUNTA_DOR;
  return `Oi${dono ? `, ${dono}` : ""}, tudo bem? Passando só pra não deixar minha mensagem solta. É uma pergunta só: ${pergunta.charAt(0).toLowerCase()}${pergunta.slice(1)} ${sender}`;
}

/** Próximos horários livres do Markus: dias úteis, a partir das 15h, pulando hoje. */
export function nextSlots(now = new Date(), count = 4): string {
  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const feriados = new Set(["2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25"]);
  const out: string[] = [];
  const d = new Date(now.getTime() - 3 * 3600 * 1000); // relógio de Brasília
  for (let i = 1; out.length < count && i < 14; i++) {
    const dia = new Date(d.getTime() + i * 86400000);
    const iso = dia.toISOString().slice(0, 10);
    const wd = dia.getUTCDay();
    if (wd === 0 || wd === 6 || feriados.has(iso)) continue;
    const dd = `${String(dia.getUTCDate()).padStart(2, "0")}/${String(dia.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push(`${nomes[wd]} (${dd}) às 15h`, `${nomes[wd]} (${dd}) às 16h30`);
  }
  return out.slice(0, count).join(", ");
}

export type ProspectCommand = { code: string; intent: "send" | "reject" | "replace"; text?: string }

/** "PA3 1", "PA3 2", "PR4 1", "PR4 Oi Jean, ..." Só reage com código P na frente,
 *  para nunca confundir com anotação pessoal no próprio chat. */
export function parseProspectCommand(raw: string): ProspectCommand | null {
  const m = String(raw || "").trim().match(/^\[?(P[A-Z][2-9])\]?[\s,.:;-]*([\s\S]*)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const rest = m[2].trim();
  const norm = rest.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.!]+$/, "").trim();
  if (["1", "sim", "ok", "envia", "enviar", "pode", "manda"].includes(norm)) return { code, intent: "send" };
  if (["2", "nao", "descarta", "descartar", "cancela", "cancelar"].includes(norm)) return { code, intent: "reject" };
  if (rest.length >= 6) return { code, intent: "replace", text: rest };
  return null;
}

// Número recém-conectado que já sai mandando mensagem para desconhecidos é o
// perfil que o WhatsApp bane. O dia da troca fica só para conversar; depois o
// teto sobe um pouco por dia até o daily_cap da instância.
const RAMPA_CHIP = [0, 3, 5, 8, 10, 12, 15, 18, 20];
const DIAS_AQUECENDO = 14;

const diaBr = (d: Date) => Math.floor((d.getTime() - 3 * 3600 * 1000) / 86400000);

/** Dias úteis desde a troca: o robô não manda no fim de semana, e contar sábado e
 *  domingo pulava a rampa (troca na sexta chegava na segunda já no 3º degrau). */
function diasDoChip(chipDesde: string, agora: Date): number {
  let uteis = 0;
  for (let d = diaBr(new Date(chipDesde)) + 1; d <= diaBr(agora); d++) {
    const semana = (d + 4) % 7; // dia 0 da época foi uma quinta; 0 = domingo
    if (semana !== 0 && semana !== 6) uteis++;
  }
  return uteis;
}

/** Teto de envios frios de hoje (primeiro contato + seguimento). */
export function tetoDoChip(chipDesde: string | null, agora: Date, teto: number): number {
  if (!chipDesde) return teto;
  const dias = Math.max(0, diasDoChip(chipDesde, agora));
  const rampa = dias < RAMPA_CHIP.length
    ? RAMPA_CHIP[dias]
    : RAMPA_CHIP[RAMPA_CHIP.length - 1] + 3 * (dias - RAMPA_CHIP.length + 1);
  return Math.min(teto, rampa);
}

/** O calendário sobe o teto; o sinal decide se ele pode subir. Se as últimas frias
 *  (6 ou mais) não tiveram nenhuma resposta de pessoa, o teto de hoje não passa do que
 *  saiu no último dia com envio: mais volume sem resposta é o padrão que o WhatsApp
 *  restringe. `ultimas` são as últimas frias deste número, com o dia (aaaa-mm-dd). */
export function tetoComSinal(teto: number, ultimas: Array<{ dia: string; pessoa: boolean }>, hoje: string): number {
  if (ultimas.length < 6 || ultimas.some((u) => u.pessoa)) return teto;
  const antes = ultimas.filter((u) => u.dia < hoje);
  if (!antes.length) return teto;
  const ultimoDia = antes.map((u) => u.dia).sort().pop()!;
  return Math.min(teto, antes.filter((u) => u.dia === ultimoDia).length);
}

/** Nas duas primeiras semanas o intervalo entre contatos dobra. */
export function chipAquecendo(chipDesde: string | null, agora: Date): boolean {
  return Boolean(chipDesde) && diaBr(agora) - diaBr(new Date(chipDesde!)) < DIAS_AQUECENDO;
}
