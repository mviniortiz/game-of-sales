import { motion } from "framer-motion";
import { Trophy, Zap, MessageCircle, Crown, Star, TrendingUp, Target, Bell } from "lucide-react";

// ─── Shared card wrapper ───────────────────────────────────────────────────────
interface BentoCardProps {
    children: React.ReactNode;
    className?: string;
    hoverColor?: string;
    delay?: number;
}

const BentoCard = ({ children, className = "", hoverColor = "rgba(16,185,129,0.08)", delay = 0 }: BentoCardProps) => (
    <motion.div
        className={`relative group rounded-2xl border border-white/6 bg-slate-900/60 backdrop-blur-sm overflow-hidden ${className}`}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -6, boxShadow: `0 24px 60px -20px rgba(0,0,0,0.6), 0 0 60px -20px ${hoverColor}` }}
        style={{ boxShadow: "0 4px 24px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)" }}
    >
        {/* Top edge glow on hover */}
        <div
            className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `linear-gradient(90deg, transparent, ${hoverColor.replace("0.08", "0.6")}, transparent)` }}
        />
        {children}
    </motion.div>
);

// ─── ProductBentoGrid ─────────────────────────────────────────────────────────
export const ProductBentoGrid = () => {
    return (
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/6 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/6 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">

                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="text-label inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "var(--ls-widest)" }}
                    >
                        <Zap className="h-3 w-3" />
                        ARSENAL COMPLETO
                    </span>
                    <h2 className="text-heading text-3xl sm:text-4xl text-white mb-4">
                        Ferramentas que{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                            vendem por você
                        </span>
                    </h2>
                    <p
                        className="text-body text-gray-400 max-w-xl mx-auto"
                        style={{ fontSize: "1.0625rem" }}
                    >
                        Cada funcionalidade foi pensada para{" "}
                        <span className="text-white" style={{ fontWeight: "var(--fw-medium)" }}>eliminar fricção</span>{" "}
                        e{" "}
                        <span className="text-white" style={{ fontWeight: "var(--fw-medium)" }}>acelerar fechamentos</span>.
                    </p>
                </motion.div>

                {/* Bento grid — asymmetric layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">

                    {/* ── Card 1: Ranking ao Vivo — TALL, col-span 1 ── */}
                    <BentoCard
                        className="lg:row-span-2 p-8 flex flex-col"
                        hoverColor="rgba(245,158,11,0.12)"
                        delay={0}
                    >
                        {/* Visual: Gold badge */}
                        <div className="flex-1 flex items-center justify-center mb-8">
                            <div className="relative">
                                {/* Outer glow ring */}
                                <motion.div
                                    className="absolute inset-0 rounded-full"
                                    animate={{ boxShadow: ["0 0 20px rgba(245,158,11,0.2)", "0 0 50px rgba(245,158,11,0.4)", "0 0 20px rgba(245,158,11,0.2)"] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                                {/* Badge */}
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex flex-col items-center justify-center shadow-2xl shadow-amber-500/30 relative z-10">
                                    <Crown className="h-7 w-7 text-amber-900 mb-1" strokeWidth={2.5} />
                                    <span style={{ fontWeight: "var(--fw-black)", fontSize: "1.5rem", color: "#78350f" }}>#1</span>
                                </div>

                                {/* Floating stars */}
                                {[
                                    { top: "-10px", right: "-8px", size: "h-5 w-5", delay: 0 },
                                    { bottom: "-4px", left: "-12px", size: "h-4 w-4", delay: 0.3 },
                                    { top: "20px", left: "-18px", size: "h-3 w-3", delay: 0.6 },
                                ].map((s, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        style={{ top: s.top, right: (s as any).right, bottom: (s as any).bottom, left: (s as any).left }}
                                        animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: s.delay }}
                                    >
                                        <Star className={`${s.size} text-amber-400`} fill="currentColor" />
                                    </motion.div>
                                ))}

                                {/* Rank list preview */}
                                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col gap-1 w-36">
                                    {[
                                        { initials: "CM", name: "Carlos M.", pts: "8.9k", color: "bg-amber-500" },
                                        { initials: "AL", name: "Ana L.", pts: "6.1k", color: "bg-emerald-500" },
                                        { initials: "BS", name: "Bruno S.", pts: "4.5k", color: "bg-slate-500" },
                                    ].map((p, i) => (
                                        <motion.div
                                            key={p.initials}
                                            className="flex items-center gap-2 bg-slate-800/80 rounded-lg px-2.5 py-1.5"
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.4 + i * 0.1 }}
                                        >
                                            <div className={`w-5 h-5 rounded-full ${p.color} flex items-center justify-center flex-shrink-0`}>
                                                <span className="text-white" style={{ fontSize: "7px", fontWeight: "var(--fw-bold)" }}>{p.initials}</span>
                                            </div>
                                            <span className="text-white/70 flex-1" style={{ fontSize: "10px", fontWeight: "var(--fw-medium)" }}>{p.name}</span>
                                            <span className="text-emerald-400" style={{ fontSize: "10px", fontWeight: "var(--fw-bold)" }}>{p.pts}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Text — pushed to bottom */}
                        <div className="mt-auto pt-16">
                            <span className="text-label text-[10px] text-amber-400/70 border border-amber-500/20 bg-amber-500/5 rounded-full px-2.5 py-0.5 mb-3 inline-block">
                                Destaque
                            </span>
                            <h3 className="text-white mb-2" style={{ fontWeight: "var(--fw-bold)", fontSize: "1.125rem" }}>
                                Ranking ao Vivo
                            </h3>
                            <p className="text-body text-gray-400 text-sm">
                                Cada venda atualiza o ranking na hora. Seu time acompanha quem está na frente em tempo real — sem precisar perguntar.
                            </p>
                        </div>
                    </BentoCard>

                    {/* ── Card 2: Vendas em Tempo Real ── */}
                    <BentoCard className="p-6" hoverColor="rgba(16,185,129,0.1)" delay={0.1}>
                        {/* Toast notification visual */}
                        <div className="relative h-28 flex items-center justify-center mb-5">
                            <motion.div
                                className="relative bg-slate-800/90 border border-emerald-500/25 rounded-xl px-4 py-3 shadow-xl"
                                initial={{ x: 40, opacity: 0 }}
                                whileInView={{ x: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-white/80 text-xs" style={{ fontWeight: "var(--fw-medium)" }}>
                                            💰 Venda Aprovada
                                        </p>
                                        <p className="text-emerald-400" style={{ fontWeight: "var(--fw-bold)", fontSize: "0.9375rem" }}>
                                            + R$ 297,00
                                        </p>
                                    </div>
                                </div>
                                {/* Pulse glow */}
                                <motion.div
                                    className="absolute -inset-2 rounded-2xl bg-emerald-500/10 blur-lg -z-10"
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </motion.div>
                        </div>
                        <h3 className="text-white mb-1.5" style={{ fontWeight: "var(--fw-bold)", fontSize: "1.0625rem" }}>
                            Vendas em Tempo Real
                        </h3>
                        <p className="text-body text-gray-400 text-sm">
                            Sincronização via Webhook em segundos. Integrado com Kiwify, Greenn e Hotmart.
                        </p>
                    </BentoCard>

                    {/* ── Card 3: Metas & Gamificação ── */}
                    <BentoCard className="p-6" hoverColor="rgba(16,185,129,0.1)" delay={0.2}>
                        {/* Progress bar visual */}
                        <div className="relative mb-5 space-y-2.5">
                            {[
                                { label: "Meta Diária", pct: 89, color: "bg-emerald-400" },
                                { label: "Meta Semanal", pct: 64, color: "bg-teal-400" },
                                { label: "Meta Mensal", pct: 41, color: "bg-amber-400" },
                            ].map(({ label, pct, color }, i) => (
                                <div key={label}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-white/50" style={{ fontSize: "10px", fontWeight: "var(--fw-medium)" }}>{label}</span>
                                        <span className="text-white/70" style={{ fontSize: "10px", fontWeight: "var(--fw-bold)" }}>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${color} rounded-full`}
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${pct}%` }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <h3 className="text-white mb-1.5" style={{ fontWeight: "var(--fw-bold)", fontSize: "1.0625rem" }}>
                            Metas com Visibilidade
                        </h3>
                        <p className="text-body text-gray-400 text-sm">
                            Cada vendedor vê sua própria meta e o quanto falta. Sem precisar perguntar pro gestor.
                        </p>
                    </BentoCard>

                    {/* ── Card 4: Alertas & Notificações — WIDE ── */}
                    <BentoCard
                        className="md:col-span-2 lg:col-span-2 p-6 flex flex-col md:flex-row gap-6"
                        hoverColor="rgba(16,185,129,0.08)"
                        delay={0.25}
                    >
                        {/* Left: text */}
                        <div className="md:w-1/2">
                            <span className="text-label text-[10px] text-emerald-400/70 border border-emerald-500/20 bg-emerald-500/5 rounded-full px-2.5 py-0.5 mb-3 inline-block">
                                Notificações
                            </span>
                            <h3 className="text-white mb-2" style={{ fontWeight: "var(--fw-bold)", fontSize: "1.125rem" }}>
                                Venda Sem Sair do Zap
                            </h3>
                            <p className="text-body text-gray-400 text-sm mb-4">
                                Extensão Chrome integrada. Veja ranking e registre vendas direto no navegador — sem abrir outra aba.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {["Chrome Extension", "Tempo Real", "1 clique"].map(tag => (
                                    <span
                                        key={tag}
                                        className="text-xs text-white/40 border border-white/8 rounded-full px-2.5 py-0.5"
                                        style={{ fontWeight: "var(--fw-medium)" }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Right: WhatsApp mockup */}
                        <div className="md:w-1/2 flex items-center justify-center gap-3">
                            {/* Chat window */}
                            <div className="bg-slate-800 rounded-xl p-3 w-36 shadow-lg border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                        <MessageCircle className="h-3 w-3 text-white" />
                                    </div>
                                    <span className="text-white/70" style={{ fontSize: "10px", fontWeight: "var(--fw-semibold)" }}>WhatsApp</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-1.5 bg-slate-700 rounded w-full" />
                                    <div className="h-1.5 bg-slate-700 rounded w-4/5" />
                                    <div className="h-1.5 bg-green-500/25 rounded w-full" />
                                    <div className="h-1.5 bg-slate-700 rounded w-3/5" />
                                </div>
                            </div>

                            {/* Sidebar */}
                            <motion.div
                                className="bg-slate-800 border border-emerald-500/20 rounded-xl p-3 w-24 shadow-xl"
                                initial={{ x: 16, opacity: 0 }}
                                whileInView={{ x: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                            >
                                <div className="flex items-center gap-1 mb-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                    <span className="text-emerald-400" style={{ fontSize: "8px", fontWeight: "var(--fw-bold)" }}>Game Sales</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-1 bg-white/15 rounded w-full" />
                                    <div className="h-1 bg-white/15 rounded w-2/3" />
                                    <div className="flex items-center gap-1 mt-2.5 bg-amber-500/10 rounded px-1.5 py-1">
                                        <Trophy className="h-2 w-2 text-amber-400" />
                                        <span className="text-amber-300" style={{ fontSize: "7px", fontWeight: "var(--fw-bold)" }}>Ranking #3</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-emerald-500/10 rounded px-1.5 py-1">
                                        <Bell className="h-2 w-2 text-emerald-400" />
                                        <span className="text-emerald-300" style={{ fontSize: "7px" }}>+R$297</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </BentoCard>

                </div>
            </div>
        </section>
    );
};
