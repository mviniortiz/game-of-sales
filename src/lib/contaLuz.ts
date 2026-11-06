// CONTA.1 (06/11/2026): conta de luz que a Lume leu no WhatsApp do cliente.
// Espelha o resumo de supabase/functions/_shared/contaLuz.ts, que é quem lê.

export type ClasseConta = "residencial" | "comercial" | "rural" | "industrial";
export type StatusConta = "lida" | "confirmada" | "corrigida" | "descartada";

export const CLASSES: ClasseConta[] = ["residencial", "comercial", "rural", "industrial"];

export interface ContaLuz {
    id: string;
    consumo_kwh: number | null;
    valor_reais: number | null;
    distribuidora: string | null;
    cidade: string | null;
    uf: string | null;
    classe: ClasseConta | null;
    mes_referencia: string | null;
    fonte: "foto" | "pdf";
    status: StatusConta;
    created_at: string;
}

export type CamposConta = Pick<ContaLuz, "consumo_kwh" | "valor_reais" | "distribuidora" | "cidade" | "uf" | "classe">;

const brl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).replace(/\u00a0/g, " ");

/** "450 kWh/mês, R$ 412, Celesc, Florianópolis/SC, residencial". */
export function resumoConta(l: CamposConta): string {
    const lugar = l.cidade ? (l.uf ? `${l.cidade}/${l.uf}` : l.cidade) : l.uf;
    return [
        l.consumo_kwh !== null ? `${Math.round(l.consumo_kwh).toLocaleString("pt-BR")} kWh/mês` : null,
        l.valor_reais !== null ? brl(l.valor_reais) : null,
        l.distribuidora,
        lugar,
        l.classe,
    ].filter(Boolean).join(", ");
}

/** Número digitado pelo dono ("412,37", "1.200") ou null quando vazio ou inválido. */
export function numeroDigitado(v: string): number | null {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
}
