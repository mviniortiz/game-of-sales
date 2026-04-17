import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { ArrowRight, Play, TrendingUp, Users, Target, Calendar } from "lucide-react";

// ─── Bar chart data ─────────────────────────────────────────────────────────
const barData = [
    { name: "Mateus", targetH: 130, delay: 100, score: "3.2k" },
    { name: "Sofia", targetH: 175, delay: 200, score: "4.5k" },
    { name: "Ana", targetH: 255, delay: 400, score: "8.9k", isWinner: true },
    { name: "Lucas", targetH: 205, delay: 300, score: "6.1k" },
    { name: "João", targetH: 95, delay: 0, score: "2.1k" },
];

const SPARKLINE = [30, 45, 35, 55, 48, 65, 58, 72, 68, 85, 78, 92];

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

// ─── Inline Dashboard ───────────────────────────────────────────────────────
const DashboardMockup = () => {
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);
    const progressRef = useRef<HTMLDivElement | null>(null);
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
                        vyzon.com.br/dashboard
                    </div>
                </div>
            </div>

            {/* App body */}
            <div className="flex">
                {/* Content */}
                <div className="flex-1 p-2 sm:p-3 space-y-2 sm:space-y-2.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", minHeight: 220 }}>
                    {/* Header */}
                    <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                    >
                        <div>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                Bom dia, Ana
                            </p>
                            <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                                Dashboard
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="relative">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px]" style={{ background: "rgba(255,255,255,0.06)" }}>🔔</div>
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" style={{ border: "2px solid #0d1117" }} />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[7px] font-bold text-white">A</div>
                        </div>
                    </motion.div>

                    {/* Dashboard content */}
                    <div className="space-y-2.5">
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
                    </div>
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
                {/* Top aurora spotlight — wide and dramatic */}
                <div
                    className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.08) 30%, transparent 65%)",
                    }}
                />
                {/* Central emerald glow — reinforces the aurora */}
                <div
                    className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[1400px] h-[900px] rounded-full pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.04) 35%, transparent 60%)",
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
                    style={{ background: "linear-gradient(to bottom, rgba(6,8,10,0.85), transparent)" }}
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
