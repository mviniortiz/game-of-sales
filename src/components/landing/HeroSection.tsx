import { useEffect } from "react";
import { Calendar } from "lucide-react";
import { LandingButton } from "./LandingButton";
import { trackEvent } from "@/lib/analytics";

// LP.2.3 2026-05-25: hero enxuta — só headline, subheadline, 1 linha leve de EVA
// e CTAs. Saíram: box grande de EVA, frase "Conversa entra…", 4 cards de fluxo
// (cobertos por ProductShowcase + "Do WhatsApp ao pipeline") e chips de
// segmentos (movidos pra section "Para quem é" / PilaresSection).
const HERO_COPY = {
    line1: "Pare de perder leads",
    line2: "no WhatsApp.",
    subtitle:
        "O Vyzon é uma Central Comercial com EVA para agências que vendem por conversa. Organize atendimentos, priorize oportunidades e transforme conversas em pipeline.",
    eva: "EVA é a IA comercial do Vyzon: ela analisa conversas e sugere o próximo passo. Seu time aprova.",
};

// Streaks pré-definidos (determinístico, sem random pra evitar layout shift).
// Efeito "aurora vertical" em dois tons de azul brand Vyzon.
const STREAKS = [
    { left: 3, width: 70, opacity: 0.18, skew: -6, kind: "dark" },
    { left: 9, width: 40, opacity: 0.10, skew: -3, kind: "dark" },
    { left: 16, width: 95, opacity: 0.24, skew: -8, kind: "dark" },
    { left: 24, width: 55, opacity: 0.14, skew: 2, kind: "light" },
    { left: 31, width: 75, opacity: 0.18, skew: -5, kind: "dark" },
    { left: 39, width: 35, opacity: 0.08, skew: 4, kind: "dark" },
    { left: 47, width: 85, opacity: 0.20, skew: -7, kind: "light" },
    { left: 56, width: 50, opacity: 0.12, skew: 3, kind: "dark" },
    { left: 63, width: 75, opacity: 0.18, skew: -4, kind: "dark" },
    { left: 71, width: 45, opacity: 0.10, skew: 5, kind: "light" },
    { left: 78, width: 100, opacity: 0.24, skew: -9, kind: "dark" },
    { left: 87, width: 60, opacity: 0.14, skew: -2, kind: "dark" },
    { left: 94, width: 50, opacity: 0.12, skew: 6, kind: "dark" },
] as const;

interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onScheduleDemoClick?: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onScheduleDemoClick }: HeroSectionProps) => {
    useEffect(() => {
        try {
            trackEvent("hero_variant_shown", { variant: "central_comercial_eva_lp2_clean" });
        } catch {
            /* analytics never breaks UX */
        }
    }, []);

    const onSchedule = onScheduleDemoClick || onCTAClick;

    return (
        <section className="relative overflow-hidden bg-white">
            {/* Streaks layer — aurora vertical em azul brand */}
            <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden" aria-hidden="true">
                {STREAKS.map((s, i) => (
                    <div
                        key={i}
                        className="absolute top-0 origin-top"
                        style={{
                            left: `${s.left}%`,
                            width: `${s.width}px`,
                            height: "130%",
                            transform: `skewX(${s.skew}deg) translateY(-5%)`,
                            background: s.kind === "light"
                                ? `linear-gradient(180deg, rgba(74,140,232,${s.opacity * 0.95}) 0%, rgba(74,140,232,${s.opacity * 0.3}) 40%, transparent 78%)`
                                : `linear-gradient(180deg, rgba(21,86,192,${s.opacity}) 0%, rgba(21,86,192,${s.opacity * 0.35}) 45%, transparent 82%)`,
                            filter: "blur(14px)",
                        }}
                    />
                ))}
                <div
                    className="absolute inset-x-0 top-0 h-24"
                    style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)" }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="pt-36 sm:pt-44 pb-28 sm:pb-36 text-center">
                    {/* Headline — duas linhas, dor em destaque */}
                    <h1
                        className="font-satoshi mx-auto landing-fade-in-up landing-delay-200"
                        style={{
                            fontSize: "clamp(2.75rem, 7.5vw, 4.75rem)",
                            lineHeight: 1.03,
                            letterSpacing: "-0.045em",
                            maxWidth: "760px",
                            color: "#0A0A0A",
                            fontWeight: 700,
                        }}
                    >
                        <span style={{ fontWeight: 700 }}>{HERO_COPY.line1}</span>
                        <br />
                        <span
                            style={{
                                fontWeight: 700,
                                background: "linear-gradient(135deg, #1556C0 0%, #2E78E0 45%, #1556C0 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            {HERO_COPY.line2}
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p
                        className="mt-6 mx-auto max-w-[600px] landing-fade-in-up landing-delay-300"
                        style={{
                            fontSize: "clamp(1rem, 2vw, 1.2rem)",
                            lineHeight: 1.55,
                            color: "rgba(10,10,10,0.72)",
                            fontWeight: 400,
                        }}
                    >
                        {HERO_COPY.subtitle}
                    </p>

                    {/* Microcopy EVA — uma linha leve, sem box */}
                    <p
                        className="mt-4 mx-auto max-w-[540px] landing-fade-in-up landing-delay-300"
                        style={{
                            fontSize: "0.875rem",
                            lineHeight: 1.5,
                            color: "rgba(10,10,10,0.5)",
                            fontWeight: 500,
                        }}
                    >
                        {HERO_COPY.eva}
                    </p>

                    {/* CTA único, centralizado — colado ao texto principal */}
                    <div className="flex justify-center mt-8 landing-fade-in-up landing-delay-400">
                        <LandingButton
                            href="#agendar-demo"
                            onClick={(e) => {
                                if (onSchedule) {
                                    e.preventDefault();
                                    onSchedule();
                                }
                            }}
                            variant="primary"
                            size="lg"
                            icon={<Calendar className="h-4 w-4" strokeWidth={2} />}
                            showArrow
                        >
                            Agendar demo gratuita
                        </LandingButton>
                    </div>

                    {/* Microcopy abaixo do botão */}
                    <p
                        className="mt-4 mx-auto landing-fade-in landing-delay-500"
                        style={{
                            fontSize: "0.8125rem",
                            color: "rgba(10,10,10,0.5)",
                            fontWeight: 500,
                        }}
                    >
                        Demo gratuita, personalizada para o contexto da sua agência.
                    </p>
                </div>
            </div>
        </section>
    );
};
