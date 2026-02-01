import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Play, TrendingUp, Users, Target, Trophy, Star, Flame, Crown, Zap } from "lucide-react";
import brandLogoWhite from "@/assets/logo-only.png";

interface HeroDarkProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onLoginClick: () => void;
}

export const HeroDark = ({ onCTAClick, onDemoClick, onLoginClick }: HeroDarkProps) => {
    return (
        <section className="relative min-h-[90vh] overflow-hidden">
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 0, 255, 0.3), transparent),
                        radial-gradient(ellipse 60% 50% at 100% 50%, rgba(168, 85, 247, 0.2), transparent),
                        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(236, 72, 153, 0.15), transparent),
                        linear-gradient(180deg, #0f0526 0%, #1a0a3e 50%, #0f172a 100%)
                    `,
                }}
            />

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
                        fill="url(#curveGradient)"
                    />
                    <defs>
                        <linearGradient id="curveGradient" x1="720" y1="60" x2="720" y2="120">
                            <stop stopColor="#7c3aed" stopOpacity="0.3" />
                            <stop offset="1" stopColor="#0f172a" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Floating orbs */}
            <motion.div
                className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/3 left-1/5 w-48 h-48 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Navbar */}
            <nav className="relative z-50 px-4 sm:px-6 lg:px-8 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <motion.img
                        src={brandLogoWhite}
                        alt="Game Sales"
                        className="h-9 w-auto"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    />

                    {/* Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <button className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Produto
                        </button>
                        <button className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Soluções
                        </button>
                        <button className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Preços
                        </button>
                        <button className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Sobre Nós
                        </button>
                    </div>

                    {/* CTA */}
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
                            className="bg-white text-purple-900 hover:bg-white/90 font-semibold shadow-lg shadow-purple-500/20"
                        >
                            Acesse a plataforma
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Text */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30">
                            <Sparkles className="h-3 w-3 mr-1" />
                            TECNOLOGIA GAME SALES + GAMIFICAÇÃO
                        </Badge>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                            Transforme seu{" "}
                            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                                Time de Vendas
                            </span>{" "}
                            em Campeões
                        </h1>

                        <p className="text-lg text-white/60 mb-8 leading-relaxed max-w-xl">
                            Potencialize cada interação com o seu cliente e aumente a performance do seu time de vendas usando gamificação.
                        </p>

                        {/* Improved CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                onClick={onCTAClick}
                                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-xl overflow-hidden transition-all duration-300"
                                style={{
                                    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #8b5cf6 100%)",
                                    backgroundSize: "200% 200%",
                                }}
                                whileHover={{
                                    scale: 1.02,
                                    backgroundPosition: "100% 0%",
                                }}
                                whileTap={{ scale: 0.98 }}
                                animate={{
                                    backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                                }}
                                transition={{
                                    backgroundPosition: {
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    },
                                }}
                            >
                                {/* Shine effect */}
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                                <span className="relative z-10">Começar agora</span>
                                <ArrowRight className="relative z-10 h-5 w-5 group-hover:translate-x-1 transition-transform" />

                                {/* Glow */}
                                <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ boxShadow: "0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)" }}
                                />
                            </motion.button>

                            <Button
                                size="lg"
                                variant="ghost"
                                onClick={onDemoClick}
                                className="text-white/80 hover:text-white hover:bg-white/10 h-14 px-6 rounded-xl"
                            >
                                <Play className="h-4 w-4 mr-2" fill="currentColor" />
                                Ver demonstração
                            </Button>
                        </div>

                        {/* Trust indicators */}
                        <motion.div
                            className="flex items-center gap-6 mt-8 text-white/50 text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                7 dias grátis
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                Sem cartão
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                Setup em 5 min
                            </span>
                        </motion.div>
                    </motion.div>

                    {/* Right: Enhanced Dashboard Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative hidden lg:block"
                    >
                        {/* Glow behind */}
                        <div
                            className="absolute inset-0 -z-10"
                            style={{
                                background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
                                filter: "blur(80px)",
                                transform: "scale(1.4)",
                            }}
                        />

                        {/* Main Dashboard Card */}
                        <div className="relative">
                            <motion.div
                                className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl"
                                style={{ boxShadow: "0 25px 80px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.1)" }}
                            >
                                {/* Browser chrome */}
                                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="w-52 h-7 bg-white/5 rounded-lg flex items-center justify-center gap-2 border border-white/5">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                                            <span className="text-xs text-white/40">app.gamesales.com.br</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                                            <Star className="w-3 h-3 text-white/30" />
                                        </div>
                                    </div>
                                </div>

                                {/* Welcome Header */}
                                <motion.div
                                    className="flex items-center justify-between mb-5"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <div>
                                        <p className="text-white/50 text-xs mb-1">👋 Bem-vindo de volta,</p>
                                        <h3 className="text-white font-semibold text-lg">Gestor</h3>
                                    </div>
                                    <motion.div
                                        className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1.5 rounded-full border border-amber-500/30"
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <Flame className="w-4 h-4 text-amber-400" />
                                        <span className="text-xs font-semibold text-amber-400">7 dias streak!</span>
                                    </motion.div>
                                </motion.div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    <motion.div
                                        className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 rounded-xl p-3 border border-emerald-500/20"
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                                <TrendingUp className="h-3 w-3 text-emerald-400" />
                                            </div>
                                            <span className="text-[10px] text-white/50 uppercase">Vendas</span>
                                        </div>
                                        <p className="text-xl font-bold text-emerald-400">R$ 48.2k</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">↑ 24%</span>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 rounded-xl p-3 border border-purple-500/20"
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                <Target className="h-3 w-3 text-purple-400" />
                                            </div>
                                            <span className="text-[10px] text-white/50 uppercase">Meta</span>
                                        </div>
                                        <p className="text-xl font-bold text-purple-400">127%</p>
                                        <div className="w-full bg-purple-900/50 rounded-full h-1.5 mt-2">
                                            <motion.div
                                                className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ delay: 1, duration: 1 }}
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        className="bg-gradient-to-br from-pink-500/20 to-pink-600/5 rounded-xl p-3 border border-pink-500/20"
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.7 }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                                <Users className="h-3 w-3 text-pink-400" />
                                            </div>
                                            <span className="text-[10px] text-white/50 uppercase">Leads</span>
                                        </div>
                                        <p className="text-xl font-bold text-pink-400">312</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] text-pink-400 bg-pink-400/10 px-1.5 py-0.5 rounded">+58 hoje</span>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Mini Leaderboard */}
                                <motion.div
                                    className="bg-white/5 rounded-xl p-4 border border-white/5 mb-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-amber-400" />
                                            <span className="text-sm font-medium text-white/80">Ranking do Mês</span>
                                        </div>
                                        <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">AO VIVO</span>
                                    </div>

                                    <div className="space-y-2">
                                        {[
                                            { pos: 1, name: "Lucas Costa", value: "R$ 12.4k", xp: 2840, avatar: "LC", color: "from-amber-400 to-orange-500" },
                                            { pos: 2, name: "Maria Silva", value: "R$ 11.2k", xp: 2650, avatar: "MS", color: "from-slate-300 to-slate-400" },
                                            { pos: 3, name: "Pedro Santos", value: "R$ 9.8k", xp: 2320, avatar: "PS", color: "from-amber-600 to-amber-700" },
                                        ].map((player, i) => (
                                            <motion.div
                                                key={player.pos}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.9 + i * 0.1 }}
                                            >
                                                <div className="flex items-center justify-center w-6">
                                                    {player.pos === 1 ? (
                                                        <Crown className="w-4 h-4 text-amber-400" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-white/40">#{player.pos}</span>
                                                    )}
                                                </div>
                                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${player.color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                                                    {player.avatar}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{player.name}</p>
                                                    <p className="text-[10px] text-white/40">{player.xp} XP</p>
                                                </div>
                                                <span className="text-sm font-semibold text-emerald-400">{player.value}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Activity Feed */}
                                <motion.div
                                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.2 }}
                                >
                                    <motion.div
                                        className="relative"
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <span className="text-[8px] text-white font-bold">!</span>
                                        </div>
                                    </motion.div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">Nova venda registrada!</p>
                                        <p className="text-xs text-white/40">Lucas acabou de fechar • R$ 3.200</p>
                                    </div>
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                                        +150 XP
                                    </Badge>
                                </motion.div>
                            </motion.div>

                            {/* Floating Cards - Ranking */}
                            <motion.div
                                className="absolute -left-16 top-20 bg-slate-900/90 backdrop-blur-xl rounded-xl p-3 border border-amber-500/30 shadow-2xl"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                style={{ boxShadow: "0 20px 40px -10px rgba(245, 158, 11, 0.2)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                        <Trophy className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Seu Ranking</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-2xl font-bold text-white">#1</p>
                                            <Crown className="w-4 h-4 text-amber-400" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating Cards - Meta */}
                            <motion.div
                                className="absolute -right-12 bottom-40 bg-slate-900/90 backdrop-blur-xl rounded-xl p-3 border border-emerald-500/30 shadow-2xl"
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                style={{ boxShadow: "0 20px 40px -10px rgba(16, 185, 129, 0.2)" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                                        <Target className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Meta Batida</p>
                                        <p className="text-2xl font-bold text-emerald-400">127%</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Achievement Badge */}
                            <motion.div
                                className="absolute -right-8 top-16 bg-slate-900/90 backdrop-blur-xl rounded-full p-2 border border-purple-500/30 shadow-2xl"
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Star className="h-7 w-7 text-white" fill="white" />
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default HeroDark;
