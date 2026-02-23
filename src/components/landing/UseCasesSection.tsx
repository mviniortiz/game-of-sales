import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Trophy, Link2, Zap, Check } from "lucide-react";

// ── Asset imports ─────────────────────────────────────────────────────────────
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.png";
import greennLogo from "@/assets/integrations/greenn.png";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.png";
import caktoLogo from "@/assets/integrations/cakto.png";
import celetusLogo from "@/assets/integrations/celetus.png";
import gcalLogo from "@/assets/integrations/google-calendar.png";

// ─── 1. Gestores: live KPI dashboard ─────────────────────────────────────────
const GestoresIllustration = () => (
    <svg viewBox="0 0 280 162" fill="none" className="w-full h-auto">
        <rect width="280" height="162" rx="12" fill="#0D1526" />

        {/* Subtle grid */}
        {[40, 80, 120].map((y) => (
            <line key={y} x1="12" y1={y} x2="268" y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* Animated bars */}
        {[
            { x: 18, h: 50, color: "#10b981" },
            { x: 46, h: 78, color: "#34d399" },
            { x: 74, h: 42, color: "#10b981" },
            { x: 102, h: 98, color: "#059669" },
            { x: 130, h: 62, color: "#10b981" },
        ].map(({ x, h, color }, i) => (
            <motion.rect
                key={x}
                x={x} y={132 - h}
                width="22" height={h}
                rx="4"
                fill={color}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
                style={{ transformOrigin: `${x + 11}px 132px` }}
            />
        ))}

        {/* Trend line (amber) */}
        <motion.polyline
            points="29,92 57,70 85,92 113,45 141,68"
            stroke="#f59e0b" strokeWidth="2"
            fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.45, ease: "easeOut" }}
        />
        {[[29, 92], [57, 70], [85, 92], [113, 45], [141, 68]].map(([cx, cy], i) => (
            <motion.circle key={i} cx={cx} cy={cy} r="3" fill="#f59e0b"
                initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.12 }} />
        ))}

        {/* Right: KPI cards */}
        {/* Card 1 */}
        <rect x="168" y="14" width="98" height="38" rx="8"
            fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.18)" strokeWidth="1" />
        <text x="178" y="29" fill="rgba(255,255,255,0.45)" fontSize="8">Receita do mês</text>
        <text x="178" y="45" fill="#10b981" fontSize="13" fontWeight="700">R$ 47.200</text>
        {/* Card 2 */}
        <rect x="168" y="58" width="98" height="38" rx="8"
            fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.18)" strokeWidth="1" />
        <text x="178" y="73" fill="rgba(255,255,255,0.45)" fontSize="8">Conversão</text>
        <text x="178" y="89" fill="#f59e0b" fontSize="13" fontWeight="700">34,2%</text>
        {/* Card 3 — floating */}
        <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
            <rect x="168" y="102" width="98" height="46" rx="8"
                fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.28)" strokeWidth="1" />
            <text x="178" y="119" fill="rgba(255,255,255,0.45)" fontSize="8">Meta do time</text>
            {/* mini progress bar */}
            <rect x="178" y="125" width="78" height="6" rx="3" fill="rgba(255,255,255,0.06)" />
            <motion.rect x="178" y="125" height="6" rx="3" fill="#10b981"
                initial={{ width: 0 }}
                whileInView={{ width: 57 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.9 }} />
            <text x="258" y="132" textAnchor="end" fill="#10b981" fontSize="8" fontWeight="700">73%</text>
        </motion.g>

        {/* LIVE badge */}
        <motion.g animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <rect x="14" y="140" width="38" height="14" rx="7" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            <circle cx="23" cy="147" r="3" fill="#10b981" />
            <text x="30" y="151" fill="#10b981" fontSize="7" fontWeight="700">LIVE</text>
        </motion.g>
    </svg>
);

// ─── 2. Vendas: leaderboard with avatars ─────────────────────────────────────
const AVATAR_COLORS = ["#f59e0b", "#10b981", "#34d399", "#94a3b8"];
const INITIALS = ["CM", "AL", "BS", "CR"];

