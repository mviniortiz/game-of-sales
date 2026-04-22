import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { MonitorPlay, Calendar } from "lucide-react";
import { LandingButton } from "./LandingButton";
import { trackEvent } from "@/lib/analytics";

const HeroDashboardMockup = lazy(() =>
    import("./HeroDashboardMockup").then((m) => ({ default: m.HeroDashboardMockup }))
);

// Headline adapta a intenção do tráfego. Em CPC a pessoa já está em modo
// comparação transacional, então mostramos features/comparação em vez de
// benefício abstrato de adoção. Ver docs/landing-experiments.md para contexto.
type HeroVariant = "default" | "crm" | "alternativa";

const HERO_COPY: Record<HeroVariant, { pre: string; highlights: string[]; subtitle: string }> = {
    default: {
        pre: "O primeiro CRM que seu time abre ",
        highlights: ["sem reclamar.", "sem cobrar.", "todo dia útil."],
        subtitle:
            "Cada venda do seu checkout cai no pipeline, o ranking sobe e cada vendedor enxerga quanto falta pra bater meta. Em 5 minutos no ar. Sem planilha, sem cobrar atualização no grupo.",
    },
    crm: {
        pre: "CRM de vendas com ",
        highlights: ["ranking ao vivo.", "IA integrada.", "WhatsApp nativo.", "checkout conectado."],
        subtitle:
            "Pipeline que atualiza sozinho pelo checkout, ranking ao vivo, IA que analisa seu funil e mensagens caindo no Pulse. Em 5 minutos no ar, 14 dias grátis.",
    },
    alternativa: {
        pre: "A alternativa nacional ao ",
        highlights: ["RD Station CRM.", "Pipedrive.", "Ploomes."],
        subtitle:
            "Mesmo pipeline e relatórios, com ranking gamificado, IA que responde no Pulse e checkout já integrado. Preço em real, suporte humano no WhatsApp, sem planilha paralela.",
    },
};

function pickHeroVariant(): HeroVariant {
    if (typeof window === "undefined") return "default";
    try {
        const params = new URLSearchParams(window.location.search);
        const isPaidGoogle = params.has("gclid") || params.get("utm_source") === "google";
        if (!isPaidGoogle) return "default";
        const term = (params.get("utm_term") || "").toLowerCase();
        if (/rd\s?station|alternativ|pipedrive|hubspot|ploomes|agendor/.test(term)) return "alternativa";
        return "crm";
    } catch {
        return "default";
    }
}

const MockupFallback = () => (
    <div
        className="rounded-2xl w-full"
        style={{
            background: "#0d1117",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px -12px rgba(0,0,0,0.7)",
            minHeight: 280,
        }}
    />
);

interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onScheduleDemoClick?: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onDemoClick, onScheduleDemoClick }: HeroSectionProps) => {
    const variant = useMemo(pickHeroVariant, []);
    const copy = HERO_COPY[variant];
    const [typed, setTyped] = useState<string>(() => copy.highlights[0] || "");
    const [isDeleting, setIsDeleting] = useState(false);
    const [typeIndex, setTypeIndex] = useState(0);

    useEffect(() => {
        try {
            trackEvent("hero_variant_shown", { variant });
        } catch {
            /* analytics never breaks UX */
        }
    }, [variant]);

    useEffect(() => {
        if (copy.highlights.length <= 1) return;
        const current = copy.highlights[typeIndex];
        const fullyTyped = !isDeleting && typed === current;
        const fullyDeleted = isDeleting && typed === "";

        let delay: number;
        if (fullyTyped) delay = 1800;
        else if (fullyDeleted) delay = 220;
        else if (isDeleting) delay = 32;
        else delay = 55 + Math.random() * 35;

        const t = window.setTimeout(() => {
            if (fullyTyped) {
                setIsDeleting(true);
            } else if (fullyDeleted) {
                setIsDeleting(false);
                setTypeIndex((i) => (i + 1) % copy.highlights.length);
            } else if (isDeleting) {
                setTyped((s) => s.slice(0, -1));
            } else {
                setTyped(current.slice(0, typed.length + 1));
            }
        }, delay);

        return () => clearTimeout(t);
    }, [typed, isDeleting, typeIndex, copy.highlights]);

    return (
        <section className="relative overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
            {/* Background */}
            <div className="absolute inset-0">
                <div
                    className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,227,122,0.22) 0%, rgba(0,227,122,0.08) 30%, transparent 65%)",
                    }}
                />
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-[1400px] h-[900px] rounded-full pointer-events-none"
                    style={{
                        top: "120px",
                        background: "radial-gradient(ellipse, rgba(0,227,122,0.14) 0%, rgba(0,227,122,0.04) 35%, transparent 60%)",
                        contain: "layout paint",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "80px 80px",
                    }}
                />
                <div
                    className="absolute top-0 inset-x-0 h-32"
                    style={{ background: "linear-gradient(to bottom, rgba(6,8,10,0.85), transparent)" }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="pt-32 sm:pt-40 pb-16 sm:pb-20 text-center">
                    {/* Headline */}
                    <h1
                        className="font-heading mx-auto landing-fade-in-up landing-delay-100"
                        style={{
                            fontSize: "clamp(2.25rem, 6.5vw, 4.5rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            maxWidth: "820px",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                            {copy.pre}
                        </span>
                        <span
                            aria-hidden="true"
                            className="hero-typing-highlight"
                            style={{
                                fontWeight: 900,
                                background: "linear-gradient(135deg, #33FF9E, #00E37A, #14b8a6)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                display: "inline-block",
                            }}
                        >
                            {typed}
                            <span className="hero-typing-cursor">|</span>
                        </span>
                        <span className="sr-only">{copy.highlights[0]}</span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="mt-6 mx-auto max-w-2xl landing-fade-in-up landing-delay-200"
                        style={{
                            fontSize: "clamp(1rem, 2vw, 1.2rem)",
                            lineHeight: 1.7,
                            color: "rgba(255,255,255,0.7)",
                        }}
                    >
                        {copy.subtitle}
                    </p>

                    {/* CTAs — anchors, não buttons: clique antes da hidratação ainda navega via href nativo */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-10 w-full max-w-md mx-auto sm:max-w-none landing-fade-in-up landing-delay-300">
                        <LandingButton
                            href="#agendar-demo"
                            onClick={(e) => {
                                if (onScheduleDemoClick || onCTAClick) {
                                    e.preventDefault();
                                    (onScheduleDemoClick || onCTAClick)();
                                }
                            }}
                            variant="primary"
                            size="lg"
                            icon={<Calendar className="h-4 w-4" strokeWidth={2} />}
                            showArrow
                        >
                            Agendar demonstração
                        </LandingButton>

                        <LandingButton
                            href="#how-it-works"
                            onClick={(e) => {
                                if (onDemoClick) {
                                    e.preventDefault();
                                    onDemoClick();
                                }
                            }}
                            variant="secondary"
                            size="lg"
                            icon={<MonitorPlay className="h-4 w-4" strokeWidth={2} />}
                        >
                            Ver como funciona
                        </LandingButton>
                    </div>

                    {/* Trust row */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-12 landing-fade-in landing-delay-400">
                        {["14 dias grátis pra testar", "Pronto em 5 minutos", "Suporte humano no WhatsApp"].map((t) => (
                            <span key={t} className="flex items-center gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Product mockup — lazy */}
                <div className="relative max-w-4xl mx-auto pb-4 hidden sm:block landing-fade-in-up landing-delay-500">
                    <div
                        className="absolute -inset-16 -z-10 rounded-3xl"
                        style={{
                            background: "radial-gradient(ellipse at center, rgba(0,227,122,0.1) 0%, transparent 55%)",
                        }}
                    />
                    <Suspense fallback={<MockupFallback />}>
                        <HeroDashboardMockup />
                    </Suspense>
                </div>
            </div>

            {/* Bottom fade */}
            <div
                className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent, var(--vyz-bg))" }}
            />

            <style>{`
                .hero-typing-cursor {
                    display: inline-block;
                    margin-left: 0.04em;
                    font-weight: 400;
                    animation: heroTypingBlink 0.85s step-end infinite;
                }
                @keyframes heroTypingBlink {
                    0%, 55% { opacity: 1; }
                    56%, 100% { opacity: 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .hero-typing-cursor { animation: none; opacity: 1; }
                }
            `}</style>
        </section>
    );
};
