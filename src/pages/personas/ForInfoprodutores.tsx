import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Calendar,
    Check,
    Zap,
    CreditCard,
    MessageCircle,
    RefreshCw,
    Trophy,
    Webhook,
    Rocket,
    Flame,
    Infinity as InfinityIcon,
    ShoppingCart,
    AlertTriangle,
    FileText,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";

const FinalCTA = lazy(() =>
    import("@/components/landing/FinalCTA").then((m) => ({ default: m.FinalCTA }))
);

// ─── Data ────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
    {
        icon: FileText,
        title: "Você fatura todo dia e não sabe quem fechou.",
        body: "Lead entra pela Kiwify, venda sobe na Hotmart, assinatura renova no Stripe. Fim do mês você abre quatro planilhas pra entender o que aconteceu.",
    },
    {
        icon: CreditCard,
        title: "Boleto em aberto virou e-mail perdido.",
        body: "Cartão recusado, boleto vencido, PIX não pago. Cada um numa aba diferente. Quando você lembra de recuperar, já foi.",
    },
    {
        icon: RefreshCw,
        title: "Esteira de recorrência mora no WhatsApp do vendedor.",
        body: "Upsell, downsell, renovação, recompra — tudo no privado. Se o vendedor sair, a esteira vai junto.",
    },
] as const;

const FLOW_STEPS = [
    { label: "Checkout aprova", detail: "Hotmart, Kiwify ou Greenn" },
    { label: "Webhook cai no Vyzon", detail: "Em segundos, sem Zapier" },
    { label: "Deal entra no pipeline", detail: "Na etapa certa do produto" },
    { label: "Ranking sobe na tela", detail: "Vendedor vê antes do café" },
    { label: "Eva faz o follow-up", detail: "WhatsApp automático, já pronto" },
] as const;

const FEATURES = [
    {
        icon: Webhook,
        title: "Webhook nativo Hotmart / Kiwify / Greenn",
        body: "Cola a URL no produtor, pronto. Sem código, sem integrador, sem Zapier no meio cobrando assinatura.",
    },
    {
        icon: ShoppingCart,
        title: "Pipeline por esteira de produto",
        body: "Lançamento, perpétuo e high-ticket têm etapas próprias. Configura uma vez, funciona pra toda campanha.",
    },
    {
        icon: AlertTriangle,
        title: "Abandono de carrinho como estágio",
        body: "Boleto vencido, cartão recusado e PIX não pago viram deals ativos. Cada um com prazo pra recuperar antes do lead esfriar.",
    },
    {
        icon: MessageCircle,
        title: "Recuperação via Eva no WhatsApp",
        body: "Eva identifica o abandono, escreve a mensagem no seu tom e sugere o horário. Vendedor aprova e dispara.",
    },
    {
        icon: RefreshCw,
        title: "Gestão de assinaturas e churn",
        body: "Alerta quando a próxima mensalidade vai falhar. Retenção vira deal, não vira surpresa no fim do mês.",
    },
    {
        icon: Trophy,
        title: "Ranking por produto, não por total",
        body: "Veja quem vende mais do Lançamento A vs B, do perpétuo vs high-ticket. Direciona comissão pro que performa.",
    },
] as const;