const VendasIllustration = () => (
    <svg viewBox="0 0 280 162" fill="none" className="w-full h-auto">
        <rect width="280" height="162" rx="12" fill="#0D1526" />

        {/* Header row */}
        <text x="14" y="22" fill="rgba(255,255,255,0.3)" fontSize="8">RANKING SEMANAL</text>
        {/* Crown badge */}
        <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <rect x="220" y="10" width="48" height="16" rx="8"
                fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.35)" strokeWidth="1" />
            <text x="244" y="21" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="700">👑 ao vivo</text>
        </motion.g>

        {/* Leaderboard rows */}
        {[
            { rank: "#1", name: "Carlos M.", pts: "8.9k", barW: 106, ac: AVATAR_COLORS[0], init: INITIALS[0] },
            { rank: "#2", name: "Ana Lima", pts: "6.1k", barW: 77, ac: AVATAR_COLORS[1], init: INITIALS[1] },
            { rank: "#3", name: "Bruno S.", pts: "4.5k", barW: 56, ac: AVATAR_COLORS[2], init: INITIALS[2] },
            { rank: "#4", name: "Carla R.", pts: "2.8k", barW: 34, ac: AVATAR_COLORS[3], init: INITIALS[3] },
        ].map(({ rank, name, pts, barW, ac, init }, i) => {
            const y = 34 + i * 31;
            const isFirst = i === 0;
            return (
                <motion.g key={rank}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.35 }}>
                    {/* Row bg */}
                    <rect x="10" y={y} width="260" height="25" rx="6"
                        fill={isFirst ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.025)"}
                        stroke={isFirst ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.05)"}
                        strokeWidth="1" />
                    {/* Rank */}
                    <text x="22" y={y + 17} fill={ac} fontSize="9" fontWeight="700">{rank}</text>
                    {/* Avatar circle */}
                    <circle cx="44" cy={y + 12} r="9" fill={`${ac}25`} stroke={`${ac}60`} strokeWidth="1" />
                    <text x="44" y={y + 16} textAnchor="middle" fill={ac} fontSize="7" fontWeight="700">{init}</text>
                    {/* Name */}
                    <text x="58" y={y + 16} fill="rgba(255,255,255,0.7)" fontSize="9">{name}</text>
                    {/* Progress bar */}
                    <rect x="118" y={y + 9} width="110" height="7" rx="3" fill="rgba(255,255,255,0.04)" />
                    <motion.rect x="118" y={y + 9} height="7" rx="3" fill={ac} opacity="0.7"
                        initial={{ width: 0 }}
                        whileInView={{ width: barW }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }} />
                    {/* XP points */}
                    <text x="268" y={y + 16} textAnchor="end" fill={ac} fontSize="8" fontWeight="700">{pts}</text>
                </motion.g>
            );
        })}

        {/* Bottom: XP notification */}
        <motion.g
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.4 }}>
            <motion.g animate={{ x: [0, 3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}>
                <rect x="10" y="160" width="0" height="0" rx="0" />
            </motion.g>
        </motion.g>

        {/* Floating "+50 XP" toast */}
        <motion.g
            animate={{ y: [0, -6, 0], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            <rect x="186" y="142" width="80" height="16" rx="8"
                fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
            <text x="226" y="153" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="700">⚡ +50 XP ganhos</text>
        </motion.g>
    </svg>
);

// ─── 3. Integração: pipeline layout (platform tiles → data channel → result) ─

const PLATFORMS = [
    { logo: kiwifyLogo, name: "Kiwify", col: "#06b6d4", amount: "R$ 297" },
    { logo: greennLogo, name: "Greenn", col: "#10b981", amount: "R$ 497" },
    { logo: hotmartLogo, name: "Hotmart", col: "#f59e0b", amount: "R$ 197" },
    { logo: caktoLogo, name: "Cakto", col: "#a78bfa", amount: "R$ 97" },
    { logo: celetusLogo, name: "Celetus", col: "#f43f5e", amount: "R$ 147" },
];

// Dot travelling along a horizontal path
const FlowDot = ({ y, col, delay }: { y: number; col: string; delay: number }) => (
    <motion.circle r="3" fill={col}
        animate={{ cx: [100, 178], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, delay, ease: "linear", repeatDelay: 2 }}
        cy={y} />
);

const IntegracaoIllustration = () => (
    <svg viewBox="0 0 280 174" fill="none" className="w-full h-auto">
        <defs>
            {/* Gradient for the central channel */}
            <linearGradient id="chGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                <stop offset="40%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
        </defs>

        {/* Background */}
        <rect width="280" height="174" rx="12" fill="#0D1526" />

        {/* Subtle column separators */}
        <line x1="100" y1="10" x2="100" y2="164" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="178" y1="10" x2="178" y2="164" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* ── LEFT: Platform logo tiles ── */}
        {PLATFORMS.map(({ logo, name, col }, i) => {
            const y = 10 + i * 30;
            return (
                <motion.g key={name}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}>
                    {/* App icon bg — square, rx=5 */}
                    <rect x="8" y={y} width="24" height="24" rx="5"
                        fill="#ffffff10" stroke={`${col}35`} strokeWidth="1" />
                    <image href={logo} x="10" y={y + 2} width="20" height="20" preserveAspectRatio="xMidYMid meet" />
                    {/* Platform name */}
                    <text x="38" y={y + 14} fill="rgba(255,255,255,0.55)" fontSize="8.5"
                        fontWeight="500">{name}</text>
                    {/* Horizontal connector to channel */}
                    <line x1="76" y1={y + 12} x2="100" y2={y + 12}
                        stroke={col} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                    {/* Active dot on connector */}
                    <FlowDot y={y + 12} col={col} delay={i * 0.55} />
                </motion.g>
            );
        })}

        {/* ── CENTER: Processing channel ── */}
        {/* Channel background glow */}
        <rect x="100" y="8" width="78" height="158" rx="4" fill="url(#chGrad)" />

        {/* "Game Sales" hub box */}
        <motion.g
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.4 }}>
            <rect x="110" y="80" width="58" height="36" rx="8"
                fill="rgba(16,185,129,0.12)"
                stroke="rgba(16,185,129,0.35)" strokeWidth="1.5" />
            {/* Pulse ring */}
            <motion.rect x="110" y="80" width="58" height="36" rx="8"
                fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="6"
                animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
            <text x="139" y="97" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="700">Game</text>
            <text x="139" y="109" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="700">Sales</text>
        </motion.g>

        {/* ── RIGHT: Live transaction feed ── */}
        {/* Header */}
        <motion.g
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}>
            {/* LIVE dot */}
            <motion.circle cx="186" cy="16" r="3" fill="#10b981"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }} />
            <text x="193" y="20" fill="rgba(255,255,255,0.35)" fontSize="7.5" fontWeight="600">TRANSAÇÕES AO VIVO</text>
        </motion.g>

        {/* Feed items — appear staggered */}
        {PLATFORMS.map(({ name, col, amount }, i) => {
            const y = 28 + i * 27;
            return (
                <motion.g key={name}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.15, duration: 0.3 }}>
                    {/* Row bg */}
                    <rect x="182" y={y} width="90" height="20" rx="5"
                        fill="rgba(255,255,255,0.025)"
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    {/* Colored accent bar */}
                    <rect x="182" y={y} width="3" height="20" rx="1.5" fill={col} opacity="0.7" />
                    {/* Platform name */}
                    <text x="191" y={y + 13} fill="rgba(255,255,255,0.5)" fontSize="7.5">{name}</text>
                    {/* Amount */}
                    <text x="269" y={y + 13} textAnchor="end" fill={col} fontSize="8" fontWeight="700">{amount}</text>
                    {/* Horizontal line from channel to feed row */}
                    <line x1="178" y1={y + 10} x2="182" y2={y + 10}
                        stroke={col} strokeWidth="1" strokeOpacity="0.3" />
                </motion.g>
            );
        })}

        {/* "Venda aprovada" bottom badge */}
        <motion.g
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4 }}>
            <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
                <rect x="88" y="156" width="104" height="16" rx="8"
                    fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <text x="140" y="168" textAnchor="middle" fill="#10b981" fontSize="7.5" fontWeight="600">✓ Ranking atualizado</text>
            </motion.g>
        </motion.g>
    </svg>
);

