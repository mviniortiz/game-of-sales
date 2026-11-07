// CONTA.1 (06/11/2026): leitura da conta de luz que o cliente manda no WhatsApp.
//
// Funções puras (sem banco nem rede), para a edge conta-luz-ler e para os
// testes. O modelo devolve JSON; aqui ele é conferido campo a campo e o que
// não passa vira null. Só entram dados de venda: CPF, endereço, unidade
// consumidora e titular nunca são pedidos nem guardados.

export const CONFIANCA_MIN = 0.7;

export type ClasseConta = "residencial" | "comercial" | "rural" | "industrial";

export interface LeituraConta {
    consumo_kwh: number | null;
    valor_reais: number | null;
    distribuidora: string | null;
    cidade: string | null;
    uf: string | null;
    classe: ClasseConta | null;
    mes_referencia: string | null;
    confianca: number;
}

const UFS = new Set([
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const CLASSES: ClasseConta[] = ["residencial", "comercial", "rural", "industrial"];

const CAMPOS = `Campos (null quando não aparecer na conta):
- "e_conta_de_luz": true só se for uma fatura de energia elétrica de distribuidora brasileira.
- "consumo_kwh": consumo em kWh por mês. Prefira a média do histórico de consumo quando a conta mostrar; senão, o consumo do mês faturado.
- "valor_reais": valor total a pagar da fatura, em reais.
- "distribuidora": nome curto da distribuidora (ex.: Celesc, CPFL Paulista, Enel SP, Cemig).
- "cidade" e "uf": cidade e estado da instalação (uf com 2 letras).
- "classe": "residencial", "comercial", "rural" ou "industrial".
- "mes_referencia": mês de referência no formato AAAA-MM.
- "confianca": de 0 a 1, o quanto você tem certeza da leitura como um todo. Foto cortada, borrada ou torta baixa a confiança.
Nunca devolva CPF, CNPJ, endereço, número da unidade consumidora, número do cliente nem nome do titular.
Responda só JSON com esses campos.`;

export const SYSTEM_FOTO = `Você lê a foto de uma conta de luz que um cliente mandou para uma empresa de energia solar.
${CAMPOS}`;

export const SYSTEM_PDF = `Você lê o texto extraído do PDF de uma conta de luz que um cliente mandou para uma empresa de energia solar.
Use só números que aparecem no texto.
${CAMPOS}`;

/** Números do texto em formato brasileiro (1.234,56 / 412,37 / 450). */
export function numerosDoTexto(text: string): number[] {
    const out = new Set<number>();
    for (const m of text.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) {
        const n = Number(m[0].replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n)) out.add(n);
    }
    return [...out];
}

function numero(v: unknown, min: number, max: number): number | null {
    // "1.234,56" é formato brasileiro; "412.37" sem vírgula já é decimal com ponto.
    const n = typeof v === "string" ? Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v) : v;
    if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max) return null;
    return Math.round(n * 100) / 100;
}

function texto(v: unknown, max: number): string | null {
    if (typeof v !== "string") return null;
    const t = v.replace(/\s+/g, " ").trim();
    return t && t.length <= max ? t : null;
}

function noTexto(n: number | null, nums: number[] | null): number | null {
    if (n === null || !nums) return n;
    // A média do histórico pode vir arredondada pelo modelo; aceita 1 kWh ou 1 centavo de folga.
    return nums.some((x) => Math.abs(x - n) <= 1) ? n : null;
}

/**
 * Confere a resposta do modelo. Devolve null quando não é conta de luz, a
 * confiança está abaixo do mínimo ou nenhum dado útil sobrou. Com o texto do
 * PDF, consumo e valor só valem se o número aparecer nele.
 */
export function conferirLeitura(raw: unknown, pdfText?: string): LeituraConta | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (r.e_conta_de_luz !== true) return null;
    const confianca = numero(r.confianca, 0, 1);
    if (confianca === null || confianca < CONFIANCA_MIN) return null;

    const nums = pdfText ? numerosDoTexto(pdfText) : null;
    const uf = typeof r.uf === "string" ? r.uf.trim().toUpperCase() : "";
    const classe = typeof r.classe === "string" ? r.classe.trim().toLowerCase() : "";
    const mes = typeof r.mes_referencia === "string" ? r.mes_referencia.trim() : "";

    const leitura: LeituraConta = {
        consumo_kwh: noTexto(numero(r.consumo_kwh, 1, 200_000), nums),
        valor_reais: noTexto(numero(r.valor_reais, 1, 2_000_000), nums),
        distribuidora: texto(r.distribuidora, 60),
        cidade: texto(r.cidade, 80),
        uf: UFS.has(uf) ? uf : null,
        classe: (CLASSES as string[]).includes(classe) ? (classe as ClasseConta) : null,
        mes_referencia: /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : null,
        confianca,
    };
    if (leitura.consumo_kwh === null && leitura.valor_reais === null) return null;
    return leitura;
}

// O Intl põe espaço não separável depois do R$; no texto pro modelo vale o espaço comum.
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).replace(/\u00a0/g, " ");

/** "450 kWh/mês, R$ 412, Celesc, Florianópolis/SC, residencial". */
export function resumoConta(l: Pick<LeituraConta, "consumo_kwh" | "valor_reais" | "distribuidora" | "cidade" | "uf" | "classe">): string {
    const lugar = l.cidade ? (l.uf ? `${l.cidade}/${l.uf}` : l.cidade) : l.uf;
    return [
        l.consumo_kwh !== null ? `${Math.round(l.consumo_kwh).toLocaleString("pt-BR")} kWh/mês` : null,
        l.valor_reais !== null ? brl(l.valor_reais) : null,
        l.distribuidora,
        lugar,
        l.classe,
    ].filter(Boolean).join(", ");
}
