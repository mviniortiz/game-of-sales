// Nota de encaixe de uma integradora antes da primeira mensagem (0 a 100).
//
// Três perguntas, com o peso que o resultado de 16/10/2026 sustenta (113
// abordagens): a empresa vende de verdade? (Google Maps: avaliações, avaliação
// recente, categoria), o número chega no dono? (celular do CNPJ, sem contador)
// e o perfil bate? (atividade, nome, porte, idade). Um juiz de IA lê as
// evidências e veta quem não vende sistema para cliente final.
// A nota antiga (score 2/3) não previa resposta: nota 3 teve 2 pessoas em 13,
// nota 2 teve 9 em 32.

export const CORTE_ENCAIXE = 50;
// Sem a busca no Google a nota vai até 55. Escala: 40 pontos (perfil completo,
// celular do sócio, sem veto) vira 50, o corte. Decisão de 16/10/2026 enquanto a
// chave da Places API não sai; com a chave, a empresa é requalificada.
const ESCALA_SEM_GOOGLE = 50 / 40;

export type LugarGoogle = {
  achou: boolean;
  nome?: string | null;
  avaliacoes: number;
  estrelas: number | null;
  ultimaAvaliacao: string | null; // ISO
  categoria: string | null;
  site: string | null;
  telefone: string | null;
  fechado: boolean;
};

export type Juiz = { veredito: "sim" | "nao" | "duvida"; motivo: string };

export type Evidencia = {
  nome: string;
  distribuidora?: boolean; // teste à parte: vende kit para integradora (ver prospectingText.ts)
  razao?: string | null;
  cidade?: string | null;
  cnae?: string | null;
  porte?: string | null;
  inicio?: string | null; // aaaammdd
  emailDominio?: string | null;
  socio?: string | null;
  celular?: string | null;
  googleBuscado?: boolean; // false: ainda sem chave da Places API
  google?: LugarGoogle | null;
  juiz?: Juiz | null;
};

export type Nota = { nota: number; motivos: string[]; veto: string | null };

// Atividade principal de quem vende e instala sistema para o dono da casa ou da empresa.
export const CNAE_RAMO: Record<string, string> = {
  "4321500": "instalação elétrica",
  "4742300": "loja de material elétrico",
  "7112000": "engenharia",
  "3321000": "instalação de máquinas e equipamentos",
};

// Atacado onde a distribuidora de kit solar se registra.
export const CNAE_ATACADO: Record<string, string> = {
  "4669999": "atacado de máquinas e equipamentos",
  "4673700": "atacado de material elétrico",
  "4679699": "atacado de materiais de construção",
  "4661300": "atacado de máquinas para agropecuária",
  "4649499": "atacado de outros equipamentos",
  "4689399": "atacado de produtos intermediários",
  "4652400": "atacado de componentes eletrônicos",
  "4651601": "atacado de equipamentos de informática",
};

const SOLAR = /SOLAR|FOTOVOLT|\bSOL\b|\bSUN/i;
const CONTABIL = /contab|contador|escritorio|assessoria|cont\.|\.cnt\b/i;

const dias = (iso: string | null, hoje: Date) =>
  iso ? Math.floor((hoje.getTime() - new Date(iso).getTime()) / 86400000) : null;

