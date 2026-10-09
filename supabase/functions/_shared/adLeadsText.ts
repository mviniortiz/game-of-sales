// AUTO.1 — Partes puras dos leads do anúncio (sem rede nem banco), separadas para teste.

export type AdOrigin = { adId: string | null; headline: string | null; ctwaClid: string | null };

function findContextInfo(node: any, depth = 0): any | null {
  if (!node || typeof node !== "object" || depth > 4) return null;
  if (node.contextInfo && typeof node.contextInfo === "object") return node.contextInfo;
  for (const v of Object.values(node)) {
    const found = findContextInfo(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Mensagem que nasceu de um anúncio de conversa no WhatsApp. O WhatsApp marca o
 *  contextInfo com a origem do anúncio; link comum com preview também traz
 *  externalAdReply, por isso só vale com uma das marcas de anúncio. A frase já
 *  preenchida no anúncio serve de garantia quando a marca não vem. */
export function detectAdOrigin(msg: any, text: string, prefill?: string | null): AdOrigin | null {
  const ctx = findContextInfo(msg?.message) || findContextInfo(msg) || {};
  const ext = ctx.externalAdReply || {};
  const marcado =
    ctx.conversionSource === "FB_Ads" ||
    /ctwa|ad/i.test(String(ctx.entryPointConversionSource || "")) ||
    ext.sourceType === "ad" ||
    !!ext.ctwaClid || !!ctx.ctwaClid;
  const frase = !!prefill && normalize(text).includes(normalize(prefill));
  if (!marcado && !frase) return null;
  return {
    adId: ext.sourceId ? String(ext.sourceId) : null,
    headline: ext.title ? String(ext.title).slice(0, 200) : null,
    ctwaClid: String(ext.ctwaClid || ctx.ctwaClid || "") || null,
  };
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

const CODE_LETTERS = "ABCDEFGHJKLMNQRSTUVWXYZ";
const CODE_DIGITS = "23456789";

/** Código curto L + letra + dígito (ex.: LK4), separado dos P da prospecção. */
export function randomLeadCode(): string {
  const l = CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  const d = CODE_DIGITS[Math.floor(Math.random() * CODE_DIGITS.length)];
  return `L${l}${d}`;
}

export type LeadCommand = { code: string; intent: "send" | "reject" | "replace"; text?: string };

/** "LK4 1" envia, "LK4 2" descarta, "LK4 <texto>" envia o texto do dono. */
export function parseLeadCommand(raw: string): LeadCommand | null {
  const m = String(raw || "").trim().match(/^(L[A-HJ-NQ-Z][2-9])\b[\s:,.-]*([\s\S]*)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const rest = m[2].trim();
  if (rest === "1") return { code, intent: "send" };
  if (rest === "2") return { code, intent: "reject" };
  if (!rest) return null;
  return { code, intent: "replace", text: rest };
}

export type LeadConfig = {
  prefill?: string;
  oferta?: string;
  link?: string;
  perguntas?: string[];
  horario_conversa?: string;
  tom?: string;
};