const SCENARIOS = [
    {
        icon: Rocket,
        tag: "Lançamento",
        duration: "5 a 14 dias",
        title: "Pico de leads em 48h, equipe dormindo.",
        body: "Aquecimento dispara tráfego, inscritos sobem exponencial. Eva qualifica 24/7, vendedor pega só o lead aquecido. Pipeline de lançamento reseta limpo pra próxima campanha.",
        bullets: [
            "Pipeline com etapas de aquecimento → carrinho → fechamento",
            "Eva responde inscritos enquanto o time dorme",
            "Ranking diário com meta da turma",
        ],
    },
    {
        icon: Flame,
        tag: "Perpétuo High-Ticket",
        duration: "Todo mês",
        title: "Lead chega quente, call fecha o jogo.",
        body: "Ads trazem lead, Eva aquece no WhatsApp, pipeline separa por temperatura (Frio / Morno / Quente). Vendedor agenda a call dentro do CRM, transcrição volta pro deal — objeção fica registrada.",
        bullets: [
            "Pipeline por temperatura do lead",
            "Agendamento de call no próprio deal",
            "Gravação + transcrição automática",
        ],
    },
    {
        icon: InfinityIcon,
        tag: "Esteira de Recorrência",
        duration: "Contínuo",
        title: "Assinante não some, ele sobe de produto.",
        body: "Assinatura entra, trigger de upsell dispara no mês 2. Quem recompra pula etapas. Quem vai churn vira deal de retenção antes da cobrança falhar.",
        bullets: [
            "Trigger de upsell por tempo de assinatura",
            "Alerta pré-falha de cobrança",
            "Retenção como estágio ativo",
        ],
    },
] as const;

const INTEGRATIONS = [
    { name: "Hotmart", highlight: true },
    { name: "Kiwify", highlight: true },
    { name: "Greenn", highlight: true },
    { name: "Eduzz", highlight: false },
    { name: "Mercado Pago", highlight: false },
    { name: "Stripe", highlight: false },
    { name: "WhatsApp", highlight: false },
    { name: "Webhook próprio", highlight: false },
] as const;

