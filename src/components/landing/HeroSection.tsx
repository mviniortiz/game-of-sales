import { lazy, Suspense } from "react";
import { ArrowRight, Play, Calendar } from "lucide-react";

const HeroDashboardMockup = lazy(() =>
    import("./HeroDashboardMockup").then((m) => ({ default: m.HeroDashboardMockup }))
);

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
    return (
        <section className="relative overflow-hidden" style={{ background: "#06080a" }}>
            {/* Background */}
            <div className="absolute inset-0">
                <div
                    className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.08) 30%, transparent 65%)",
                    }}
                />
                <div
                    className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[1400px] h-[900px] rounded-full pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.04) 35%, transparent 60%)",
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
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2 mb-6 landing-fade-in-up landing-delay-100">
                        <button
                            type="button"
                            onClick={() => {
                                document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className="text-[11px] px-3.5 py-1 rounded-full cursor-pointer hero-eyebrow"
                            style={{
                                color: "rgba(52,211,153,0.9)",
                                background: "rgba(16,185,129,0.08)",
                                border: "1px solid rgba(16,185,129,0.15)",
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                            }}
                        >
                            CRM GAMIFICADO • INTEGRA HOTMART, KIWIFY E GREENN
                        </button>
                    </div>

                    {/* Headline */}
                    <h1
                        className="font-heading mx-auto landing-fade-in-up landing-delay-200"
                        style={{
                            fontSize: "clamp(2.25rem, 6.5vw, 4.5rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            maxWidth: "820px",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                            Seu time bate meta quando{" "}
                        </span>
                        <span
                            style={{
                                fontWeight: 900,
                                background: "linear-gradient(135deg, #34d399, #10b981, #14b8a6)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            enxerga o placar.
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="mt-6 mx-auto max-w-2xl landing-fade-in-up landing-delay-300"
                        style={{
                            fontSize: "clamp(1rem, 2vw, 1.2rem)",
                            lineHeight: 1.7,
                            color: "rgba(255,255,255,0.7)",
                        }}
                    >
                        Vyzon conecta os seus checkouts ao time de vendas e mostra em tempo real
                        quem tá fechando, quem tá travado e onde o time precisa de ajuda.
                        Ranking ao vivo, pipeline visual e pronto em 5 minutos.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-10 w-full max-w-md mx-auto sm:max-w-none landing-fade-in-up landing-delay-400">
                        <button
                            onClick={onScheduleDemoClick || onCTAClick}
                            className="hero-cta-primary group relative inline-flex items-center justify-center gap-2.5 px-5 sm:px-7 py-3.5 text-sm sm:text-[15px] font-bold text-white rounded-xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                            }}
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Calendar className="relative h-4 w-4" />
                            <span className="relative">Agendar demonstração</span>
                            <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={onDemoClick}
                            className="hero-cta-secondary flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm sm:text-[15px]"
                            style={{
                                color: "rgba(255,255,255,0.55)",
                                background: "rgba(255,255,255,0.04)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                                fontWeight: 500,
                            }}
                        >
                            <Play className="h-4 w-4" fill="currentColor" />
                            Ver como funciona
                        </button>
                    </div>

                    {/* Trust row */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-8 landing-fade-in landing-delay-500">
                        {["14 dias grátis pra testar", "Pronto em 5 minutos", "Suporte humano no WhatsApp"].map((t) => (
                            <span key={t} className="flex items-center gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Product mockup — lazy */}
                <div className="relative max-w-4xl mx-auto pb-4 hidden sm:block landing-fade-in-up landing-delay-600">
                    <div
                        className="absolute -inset-16 -z-10 rounded-3xl"
                        style={{
                            background: "radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 55%)",
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
                style={{ background: "linear-gradient(to bottom, transparent, #06080a)" }}
            />
        </section>
    );
};
