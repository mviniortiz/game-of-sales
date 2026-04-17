import { useRef, useEffect, useState, useCallback } from "react";
import { TrendingUp, Users, Target } from "lucide-react";

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

// Pure CSS/React version — no framer-motion. Lazy-loaded to keep it out of the critical path.
export const HeroDashboardMockup = () => {
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);
    const progressRef = useRef<SVGCircleElement | null>(null);
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);
    const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
    const [hoveredPipeline, setHoveredPipeline] = useState<number | null>(null);
    const [hoveredRanking, setHoveredRanking] = useState<number | null>(null);
    const [chartPeriod, setChartPeriod] = useState<"semanal" | "mensal">("semanal");

    const animateBars = useCallback(() => {
        barData.forEach((bar, i) => {
            const el = barsRef.current[i];
            if (!el) return;
            el.style.transform = "scaleY(0)";
            el.style.opacity = "0";
            setTimeout(() => {
                if (!barsRef.current[i]) return;
                el.style.transform = "scaleY(1)";
                el.style.opacity = "1";
            }, 150 + bar.delay);
        });
    }, []);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(animateBars, 400));
        if (progressRef.current) {
            timers.push(setTimeout(() => {
                if (progressRef.current) progressRef.current.style.strokeDashoffset = "18.5";
            }, 600));
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
                <div className="flex-1 p-2 sm:p-3 space-y-2 sm:space-y-2.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", minHeight: 220 }}>
                    {/* Header */}
                    <div className="flex items-center justify-between landing-fade-in landing-delay-150">
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
                    </div>

                    <div className="space-y-2.5">
                        {/* KPIs */}
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
                                const delayClass = i === 0 ? "landing-delay-200" : i === 1 ? "landing-delay-300" : "landing-delay-400";
                                return (
                                    <div
                                        key={kpi.label}
                                        className={`rounded-xl p-2.5 cursor-pointer transition-all duration-200 landing-fade-in-up ${delayClass}`}
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
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chart + Ranking */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 sm:gap-2">
                            <div
                                className="sm:col-span-3 rounded-xl p-2.5 landing-fade-in-up landing-delay-500"
                                style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>Performance</p>
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
                                                {isHovered && (
                                                    <div
                                                        className="absolute -top-5 z-10 px-1.5 py-0.5 rounded text-[7px] font-bold whitespace-nowrap landing-fade-in"
                                                        style={{ background: "rgba(16,185,129,0.9)", color: "#fff" }}
                                                    >
                                                        {bar.name} · {bar.score}
                                                    </div>
                                                )}
                                                <div className="w-full relative h-14 flex items-end cursor-pointer">
                                                    <div
                                                        ref={el => barsRef.current[i] = el}
                                                        className="w-full rounded-t"
                                                        style={{
                                                            height: `${(bar.targetH / 255) * 100}%`,
                                                            transformOrigin: "bottom center",
                                                            transform: "scaleY(0)",
                                                            opacity: 0,
                                                            background: bar.isWinner || isHovered
                                                                ? "linear-gradient(to top, #059669, #34d399)"
                                                                : "linear-gradient(to top, rgba(5,150,105,0.4), rgba(52,211,153,0.25))",
                                                            transition: "transform 1.2s ease-out, opacity 1.2s ease-out, background 0.15s",
                                                            willChange: "transform, opacity",
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
                            </div>

                            <div
                                className="sm:col-span-2 rounded-xl p-2.5 landing-fade-in-up landing-delay-550"
                                style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                            >
                                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>🏆 Ranking</p>
                                <div className="space-y-1.5">
                                    {RANKING_DATA.map((seller, i) => {
                                        const isHovered = hoveredRanking === i;
                                        const delayClass = i === 0 ? "landing-delay-600" : i === 1 ? "landing-delay-650" : "landing-delay-650";
                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-1.5 rounded-lg px-1 py-0.5 cursor-pointer transition-all duration-150 landing-fade-in ${delayClass}`}
                                                style={{
                                                    background: isHovered ? "rgba(255,255,255,0.04)" : "transparent",
                                                }}
                                                onMouseEnter={() => setHoveredRanking(i)}
                                                onMouseLeave={() => setHoveredRanking(null)}
                                            >
                                                <span className="text-[10px]">{seller.medal}</span>
                                                <div className={`w-5 h-5 rounded-full ${seller.avatar} flex items-center justify-center shrink-0 transition-transform duration-150`} style={{ transform: isHovered ? "scale(1.15)" : "scale(1)" }}>
                                                    <span className="text-[7px] font-bold text-white">{seller.initial}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[8px] font-semibold truncate transition-colors duration-150" style={{ color: isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)" }}>{seller.name}</p>
                                                    <div className="w-full rounded-full h-1 mt-0.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                        <div
                                                            className="h-1 bg-emerald-400 rounded-full"
                                                            style={{
                                                                width: "100%",
                                                                transformOrigin: "left center",
                                                                transform: `scaleX(${(isHovered ? Math.min(seller.pct + 5, 100) : seller.pct) / 100})`,
                                                                transition: "transform 0.3s ease-out",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-[7px] font-bold text-emerald-400 shrink-0">{seller.xp}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Pipeline */}
                        <div
                            className="rounded-xl p-2.5 landing-fade-in-up landing-delay-600"
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
                                        <div
                                            key={i}
                                            className="flex-1 cursor-pointer landing-fade-in landing-delay-650"
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
                                                <div
                                                    className={`h-1 mx-auto rounded-full bg-gradient-to-r ${s.color} mb-1`}
                                                    style={{
                                                        width: "28px",
                                                        transformOrigin: "center",
                                                        transform: isHovered ? "scaleX(1)" : "scaleX(0.714)",
                                                        transition: "transform 0.15s ease-out",
                                                    }}
                                                />
                                                <p className="text-sm font-bold transition-transform duration-150" style={{ color: s.text, transform: isHovered ? "scale(1.1)" : "scale(1)" }}>{s.count}</p>
                                                <p className="text-[7px] mt-0.5" style={{ color: isHovered ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)" }}>{s.stage}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroDashboardMockup;
