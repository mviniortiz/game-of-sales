// QuinzenaCard — os últimos 14 dias em quadradinhos: cada quadrado é um lead
// novo, um orçamento enviado ou um fechamento. Com o volume de uma PME (poucos
// por dia) contar unidades é mais honesto que barra proporcional.
import { formatMinutes } from "./format";

const MAX_STACK = 6;

export interface QuinzenaDay {
    day: string;
    label: string;
    leads: number;
    quotes: number;
    won: number;
}

const KINDS = [
    { key: "leads", label: "lead novo", color: "bg-[#2563EB]" },
    { key: "quotes", label: "orçamento enviado", color: "bg-[#2B2E35]" },
    { key: "won", label: "fechou", color: "bg-emerald-600" },
] as const;

export function QuinzenaCard({ days, responseMedianMin, loading }: { days: QuinzenaDay[]; responseMedianMin: number | null; loading: boolean }) {
    if (loading) {
        return <div aria-busy="true" aria-label="Carregando os últimos 14 dias" className="h-[210px] rounded-[14px] bg-[var(--vyz-surface-3)] motion-safe:animate-pulse" />;
    }

    const totals = { leads: 0, quotes: 0, won: 0 };
    for (const d of days) {
        totals.leads += d.leads;
        totals.quotes += d.quotes;
        totals.won += d.won;
    }
    const mid = days[Math.floor(days.length / 2)];

    return (
        <section aria-labelledby="quinzena-titulo" className="flex flex-col gap-3 rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="quinzena-titulo" className="text-[13px] font-semibold text-[var(--vyz-text)]">Últimos 14 dias</h2>
                <span className="text-[11.5px] text-[var(--vyz-text-soft)]">cada quadrado é um</span>
            </div>

            <div className="grid h-[72px] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1 border-b border-[var(--vyz-border-subtle)] pb-1.5">
                {days.map((d) => {
                    const squares = KINDS.flatMap((k) => Array.from({ length: d[k.key] }, () => k.color));
                    const shown = squares.slice(0, MAX_STACK);
                    const extra = squares.length - shown.length;
                    return (
                        <div
                            key={d.day}
                            role="img"
                            aria-label={`${d.label}: ${d.leads} leads novos, ${d.quotes} orçamentos, ${d.won} fechados`}
                            title={`${d.label}: ${d.leads} leads, ${d.quotes} orçamentos, ${d.won} fechados`}
                            className="flex flex-col-reverse items-center gap-[2px]"
                        >
                            {shown.map((c, i) => (
                                <span key={i} className={`block h-2.5 w-2.5 rounded-[2px] ${c}`} />
                            ))}
                            {extra > 0 && <span className="text-[9.5px] font-semibold leading-none text-[var(--vyz-text-muted)]">+{extra}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[11px] tabular-nums text-[var(--vyz-text-soft)]">
                <span>{days[0]?.label}</span>
                <span>{mid?.label}</span>
                <span>hoje</span>
            </div>

            <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[var(--vyz-text)]">
                {KINDS.map((k) => (
                    <li key={k.key} className="flex items-center gap-1.5">
                        <span aria-hidden className={`block h-2.5 w-2.5 rounded-[2px] ${k.color}`} />
                        {k.label} <span className="tabular-nums text-[var(--vyz-text-muted)]">{totals[k.key]}</span>
                    </li>
                ))}
            </ul>

            <div className="flex items-baseline justify-between gap-3 border-t border-[var(--vyz-border-subtle)] pt-2.5 text-[13.5px]">
                <span className="text-[var(--vyz-text)]">Seu tempo para responder</span>
                <span className={responseMedianMin != null ? "font-semibold tabular-nums text-[var(--vyz-text-primary)]" : "text-[12.5px] text-[var(--vyz-text-muted)]"}>
                    {responseMedianMin != null ? formatMinutes(responseMedianMin) : "ainda sem dado"}
                </span>
            </div>
        </section>
    );
}
