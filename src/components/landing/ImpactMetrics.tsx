import { AnimatedCounter } from "./AnimatedCounter";

const METRICS = [
    { prefix: "<", value: 5, suffix: "min", label: "Para configurar", delayClass: "" },
    { prefix: "", value: 24, suffix: "/7", label: "Ranking ao vivo", delayClass: "landing-delay-100" },
    { prefix: "", value: 8, suffix: "+", label: "Integrações nativas", delayClass: "landing-delay-200" },
    { prefix: "", value: 0, suffix: "", label: "Planilhas manuais", isZero: true, delayClass: "landing-delay-300" },
] as const;

export const ImpactMetrics = () => {
    return (
        <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
                    {METRICS.map((m) => {
                        const isZero = "isZero" in m && m.isZero;
                        return (
                            <div
                                key={m.label}
                                className={`text-center landing-fade-in-up ${m.delayClass}`}
                            >
                                <div
                                    className="flex items-baseline justify-center gap-0.5 mb-1.5 tabular-nums"
                                    style={{
                                        fontSize: isZero ? "clamp(2.3rem, 4.6vw, 3.15rem)" : "clamp(2rem, 4vw, 2.75rem)",
                                        fontWeight: isZero ? 800 : 700,
                                        letterSpacing: "-0.035em",
                                        color: isZero ? "#34d399" : "rgba(255,255,255,0.95)",
                                    }}
                                >
                                    {m.prefix && (
                                        <span style={{ fontSize: "0.6em", color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>
                                            {m.prefix}
                                        </span>
                                    )}
                                    {isZero ? (
                                        <span>ZERO</span>
                                    ) : (
                                        <AnimatedCounter target={m.value} duration={1.6} className="inline" />
                                    )}
                                    {m.suffix && (
                                        <span className="text-emerald-400" style={{ fontSize: "0.55em", fontWeight: 700 }}>
                                            {m.suffix}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                                    {m.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
