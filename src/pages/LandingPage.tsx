import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Trophy,
    Kanban,
    MessageCircle,
    Check,
    ArrowRight,
    Menu,
    X,
    Zap,
    Link2,
    Sparkles,
    Target,
    Rocket,
    Award,
    Play,
    Volume2,
    VolumeX
} from "lucide-react";
import brandLogo from "@/assets/logo-full.png";
import brandLogoWhite from "@/assets/logo 1 - white.png";
import demoVideo from "@/assets/demo.mp4";
import StripeGradient from "@/components/ui/StripeGradient";

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
};

const staggerContainer = {
    initial: {},
    whileInView: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

const LandingPage = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAnnual, setIsAnnual] = useState(true); // Default to annual for 10% discount
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
        setMobileMenuOpen(false);
    };

    const goToRegister = (planId?: string) => {
        setSelectedPlan(planId || 'plus');
        setIsNavigating(true);

        // Animate then navigate
        setTimeout(() => {
            if (planId) {
                navigate(`/register?plan=${planId.toLowerCase()}`);
            } else {
                navigate('/register');
            }
        }, 3000);
    };

    const features = [
        {
            icon: Trophy,
            title: "Ranking em Tempo Real",
            description: "Motive vendedores com competições automáticas.",
            gradient: "from-amber-500 to-orange-600",
            size: "md:col-span-1"
        },
        {
            icon: Link2,
            title: "Venda Caiu, Meta Subiu",
            description: "Sincronização via Webhook em segundos. Integrado com Kiwify, Greenn e Hotmart.",
            gradient: "from-emerald-500 to-teal-600",
            size: "md:col-span-1"
        },
        {
            icon: Kanban,
            title: "Gestão Visual",
            description: "Arrastar e soltar nunca foi tão lucrativo.",
            gradient: "from-indigo-500 to-purple-600",
            size: "md:col-span-1"
        },
        {
            icon: MessageCircle,
            title: "Venda sem sair do Zap",
            description: "CRM integrado direto no navegador.",
            gradient: "from-green-500 to-emerald-600",
            size: "md:col-span-1"
        },
    ];

    const plans = [
        {
            name: "Starter",
            price: "147",
            priceNumber: 147,
            tagline: "Para validar sua operação.",
            features: [
                "Dashboard em tempo real",
                "1 Vendedor + 1 Admin",
                "Metas individuais",
                "Registro de vendas",
                "Performance de calls",
            ],
            popular: false,
            extraInfo: null,
            checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=dd862f815f6b4d6285b2b8119710553b",
        },
        {
            name: "Plus",
            price: "397",
            priceNumber: 397,
            tagline: "O mais popular.",
            features: [
                "Tudo do Starter",
                "3 Vendedores + 1 Admin",
                "Pipeline de vendas",
                "Ranking gamificado",
                "Relatórios completos",
                "Metas consolidadas",
            ],
            popular: true,
            extraInfo: "+R$ 49,97/vendedor adicional",
            checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7c2c9ac396684c229987a7501cf4f88c",
        },
        {
            name: "Pro",
            price: "797",
            priceNumber: 797,
            tagline: "Escala total.",
            features: [
                "Tudo do Plus",
                "8 Vendedores + 3 Admins",
                "CRM completo",
                "Integrações (Hotmart, Stripe)",
                "Multi-empresa",
                "Suporte prioritário",
            ],
            popular: false,
            extraInfo: "+R$ 48,99/vendedor adicional",
            checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7f7561d2b1174aacb31ab92dce72ded4",
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Loading Overlay - Immersive Experience */}
            {isNavigating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden"
                >
                    {/* Subtle grid pattern */}
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                    />

                    {/* Animated glow orbs */}
                    <motion.div
                        className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"
                        animate={{
                            scale: [1.2, 1, 1.2],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Main Content */}
                    <div className="relative z-10 flex items-center justify-center h-full px-4">
                        <div className="max-w-2xl w-full">
                            {/* Logo */}
                            <motion.img
                                src={brandLogo}
                                alt="Game Sales"
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="h-12 mx-auto mb-12 brightness-0 invert"
                            />

                            {/* Progress Bar */}
                            <motion.div
                                className="h-1 bg-white/10 rounded-full overflow-hidden mb-8"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                            </motion.div>

                            {/* Title */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-center mb-10"
                            >
                                <h2 className="text-3xl font-bold text-white mb-2">
                                    Preparando seu Plano {selectedPlan?.charAt(0).toUpperCase()}{selectedPlan?.slice(1)}
                                </h2>
                                <p className="text-white/60">
                                    Você está a um passo de transformar suas vendas
                                </p>
                            </motion.div>




                            {/* Value Props - Animated List */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-wrap justify-center gap-3 mb-10"
                            >
                                {[
                                    { icon: Trophy, text: "Ranking Gamificado" },
                                    { icon: Target, text: "Metas Inteligentes" },
                                    { icon: Zap, text: "Integração Automática" },
                                    { icon: Rocket, text: "Dashboard em Tempo Real" }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.4 + idx * 0.1, type: "spring" }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10"
                                    >
                                        <item.icon className="h-4 w-4 text-indigo-400" />
                                        <span className="text-sm text-white/80">{item.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Mini Testimonial */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-center p-6 bg-white/5 rounded-2xl border border-white/10"
                            >
                                <p className="text-white/80 italic mb-3">
                                    "Nosso time bateu a meta <span className="text-emerald-400 font-semibold">3 meses seguidos</span> depois que implementamos o Game Sales."
                                </p>
                                <p className="text-sm text-white/50">— Lucas M., Gerente de Vendas</p>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <img src={brandLogo} alt="Game Sales" className="h-10 w-auto" />
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-8">
                            <button
                                onClick={() => scrollToSection("features")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Funcionalidades
                            </button>
                            <button
                                onClick={() => scrollToSection("pricing")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Preços
                            </button>
                            <button
                                onClick={() => scrollToSection("contact")}
                                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Contato
                            </button>
                        </div>

                        {/* CTA Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate("/auth")}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                            >
                                Entrar
                            </Button>
                            <Button
                                onClick={() => scrollToSection("pricing")}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Começar Agora
                            </Button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-200">
                        <div className="px-4 py-4 space-y-3">
                            <button onClick={() => scrollToSection("features")} className="block w-full text-left py-2 text-slate-700">
                                Funcionalidades
                            </button>
                            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-2 text-slate-700">
                                Preços
                            </button>
                            <button onClick={() => scrollToSection("contact")} className="block w-full text-left py-2 text-slate-700">
                                Contato
                            </button>
                            <hr className="border-slate-200" />
                            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                                Entrar
                            </Button>
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => { scrollToSection("pricing"); setMobileMenuOpen(false); }}
                            >
                                Começar Agora
                            </Button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section with Stripe WebGL Gradient */}
            <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 min-h-[700px] overflow-hidden">
                {/* Stripe WebGL Gradient Background */}
                <div className="absolute inset-0 z-0">
                    <StripeGradient />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        {/* Hero Content */}
                        <motion.div {...fadeInUp}>
                            <Badge className="mb-6 bg-white/80 backdrop-blur-sm text-indigo-700 border-indigo-200/50 hover:bg-white/90 shadow-sm">
                                <Sparkles className="h-3 w-3 mr-1" />
                                CRM Gamificado para Times de Vendas
                            </Badge>


                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                                Pare de Perder Vendas.{" "}
                                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">Comece a Dominar.</span>
                            </h1>

                            <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                                O único CRM que transforma seu time comercial em campeões de vendas.
                                <strong className="text-slate-800"> Gamificação + Automação + Integrações</strong> — tudo em um só lugar.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    onClick={() => scrollToSection("pricing")}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-base h-12 px-8 font-semibold shadow-lg"
                                >
                                    Começar Agora Grátis
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => scrollToSection("demo")}
                                    className="text-base h-12 px-8 border-slate-300 bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-slate-900 font-medium"
                                >
                                    Ver Demo
                                </Button>
                            </div>


                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Demo Section */}
            <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-12"
                    >
                        <Badge className="mb-4 bg-indigo-100 text-indigo-700 border-indigo-200">
                            <Zap className="h-3 w-3 mr-1" />
                            👀 Tour Completo em 2 Minutos
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Veja o Game Sales Em Ação
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Interface simples, resultados extraordinários.
                            Assista e descubra como transformar sua gestão de vendas.
                        </p>
                    </motion.div>

                    <motion.div
                        {...fadeInUp}
                        transition={{ delay: 0.2 }}
                        className="relative"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-blue-500/30 to-indigo-500/30 rounded-3xl blur-3xl -z-10 scale-105" />

                        {/* Video Container with Overlay */}
                        <div
                            className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden relative group cursor-pointer"
                            onClick={() => {
                                if (videoRef.current) {
                                    if (isVideoPlaying) {
                                        videoRef.current.pause();
                                    } else {
                                        videoRef.current.play();
                                    }
                                    setIsVideoPlaying(!isVideoPlaying);
                                }
                            }}
                        >
                            <video
                                ref={videoRef}
                                src={demoVideo}
                                loop
                                muted={isMuted}
                                playsInline
                                className="w-full h-auto"
                            />

                            {/* Play Overlay */}
                            {!isVideoPlaying && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-slate-900/30 flex flex-col items-center justify-center"
                                >
                                    {/* Play Button */}
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 shadow-2xl flex items-center justify-center mb-6 group-hover:bg-white transition-colors"
                                    >
                                        <Play className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-600 ml-1" fill="currentColor" />
                                    </motion.div>

                                    {/* Text CTA */}
                                    <h3 className="text-white text-xl sm:text-2xl font-bold mb-2">
                                        Clique para assistir a demo
                                    </h3>
                                    <p className="text-white/70 text-sm sm:text-base">
                                        Veja como funciona em 2 minutos
                                    </p>

                                    {/* Animated pulse ring */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <motion.div
                                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white/30"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Mute/Unmute Button (visible when playing) */}
                            {isVideoPlaying && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMuted(!isMuted);
                                    }}
                                    className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                                >
                                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </motion.button>
                            )}
                        </div>

                        {/* Feature highlights below video */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Kanban className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">CRM Visual</h4>
                                    <p className="text-sm text-slate-500">Kanban intuitivo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">Gamificação</h4>
                                    <p className="text-sm text-slate-500">Rankings e conquistas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Target className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">Metas Inteligentes</h4>
                                    <p className="text-sm text-slate-500">Acompanhamento em tempo real</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 4 Pilares Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Por Que Times Campeões Escolhem o Game Sales?
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            4 pilares que transformam vendedores comuns em <strong className="text-slate-800">máquinas de resultados</strong>.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
                    >
                        {/* Pilar 1 - Verdade em Tempo Real */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-amber-100 flex items-center justify-center mb-5">
                                    <Zap className="h-7 w-7 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Verdade em Tempo Real</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Integração nativa com Kiwify e Greenn. O Game Sales audita cada centavo: só sobe no ranking o dinheiro que realmente caiu.
                                </p>
                            </div>
                        </motion.div>

                        {/* Pilar 2 - Gamificação Neural */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center mb-5">
                                    <Trophy className="h-7 w-7 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Gamificação Neural</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    O único CRM que parece um jogo. Rankings, sons de level-up e feedback visual instantâneo para viciar seu time em vender.
                                </p>
                            </div>
                        </motion.div>

                        {/* Pilar 3 - Produtividade Invisível */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-cyan-100 flex items-center justify-center mb-5">
                                    <Rocket className="h-7 w-7 text-cyan-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Produtividade Invisível</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Seu time joga, o sistema anota. Com a Extensão Game Sales, eliminamos o preenchimento manual chato.
                                </p>
                            </div>
                        </motion.div>

                        {/* Pilar 4 - Cultura de Elite */}
                        <motion.div variants={fadeInUp}>
                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                                <div className="h-14 w-14 rounded-xl bg-yellow-100 flex items-center justify-center mb-5">
                                    <Award className="h-7 w-7 text-yellow-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-3">Cultura de Elite</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Meritocracia automática. Quem vende mais desbloqueia novas patentes e domina o lobby da empresa.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section - Bento Grid */}
            <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Arsenal Completo Para Vender Mais
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Cada ferramenta foi pensada para <strong className="text-slate-800">eliminar fricção</strong> e <strong className="text-slate-800">acelerar fechamentos</strong>.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                className={`group ${feature.size}`}
                            >
                                <div className="h-full bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300">
                                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Investimento Que Se Paga em 1 Venda
                        </h2>
                        <p className="text-lg text-slate-600 mb-8">
                            O retorno médio dos nossos clientes é de <strong className="text-slate-800">12x o valor investido</strong>. Sem surpresas, sem taxas escondidas.
                        </p>

                        {/* Billing Toggle - Tabs/Pills Style */}
                        <div className="inline-flex items-center bg-slate-100 rounded-full p-1">
                            <button
                                onClick={() => setIsAnnual(false)}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${!isAnnual
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setIsAnnual(true)}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isAnnual
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Anual
                                {isAnnual && (
                                    <span className="bg-emerald-400 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                        -10%
                                    </span>
                                )}
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start"
                    >
                        {plans.map((plan, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                className={plan.popular ? "md:-mt-4 md:mb-4" : ""}
                            >
                                <Card
                                    className={`relative h-full ${plan.popular
                                        ? 'border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 bg-slate-900'
                                        : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-indigo-600 text-white px-4 py-1 shadow-lg">
                                                Mais Popular
                                            </Badge>
                                        </div>
                                    )}
                                    <CardHeader className={`text-center ${plan.popular ? 'pt-10' : 'pt-6'}`}>
                                        <CardTitle className={`text-2xl ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</CardTitle>
                                        <CardDescription className={plan.popular ? 'text-slate-300' : 'text-slate-600'}>{plan.tagline}</CardDescription>
                                        <div className="mt-4">
                                            {plan.priceNumber === 0 ? (
                                                <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                                                    Grátis
                                                </span>
                                            ) : isAnnual ? (
                                                <>
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-sm line-through ${plan.popular ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            R$ {plan.priceNumber}/mês
                                                        </span>
                                                        <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                                                            R$ {Math.round(plan.priceNumber * 0.9)}
                                                        </span>
                                                        <span className={plan.popular ? 'text-slate-400' : 'text-slate-500'}>/mês</span>
                                                        <span className={`text-xs mt-1 ${plan.popular ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                            Cobrado R$ {Math.round(plan.priceNumber * 0.9 * 12).toLocaleString('pt-BR')}/ano
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                                                        R$ {plan.priceNumber}
                                                    </span>
                                                    <span className={plan.popular ? 'text-slate-400' : 'text-slate-500'}>/mês</span>
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-3">
                                                    <Check className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                                    <span className={`text-sm ${plan.popular ? 'text-slate-300' : 'text-slate-700'}`}>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className={`w-full mt-6 ${plan.popular
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                                                }`}
                                            onClick={() => window.open(plan.checkoutUrl, '_blank')}
                                        >
                                            Assinar {plan.name}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>



            {/* FAQ Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">
                            Dúvidas? Temos Respostas.
                        </h2>
                        <p className="text-slate-600">
                            Tudo que você precisa saber antes de começar a dominar.
                        </p>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="space-y-4"
                    >
                        {[
                            {
                                q: "Quanto tempo leva para implementar?",
                                a: "Menos de 5 minutos! Basta criar sua conta, configurar os webhooks e pronto. A integração com Hotmart, Kiwify e Greenn é automática."
                            },
                            {
                                q: "Posso testar antes de assinar?",
                                a: "Sim! Oferecemos 7 dias de teste grátis em todos os planos pagos. Cancele a qualquer momento sem compromisso."
                            },
                            {
                                q: "Funciona para qualquer tipo de venda?",
                                a: "O Game Sales é ideal para times que vendem infoprodutos, serviços ou produtos físicos. Se você tem um time de vendas, o Game Sales é para você."
                            },
                            {
                                q: "Meus dados estão seguros?",
                                a: "100%. Usamos criptografia de ponta a ponta e nossa infraestrutura é hospedada em servidores seguros. Conformidade total com LGPD."
                            },
                            {
                                q: "Posso cancelar a qualquer momento?",
                                a: "Sim, sem multas ou taxas. Você pode cancelar diretamente pelo painel, sem precisar falar com ninguém."
                            }
                        ].map((faq, idx) => (
                            <motion.details
                                key={idx}
                                variants={fadeInUp}
                                className="group bg-white rounded-xl border border-slate-200 overflow-hidden"
                            >
                                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors">
                                    <span className="font-medium text-slate-900">{faq.q}</span>
                                    <ArrowRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform" />
                                </summary>
                                <div className="px-5 pb-5 text-slate-600">
                                    {faq.a}
                                </div>
                            </motion.details>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Contact/CTA Section */}
            <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 bg-indigo-600 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
                </div>

                <motion.div
                    {...fadeInUp}
                    className="relative z-10 max-w-4xl mx-auto text-center text-white"
                >
                    <Badge className="mb-6 bg-white/20 text-white border-white/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        ⚡ Últimas Vagas do Mês
                    </Badge>
                    <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                        Seus Concorrentes Já Estão Vendendo Mais.
                    </h2>
                    <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
                        <strong>E você?</strong> Começe agora e veja resultados em 7 dias ou devolvemos seu dinheiro.
                    </p>

                    {/* Trust badges */}
                    <div className="flex flex-wrap justify-center gap-4 mb-10">
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm">7 dias grátis</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm">Sem cartão de crédito</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm">Cancele quando quiser</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            onClick={() => goToRegister('plus')}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 text-base h-14 px-10 font-semibold shadow-xl"
                        >
                            Começar Meu Teste Grátis
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            size="lg"
                            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 text-base h-14 px-8 font-medium"
                            onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
                        >
                            Falar no WhatsApp
                        </Button>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <img src={brandLogo} alt="Game Sales" className="h-8" />
                        <div className="flex gap-8 text-sm text-slate-600">
                            <button onClick={() => scrollToSection("features")} className="hover:text-slate-900 transition-colors">
                                Funcionalidades
                            </button>
                            <button onClick={() => scrollToSection("pricing")} className="hover:text-slate-900 transition-colors">
                                Preços
                            </button>
                            <button onClick={() => navigate("/politica-privacidade")} className="hover:text-slate-900 transition-colors">
                                Privacidade
                            </button>
                            <button onClick={() => navigate("/auth")} className="hover:text-slate-900 transition-colors">
                                Login
                            </button>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-sm text-slate-500">
                        © 2025 Game Sales. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
