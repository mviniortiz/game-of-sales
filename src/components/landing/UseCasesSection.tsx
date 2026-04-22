import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Trophy, Link2, Check } from "lucide-react";

// ─── Cases data ──────────────────────────────────────────────────────────────
const CASES = [
    {
        icon: BarChart3,
        tag: "Gestor Comercial",
        title: "Visibilidade total, sem ficar cobrando",
        description:
            "Painel ao vivo com faturamento, ticket médio, taxa de conversão e show rate. Enxergue quem está performando e se o time vai bater meta — tudo em tempo real.",
        bullets: [
            "Painel com KPIs ao vivo",
            "Funil de calls (agendamento → show → venda)",
            "Metas do time consolidadas",
        ],
    },
    {
        icon: Trophy,
        tag: "Vendedor",
        title: "Competição que motiva sem pressão",
        description:
            "Ranking com níveis, pódio ao vivo e meta individual. Cada venda fechada faz você subir. Acompanhe seu progresso e seus deals no pipeline.",
        bullets: [
            "Ranking com níveis e pódio",
            "Pipeline pessoal de deals",
            "Meta individual com progresso",
        ],
    },
    {
        icon: Link2,
        tag: "Dono de Infoproduto",
        title: "Vendas automáticas, zero trabalho manual",
        description:
            "Conecta seu checkout via webhook. Cada venda aprovada cai no painel e atualiza o ranking automaticamente. Sem copia-e-cola.",
        bullets: [
            "Sincronização automática via webhook",
            "Painel de receita ao vivo",
            "Extensão Chrome pro WhatsApp",
        ],
    },
] as const;

// ─── UseCasesSection ─────────────────────────────────────────────────────────
export const UseCasesSection = () => {
    const [active, setActive] = useState(0);

    return (
        <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
            {/* Green spotlight from top */}
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                }}
            />
            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ y: 20 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}
                    >
                        PARA QUEM É
                    </span>

                    <h2
                        className="font-heading mb-4"
                        style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}
                    >
                        Funciona pro{" "}
                        <span className="text-emerald-400">seu time</span>
                    </h2>

                    <p className="max-w-lg mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
                        Gestor ganha visibilidade. Vendedor ganha motivação. Dono de infoproduto ganha controle.
                    </p>
                </motion.div>

                {/* Tab selector */}
                <div className="flex justify-center mb-10 sm:mb-12 px-2">
                    <div
                        className="inline-flex gap-1 p-1 rounded-xl max-w-full overflow-x-auto no-scrollbar"
                        style={{ background: "rgba(255,255,255,0.04)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                    >
                        {CASES.map((c, i) => {
                            const Icon = c.icon;
                            const isActive = active === i;
                            return (
                                <button
                                    key={c.tag}
                                    onClick={() => setActive(i)}
                                    className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-colors"
                                    style={{ fontWeight: 600, color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)" }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="usecase-pill"
                                            className="absolute inset-0 rounded-lg"
                                            style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                        />
                                    )}
                                    <Icon className={`relative h-4 w-4 ${isActive ? "text-emerald-400" : ""}`} strokeWidth={2} />
                                    <span className="relative">{c.tag}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {CASES.map((c, i) => {
                        if (i !== active) return null;
                        return (
                            <motion.div
                                key={c.tag}
                                className="max-w-2xl mx-auto"
                                initial={{ y: 12 }}
                                animate={{ y: 0 }}
                                exit={{ y: -12 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h3
                                    className="font-heading text-center mb-4"
                                    style={{ fontWeight: 700, fontSize: "clamp(1.25rem, 3vw, 1.6rem)", lineHeight: 1.2, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.95)" }}
                                >
                                    {c.title}
                                </h3>

                                <p className="text-center mb-8 leading-relaxed" style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.45)" }}>
                                    {c.description}
                                </p>

                                <ul className="grid sm:grid-cols-3 gap-4">
                                    {c.bullets.map((b) => (
                                        <li
                                            key={b}
                                            className="flex items-start gap-3 rounded-xl p-4"
                                            style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                                        >
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(0,227,122,0.1)" }}>
                                                <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />
                                            </div>
                                            <span className="text-sm" style={{ fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default UseCasesSection;