// ─── Cases data ───────────────────────────────────────────────────────────────
const CASES = [
    {
        icon: BarChart3,
        iconColor: "text-emerald-400",
        tag: "Gestores",
        title: "Visibilidade total do time",
        description:
            "Acompanhe desempenho, conversões e metas em tempo real. Tome decisões baseadas em dados — não em achismos ou relatórios desatualizados.",
        bullets: ["Dashboard ao vivo", "Relatórios automáticos", "Metas por período"],
        Illustration: GestoresIllustration,
        accent: "emerald" as const,
    },
    {
        icon: Trophy,
        iconColor: "text-amber-400",
        tag: "Vendedores",
        title: "Competição que move o time",
        description:
            "Rankings, XP e conquistas que transformam metas em jogos. Cada venda fechada vira pontos. Seu time vende mais sem você precisar cobrar.",
        bullets: ["Ranking ao vivo", "XP e conquistas", "Meta individual"],
        Illustration: VendasIllustration,
        accent: "amber" as const,
    },
    {
        icon: Link2,
        iconColor: "text-emerald-400",
        tag: "Integração",
        title: "Conecta em minutos",
        description:
            "Kiwify, Greenn, Hotmart, Cakto ou Celetus. Cole o webhook, pronto. Vendas registradas em tempo real — o dinheiro cai e o ranking já atualiza sozinho.",
        bullets: ["Kiwify, Greenn, Hotmart, Cakto, Celetus", "Zero digitação manual", "Tempo real via webhook"],
        Illustration: IntegracaoIllustration,
        accent: "emerald" as const,
    },
] as const;

