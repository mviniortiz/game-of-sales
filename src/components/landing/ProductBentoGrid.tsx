import { motion } from "framer-motion";
import { Trophy, Zap, MessageCircle, Crown, TrendingUp, Bell } from "lucide-react";

// ─── Shared card wrapper (plain div + CSS hover) ────────────────────────────
interface BentoCardProps {
    children: React.ReactNode;
    className?: string;
}

const BentoCard = ({ children, className = "" }: BentoCardProps) => (
    <div
        className={`relative rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-1 ${className}`}
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
        {children}
    </div>
);

// ─── Fade-in props (used only on section header) ─────────────────────────────
const fadeIn = () => ({
    initial: { opacity: 0, y: 16 } as const,
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true } as const,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
});

// ─── ProductBentoGrid ─────────────────────────────────────────────────────────
export const ProductBentoGrid = () => {
    return (
        <section id="features" className="py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <motion.div className="text-center mb-20" {...fadeIn()}>
                    <span
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{ fontWeight: "var(--fw-medium)", letterSpacing: "0.06em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                    >
                        <Zap className="h-3 w-3" />
                        ARSENAL COMPLETO
                    </span>
                    <h2
                        className="font-heading mb-4"
                        style={{
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Tudo que seu time precisa.{" "}
                        <span className="text-emerald-400">Num lugar só.</span>
                    </h2>
                    <p
                        className="max-w-xl mx-auto"
                        style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(255,255,255,0.45)" }}
                    >
                        CRM, ranking, metas, calendário, ligações e integrações.{" "}
                        <span style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.85)" }}>
                            Sem ficar pulando de aba
                        </span>
                        .
                    </p>
                </motion.div>

                {/* Bento grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-auto">

                    {/* ── Card 1: Ranking ao Vivo — TALL ── */}
                    <BentoCard className="lg:row-span-2 p-8 flex flex-col">
                        <div className="flex-1 flex items-center justify-center mb-8">
                            <div className="relative">
                                {/* Badge */}
                                <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                                    <Crown className="h-6 w-6 text-amber-400 mb-0.5" strokeWidth={2} />
                                    <span
                                        className="text-amber-400"
                                        style={{ fontWeight: "var(--fw-bold)", fontSize: "1.25rem" }}
                                    >
                                        #1
                                    </span>
                                </div>

                                {/* Rank list preview */}
                                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 w-40">
                                    {[
                                        { initials: "CM", name: "Carlos M.", pts: "8.9k", dot: "bg-amber-400" },
                                        { initials: "AL", name: "Ana L.", pts: "6.1k", dot: "bg-emerald-400" },
                                        { initials: "BS", name: "Bruno S.", pts: "4.5k", dot: "bg-gray-400" },
                                    ].map((p) => (
                                        <div
                                            key={p.initials}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full ${p.dot} flex items-center justify-center flex-shrink-0`}
                                            >
                                                <span
                                                    className="text-white"
                                                    style={{ fontSize: "7px", fontWeight: "var(--fw-bold)" }}
                                                >
                                                    {p.initials}
                                                </span>
                                            </div>
                                            <span
                                                className="flex-1"
                                                style={{ fontSize: "10px", fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.55)" }}
                                            >
                                                {p.name}
                                            </span>
                                            <span
                                                className="text-emerald-400"
                                                style={{ fontSize: "10px", fontWeight: "var(--fw-semibold)" }}
                                            >
                                                {p.pts}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-16">
                            <span
                                className="text-[10px] text-amber-400 rounded-full px-2.5 py-0.5 mb-3 inline-block"
                                style={{ fontWeight: "var(--fw-medium)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
                            >
                                Destaque
                            </span>
                            <h3
                                className="font-heading mb-2"
                                style={{ fontWeight: "var(--fw-bold)", fontSize: "1.125rem", letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}
                            >
                                Ranking ao Vivo
                            </h3>
                            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                                Pódio ao vivo com níveis Bronze, Prata, Ouro, Platina e Diamante. Cada venda
                                sobe o placar na hora. Seu time compete — e vende mais.
                            </p>
                        </div>
                    </BentoCard>

                    {/* ── Card 2: Vendas em Tempo Real ── */}
                    <BentoCard className="p-6">
                        <div className="relative h-28 flex items-center justify-center mb-5">
                            <div
                                className="rounded-xl px-4 py-3"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p
                                            className="text-xs"
                                            style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.45)" }}
                                        >
                                            Venda Aprovada
                                        </p>
                                        <p
                                            className="text-emerald-400"
                                            style={{ fontWeight: "var(--fw-bold)", fontSize: "0.9375rem" }}
                                        >
                                            + R$ 297,00
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <h3
                            className="font-heading mb-1.5"
                            style={{ fontWeight: "var(--fw-bold)", fontSize: "1.0625rem", letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}
                        >
                            Vendas em Tempo Real
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                            Vendeu no Hotmart, Kiwify ou Greenn? Cai no painel em segundos via webhook. Zero
                            digitação manual.
                        </p>
                    </BentoCard>

                    {/* ── Card 3: Metas & Gamificação ── */}
                    <BentoCard className="p-6">
                        <div className="relative mb-5 space-y-3">
                            {[
                                { label: "Meta Diária", pct: 89, color: "bg-emerald-500" },
                                { label: "Meta Semanal", pct: 64, color: "bg-emerald-400" },
                                { label: "Meta Mensal", pct: 41, color: "bg-gray-500" },
                            ].map(({ label, pct, color }, i) => (
                                <div key={label}>
                                    <div className="flex justify-between mb-1">
                                        <span
                                            style={{ fontSize: "10px", fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.45)" }}
                                        >
                                            {label}
                                        </span>
                                        <span
                                            style={{ fontSize: "10px", fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.6)" }}
                                        >
                                            {pct}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                        <motion.div
                                            className={`h-full ${color} rounded-full`}
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${pct}%` }}
                                            viewport={{ once: true }}
                                            transition={{
                                                delay: 0.3 + i * 0.1,
                                                duration: 0.8,
                                                ease: "easeOut",
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <h3
                            className="font-heading mb-1.5"
                            style={{ fontWeight: "var(--fw-bold)", fontSize: "1.0625rem", letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}
                        >
                            Metas com Visibilidade
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                            Meta individual e do time consolidada. Cada vendedor vê quanto falta e quanto já entregou.
                            Gestor acompanha tudo sem precisar perguntar.
                        </p>
                    </BentoCard>

                    {/* ── Card 4: Pipeline + WhatsApp — WIDE ── */}
                    <BentoCard className="md:col-span-2 lg:col-span-2 p-6 flex flex-col md:flex-row gap-6">
                        {/* Left: text */}
                        <div className="md:w-1/2">
                            <span
                                className="text-[10px] text-emerald-400 rounded-full px-2.5 py-0.5 mb-3 inline-block"
                                style={{ fontWeight: "var(--fw-medium)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                            >
                                CRM + WhatsApp
                            </span>
                            <h3
                                className="font-heading mb-2"
                                style={{
                                    fontWeight: "var(--fw-bold)",
                                    fontSize: "1.125rem",
                                    letterSpacing: "-0.04em",
                                    color: "rgba(255,255,255,0.95)",
                                }}
                            >
                                Pipeline + WhatsApp IA integrados
                            </h3>
                            <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                                CRM com pipeline Kanban, histórico de ligações e hub WhatsApp com copiloto
                                de IA que sugere resposta e identifica objeção na hora.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {["Pipeline Kanban", "WhatsApp IA", "Ligações com gravação"].map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-xs rounded-full px-2.5 py-0.5"
                                        style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Right: WhatsApp mockup */}
                        <div className="md:w-1/2 flex items-center justify-center gap-3">
                            <div
                                className="rounded-xl p-3 w-36"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                        <MessageCircle className="h-3 w-3 text-white" />
                                    </div>
                                    <span
                                        style={{ fontSize: "10px", fontWeight: "var(--fw-semibold)", color: "rgba(255,255,255,0.7)" }}
                                    >
                                        WhatsApp
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-1.5 rounded w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                                    <div className="h-1.5 rounded w-4/5" style={{ background: "rgba(255,255,255,0.08)" }} />
                                    <div className="h-1.5 rounded w-full" style={{ background: "rgba(16,185,129,0.15)" }} />
                                    <div className="h-1.5 rounded w-3/5" style={{ background: "rgba(255,255,255,0.08)" }} />
                                </div>
                            </div>

                            <div
                                className="rounded-xl p-3 w-24"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <div className="flex items-center gap-1 mb-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                    <span
                                        className="text-emerald-400"
                                        style={{ fontSize: "8px", fontWeight: "var(--fw-bold)" }}
                                    >
                                        Vyzon
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-1 rounded w-full" style={{ background: "rgba(255,255,255,0.06)" }} />
                                    <div className="h-1 rounded w-2/3" style={{ background: "rgba(255,255,255,0.06)" }} />
                                    <div className="flex items-center gap-1 mt-2.5 rounded px-1.5 py-1" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                        <Trophy className="h-2 w-2 text-amber-400" />
                                        <span
                                            className="text-amber-400"
                                            style={{ fontSize: "7px", fontWeight: "var(--fw-semibold)" }}
                                        >
                                            Ranking #3
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 rounded px-1.5 py-1" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                                        <Bell className="h-2 w-2 text-emerald-400" />
                                        <span className="text-emerald-400" style={{ fontSize: "7px" }}>
                                            +R$297
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </BentoCard>

                </div>
            </div>
        </section>
    );
};
