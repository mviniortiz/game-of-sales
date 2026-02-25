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
    PhoneCall,
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
import { FAQSection } from "@/components/landing/FAQSection";
import { PainPoints } from "@/components/landing/PainPoints";
import { LandingNav } from "@/components/landing/LandingNav";

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
            gradient: "from-emerald-500 to-emerald-600",
            size: "md:col-span-1"
        },
        {
            icon: PhoneCall,
            title: "Ligações no CRM",
            description: "Ligue dentro da plataforma e centralize histórico de contato no deal.",
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
                "Painel de performance básico",
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
                "Ligações na plataforma (add-on)",
            ],
            popular: true,
            extraInfo: "+R$ 49,97/vendedor adicional • Ligações como add-on",
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
                "Ligações + transcrição no deal (add-on)",
                "Multi-empresa",
                "Suporte prioritário",
            ],
            popular: false,
            extraInfo: "+R$ 48,99/vendedor adicional • Melhor custo para add-on de ligações",
            checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7f7561d2b1174aacb31ab92dce72ded4",
        },
    ];

    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-50 selection:bg-emerald-500/30">
            {/* Loading Overlay - Immersive Experience */}
            {isNavigating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden"
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
                        className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/30 rounded-full blur-3xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/30 rounded-full blur-3xl"
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
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
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
                                        <item.icon className="h-4 w-4 text-emerald-400" />
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


            {/* Sticky scroll-aware navbar */}
            <LandingNav
                onCTAClick={() => scrollToSection("pricing")}
                onLoginClick={() => navigate("/auth")}
            />

            {/* Hero */}
            <HeroSection
                onCTAClick={() => scrollToSection("pricing")}
                onDemoClick={() => scrollToSection("demo")}
                onLoginClick={() => navigate("/auth")}
            />

            {/* Impact Metrics Bar - Social Proof */}
            <ImpactMetrics />

            {/* Pain Points - Valida a dor antes da solução */}
            <PainPoints />

            {/* Product Bento Grid - Features/Solução */}
            <ProductBentoGrid />

            {/* How It Works */}
            <div id="how-it-works">
                <HowItWorks />
            </div>


            {/* Demo Section */}
            <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
                {/* Background glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 70%)", filter: "blur(60px)" }}
                />

                <div className="max-w-5xl mx-auto relative z-10">

                    {/* Header */}
                    <motion.div {...fadeInUp} className="text-center mb-12">
                        <span
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 rounded-full px-4 py-1.5 mb-5"
                            style={{ letterSpacing: "var(--ls-widest)", fontWeight: "var(--fw-semibold)" }}
                        >
                            <Play className="h-3 w-3" fill="currentColor" />
                            TOUR COMPLETO EM 2 MINUTOS
                        </span>

                        <h2
                            className="text-white mb-4"
                            style={{ fontWeight: "var(--fw-extrabold)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: "var(--lh-tight)", letterSpacing: "var(--ls-snug)" }}
                        >
                            Veja o Game Sales em{" "}
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                ação
                            </span>
                        </h2>

                        <p className="text-body text-gray-400 max-w-xl mx-auto" style={{ fontSize: "1.0625rem" }}>
                            Interface simples, resultados extraordinários. Assista e descubra como
                            transformar sua gestão de vendas em minutos.
                        </p>
                    </motion.div>

                    {/* Video container */}
                    <motion.div
                        {...fadeInUp}
                        transition={{ delay: 0.15 }}
                        className="relative"
                    >
                        {/* Outer glow */}
                        <div
                            className="absolute -inset-px rounded-2xl pointer-events-none"
                            style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1), rgba(16,185,129,0.05))", filter: "blur(1px)" }}
                        />
                        <div
                            className="absolute -inset-6 rounded-3xl pointer-events-none"
                            style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)", filter: "blur(20px)" }}
                        />

                        {/* Premium Video Player */}
                        <div
                            ref={videoContainerRef}
                            className="relative rounded-2xl overflow-hidden border group"
                            style={{ borderColor: "rgba(16,185,129,0.2)", boxShadow: "0 32px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.08)" }}
                            onMouseEnter={() => setShowControls(true)}
                            onMouseLeave={() => setShowControls(false)}
                        >
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

                                {/* Click overlay for play/pause */}
                                <div
                                    className="absolute inset-0 cursor-pointer"
                                    onClick={() => {
                                        if (videoRef.current) {
                                            isVideoPlaying ? videoRef.current.pause() : videoRef.current.play();
                                        }
                                    }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: showControls || !isVideoPlaying ? 1 : 0, scale: 1 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        {!isVideoPlaying && (
                                            <motion.div
                                                whileHover={{ scale: 1.08 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="w-20 h-20 rounded-full flex items-center justify-center"
                                                style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 60px rgba(16,185,129,0.4), 0 8px 32px rgba(0,0,0,0.4)" }}
                                            >
                                                <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Controls Bar */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: showControls || !isVideoPlaying ? 1 : 0, y: 0 }}
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-16 pb-4 px-5"
                                >
                                    {/* Progress Bar */}
                                    <div
                                        className="relative h-1 bg-white/15 rounded-full mb-4 cursor-pointer group/progress hover:h-1.5 transition-all"
                                        onClick={(e) => {
                                            if (videoRef.current) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
                                            }
                                        }}
                                    >
                                        <div
                                            className="absolute top-0 left-0 h-full rounded-full"
                                            style={{ width: `${videoProgress}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }}
                                        />
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                            style={{ left: `calc(${videoProgress}% - 6px)` }}
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); videoRef.current && (isVideoPlaying ? videoRef.current.pause() : videoRef.current.play()); }}
                                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                            >
                                                {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                            >
                                                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            </button>
                                            <span className="text-white/50 text-xs font-mono ml-1">
                                                {videoRef.current ? `${Math.floor(videoRef.current.currentTime / 60)}:${String(Math.floor(videoRef.current.currentTime % 60)).padStart(2, '0')}` : '0:00'}
                                                <span className="text-white/25"> / </span>
                                                {videoDuration ? `${Math.floor(videoDuration / 60)}:${String(Math.floor(videoDuration % 60)).padStart(2, '0')}` : '0:00'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (videoContainerRef.current) {
                                                    document.fullscreenElement
                                                        ? document.exitFullscreen()
                                                        : videoContainerRef.current.requestFullscreen?.() ?? (videoContainerRef.current as any).webkitRequestFullscreen?.();
                                                }
                                            }}
                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                        >
                                            <Maximize className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Feature pills below video */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                { icon: Kanban, color: "text-emerald-400", bg: "bg-emerald-500/10", title: "CRM Visual", desc: "Kanban intuitivo" },
                                { icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10", title: "Gamificação", desc: "Rankings e conquistas" },
                                { icon: PhoneCall, color: "text-cyan-400", bg: "bg-cyan-500/10", title: "Ligações", desc: "Histórico no deal + gravação" },
                            ].map(({ icon: Icon, color, bg, title, desc }) => (
                                <motion.div
                                    key={title}
                                    className="flex items-center gap-3 rounded-xl p-4 border border-white/6 bg-slate-900/40 backdrop-blur-sm"
                                    whileHover={{ y: -3, borderColor: "rgba(16,185,129,0.2)" }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`h-4 w-4 ${color}`} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm" style={{ fontWeight: "var(--fw-semibold)" }}>{title}</p>
                                        <p className="text-white/40 text-xs" style={{ fontWeight: "var(--fw-light)" }}>{desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Use Cases Section */}
            <div id="use-cases">
                <UseCasesSection />
            </div>

            {/* Ligacoes Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle at 18% 20%, rgba(16,185,129,0.09), transparent 45%), radial-gradient(circle at 82% 78%, rgba(34,197,94,0.08), transparent 45%)"
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.025] pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                        backgroundSize: "44px 44px"
                    }}
                />

                <div className="max-w-6xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45 }}
                        className="rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-6 sm:p-8 lg:p-10"
                    >
                        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-start">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-5">
                                    <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15">
                                        <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
                                        NOVO: LIGACOES NO CRM
                                    </Badge>
                                    <Badge variant="secondary" className="bg-white/5 text-white/80 border border-white/10">
                                        Add-on para Plus e Pro
                                    </Badge>
                                </div>

                                <h2
                                    className="text-white mb-4"
                                    style={{
                                        fontWeight: "var(--fw-extrabold)",
                                        fontSize: "clamp(1.7rem, 3.8vw, 2.35rem)",
                                        lineHeight: "var(--lh-tight)",
                                        letterSpacing: "var(--ls-snug)"
                                    }}
                                >
                                    Ligue sem sair do deal.
                                    <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                        Registre tudo. Venda melhor.
                                    </span>
                                </h2>

                                <p className="text-slate-300/90 max-w-xl mb-6" style={{ fontSize: "1.05rem" }}>
                                    O vendedor liga dentro da plataforma e o historico fica no proprio CRM. Gravacao, contexto da conversa e transcricao no deal para ninguem depender de memoria ou anotacoes soltas.
                                </p>

                                <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 max-w-xl">
                                    <p className="text-[11px] uppercase tracking-wider text-emerald-300 mb-1" style={{ fontWeight: "var(--fw-semibold)" }}>
                                        Como funciona o add-on
                                    </p>
                                    <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
                                        Ligações é uma contratação opcional (cobrada à parte) para empresas nos planos Plus e Pro.
                                        Você ativa por empresa e adiciona minutos conforme a operação.
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3 mb-7">
                                    {[
                                        {
                                            icon: PhoneCall,
                                            title: "Clique para ligar",
                                            desc: "Chamada iniciada direto do card do lead ou deal."
                                        },
                                        {
                                            icon: MessageCircle,
                                            title: "Transcricao no historico",
                                            desc: "Conversa salva no deal para consulta e follow-up."
                                        },
                                        {
                                            icon: Target,
                                            title: "Mais previsibilidade",
                                            desc: "Gestor acompanha volume, evolucao e qualidade."
                                        },
                                        {
                                            icon: Sparkles,
                                            title: "Insights sob demanda",
                                            desc: "Opcional por botao, sem travar o fluxo do vendedor."
                                        }
                                    ].map(({ icon: Icon, title, desc }) => (
                                        <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
                                                    <Icon className="h-4 w-4 text-emerald-300" />
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm mb-1" style={{ fontWeight: "var(--fw-semibold)" }}>{title}</p>
                                                    <p className="text-white/55 text-xs leading-relaxed">{desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        onClick={() => scrollToSection("pricing")}
                                        className="h-11 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-0"
                                    >
                                        Ver planos com Ligacoes
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                    <Button
                                        onClick={() => goToRegister("plus")}
                                        variant="outline"
                                        className="h-11 px-5 border-white/15 bg-white/0 hover:bg-white/5 text-white"
                                    >
                                        Testar no plano Plus
                                    </Button>
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, x: 16 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: 0.06 }}
                                className="relative"
                            >
                                <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl opacity-60 pointer-events-none" />

                                <div className="relative rounded-3xl border border-emerald-400/15 bg-slate-950/85 p-4 sm:p-5 shadow-[0_20px_70px_-30px_rgba(16,185,129,0.35)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-white text-sm" style={{ fontWeight: "var(--fw-semibold)" }}>Ligacoes no Deal</p>
                                            <p className="text-white/45 text-xs">Tudo no mesmo contexto da negociacao</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-emerald-300 text-xs">Ao vivo</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <p className="text-white text-sm" style={{ fontWeight: "var(--fw-semibold)" }}>Lead: Clinica Horizonte</p>
                                                <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-400/20">Deal #A12</Badge>
                                            </div>
                                            <p className="text-white/55 text-xs mb-3">Etapa: Proposta enviada • Ultimo contato: ontem, 17:42</p>
                                            <div className="flex flex-wrap gap-2">
                                                <div className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold inline-flex items-center">
                                                    <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
                                                    Ligar agora
                                                </div>
                                                <div className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/75 text-xs font-semibold inline-flex items-center">
                                                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                                                    Ver historico
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-white text-sm" style={{ fontWeight: "var(--fw-semibold)" }}>Chamada concluida • 08:31</p>
                                                <span className="text-emerald-300 text-xs">Gravacao salva</span>
                                            </div>
                                            <p className="text-white/65 text-xs leading-relaxed">
                                                Transcricao vinculada ao deal. Proxima acao sugerida pode ser gerada por botao, somente quando fizer sentido.
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-white text-sm" style={{ fontWeight: "var(--fw-semibold)" }}>O que seu time ganha</p>
                                                <Sparkles className="h-4 w-4 text-emerald-300" />
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    "Menos perda de contexto entre vendedores e gestores",
                                                    "Follow-up mais rapido porque a conversa ja esta no CRM",
                                                    "Evolucao de abordagem comercial com base em chamadas reais"
                                                ].map((item) => (
                                                    <div key={item} className="flex items-start gap-2 text-xs text-white/70">
                                                        <Check className="h-3.5 w-3.5 text-emerald-300 mt-0.5 shrink-0" />
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Pricing Section ───────────────────────────────────────────── */}
            <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 60%)", filter: "blur(80px)" }} />
                {/* Subtle dot grid */}
                <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
                    style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

                <div className="max-w-5xl mx-auto relative z-10">

                    {/* Header */}
                    <motion.div className="text-center mb-14"
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.5 }}>

                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 rounded-full px-4 py-1.5 mb-5"
                            style={{ letterSpacing: "var(--ls-widest)", fontWeight: "var(--fw-semibold)" }}>
                            <Zap className="h-3 w-3" />
                            PLANOS E PREÇOS
                        </span>

                        <h2 className="text-white mb-4"
                            style={{ fontWeight: "var(--fw-extrabold)", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: "var(--lh-tight)", letterSpacing: "var(--ls-snug)" }}>
                            Investimento que se{" "}
                            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                multiplica
                            </span>
                        </h2>

                        <p className="text-gray-400 max-w-xl mx-auto mb-8" style={{ fontSize: "1.0625rem" }}>
                            Retorno médio de <strong className="text-white">12× o valor investido</strong>. Sem surpresas, sem taxas escondidas.
                        </p>

                        {/* Billing toggle */}
                        <div className="inline-flex gap-1 p-1 rounded-2xl border border-white/6"
                            style={{ background: "rgba(15,23,42,0.85)" }}>
                            {([false, true] as const).map((annual) => (
                                <button key={String(annual)} onClick={() => setIsAnnual(annual)}
                                    className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all duration-200 ${isAnnual === annual ? "text-white" : "text-white/35 hover:text-white/55"}`}
                                    style={{ fontWeight: "var(--fw-semibold)" }}>
                                    {isAnnual === annual && (
                                        <motion.div layoutId="billing-pill"
                                            className="absolute inset-0 rounded-xl border border-white/8"
                                            style={{ background: "rgba(30,41,59,0.9)" }}
                                            transition={{ type: "spring", bounce: 0.18, duration: 0.38 }} />
                                    )}
                                    <span className="relative">{annual ? "Anual" : "Mensal"}</span>
                                    {annual && (
                                        <span className="relative text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full"
                                            style={{ fontWeight: "var(--fw-bold)" }}>
                                            −10%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Cards grid — popular shown first on mobile via order */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-end">
                        {plans.map((plan, i) => {
                            const monthly = isAnnual ? Math.round(plan.priceNumber * 0.9) : plan.priceNumber;
                            const annualSaving = Math.round((plan.priceNumber - Math.round(plan.priceNumber * 0.9)) * 12);
                            const isPopular = plan.popular;

                            return (
                                <motion.div key={plan.name}
                                    className={`relative flex flex-col ${isPopular
                                        ? "order-first md:order-none md:-mt-7 pt-8 md:pt-0"
                                        : ""
                                        }`}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.45 }}
                                    whileHover={{ y: -6, transition: { duration: 0.2 } }}>

                                    {/* Popular badge */}
                                    {isPopular && (
                                        <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
                                            <span className="inline-flex items-center gap-1.5 text-[10px] px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/25"
                                                style={{
                                                    background: "linear-gradient(135deg, #10b981, #0d9488)",
                                                    color: "white",
                                                    fontWeight: "var(--fw-bold)",
                                                    letterSpacing: "var(--ls-wide)"
                                                }}>
                                                <Zap className="h-2.5 w-2.5" fill="currentColor" />
                                                MAIS POPULAR
                                            </span>
                                        </div>
                                    )}

                                    {/* Card */}
                                    <div className="relative flex flex-col flex-1 rounded-2xl border overflow-hidden"
                                        style={{
                                            background: isPopular
                                                ? "linear-gradient(155deg, rgba(16,185,129,0.07) 0%, rgba(13,21,38,0.97) 55%)"
                                                : "rgba(15,23,42,0.55)",
                                            borderColor: isPopular
                                                ? "rgba(16,185,129,0.28)"
                                                : "rgba(255,255,255,0.05)",
                                            boxShadow: isPopular
                                                ? "0 0 0 1px rgba(16,185,129,0.06), 0 24px 64px rgba(16,185,129,0.1)"
                                                : "0 1px 2px rgba(0,0,0,0.4)",
                                        }}>
                                        {/* Decorative top gradient line (popular only) */}
                                        {isPopular && (
                                            <div className="absolute top-0 inset-x-0 h-px"
                                                style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.55) 35%, rgba(20,184,166,0.45) 65%, transparent)" }} />
                                        )}
                                        <div className="p-5 sm:p-7 flex flex-col flex-1">

                                            {/* Plan name + tagline */}
                                            <div className="mb-5">
                                                <p className="text-xs mb-0.5"
                                                    style={{ color: isPopular ? "#10b981" : "rgba(255,255,255,0.28)", fontWeight: "var(--fw-bold)", letterSpacing: "var(--ls-widest)" }}>
                                                    {plan.name.toUpperCase()}
                                                </p>
                                                <p className="text-white/38 text-sm leading-snug">{plan.tagline}</p>
                                            </div>

                                            {/* Price */}
                                            <div className="mb-1">
                                                <motion.div key={monthly}
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.22 }}
                                                    className="flex items-end gap-1">
                                                    <span className="text-white/38 text-base leading-none mb-1.5"
                                                        style={{ fontWeight: "var(--fw-medium)" }}>R$</span>
                                                    <span className="text-white leading-none tabular-nums"
                                                        style={{
                                                            fontWeight: "var(--fw-extrabold)",
                                                            fontSize: isPopular
                                                                ? "clamp(2.4rem, 8vw, 3.25rem)"
                                                                : "clamp(2rem, 7vw, 2.5rem)"
                                                        }}>
                                                        {monthly}
                                                    </span>
                                                    <span className="text-white/32 text-sm leading-none mb-1.5">/mês</span>
                                                </motion.div>
                                            </div>

                                            {/* Annual savings / info line */}
                                            <div className="min-h-[34px] mb-5">
                                                {isAnnual ? (
                                                    <motion.div key="annual-info"
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                                                        className="flex items-center gap-2 flex-wrap mt-1">
                                                        <span className="text-[11px] text-white/27">
                                                            Cobrado R$ {Math.round(monthly * 12).toLocaleString("pt-BR")}/ano
                                                        </span>
                                                        {annualSaving > 0 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded"
                                                                style={{
                                                                    background: isPopular ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                                                                    color: isPopular ? "#10b981" : "rgba(255,255,255,0.3)",
                                                                    fontWeight: "var(--fw-semibold)"
                                                                }}>
                                                                Economize R$ {annualSaving.toLocaleString("pt-BR")}
                                                            </span>
                                                        )}
                                                    </motion.div>
                                                ) : (
                                                    <p className="text-[11px] text-white/22 mt-1">Faturado mensalmente</p>
                                                )}
                                                {plan.extraInfo && (
                                                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{plan.extraInfo}</p>
                                                )}
                                            </div>

                                            {/* Divider */}
                                            <div className="h-px mb-5"
                                                style={{ background: isPopular ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)" }} />

                                            {/* Features list */}
                                            <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                                                {plan.features.map((f) => (
                                                    <li key={f} className="flex items-start gap-2.5">
                                                        <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0"
                                                            style={{ background: isPopular ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)" }}>
                                                            <Check className="h-2.5 w-2.5" strokeWidth={3}
                                                                style={{ color: isPopular ? "#10b981" : "rgba(255,255,255,0.38)" }} />
                                                        </div>
                                                        <span className="text-sm leading-snug"
                                                            style={{ color: isPopular ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.45)", fontWeight: "var(--fw-medium)" }}>
                                                            {f}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* CTA */}
                                            {isPopular ? (
                                                <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer"
                                                    className="relative w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm text-white overflow-hidden"
                                                    style={{
                                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                        boxShadow: "0 4px 20px rgba(16,185,129,0.28), 0 1px 4px rgba(0,0,0,0.25)",
                                                        fontWeight: "var(--fw-semibold)"
                                                    }}>
                                                    <motion.span
                                                        className="absolute inset-0 rounded-xl"
                                                        style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)" }}
                                                        animate={{ x: ["-120%", "220%"] }}
                                                        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }} />
                                                    <span className="relative">Começar agora</span>
                                                    <ArrowRight className="relative h-4 w-4" />
                                                </a>
                                            ) : (
                                                <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer"
                                                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm transition-all duration-200"
                                                    style={{
                                                        background: "rgba(255,255,255,0.04)",
                                                        border: "1px solid rgba(255,255,255,0.07)",
                                                        color: "rgba(255,255,255,0.55)",
                                                        fontWeight: "var(--fw-semibold)"
                                                    }}>
                                                    Escolher {plan.name}
                                                    <ArrowRight className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Trust bar */}
                    <motion.div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12"
                        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.55 }}>
                        {[
                            { icon: <Check className="h-3.5 w-3.5" />, label: "Cancele quando quiser" },
                            { icon: <Zap className="h-3.5 w-3.5" />, label: "Setup em 5 minutos" },
                            { icon: <PhoneCall className="h-3.5 w-3.5" />, label: "Ligações (Plus e Pro)" },
                            { icon: <Award className="h-3.5 w-3.5" />, label: "Suporte via WhatsApp" },
                        ].map(({ icon, label }) => (
                            <div key={label} className="flex items-center gap-1.5 text-xs text-white/25"
                                style={{ fontWeight: "var(--fw-medium)" }}>
                                <span className="text-emerald-500/45">{icon}</span>
                                {label}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>




            {/* FAQ Section */}
            <div id="faq">
                <FAQSection />
            </div>
            {/* old FAQ removed — FAQSection component used above */}
            <section className="py-0" style={{ display: 'none' }}>
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-white mb-4 font-serif">
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
                                a: "Com certeza! Oferecemos 7 dias grátis do plano PRO. Teste tudo à vontade e cancele quando quiser."
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
