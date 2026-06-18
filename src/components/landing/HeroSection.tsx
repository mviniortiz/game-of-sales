import { useEffect } from "react";
import { Calendar } from "lucide-react";
import { LandingButton } from "./LandingButton";
import { trackEvent } from "@/lib/analytics";

// LP.6 2026-06-17: hero minimalista, direção "handhold". Composição centrada e
// centralizada na viewport, headline em Sentient roman (display serif leve) e
// UMA fita de marca (verde→azul) fluindo em loop contínuo atrás do conteúdo.
// O cartão de demonstração da EVA saiu do hero (some daqui pra manter o herói
// limpo e impactante); a demonstração vive nas seções abaixo. Estilos da fita
// em index.css (.lp-hero-wave) — ver nota de exceção ao "sem glow".
const HERO_COPY = {
    line1: "Um copiloto para",
    line2: "cada conversa.",
    subtitle:
        "A EVA acompanha seus atendimentos no WhatsApp e mostra o próximo passo. Você aprova.",
};

interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onScheduleDemoClick?: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onScheduleDemoClick }: HeroSectionProps) => {
    useEffect(() => {
        try {
            trackEvent("hero_variant_shown", { variant: "fio_da_conversa_lp4" });
        } catch {
            /* analytics never breaks UX */
        }
    }, []);

    const onSchedule = onScheduleDemoClick || onCTAClick;

    return (
        <section className="relative overflow-hidden" style={{ backgroundColor: "var(--lp-paper)" }}>
            {/* LP.6: fita de marca (verde→azul) fluindo em loop contínuo, difusa +
                grão. Decorativa, atrás do conteúdo. Estilos em index.css
                (.lp-hero-wave). Exceção consciente ao "sem glow" (ver index.css). */}
            <div className="lp-hero-wave" aria-hidden="true">
                <svg viewBox="0 0 1600 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Gradiente periódico repetido (período 800): casa com a onda,
                            então a cor flui junto sem revelar emenda. */}
                        <linearGradient id="lpWaveA" gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" y1="0" x2="800" y2="0">
                            <stop offset="0" stopColor="#00E37A" stopOpacity="0.78" />
                            <stop offset="0.5" stopColor="#1556C0" stopOpacity="0.78" />
                            <stop offset="1" stopColor="#00E37A" stopOpacity="0.78" />
                        </linearGradient>
                        <linearGradient id="lpWaveB" gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" y1="0" x2="800" y2="0">
                            <stop offset="0" stopColor="#1E78D4" stopOpacity="0.46" />
                            <stop offset="0.5" stopColor="#00E37A" stopOpacity="0.46" />
                            <stop offset="1" stopColor="#1E78D4" stopOpacity="0.46" />
                        </linearGradient>
                    </defs>
                    {/* Ondas senoidais PERIÓDICAS (período 800): cada uma desliza 800u
                        em loop linear => fluxo contínuo sem emenda. Velocidades distintas
                        dão profundidade. O blur (CSS) difunde; o grão vem do ::after. */}
                    <g className="wave-art" fill="none" strokeLinecap="round">
                        <path
                            className="wave-line wave-line--a"
                            d="M-800,196 Q-600,136 -400,196 Q-200,256 0,196 Q200,136 400,196 Q600,256 800,196 Q1000,136 1200,196 Q1400,256 1600,196 Q1800,136 2000,196 Q2200,256 2400,196"
                            stroke="url(#lpWaveA)"
                            strokeWidth="118"
                        />
                        <path
                            className="wave-line wave-line--b"
                            d="M-800,232 Q-600,277 -400,232 Q-200,187 0,232 Q200,277 400,232 Q600,187 800,232 Q1000,277 1200,232 Q1400,187 1600,232 Q1800,277 2000,232 Q2200,187 2400,232"
                            stroke="url(#lpWaveB)"
                            strokeWidth="62"
                        />
                    </g>
                </svg>
            </div>

            <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-5xl flex-col justify-start px-4 sm:px-6 lg:px-8 pt-[19vh] pb-[26vh]">
                {/* ── CENTRO: headline + sub + CTA (composição centrada, espírito handhold) ── */}
                <div className="mx-auto w-full max-w-3xl text-center">
                    {/* LP.6: headline em Sentient roman (display serif leve e grande,
                        espírito handhold). Acento "cada conversa." mantém a voz itálica
                        azul com a sublinha viva. */}
                    <h1
                        className="lp-display landing-fade-in-up-lg landing-delay-100"
                        style={{
                            fontSize: "clamp(2.7rem, 7.4vw, 5.4rem)",
                            lineHeight: 1.03,
                            letterSpacing: "-0.025em",
                            color: "var(--lp-ink)",
                        }}
                    >
                        {HERO_COPY.line1}
                        <br />
                        <span
                            className="lp-serif lp-underline"
                            style={{
                                letterSpacing: "-0.02em",
                                color: "var(--lp-blue)",
                                paddingRight: "0.04em",
                            }}
                        >
                            {HERO_COPY.line2}
                        </span>
                    </h1>

                    <p
                        className="mx-auto mt-8 max-w-[600px] landing-fade-in-up landing-delay-200"
                        style={{
                            fontSize: "clamp(1.0625rem, 1.9vw, 1.1875rem)",
                            lineHeight: 1.65,
                            color: "var(--lp-ink-70)",
                            fontWeight: 400,
                        }}
                    >
                        {HERO_COPY.subtitle}
                    </p>

                    <div className="mt-10 flex flex-col items-center gap-3.5 landing-fade-in-up landing-delay-400">
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
                        <p className="text-[13px] leading-snug" style={{ color: "var(--lp-ink-55)", fontWeight: 500 }}>
                            Gratuita e personalizada para o contexto da sua agência.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
