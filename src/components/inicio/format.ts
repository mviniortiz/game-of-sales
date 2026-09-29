// Formatos curtos da coluna do Início: dinheiro compacto e tempo de resposta.

/** R$ 830 · R$ 8,3k · R$ 142k */
export const brlCompact = (v: number) =>
    v >= 1000
        ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: v >= 100_000 ? 0 : 1 })}k`
        : `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

/** 45min · 1h00 · 12h05 */
export const formatMinutes = (min: number) =>
    min < 60 ? `${min}min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
