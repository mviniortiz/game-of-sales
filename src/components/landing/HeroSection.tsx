import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Play, TrendingUp, Users, Target, Trophy, Star, Zap } from "lucide-react";
import brandLogoWhite from "@/assets/logo-only.png";

// Hoisted animation objects
const gradientPulseAnimation = { opacity: [0.3, 0.6, 0.3] };
const gradientPulseTransition = { duration: 4, repeat: Infinity, ease: "easeInOut" as const };

const orbScaleAnimation = { scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] };
const orbScaleTransition = { duration: 6, repeat: Infinity, ease: "easeInOut" as const };

const orbAltAnimation = { scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] };
const orbAltTransition = { duration: 5, repeat: Infinity, ease: "easeInOut" as const };

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

const PARTICLES = [
    { x: 60, dur: 5.2, del: 0.3 },
    { x: 135, dur: 4.5, del: 1.1 },
    { x: 205, dur: 6.0, del: 0.0 },
    { x: 270, dur: 5.7, del: 1.8 },
    { x: 340, dur: 4.2, del: 0.7 },
    { x: 405, dur: 5.5, del: 1.5 },
    { x: 450, dur: 4.8, del: 0.2 },
    { x: 100, dur: 6.1, del: 2.0 },
];

// ─── Animated Leaderboard SVG ────────────────────────────────────────────────
const LeaderboardSVG = () => {
    const barsRef = useRef<(SVGRectElement | null)[]>([]);

    useEffect(() => {
        barData.forEach((bar, i) => {
            const el = barsRef.current[i];
            if (!el) return;
            setTimeout(() => {
                const start = performance.now();
                const duration = 1500;
                const animate = (ts: number) => {
                    const progress = Math.min((ts - start) / duration, 1);
                    const ease = 1 - Math.pow(1 - progress, 3);
                    const h = Math.floor(ease * bar.targetH);
                    const y = 350 - h;
                    el.setAttribute("height", String(h));
                    el.setAttribute("y", String(y));
                    if (progress < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }, bar.delay);
        });
    }, []);

    return (
        <div
            className="relative w-full max-w-[500px] mx-auto"
            style={{ filter: "drop-shadow(0 0 30px rgba(16,185,129,0.2))" }}
        >
            <svg
                viewBox="0 0 500 400"
                className="w-full h-full rounded-2xl border border-white/10"
                style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(16px)" }}
            >
                <defs>
                    {/* Emerald gradient for regular bars */}
                    <linearGradient id="barGradHero" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                    </linearGradient>
                    {/* Brighter gradient for winner */}
                    <linearGradient id="winnerGradHero" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
                    </linearGradient>
                    {/* Glow filter for winner bar */}
                    <filter id="glowHero" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {/* Scanline gradient */}
                    <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                        <stop offset="50%" stopColor="#10b981" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    {/* Grid pattern */}
                    <pattern id="gridHero" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Grid background */}
                <rect width="500" height="400" fill="url(#gridHero)" />

                {/* Floating particles */}
                {PARTICLES.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy="400"
                        r="2"
                        fill="#10b981"
                        style={{
                            animation: `heroParticle ${p.dur}s linear ${p.del}s infinite`,
                            opacity: 0,
                        }}
                    />
                ))}

                {/* Scanline sweep */}
                <rect width="500" height="60" fill="url(#scanGrad)"
                    style={{ animation: "heroScanline 4s linear infinite" }} />

                {/* Baseline */}
                <line x1="40" y1="350" x2="460" y2="350" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />

                {/* HUD header */}
                <text x="20" y="32" fill="#10b981" fontSize="10" fontFamily="monospace" opacity="0.6">
                    LIVE RANKING • SEMANA ATUAL
                </text>
                <circle cx="470" cy="26" r="5" fill="#10b981">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
                </circle>

                {/* Bars */}
                {barData.map((bar, i) => {
                    const xPos = 65 + i * 80;
                    return (
                        <g key={i}>
                            {/* Ghost track */}
                            <rect x={xPos} y="60" width="40" height="290"
                                fill="rgba(255,255,255,0.03)" rx="4" />

                            {/* Animated bar */}
                            <rect
                                ref={el => barsRef.current[i] = el}
                                x={xPos} y="350" width="40" height="0" rx="4"
                                fill={bar.isWinner ? "url(#winnerGradHero)" : "url(#barGradHero)"}
                                filter={bar.isWinner ? "url(#glowHero)" : undefined}
                            />

                            {/* Score label */}
                            <text
                                x={xPos + 20} y={bar.targetY - 14}
                                fill="white" fontSize="13" fontWeight="bold"
                                fontFamily="'Space Grotesk', sans-serif"
                                textAnchor="middle"
                                style={{
                                    opacity: 0,
                                    animation: `heroFadeIn 0.4s ease-out ${(bar.delay + 1200) / 1000}s forwards`,
                                }}
                            >
                                {bar.score}
                            </text>

                            {/* Name label */}
                            <text
                                x={xPos + 20} y="375"
                                fill="rgba(255,255,255,0.4)" fontSize="11"
                                fontFamily="'Inter', sans-serif"
                                textAnchor="middle"
                            >
                                {bar.name}
                            </text>

                            {/* Crown for winner */}
                            {bar.isWinner && (
                                <g
                                    transform={`translate(${xPos + 6}, ${bar.targetY - 46})`}
                                    style={{
                                        opacity: 0,
                                        animation: `heroFadeIn 0.4s ease-out ${(bar.delay + 1500) / 1000}s forwards,
                                                    heroCrown 2s ease-in-out ${(bar.delay + 1500) / 1000}s infinite`,
                                        transformOrigin: "center bottom",
                                    }}
                                >
                                    <path
                                        d="M3 12L7 2L15 12L23 2L27 12V18H3V12Z"
                                        fill="#f59e0b"
                                        style={{ filter: "drop-shadow(0 2px 6px rgba(245,158,11,0.5))" }}
                                    />
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Floating badge: #1 */}
            <motion.div
                className="absolute -left-10 top-16 bg-slate-900/95 backdrop-blur-sm rounded-xl p-3 border border-amber-500/30 shadow-xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
                transition={{
                    opacity: { delay: 2.2, duration: 0.5 },
                    x: { delay: 2.2, duration: 0.5 },
                    y: { delay: 2.7, duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ boxShadow: "0 10px 30px -8px rgba(245,158,11,0.25)" }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                        <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Ranking</p>
                        <p className="text-lg font-bold text-white leading-none">#1</p>
                    </div>
                </div>
            </motion.div>

            {/* Floating badge: nova venda */}
            <motion.div
                className="absolute -right-10 bottom-24 bg-slate-900/95 backdrop-blur-sm rounded-xl p-3 border border-emerald-500/30 shadow-xl"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, 8, 0] }}
                transition={{
                    opacity: { delay: 2.5, duration: 0.5 },
                    x: { delay: 2.5, duration: 0.5 },
                    y: { delay: 3, duration: 4, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ boxShadow: "0 10px 30px -8px rgba(16,185,129,0.25)" }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Nova Venda</p>
                        <p className="text-sm font-bold text-emerald-400 leading-none">+R$ 3.200</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Keyframe injection ───────────────────────────────────────────────────────
const SVG_STYLES = `
@keyframes heroScanline {
    0%   { transform: translateY(-60px); }
    100% { transform: translateY(460px); }
}
@keyframes heroParticle {
    0%   { opacity: 0; transform: translateY(0); }
    10%  { opacity: 0.5; }
    90%  { opacity: 0.5; }
    100% { opacity: 0; transform: translateY(-420px); }
}
@keyframes heroFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes heroCrown {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-5px); }
}
`;

// ─── HeroSection ────────────────────────────────────────────────────────────
interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onDemoClick, onLoginClick }: HeroSectionProps) => {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"],
    });
    const orbY1 = useTransform(scrollYProgress, [0, 1], [0, -120]);
    const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -80]);

    // Inject SVG keyframe styles once
    useEffect(() => {
        const id = "hero-svg-styles";
        if (document.getElementById(id)) return;
        const tag = document.createElement("style");
        tag.id = id;
        tag.innerHTML = SVG_STYLES;
        document.head.appendChild(tag);
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[90vh] overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-950 to-slate-950"
        >
            {/* Animated Grid Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(16, 185, 129, 0.2) 1px, transparent 1px)
                        `,
                        backgroundSize: "60px 60px",
                    }}
                />
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.25), transparent)",
                    }}
                    animate={gradientPulseAnimation}
                    transition={gradientPulseTransition}
                />
            </div>

            {/* Floating orbs */}
            <motion.div
                className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
                    filter: "blur(60px)",
                    y: orbY1,
                }}
                animate={orbScaleAnimation}
                transition={orbScaleTransition}
            />
            <motion.div
                className="absolute bottom-1/3 left-1/5 w-56 h-56 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
                    filter: "blur(50px)",
                    y: orbY2,
                }}
                animate={orbAltAnimation}
                transition={orbAltTransition}
            />

            {/* Navbar */}
            <nav className="relative z-50 px-4 sm:px-6 lg:px-8 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <motion.img
                        src={brandLogoWhite}
                        alt="Game Sales"
                        className="h-9 w-auto"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    />

                    <div className="hidden md:flex items-center gap-8">
                        {["Produto", "Soluções", "Preços", "Sobre Nós"].map(item => (
                            <button
                                key={item}
                                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={onLoginClick}
                            className="text-white/80 hover:text-white hover:bg-white/10"
                        >
                            Entrar
                        </Button>
                        <Button
                            onClick={onCTAClick}
                            className="bg-emerald-500 text-white hover:bg-emerald-400 font-semibold shadow-lg shadow-emerald-500/30 border-0"
                        >
                            Testar Grátis
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left: Text */}
                    <motion.div
                        initial={fadeInAnimation}
                        animate={{ opacity: 1, y: 0 }}
                        transition={fadeInTransition}
                    >
                        <Badge className="mb-6 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25">
                            <Sparkles className="h-3 w-3 mr-1" />
                            <span className="text-label text-[10px]">GAMIFICAÇÃO PARA TIMES DE VENDAS</span>
                        </Badge>

                        <h1 className="text-heading text-4xl sm:text-5xl lg:text-6xl mb-6">
                            <motion.span
                                className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent block"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                Seu time vendendo
                            </motion.span>
                            <motion.span
                                className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent block"
                                style={{ fontWeight: 'var(--fw-black)' }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                            >
                                34% mais. No automático.
                            </motion.span>
                        </h1>

                        <p className="text-body text-lg text-white/70 mb-8 max-w-xl">
                            Um ranking em tempo real que transforma metas em competição saudável.
                            Seu time se motiva sozinho. Você só acompanha os resultados.
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
                                    <span className="relative z-10">Criar meu ranking grátis</span>
                                    <ArrowRight className="relative z-10 h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
                                </motion.button>
                            </motion.div>

                            <motion.button
                                onClick={onDemoClick}
                                className="text-gray-300 hover:text-white flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 px-5 py-3 rounded-xl transition-all duration-200"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Play className="h-4 w-4" fill="currentColor" />
                                Ver como funciona
                            </motion.button>
                        </div>

                        {/* Trust indicators */}
                        <motion.div
                            className="flex items-center gap-6 mt-8 text-white/50 text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {["7 dias grátis", "Sem cartão", "Setup em 5 min"].map(text => (
                                <span key={text} className="text-caption flex items-center gap-1.5 text-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    {text}
                                </span>
                            ))}
                        </motion.div>

                        {/* Live Counter */}
                        <motion.div
                            className="mt-6 inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span className="text-body-strong text-emerald-400 text-sm">
                                <motion.span
                                    style={{ fontWeight: 'var(--fw-bold)' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.2 }}
                                >
                                    147 times
                                </motion.span>
                                {" "}criaram rankings esta semana
                            </span>
                        </motion.div>

                        {/* Integration logos */}
                        <motion.div
                            className="mt-10 pt-8 border-t border-white/10"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <p className="text-caption text-xs text-gray-500 uppercase tracking-widest mb-4">
                                Integração Nativa com:
                            </p>
                            <div className="flex items-center gap-8">
                                {["Kiwify", "Greenn", "Hotmart"].map(name => (
                                    <span key={name} className="text-gray-500 font-semibold text-sm hover:text-gray-400 transition-colors">
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
                        <LeaderboardSVG />
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
