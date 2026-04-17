import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";
import { motion } from "framer-motion";
import {
    MessageCircle,
    Check,
    ArrowRight,
    Zap,
    Sparkles,
    Target,
    Award,
    PhoneCall,
} from "lucide-react";
import brandLogoDark from "@/assets/logo-dark.png";
import { HeroSection } from "@/components/landing/HeroSection";
import { ImpactMetrics } from "@/components/landing/ImpactMetrics";
import { PainPoints } from "@/components/landing/PainPoints";
import { LandingNav } from "@/components/landing/LandingNav";

const ProductBentoGrid = lazy(() =>
    import("@/components/landing/ProductBentoGrid").then((m) => ({ default: m.ProductBentoGrid }))
);
const HowItWorks = lazy(() =>
    import("@/components/landing/HowItWorks").then((m) => ({ default: m.HowItWorks }))
);
const DemoVideoPlayer = lazy(() =>
    import("@/components/landing/DemoVideoPlayer").then((m) => ({ default: m.DemoVideoPlayer }))
);
const UseCasesSection = lazy(() =>
    import("@/components/landing/UseCasesSection").then((m) => ({ default: m.UseCasesSection }))
);
const EvaAISection = lazy(() =>
    import("@/components/landing/EvaAISection").then((m) => ({ default: m.EvaAISection }))
);
const FAQSection = lazy(() =>
    import("@/components/landing/FAQSection").then((m) => ({ default: m.FAQSection }))
);
const DemoScheduleSection = lazy(() =>
    import("@/components/landing/DemoScheduleSection").then((m) => ({ default: m.DemoScheduleSection }))
);
const FinalCTA = lazy(() =>
    import("@/components/landing/FinalCTA").then((m) => ({ default: m.FinalCTA }))
);

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
};

const PLANS = [
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
        extraInfo: null as string | null,
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
            "Eva — analista de vendas com IA",
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
            "Eva ilimitada + prioridade",
            "Integrações (Hotmart, Stripe)",
            "Ligações + transcrição no deal (add-on)",
            "Multi-empresa",
            "Suporte prioritário",
        ],
        popular: false,
        extraInfo: "+R$ 48,99/vendedor adicional • Melhor custo para add-on de ligações",
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7f7561d2b1174aacb31ab92dce72ded4",
    },
] as const;

const LIGACOES_FEATURES = [
    { icon: PhoneCall, title: "Clique para ligar", desc: "Chamada direto do card do lead ou deal." },
    { icon: MessageCircle, title: "Transcrição no histórico", desc: "Conversa salva no deal para follow-up." },
    { icon: Target, title: "Mais previsibilidade", desc: "Gestor acompanha volume e qualidade." },
    { icon: Sparkles, title: "Insights sob demanda", desc: "Opcional por botão, sem travar o fluxo." },
] as const;

const TRUST_ITEMS = [
    { icon: <Check className="h-3.5 w-3.5" />, label: "Cancele quando quiser" },
    { icon: <Zap className="h-3.5 w-3.5" />, label: "Setup em 5 minutos" },
    { icon: <PhoneCall className="h-3.5 w-3.5" />, label: "Ligações (Plus e Pro)" },
    { icon: <Award className="h-3.5 w-3.5" />, label: "Suporte via WhatsApp" },
];

