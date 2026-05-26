import { Inbox, Sparkle, Workflow, Gauge } from "lucide-react";
import { LandingButton } from "./LandingButton";

// LP.1 2026-05-25: seção repurposed de "Agent Studio" (mockup foto+sidebar)
// para "Solução" — a central que conecta conversa, EVA e pipeline. Mantém o
// shell dark (contraste com as sections white) e o export AgentStudioSection.
const MODULES = [
    {
        icon: Inbox,
        title: "Inbox Comercial",
        body: "Centralize conversas e veja quem precisa de resposta.",
        accent: "#4A8CE8",
    },
    {
        icon: Sparkle,
        title: "EVA Comercial",
        body: "Analise intenção, fit, objeções e próximo passo.",
        accent: "#A78BFA",
    },
    {
        icon: Workflow,
        title: "Pipeline Contextual",
        body: "Acompanhe oportunidades com conversa e leitura da EVA.",
        accent: "#2563EB",
    },
    {
        icon: Gauge,
        title: "Central de Comando",
        body: "Veja o que precisa de atenção hoje.",
        accent: "#10B981",
    },
] as const;

interface AgentStudioSectionProps {
    onCTAClick?: () => void;
}

export const AgentStudioSection = ({ onCTAClick }: AgentStudioSectionProps) => {
    return (
        <section className="relative overflow-hidden" style={{ background: "#0A0A0A" }}>
            {/* Background atmosférico — gradiente azul direcional no topo */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div
                    className="absolute inset-x-0 top-0 h-[600px]"
                    style={{
                        background:
                            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(21,86,192,0.20) 0%, rgba(21,86,192,0.06) 42%, transparent 78%)",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "72px 72px",
                    }}
                />
            </div>

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-28 sm:pb-32">
                {/* Header */}
                <div className="text-center mb-14 sm:mb-16 landing-fade-in-up">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <img
                            src="/landing/pilares/eva-marca.png"
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                            loading="lazy"
                        />
                        <span
                            className="text-[11px] uppercase"
                            style={{
                                letterSpacing: "0.18em",
                                color: "rgba(255,255,255,0.7)",
                                fontWeight: 600,
                            }}
                        >
                            Como o Vyzon resolve
                        </span>
                    </div>

                    <h2
                        className="font-satoshi mx-auto mb-6"
                        style={{
                            fontSize: "clamp(2rem, 5.5vw, 3.5rem)",
                            lineHeight: 1.04,
                            letterSpacing: "-0.045em",
                            color: "#FFFFFF",
                            fontWeight: 700,
                            maxWidth: "880px",
                        }}
                    >
                        Uma Central Comercial para organizar conversa, prioridade e pipeline.
                    </h2>

                    <p
                        className="mx-auto mb-8"
                        style={{
                            fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                            color: "rgba(255,255,255,0.65)",
                            fontWeight: 400,
                            maxWidth: "720px",
                        }}
                    >
                        O Vyzon reúne a operação comercial da agência em um fluxo simples: conversa entra, EVA analisa, o time aprova o próximo passo e a oportunidade segue no pipeline.
                    </p>

                    <div className="flex justify-center">
                        <LandingButton
                            as="button"
                            onClick={onCTAClick}
                            variant="primary"
                            size="lg"
                            showArrow
                        >
                            Agendar demonstração
                        </LandingButton>
                    </div>
                </div>

                {/* 4 cards de módulo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 landing-fade-in-up landing-delay-200">
                    {MODULES.map(({ icon: Icon, title, body, accent }) => (
                        <div
                            key={title}
                            className="rounded-2xl p-7 sm:p-8 hover-lift"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                boxShadow:
                                    "inset 0 0 0 1px rgba(255,255,255,0.07), 0 24px 60px -20px rgba(0,0,0,0.6)",
                            }}
                        >
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                                style={{
                                    background: `${accent}1F`,
                                    border: `1px solid ${accent}55`,
                                    color: accent,
                                }}
                            >
                                <Icon className="h-5 w-5" strokeWidth={2.1} />
                            </div>
                            <h3
                                className="font-heading mb-2.5"
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
