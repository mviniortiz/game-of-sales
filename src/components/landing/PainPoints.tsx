import { motion } from "framer-motion";
import { Clock, TrendingDown, AlertTriangle, Check, X, ArrowRight } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const COMPARISONS = [
    {
        icon: Clock,
        before: "Pipeline invisível",
        beforeDesc: "Deals espalhados em planilhas, WhatsApp e cabeça do vendedor. Ninguém sabe o status real.",
        after: "Pipeline visual Kanban",
        afterDesc: "Drag & drop intuitivo. Todo deal visível, do lead ao fechamento, em tempo real.",
        delay: 0,
    },
    {
        icon: TrendingDown,
        before: "Time sem meta clara",
        beforeDesc: "Vendedores não sabem quanto falta pra bater a meta. Gestor cobra todo dia.",
        after: "Metas e ranking ao vivo",
        afterDesc: "Cada vendedor vê sua meta, seu progresso e sua posição no ranking. Motivação automática.",
        delay: 0.1,
    },
    {
        icon: AlertTriangle,
        before: "Vendas caem no vácuo",
        beforeDesc: "Hotmart aprovou, mas ninguém registrou. Kiwify vendeu, mas o dashboard não sabe.",
        after: "Sync automático de vendas",
        afterDesc: "Webhooks com Hotmart, Kiwify e Greenn. A venda chega, o ranking atualiza, o dashboard reflete.",
        delay: 0.2,
    },
];

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" as const },
    transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

// ─── PainPoints ───────────────────────────────────────────────────────────────
export const PainPoints = () => {
    return (
        <section className="py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <motion.div className="text-center mb-20" {...fadeUp()}>
                    <p
                        className="text-xs uppercase mb-4 tracking-widest"
                        style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.35)" }}
                    >
                        Isso parece familiar?
                    </p>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Seu processo de vendas{" "}
                        <span className="text-red-400">não deveria ser assim</span>
                    </h2>
                </motion.div>

                {/* Comparison rows */}
                <div className="space-y-6">
                    {COMPARISONS.map(({ icon: Icon, before, beforeDesc, after, afterDesc, delay }, i) => (
                        <motion.div
                            key={i}
                            className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch"
                            {...fadeUp(delay)}
                        >
                            {/* Before */}
                            <div
                                className="flex items-start gap-3.5 rounded-xl p-5"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                            >
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: "rgba(239,68,68,0.15)" }}
                                >
                                    <Icon className="h-[18px] w-[18px] text-red-400" strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <X className="h-3.5 w-3.5 text-red-400 shrink-0" strokeWidth={2.5} />
                                        <p
                                            className="text-sm"
                                            style={{ fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.95)" }}
                                        >
                                            {before}
                                        </p>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                                        {beforeDesc}
                                    </p>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="hidden md:flex items-center justify-center px-1">
                                <ArrowRight className="h-4 w-4" style={{ color: "rgba(255,255,255,0.2)" }} strokeWidth={1.5} />
                            </div>

                            {/* After */}
                            <div
                                className="flex items-start gap-3.5 rounded-xl p-5"
                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                            >
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: "rgba(16,185,129,0.15)" }}
                                >
                                    <Icon className="h-[18px] w-[18px] text-emerald-400" strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
                                        <p
                                            className="text-sm"
                                            style={{ fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.95)" }}
                                        >
                                            {after}
                                        </p>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                                        {afterDesc}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bridge */}
                <motion.div
                    className="mt-20 flex flex-col items-center text-center"
                    {...fadeUp(0.4)}
                >
                    <p
                        style={{ fontWeight: "var(--fw-medium)", fontSize: "1.0625rem", color: "rgba(255,255,255,0.95)" }}
                    >
                        Existe uma forma{" "}
                        <span className="text-emerald-400" style={{ fontWeight: "var(--fw-bold)" }}>
                            melhor.
                        </span>
                    </p>
                    <p className="text-xs mt-1 mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Um CRM completo que resolve tudo isso — e se configura em 5 minutos.
                    </p>
                    <div className="h-12 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                </motion.div>
            </div>
        </section>
    );
};
