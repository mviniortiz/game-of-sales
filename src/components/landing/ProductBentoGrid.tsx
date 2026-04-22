import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy,
    Webhook,
    Kanban,
    Target,
    MessageCircle,
    Crown,
    TrendingUp,
    ChevronRight,
    Check,
    Bot,
    Clock,
    Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import stripeLogo from "@/assets/integrations/stripe.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";
import eduzzLogo from "@/assets/integrations/eduzz.webp";

// ─── Mockups ─────────────────────────────────────────────────────────────────

function RankingMockup() {
    const rows = [
        { rank: 1, name: "Carlos M.", pts: "R$ 28.4k", color: "#f59e0b", bar: 100 },
        { rank: 2, name: "Ana L.", pts: "R$ 21.8k", color: "#a8a29e", bar: 77 },
        { rank: 3, name: "Rafael S.", pts: "R$ 18.2k", color: "#d97706", bar: 64 },
        { rank: 4, name: "Julia P.", pts: "R$ 12.6k", color: "rgba(255,255,255,0.3)", bar: 44 },
        { rank: 5, name: "Diego T.", pts: "R$ 9.1k", color: "rgba(255,255,255,0.3)", bar: 32 },
    ];
    return (
        <div className="p-6 sm:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        Ranking do mês
                    </p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                        Agosto 2026
                    </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400" style={{ fontWeight: 600 }}>AO VIVO</span>
                </div>
            </div>

            {/* Podium */}
            <div className="flex items-end justify-center gap-3 mb-6">
                {/* 2nd */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col items-center"
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: "linear-gradient(135deg, #a8a29e, #78716c)", fontSize: 14, fontWeight: 700, color: "white" }}>AL</div>
                    <div className="w-16 h-14 rounded-t-lg flex items-center justify-center" style={{ background: "rgba(168,162,158,0.15)", border: "1px solid rgba(168,162,158,0.25)" }}>
                        <span className="text-2xl font-bold" style={{ color: "#d6d3d1" }}>2</span>
                    </div>
                </motion.div>
                {/* 1st */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex flex-col items-center"
                >
                    <Crown className="h-4 w-4 text-amber-400 mb-1" fill="currentColor" />
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2 shadow-lg" style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", fontSize: 15, fontWeight: 700, color: "white", boxShadow: "0 4px 20px rgba(245,158,11,0.4)" }}>CM</div>
                    <div className="w-18 h-20 rounded-t-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", width: 72 }}>
                        <span className="text-3xl font-bold text-amber-400">1</span>
                    </div>
                </motion.div>
                {/* 3rd */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex flex-col items-center"
                >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2" style={{ background: "linear-gradient(135deg, #d97706, #92400e)", fontSize: 13, fontWeight: 700, color: "white" }}>RS</div>
                    <div className="w-16 h-10 rounded-t-lg flex items-center justify-center" style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.25)" }}>
                        <span className="text-xl font-bold" style={{ color: "#fbbf24" }}>3</span>
                    </div>
                </motion.div>
            </div>

            {/* Rank list */}
            <div className="space-y-1.5 mt-auto">
                {rows.map((r, i) => (
                    <motion.div
                        key={r.rank}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg"
                        style={{ background: i === 0 ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                        <span className="text-xs tabular-nums w-5" style={{ color: r.color, fontWeight: 700 }}>#{r.rank}</span>
                        <span className="flex-1 text-sm truncate" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{r.name}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${r.bar}%` }}
                                transition={{ duration: 0.7, delay: 0.4 + i * 0.05, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ background: r.color }}
                            />
                        </div>
                        <span className="text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{r.pts}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function PipelineMockup() {
    const columns = [
        {
            title: "Lead",
            total: "R$ 7.2k",
            count: 8,
            color: "#60a5fa",
            accent: "rgba(96,165,250,0.1)",
            border: "rgba(96,165,250,0.2)",
            deals: [
                { name: "Ana Silva", value: "R$ 2.4k", avatar: "AS", avatarBg: "linear-gradient(135deg,#60a5fa,#3b82f6)", days: "2d" },
                { name: "Rafael Torres", value: "R$ 3.2k", avatar: "RT", avatarBg: "linear-gradient(135deg,#818cf8,#6366f1)", days: "4d" },
                { name: "Marina Dias", value: "R$ 1.6k", avatar: "MD", avatarBg: "linear-gradient(135deg,#93c5fd,#60a5fa)", days: "6d" },
            ],
        },
        {
            title: "Proposta",
            total: "R$ 11.4k",
            count: 5,
            color: "#fbbf24",
            accent: "rgba(251,191,36,0.1)",
            border: "rgba(251,191,36,0.22)",
            deals: [
                { name: "Carlos Mendes", value: "R$ 4.8k", avatar: "CM", avatarBg: "linear-gradient(135deg,#fbbf24,#f59e0b)", days: "5d", moving: true },
                { name: "Luiza Ferreira", value: "R$ 3.9k", avatar: "LF", avatarBg: "linear-gradient(135deg,#fde68a,#fbbf24)", days: "3d" },
                { name: "Tiago Rocha", value: "R$ 2.7k", avatar: "TR", avatarBg: "linear-gradient(135deg,#fcd34d,#f59e0b)", days: "1d" },
            ],
        },
        {
            title: "Ganho",
            total: "R$ 12.3k",
            count: 4,
            color: "#00E37A",
            accent: "rgba(0,227,122,0.1)",
            border: "rgba(0,227,122,0.25)",
            deals: [
                { name: "Paula Costa", value: "R$ 5.9k", avatar: "PC", avatarBg: "linear-gradient(135deg,#33FF9E,#00E37A)", won: true },
                { name: "Bruno Almeida", value: "R$ 4.2k", avatar: "BA", avatarBg: "linear-gradient(135deg,#66FFB3,#00E37A)", won: true },
                { name: "Sofia Lima", value: "R$ 2.2k", avatar: "SL", avatarBg: "linear-gradient(135deg,#a7f3d0,#33FF9E)", won: true },
            ],
        },
    ];

    const totalValue = columns.reduce((sum, c) => sum + parseFloat(c.total.replace(/[^\d.,]/g, "").replace(",", ".")), 0);
    const totalDeals = columns.reduce((sum, c) => sum + c.count, 0);

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 md:mb-5">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        Seu pipeline
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm tabular-nums" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
                            R$ {totalValue.toFixed(1)}k
                        </p>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                            · {totalDeals} deals ativos
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Kanban className="h-3 w-3" style={{ color: "rgba(255,255,255,0.5)" }} />
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Kanban</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-1 content-start">
                {columns.map((col, colIdx) => (
                    <div key={col.title} className="flex flex-col min-w-0">
                        {/* Column header with total */}
                        <div
                            className="rounded-lg px-2.5 py-1.5 md:py-2 mb-2"
                            style={{ background: col.accent, border: `1px solid ${col.border}` }}
                        >
                            <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                                    <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                                        {col.title}
                                    </span>
                                </div>
                                <span
                                    className="text-[9px] tabular-nums px-1 py-0.5 rounded shrink-0"
                                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", fontWeight: 700 }}
                                >
                                    {col.count}
                                </span>
                            </div>
                            <p className="hidden md:block text-[10px] tabular-nums mt-0.5" style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                                {col.total}
                            </p>
                        </div>

                        {/* Deals — mobile shows 1, desktop shows 3 */}
                        <div className="space-y-1.5">
                            {col.deals.map((deal, i) => (
                                <motion.div
                                    key={deal.name}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        rotate: deal.moving ? -2 : 0,
                                        scale: deal.moving ? 1.03 : 1,
                                    }}
                                    transition={{ delay: colIdx * 0.08 + i * 0.05 }}
                                    className={`rounded-xl p-2.5 relative ${i > 0 ? "hidden md:block" : ""}`}
                                    style={{
                                        background: deal.won
                                            ? "rgba(0,227,122,0.05)"
                                            : deal.moving
                                                ? "rgba(251,191,36,0.08)"
                                                : "rgba(255,255,255,0.025)",
                                        border: `1px solid ${
                                            deal.won
                                                ? "rgba(0,227,122,0.2)"
                                                : deal.moving
                                                    ? "rgba(251,191,36,0.3)"
                                                    : "rgba(255,255,255,0.06)"
                                        }`,
                                        boxShadow: deal.moving
                                            ? "0 8px 24px -8px rgba(251,191,36,0.3)"
                                            : "none",
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                            style={{ background: deal.avatarBg, fontSize: 8, fontWeight: 700, color: "white" }}
                                        >
                                            {deal.avatar}
                                        </div>
                                        <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.92)", fontWeight: 600 }}>
                                            {deal.name}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p
                                            className="text-[11px] tabular-nums"
                                            style={{
                                                color: deal.won ? "#33FF9E" : "rgba(255,255,255,0.85)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {deal.won && <Check className="h-2.5 w-2.5 inline mr-0.5" strokeWidth={3} />}
                                            {deal.value}
                                        </p>
                                        {deal.won ? (
                                            <span className="text-[8px] uppercase tracking-wider" style={{ color: "#00E37A", fontWeight: 700 }}>
                                                Ganho
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                <Clock className="h-2.5 w-2.5" />
                                                <span className="text-[9px] tabular-nums" style={{ fontWeight: 600 }}>
                                                    {deal.days}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Caption */}
            <p className="text-[10px] text-center mt-5" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                Arrasta o card pra próxima etapa. Só isso.
            </p>
        </div>
    );
}

function SalesMockup() {
    const platforms = [
        { logo: hotmartLogo, name: "Hotmart" },
        { logo: kiwifyLogo, name: "Kiwify" },
        { logo: mercadopagoLogo, name: "Mercado Pago" },
        { logo: stripeLogo, name: "Stripe" },
        { logo: pagarmeLogo, name: "Pagar.me" },
        { logo: eduzzLogo, name: "Eduzz" },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        Plataformas que você usa
                    </p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                        Conectadas em 1 clique
                    </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400" style={{ fontWeight: 600 }}>Sincronizando</span>
                </div>
            </div>

            {/* MOBILE: 6 platform logos, 3 cols × 2 rows */}
            <div className="grid grid-cols-3 gap-2 mb-4 md:hidden">
                {platforms.map((p, i) => (
                    <motion.div
                        key={p.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div
                            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md"
                            style={{ background: "rgba(255,255,255,0.95)" }}
                        >
                            <img src={p.logo} alt={p.name} width={20} height={20} loading="lazy" decoding="async" className="max-w-[72%] max-h-[72%] object-contain" />
                        </div>
                        <span className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                            {p.name}
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* DESKTOP: infinite horizontal ticker (Linear / Folk style) */}
            <div className="hidden md:block mb-4 relative overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}>
                <div className="flex gap-2.5 sales-ticker" style={{ width: "max-content" }}>
                    {[...platforms, ...platforms, ...platforms].map((p, i) => (
                        <div
                            key={`${p.name}-${i}`}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg shrink-0"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                minWidth: 160,
                            }}
                        >
                            <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md" style={{ background: "rgba(255,255,255,0.95)" }}>
                                <img src={p.logo} alt={p.name} width={22} height={22} loading="lazy" decoding="async" className="max-w-[72%] max-h-[72%] object-contain" />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[11px] truncate" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                                    {p.name}
                                </span>
                                <span className="block text-[9px]" style={{ color: "rgba(0,227,122,0.75)", fontWeight: 600 }}>
                                    • sincronizando
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Flow arrow */}
            <div className="flex flex-col items-center gap-1 mb-3">
                <div className="w-px h-3" style={{ background: "linear-gradient(to bottom, rgba(0,227,122,0.5), rgba(0,227,122,0.1))" }} />
                <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(0,227,122,0.6)", fontWeight: 700 }}>
                    Venda aprovada
                </span>
            </div>

            {/* Live sale card — the hero of this mockup */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl p-4 md:p-5 mt-auto relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(0,227,122,0.1), rgba(52,211,153,0.03))",
                    border: "1px solid rgba(0,227,122,0.3)",
                    boxShadow: "0 8px 32px -12px rgba(0,227,122,0.3)",
                }}
            >
                <div
                    className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(0,227,122,0.18) 0%, transparent 70%)" }}
                />

                <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,227,122,0.18)", border: "1px solid rgba(0,227,122,0.35)" }}>
                                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-400" strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[11px] md:text-xs" style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>
                                        Nova venda
                                    </p>
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[9px] md:text-[10px] text-emerald-400" style={{ fontWeight: 600 }}>agora</span>
                                </div>
                                <p className="text-[9px] md:text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                                    Hotmart · Curso Método V
                                </p>
                            </div>
                        </div>
                        <span className="text-base md:text-lg tabular-nums text-emerald-400" style={{ fontWeight: 800 }}>
                            +R$ 497
                        </span>
                    </div>

                    <div className="space-y-1.5 pt-2.5" style={{ borderTop: "1px solid rgba(0,227,122,0.15)" }}>
                        <div className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-emerald-400 shrink-0" strokeWidth={3} />
                            <p className="text-[10px] md:text-[11px]" style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                                Deal criado no pipeline
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-emerald-400 shrink-0" strokeWidth={3} />
                            <p className="text-[10px] md:text-[11px]" style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                                Ranking do vendedor atualizado
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style>{`
                @keyframes sales-ticker-kf {
                    from { transform: translate3d(0, 0, 0); }
                    to { transform: translate3d(calc(-100% / 3), 0, 0); }
                }
                .sales-ticker {
                    animation: sales-ticker-kf 28s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .sales-ticker { animation: none; }
                }
            `}</style>
        </div>
    );
}

function GoalsMockup() {
    const goals = [
        { label: "Meta diária", value: "R$ 4.200", target: "R$ 5.000", pct: 84, color: "#00E37A" },
        { label: "Meta semanal", value: "R$ 22.100", target: "R$ 35.000", pct: 63, color: "#33FF9E" },
        { label: "Meta mensal", value: "R$ 68.400", target: "R$ 150.000", pct: 46, color: "#a7f3d0" },
    ];

    return (
        <div className="p-6 sm:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        Metas do time
                    </p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                        Progresso em tempo real
                    </p>
                </div>
                <div className="px-2.5 py-1 rounded-full" style={{ background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}>
                    <span className="text-[10px] text-emerald-400" style={{ fontWeight: 600 }}>+12% vs ontem</span>
                </div>
            </div>

            {/* Circular progress main */}
            <div className="flex items-center justify-center mb-6">
                <div className="relative">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        <motion.circle
                            cx="70" cy="70" r="60" fill="none"
                            stroke="url(#goal-gradient)" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 60}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - 0.63) }}
                            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                            transform="rotate(-90 70 70)"
                        />
                        <defs>
                            <linearGradient id="goal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#00E37A" />
                                <stop offset="100%" stopColor="#33FF9E" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-3xl tabular-nums"
                            style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700, letterSpacing: "-0.03em" }}
                        >63%</motion.span>
                        <span className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>Semanal</span>
                    </div>
                </div>
            </div>

            {/* Linear progress bars */}
            <div className="space-y-3 mt-auto">
                {goals.map((g, i) => (
                    <motion.div
                        key={g.label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                    >
                        <div className="flex justify-between mb-1">
                            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{g.label}</span>
                            <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                                {g.value} <span style={{ color: "rgba(255,255,255,0.35)" }}>/ {g.target}</span>
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${g.pct}%` }}
                                transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ background: g.color }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function WhatsAppMockup() {
    return (
        <div className="p-6 sm:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00E37A, #00B289)" }}>
                        <span className="text-xs" style={{ color: "white", fontWeight: 700 }}>JR</span>
                    </div>
                    <div>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Juliana Ribeiro</p>
                        <div className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>online</span>
                        </div>
                    </div>
                </div>
                <MessageCircle className="h-4 w-4 text-emerald-400" />
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-start"
                >
                    <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[75%]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                            Oi! Vi o conteúdo de vocês mas achei meio caro comparado com a concorrência...
                        </p>
                    </div>
                </motion.div>

                {/* IA suggestion card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-xl p-3 ml-6"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                >
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px]" style={{ color: "#a78bfa", fontWeight: 600, letterSpacing: "0.05em" }}>OBJEÇÃO: PREÇO</span>
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>Sugestão:</span> reforçar ROI e garantia de 7 dias. Não baixar preço.
                    </p>
                    <div className="flex gap-1.5">
                        <button className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", fontWeight: 600 }}>Usar resposta</button>
                        <button className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Ver alternativas</button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex justify-end"
                >
                    <div className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[78%]" style={{ background: "rgba(0,227,122,0.15)", border: "1px solid rgba(0,227,122,0.25)" }}>
                        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.95)" }}>
                            Juliana, entendo! Nossos alunos recuperam o investimento em ~3 semanas. Além disso, você tem 7 dias de garantia pra testar sem risco.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Bot indicator */}
            <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <Bot className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>Copiloto identificou 3 objeções e sugeriu 2 respostas</span>
            </div>
        </div>
    );
}

// ─── Feature list ────────────────────────────────────────────────────────────

interface Feature {
    id: string;
    icon: LucideIcon;
    title: string;
    description: string;
    Mockup: React.FC;
}

const FEATURES: readonly Feature[] = [
    {
        id: "ranking",
        icon: Trophy,
        title: "Ranking ao vivo",
        description: "Pódio atualiza a cada venda. Vendedor abre o celular, vê a posição e corre atrás. Sem você precisar \"rodar os números\" no fim do mês.",
        Mockup: RankingMockup,
    },
    {
        id: "pipeline",
        icon: Kanban,
        title: "Pipeline visual",
        description: "Arrasta, solta, fecha. As etapas são como seu time realmente vende, não como o software acha que deveriam ser.",
        Mockup: PipelineMockup,
    },
    {
        id: "vendas",
        icon: Webhook,
        title: "Venda automática",
        description: "Qualquer checkout, plataforma de pagamento ou ferramenta que dispare webhook. A venda entra no pipeline e sobe o ranking. Sem planilha, sem importação manual.",
        Mockup: SalesMockup,
    },
    {
        id: "metas",
        icon: Target,
        title: "Meta que cada um enxerga",
        description: "Vendedor abre o app e vê quanto falta. Gestor para de cobrar status no grupo, time para de chutar número no fim do mês.",
        Mockup: GoalsMockup,
    },
    {
        id: "whatsapp",
        icon: MessageCircle,
        title: "WhatsApp com copiloto",
        description: "IA identifica objeção enquanto o lead responde. Sugere resposta, salva no deal — sem alternar entre WhatsApp Web e planilha.",
        Mockup: WhatsAppMockup,
    },
];

// ─── Main ────────────────────────────────────────────────────────────────────

export const ProductBentoGrid = () => {
    const [active, setActive] = useState(0);
    const [userInteracted, setUserInteracted] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-advance until user interacts
    useEffect(() => {
        if (userInteracted) return;
        intervalRef.current = setInterval(() => {
            setActive((a) => (a + 1) % FEATURES.length);
        }, 4500);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [userInteracted]);

    const handleSelect = (i: number) => {
        setUserInteracted(true);
        setActive(i);
    };

    const ActiveMockup = FEATURES[active].Mockup;

    return (
        <section
            id="features"
            className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "var(--vyz-bg)" }}
        >
            {/* Green spotlight from top */}
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ y: 16 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                    <span
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: "var(--fw-medium)",
                            letterSpacing: "0.06em",
                            background: "rgba(0,227,122,0.1)",
                            border: "1px solid rgba(0,227,122,0.2)",
                        }}
                    >
                        <Package className="h-3 w-3" />
                        O QUE TEM DENTRO
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
                        Cinco módulos. Zero genérico.{" "}
                        <span className="text-emerald-400">Cada um resolve uma dor.</span>
                    </h2>
                    <p
                        className="max-w-xl mx-auto"
                        style={{
                            fontSize: "1.0625rem",
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,0.45)",
                        }}
                    >
                        Construído a partir do que{" "}
                        <span style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.85)" }}>
                            time comercial faz no dia a dia
                        </span>
                        . Nada aqui é cosmético.
                    </p>
                </motion.div>

                {/* Interactive showcase — desktop */}
                <div className="hidden lg:grid grid-cols-[360px_1fr] gap-6 items-stretch">
                    {/* Left column: feature list */}
                    <div className="flex flex-col gap-2">
                        {FEATURES.map((f, i) => {
                            const Icon = f.icon;
                            const isActive = i === active;
                            return (
                                <button
                                    key={f.id}
                                    onMouseEnter={() => handleSelect(i)}
                                    onClick={() => handleSelect(i)}
                                    className="group text-left rounded-xl p-4 transition-all duration-300 relative overflow-hidden"
                                    style={{
                                        background: isActive ? "rgba(0,227,122,0.06)" : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${isActive ? "rgba(0,227,122,0.25)" : "rgba(255,255,255,0.05)"}`,
                                    }}
                                >
                                    {/* Active side bar */}
                                    {isActive && (
                                        <motion.span
                                            layoutId="feature-bar"
                                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                                            style={{ background: "linear-gradient(to bottom, #00E37A, #33FF9E)" }}
                                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                        />
                                    )}

                                    <div className="flex items-start gap-3">
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors duration-300"
                                            style={{
                                                background: isActive ? "rgba(0,227,122,0.15)" : "rgba(255,255,255,0.04)",
                                                border: `1px solid ${isActive ? "rgba(0,227,122,0.3)" : "rgba(255,255,255,0.08)"}`,
                                            }}
                                        >
                                            <Icon
                                                className="h-4 w-4 transition-colors"
                                                style={{ color: isActive ? "#33FF9E" : "rgba(255,255,255,0.55)" }}
                                                strokeWidth={1.8}
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className="font-heading transition-colors"
                                                    style={{
                                                        fontWeight: "var(--fw-semibold)",
                                                        fontSize: "0.95rem",
                                                        letterSpacing: "-0.02em",
                                                        color: isActive ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)",
                                                    }}
                                                >
                                                    {f.title}
                                                </span>
                                                <ChevronRight
                                                    className="h-3.5 w-3.5 transition-all duration-300"
                                                    style={{
                                                        color: isActive ? "#33FF9E" : "rgba(255,255,255,0.2)",
                                                        transform: isActive ? "translateX(2px)" : "translateX(0)",
                                                    }}
                                                    strokeWidth={2.5}
                                                />
                                            </div>
                                            <p
                                                className="text-xs leading-relaxed"
                                                style={{ color: isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)" }}
                                            >
                                                {f.description}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right column: big mockup */}
                    <div
                        className="relative rounded-2xl overflow-hidden min-h-[520px]"
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px -20px rgba(0,0,0,0.6)",
                        }}
                    >
                        {/* Subtle emerald glow accent */}
                        <div
                            className="absolute -top-20 -right-20 w-64 h-64 pointer-events-none"
                            style={{
                                background: "radial-gradient(circle, rgba(0,227,122,0.08) 0%, transparent 70%)",
                            }}
                        />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={FEATURES[active].id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                className="relative h-full"
                            >
                                <ActiveMockup />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Mobile fallback: stacked cards */}
                <div className="lg:hidden space-y-4">
                    {FEATURES.map((f) => {
                        const Icon = f.icon;
                        const Mockup = f.Mockup;
                        return (
                            <div
                                key={f.id}
                                className="rounded-2xl overflow-hidden"
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                <div className="p-5 flex items-start gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div
                                        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                                        style={{ background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}
                                    >
                                        <Icon className="h-4 w-4 text-emerald-400" strokeWidth={1.8} />
                                    </div>
                                    <div className="flex-1">
                                        <h3
                                            className="font-heading mb-1"
                                            style={{ fontWeight: "var(--fw-semibold)", fontSize: "0.95rem", color: "rgba(255,255,255,0.95)" }}
                                        >
                                            {f.title}
                                        </h3>
                                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                                            {f.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="min-h-[420px]">
                                    <Mockup />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