export function notaDeEncaixe(e: Evidencia, hoje: Date = new Date()): Nota {
  const itens: Array<{ pontos: number; motivo: string }> = [];
  const add = (pontos: number, motivo: string) => { if (pontos) itens.push({ pontos, motivo }); };

  if (e.google?.fechado) return { nota: 0, motivos: ["Google marca a empresa como fechada"], veto: "fechada no Google" };
  if (e.juiz?.veredito === "nao") return { nota: 0, motivos: [`IA: ${e.juiz.motivo}`], veto: e.juiz.motivo };

  // A empresa vende? (até 45)
  const g = e.google;
  if (g?.achou) {
    add(8, "está no Google Maps");
    const av = g.avaliacoes;
    add(av >= 50 ? 15 : av >= 20 ? 12 : av >= 8 ? 8 : av >= 1 ? 4 : 0, `${av} ${av === 1 ? "avaliação" : "avaliações"} no Google`);
    const d = dias(g.ultimaAvaliacao, hoje);
    if (d !== null) add(d <= 90 ? 15 : d <= 180 ? 8 : d <= 365 ? 3 : 0, `última avaliação há ${d} ${d === 1 ? "dia" : "dias"}`);
    if (g.categoria && /solar|energia|fotovolt/i.test(g.categoria)) add(7, `categoria "${g.categoria}"`);
  }

  // O número chega no dono? (até 15)
  if (e.emailDominio && CONTABIL.test(e.emailDominio)) add(-15, "e-mail do CNPJ é de contabilidade");
  if (e.celular) add(e.socio ? 15 : 8, e.socio ? `celular do CNPJ, fala com ${e.socio.split(" ")[0]}` : "celular do CNPJ");

  // O perfil bate? (até 25)
  const ramo = e.distribuidora ? CNAE_ATACADO : CNAE_RAMO;
  if (e.cnae && ramo[e.cnae]) add(10, `atividade principal: ${ramo[e.cnae]}`);
  if (SOLAR.test(`${e.nome} ${e.razao ?? ""}`)) add(5, "nome de empresa solar");
  // Distribuidora micro costuma ser revenda de um vendedor só, sem fila de cotação.
  if (e.distribuidora ? e.porte === "EPP" || e.porte === "demais" : e.porte === "ME" || e.porte === "EPP") add(5, `porte ${e.porte}`);
  if (e.inicio && /^\d{8}$/.test(e.inicio)) {
    const anos = hoje.getUTCFullYear() - Number(e.inicio.slice(0, 4));
    add(anos >= 2 && anos <= 8 ? 5 : anos > 8 ? 3 : 1, `CNPJ há ${anos} ${anos === 1 ? "ano" : "anos"}`);
  }

  // O juiz de IA (até 15)
  if (e.juiz?.veredito === "sim") add(15, `IA: ${e.juiz.motivo}`);
  if (e.juiz?.veredito === "duvida") add(5, `IA em dúvida: ${e.juiz.motivo}`);

  const bruta = itens.reduce((s, i) => s + i.pontos, 0);
  const semGoogle = e.googleBuscado === false;
  const nota = Math.max(0, Math.min(100, Math.round(semGoogle ? bruta * ESCALA_SEM_GOOGLE : bruta)));
  const motivos = itens.filter((i) => i.pontos > 0).sort((a, b) => b.pontos - a.pontos).map((i) => i.motivo);
  const contra = itens.filter((i) => i.pontos < 0).map((i) => i.motivo);
  return { nota, motivos: [...contra, ...motivos, ...(semGoogle ? ["sem dados do Google ainda"] : [])], veto: null };
}

// ── Casar a empresa da Receita com o lugar certo no Google ─────────────────

const PALAVRA_FRACA = new Set(["energia", "solar", "solares", "eletrica", "engenharia", "ltda", "me", "epp", "sc", "e", "de", "da", "do", "servicos", "solucoes", "comercio"]);
const fold = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (t: string) => new Set(fold(t).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !PALAVRA_FRACA.has(w)));
const brKey = (raw: string | null | undefined) => {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.length < 10 ? d : d.slice(0, 2) + d.slice(-8);
};

export type Candidato = { nome: string; endereco: string; telefone: string | null };

/** Índice do candidato que é a mesma empresa, ou -1. Telefone igual decide;
 *  senão o nome tem de dividir uma palavra forte e o endereço citar a cidade. */
export function escolherLugar(cands: Candidato[], alvo: { nome: string; razao?: string | null; cidade?: string | null; celular?: string | null }): number {
  const meu = brKey(alvo.celular);
  const porTelefone = cands.findIndex((c) => meu && c.telefone && brKey(c.telefone) === meu);
  if (porTelefone >= 0) return porTelefone;
  const fortes = new Set([...tokens(alvo.nome), ...tokens(alvo.razao ?? "")]);
  const cidade = alvo.cidade ? fold(alvo.cidade) : null;
  return cands.findIndex((c) => {
    if (cidade && !fold(c.endereco).includes(cidade)) return false;
    return [...tokens(c.nome)].some((w) => fortes.has(w));
  });
}
