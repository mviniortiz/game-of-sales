// QUOTE.1 (2026-09-16) — "orçamento que some".
// Decide se uma mensagem ENVIADA pela empresa é um orçamento. Função pura, sem
// I/O: quem chama garante que a mensagem é outbound e fora de grupo.
//
// Regras:
//   - Documento PDF = orçamento (detectedBy 'pdf'), exceto quando o nome do
//     arquivo denuncia outra coisa (boleto, comprovante, recibo, nota fiscal,
//     contrato). O valor vem da legenda, se houver.
//   - Texto ou legenda com valor em reais E palavra-chave de orçamento =
//     orçamento (detectedBy 'text'). Valor sem palavra-chave ("R$ 50 de
//     desconto no pix?") e palavra-chave sem valor ("mando o orçamento
//     amanhã") não contam: são conversa sobre preço, não o orçamento.
//   - amount = maior valor encontrado, lido em pt-BR.

export type QuoteInput = {
    type: string;
    body?: string | null;
    caption?: string | null;
    fileName?: string | null;
    mimetype?: string | null;
};

export type QuoteDetection = {
    isQuote: boolean;
    detectedBy: "pdf" | "text" | null;
    amount: number | null;
};

const KEYWORDS = [
    /\borcamentos?\b/,
    /\bpropostas?\b/,
    /\bvalor total\b/,
    /\binvestimento\b/,
    /\bfica em\b/,
    /\bsai por\b/,
];

// "_" conta como letra pro \b, por isso "nfe" usa borda explícita (NFe_4455.pdf).
const NOT_QUOTE_FILES = /boleto|comprovante|recibo|nota[\s_-]?fiscal|(?:^|[^a-z])nf-?e?(?:[^a-z]|$)|contrato/;

// Ordem importa: milhar com ponto antes do inteiro puro, senão "1.500" vira 1.
const NUM = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const PREFIXED = new RegExp(String.raw`r\$\s*(${NUM})`, "g");
const SUFFIXED = new RegExp(String.raw`(?<![\d.,])(${NUM})\s*reais\b`, "g");

function normalize(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "1.234,56" → 1234.56 · "1500" → 1500 · "1.500" → 1500 · "99,9" → 99.9 */
export function parseBRL(raw: string): number | null {
    let s = raw.trim();
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
        s = s.replace(/\./g, "").replace(",", ".");
    } else {
        s = s.replace(",", ".");
    }
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractAmounts(text: string): number[] {
    const t = normalize(text);
    const out: number[] = [];
    for (const re of [PREFIXED, SUFFIXED]) {
        for (const m of t.matchAll(re)) {
            const v = parseBRL(m[1]);
            if (v !== null) out.push(v);
        }
    }
    return out;
}

function hasKeyword(text: string): boolean {
    const t = normalize(text);
    return KEYWORDS.some((re) => re.test(t));
}

function isPdf(input: QuoteInput): boolean {
    if (input.type !== "document") return false;
    const mime = (input.mimetype || "").toLowerCase();
    const name = (input.fileName || "").toLowerCase();
    return mime.includes("pdf") || name.endsWith(".pdf");
}

export function detectQuote(input: QuoteInput): QuoteDetection {
    const text = [input.body, input.caption].filter((v): v is string => Boolean(v && v.trim())).join("\n");
    const amounts = text ? extractAmounts(text) : [];
    const amount = amounts.length ? Math.max(...amounts) : null;

    if (isPdf(input) && !NOT_QUOTE_FILES.test(normalize(input.fileName || ""))) {
        return { isQuote: true, detectedBy: "pdf", amount };
    }
    if (amount !== null && hasKeyword(text)) {
        return { isQuote: true, detectedBy: "text", amount };
    }
    return { isQuote: false, detectedBy: null, amount: null };
}
