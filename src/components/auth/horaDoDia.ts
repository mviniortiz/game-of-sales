// Hora do login: decide a frase do painel (dia ou noite) e o relógio da cena.

/** Agora; em dev, ?hora=14.5 fixa a hora pra conferir o desenho. */
export function agora(): Date {
    const d = new Date();
    if (import.meta.env.DEV && typeof window !== "undefined") {
        const h = Number(new URLSearchParams(window.location.search).get("hora"));
        if (Number.isFinite(h) && h > 0) d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    }
    return d;
}

/** Fração do dia solar (6h às 18h) na hora local; fora disso, null. */
export function fracaoDoDia(d: Date): number | null {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < 6 || h >= 18) return null;
    return (h - 6) / 12;
}

/** "14h30" */
export const horaCurta = (d: Date) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;

/** "14:30", como o WhatsApp escreve a hora da mensagem. */
export const horaRelogio = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
