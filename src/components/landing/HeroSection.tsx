import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Play, TrendingUp, Users, Target, Trophy, Star, Zap } from "lucide-react";

// Hoisted animation objects
const fadeInAnimation = { opacity: 0, y: 30 };
const fadeInTransition = { duration: 0.6 };

// Bar chart data for the animated SVG
const barData = [
    { name: "Mateus", targetH: 130, targetY: 220, delay: 100, score: "3.2k" },
    { name: "Sofia", targetH: 175, targetY: 175, delay: 200, score: "4.5k" },
    { name: "Ana", targetH: 255, targetY: 95, delay: 400, score: "8.9k", isWinner: true },
    { name: "Lucas", targetH: 205, targetY: 145, delay: 300, score: "6.1k" },
    { name: "João", targetH: 95, targetY: 255, delay: 0, score: "2.1k" },
];


// ─── Dashboard Mockup ────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
    { icon: "⬡", active: true },
    { icon: "▦" },
    { icon: "◎" },
    { icon: "⚡" },
    { icon: "☰" },
];

const SPARKLINE = [30, 45, 35, 55, 48, 65, 58, 72, 68, 85, 78, 92];

const DashboardMockup = () => {
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);
    const progressRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        barData.forEach((bar, i) => {
            const el = barsRef.current[i];
            if (!el) return;
            setTimeout(() => {
                el.style.height = `${(bar.targetH / 255) * 100}%`;
                el.style.opacity = "1";
            }, 400 + bar.delay);
        });
        // Animate meta progress ring
        if (progressRef.current) {
            setTimeout(() => {
                progressRef.current!.style.strokeDashoffset = "18.5";
            }, 600);
        }
    }, []);

    return (
        <div className="relative w-full max-w-[540px] mx-auto">
            {/* Browser frame */}
            <div
                className="rounded-2xl border border-gray-200/60 bg-white overflow-hidden"
                style={{ boxShadow: "0 30px 70px -20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)" }}
            >
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-gray-50 to-gray-100/80 border-b border-gray-200/60">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-gray-200/80 text-[10px] text-gray-400">
                            <svg className="w-2.5 h-2.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <span className="font-mono">vyzon.com.br/dashboard</span>
                        </div>
                    </div>
                </div>

                {/* App layout with sidebar */}
                <div className="flex">
                    {/* Mini sidebar */}
                    <div className="w-11 bg-white border-r border-gray-100 flex flex-col items-center py-3 gap-2.5 shrink-0">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-1">
                            <span className="text-[8px] font-black text-white">V</span>
                        </div>
                        {SIDEBAR_ITEMS.map((item, i) => (
                            <div
                                key={i}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] transition-colors ${
                                    item.active
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "text-gray-300 hover:text-gray-400"
                                }`}
                            >
                                {item.icon}
                            </div>
                        ))}
                    </div>

                    {/* Dashboard content */}
                    <div className="flex-1 p-3 space-y-3 bg-[#f8fafb] min-h-[320px]">
                        {/* Header */}
                        <motion.div
                            className="flex items-center justify-between"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >
                            <div>
                                <p className="text-[10px] text-gray-400">Bom dia, Ana</p>
                                <p className="text-xs font-bold text-gray-800">Dashboard</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="relative">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">🔔</div>
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                                </div>
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[7px] font-bold text-white">A</div>
                            </div>
                        </motion.div>

                        {/* KPI Row */}
                        <div className="grid grid-cols-3 gap-2">
                            {/* Revenue KPI with sparkline */}
                            <motion.div
                                className="bg-white rounded-xl p-2.5 border border-gray-100 col-span-1"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Receita</p>
                                    <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">R$ 247k</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[8px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">+23%</span>
                                </div>
                                {/* Mini sparkline */}
                                <svg className="w-full h-6 mt-1" viewBox="0 0 120 30" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d={`M0,${30 - SPARKLINE[0] * 0.3} ${SPARKLINE.map((v, i) => `L${(i / (SPARKLINE.length - 1)) * 120},${30 - v * 0.3}`).join(" ")} L120,30 L0,30 Z`}
                                        fill="url(#sparkFill)"
                                    />
                                    <path
                                        d={`M0,${30 - SPARKLINE[0] * 0.3} ${SPARKLINE.map((v, i) => `L${(i / (SPARKLINE.length - 1)) * 120},${30 - v * 0.3}`).join(" ")}`}
                                        fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"
                                    />
                                </svg>
                            </motion.div>

                            {/* Vendas KPI */}
                            <motion.div
                                className="bg-white rounded-xl p-2.5 border border-gray-100"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Vendas</p>
                                    <Users className="w-2.5 h-2.5 text-blue-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">142</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[8px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">+18%</span>
                                </div>
                                <div className="flex gap-0.5 mt-1.5">
                                    {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                                        <div key={i} className="flex-1 bg-blue-100 rounded-sm" style={{ height: `${h * 0.2}px` }}>
                                            <div className="w-full bg-blue-400 rounded-sm" style={{ height: `${h}%` }} />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Meta KPI with ring */}
                            <motion.div
                                className="bg-white rounded-xl p-2.5 border border-gray-100"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Meta</p>
                                    <Target className="w-2.5 h-2.5 text-emerald-500" />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="relative w-10 h-10">
                                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                            <circle
                                                ref={progressRef}
                                                cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeDasharray="88"
                                                strokeDashoffset="88"
                                                style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-gray-900">87%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-gray-500">R$ 215k</p>
                                        <p className="text-[8px] text-gray-400">de R$ 250k</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Chart + Ranking row */}
                        <div className="grid grid-cols-5 gap-2">
                            {/* Chart */}
                            <motion.div
                                className="col-span-3 bg-white rounded-xl p-2.5 border border-gray-100"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-semibold text-gray-700">Performance Semanal</p>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[8px] text-gray-400">Live</span>
                                    </div>
                                </div>
                                <div className="flex items-end gap-1 h-20">
                                    {barData.map((bar, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                            <div className="w-full relative h-16 flex items-end">
                                                <div
                                                    ref={el => barsRef.current[i] = el}
                                                    className={`w-full rounded-t transition-all duration-[1200ms] ease-out ${
                                                        bar.isWinner
                                                            ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/30"
                                                            : "bg-gradient-to-t from-emerald-300 to-emerald-200"
                                                    }`}
                                                    style={{ height: "0%", opacity: 0 }}
                                                />
                                            </div>
                                            <span className="text-[7px] text-gray-400 truncate w-full text-center">{bar.name.slice(0, 3)}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Ranking */}
                            <motion.div
                                className="col-span-2 bg-white rounded-xl p-2.5 border border-gray-100"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                            >
                                <p className="text-[10px] font-semibold text-gray-700 mb-1.5">🏆 Ranking</p>
                                <div className="space-y-1.5">
                                    {[
                                        { name: "Ana Silva", xp: "8.9k XP", avatar: "bg-gradient-to-br from-rose-400 to-pink-500", initial: "A", medal: "🥇", bar: "w-[92%]" },
                                        { name: "Lucas M.", xp: "6.1k XP", avatar: "bg-gradient-to-br from-blue-400 to-indigo-500", initial: "L", medal: "🥈", bar: "w-[68%]" },
                                        { name: "Sofia R.", xp: "4.5k XP", avatar: "bg-gradient-to-br from-amber-400 to-orange-500", initial: "S", medal: "🥉", bar: "w-[50%]" },
                                    ].map((seller, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex items-center gap-1.5"
                                            initial={{ opacity: 0, x: 8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1.1 + i * 0.12, duration: 0.4 }}
                                        >
                                            <span className="text-[10px]">{seller.medal}</span>
                                            <div className={`w-5 h-5 rounded-full ${seller.avatar} flex items-center justify-center shrink-0`}>
                                                <span className="text-[7px] font-bold text-white">{seller.initial}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-semibold text-gray-700 truncate">{seller.name}</p>
                                                <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5">
                                                    <div className={`${seller.bar} h-1 bg-emerald-400 rounded-full`} />
                                                </div>
                                            </div>
                                            <span className="text-[7px] font-bold text-emerald-600 shrink-0">{seller.xp}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Pipeline */}
                        <motion.div
                            className="bg-white rounded-xl p-2.5 border border-gray-100"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 0.5 }}
                            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-semibold text-gray-700">Pipeline de Vendas</p>
                                <span className="text-[8px] text-gray-400">28 deals ativos</span>
                            </div>
                            <div className="flex gap-1.5">
                                {[
                                    { stage: "Novo", count: 12, color: "from-blue-500 to-blue-400", bg: "bg-blue-50", text: "text-blue-700" },
                                    { stage: "Qualificação", count: 8, color: "from-amber-500 to-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
                                    { stage: "Proposta", count: 5, color: "from-purple-500 to-purple-400", bg: "bg-purple-50", text: "text-purple-700" },
                                    { stage: "Fechado", count: 3, color: "from-emerald-500 to-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
                                ].map((s, i) => (
                                    <motion.div
                                        key={i}
                                        className="flex-1"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.3 + i * 0.08, duration: 0.3 }}
                                    >
                                        <div className={`${s.bg} rounded-lg p-1.5 text-center border border-transparent hover:border-gray-200 transition-colors`}>
                                            <div className={`w-5 h-1 mx-auto rounded-full bg-gradient-to-r ${s.color} mb-1`} />
                                            <p className={`text-sm font-bold ${s.text}`}>{s.count}</p>
                                            <p className="text-[7px] text-gray-400 mt-0.5">{s.stage}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Floating badge: #1 */}
            <motion.div
                className="absolute -left-8 top-24 bg-white rounded-xl p-2.5 border border-amber-200/60 hidden lg:block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
                transition={{
                    opacity: { delay: 2.2, duration: 0.5 },
                    x: { delay: 2.2, duration: 0.5 },
                    y: { delay: 2.7, duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ boxShadow: "0 8px 25px -6px rgba(245,158,11,0.2)" }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                        <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-[8px] text-gray-400 uppercase tracking-wider">Top Seller</p>
                        <p className="text-base font-bold text-gray-900 leading-none">#1</p>
                    </div>
                </div>
            </motion.div>

            {/* Floating badge: nova venda */}
            <motion.div
                className="absolute -right-6 bottom-32 bg-white rounded-xl p-2.5 border border-emerald-200/60 hidden lg:block"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, 8, 0] }}
                transition={{
                    opacity: { delay: 2.5, duration: 0.5 },
                    x: { delay: 2.5, duration: 0.5 },
                    y: { delay: 3, duration: 4, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ boxShadow: "0 8px 25px -6px rgba(16,185,129,0.2)" }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                        <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-[8px] text-gray-500 uppercase tracking-wider">Nova Venda</p>
                        <p className="text-sm font-bold text-emerald-600 leading-none">+R$ 3.200</p>
                    </div>
                </div>
            </motion.div>

            {/* Floating badge: meta batida */}
            <motion.div
                className="absolute -right-4 top-16 bg-white rounded-xl p-2.5 border border-emerald-200/60 hidden lg:block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                transition={{
                    opacity: { delay: 2.8, duration: 0.5 },
                    scale: { delay: 2.8, duration: 0.4 },
                    y: { delay: 3.3, duration: 5, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ boxShadow: "0 8px 25px -6px rgba(16,185,129,0.15)" }}
            >
                <div className="flex items-center gap-1.5">
                    <span className="text-sm">🎯</span>
                    <p className="text-[9px] font-semibold text-gray-700">Meta batida!</p>
                </div>
            </motion.div>
        </div>
    );
};


// ─── HeroSection ────────────────────────────────────────────────────────────
interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onDemoClick, onLoginClick }: HeroSectionProps) => {
    const sectionRef = useRef<HTMLElement>(null);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[90vh] overflow-hidden bg-white"
        >
            {/* Animated gradient blobs */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Base gradient */}
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(160deg, #ecfdf5 0%, #f0fdfa 30%, #ffffff 60%, #ecfdf5 100%)" }}
                />

                {/* Blob 1 — top right, large emerald */}
                <motion.div
                    className="absolute -top-[10%] -right-[5%] w-[70%] h-[70%] rounded-full"
                    style={{
                        background: "radial-gradient(circle, #6ee7b7 0%, #a7f3d0 30%, transparent 65%)",
                        filter: "blur(60px)",
                        opacity: 0.55,
                    }}
                    animate={{ x: [0, 40, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Blob 2 — bottom left, teal */}
                <motion.div
                    className="absolute -bottom-[5%] -left-[10%] w-[65%] h-[60%] rounded-full"
                    style={{
                        background: "radial-gradient(circle, #99f6e4 0%, #5eead4 25%, transparent 65%)",
                        filter: "blur(60px)",
                        opacity: 0.45,
                    }}
                    animate={{ x: [0, -25, 35, 0], y: [0, 25, -20, 0], scale: [1, 0.93, 1.1, 1] }}
                    transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Blob 3 — center-left, deep emerald accent */}
                <motion.div
                    className="absolute top-[15%] left-[20%] w-[45%] h-[45%] rounded-full"
                    style={{
                        background: "radial-gradient(circle, #34d399 0%, transparent 60%)",
                        filter: "blur(70px)",
                        opacity: 0.3,
                    }}
                    animate={{ x: [0, 50, -40, 0], y: [0, -35, 25, 0], scale: [1, 1.12, 0.88, 1] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Blob 4 — top left, soft mint glow */}
                <motion.div
                    className="absolute -top-[5%] left-[10%] w-[40%] h-[35%] rounded-full"
                    style={{
                        background: "radial-gradient(circle, #a7f3d0 0%, transparent 65%)",
                        filter: "blur(50px)",
                        opacity: 0.4,
                    }}
                    animate={{ x: [0, 20, -15, 0], y: [0, 15, -10, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Fine grid overlay for texture */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(0,0,0,0.15) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
                        `,
                        backgroundSize: "50px 50px",
                    }}
                />
            </div>

            {/* Floating orbs */}

            {/* Hero Content — pt-24 clears the 64px sticky LandingNav */}
            {/* Hero Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left: Text */}
                    <motion.div
                        initial={fadeInAnimation}
                        animate={{ opacity: 1, y: 0 }}
                        transition={fadeInTransition}
                    >
                        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-6 tracking-tight">
                            <motion.span
                                className="text-gray-900 block"
                                style={{ fontWeight: 700 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                Seu time batendo
                            </motion.span>
                            <motion.span
                                className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent block"
                                style={{ fontWeight: 900 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                            >
                                meta todo mês.
                            </motion.span>
                        </h1>

                        <p className="text-body text-lg text-gray-600 mb-8 max-w-xl">
                            Pipeline visual, ranking ao vivo, metas em tempo real e integrações automáticas com Hotmart, Kiwify e Greenn. Tudo em um só lugar.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.div className="relative">
                                <motion.div
                                    className="absolute -inset-1 rounded-xl bg-emerald-500/30 blur-md"
                                    animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.98, 1.02, 0.98] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <motion.button
                                    onClick={onCTAClick}
                                    className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white rounded-xl overflow-hidden transition-all duration-300 shadow-xl shadow-emerald-500/30"
                                    style={{
                                        background: "linear-gradient(135deg, #10b981, #14b8a6, #10b981)",
                                        backgroundSize: "200% 200%",
                                    }}
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(16, 185, 129, 0.5)" }}
                                    whileTap={{ scale: 0.97 }}
                                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                                    transition={{ backgroundPosition: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <span className="relative z-10">Começar grátis por 14 dias</span>
                                    <ArrowRight className="relative z-10 h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
                                </motion.button>
                            </motion.div>

                            <motion.button
                                onClick={onDemoClick}
                                className="text-gray-700 hover:text-emerald-700 flex items-center gap-2 border border-gray-300 bg-white/80 backdrop-blur-sm hover:border-emerald-300 hover:bg-emerald-50 px-5 py-3 rounded-xl transition-all duration-200 shadow-sm"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Play className="h-4 w-4" fill="currentColor" />
                                Ver como funciona
                            </motion.button>
                        </div>

                        {/* Trust indicators */}
                        <motion.div
                            className="flex items-center gap-6 mt-8 text-gray-500 text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {["14 dias grátis", "Cobrança só após o trial", "Cancele quando quiser"].map(text => (
                                <span key={text} className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    {text}
                                </span>
                            ))}
                        </motion.div>

                        {/* Integration logos */}
                        <motion.div
                            className="mt-10 pt-8 border-t border-gray-200"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <p className="text-caption text-xs text-gray-500 uppercase tracking-widest mb-4">
                                Integração Nativa com:
                            </p>
                            <div className="flex items-center gap-6">
                                {["Kiwify", "Greenn", "Hotmart"].map(name => (
                                    <span key={name} className="text-gray-800 font-bold text-sm px-3 py-1 bg-gray-100 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right: Animated Leaderboard SVG */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative hidden lg:flex justify-end overflow-visible"
                    >
                        {/* Glow behind */}
                        <div
                            className="absolute inset-0 -z-10"
                            style={{
                                background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
                                filter: "blur(80px)",
                                transform: "scale(1.4)",
                            }}
                        />
                        <DashboardMockup />
                    </motion.div>

                </div>
            </div>

            {/* Curved bottom shape */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg
                    viewBox="0 0 1440 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z"
                        fill="url(#curveGradientNew)"
                    />
                    <defs>
                        <linearGradient id="curveGradientNew" x1="720" y1="60" x2="720" y2="120">
                            <stop stopColor="#10b981" stopOpacity="0.15" />
                            <stop offset="1" stopColor="#0f172a" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </section>
    );
};
