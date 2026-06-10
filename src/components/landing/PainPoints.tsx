// LP.4 2026-06-09: PROBLEMA em formato razão (ledger) editorial — as 4 dores
// em Sentient itálica (voz humana, a realidade bagunçada) separadas por
// hairlines, cada uma anotada pela EVA em mono à direita (voz da máquina).
// Copy LP.3 intocada.
const PAINS = [
    {
        n: "01",
        title: "Lead quente fica sem resposta.",
        note: "tempo de resposta > 4h",
    },
    {
        n: "02",
        title: "Follow-up depende de cobrança no grupo.",
        note: "follow-up: na memória",
    },
    {
        n: "03",
        title: "Pipeline não acompanha o que aconteceu no WhatsApp.",
        note: "pipeline ≠ conversa",
    },
    {
        n: "04",
        title: "Você só descobre que o lead esfriou quando já era.",
        note: "esfriou · detectado tarde",
    },
];

export const PainPoints = () => {
    return (
        <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--lp-white)" }}>
            <div className="relative max-w-5xl mx-auto">
                {/* Estação do fio */}
                <div className="lp-station mb-12 sm:mb-16 landing-fade-in-up">
                    <span className="lp-station-node" />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                        01 · o que trava a operação
                    </span>
                    <span className="lp-station-rule" />
                </div>

                {/* Header assimétrico com numeral fantasma */}
                <div className="relative mb-14 sm:mb-20 landing-fade-in-up">
                    <span
                        className="lp-index absolute -top-10 right-0 hidden md:block"
                        style={{ fontSize: "clamp(8rem, 18vw, 13rem)" }}
                        aria-hidden="true"
                    >
                        01
                    </span>
                    <h2
                        className="font-satoshi relative"
                        style={{
                            fontWeight: 900,
                            fontSize: "clamp(2rem, 5vw, 3.4rem)",
                            lineHeight: 1.02,
                            letterSpacing: "-0.04em",
                            color: "var(--lp-ink)",
                            maxWidth: "680px",
                        }}
                    >
                        Sua agência gera lead.{" "}
                        <span className="lp-serif" style={{ color: "var(--lp-ink-55)", fontWeight: 400 }}>
                            Mas a oportunidade se perde no caminho.
                        </span>
                    </h2>
                    <p
                        className="mt-6 text-[15px] sm:text-[17px]"
                        style={{
                            lineHeight: 1.65,
                            color: "var(--lp-ink-70)",
                            maxWidth: "560px",
                            fontWeight: 400,
                        }}
                    >
                        O lead chama no WhatsApp, o atendimento acontece na
                        correria, o follow-up fica na memória do vendedor e o
                        pipeline não mostra a realidade da conversa.
                    </p>
                </div>

                {/* Ledger de dores */}
                <div className="border-t" style={{ borderColor: "var(--lp-line)" }}>
                    {PAINS.map(({ n, title, note }, i) => (
                        <div
                            key={n}
                            className={`grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)_auto] items-baseline gap-x-4 sm:gap-x-8 gap-y-1 py-6 sm:py-7 border-b landing-fade-in-up ${i === 0 ? "" : i === 1 ? "landing-delay-100" : i === 2 ? "landing-delay-200" : "landing-delay-300"}`}
                            style={{ borderColor: "var(--lp-line)" }}
                        >
                            <span
                                className="lp-mono"
                                style={{ color: "var(--lp-blue)", fontSize: 13 }}
                            >
                                {n}
                            </span>
                            <h3
                                className="lp-serif"
                                style={{
                                    fontSize: "clamp(1.25rem, 3vw, 1.875rem)",
                                    lineHeight: 1.25,
                                    color: "var(--lp-ink)",
                                    fontWeight: 400,
                                }}
                            >
                                {title}
                            </h3>
                            <span
                                className="lp-mono col-start-2 sm:col-start-3"
                                style={{ color: "var(--lp-ink-40)", textTransform: "none", letterSpacing: "0.03em" }}
                            >
                                {note}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Fechamento */}
                <div className="mt-12 sm:mt-14 landing-fade-in-up landing-delay-300">
                    <p
                        className="font-satoshi text-lg sm:text-2xl"
                        style={{ fontWeight: 700, letterSpacing: "-0.03em", color: "var(--lp-ink)" }}
                    >
                        Menos lead perdido. Menos cobrança manual.{" "}
                        <span style={{ color: "var(--lp-blue)" }}>Mais oportunidade andando.</span>
                    </p>
                </div>
            </div>
        </section>
    );
};