// ─── UseCasesSection ──────────────────────────────────────────────────────────
export const UseCasesSection = () => {
    const [active, setActive] = useState(0);

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
            {/* Background glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)", filter: "blur(60px)" }}
            />

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
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "var(--ls-widest)", fontWeight: "var(--fw-semibold)" }}
                    >
                        <Zap className="h-3 w-3" />
                        PARA QUEM É O GAME SALES
                    </span>

                    <h2
                        className="text-white mb-4"
                        style={{ fontWeight: "var(--fw-extrabold)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: "var(--lh-tight)", letterSpacing: "var(--ls-snug)" }}
                    >
                        Funciona para o{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                            seu contexto
                        </span>
                    </h2>

                    <p className="text-body text-gray-400 max-w-xl mx-auto" style={{ fontSize: "1.0625rem" }}>
                        Seja você gestor, vendedor ou responsável por integrações — o Game Sales se adapta ao seu papel.
                    </p>
                </motion.div>

                {/* Tab selector */}
                <div className="flex justify-center mb-10">
                    <div className="inline-flex gap-1 p-1 rounded-2xl bg-slate-900/80 border border-white/6">
                        {CASES.map((c, i) => {
                            const Icon = c.icon;
                            const isActive = active === i;
                            return (
                                <button
                                    key={c.tag}
                                    onClick={() => setActive(i)}
                                    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200 ${isActive ? "text-white" : "text-white/40 hover:text-white/60"}`}
                                    style={{ fontWeight: "var(--fw-semibold)" }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="tab-bg"
                                            className="absolute inset-0 rounded-xl bg-slate-800 border border-white/8"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                        />
                                    )}
                                    <Icon className={`relative h-4 w-4 ${isActive ? c.iconColor : ""}`} strokeWidth={2} />
                                    <span className="relative">{c.tag}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active panel */}
                <AnimatePresence mode="wait">
                    {CASES.map((c, i) => {
                        if (i !== active) return null;
                        return (
                            <motion.div
                                key={c.tag}
                                className="grid lg:grid-cols-2 gap-8 items-center"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {/* Illustration */}
                                <div
                                    className="relative rounded-2xl overflow-hidden border border-white/6 p-4"
                                    style={{ background: "#0D1526", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.06)" }}
                                >
                                    <c.Illustration />
                                </div>

                                {/* Text */}
                                <div className="flex flex-col gap-4">
                                    <span
                                        className={`inline-flex items-center gap-1.5 self-start text-xs border rounded-full px-3 py-1 ${c.accent === "amber"
                                            ? "text-amber-400 border-amber-500/25 bg-amber-500/8"
                                            : "text-emerald-400 border-emerald-500/25 bg-emerald-500/8"
                                            }`}
                                        style={{ fontWeight: "var(--fw-semibold)", letterSpacing: "var(--ls-wide)" }}
                                    >
                                        <c.icon className="h-3 w-3" strokeWidth={2.5} />
                                        {c.tag}
                                    </span>

                                    <h3
                                        className="text-white"
                                        style={{ fontWeight: "var(--fw-bold)", fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)", lineHeight: "var(--lh-snug)", letterSpacing: "var(--ls-snug)" }}
                                    >
                                        {c.title}
                                    </h3>

                                    <p className="text-body text-gray-400 leading-relaxed">
                                        {c.description}
                                    </p>

                                    <ul className="flex flex-col gap-2.5 mt-1">
                                        {c.bullets.map((b) => (
                                            <li key={b} className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${c.accent === "amber" ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                                                    <Check className={`h-3 w-3 ${c.accent === "amber" ? "text-amber-400" : "text-emerald-400"}`} strokeWidth={3} />
                                                </div>
                                                <span className="text-white/70 text-sm" style={{ fontWeight: "var(--fw-medium)" }}>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default UseCasesSection;
