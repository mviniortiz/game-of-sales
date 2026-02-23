import { motion } from "framer-motion";
import { TrendingUp, Clock, Users, Trophy, LayoutGrid } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

// ─── Metric definitions — números reais e críveis ─────────────────────────────
const METRICS = [
    {
        icon: TrendingUp,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-400/10",
        prefix: "+",
        value: 27,
        suffix: "%",
        label: "Aumento em vendas",
        sublabel: "média no primeiro mês",
        delay: 0,
    },
    {
        icon: Users,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-400/10",
        prefix: "",
        value: 89,
        suffix: "+",
        label: "Times ativos",
        sublabel: "em empresas brasileiras",
        delay: 0.1,
    },
    {
        icon: Clock,
        iconColor: "text-amber-400",
        iconBg: "bg-amber-400/10",
        prefix: "<",
        value: 5,
        suffix: " min",
        label: "Para começar",
        sublabel: "sem linha de código",
        delay: 0.2,
    },
    {
        icon: Trophy,
        iconColor: "text-amber-400",
        iconBg: "bg-amber-400/10",
        prefix: "",
        value: 94,
        suffix: "%",
        label: "Satisfação",
        sublabel: "avaliado pelos gestores",
        delay: 0.3,
    },
    {
        icon: LayoutGrid,
        iconColor: "text-emerald-400",
        iconBg: "bg-emerald-400/10",
        prefix: "",
        value: 0,
        suffix: "",
        label: "Planilhas manuais",
        sublabel: "seu time não usa mais",
        isZero: true,
        delay: 0.4,
    },
] as const;

// ─── ImpactMetrics ────────────────────────────────────────────────────────────
export const ImpactMetrics = () => {
    return (
        <section className="relative py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Top glow border */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-2xl"
                style={{
                    background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)",
                }}
            />
            {/* Bottom glow border */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-2xl"
                style={{
                    background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)",
                }}
            />

            {/* Background subtle glow */}
            <div
                className="absolute inset-0 -z-10"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.04), transparent)",
                }}
            />

            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-white/5">
                    {METRICS.map(({ icon: Icon, iconColor, iconBg, prefix, value, suffix, label, sublabel, delay, ...rest }) => {
                        const isZero = "isZero" in rest && rest.isZero;
                        return (
                            <motion.div
                                key={label}
                                className="flex flex-col items-center text-center px-4 py-2 group"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {/* Icon pill */}
                                <div
                                    className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110`}
                                >
                                    <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={2} />
                                </div>

                                {/* Number row */}
                                <div
                                    className="flex items-baseline justify-center gap-0.5 mb-1 tabular-nums text-white"
                                    style={{
                                        fontWeight: "var(--fw-bold)",
                                        letterSpacing: "var(--ls-snug)",
                                        lineHeight: "var(--lh-tight)",
                                        fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                                    }}
                                >
                                    {prefix && (
                                        <span
                                            className="text-white/40"
                                            style={{ fontWeight: "var(--fw-light)", fontSize: "0.65em" }}
                                        >
                                            {prefix}
                                        </span>
                                    )}

                                    {isZero ? (
                                        <span className="text-white/70" style={{ fontWeight: "var(--fw-bold)" }}>
                                            ZERO
                                        </span>
                                    ) : (
                                        <AnimatedCounter
                                            target={value}
                                            duration={1.8}
                                            className="inline"
                                        />
                                    )}

                                    {suffix && (
                                        <span
                                            className={`${iconColor} ml-0.5`}
                                            style={{
                                                fontWeight: "var(--fw-semibold)",
                                                fontSize: "0.6em",
                                                letterSpacing: 0,
                                            }}
                                        >
                                            {suffix}
                                        </span>
                                    )}
                                </div>

                                {/* Label */}
                                <p
                                    className="text-white/80 mb-0.5 text-sm"
                                    style={{ fontWeight: "var(--fw-semibold)" }}
                                >
                                    {label}
                                </p>

                                {/* Sublabel */}
                                <p
                                    className="text-white/35 text-xs"
                                    style={{ fontWeight: "var(--fw-light)" }}
                                >
                                    {sublabel}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
