import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowRight, Play, TrendingUp, Users, Target, Trophy, Zap, BarChart3, MessageSquare, Settings, Send, Check, CheckCheck, Phone, Paperclip, Clock, ChevronRight, Bell, User, Shield, Palette, Calendar } from "lucide-react";

// ─── Bar chart data ─────────────────────────────────────────────────────────
const barData = [
    { name: "Mateus", targetH: 130, delay: 100, score: "3.2k" },
    { name: "Sofia", targetH: 175, delay: 200, score: "4.5k" },
    { name: "Ana", targetH: 255, delay: 400, score: "8.9k", isWinner: true },
    { name: "Lucas", targetH: 205, delay: 300, score: "6.1k" },
    { name: "João", targetH: 95, delay: 0, score: "2.1k" },
];

const SPARKLINE = [30, 45, 35, 55, 48, 65, 58, 72, 68, 85, 78, 92];

const SIDEBAR_ITEMS = [
    { id: "dashboard", icon: BarChart3, label: "Dashboard" },
    { id: "pipeline", icon: Target, label: "Pipeline" },
    { id: "ranking", icon: Trophy, label: "Ranking" },
    { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
    { id: "settings", icon: Settings, label: "Configurações" },
];

// ─── View data per sidebar tab ──────────────────────────────────────────────
const VIEWS: Record<string, { title: string; greeting: string }> = {
    dashboard: { title: "Dashboard", greeting: "Bom dia, Ana" },
    pipeline: { title: "Pipeline", greeting: "28 deals ativos" },
    ranking: { title: "Ranking", greeting: "Temporada Abril" },
    whatsapp: { title: "WhatsApp", greeting: "3 conversas novas" },
    settings: { title: "Configurações", greeting: "Conta & Preferências" },
};

const RANKING_DATA = [
    { name: "Ana Silva", xp: "8.9k", avatar: "bg-gradient-to-br from-rose-400 to-pink-500", initial: "A", medal: "🥇", pct: 92 },
    { name: "Lucas M.", xp: "6.1k", avatar: "bg-gradient-to-br from-blue-400 to-indigo-500", initial: "L", medal: "🥈", pct: 68 },
    { name: "Sofia R.", xp: "4.5k", avatar: "bg-gradient-to-br from-amber-400 to-orange-500", initial: "S", medal: "🥉", pct: 50 },
];

const PIPELINE_DATA = [
    { stage: "Novo", count: 12, color: "from-blue-500 to-blue-400", bg: "rgba(96,165,250,0.1)", hoverBg: "rgba(96,165,250,0.18)", text: "rgba(147,197,253,0.9)" },
    { stage: "Qualif.", count: 8, color: "from-amber-500 to-amber-400", bg: "rgba(251,191,36,0.1)", hoverBg: "rgba(251,191,36,0.18)", text: "rgba(252,211,77,0.9)" },
    { stage: "Proposta", count: 5, color: "from-purple-500 to-purple-400", bg: "rgba(168,85,247,0.1)", hoverBg: "rgba(168,85,247,0.18)", text: "rgba(196,148,252,0.9)" },
    { stage: "Fechado", count: 3, color: "from-emerald-500 to-emerald-400", bg: "rgba(16,185,129,0.1)", hoverBg: "rgba(16,185,129,0.18)", text: "rgba(110,231,183,0.9)" },
];

// ─── Pipeline View ──────────────────────────────────────────────────────────
const PIPELINE_COLUMNS = [
    {
        title: "Novo Lead", color: "#60a5fa", count: 4,
        deals: [
            { name: "TechCorp Ltda", value: "R$ 12.500", time: "2h atrás", avatar: "M" },
            { name: "StartupXYZ", value: "R$ 8.200", time: "5h atrás", avatar: "S" },
            { name: "InfoDigital", value: "R$ 4.800", time: "1d atrás", avatar: "I" },
        ],
    },
    {
        title: "Qualificado", color: "#fbbf24", count: 3,
        deals: [
            { name: "MegaStore SA", value: "R$ 45.000", time: "Reunião amanhã", avatar: "M", hot: true },
            { name: "CloudNet", value: "R$ 18.700", time: "Aguardando", avatar: "C" },
        ],
    },
    {
        title: "Proposta", color: "#a78bfa", count: 2,
        deals: [
            { name: "FastLog Express", value: "R$ 32.000", time: "Enviada há 2d", avatar: "F" },
            { name: "BioHealth", value: "R$ 22.400", time: "Em revisão", avatar: "B" },
        ],
    },
    {
        title: "Fechado ✓", color: "#34d399", count: 2,
        deals: [
            { name: "DataPrime", value: "R$ 28.900", time: "Hoje!", avatar: "D", won: true },
        ],
    },
];

const PipelineView = () => (
    <div className="space-y-2.5">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-[8px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>11 deals</span>
                <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)" }}>R$ 172.5k no pipe</span>
            </div>
            <div className="flex gap-1">
                {["Kanban", "Lista"].map((v, i) => (
                    <span key={v} className="text-[7px] px-1.5 py-0.5 rounded" style={{ background: i === 0 ? "rgba(16,185,129,0.12)" : "transparent", color: i === 0 ? "#34d399" : "rgba(255,255,255,0.25)", fontWeight: i === 0 ? 600 : 400 }}>{v}</span>
                ))}
            </div>
        </div>
        <div className="flex gap-1.5" style={{ minHeight: 220 }}>
            {PIPELINE_COLUMNS.map((col, ci) => (
                <div key={ci} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                        <span className="text-[8px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{col.title}</span>
                        <span className="text-[7px] px-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>{col.count}</span>
                    </div>
                    <div className="space-y-1">
                        {col.deals.map((deal, di) => (
                            <motion.div
                                key={di}
                                className="rounded-lg p-1.5 cursor-pointer transition-all duration-150 group"
                                style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + ci * 0.08 + di * 0.05 }}
                                whileHover={{ y: -1, boxShadow: `0 0 0 1px ${col.color}33, 0 4px 8px rgba(0,0,0,0.3)` }}
                            >
                                <div className="flex items-center gap-1 mb-0.5">
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold text-white shrink-0" style={{ background: `${col.color}40` }}>{deal.avatar}</div>
                                    <p className="text-[8px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{deal.name}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-bold" style={{ color: deal.won ? "#34d399" : "rgba(255,255,255,0.5)" }}>{deal.value}</span>
                                    {deal.hot && <span className="text-[6px]">🔥</span>}
                                    {deal.won && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                                </div>
                                <p className="text-[6px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{deal.time}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ─── Ranking View ───────────────────────────────────────────────────────────
const FULL_RANKING = [
    { name: "Ana Silva", xp: "8.9k", sales: 38, revenue: "R$ 89k", avatar: "bg-gradient-to-br from-rose-400 to-pink-500", initial: "A", medal: "🥇", pct: 92, trend: "+12%" },
    { name: "Lucas Mendes", xp: "6.1k", sales: 27, revenue: "R$ 61k", avatar: "bg-gradient-to-br from-blue-400 to-indigo-500", initial: "L", medal: "🥈", pct: 68, trend: "+8%" },
    { name: "Sofia Reis", xp: "4.5k", sales: 21, revenue: "R$ 45k", avatar: "bg-gradient-to-br from-amber-400 to-orange-500", initial: "S", medal: "🥉", pct: 50, trend: "+15%" },
    { name: "Mateus Costa", xp: "3.2k", sales: 15, revenue: "R$ 32k", avatar: "bg-gradient-to-br from-emerald-400 to-teal-500", initial: "M", pct: 36, trend: "+3%" },
    { name: "João Pedro", xp: "2.1k", sales: 11, revenue: "R$ 21k", avatar: "bg-gradient-to-br from-purple-400 to-violet-500", initial: "J", pct: 23, trend: "-2%" },
];

const RankingView = () => {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[8px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>🏆 Temporada Abril</span>
                </div>
                <div className="flex gap-1">
                    {["Semanal", "Mensal", "Total"].map((v, i) => (
                        <span key={v} className="text-[7px] px-1.5 py-0.5 rounded cursor-pointer" style={{ background: i === 1 ? "rgba(16,185,129,0.12)" : "transparent", color: i === 1 ? "#34d399" : "rgba(255,255,255,0.25)", fontWeight: i === 1 ? 600 : 400 }}>{v}</span>
                    ))}
                </div>
            </div>

            {/* Podium top 3 */}
            <div className="flex items-end justify-center gap-3 pt-2 pb-1">
                {[FULL_RANKING[1], FULL_RANKING[0], FULL_RANKING[2]].map((s, i) => {
                    const heights = [52, 68, 40];
                    const places = ["2°", "1°", "3°"];
                    return (
                        <motion.div key={i} className="flex flex-col items-center gap-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}>
                            <div className={`w-7 h-7 rounded-full ${s.avatar} flex items-center justify-center`}>
                                <span className="text-[8px] font-bold text-white">{s.initial}</span>
                            </div>
                            <span className="text-[7px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>{s.name.split(" ")[0]}</span>
                            <div className="w-10 rounded-t-lg flex flex-col items-center justify-end pb-1" style={{ height: heights[i], background: i === 1 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", borderTop: i === 1 ? "2px solid #34d399" : "2px solid rgba(255,255,255,0.08)" }}>
                                <span className="text-[10px]">{s.medal}</span>
                                <span className="text-[7px] font-bold" style={{ color: i === 1 ? "#34d399" : "rgba(255,255,255,0.5)" }}>{places[i]}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Full list */}
            <div className="space-y-0.5">
                {FULL_RANKING.map((s, i) => {
                    const isHovered = hoveredIdx === i;
                    return (
                        <motion.div
                            key={i}
                            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 cursor-pointer transition-all duration-150"
                            style={{ background: isHovered ? "rgba(255,255,255,0.04)" : "transparent" }}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.06 }}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <span className="text-[8px] w-3 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>{s.medal || `${i + 1}`}</span>
                            <div className={`w-5 h-5 rounded-full ${s.avatar} flex items-center justify-center shrink-0`}>
                                <span className="text-[7px] font-bold text-white">{s.initial}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[8px] font-semibold truncate" style={{ color: isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}>{s.name}</p>
                            </div>
                            <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.sales} vendas</span>
                            <span className="text-[7px] font-bold shrink-0" style={{ color: s.trend?.startsWith("+") ? "#34d399" : "#f87171" }}>{s.trend}</span>
                            <span className="text-[7px] font-bold text-emerald-400 shrink-0 w-6 text-right">{s.xp}</span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── WhatsApp View ──────────────────────────────────────────────────────────
const CONVERSATIONS = [
    { name: "Carlos Souza", lastMsg: "Oi, quero saber mais sobre o plano Pro", time: "agora", unread: 2, avatar: "C", online: true },
    { name: "Maria Lima", lastMsg: "Pode enviar a proposta atualizada?", time: "15min", unread: 1, avatar: "M", online: true },
    { name: "Pedro Santos", lastMsg: "Fechado! Vou assinar hoje", time: "1h", avatar: "P", online: false },
    { name: "Julia Ferreira", lastMsg: "Obrigada pelo atendimento!", time: "3h", avatar: "J", online: false },
];

const CHAT_MESSAGES = [
    { from: "them", text: "Oi! Vi o anúncio de vocês no Instagram", time: "14:02" },
    { from: "them", text: "Quero saber mais sobre o plano Pro", time: "14:02" },
    { from: "me", text: "Olá Carlos! 😊 Fico feliz pelo interesse!", time: "14:03" },
    { from: "me", text: "O plano Pro inclui pipeline ilimitado, ranking gamificado e integrações com Hotmart e Kiwify", time: "14:03" },
    { from: "them", text: "Que legal! Quanto custa?", time: "14:05" },
];

const WhatsAppView = () => {
    const [activeChat, setActiveChat] = useState(0);
    const [hoveredChat, setHoveredChat] = useState<number | null>(null);
    return (
        <div className="flex gap-0 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", minHeight: 230 }}>
            {/* Contact list */}
            <div className="w-[38%] shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-1 px-1.5 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>🔍</span>
                        <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.2)" }}>Buscar conversa...</span>
                    </div>
                </div>
                <div className="space-y-0">
                    {CONVERSATIONS.map((c, i) => (
                        <motion.div
                            key={i}
                            className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-all duration-100"
                            style={{
                                background: activeChat === i ? "rgba(16,185,129,0.08)" : hoveredChat === i ? "rgba(255,255,255,0.03)" : "transparent",
                                borderLeft: activeChat === i ? "2px solid #34d399" : "2px solid transparent",
                            }}
                            onClick={() => setActiveChat(i)}
                            onMouseEnter={() => setHoveredChat(i)}
                            onMouseLeave={() => setHoveredChat(null)}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                        >
                            <div className="relative shrink-0">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: "rgba(255,255,255,0.1)" }}>{c.avatar}</div>
                                {c.online && <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ border: "1.5px solid #0d1117" }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-[7px] font-semibold truncate" style={{ color: activeChat === i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)" }}>{c.name}</p>
                                    <span className="text-[6px] shrink-0" style={{ color: c.unread ? "#34d399" : "rgba(255,255,255,0.2)" }}>{c.time}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[6px] truncate" style={{ color: "rgba(255,255,255,0.25)" }}>{c.lastMsg}</p>
                                    {c.unread && <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-[6px] font-bold text-white shrink-0">{c.unread}</span>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
                {/* Chat header */}
                <div className="flex items-center justify-between px-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: "rgba(255,255,255,0.1)" }}>{CONVERSATIONS[activeChat].avatar}</div>
                        <div>
                            <p className="text-[8px] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{CONVERSATIONS[activeChat].name}</p>
                            <p className="text-[6px]" style={{ color: CONVERSATIONS[activeChat].online ? "#34d399" : "rgba(255,255,255,0.25)" }}>{CONVERSATIONS[activeChat].online ? "online" : "offline"}</p>
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <Phone className="w-2.5 h-2.5 cursor-pointer" style={{ color: "rgba(255,255,255,0.25)" }} />
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 px-2 py-1.5 space-y-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
                    {CHAT_MESSAGES.map((msg, i) => (
                        <motion.div
                            key={i}
                            className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.08 }}
                        >
                            <div
                                className="max-w-[80%] rounded-lg px-2 py-1"
                                style={{
                                    background: msg.from === "me" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                                    boxShadow: "0 0 0 1px " + (msg.from === "me" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)"),
                                }}
                            >
                                <p className="text-[7px]" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{msg.text}</p>
                                <div className="flex items-center justify-end gap-0.5 mt-0.5">
                                    <span className="text-[5px]" style={{ color: "rgba(255,255,255,0.2)" }}>{msg.time}</span>
                                    {msg.from === "me" && <CheckCheck className="w-2 h-2 text-emerald-400" />}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Input */}
                <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Paperclip className="w-2.5 h-2.5 shrink-0 cursor-pointer" style={{ color: "rgba(255,255,255,0.2)" }} />
                    <div className="flex-1 rounded-md px-2 py-1 text-[7px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}>
                        Digite uma mensagem...
                    </div>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer" style={{ background: "rgba(16,185,129,0.15)" }}>
                        <Send className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Settings View ──────────────────────────────────────────────────────────
const SETTINGS_SECTIONS = [
    {
        title: "Conta",
        items: [
            { icon: User, label: "Perfil", desc: "Nome, email, avatar", badge: null },
            { icon: Shield, label: "Segurança", desc: "Senha, 2FA, sessões", badge: "2FA ativo" },
            { icon: Bell, label: "Notificações", desc: "Email, push, WhatsApp", badge: null },
        ],
    },
    {
        title: "Preferências",
        items: [
            { icon: Palette, label: "Aparência", desc: "Tema, idioma, fuso horário", badge: "Dark" },
            { icon: Target, label: "Metas", desc: "Configurar metas do time", badge: null },
            { icon: MessageSquare, label: "Integrações", desc: "Hotmart, Kiwify, Greenn", badge: "3 ativas" },
        ],
    },
];

const SettingsView = () => {
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    return (
        <div className="space-y-3">
            {/* Profile card */}
            <motion.div
                className="flex items-center gap-2.5 p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white">A</div>
                <div className="flex-1">
                    <p className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>Ana Silva</p>
                    <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>ana@empresa.com.br</p>
                </div>
                <span className="text-[7px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>Pro</span>
            </motion.div>

            {SETTINGS_SECTIONS.map((section, si) => (
                <div key={si}>
                    <p className="text-[8px] uppercase tracking-wider mb-1.5 px-1" style={{ color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>{section.title}</p>
                    <div className="space-y-0.5">
                        {section.items.map((item, ii) => {
                            const Icon = item.icon;
                            const key = `${si}-${ii}`;
                            const isHovered = hoveredItem === key;
                            return (
                                <motion.div
                                    key={key}
                                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-150"
                                    style={{ background: isHovered ? "rgba(255,255,255,0.04)" : "transparent" }}
                                    initial={{ opacity: 0, x: 6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + si * 0.1 + ii * 0.05 }}
                                    onMouseEnter={() => setHoveredItem(key)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                                        <Icon className="w-3 h-3" style={{ color: isHovered ? "#34d399" : "rgba(255,255,255,0.35)" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[8px] font-semibold" style={{ color: isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)" }}>{item.label}</p>
                                        <p className="text-[7px]" style={{ color: "rgba(255,255,255,0.2)" }}>{item.desc}</p>
                                    </div>
                                    {item.badge && <span className="text-[6px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>{item.badge}</span>}
                                    <ChevronRight className="w-2.5 h-2.5 shrink-0 transition-transform duration-150" style={{ color: "rgba(255,255,255,0.15)", transform: isHovered ? "translateX(2px)" : "none" }} />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Inline Dashboard ───────────────────────────────────────────────────────
const DashboardMockup = () => {
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);
    const progressRef = useRef<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);
    const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
    const [hoveredPipeline, setHoveredPipeline] = useState<number | null>(null);
    const [hoveredRanking, setHoveredRanking] = useState<number | null>(null);
    const [chartPeriod, setChartPeriod] = useState<"semanal" | "mensal">("semanal");

    const animateBars = useCallback(() => {
        barData.forEach((bar, i) => {
            const el = barsRef.current[i];
            if (!el) return;
            el.style.height = "0%";
            el.style.opacity = "0";
            setTimeout(() => {
                if (!barsRef.current[i]) return;
                el.style.height = `${(bar.targetH / 255) * 100}%`;
                el.style.opacity = "1";
            }, 150 + bar.delay);
        });
    }, []);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(animateBars, 800));
        if (progressRef.current) {
            timers.push(setTimeout(() => {
                if (progressRef.current) progressRef.current.style.strokeDashoffset = "18.5";
            }, 1000));
        }
        return () => timers.forEach(clearTimeout);
    }, [animateBars]);

    const handleTabChange = (id: string) => {
        setActiveTab(id);
        // Re-trigger bar animation on dashboard tab
        if (id === "dashboard") {
            setTimeout(animateBars, 100);
        }
    };

    const view = VIEWS[activeTab];

    return (
        <div
            className="rounded-2xl overflow-hidden w-full select-none"
            style={{
                background: "#0d1117",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px -12px rgba(0,0,0,0.7)",
            }}
        >
            {/* Title bar */}
            <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{
                    background: "linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex justify-center">
                    <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.3)",
                        }}
                    >
                        <svg className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.2)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        vyzon.com.br/{activeTab}
                    </div>
                </div>
            </div>

            {/* App body */}
            <div className="flex flex-col sm:flex-row">
                {/* Sidebar — desktop only */}
                <div
                    className="hidden sm:flex w-11 flex-col items-center py-3 gap-1 shrink-0"
                    style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-2">
                        <span className="text-[8px] font-black text-white">V</span>
                    </div>
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group"
                                style={{
                                    background: isActive ? "rgba(16,185,129,0.12)" : "transparent",
                                    color: isActive ? "#34d399" : "rgba(255,255,255,0.2)",
                                }}
                                title={item.label}
                            >
                                <Icon className="w-3.5 h-3.5 transition-colors duration-200 group-hover:text-emerald-400" />
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className="absolute -left-[7px] w-0.5 h-4 rounded-full bg-emerald-400"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 p-2 sm:p-3 space-y-2 sm:space-y-2.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", minHeight: 220 }}>
                    {/* Header — reacts to active tab */}
                    <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                    >
                        <div>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={`greeting-${activeTab}`}
                                    className="text-[10px]"
                                    style={{ color: "rgba(255,255,255,0.3)" }}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {view.greeting}
                                </motion.p>
                            </AnimatePresence>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={`title-${activeTab}`}
                                    className="text-xs font-bold"
                                    style={{ color: "rgba(255,255,255,0.85)" }}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {view.title}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="relative">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.1)]" style={{ background: "rgba(255,255,255,0.06)" }}>🔔</div>
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" style={{ border: "2px solid #0d1117" }} />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[7px] font-bold text-white cursor-pointer">A</div>
                        </div>
                    </motion.div>

                    {/* ── Tab content ── */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2.5"
                        >

                    {activeTab === "pipeline" && <PipelineView />}
                    {activeTab === "ranking" && <RankingView />}
                    {activeTab === "whatsapp" && <WhatsAppView />}
                    {activeTab === "settings" && <SettingsView />}

                    {activeTab === "dashboard" && <>
                    {/* KPIs — hoverable */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                        {[
                            {
                                label: "Receita", value: "R$ 247k", change: "+23%", icon: TrendingUp, iconColor: "text-emerald-400",
                                chart: (
                                    <svg className="w-full h-5 mt-1" viewBox="0 0 120 30" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="sf" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d={`M0,${30 - SPARKLINE[0] * 0.3} ${SPARKLINE.map((v, i) => `L${(i / (SPARKLINE.length - 1)) * 120},${30 - v * 0.3}`).join(" ")} L120,30 L0,30 Z`} fill="url(#sf)" />
                                        <path d={`M0,${30 - SPARKLINE[0] * 0.3} ${SPARKLINE.map((v, i) => `L${(i / (SPARKLINE.length - 1)) * 120},${30 - v * 0.3}`).join(" ")}`} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                ),
                            },
                            {
                                label: "Vendas", value: "142", change: "+18%", icon: Users, iconColor: "text-blue-400",
                                chart: (
                                    <div className="flex gap-0.5 mt-1.5">
                                        {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                                            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 0.18}px`, background: "rgba(96,165,250,0.1)" }}>
                                                <div className="w-full rounded-sm" style={{ height: `${h}%`, background: "rgba(96,165,250,0.5)" }} />
                                            </div>
                                        ))}
                                    </div>
                                ),
                            },
                            {
                                label: "Meta", value: "87%", icon: Target, iconColor: "text-emerald-400",
                                chart: (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="relative w-10 h-10">
                                            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                                <circle ref={progressRef} cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="88" style={{ transition: "stroke-dashoffset 1.5s ease-out" }} />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>87%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.5)" }}>R$ 215k</p>
                                            <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)" }}>de R$ 250k</p>
                                        </div>
                                    </div>
                                ),
                            },
                        ].map((kpi, i) => {
                            const Icon = kpi.icon;
                            const isHovered = hoveredKpi === i;
                            return (
                                <motion.div
                                    key={kpi.label}
                                    className="rounded-xl p-2.5 cursor-pointer transition-all duration-200"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
                                    style={{
                                        background: isHovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                                        boxShadow: isHovered
                                            ? "0 0 0 1px rgba(16,185,129,0.2), 0 4px 12px rgba(0,0,0,0.2)"
                                            : "0 0 0 1px rgba(255,255,255,0.06)",
                                        transform: isHovered ? "translateY(-1px)" : "none",
                                    }}
                                    onMouseEnter={() => setHoveredKpi(i)}
                                    onMouseLeave={() => setHoveredKpi(null)}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{kpi.label}</p>
                                        <Icon className={`w-2.5 h-2.5 ${kpi.iconColor}`} />
                                    </div>
                                    {kpi.value !== "87%" && (
                                        <>
                                            <p className="text-sm font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.9)" }}>{kpi.value}</p>
                                            {kpi.change && (
                                                <span className="text-[8px] font-semibold text-emerald-400 px-1 rounded inline-block mt-1" style={{ background: "rgba(16,185,129,0.15)" }}>{kpi.change}</span>
                                            )}
                                        </>
                                    )}
                                    {kpi.chart}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Chart + Ranking */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 sm:gap-2">
                        <motion.div
                            className="sm:col-span-3 rounded-xl p-2.5"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0, duration: 0.5 }}
                            style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>Performance</p>
                                    {/* Period toggle */}
                                    <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                                        {(["semanal", "mensal"] as const).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => { setChartPeriod(p); setTimeout(animateBars, 50); }}
                                                className="text-[7px] px-1.5 py-0.5 transition-all duration-150 capitalize"
                                                style={{
                                                    background: chartPeriod === p ? "rgba(16,185,129,0.15)" : "transparent",
                                                    color: chartPeriod === p ? "#34d399" : "rgba(255,255,255,0.25)",
                                                    fontWeight: chartPeriod === p ? 600 : 400,
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>Live</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-1 h-16">
                                {barData.map((bar, i) => {
                                    const isHovered = hoveredBar === i;
                                    return (
                                        <div
                                            key={i}
                                            className="flex-1 flex flex-col items-center gap-0.5 relative"
                                            onMouseEnter={() => setHoveredBar(i)}
                                            onMouseLeave={() => setHoveredBar(null)}
                                        >
                                            {/* Tooltip */}
                                            <AnimatePresence>
                                                {isHovered && (
                                                    <motion.div
                                                        className="absolute -top-5 z-10 px-1.5 py-0.5 rounded text-[7px] font-bold whitespace-nowrap"
                                                        style={{ background: "rgba(16,185,129,0.9)", color: "#fff" }}
                                                        initial={{ opacity: 0, y: 4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 4 }}
                                                        transition={{ duration: 0.12 }}
                                                    >
                                                        {bar.name} · {bar.score}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <div className="w-full relative h-14 flex items-end cursor-pointer">
                                                <div
                                                    ref={el => barsRef.current[i] = el}
                                                    className="w-full rounded-t transition-all duration-[1200ms] ease-out"
                                                    style={{
                                                        height: "0%",
                                                        opacity: 0,
                                                        background: bar.isWinner || isHovered
                                                            ? "linear-gradient(to top, #059669, #34d399)"
                                                            : "linear-gradient(to top, rgba(5,150,105,0.4), rgba(52,211,153,0.25))",
                                                        transform: isHovered ? "scaleX(1.15)" : "scaleX(1)",
                                                        transition: isHovered ? "background 0.15s, transform 0.15s" : "height 1.2s ease-out, opacity 1.2s ease-out",
                                                    }}
                                                />
                                            </div>
                                            <span
                                                className="text-[7px] truncate w-full text-center transition-colors duration-150"
                                                style={{ color: isHovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}
                                            >
                                                {bar.name.slice(0, 3)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        <motion.div
                            className="sm:col-span-2 rounded-xl p-2.5"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1, duration: 0.5 }}
                            style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                        >
                            <p className="text-[10px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>🏆 Ranking</p>
                            <div className="space-y-1.5">
                                {RANKING_DATA.map((seller, i) => {
                                    const isHovered = hoveredRanking === i;
                                    return (
                                        <motion.div
                                            key={i}
                                            className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 cursor-pointer transition-all duration-150"
                                            style={{
                                                background: isHovered ? "rgba(255,255,255,0.04)" : "transparent",
                                            }}
                                            initial={{ opacity: 0, x: 8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1.4 + i * 0.12, duration: 0.4 }}
                                            onMouseEnter={() => setHoveredRanking(i)}
                                            onMouseLeave={() => setHoveredRanking(null)}
                                        >
                                            <span className="text-[10px]">{seller.medal}</span>
                                            <div className={`w-5 h-5 rounded-full ${seller.avatar} flex items-center justify-center shrink-0 transition-transform duration-150`} style={{ transform: isHovered ? "scale(1.15)" : "scale(1)" }}>
                                                <span className="text-[7px] font-bold text-white">{seller.initial}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-semibold truncate transition-colors duration-150" style={{ color: isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)" }}>{seller.name}</p>
                                                <div className="w-full rounded-full h-1 mt-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                    <div
                                                        className="h-1 bg-emerald-400 rounded-full transition-all duration-300"
                                                        style={{ width: isHovered ? `${Math.min(seller.pct + 5, 100)}%` : `${seller.pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-[7px] font-bold text-emerald-400 shrink-0">{seller.xp}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>

                    {/* Pipeline — interactive stages */}
                    <motion.div
                        className="rounded-xl p-2.5"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                        style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>Pipeline de Vendas</p>
                            <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>28 deals ativos</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {PIPELINE_DATA.map((s, i) => {
                                const isHovered = hoveredPipeline === i;
                                return (
                                    <motion.div
                                        key={i}
                                        className="flex-1 cursor-pointer"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.5 + i * 0.08, duration: 0.3 }}
                                        onMouseEnter={() => setHoveredPipeline(i)}
                                        onMouseLeave={() => setHoveredPipeline(null)}
                                    >
                                        <div
                                            className="rounded-lg p-1.5 text-center transition-all duration-150"
                                            style={{
                                                background: isHovered ? s.hoverBg : s.bg,
                                                transform: isHovered ? "translateY(-2px)" : "none",
                                                boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
                                            }}
                                        >
                                            <div className={`w-5 h-1 mx-auto rounded-full bg-gradient-to-r ${s.color} mb-1 transition-all duration-150`} style={{ width: isHovered ? "28px" : "20px" }} />
                                            <p className="text-sm font-bold transition-transform duration-150" style={{ color: s.text, transform: isHovered ? "scale(1.1)" : "scale(1)" }}>{s.count}</p>
                                            <p className="text-[7px] mt-0.5" style={{ color: isHovered ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)" }}>{s.stage}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                    </>}

                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom tab bar — mobile only */}
                <div
                    className="flex sm:hidden items-center justify-around py-1.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                >
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-150"
                                style={{ color: isActive ? "#34d399" : "rgba(255,255,255,0.2)" }}
                            >
                                <Icon className="w-3 h-3" />
                                <span className="text-[6px]" style={{ fontWeight: isActive ? 600 : 400 }}>{item.label.split(" ")[0]}</span>
                                {isActive && <div className="w-3 h-0.5 rounded-full bg-emerald-400 -mt-0.5" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── HeroSection ────────────────────────────────────────────────────────────
interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onScheduleDemoClick?: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onDemoClick, onScheduleDemoClick }: HeroSectionProps) => {
    const sectionRef = useRef<HTMLElement>(null);
    const mockupRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });

    const mockupY = useTransform(scrollYProgress, [0, 1], [0, 120]);
    const mockupScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

    return (
        <section
            ref={sectionRef}
            className="relative overflow-hidden"
            style={{ background: "#06080a" }}
        >
            {/* ── Background layer ── */}
            <div className="absolute inset-0">
                {/* Central emerald glow — static, no blur filter */}
                <div
                    className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full"
                    style={{
                        background: "radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 35%, transparent 60%)",
                    }}
                />
                {/* Fine grid */}
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "80px 80px",
                    }}
                />
                {/* Top fade for nav */}
                <div
                    className="absolute top-0 inset-x-0 h-32"
                    style={{ background: "linear-gradient(to bottom, #06080a, transparent)" }}
                />
            </div>

            {/* ── Content ── */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Text — centered */}
                <div className="pt-32 sm:pt-40 pb-16 sm:pb-20 text-center">
                    {/* Eyebrow */}
                    <motion.div
                        className="inline-flex items-center gap-2 mb-6"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <span
                            className="text-[11px] px-3.5 py-1 rounded-full"
                            style={{
                                color: "rgba(52,211,153,0.9)",
                                background: "rgba(16,185,129,0.08)",
                                border: "1px solid rgba(16,185,129,0.15)",
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                            }}
                        >
                            CRM GAMIFICADO • INTEGRA HOTMART, KIWIFY E GREENN
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        className="font-heading mx-auto"
                        style={{
                            fontSize: "clamp(2.25rem, 6.5vw, 4.5rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.04em",
                            maxWidth: "820px",
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <span style={{ fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>
                            Seu time bate meta quando{" "}
                        </span>
                        <span
                            style={{
                                fontWeight: 900,
                                background: "linear-gradient(135deg, #34d399, #10b981, #14b8a6)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            enxerga o placar.
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        className="mt-6 mx-auto max-w-2xl"
                        style={{
                            fontSize: "clamp(1rem, 2vw, 1.2rem)",
                            lineHeight: 1.7,
                            color: "rgba(255,255,255,0.7)",
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35 }}
                    >
                        Vyzon conecta os seus checkouts ao time de vendas e mostra em tempo real
                        quem tá fechando, quem tá travado e onde o time precisa de ajuda.
                        Ranking ao vivo, pipeline visual e pronto em 5 minutos.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        {/* Primary — Schedule demo */}
                        <motion.button
                            onClick={onScheduleDemoClick || onCTAClick}
                            className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-[15px] font-bold text-white rounded-xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                            }}
                            whileHover={{
                                scale: 1.04,
                                boxShadow: "0 0 0 1px rgba(16,185,129,0.4), 0 8px 40px rgba(16,185,129,0.45)",
                            }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Calendar className="relative h-4 w-4" />
                            <span className="relative">Agendar demonstração</span>
                            <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </motion.button>

                        {/* Secondary — Watch video */}
                        <motion.button
                            onClick={onDemoClick}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[15px]"
                            style={{
                                color: "rgba(255,255,255,0.55)",
                                background: "rgba(255,255,255,0.04)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                                fontWeight: 500,
                            }}
                            whileHover={{
                                color: "rgba(255,255,255,0.9)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
                            }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Play className="h-4 w-4" fill="currentColor" />
                            Ver como funciona
                        </motion.button>
                    </motion.div>

                    {/* Trust row */}
                    <motion.div
                        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.65 }}
                    >
                        {["14 dias grátis pra testar", "Pronto em 5 minutos", "Suporte humano no WhatsApp"].map((t) => (
                            <span key={t} className="flex items-center gap-1.5 text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {t}
                            </span>
                        ))}
                    </motion.div>
                </div>

                {/* ── Product mockup ── */}
                <motion.div
                    ref={mockupRef}
                    className="relative max-w-4xl mx-auto pb-4 hidden sm:block"
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{ y: mockupY, scale: mockupScale }}
                >
                    {/* Glow behind mockup — static, no blur filter */}
                    <div
                        className="absolute -inset-16 -z-10 rounded-3xl"
                        style={{
                            background: "radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 55%)",
                        }}
                    />
                    <DashboardMockup />

                    {/* Floating badges */}
                    <motion.div
                        className="absolute -left-6 top-20 rounded-xl p-2.5 hidden lg:block"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
                        transition={{
                            opacity: { delay: 2.2, duration: 0.5 },
                            x: { delay: 2.2, duration: 0.5 },
                            y: { delay: 2.7, duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                        }}
                        style={{
                            background: "rgba(13,17,23,0.85)",
                            boxShadow: "0 0 0 1px rgba(245,158,11,0.2), 0 8px 24px rgba(0,0,0,0.4)",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Trophy className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Top Seller</p>
                                <p className="text-base font-bold leading-none" style={{ color: "rgba(255,255,255,0.95)" }}>#1</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="absolute -right-4 bottom-28 rounded-xl p-2.5 hidden lg:block"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0, y: [0, 8, 0] }}
                        transition={{
                            opacity: { delay: 2.5, duration: 0.5 },
                            x: { delay: 2.5, duration: 0.5 },
                            y: { delay: 3, duration: 4, repeat: Infinity, ease: "easeInOut" },
                        }}
                        style={{
                            background: "rgba(13,17,23,0.85)",
                            boxShadow: "0 0 0 1px rgba(16,185,129,0.2), 0 8px 24px rgba(0,0,0,0.4)",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Nova Venda</p>
                                <p className="text-sm font-bold text-emerald-400 leading-none">+R$ 3.200</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom fade */}
            <div
                className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent, #06080a)" }}
            />
        </section>
    );
};
