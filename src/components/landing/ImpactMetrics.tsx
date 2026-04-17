import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

const METRICS = [
    { prefix: "<", value: 5, suffix: "min", label: "Para configurar", delay: 0 },
    { prefix: "", value: 24, suffix: "/7", label: "Ranking ao vivo", delay: 0.1 },
    { prefix: "", value: 8, suffix: "+", label: "Módulos completos", delay: 0.2 },
    { prefix: "", value: 0, suffix: "", label: "Planilhas manuais", isZero: true, delay: 0.3 },
] as const;

export const ImpactMetrics = () => {
    return (
        <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
                    {METRICS.map((m) => {
                        const isZero = "isZero" in m && m.isZero;
                        return (
                            <motion.div
                                key={m.label}
                                className="text-center"
                                initial={{ y: 16 }}
                                whileInView={{ y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: m.delay }}
                            >
                                <div
                                    className="flex items-baseline justify-center gap-0.5 mb-1.5 tabular-nums"
                                    style={{
                                        fontSize: "clamp(2rem, 4vw, 2.75rem)",
                                        fontWeight: 800,
                                        letterSpacing: "-0.03em",
                                        color: "rgba(255,255,255,0.95)",
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
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
