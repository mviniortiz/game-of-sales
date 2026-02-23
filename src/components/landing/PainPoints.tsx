import { motion } from "framer-motion";
import { Clock, TrendingDown, AlertTriangle, Check, X, ChevronRight } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const COMPARISONS = [
    {
        icon: Clock,
        before: "Horas em planilhas",
        beforeDesc: "Todo dia alguém atualizando Excel. E ainda erra.",
        after: "Atualização automática",
        afterDesc: "Cada venda já entra no ranking sozinha, em segundos.",
        delay: 0,
    },
    {
        icon: TrendingDown,
        before: "Time desmotivado",
        beforeDesc: "Sem visibilidade, ninguém sabe se está ganhando.",
        after: "Competição saudável",
        afterDesc: "Ranking ao vivo que move o time sem você cobrar.",
        delay: 0.1,
    },
    {
        icon: AlertTriangle,
        before: "Cobrança diária do gestor",
        beforeDesc: "Você tem que lembrar todo mundo das metas. Todo. Dia.",
        after: "Time se autogestiona",
        afterDesc: "Ninguém quer ficar pra trás. O sistema motiva sozinho.",
        delay: 0.2,
    },
];

// ─── PainPoints ───────────────────────────────────────────────────────────────
export const PainPoints = () => {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
            {/* Background texture */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 20% 50%, rgba(239,68,68,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(16,185,129,0.03) 0%, transparent 50%)",
                }}
            />

            <div className="max-w-5xl mx-auto relative z-10">

                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="text-label inline-block text-xs text-red-400/80 border border-red-500/15 bg-red-500/5 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "var(--ls-widest)" }}
                    >
                        ISSO PARECE FAMILIAR?
                    </span>
                    <h2 className="text-heading text-3xl sm:text-4xl text-white">
                        Gestão de vendas{" "}
                        <span className="text-red-400">não deveria ser assim</span>
                    </h2>
                </motion.div>

                {/* Comparison rows */}
                <div className="space-y-4">
                    {COMPARISONS.map(({ icon: Icon, before, beforeDesc, after, afterDesc, delay }, i) => (
                        <motion.div
                            key={i}
                            className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch"
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {/* ── BEFORE card ── */}
                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-red-500/5 border border-red-500/10 group hover:border-red-500/25 transition-colors duration-300">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <Icon className="h-5 w-5 text-red-400" strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" strokeWidth={3} />
                                        <p
                                            className="text-white/90 text-sm"
                                            style={{ fontWeight: "var(--fw-semibold)" }}
                                        >
                                            {before}
                                        </p>
                                    </div>
                                    <p className="text-body text-xs text-red-300/50 leading-relaxed">
                                        {beforeDesc}
                                    </p>
                                </div>
                            </div>

                            {/* ── Arrow separator ── */}
                            <div className="hidden md:flex items-center justify-center">
                                <motion.div
                                    className="w-8 h-8 rounded-full bg-slate-800 border border-white/8 flex items-center justify-center"
                                    animate={{ x: [0, 3, 0] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 }}
                                >
                                    <ChevronRight className="h-4 w-4 text-white/30" />
                                </motion.div>
                            </div>

                            {/* ── AFTER card ── */}
                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/25 transition-colors duration-300">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    <Icon className="h-5 w-5 text-emerald-400" strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" strokeWidth={3} />
                                        <p
                                            className="text-white/90 text-sm"
                                            style={{ fontWeight: "var(--fw-semibold)" }}
                                        >
                                            {after}
                                        </p>
                                    </div>
                                    <p className="text-body text-xs text-emerald-300/50 leading-relaxed">
                                        {afterDesc}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bridge to next section */}
                <motion.div
                    className="mt-16 flex flex-col items-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <p
                        className="text-white/70 mb-1"
                        style={{ fontWeight: "var(--fw-medium)", fontSize: "1.0625rem" }}
                    >
                        Existe uma forma{" "}
                        <span className="text-emerald-400" style={{ fontWeight: "var(--fw-bold)" }}>
                            melhor.
                        </span>
                    </p>
                    <p className="text-caption text-xs text-white/30 mb-8">
                        Um sistema que resolve esses 3 problemas em menos de 5 minutos.
                    </p>

                    {/* Animated gradient line */}
                    <div className="relative h-16 w-px overflow-hidden">
                        <div className="absolute inset-0 bg-white/5" />
                        <motion.div
                            className="absolute top-0 left-0 right-0 h-full"
                            style={{
                                background: "linear-gradient(to bottom, rgba(16,185,129,0.6), transparent)",
                            }}
                            animate={{ y: ["-100%", "200%"] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
