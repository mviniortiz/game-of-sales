import { Clock, Target, Bell, Sparkle } from "lucide-react";

// LP.2.4 2026-05-25: substitui a OperationFlowSection (5 etapas + mock sticky).
// LP.2.5: cards reorientados pra RESULTADO (responder/priorizar/follow-up), não
// pros módulos Inbox/EVA/Pipeline — esses já vivem na dark AgentStudioSection.
// Sem mock, sem 5 etapas, sem automação autônoma (EVA sugere, time aprova).
const CARDS = [
    {
        icon: Clock,
        title: "Responda rápido",
        body: "O time vê na hora quem chegou e quem está esperando, e age antes do lead esfriar.",
        accent: "#2563EB",
    },
    {
        icon: Target,
        title: "Priorize melhor",
        body: "A EVA aponta fit, intenção e urgência, então o time foca em quem está pronto pra avançar.",
        accent: "#7C3AED",
    },
    {
        icon: Bell,
        title: "Não perca follow-up",
        body: "Cada oportunidade carrega a próxima ação, então nenhum lead fica esquecido.",
        accent: "#10B981",
    },
] as const;

export const CentralComercialSection = () => {
    return (
        <section className="relative py-28 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#F7FAFF" }}>
            {/* Glow azul sutil no topo */}
            <div
                className="absolute inset-x-0 top-0 h-[360px] pointer-events-none"
                aria-hidden
                style={{
                    background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-14 landing-fade-in-up">
                    <h2
                        className="font-satoshi mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.9rem, 4.8vw, 3rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.04em",
                            color: "#0B1220",
                            maxWidth: "760px",
                        }}
                    >
                        Tudo que o comercial da agência precisa, <span style={{ color: "#1D4ED8" }}>em uma única central</span>.
                    </h2>
                    <p
                        className="mt-5 mx-auto max-w-2xl"
                        style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)", lineHeight: 1.6, color: "rgba(10,10,10,0.58)" }}
                    >
                        Conversas, prioridades, oportunidades e próximos passos conectados pela EVA.
                    </p>
                </div>

                {/* 3 cards grandes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                    {CARDS.map(({ icon: Icon, title, body, accent }) => (
                        <div
                            key={title}
                            className="rounded-2xl p-7 sm:p-8 bg-white hover-lift"
                            style={{
                                border: "1px solid #D9E2EC",
                                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 18px 44px -16px rgba(15,23,42,0.12)",
                            }}
                        >
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center mb-6"
                                style={{ background: `${accent}14`, border: `1px solid ${accent}40`, color: accent }}
                            >
                                <Icon className="h-5 w-5" strokeWidth={2.1} />
                            </div>
                            <h3
                                className="font-heading mb-2.5"
                                style={{
                                    fontSize: "clamp(1.125rem, 2vw, 1.375rem)",
                                    lineHeight: 1.25,
                                    letterSpacing: "-0.025em",
                                    color: "#0B1220",
                                    fontWeight: 700,
                                }}
                            >
                                {title}
                            </h3>
                            <p
                                className="text-sm sm:text-[15px]"
                                style={{ lineHeight: 1.6, color: "rgba(10,10,10,0.6)", fontWeight: 400 }}
                            >
                                {body}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Fechamento curto */}
                <p
                    className="mt-12 mx-auto max-w-2xl text-center landing-fade-in-up landing-delay-200"
                    style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", lineHeight: 1.5, color: "#0B1220", fontWeight: 600, letterSpacing: "-0.015em" }}
                >
                    A Central mostra o que precisa de atenção hoje, sem depender de cobrança no grupo.
                </p>

                {/* Microcopy EVA assistida */}
                <p
                    className="mt-5 text-center inline-flex items-center gap-1.5 w-full justify-center landing-fade-in landing-delay-300"
                    style={{ fontSize: "0.875rem", color: "#6D28D9", fontWeight: 600 }}
                >
                    <Sparkle className="h-3.5 w-3.5" strokeWidth={2.3} />
                    A EVA sugere. Seu time aprova.
                </p>
            </div>
        </section>
    );
};
