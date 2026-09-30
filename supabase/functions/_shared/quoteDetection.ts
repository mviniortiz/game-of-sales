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

type FoundAmount = { value: number; start: number; end: number };

/** Recebe texto já normalizado. Valores em ordem de aparição. */
function findAmounts(t: string): FoundAmount[] {
    const out: FoundAmount[] = [];
    for (const re of [PREFIXED, SUFFIXED]) {
        for (const m of t.matchAll(re)) {
            const v = parseBRL(m[1]);
            if (v !== null) out.push({ value: v, start: m.index!, end: m.index! + m[0].length });
        }
    }
    return out.sort((a, b) => a.start - b.start);
}

export function extractAmounts(text: string): number[] {
    return findAmounts(normalize(text)).map((a) => a.value);
}

// Rótulos que dizem o que é cada valor de uma proposta. Peso > 0 = candidato a
// preço (quanto maior, mais certeiro); < 0 = número que aparece na proposta mas
// não é o preço. Proposta solar é o caso difícil: traz conta de luz, economia
// mensal, economia em 25 anos, parcela e VPL ao lado do investimento.
const LABELS: Array<[string, number]> = [
    [String.raw`valor total|investimento total|total do investimento|valor do investimento|total geral|valor final|total a pagar|preco total|preco final|valor do (?:sistema|projeto|kit)|valor da proposta|valor global|preco do sistema`, 3],
    [String.raw`investimento|total|a vista|preco`, 2],
    [String.raw`orcamento|proposta|sai por|fica em`, 1],
    [String.raw`economi\w*|conta|fatura|parcela\w*|mensa\w*|por mes|ao mes|anua\w*|ao ano|por ano|anos|retorno|payback|lucro|vpl|tir|tarifa|kwh|kwp|wp|custo atual|gasto\w*|media|entrada|desconto|financ\w*|juros|sinal|subtotal|frete|mao de obra`, -1],
];
const LABEL_RE = new RegExp(LABELS.map(([src]) => `\\b(?:${src})\\b`).join("|"), "g");
function labelWeight(label: string): number {
    for (const [src, w] of LABELS) if (new RegExp(`^(?:${src})$`).test(label)) return w;
    return 0;
}
const INSTALLMENT_BEFORE = /\d+\s*x\s*(?:de\s*)?$/;
const PER_UNIT_AFTER = /^\s*(?:\/\s*|por\s+|ao\s+|a\s+)(?:mes|ano|kwh|kwp|wp)\b|^\s*mensa/;
const WINDOW = 60;

function lastLabelWeight(s: string): number | null {
    const all = [...s.matchAll(LABEL_RE)];
    return all.length ? labelWeight(all[all.length - 1][0]) : null;
}

/**
 * Preço total de uma proposta a partir do texto do PDF (quebras de linha do
 * pdf.js preservadas). Rótulo na MESMA linha, antes do valor, decide sozinho
 * ("Valor total do sistema R$ 23.900"). Valor sozinho na linha pode ter o
 * rótulo em cima ou embaixo, e o texto não diz qual: se o de cima e o de baixo
 * discordam (um é preço, o outro é economia), é ambíguo e o valor fica de fora.
 * Nunca atravessa outro valor, senão o rótulo do vizinho contamina. Entre os
 * candidatos do melhor peso, fica o maior. Sem candidato claro: null, porque
 * valor errado no placar é pior que "valor não identificado".
 */
export function pickProposalAmount(text: string): number | null {
    const t = normalize(text).replace(/[^\S\n]+/g, " ").replace(/ ?\n[\s]*/g, "\n");
    const amounts = findAmounts(t);
    let best: { weight: number; value: number } | null = null;

    for (const [i, a] of amounts.entries()) {
        const prevEnd = i > 0 ? amounts[i - 1].end : 0;
        const nextStart = i < amounts.length - 1 ? amounts[i + 1].start : t.length;
        const before = t.slice(Math.max(prevEnd, a.start - WINDOW), a.start);
        const after = t.slice(a.end, Math.min(nextStart, a.end + WINDOW));

        let weight: number;
        if (INSTALLMENT_BEFORE.test(before) || PER_UNIT_AFTER.test(after)) {
            weight = -1;
        } else {
            const sameLine = lastLabelWeight(before.slice(before.lastIndexOf("\n") + 1));
            if (sameLine !== null) {
                weight = sameLine;
            } else {
                const above = lastLabelWeight(before);
                const belowMatch = after.match(LABEL_RE)?.[0];
                const below = belowMatch ? labelWeight(belowMatch) : null;
                if (above !== null && below !== null) {
                    weight = Math.sign(above) === Math.sign(below) ? Math.max(above, below) : 0;
                } else {
                    weight = above ?? below ?? 0;
                }
            }
        }
        if (weight <= 0) continue;
        if (!best || weight > best.weight || (weight === best.weight && a.value > best.value)) {
            best = { weight, value: a.value };
        }
    }
    return best?.value ?? null;
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