const preloadOnboarding = () => import("@/pages/Onboarding");

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        trackEvent(FUNNEL_EVENTS.LANDING_VIEW);
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    const [isAnnual, setIsAnnual] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const goToRegister = (planId?: string) => {
        const plan = planId || "plus";
        setSelectedPlan(plan);
        setIsNavigating(true);
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { plan });
        preloadOnboarding();
        navigate(`/onboarding?plan=${plan}`);
    };

    return (
        <div className="min-h-screen w-full bg-white text-gray-900 selection:bg-emerald-500/30">
            {isNavigating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ background: "#06080a" }}
                >
                    <div className="flex flex-col items-center gap-8 px-4">
                        <motion.img
                            src={brandLogoDark}
                            alt="Vyzon"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="h-10"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-center"
                        >
                            <p
                                className="font-heading text-lg mb-1"
                                style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, letterSpacing: "-0.02em" }}
                            >
                                Preparando seu plano {selectedPlan?.charAt(0).toUpperCase()}{selectedPlan?.slice(1)}
                            </p>
                            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                                Isso leva apenas alguns segundos
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="w-48 h-0.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                        >
                            <motion.div
                                className="h-full rounded-full bg-emerald-500"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.8, ease: "easeInOut" }}
                            />
                        </motion.div>
                    </div>
                </motion.div>
            )}

            <LandingNav
                onCTAClick={() => scrollToSection("agendar-demo")}
                onLoginClick={() => navigate("/auth")}
            />

            <HeroSection
                onCTAClick={() => scrollToSection("pricing")}
                onDemoClick={() => scrollToSection("demo")}
                onScheduleDemoClick={() => scrollToSection("agendar-demo")}
                onLoginClick={() => navigate("/auth")}
            />

            <ImpactMetrics />

            <PainPoints />

            <Suspense fallback={null}>
                <ProductBentoGrid />

                <DemoScheduleSection />

                <div id="how-it-works">
                    <HowItWorks />
                </div>

                <DemoVideoPlayer />

                <div id="use-cases">
                    <UseCasesSection />
                </div>

                <section className="py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-14"
                        >
                            <span
                                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                                style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                            >
                                <PhoneCall className="h-3 w-3" />
                                LIGAÇÕES NO CRM
                            </span>

                            <h2
                                className="font-heading mb-4"
                                style={{ fontWeight: "var(--fw-bold)", fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}
                            >
                                Ligue sem sair do deal.{" "}
                                <span className="text-emerald-400">Registre tudo.</span>
                            </h2>

                            <p className="max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.4)" }}>
                                O vendedor liga dentro da plataforma e o histórico fica no CRM.
                                Gravação e transcrição no deal — sem depender de memória.
                            </p>
                        </motion.div>

                        <div className="grid sm:grid-cols-2 gap-4 mb-10">
                            {LIGACOES_FEATURES.map(({ icon: Icon, title, desc }) => (
                                <motion.div
                                    key={title}
                                    className="flex items-start gap-4 rounded-xl p-5"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.1)" }}>
                                        <Icon className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm mb-1" style={{ fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{title}</p>
                                        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="text-center">
                            <p className="text-xs mb-4" style={{ fontWeight: 500, color: "rgba(255,255,255,0.35)" }}>
                                Add-on disponível para planos Plus e Pro
                            </p>
                            <button
                                onClick={() => scrollToSection("pricing")}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-white"
                                style={{ background: "linear-gradient(135deg, #10b981, #059669)", fontWeight: 600 }}
                            >
                                Ver planos com Ligações
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>

                <EvaAISection onCTAClick={() => scrollToSection("pricing")} />

                <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: "#06080a" }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.1) 0%, transparent 60%)", filter: "blur(80px)" }} />
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

                    <div className="max-w-5xl mx-auto relative z-10">
                        <motion.div className="text-center mb-14"
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ duration: 0.5 }}>

                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                                style={{ letterSpacing: "var(--ls-widest)", fontWeight: "var(--fw-semibold)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <Zap className="h-3 w-3" />
                                PLANOS E PREÇOS
                            </span>

                            <h2 className="font-heading mb-4"
                                style={{ fontWeight: "var(--fw-bold)", fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}>
                                Investimento que se{" "}
                                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                                    multiplica
                                </span>
                            </h2>

                            <p className="max-w-xl mx-auto mb-8" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
                                Retorno médio de <strong style={{ color: "rgba(255,255,255,0.85)" }}>12× o valor investido</strong>. Sem surpresas, sem taxas escondidas.
                            </p>

                            <div className="inline-flex gap-1 p-1 rounded-2xl"
                                style={{ background: "rgba(255,255,255,0.04)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}>
                                {([false, true] as const).map((annual) => (
                                    <button key={String(annual)} onClick={() => setIsAnnual(annual)}
                                        className="relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all duration-200"
                                        style={{ fontWeight: "var(--fw-semibold)", color: isAnnual === annual ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)" }}>
                                        {isAnnual === annual && (
                                            <motion.div layoutId="billing-pill"
                                                className="absolute inset-0 rounded-xl"
                                                style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }}
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-end">
                            {PLANS.map((plan, i) => {
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

                                        <div className="relative flex flex-col flex-1 rounded-2xl overflow-hidden"
                                            style={{
                                                background: isPopular
                                                    ? "linear-gradient(155deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.04) 55%)"
                                                    : "rgba(255,255,255,0.03)",
                                                border: "none",
                                                boxShadow: isPopular
                                                    ? "0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px rgba(16,185,129,0.1), 0 32px 72px -12px rgba(16,185,129,0.15)"
                                                    : "0 0 0 1px rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)",
                                            }}>
                                            {isPopular && (
                                                <div className="absolute top-0 inset-x-0 h-px"
                                                    style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.55) 35%, rgba(20,184,166,0.45) 65%, transparent)" }} />
                                            )}
                                            <div className="p-5 sm:p-7 flex flex-col flex-1">

                                                <div className="mb-5">
                                                    <p className="text-xs mb-0.5"
                                                        style={{ color: isPopular ? "#34d399" : "rgba(255,255,255,0.4)", fontWeight: "var(--fw-bold)", letterSpacing: "var(--ls-widest)" }}>
                                                        {plan.name.toUpperCase()}
                                                    </p>
                                                    <p className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.4)" }}>{plan.tagline}</p>
                                                </div>

                                                <div className="mb-1">
                                                    <motion.div key={monthly}
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.22 }}
                                                        className="flex items-end gap-1">
                                                        <span className="text-base leading-none mb-1.5"
                                                            style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.4)" }}>R$</span>
                                                        <span className="leading-none tabular-nums"
                                                            style={{
                                                                fontWeight: "var(--fw-extrabold)",
                                                                color: "rgba(255,255,255,0.95)",
                                                                fontSize: isPopular
                                                                    ? "clamp(2.4rem, 8vw, 3.25rem)"
                                                                    : "clamp(2rem, 7vw, 2.5rem)"
                                                            }}>
                                                            {monthly}
                                                        </span>
                                                        <span className="text-sm leading-none mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>/mês</span>
                                                    </motion.div>
                                                </div>

                                                <div className="min-h-[34px] mb-5">
                                                    {isAnnual ? (
                                                        <motion.div key="annual-info"
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                                                            className="flex items-center gap-2 flex-wrap mt-1">
                                                            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                                                                Cobrado R$ {Math.round(monthly * 12).toLocaleString("pt-BR")}/ano
                                                            </span>
                                                            {annualSaving > 0 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded"
                                                                    style={{
                                                                        background: isPopular ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                                                                        color: isPopular ? "#34d399" : "rgba(255,255,255,0.5)",
                                                                        fontWeight: "var(--fw-semibold)"
                                                                    }}>
                                                                    Economize R$ {annualSaving.toLocaleString("pt-BR")}
                                                                </span>
                                                            )}
                                                        </motion.div>
                                                    ) : (
                                                        <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Faturado mensalmente</p>
                                                    )}
                                                    {plan.extraInfo && (
                                                        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{plan.extraInfo}</p>
                                                    )}
                                                </div>

                                                <div className="h-px mb-5"
                                                    style={{ background: isPopular ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)" }} />

                                                <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                                                    {plan.features.map((f) => (
                                                        <li key={f} className="flex items-start gap-2.5">
                                                            <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0"
                                                                style={{ background: isPopular ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)" }}>
                                                                <Check className="h-2.5 w-2.5" strokeWidth={3}
                                                                    style={{ color: isPopular ? "#34d399" : "rgba(255,255,255,0.4)" }} />
                                                            </div>
                                                            <span className="text-sm leading-snug"
                                                                style={{ color: isPopular ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)", fontWeight: "var(--fw-medium)" }}>
                                                                {f}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {isPopular ? (
                                                    <button
                                                        onClick={() => scrollToSection("agendar-demo")}
                                                        className="relative w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm text-white overflow-hidden cursor-pointer"
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
                                                        <span className="relative">Agendar demonstração</span>
                                                        <ArrowRight className="relative h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => scrollToSection("agendar-demo")}
                                                        className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm transition-all duration-200 cursor-pointer"
                                                        style={{
                                                            background: "rgba(255,255,255,0.04)",
                                                            border: "none",
                                                            boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
                                                            color: "rgba(255,255,255,0.7)",
                                                            fontWeight: "var(--fw-semibold)"
                                                        }}>
                                                        Agendar demonstração
                                                        <ArrowRight className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <motion.div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12"
                            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.55 }}>
                            {TRUST_ITEMS.map(({ icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5 text-xs"
                                    style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.35)" }}>
                                    <span className="text-emerald-500/50">{icon}</span>
                                    {label}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                <div id="faq">
                    <FAQSection />
                </div>

                <FinalCTA onCTAClick={() => goToRegister("pro")} onScheduleDemoClick={() => scrollToSection("agendar-demo")} />
            </Suspense>

            <footer className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <img src={brandLogoDark} alt="Vyzon" className="h-8 mb-4" />
                            <p className="text-gray-500 text-sm leading-relaxed max-w-[220px]">
                                CRM gamificado para times de vendas que querem bater meta todo mês.
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Produto</p>
                            <div className="flex flex-col gap-2.5">
                                <button onClick={() => scrollToSection("features")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Funcionalidades</button>
                                <button onClick={() => scrollToSection("how-it-works")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Como funciona</button>
                                <button onClick={() => scrollToSection("pricing")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Preços</button>
                                <button onClick={() => scrollToSection("faq")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">FAQ</button>
                            </div>
                        </div>

                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Legal</p>
                            <div className="flex flex-col gap-2.5">
                                <a href="/politica-privacidade" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Privacidade</a>
                                <a href="/termos-de-servico" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">Termos de Serviço</a>
                            </div>
                        </div>

                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-4" style={{ fontWeight: 600 }}>Conta</p>
                            <div className="flex flex-col gap-2.5">
                                <button onClick={() => navigate("/auth")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Login</button>
                                <button onClick={() => goToRegister("plus")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors text-left">Criar conta</button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-center text-sm text-gray-600">
                            © {new Date().getFullYear()} Vyzon. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
