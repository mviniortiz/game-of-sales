// MonthCard — o mês em reais: quanto fechou, quanto falta pra meta (um traço por
// trinta avos da meta, sem barra abstrata) e o que a EVA trouxe de volta. Cada
// linha diz o próprio período: o fechado é do mês; o placar de orçamentos cobre
// os orçamentos enviados nos últimos 30 dias.
import { Link } from "react-router-dom";
import { brl, plural } from "@/lib/quoteText";

const TICKS = 30;

function milhar(v: number): string {
    return v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl(v);
}

export interface MonthNumbers {
    wonTotal: number;
    wonCount: number;
    goal: number | null;
    recoveredAmount: number;
    recoveredCount: number;
    talkingAmount: number;
    lostCount: number;
    expiredCount: number;
}

export function MonthCard({ numbers, loading }: { numbers: MonthNumbers | null; loading: boolean }) {
    const mes = new Date().toLocaleDateString("pt-BR", { month: "long" });
    const titulo = mes.charAt(0).toUpperCase() + mes.slice(1);

    if (loading || !numbers) {
        return <div aria-busy="true" aria-label="Carregando o mês" className="h-[252px] rounded-[14px] bg-[var(--vyz-surface-3)] motion-safe:animate-pulse" />;
    }

    const { wonTotal, wonCount, goal } = numbers;
    const pct = goal ? Math.round((wonTotal / goal) * 100) : null;
    const filled = goal ? Math.min(TICKS, Math.floor((wonTotal / goal) * TICKS)) : 0;

    return (
        <section aria-labelledby="mes-titulo" className="flex flex-col gap-4 rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5">
            <h2 id="mes-titulo" className="text-[13px] font-semibold text-[var(--vyz-text)]">{titulo}</h2>
            <div className="flex flex-col gap-2">
                <p className="text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--vyz-text-primary)]">
                    {brl(wonTotal)} <span className="text-[15px] font-medium tracking-normal text-[var(--vyz-text-muted)]">fechados</span>
                </p>
                {goal ? (
                    <>
                        <div role="img" aria-label={`${pct}% da meta de ${brl(goal)}`} className="flex gap-[2px]">
                            {Array.from({ length: TICKS }, (_, i) => (
                                <span key={i} className={`h-2.5 w-[3px] rounded-[1px] ${i < filled ? "bg-emerald-700" : "bg-[var(--vyz-border)]"}`} />
                            ))}
                        </div>
                        <p className="text-[12.5px] text-[var(--vyz-text-muted)]">
                            {pct}% da meta de {milhar(goal)} · cada traço é {milhar(goal / TICKS)}
                        </p>
                    </>
                ) : (
                    <p className="text-[12.5px] text-[var(--vyz-text-muted)]">
                        {plural(wonCount, "negócio", "negócios")} no mês. Sem meta cadastrada.{" "}
                        <Link to="/admin?aba=meta" className="font-medium text-[var(--vyz-text-primary)] underline underline-offset-2 hover:text-[var(--vyz-accent)]">Definir meta</Link>
                    </p>
                )}
            </div>
            <dl className="flex flex-col border-t border-[var(--vyz-border-subtle)] text-[13.5px]">
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--vyz-border-subtle)] py-2.5">
                    <dt className="flex items-center gap-1.5 text-[var(--vyz-text)]">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#6d28d9]" />
                        Voltaram com retomada <span className="text-[12px] text-[var(--vyz-text-soft)]">30 dias</span>
                    </dt>
                    <dd className="font-semibold tabular-nums text-[var(--vyz-text-primary)]">{brl(numbers.recoveredAmount)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--vyz-border-subtle)] py-2.5">
                    <dt className="text-[var(--vyz-text)]">Em conversa agora</dt>
                    <dd className="font-semibold tabular-nums text-[var(--vyz-text-primary)]">{brl(numbers.talkingAmount)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-2.5">
                    <dt className="text-[var(--vyz-text)]">Perdidos <span className="text-[12px] text-[var(--vyz-text-soft)]">30 dias</span></dt>
                    <dd className="text-[var(--vyz-text-muted)]">
                        {numbers.lostCount} {numbers.lostCount === 1 ? "disse não" : "disseram não"}, {numbers.expiredCount} {numbers.expiredCount === 1 ? "morreu" : "morreram"}
                    </dd>
                </div>
            </dl>
        </section>
    );
}
