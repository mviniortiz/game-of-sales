import { Gauge, Bell, LineChart, AlertTriangle } from "lucide-react";

// "Central de Comando" — visão diária do que precisa ser resolvido, em DARK.
// Estética alinhada com OperationFlow/AgentStudio: graphite, headline branca,
// 3 cards em glass com ícone (sem image gen — mocks 100% CSS).
// LP.1 2026-05-25: era "Como funciona / Do anúncio à reunião marcada".

const CARDS = [
    {
        icon: Bell,
        eyebrow: "Agir agora",
        title: "Agir agora",
        body: "Prioridades do dia com base em conversas e oportunidades.",
        accent: "#4A8CE8",
        delayClass: "",
    },
    {
        icon: LineChart,
        eyebrow: "Acompanhar",
        title: "Acompanhar",
        body: "KPIs comerciais com contexto, não só números soltos.",
        accent: "#A78BFA",
        delayClass: "landing-delay-100",
    },
    {
        icon: AlertTriangle,
        eyebrow: "Onde está travando",
        title: "Onde está travando",
        body: "Pipeline, gargalos e oportunidades que precisam de revisão.",
        accent: "#10B981",
        delayClass: "landing-delay-200",
    },
] as const;

export const FlowSection = () => {
    return (
        <section className="relative py-28 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#0A0A0A" }}>
            {/* Background atmospheric — gradient sutil azul no topo */}
            <div
                className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(21,86,192,0.18) 0%, rgba(21,86,192,0.06) 40%, transparent 75%)",
                }}
            />
            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                aria-hidden="true"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16 sm:mb-20 landing-fade-in-up">
                    <span
                        className="inline-flex items-center gap-2 text-[11px] rounded-full px-4 py-1.5 mb-6"
                        style={{
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            background: "rgba(255,255,255,0.04)",
                            color: "rgba(255,255,255,0.7)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <Gauge className="h-3 w-3" strokeWidth={2} />
                        Central de Comando
                    </span>

                    <h2
                        className="font-satoshi mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.9rem, 5vw, 3.25rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            color: "#FFFFFF",
                            maxWidth: "820px",
                        }}
                    >
                        Abra o Vyzon e saiba <span style={{ color: "rgba(255,255,255,0.5)" }}>o que resolver primeiro</span>.
                    </h2>

                    <p
                        className="mt-5 mx-auto max-w-2xl"
                        style={{
                            fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                            color: "rgba(255,255,255,0.65)",
                            fontWeight: 400,
                        }}
                    >
                        A Central de Comando mostra prioridades comerciais, conversas na fila, leads quentes, oportunidades abertas e sinais que merecem atenção.
                    </p>
                </div>

                {/* 3 cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
                    {CARDS.map(({ icon: Icon, title, body, accent, delayClass }) => (
                        <div
                            key={title}
                            className={`flex flex-col rounded-2xl p-7 sm:p-8 landing-fade-in-up ${delayClass}`}
                            style={{
                                background: "rgba(255,255,255,0.025)",
                                boxShadow:
                                    "inset 0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -16px rgba(0,0,0,0.5)",
                            }}
                        >
                            {/* Icon tile */}
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center mb-6"
                                style={{
                                    background: `${accent}1F`,
                                    border: `1px solid ${accent}55`,
                                    color: accent,
                                }}
                            >
                                <Icon className="h-5 w-5" strokeWidth={2.1} />
                            </div>

                            {/* Headline */}
                            <h3
                                className="font-heading mb-3"
                                style={{
                                    fontSize: "clamp(1.125rem, 2vw, 1.375rem)",
                                    lineHeight: 1.25,
                                    letterSpacing: "-0.025em",
                                    color: "#FFFFFF",
                                    fontWeight: 700,
                                }}
                            >
                                {title}
                            </h3>

                            {/* Body */}
                            <p
                                className="text-sm sm:text-[15px]"
                                style={{
                                    lineHeight: 1.6,
                                    color: "rgba(255,255,255,0.7)",
                                    fontWeight: 400,
                                }}
                            >
                                {body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
