import { Rise } from "../animation/Rise";
import { ChapterHeader } from "./ChapterHeader";

const PAINS = [
    { n: "01", title: "Lead quente fica sem resposta.", note: "tempo de resposta > 4h", fix: "com EVA: prioridade no inbox" },
    { n: "02", title: "Follow-up depende de cobrança no grupo.", note: "follow-up: na memória", fix: "com EVA: follow-up agendado" },
    { n: "03", title: "Pipeline não acompanha o que aconteceu no WhatsApp.", note: "pipeline ≠ conversa", fix: "com Vyzon: conversa anexada" },
    { n: "04", title: "Você só descobre que o lead esfriou quando já era.", note: "esfriou · detectado tarde", fix: "com EVA: alerta enquanto dá tempo" },
];

/**
 * Capítulo 01 · O problema — razão (ledger) editorial das 4 dores, com o
 * ChapterHeader unificado. Reusa as interações .lp-ledger-row (hover risca a
 * dor e revela a resolução). Copy intocada.
 */
export const ProblemaChapter = () => {
    return (
        <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--lp-white)" }}>
            <div className="relative max-w-5xl mx-auto">
                <ChapterHeader
                    num="01"
                    kicker="o que trava a operação"
                    title={
                        <>
                            Sua agência gera lead.{" "}
                            <span className="lpx-serif" style={{ color: "var(--lp-ink-55)", fontWeight: 400 }}>
                                Mas a oportunidade se perde no caminho.
                            </span>
                        </>
                    }
                    lede="O lead chama no WhatsApp, o atendimento acontece na correria, o follow-up fica na memória do vendedor e o pipeline não mostra a realidade da conversa."
                    maxWidth={680}
                />

                <div className="border-t" style={{ borderColor: "var(--lp-line)" }}>
                    {PAINS.map(({ n, title, note, fix }, i) => (
                        <Rise key={n} delay={i * 0.07}>
                            <div
                                className="lp-ledger-row grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)_auto] items-baseline gap-x-4 sm:gap-x-8 gap-y-1 py-6 sm:py-7 border-b"
                                style={{ borderColor: "var(--lp-line)" }}
                            >
                                <span className="lp-mono" style={{ color: "var(--lp-blue)", fontSize: 13 }}>{n}</span>
                                <h3
                                    className="lp-serif"
                                    style={{ fontSize: "clamp(1.25rem, 3vw, 1.875rem)", lineHeight: 1.25, color: "var(--lp-ink)", fontWeight: 400 }}
                                >
                                    <span className="lp-strike">{title}</span>
                                </h3>
                                <span
                                    className="lp-mono lp-note-swap col-start-2 sm:col-start-3"
                                    style={{ color: "var(--lp-ink-40)", textTransform: "none", letterSpacing: "0.03em" }}
                                >
                                    <span className="lp-note-pain">{note}</span>
                                    <span className="lp-note-fix" aria-hidden="true">{fix}</span>
                                </span>
                            </div>
                        </Rise>
                    ))}
                </div>

                <Rise delay={0.1}>
                    <p
                        className="mt-12 sm:mt-14 font-satoshi text-lg sm:text-2xl"
                        style={{ fontWeight: 700, letterSpacing: "-0.03em", color: "var(--lp-ink)" }}
                    >
                        Menos lead perdido. Menos cobrança manual.{" "}
                        <span style={{ color: "var(--lp-blue)" }}>Mais oportunidade andando.</span>
                    </p>
                </Rise>
            </div>
        </section>
    );
};