const FAQ = [
    {
        q: "Conecta com Hotmart, Kiwify e Greenn sem código?",
        a: "Sim. Cada uma tem webhook nativo dentro do Vyzon. Você copia a URL, cola no produtor e a primeira venda já cai no pipeline. Setup médio: 5 minutos por plataforma.",
    },
    {
        q: "E se eu vendo em três plataformas ao mesmo tempo?",
        a: "Todas as vendas caem no mesmo painel, com a origem marcada no deal. Filtra por plataforma, por produto ou por vendedor. Ranking consolidado, relatório separado quando você quiser.",
    },
    {
        q: "Funciona pra lançamento-relâmpago de 3 a 5 dias?",
        a: "Funciona. O setup é em minutos e o pipeline de lançamento já vem pronto — aquecimento, carrinho, fechamento. Depois do lançamento, basta duplicar pra próxima campanha.",
    },
    {
        q: "Como ficam boletos em aberto e PIX não pago?",
        a: "Entram como estágio ativo do pipeline, com prazo pra recuperar. Eva sugere o follow-up no WhatsApp e o vendedor só aprova e dispara. Nada se perde num relatório esquecido.",
    },
    {
        q: "Já uso outro CRM. Dá pra migrar sem parar a operação?",
        a: "Dá. Import via CSV ou API, e a gente acompanha no setup. Durante a migração os dois rodam em paralelo — nenhuma venda some no caminho.",
    },
    {
        q: "Tem plano pra quem ainda está validando?",
        a: "Sim. Starter R$147/mês cobre 1 vendedor + admin com pipeline, metas e ranking básico. Upgrade quando o time cresce — sem migração, sem surpresa.",
    },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ForInfoprodutores() {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Vyzon para Infoprodutores | CRM com Hotmart, Kiwify e Greenn nativo";
        trackEvent("persona_page_view", { persona: "infoprodutores" });

        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.setAttribute(
                "content",
                "CRM feito pra infoprodutor: webhook Hotmart/Kiwify/Greenn, pipeline por esteira, recuperação de boleto no WhatsApp e ranking por produto. 14 dias grátis."
            );
        }
    }, []);

    const handlePrimary = () => {
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { source: "persona_infoprodutores", cta: "trial" });
        navigate("/onboarding?plan=pro");
    };

    const handleSecondary = () => {
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { source: "persona_infoprodutores", cta: "demo" });
        navigate("/#agendar-demo");
    };

    const handleLogin = () => {
        navigate("/auth");
    };

    return (
        <div className="min-h-screen" style={{ background: "#06080a", color: "rgba(255,255,255,0.95)" }}>
            <LandingNav
                onCTAClick={handleSecondary}
                onLoginClick={handleLogin}
            />

            {/* ─── HERO ───────────────────────────────────────────────── */}
            <section className="relative overflow-hidden" style={{ background: "#06080a" }}>
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute inset-x-0 top-0 h-[700px]"
                        style={{
                            background:
                                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.08) 30%, transparent 65%)",
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.025]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                            backgroundSize: "80px 80px",
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="pt-32 sm:pt-40 pb-20 text-center">
                        <span
                            className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-6"
                            style={{
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                background: "rgba(16,185,129,0.1)",
                                border: "1px solid rgba(16,185,129,0.2)",
                            }}
                        >
                            PARA INFOPRODUTORES
                        </span>

                        <h1
                            className="font-heading mx-auto"
                            style={{
                                fontSize: "clamp(2.25rem, 6.5vw, 4.25rem)",
                                lineHeight: 1.05,
                                letterSpacing: "-0.04em",
                                maxWidth: "860px",
                            }}
                        >
                            <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                                O CRM que entende como você{" "}
                            </span>
                            <span
                                style={{
                                    fontWeight: 900,
                                    background: "linear-gradient(135deg, #34d399, #10b981, #14b8a6)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                vende infoproduto.
                            </span>
                        </h1>

                        <p
                            className="mt-6 mx-auto max-w-2xl"
                            style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", lineHeight: 1.7, color: "rgba(255,255,255,0.7)" }}
                        >
                            Sua venda do checkout já cai no pipeline. A esteira já tem estágio. O ranking já sobe.
                            Sem planilha, sem copia-e-cola, sem depender do Zapier pra mandar lead pro WhatsApp.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-10 w-full max-w-md mx-auto sm:max-w-none">
                            <a
                                href="/onboarding?plan=pro"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handlePrimary();
                                }}
                                className="group relative inline-flex h-12 items-center justify-center gap-2 px-7 text-[15px] font-bold text-white rounded-xl overflow-hidden no-underline"
                                style={{
                                    background: "linear-gradient(135deg, #10b981, #059669)",
                                    boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.3)",
                                }}
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <Zap className="relative h-4 w-4" strokeWidth={2} />
                                <span className="relative">Começar 14 dias grátis</span>
                                <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                            </a>

                            <a
                                href="/#agendar-demo"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSecondary();
                                }}
                                className="group inline-flex h-12 items-center justify-center gap-2 px-7 rounded-xl text-[15px] no-underline"
                                style={{
                                    color: "rgba(255,255,255,0.85)",
                                    background: "rgba(255,255,255,0.04)",
                                    boxShadow: "0 0 0 1px rgba(255,255,255,0.16)",
                                    fontWeight: 600,
                                }}
                            >
                                <Calendar className="h-4 w-4 transition-colors group-hover:text-emerald-300" strokeWidth={2} />
                                Agendar demonstração
                            </a>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-12">
                            {["Hotmart, Kiwify e Greenn nativos", "Pronto em 5 minutos", "Sem cartão pra testar"].map((t) => (
                                <span
                                    key={t}
                                    className="flex items-center gap-1.5 text-[13px]"
                                    style={{ color: "rgba(255,255,255,0.6)" }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div
                    className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, transparent, #06080a)" }}
                />
            </section>

            {/* ─── PAIN POINTS ─────────────────────────────────────────── */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <span
                            className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                            style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            O PROBLEMA
                        </span>
                        <h2
                            className="font-heading"
                            style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                        >
                            CRM genérico não <span className="text-emerald-400">entende</span> seu negócio.
                        </h2>
                        <p className="mt-4 max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
                            Pipedrive, HubSpot e RD servem pra quem vende enterprise. Infoproduto tem um ritmo diferente — e um sistema que não olha pra isso te custa dinheiro todo mês.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {PAIN_POINTS.map((p) => {
                            const Icon = p.icon;
                            return (
                                <motion.div
                                    key={p.title}
                                    initial={{ y: 16 }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4 }}
                                    className="rounded-2xl p-6"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                                    >
                                        <Icon className="h-5 w-5" style={{ color: "#f87171" }} strokeWidth={2} />
                                    </div>
                                    <h3
                                        className="font-heading mb-3"
                                        style={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.3, letterSpacing: "-0.02em" }}
                                    >
                                        {p.title}
                                    </h3>
                                    <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
                                        {p.body}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── FLOW ─────────────────────────────────────────────────── */}
            <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                    }}
                />
                <div className="relative max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span
                            className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                            style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            COMO FUNCIONA
                        </span>
                        <h2
                            className="font-heading"
                            style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                        >
                            Da venda no checkout ao <span className="text-emerald-400">ranking</span>, em segundos.
                        </h2>
                    </div>

                    <div className="relative">
                        {/* Vertical line (desktop only) */}
                        <div
                            className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2"
                            style={{ background: "linear-gradient(to bottom, transparent, rgba(16,185,129,0.3), transparent)" }}
                        />

                        <ol className="space-y-4 md:space-y-8">
                            {FLOW_STEPS.map((step, i) => (
                                <motion.li
                                    key={step.label}
                                    initial={{ y: 12 }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.35, delay: i * 0.05 }}
                                    className={`flex items-center gap-4 md:gap-6 ${
                                        i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse md:text-right"
                                    }`}
                                >
                                    <div className="md:w-[46%]">
                                        <div
                                            className="rounded-2xl p-5 md:p-6"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            <h3
                                                className="font-heading mb-1"
                                                style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}
                                            >
                                                {step.label}
                                            </h3>
                                            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
                                                {step.detail}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 relative z-10">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-heading"
                                            style={{
                                                background: "linear-gradient(135deg, #10b981, #059669)",
                                                boxShadow: "0 0 0 4px #06080a, 0 0 0 5px rgba(16,185,129,0.3)",
                                                fontWeight: 700,
                                                fontSize: "0.95rem",
                                            }}
                                        >
                                            {i + 1}
                                        </div>
                                    </div>
                                    <div className="hidden md:block md:w-[46%]" />
                                </motion.li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* ─── FEATURES ────────────────────────────────────────────── */}
            <section className="relative py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <span
                            className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                            style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            FEITO PRA VOCÊ
                        </span>
                        <h2
                            className="font-heading"
                            style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                        >
                            O que só um CRM <span className="text-emerald-400">de infoproduto</span> tem.
                        </h2>
                        <p className="mt-4 max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
                            Cada uma dessas features é atrito que um CRM genérico te obriga a contornar. Aqui, vem de fábrica.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map((f) => {
                            const Icon = f.icon;
                            return (
                                <motion.div
                                    key={f.title}
                                    initial={{ y: 16 }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.35 }}
                                    className="rounded-2xl p-6"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                                        style={{
                                            background: "rgba(16,185,129,0.1)",
                                            border: "1px solid rgba(16,185,129,0.2)",
                                        }}
                                    >
                                        <Icon className="h-5 w-5 text-emerald-400" strokeWidth={2} />
                                    </div>
                                    <h3
                                        className="font-heading mb-2"
                                        style={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3, letterSpacing: "-0.02em" }}
                                    >
                                        {f.title}
                                    </h3>
                                    <p style={{ fontSize: "0.925rem", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
                                        {f.body}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SCENARIOS ───────────────────────────────────────────── */}
            <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)",
                    }}
                />
                <div className="relative max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span
                            className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                            style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            TRÊS CENÁRIOS
                        </span>
                        <h2
                            className="font-heading"
                            style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                        >
                            Funciona do <span className="text-emerald-400">seu jeito</span> de vender.
                        </h2>
                        <p className="mt-4 max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
                            Lançamento explosivo, perpétuo que não para ou esteira que reciclam assinantes. Os três rodam no mesmo painel.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {SCENARIOS.map((s) => {
                            const Icon = s.icon;
                            return (
                                <motion.div
                                    key={s.tag}
                                    initial={{ y: 16 }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4 }}
                                    className="rounded-2xl p-7 relative overflow-hidden"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-5">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{
                                                background: "rgba(16,185,129,0.12)",
                                                border: "1px solid rgba(16,185,129,0.25)",
                                            }}
                                        >
                                            <Icon className="h-5 w-5 text-emerald-400" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <div
                                                className="text-[11px] text-emerald-400"
                                                style={{ fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
                                            >
                                                {s.tag}
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{s.duration}</div>
                                        </div>
                                    </div>

                                    <h3
                                        className="font-heading mb-3"
                                        style={{ fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.3, letterSpacing: "-0.02em" }}
                                    >
                                        {s.title}
                                    </h3>
                                    <p className="mb-5" style={{ fontSize: "0.925rem", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
                                        {s.body}
                                    </p>

                                    <ul className="space-y-2">
                                        {s.bullets.map((b) => (
                                            <li key={b} className="flex items-start gap-2">
                                                <div
                                                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                                    style={{ background: "rgba(16,185,129,0.15)" }}
                                                >
                                                    <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
                                                </div>
                                                <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.65)" }}>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── INTEGRATIONS ────────────────────────────────────────── */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                <div className="max-w-4xl mx-auto text-center">
                    <span
                        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                    >
                        INTEGRAÇÕES
                    </span>
                    <h2
                        className="font-heading mb-4"
                        style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                    >
                        Conecta com <span className="text-emerald-400">tudo que você já usa</span>.
                    </h2>
                    <p className="mb-12 max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
                        Webhook nativo nas três plataformas que dominam o mercado BR. Demais vêm por webhook genérico ou API.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {INTEGRATIONS.map((i) => (
                            <span
                                key={i.name}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5"
                                style={{
                                    background: i.highlight ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${i.highlight ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`,
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    color: i.highlight ? "rgba(16,185,129,0.95)" : "rgba(255,255,255,0.75)",
                                }}
                            >
                                {i.highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                {i.name}
                            </span>
                        ))}
                    </div>

                    <p className="mt-10 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Não tá aqui? Webhook próprio funciona com qualquer plataforma que dispare HTTP.
                    </p>
                </div>
            </section>

            {/* ─── FAQ ─────────────────────────────────────────────────── */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <span
                            className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                            style={{ fontWeight: 600, letterSpacing: "0.08em", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                            PERGUNTAS COMUNS
                        </span>
                        <h2
                            className="font-heading"
                            style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                        >
                            Dúvidas de quem <span className="text-emerald-400">vende todo dia</span>.
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {FAQ.map((item) => (
                            <details
                                key={item.q}
                                className="group rounded-2xl px-6 py-5"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                <summary
                                    className="cursor-pointer list-none flex items-start justify-between gap-4"
                                    style={{ fontWeight: 600, fontSize: "1.0125rem", color: "rgba(255,255,255,0.9)" }}
                                >
                                    {item.q}
                                    <span
                                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform group-open:rotate-45"
                                        style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", fontWeight: 700 }}
                                    >
                                        +
                                    </span>
                                </summary>
                                <p
                                    className="mt-4 pr-10"
                                    style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}
                                >
                                    {item.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FINAL CTA (reaproveita componente da landing) ──────── */}
            <LazyOnVisible minHeight="400px">
                <Suspense fallback={null}>
                    <FinalCTA onCTAClick={handlePrimary} onScheduleDemoClick={handleSecondary} />
                </Suspense>
            </LazyOnVisible>

            {/* ─── Minimal footer ─────────────────────────────────────── */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>© {new Date().getFullYear()} Vyzon. CRM feito no Brasil, pra quem vende online.</span>
                    <div className="flex items-center gap-6">
                        <a href="/" className="hover:text-white transition-colors no-underline" style={{ color: "inherit" }}>
                            Voltar para o site
                        </a>
                        <a href="/politica-privacidade" className="hover:text-white transition-colors no-underline" style={{ color: "inherit" }}>
                            Privacidade
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
