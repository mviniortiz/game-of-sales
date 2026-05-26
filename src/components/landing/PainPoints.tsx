import { AlertCircle, Clock, MessageSquare, TrendingDown, Users } from "lucide-react";

// LP.2 2026-05-25: PROBLEMA simplificado — só as dores (a solução vive em
// "Como o Vyzon resolve"), pra cortar redundância dor→solução na mesma seção.
const PAINS = [
    {
        n: "01",
        icon: Clock,
        title: "Lead quente fica sem resposta.",
    },
    {
        n: "02",
        icon: MessageSquare,
        title: "Follow-up depende de cobrança no grupo.",
    },
    {
        n: "03",
        icon: TrendingDown,
        title: "Pipeline não acompanha o que aconteceu no WhatsApp.",
    },
    {
        n: "04",
        icon: Users,
        title: "Cada vendedor responde de um jeito.",
    },
];

export const PainPoints = () => {
    return (
        <section className="relative py-28 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
            <div className="relative max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16 sm:mb-20 landing-fade-in-up">
                    <span
                        className="inline-flex items-center gap-2 text-[11px] rounded-full px-4 py-1.5 mb-6"
                        style={{
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            background: "rgba(10,10,10,0.04)",
                            color: "rgba(10,10,10,0.6)",
                            border: "1px solid rgba(10,10,10,0.08)",
                        }}
                    >
                        <AlertCircle className="h-3 w-3" strokeWidth={2} />
                        O que trava a operação
                    </span>

                    <h2
                        className="font-satoshi mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.9rem, 5vw, 3.25rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            color: "#0A0A0A",
                            maxWidth: "860px",
                        }}
                    >
                        Sua agência gera lead.{" "}
                        <span style={{ color: "rgba(10,10,10,0.5)" }}>
                            Mas a oportunidade se perde no caminho.
                        </span>
                    </h2>

                    <p
                        className="mt-5 mx-auto text-[15px] sm:text-[17px]"
                        style={{
                            lineHeight: 1.6,
                            color: "rgba(10,10,10,0.55)",
                            maxWidth: "720px",
                            fontWeight: 400,
                        }}
                    >
                        O lead chama no WhatsApp, o atendimento acontece na
                        correria, o follow-up fica na memória do vendedor e o
                        pipeline não mostra a realidade da conversa.
                    </p>
                </div>

                {/* Dores — grid 2x2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    {PAINS.map(({ n, icon: Icon, title }, i) => (
                        <div
                            key={n}
                            className={`flex items-start gap-5 rounded-2xl p-6 sm:p-7 landing-fade-in-up ${i === 0 ? "" : i === 1 ? "landing-delay-100" : "landing-delay-200"}`}
                            style={{
                                background: "rgba(10,10,10,0.025)",
                                border: "1px solid rgba(10,10,10,0.08)",
                            }}
                        >
                            <span
                                className="font-heading shrink-0"
                                style={{
                                    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                                    lineHeight: 1,
                                    letterSpacing: "-0.04em",
                                    color: "rgba(10,10,10,0.14)",
                                    fontWeight: 700,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {n}
                            </span>
                            <div className="flex items-start gap-3.5 pt-1">
                                <div
                                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{
                                        background: "rgba(10,10,10,0.04)",
                                        border: "1px solid rgba(10,10,10,0.08)",
                                    }}
                                >
                                    <Icon className="h-5 w-5" strokeWidth={1.8} style={{ color: "#0A0A0A" }} />
                                </div>
                                <h3
                                    className="font-heading"
                                    style={{
                                        fontSize: "clamp(1.0625rem, 2vw, 1.25rem)",
                                        lineHeight: 1.3,
                                        letterSpacing: "-0.02em",
                                        color: "#0A0A0A",
                                        fontWeight: 700,
                                    }}
                                >
                                    {title}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="mt-16 sm:mt-20 text-center landing-fade-in-up landing-delay-300">
                    <p
                        className="text-base sm:text-lg"
                        style={{
                            fontWeight: 500,
                            color: "rgba(10,10,10,0.6)",
                        }}
                    >
                        <span style={{ color: "#0A0A0A", fontWeight: 700 }}>Menos lead perdido.</span>{" "}
                        <span style={{ color: "#0A0A0A", fontWeight: 700 }}>Menos cobrança manual.</span>{" "}
                        <span style={{ color: "#0A0A0A", fontWeight: 700 }}>Mais oportunidade andando.</span>
                    </p>
                </div>
            </div>
        </section>
    );
};
