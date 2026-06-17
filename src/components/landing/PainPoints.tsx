// LP.4 2026-06-09: PROBLEMA em formato razão (ledger) editorial — as 4 dores
// em Sentient itálica (voz humana, a realidade bagunçada) separadas por
// hairlines, cada uma anotada pela EVA em mono à direita (voz da máquina).
// Copy LP.3 intocada.
// LP.5 2026-06-12: reveals por scroll (Rise) e razão interativa — o hover
// risca a dor (linha azul) e a anotação da EVA troca pela resolução em verde.
// A página encena o produto: a EVA resolvendo cada dor diante do gestor.
// LP.5.1 2026-06-12: em telas de toque (sem hover) cada linha se risca sozinha
// ao entrar na viewport, com stagger — o efeito-chave passa a existir no mobile.
import { useEffect, useRef } from "react";
import { Rise } from "./animation/Rise";

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PAINS = [
    {
        n: "01",
        title: "Lead quente fica sem resposta.",
        note: "tempo de resposta > 4h",
        fix: "com EVA: prioridade no inbox",
    },
    {
        n: "02",
        title: "Follow-up depende de cobrança no grupo.",
        note: "follow-up: na memória",
        fix: "com EVA: follow-up agendado",
    },
    {
        n: "03",
        title: "Pipeline não acompanha o que aconteceu no WhatsApp.",
        note: "pipeline ≠ conversa",
        fix: "com Vyzon: conversa anexada",
    },
    {
        n: "04",
        title: "Você só descobre que o lead esfriou quando já era.",
        note: "esfriou · detectado tarde",
        fix: "com EVA: alerta enquanto dá tempo",
    },
];

export const PainPoints = () => {
    const ledgerRef = useRef<HTMLDivElement>(null);

    // Touch (hover: none): risca cada linha ao entrar na tela, com stagger.
    useEffect(() => {
        if (prefersReducedMotion()) return;
        if (typeof window.matchMedia !== "function" || !window.matchMedia("(hover: none)").matches) return;
        const root = ledgerRef.current;
        if (!root || typeof IntersectionObserver === "undefined") return;

        const rows = Array.from(root.querySelectorAll<HTMLElement>(".lp-ledger-row"));
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    const el = e.target as HTMLElement;
                    const i = rows.indexOf(el);
                    window.setTimeout(() => el.classList.add("lp-ledger-row--seen"), Math.max(0, i) * 140);
                    io.unobserve(el);
                });
            },
            { threshold: 0.6, rootMargin: "0px 0px -10% 0px" }
        );
        rows.forEach((r) => io.observe(r));
        return () => io.disconnect();
    }, []);

    return (
        <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--lp-white)" }}>
            <div className="relative max-w-5xl mx-auto">
                {/* Estação do fio */}
                <Rise>
                    <div className="lp-station mb-12 sm:mb-16">
                        <span className="lp-station-node" />
                        <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                            01 · o que trava a operação
                        </span>
                        <span className="lp-station-rule" />
                    </div>
                </Rise>

                {/* Header assimétrico com numeral fantasma */}
                <Rise delay={0.08}>
                    <div className="relative mb-14 sm:mb-20">
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
                </Rise>

                {/* Ledger de dores — hover (ou scroll no touch) risca a dor e revela a resolução */}
                <div ref={ledgerRef} className="border-t" style={{ borderColor: "var(--lp-line)" }}>
                    {PAINS.map(({ n, title, note, fix }, i) => (
                        <Rise key={n} delay={i * 0.08}>
                            <div
                                className="lp-ledger-row grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[72px_minmax(0,1fr)_auto] items-baseline gap-x-4 sm:gap-x-8 gap-y-1 py-6 sm:py-7 border-b"
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
                                    <span className="lp-strike">{title}</span>
                                </h3>
                                <span
                                    className="lp-mono lp-note-swap col-start-2 sm:col-start-3"
                                    style={{ color: "var(--lp-ink-40)", textTransform: "none", letterSpacing: "0.03em" }}
                                >
                                    <span className="lp-note-pain">{note}</span>
                                    <span className="lp-note-fix" aria-hidden="true">
                                        {fix}
                                    </span>
                                </span>
                            </div>
                        </Rise>
                    ))}
                </div>

                {/* Fechamento */}
                <Rise delay={0.1}>
                    <div className="mt-12 sm:mt-14">
                        <p
                            className="font-satoshi text-lg sm:text-2xl"
                            style={{ fontWeight: 700, letterSpacing: "-0.03em", color: "var(--lp-ink)" }}
                        >
                            Menos lead perdido. Menos cobrança manual.{" "}
                            <span style={{ color: "var(--lp-blue)" }}>Mais oportunidade andando.</span>
                        </p>
                    </div>
                </Rise>
            </div>
        </section>
    );
};
