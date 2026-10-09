// PROSPECT.2 — Partes puras da prospecção (sem rede nem banco): textos, códigos e
// horários. Separadas para teste e para não puxar o SDK de IA quem só precisa do texto.

const CODE_LETTERS = "ABCDEFGHJKLMNQRSTUVWXYZ";
const CODE_DIGITS = "23456789";

/** Código curto P + letra + dígito (ex.: PK4). Lotes e respostas usam o mesmo formato;
 *  quem resolve procura o código nas duas tabelas. */
export function randomCode(): string {
  const l = CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  const d = CODE_DIGITS[Math.floor(Math.random() * CODE_DIGITS.length)];
  return `P${l}${d}`;
}

export type ProspectVariant = "pergunta" | "numero" | "curta";
export const VARIANTS: ProspectVariant[] = ["pergunta", "numero", "curta"];

type ProspectTarget = { agency_name: string | null; city: string | null; rating_count: number | null };

/** Primeira mensagem em três versões, para descobrir qual faz o dono responder:
 *  - pergunta: o formato aprovado em 09/10/2026 (quem é, por que eles, pergunta, pedido de 20 min);
 *  - numero: abre com o dado da Greener (22 orçamentos por mês) e pergunta quantos somem;
 *  - curta: uma pergunta só, sem pedir reunião; o convite vem depois que ele responder. */
export function firstMessage(row: ProspectTarget, variant: ProspectVariant = "pergunta", sender = "Markus"): string {
  const nome = row.agency_name || "sua empresa";
  if (variant === "numero") {
    return [
      `Oi, tudo bem? Aqui é o ${sender}, de Florianópolis.`,
      "Uma pesquisa da Greener com integradoras mostrou que quem tem mais de dois anos de mercado manda em média 22 orçamentos por mês. Fiquei curioso com a outra metade da conta: quantos desses o cliente visualiza e simplesmente some?",
      `Estou conversando com donos de integradora da região sobre isso. Você toparia me contar como é aí na ${nome}, numa chamada online de 20 minutos? Não é venda.`,
      sender,
    ].join("\n\n");
  }
  if (variant === "curta") {
    return `Oi, tudo bem? Aqui é o ${sender}, de Floripa. Pergunta rápida pra quem cuida do comercial da ${nome}: quando o cliente visualiza a proposta e some, vocês chamam de novo ou deixam pra lá? Estou entendendo como as integradoras da região lidam com isso.`;
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

/** A variante menos usada até agora, para as três crescerem por igual. */
export function nextVariant(counts: Partial<Record<ProspectVariant, number>>): ProspectVariant {
  return [...VARIANTS].sort((a, b) => (counts[a] || 0) - (counts[b] || 0))[0];
}

export function followupMessage(sender = "Markus"): string {
  return `Oi, tudo bem? Passando só pra não deixar minha mensagem solta. Se em algum momento fizer sentido trocar 20 minutos sobre as propostas que ficam sem resposta, fico à disposição. Se não for o momento, tudo certo também. ${sender}`;
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
