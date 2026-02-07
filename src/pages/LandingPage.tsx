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
    Pause,
    Volume2,
    VolumeX,
    Maximize
} from "lucide-react";
import brandLogo from "@/assets/logo-full.png";
import brandLogoWhite from "@/assets/logo-only.png";
import demoVideo from "/videos/sales-video.mp4";
import StripeGradient from "@/components/ui/StripeGradient";
import { HeroSection } from "@/components/landing/HeroSection";
import { ImpactMetrics } from "@/components/landing/ImpactMetrics";
import { ProductBentoGrid } from "@/components/landing/ProductBentoGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { IntegrationHub } from "@/components/landing/IntegrationHub";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Testimonials } from "@/components/landing/Testimonials";

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
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [showControls, setShowControls] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

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

        // Animate then navigate to onboarding (trial flow)
        setTimeout(() => {
            navigate('/onboarding');
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
        <div className="min-h-screen w-full bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
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
                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
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


            {/* New Dark Premium Hero with built-in navbar */}
            <HeroSection
                onCTAClick={() => scrollToSection("pricing")}
                onDemoClick={() => scrollToSection("demo")}
                onLoginClick={() => navigate("/auth")}
            />

            {/* Impact Metrics Bar - Social Proof */}
            <ImpactMetrics />

            {/* Product Bento Grid - Replaces old Features */}
            <ProductBentoGrid />

            {/* Testimonials - Social Proof */}
            <Testimonials />

            {/* How It Works - The Loop */}
            <HowItWorks />


            {/* Demo Section */}
            <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-12"
                    >
                        <Badge className="mb-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                            <Zap className="h-3 w-3 mr-1" />
                            👀 Tour Completo em 2 Minutos
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Veja o Game Sales Em Ação
                        </h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
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

                        {/* Premium Video Player */}
                        <div
                            ref={videoContainerRef}
                            className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 group"
                            onMouseEnter={() => setShowControls(true)}
                            onMouseLeave={() => setShowControls(false)}
                        >
                            {/* Glow effect behind video */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-2xl blur-xl opacity-60" />

                            <div className="relative bg-slate-900 rounded-2xl overflow-hidden">
                                <video
                                    ref={videoRef}
                                    src={demoVideo}
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    autoPlay
                                    preload="auto"
                                    className="w-full h-auto"
                                    onPlay={() => setIsVideoPlaying(true)}
                                    onPause={() => setIsVideoPlaying(false)}
                                    onEnded={() => setIsVideoPlaying(false)}
                                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                                    onTimeUpdate={(e) => setVideoProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
                                />

                                {/* Click anywhere to toggle play/pause */}
                                <div
                                    className="absolute inset-0 cursor-pointer"
                                    onClick={() => {
                                        if (videoRef.current) {
                                            if (isVideoPlaying) {
                                                videoRef.current.pause();
                                            } else {
                                                videoRef.current.play();
                                            }
                                        }
                                    }}
                                >
                                    {/* Center play/pause indicator on click */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: showControls || !isVideoPlaying ? 1 : 0, scale: 1 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        {!isVideoPlaying && (
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-2xl shadow-amber-500/30 flex items-center justify-center"
                                            >
                                                <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Bottom Controls Bar */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: showControls || !isVideoPlaying ? 1 : 0, y: 0 }}
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-4"
                                >
                                    {/* Progress Bar */}
                                    <div className="relative h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group/progress"
                                        onClick={(e) => {
                                            if (videoRef.current) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const percent = (e.clientX - rect.left) / rect.width;
                                                videoRef.current.currentTime = percent * videoRef.current.duration;
                                            }
                                        }}
                                    >
                                        {/* Buffered */}
                                        <div className="absolute inset-0 bg-white/10 rounded-full" />
                                        {/* Progress */}
                                        <motion.div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                            style={{ width: `${videoProgress}%` }}
                                        />
                                        {/* Hover preview dot */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                            style={{ left: `calc(${videoProgress}% - 8px)` }}
                                        />
                                    </div>

                                    {/* Control Buttons */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Play/Pause */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (videoRef.current) {
                                                        isVideoPlaying ? videoRef.current.pause() : videoRef.current.play();
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                                            >
                                                {isVideoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
                                            </button>

                                            {/* Volume */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMuted(!isMuted);
                                                }}
                                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                                            >
                                                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                            </button>

                                            {/* Time */}
                                            <span className="text-white/70 text-sm font-mono">
                                                {videoRef.current ? `${Math.floor(videoRef.current.currentTime / 60)}:${String(Math.floor(videoRef.current.currentTime % 60)).padStart(2, '0')}` : '0:00'}
                                                <span className="text-white/40"> / </span>
                                                {videoDuration ? `${Math.floor(videoDuration / 60)}:${String(Math.floor(videoDuration % 60)).padStart(2, '0')}` : '0:00'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Fullscreen */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (videoContainerRef.current) {
                                                        if (document.fullscreenElement) {
                                                            document.exitFullscreen();
                                                        } else if (videoContainerRef.current.requestFullscreen) {
                                                            videoContainerRef.current.requestFullscreen();
                                                        } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
                                                            (videoContainerRef.current as any).webkitRequestFullscreen();
                                                        }
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                                            >
                                                <Maximize className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Feature highlights below video */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Kanban className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">CRM Visual</h4>
                                    <p className="text-sm text-gray-400">Kanban intuitivo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Gamificação</h4>
                                    <p className="text-sm text-gray-400">Rankings e conquistas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Target className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Metas Inteligentes</h4>
                                    <p className="text-sm text-gray-400">Acompanhamento em tempo real</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Use Cases Section */}
            <UseCasesSection />

            {/* Pricing Section - Dark Theme with Neon */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
                {/* Background glow effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        {/* ROI Promise Badge */}
                        <motion.div
                            className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6"
                            initial={{ scale: 0.9, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                        >
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            Garantia de ROI: Se paga em 1 venda extra
                        </motion.div>

                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Investimento Que Se <span className="text-indigo-400">Multiplica</span>
                        </h2>
                        <p className="text-lg text-gray-400 mb-8">
                            Retorno médio de <strong className="text-white">12x o valor investido</strong>. Sem surpresas, sem taxas escondidas.
                        </p>

                        {/* Billing Toggle - Enhanced Dark Style */}
                        <div className="inline-flex items-center bg-slate-800/50 border border-white/10 rounded-full p-1">
                            <button
                                onClick={() => setIsAnnual(false)}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${!isAnnual
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setIsAnnual(true)}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isAnnual
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Anual
                                {isAnnual && (
                                    <span className="bg-emerald-400 text-emerald-950 text-[10px] px-2 py-0.5 rounded-full font-bold">
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
                                    className={`relative h-full transition-all duration-300 ${plan.popular
                                        ? 'border-2 border-indigo-500 bg-slate-800/80 backdrop-blur-sm'
                                        : 'border-white/10 bg-slate-800/40 backdrop-blur-sm hover:border-white/20'
                                        }`}
                                    style={plan.popular ? {
                                        boxShadow: '0 0 40px rgba(99, 102, 241, 0.3), 0 0 80px rgba(99, 102, 241, 0.1)'
                                    } : {}}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-indigo-600 text-white px-4 py-1 shadow-lg shadow-indigo-500/30 border-0">
                                                ⚡ Mais Popular
                                            </Badge>
                                        </div>
                                    )}
                                    <CardHeader className={`text-center ${plan.popular ? 'pt-10' : 'pt-6'}`}>
                                        <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                                        <CardDescription className="text-gray-400">{plan.tagline}</CardDescription>
                                        <div className="mt-4">
                                            {plan.priceNumber === 0 ? (
                                                <span className="text-4xl font-bold text-white">
                                                    Grátis
                                                </span>
                                            ) : isAnnual ? (
                                                <>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm line-through text-gray-500">
                                                            R$ {plan.priceNumber}/mês
                                                        </span>
                                                        <span className="text-4xl font-bold text-white">
                                                            R$ {Math.round(plan.priceNumber * 0.9)}
                                                        </span>
                                                        <span className="text-gray-400">/mês</span>
                                                        <span className="text-xs mt-1 text-slate-500">
                                                            Cobrado R$ {Math.round(plan.priceNumber * 0.9 * 12).toLocaleString('pt-BR')}/ano
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-4xl font-bold text-white">
                                                        R$ {plan.priceNumber}
                                                    </span>
                                                    <span className="text-gray-400">/mês</span>
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-3">
                                                    <Check className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-emerald-400'}`} />
                                                    <span className="text-sm text-gray-300">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            className={`w-full mt-6 ${plan.popular
                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30'
                                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                                }`}
                                            onClick={() => window.location.href = `/register?plan=${plan.name.toLowerCase()}`}
                                        >
                                            🚀 Testar Grátis por 7 Dias
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Trust Signals */}
                    <motion.div
                        {...fadeInUp}
                        className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-slate-400"
                    >
                        <div className="flex items-center gap-2">
                            <span>💳</span>
                            <span>Não precisa de cartão de crédito</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>🔓</span>
                            <span>Cancele a qualquer momento</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>🛡️</span>
                            <span>7 dias de acesso total ao PRO</span>
                        </div>
                    </motion.div>
                </div>
            </section>



            {/* FAQ Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Dúvidas? Temos Respostas.
                        </h2>
                        <p className="text-gray-400">
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
                                a: "Com certeza! Oferecemos 7 dias grátis do plano PRO - sem precisar de cartão de crédito. Teste tudo à vontade e cancele quando quiser."
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
                                className="group bg-slate-900 rounded-xl border border-white/10 overflow-hidden"
                            >
                                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors">
                                    <span className="font-medium text-white">{faq.q}</span>
                                    <ArrowRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
                                </summary>
                                <div className="px-5 pb-5 text-gray-400">
                                    {faq.a}
                                </div>
                            </motion.details>
                        ))}
                    </motion.div>
                </div>
            </section>



            {/* Final CTA */}
            <FinalCTA onCTAClick={() => goToRegister('pro')} />

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <img src={brandLogoWhite} alt="Game Sales" className="h-8" />
                        <div className="flex gap-8 text-sm text-gray-400">
                            <button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">
                                Funcionalidades
                            </button>
                            <button onClick={() => scrollToSection("pricing")} className="hover:text-white transition-colors">
                                Preços
                            </button>
                            <button onClick={() => navigate("/politica-privacidade")} className="hover:text-white transition-colors">
                                Privacidade
                            </button>
                            <button onClick={() => navigate("/auth")} className="hover:text-white transition-colors">
                                Login
                            </button>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-sm text-gray-500">
                        © 2025 Game Sales. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
