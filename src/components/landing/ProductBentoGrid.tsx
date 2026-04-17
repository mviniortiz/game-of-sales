import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy,
    Zap,
    Kanban,
    Target,
    MessageCircle,
    Crown,
    TrendingUp,
    ChevronRight,
    Check,
    Sparkles,
    Bot,
    Flame,
    Clock,
    Webhook,
    Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.png";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.png";
import greennLogo from "@/assets/integrations/greenn.png";
import caktoLogo from "@/assets/integrations/cakto.png";
import celetusLogo from "@/assets/integrations/celetus.png";
import rdstationLogo from "@/assets/integrations/rdstation.png";
import stripeLogo from "@/assets/integrations/stripe.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.png";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";
import eduzzLogo from "@/assets/integrations/eduzz.png";
import monetizzeLogo from "@/assets/integrations/monetizze.png";
import braipLogo from "@/assets/integrations/braip.png";

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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
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
            count: 24,
            total: "R$ 48.2k",
            color: "#3b82f6",
            accent: "rgba(59,130,246,0.12)",
            border: "rgba(59,130,246,0.25)",
            deals: [
                {
                    name: "Juliana Ribeiro",
                    company: "Bolt Academy",
                    value: "R$ 2.4k",
                    avatar: "JR",
                    avatarBg: "linear-gradient(135deg,#60a5fa,#3b82f6)",
                    days: "2d",
                },
                {
                    name: "Pedro Martins",
                    company: "Marketing Pro",
                    value: "R$ 997",
                    avatar: "PM",
                    avatarBg: "linear-gradient(135deg,#818cf8,#6366f1)",
                    days: "4d",
                },
            ],
        },
        {
            title: "Proposta",
            count: 12,
            total: "R$ 62.8k",
            color: "#a78bfa",
            accent: "rgba(167,139,250,0.12)",
            border: "rgba(167,139,250,0.28)",
            deals: [
                {
                    name: "Fernanda Alves",
                    company: "Solar Up",
                    value: "R$ 4.8k",
                    avatar: "FA",
                    avatarBg: "linear-gradient(135deg,#f472b6,#ec4899)",
                    days: "5d",
                    hot: true,
                    dragging: true,
                },
                {
                    name: "Rafael Tavares",
                    company: "Fit Method",
                    value: "R$ 1.2k",
                    avatar: "RT",
                    avatarBg: "linear-gradient(135deg,#c084fc,#a855f7)",
                    days: "1d",
                },
            ],
        },
        {
            title: "Fechado",
            count: 7,
            total: "R$ 28.1k",
            color: "#10b981",
            accent: "rgba(16,185,129,0.12)",
            border: "rgba(16,185,129,0.28)",
            deals: [
                {
                    name: "Ana Lima",
                    company: "Design Lab",
                    value: "R$ 5.9k",
                    avatar: "AL",
                    avatarBg: "linear-gradient(135deg,#34d399,#10b981)",
                    won: true,
                },
                {
                    name: "Diego Pereira",
                    company: "Tech Course",
                    value: "R$ 2.1k",
                    avatar: "DP",
                    avatarBg: "linear-gradient(135deg,#6ee7b7,#10b981)",
                    won: true,
                },
            ],
        },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        Pipeline de vendas
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                            43 deals
                        </p>
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                        <p className="text-sm tabular-nums" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                            R$ 139.1k
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md tabular-nums" style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", fontWeight: 700 }}>
                            +18%
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Kanban className="h-3 w-3" style={{ color: "rgba(255,255,255,0.5)" }} />
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Kanban</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 flex-1">
                {columns.map((col, colIdx) => (
                    <div key={col.title} className="flex flex-col min-w-0">
                        {/* Column header */}
                        <div
                            className="rounded-lg px-2.5 py-2 mb-2"
                            style={{ background: col.accent, border: `1px solid ${col.border}` }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                                    <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                                        {col.title}
                                    </span>
                                </div>
                                <span
                                    className="text-[9px] tabular-nums px-1.5 py-0.5 rounded-md"
                                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", fontWeight: 700 }}
                                >
                                    {col.count}
                                </span>
                            </div>
                            <p className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                                {col.total}
                            </p>
                        </div>

                        {/* Deal cards */}
                        <div className="space-y-1.5">
                            {col.deals.map((deal, i) => (
                                <motion.div
                                    key={deal.name}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        rotate: deal.dragging ? -2 : 0,
                                        scale: deal.dragging ? 1.02 : 1,
                                    }}
                                    transition={{ delay: colIdx * 0.08 + i * 0.06 }}
                                    className="rounded-xl p-2.5 relative"
                                    style={{
                                        background: deal.dragging
                                            ? "rgba(167,139,250,0.1)"
                                            : deal.won
                                                ? "rgba(16,185,129,0.04)"
                                                : "rgba(255,255,255,0.025)",
                                        border: `1px solid ${
                                            deal.dragging
                                                ? "rgba(167,139,250,0.35)"
                                                : deal.won
                                                    ? "rgba(16,185,129,0.15)"
                                                    : "rgba(255,255,255,0.06)"
                                        }`,
                                        boxShadow: deal.dragging
                                            ? "0 8px 24px -8px rgba(167,139,250,0.35)"
                                            : "none",
                                    }}
                                >
                                    {/* Hot tag */}
                                    {deal.hot && (
                                        <div
                                            className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                                            style={{ background: "#ef4444", boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}
                                        >
                                            <Flame className="h-2 w-2 text-white" fill="currentColor" />
                                            <span className="text-[8px] text-white" style={{ fontWeight: 700, letterSpacing: "0.03em" }}>
                                                HOT
                                            </span>
                                        </div>
                                    )}

                                    {/* Avatar + name */}
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
                                    <p className="text-[9px] truncate mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        {deal.company}
                                    </p>

                                    {/* Footer: value + time/status */}
                                    <div className="flex items-center justify-between">
                                        <p
                                            className="text-[11px] tabular-nums"
                                            style={{
                                                color: deal.won ? "#34d399" : "rgba(255,255,255,0.85)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {deal.won && <Check className="h-2.5 w-2.5 inline mr-0.5" strokeWidth={3} />}
                                            {deal.value}
                                        </p>
                                        {deal.won ? (
                                            <span className="text-[9px] uppercase tracking-wider" style={{ color: "#10b981", fontWeight: 700 }}>
                                                Won
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

                            {/* Add deal ghost */}
                            <div
                                className="rounded-xl h-8 flex items-center justify-center gap-1"
                                style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
                            >
                                <Plus className="h-3 w-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
                                    Adicionar
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SalesMockup() {
    const platforms = [
        { logo: hotmartLogo, name: "Hotmart" },
        { logo: kiwifyLogo, name: "Kiwify" },
        { logo: greennLogo, name: "Greenn" },
        { logo: caktoLogo, name: "Cakto" },
        { logo: celetusLogo, name: "Celetus" },
        { logo: rdstationLogo, name: "RD Station" },
        { logo: stripeLogo, name: "Stripe" },
        { logo: mercadopagoLogo, name: "Mercado Pago" },
        { logo: pagarmeLogo, name: "Pagar.me" },
        { logo: eduzzLogo, name: "Eduzz" },
        { logo: monetizzeLogo, name: "Monetizze" },
        { logo: braipLogo, name: "Braip" },
    ];

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                        Integrações ativas
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                            12 plataformas
                        </p>
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                            sync em tempo real
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400" style={{ fontWeight: 600 }}>Conectado</span>
                </div>
            </div>

            {/* Logo grid - 4 cols × 3 rows */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {platforms.map((p, i) => (
                    <motion.div
                        key={p.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="group flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg transition-colors"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div
                            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md"
                            style={{ background: "rgba(255,255,255,0.95)" }}
                        >
                            <img
                                src={p.logo}
                                alt={p.name}
                                className="max-w-[70%] max-h-[70%] object-contain"
                                style={{ imageRendering: "auto" }}
                            />
                        </div>
                        <span
                            className="text-[9px] truncate max-w-full text-center"
                            style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}
                        >
                            {p.name}
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* Webhook highlight card */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-xl p-3 mb-3 relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.04))",
                    border: "1px solid rgba(16,185,129,0.25)",
                }}
            >
                <div
                    className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)" }}
                />
                <div className="relative flex items-start gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
                    >
                        <Webhook className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>
                                Webhook customizado
                            </span>
                            <span
                                className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", fontWeight: 700 }}
                            >
                                Any platform
                            </span>
                        </div>
                        <p className="text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                            Conecta qualquer plataforma que dispare webhook
                        </p>
                        <div
                            className="font-mono text-[9px] px-2 py-1 rounded"
                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(52,211,153,0.9)" }}
                        >
                            <span style={{ color: "rgba(255,255,255,0.35)" }}>POST</span> /hooks/vendas/<span style={{ color: "rgba(255,255,255,0.5)" }}>seu-token</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Live incoming sale */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg mt-auto"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
            >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                            Nova venda
                        </p>
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] text-emerald-400" style={{ fontWeight: 600 }}>agora</span>
                    </div>
                    <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Curso Método V • Hotmart
                    </p>
                </div>
                <span className="text-sm tabular-nums text-emerald-400 shrink-0" style={{ fontWeight: 700 }}>
                    +R$ 497
                </span>
            </motion.div>
        </div>
    );
}

function GoalsMockup() {
    const goals = [
        { label: "Meta diária", value: "R$ 4.200", target: "R$ 5.000", pct: 84, color: "#10b981" },
        { label: "Meta semanal", value: "R$ 22.100", target: "R$ 35.000", pct: 63, color: "#34d399" },
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
                <div className="px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
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
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#34d399" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-3xl tabular-nums"
                            style={{ color: "rgba(255,255,255,0.95)", fontWeight: 800, letterSpacing: "-0.03em" }}
                        >63%</motion.span>
                        <span className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Semanal</span>
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
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
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
                        <Sparkles className="h-3 w-3" style={{ color: "#a78bfa" }} />
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
                    <div className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[78%]" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}>
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
        description: "Pódio em tempo real. Cada venda sobe o placar na hora — seu time compete e vende mais.",
        Mockup: RankingMockup,
    },
    {
        id: "pipeline",
        icon: Kanban,
        title: "Pipeline Kanban",
        description: "Arrasta e solta. Cada deal do lead ao fechamento. Customize as etapas do seu funil.",
        Mockup: PipelineMockup,
    },
    {
        id: "vendas",
        icon: Zap,
        title: "Integra com tudo",
        description: "Hotmart, Kiwify, Stripe, Mercado Pago e mais 10+ plataformas. Ou use webhook custom pra conectar qualquer outra.",
        Mockup: SalesMockup,
    },
    {
        id: "metas",
        icon: Target,
        title: "Metas com visibilidade",
        description: "Meta individual e do time. Cada vendedor vê quanto falta e quanto já entregou.",
        Mockup: GoalsMockup,
    },
    {
        id: "whatsapp",
        icon: MessageCircle,
        title: "WhatsApp com IA",
        description: "Copiloto identifica objeção e sugere resposta em tempo real. Hub unificado por vendedor.",
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
            style={{ background: "#06080a" }}
        >
            {/* Green spotlight from top */}
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                    <span
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: "var(--fw-medium)",
                            letterSpacing: "0.06em",
                            background: "rgba(16,185,129,0.1)",
                            border: "1px solid rgba(16,185,129,0.2)",
                        }}
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
                        style={{
                            fontSize: "1.0625rem",
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,0.45)",
                        }}
                    >
                        Passa o mouse pra explorar.{" "}
                        <span style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.85)" }}>
                            Sem ficar pulando de aba
                        </span>
                        .
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
                                        background: isActive ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${isActive ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.05)"}`,
                                    }}
                                >
                                    {/* Active side bar */}
                                    {isActive && (
                                        <motion.span
                                            layoutId="feature-bar"
                                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                                            style={{ background: "linear-gradient(to bottom, #10b981, #34d399)" }}
                                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                        />
                                    )}

                                    <div className="flex items-start gap-3">
                                        <div
                                            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors duration-300"
                                            style={{
                                                background: isActive ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                                                border: `1px solid ${isActive ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
                                            }}
                                        >
                                            <Icon
                                                className="h-4 w-4 transition-colors"
                                                style={{ color: isActive ? "#34d399" : "rgba(255,255,255,0.55)" }}
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
                                                        color: isActive ? "#34d399" : "rgba(255,255,255,0.2)",
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
                                background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
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
                                        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
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
