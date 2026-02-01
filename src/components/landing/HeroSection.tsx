import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Play, TrendingUp, Users, Target, Trophy, Star, Zap } from "lucide-react";
import brandLogoWhite from "@/assets/logo-only.png";

interface HeroSectionProps {
    onCTAClick: () => void;
    onDemoClick: () => void;
    onLoginClick: () => void;
}

export const HeroSection = ({ onCTAClick, onDemoClick, onLoginClick }: HeroSectionProps) => {
    return (
        <section className="relative min-h-[90vh] overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* CSS Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                    }}
                />
                {/* Animated gradient overlay */}
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.4), transparent)',
                    }}
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            {/* Floating orbs */}
            <motion.div
                className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
                    filter: "blur(60px)",
                }}
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/3 left-1/5 w-56 h-56 rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
                    filter: "blur(50px)",
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
                            className="bg-white text-indigo-900 hover:bg-white/90 font-semibold shadow-lg shadow-indigo-500/20"
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
                        <Badge className="mb-6 bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30">
                            <Sparkles className="h-3 w-3 mr-1" />
                            TECNOLOGIA GAME SALES + GAMIFICAÇÃO
                        </Badge>

                        {/* New Headline with gradient text */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Vicie seu time em bater metas.
                            </span>
                        </h1>

                        <p className="text-lg text-white/60 mb-8 leading-relaxed max-w-xl">
                            O CRM que une gestão financeira e gamificação neural.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <motion.button
                                onClick={onCTAClick}
                                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-xl overflow-hidden transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Shine effect */}
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                                <span className="relative z-10">Começar agora</span>
                                <ArrowRight className="relative z-10 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>

                            <button
                                onClick={onDemoClick}
                                className="text-gray-300 hover:text-white flex items-center gap-2 hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
                            >
                                <Play className="h-4 w-4" fill="currentColor" />
                                Ver demonstração
                            </button>
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

                        {/* Trust Badges - Integration Logos */}
                        <motion.div
                            className="mt-10 pt-8 border-t border-white/10"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">
                                Integração Nativa com:
                            </p>
                            <div className="flex items-center gap-8">
                                {/* Text placeholders for now - can be replaced with SVG logos */}
                                <span className="text-gray-500 font-semibold text-sm hover:text-gray-400 transition-colors">
                                    Kiwify
                                </span>
                                <span className="text-gray-500 font-semibold text-sm hover:text-gray-400 transition-colors">
                                    Greenn
                                </span>
                                <span className="text-gray-500 font-semibold text-sm hover:text-gray-400 transition-colors">
                                    Hotmart
                                </span>
                            </div>
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
                                background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
                                filter: "blur(80px)",
                                transform: "scale(1.4)",
                            }}
                        />

                        {/* Main Dashboard Card */}
                        <div className="relative">
                            <motion.div
                                className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl"
                                style={{ boxShadow: "0 25px 80px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.1)" }}
                            >
                                {/* Browser chrome */}
                                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-rose-500" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-slate-800/50 rounded-md py-1.5 px-3 max-w-[280px] mx-auto">
                                            <span className="text-xs text-white/40">app.gamesales.com.br/dashboard</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    <div className="bg-slate-800/50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                                            <span className="text-xs text-white/50">Vendas</span>
                                        </div>
                                        <span className="text-lg font-bold text-white">R$ 48.2k</span>
                                        <span className="text-xs text-emerald-400 ml-2">+12%</span>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="h-4 w-4 text-indigo-400" />
                                            <span className="text-xs text-white/50">Leads</span>
                                        </div>
                                        <span className="text-lg font-bold text-white">1.247</span>
                                        <span className="text-xs text-indigo-400 ml-2">+8%</span>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="h-4 w-4 text-amber-400" />
                                            <span className="text-xs text-white/50">Meta</span>
                                        </div>
                                        <span className="text-lg font-bold text-white">89%</span>
                                        <span className="text-xs text-amber-400 ml-2">🔥</span>
                                    </div>
                                </div>

                                {/* Ranking Preview */}
                                <div className="bg-slate-800/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-white/80">Ranking Semanal</span>
                                        <Trophy className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div className="space-y-2">
                                        {[
                                            { name: "Carlos M.", value: "R$ 18.4k", rank: 1, color: "text-amber-400" },
                                            { name: "Ana L.", value: "R$ 15.2k", rank: 2, color: "text-slate-300" },
                                            { name: "Bruno S.", value: "R$ 12.8k", rank: 3, color: "text-amber-700" },
                                        ].map((item) => (
                                            <div key={item.rank} className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold ${item.color}`}>
                                                    {item.rank}
                                                </div>
                                                <span className="text-sm text-white/70 flex-1">{item.name}</span>
                                                <span className="text-sm font-medium text-white">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating notification */}
                            <motion.div
                                className="absolute -right-4 top-1/4 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-xl"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1, duration: 0.5 }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Zap className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/80 font-medium">Nova Venda!</p>
                                        <p className="text-xs text-emerald-400">+R$ 297,00</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Achievement badge */}
                            <motion.div
                                className="absolute -left-4 bottom-1/4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-sm border border-amber-500/30 rounded-xl p-3 shadow-xl"
                                initial={{ opacity: 0, x: -20, rotate: -5 }}
                                animate={{ opacity: 1, x: 0, rotate: -5 }}
                                transition={{ delay: 1.2, duration: 0.5 }}
                            >
                                <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
                                    <span className="text-xs text-amber-300 font-semibold">Top Seller!</span>
                                </div>
                            </motion.div>
                        </div>
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
                            <stop stopColor="#6366f1" stopOpacity="0.2" />
                            <stop offset="1" stopColor="#0f172a" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </section>
    );
};
