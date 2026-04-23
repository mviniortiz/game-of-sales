import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight,
    Calendar,
    Zap,
    Briefcase,
    Clock,
    Inbox,
    Phone,
    FileText,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    BarChart3,
    LineChart,
    Target,
    Users,
    DollarSign,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { trackEvent, FUNNEL_EVENTS } from "@/lib/analytics";

const FinalCTA = lazy(() =>
    import("@/components/landing/FinalCTA").then((m) => ({ default: m.FinalCTA }))
);

// ═══════════════════════════════════════════════════════════════════════════
// Agency-specific: multi-client data model. Each client IS a pipeline.
// ═══════════════════════════════════════════════════════════════════════════

type ClientKey = "dalia" | "lumma" | "techfive" | "novellus" | "atlas";

const CLIENTS: Record<
    ClientKey,
    {
        name: string;
        vertical: string;
        mrr: string;
        service: string;
        status: "saudavel" | "atencao" | "bandeira";
        statusLabel: string;
        lastEvent: string;
        pipeline: Array<{ stage: string; count: number; highlight?: string }>;
        cpl: string;
        winRate: string;
        renewIn: string;
    }
> = {
    dalia: {
        name: "Dália Ecom",
        vertical: "D2C · roupas femininas",
        mrr: "R$ 15.000",
        service: "Performance + criativo",
        status: "saudavel",
        statusLabel: "No plano",
        lastEvent: "proposta aprovada 2h atrás",
        pipeline: [
            { stage: "Lead Meta", count: 128, highlight: "CPL R$ 42" },
            { stage: "Discovery", count: 24 },
            { stage: "Proposta", count: 9, highlight: "R$ 48k em pipe" },
            { stage: "Fechado mês", count: 6, highlight: "R$ 72k novo" },
        ],
        cpl: "R$ 42",
        winRate: "41%",
        renewIn: "contrato até out/26",
    },
    lumma: {
        name: "Clínica Lumma",
        vertical: "Saúde · estética",
        mrr: "R$ 8.400",
        service: "SEO local + Google Ads",
        status: "saudavel",
        statusLabel: "No plano",
        lastEvent: "discovery hoje 10h",
        pipeline: [
            { stage: "Lead Google", count: 87, highlight: "CPL R$ 29" },
            { stage: "Discovery", count: 18 },
            { stage: "Proposta", count: 4 },
            { stage: "Fechado mês", count: 3, highlight: "R$ 14k novo" },
        ],
        cpl: "R$ 29",
        winRate: "38%",
        renewIn: "renovação em 42 dias",
    },
    techfive: {
        name: "TechFive SaaS",
        vertical: "B2B · software",
        mrr: "R$ 12.500",
        service: "Performance + SEO",
        status: "atencao",
        statusLabel: "Abaixo do KPI",
        lastEvent: "call de balanço agendada sexta",
        pipeline: [
            { stage: "Lead Meta+Ads", count: 46 },
            { stage: "Discovery", count: 9 },
            { stage: "Proposta", count: 2 },
            { stage: "Fechado mês", count: 1, highlight: "meta 4" },
        ],
        cpl: "R$ 86",
        winRate: "22%",
        renewIn: "renovação em 12 dias",
    },
    novellus: {
        name: "Novellus Saúde",
        vertical: "Clínica · multi-unidade",
        mrr: "R$ 18.000",
        service: "Full stack",
        status: "saudavel",
        statusLabel: "No plano",
        lastEvent: "novo criativo aprovado",
        pipeline: [
            { stage: "Lead Meta", count: 214, highlight: "4 unidades" },
            { stage: "Discovery", count: 42 },
            { stage: "Proposta", count: 11 },
            { stage: "Fechado mês", count: 8, highlight: "R$ 96k novo" },
        ],
        cpl: "R$ 51",
        winRate: "36%",
        renewIn: "contrato até mar/27",
    },
    atlas: {
        name: "Atlas Tech",
        vertical: "B2B · série A",
        mrr: "R$ 9.200",
        service: "Social + ads",
        status: "bandeira",
        statusLabel: "Risco de churn",
        lastEvent: "30d sem novo criativo aprovado",
        pipeline: [
            { stage: "Lead Meta", count: 24 },
            { stage: "Discovery", count: 3 },
            { stage: "Proposta", count: 1 },
            { stage: "Fechado mês", count: 0 },
        ],
        cpl: "R$ 134",
        winRate: "11%",
        renewIn: "renovação em 28 dias",
    },
};

const CLIENT_ORDER: ClientKey[] = ["dalia", "lumma", "techfive", "novellus", "atlas"];

// ═══════════════════════════════════════════════════════════════════════════
// Segunda-feira na Vértice: timeline narrada
// ═══════════════════════════════════════════════════════════════════════════

const TIMELINE = [
    {
        time: "09:12",
        icon: Inbox,
        tone: "lead",
        title: "Lead do Meta cai no painel",
        body: "João M. — Clínica Vita. Campanha \"Vita · performance jan\", CPL R$ 38.",
    },
    {
        time: "09:47",
        icon: Users,
        tone: "sdr",
        title: "Camila (SDR) pega o deal",
        body: "Move pra Contato inicial. Webhook registra origem, UTM e lead score automático (7/10).",
    },
    {
        time: "10:34",
        icon: Phone,
        tone: "event",
        title: "João responde no WhatsApp",
        body: "\"podem me ligar hoje à tarde?\" — deal sobe pra Qualificado. Eva agenda discovery 14h.",
    },
    {
        time: "14:00",
        icon: Calendar,
        tone: "event",
        title: "Discovery call realizada",
        body: "Camila + Ricardo (closer). Call gravada, transcrição auto, 6 insights marcados.",
    },
    {
        time: "15:22",
        icon: FileText,
        tone: "closer",
        title: "Ricardo envia diagnóstico",
        body: "Template puxa dados da conta Meta do prospect. 4 oportunidades mapeadas.",
    },
    {
        time: "16:08",
        icon: FileText,
        tone: "closer",
        title: "Proposta R$ 12k/mês enviada",
        body: "WhatsApp + PDF. SLA de 5 dias registrado. Eva agenda follow-up automático pra quinta.",
    },
    {
        time: "17:45",
        icon: CheckCircle2,
        tone: "win",
        title: "\"Vamos fechar\"",
        body: "Deal movido pra Fechado. Comissão recorrente do Ricardo calculada (30% do 1º mês, 8% recorrente).",
    },
    {
        time: "17:51",
        icon: BarChart3,
        tone: "system",
        title: "Ranking + forecast atualizam",
        body: "MRR novo do mês: R$ 108k → R$ 120k. Meta de abril: 67%. Ricardo sobe pra 2º lugar.",
    },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Métricas que agência já cobra do cliente
// ═══════════════════════════════════════════════════════════════════════════

const AGENCY_METRICS = [
    { label: "MRR ativo", value: "R$ 151k", delta: "+24%", trend: "up-good", hint: "consolidado do portfólio" },
    { label: "Forecast 30d", value: "R$ 186k", delta: "+19%", trend: "up-good", hint: "pipeline ponderado" },
    { label: "Renovações 30d", value: "R$ 42k", delta: "6 contratos", trend: "up-good", hint: "próximos do vencimento" },
    { label: "Churn (90d)", value: "R$ 18k", delta: "-2 contratos", trend: "down-good", hint: "MRR perdido" },
    { label: "Win rate médio", value: "32%", delta: "+3pp", trend: "up-good", hint: "lead → fechado" },
    { label: "Ciclo médio", value: "18d", delta: "-2d", trend: "down-good", hint: "discovery → contrato" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard snapshot — relatório pro head apresentar
// ═══════════════════════════════════════════════════════════════════════════

const CPL_BY_CAMPAIGN = [
    { name: "Meta Conversão · Abril", value: 47, bar: 62 },
    { name: "Meta LeadForm · Abril", value: 38, bar: 50 },
    { name: "Google Search · Abril", value: 62, bar: 82 },
    { name: "Meta Retarget · Abril", value: 24, bar: 32 },
    { name: "Google PMax · Abril", value: 54, bar: 71 },
] as const;

const FUNNEL_BY_ORIGIN = [
    { origin: "Meta Ads", leads: 214, discovery: 54, proposta: 18, fechado: 7 },
    { origin: "Google Ads", leads: 128, discovery: 31, proposta: 9, fechado: 4 },
    { origin: "Indicação", leads: 14, discovery: 12, proposta: 6, fechado: 3 },
    { origin: "Outbound", leads: 86, discovery: 16, proposta: 4, fechado: 1 },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// FAQ focado em dor de agência
// ═══════════════════════════════════════════════════════════════════════════

const FAQ = [
    {
        q: "Como provo ROI pro meu cliente final? Preciso gerar relatório manual todo mês?",
        a: "Não. Cada cliente da sua agência tem dashboard próprio (funil por origem, deals fechados, forecast ponderado, MRR ativo) que você compartilha via link público white-label com o logo do cliente. Ele abre no navegador e vê em tempo real o que você entregou, sem precisar virar slide na sexta-feira.",
    },
    {
        q: "Rodo tráfego pago pra 8 clientes. Cada cliente vê só os próprios dados?",
        a: "Sim. O modelo multi-cliente é nativo: cada cliente é um workspace isolado com pipeline, integrações e usuários próprios. Você (agência) vê o consolidado e troca de contexto num clique. O cliente só enxerga o workspace dele, e pode ter usuário próprio (ex.: o CMO interno) sem ver nada dos outros.",
    },
    {
        q: "Os leads vêm de Meta Lead Ads, Google Lead Form, typeform, Instagram DM... entra tudo com origem?",
        a: "Entra. Cada cliente tem webhook próprio (slug + secret) que você cola no Meta Lead Ads, Zapier, Make, Tally, typeform ou formulário do site. O payload é normalizado automaticamente (nome, email, telefone) e o deal nasce no estágio de lead com a origem marcada. WhatsApp via Evolution API. UTM e campanha ficam salvos no deal pra relatório por canal.",
    },
    {
        q: "Contratos têm ciclo diferente (mensal, trimestral, anual). Vyzon lida com isso?",
        a: "Lida. Cada contrato tem valor + ciclo (mensal, trimestral, anual, one-time) e o MRR é normalizado automaticamente. A tela de contratos mostra renovações dos próximos 30 dias, MRR em risco, encerrados do trimestre e resumo por status. Alerta antes do vencimento pra você agendar a conversa de renovação, não receber a notificação do cliente.",
    },
    {
        q: "A Eva é IA genérica ou entende contexto de agência?",
        a: "Ela é treinada no contexto da sua conta. Aprende o tom das suas propostas, reconhece quando proposta estourou SLA e sugere follow-up escrito no seu tom (não no dela). Você aprova antes de disparar qualquer coisa, ela não manda mensagem sem revisão.",
    },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Shared atoms
// ═══════════════════════════════════════════════════════════════════════════

const Eyebrow = ({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "blue" }) => (
    <span
        className="inline-block text-[10.5px] rounded-full px-3 py-1 mb-5 font-mono"
        style={{
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            background: tone === "blue" ? "rgba(21,86,192,0.10)" : "rgba(0,227,122,0.10)",
            border: `1px solid ${tone === "blue" ? "rgba(21,86,192,0.28)" : "rgba(0,227,122,0.28)"}`,
            color: tone === "blue" ? "#5B9BFF" : "#33FF9E",
        }}
    >
        {children}
    </span>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <h2
        className="font-heading"
        style={{
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.04em",
        }}
    >
        {children}
    </h2>
);

const STATUS_DOT: Record<
    "saudavel" | "atencao" | "bandeira",
    { color: string; bg: string; label: string }
> = {
    saudavel: { color: "#33FF9E", bg: "rgba(0,227,122,0.14)", label: "SAUDÁVEL" },
    atencao: { color: "#FBBF24", bg: "rgba(251,191,36,0.14)", label: "ATENÇÃO" },
    bandeira: { color: "#F87171", bg: "rgba(239,68,68,0.16)", label: "RISCO" },
};

// ═══════════════════════════════════════════════════════════════════════════
// Multi-client cockpit (hero + client switcher section use same core)
// ═══════════════════════════════════════════════════════════════════════════

const ClientRail = ({
    active,
    onSelect,
    compact = false,
}: {
    active: ClientKey;
    onSelect: (k: ClientKey) => void;
    compact?: boolean;
}) => (
    <div className="flex flex-col gap-1">
        {CLIENT_ORDER.map((key) => {
            const c = CLIENTS[key];
            const dot = STATUS_DOT[c.status];
            const isActive = active === key;
            return (
                <button
                    key={key}
                    onClick={() => onSelect(key)}
                    className="relative text-left rounded-lg px-3 py-2.5 transition-colors"
                    style={{
                        background: isActive ? "rgba(21,86,192,0.10)" : "transparent",
                        border: `1px solid ${isActive ? "rgba(21,86,192,0.35)" : "rgba(255,255,255,0.05)"}`,
                    }}
                >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot.color }} />
                            <span
                                className="truncate"
                                style={{
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    color: isActive ? "#EAF2FF" : "rgba(255,255,255,0.8)",
                                }}
                            >
                                {c.name}
                            </span>
                        </span>
                        {!compact && (
                            <span
                                className="font-mono flex-shrink-0"
                                style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}
                            >
                                {c.mrr}
                            </span>
                        )}
                    </div>
                    {!compact && (
                        <div className="mt-1 truncate" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                            {c.vertical}
                        </div>
                    )}
                </button>
            );
        })}
    </div>
);

const ClientDetail = ({ clientKey, showMetrics = true }: { clientKey: ClientKey; showMetrics?: boolean }) => {
    const c = CLIENTS[clientKey];
    const dot = STATUS_DOT[c.status];
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={clientKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="p-4 sm:p-5"
            >
                {/* Client header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono"
                                style={{
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.08em",
                                    background: dot.bg,
                                    color: dot.color,
                                }}
                            >
                                <span className="w-1 h-1 rounded-full" style={{ background: dot.color }} />
                                {dot.label}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)" }}>
                                {c.service}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F3F7FF", letterSpacing: "-0.02em" }}>
                                {c.name}
                            </h3>
                            <span className="font-mono" style={{ fontSize: "0.78rem", color: "rgba(91,155,255,0.85)", fontWeight: 600 }}>
                                {c.mrr}/mês · {c.renewIn}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                            <Clock className="h-3 w-3" strokeWidth={2} />
                            {c.lastEvent}
                        </div>
                    </div>
                </div>

                {/* Pipeline strip */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {c.pipeline.map((p) => (
                        <div
                            key={p.stage}
                            className="rounded-lg px-2.5 py-2"
                            style={{
                                background: "rgba(21,86,192,0.05)",
                                border: "1px solid rgba(21,86,192,0.18)",
                            }}
                        >
                            <div
                                className="truncate"
                                style={{ fontSize: "0.62rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}
                            >
                                {p.stage.toUpperCase()}
                            </div>
                            <div
                                className="font-mono mt-0.5"
                                style={{ fontSize: "1.15rem", fontWeight: 700, color: "#F3F7FF", letterSpacing: "-0.02em" }}
                            >
                                {p.count}
                            </div>
                            {p.highlight && (
                                <div
                                    className="truncate mt-0.5"
                                    style={{ fontSize: "0.6rem", color: "rgba(91,155,255,0.85)", fontWeight: 600 }}
                                >
                                    {p.highlight}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Quick metrics */}
                {showMetrics && (
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            { k: "CPL", v: c.cpl },
                            { k: "Win rate", v: c.winRate },
                            { k: "MRR", v: c.mrr.replace("R$ ", "") },
                        ].map((m) => (
                            <div
                                key={m.k}
                                className="rounded-lg px-2.5 py-1.5 flex items-baseline justify-between"
                                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                            >
                                <span
                                    className="font-mono"
                                    style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}
                                >
                                    {m.k.toUpperCase()}
                                </span>
                                <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#F3F7FF" }}>
                                    {m.v}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function ForAgencias() {
    const navigate = useNavigate();
    const [heroClient, setHeroClient] = useState<ClientKey>("dalia");
    const [switcherClient, setSwitcherClient] = useState<ClientKey>("novellus");

    useEffect(() => {
        document.title = "Vyzon para Agências de Marketing | CRM multi-cliente com relatório white-label";
        trackEvent("persona_page_view", { persona: "agencias" });
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.setAttribute(
                "content",
                "CRM feito pra agência que gere múltiplos clientes: workspace isolado por conta, relatório white-label, forecast e contratos com MRR. 14 dias grátis."
            );
        }
    }, []);

    const handlePrimary = () => {
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { source: "persona_agencias", cta: "trial" });
        navigate("/onboarding?plan=pro");
    };
    const handleSecondary = () => {
        trackEvent(FUNNEL_EVENTS.LANDING_CTA_CLICK, { source: "persona_agencias", cta: "demo" });
        navigate("/#agendar-demo");
    };
    const handleLogin = () => navigate("/auth");

    return (
        <div className="min-h-screen" style={{ background: "var(--vyz-bg)", color: "var(--vyz-text-primary)" }}>
            <LandingNav onCTAClick={handleSecondary} onLoginClick={handleLogin} />

            {/* ═══ HERO — split asymmetric ═══════════════════════════════════ */}
            <section className="relative overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
                {/* Ambient: blue tint instead of emerald for agency */}
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(21,86,192,0.16) 0%, transparent 60%)" }}
                    />
                    <div
                        className="absolute top-[40%] -right-32 w-[500px] h-[500px] rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(0,227,122,0.10) 0%, transparent 60%)" }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.022]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                            backgroundSize: "80px 80px",
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-20">
                    <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
                        {/* LEFT — copy */}
                        <div>
                            <Eyebrow tone="blue">PARA AGÊNCIAS · MULTI-CLIENTE</Eyebrow>

                            <h1
                                className="font-heading"
                                style={{
                                    fontSize: "clamp(2.1rem, 5.5vw, 3.75rem)",
                                    lineHeight: 1.05,
                                    letterSpacing: "-0.04em",
                                    maxWidth: "640px",
                                }}
                            >
                                <span style={{ fontWeight: 700, color: "var(--vyz-text-primary)" }}>
                                    Um CRM por cliente,{" "}
                                </span>
                                <span
                                    style={{
                                        fontWeight: 900,
                                        background: "linear-gradient(90deg, #5B9BFF 0%, #33FF9E 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    uma operação pra agência.
                                </span>
                            </h1>

                            <p
                                className="mt-5 max-w-xl"
                                style={{ fontSize: "clamp(1rem, 1.8vw, 1.125rem)", lineHeight: 1.65, color: "rgba(255,255,255,0.68)" }}
                            >
                                Seu cliente vê o próprio dashboard white-label. Seu closer vê o ranking de MRR novo.
                                Você vê o portfólio inteiro num só painel — com churn, renovação e forecast antes do
                                fim do mês.
                            </p>

                            {/* Signal strip, monospaced */}
                            <div
                                className="mt-6 inline-flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg font-mono"
                                style={{
                                    fontSize: "0.72rem",
                                    background: "rgba(21,86,192,0.06)",
                                    border: "1px solid rgba(21,86,192,0.2)",
                                    color: "rgba(234,242,255,0.85)",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                <span>5 clientes ativos</span>
                                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                                <span>R$ 62.600 MRR carteira</span>
                                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                                <span style={{ color: "#33FF9E" }}>+R$ 151k MRR novo</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-8">
                                <a
                                    href="/onboarding?plan=pro"
                                    onClick={(e) => { e.preventDefault(); handlePrimary(); }}
                                    className="group relative inline-flex h-12 items-center justify-center gap-2 px-7 text-[15px] font-bold text-white rounded-xl overflow-hidden no-underline"
                                    style={{
                                        background: "var(--vyz-gradient-accent)",
                                        boxShadow: "var(--vyz-shadow-cta)",
                                    }}
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <Zap className="relative h-4 w-4" strokeWidth={2} />
                                    <span className="relative">Testar 14 dias grátis</span>
                                    <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                                </a>
                                <a
                                    href="/#agendar-demo"
                                    onClick={(e) => { e.preventDefault(); handleSecondary(); }}
                                    className="group inline-flex h-12 items-center justify-center gap-2 px-6 rounded-xl text-[15px] no-underline"
                                    style={{
                                        color: "var(--vyz-text-strong)",
                                        background: "var(--vyz-surface-2)",
                                        boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
                                        fontWeight: 600,
                                    }}
                                >
                                    <Calendar className="h-4 w-4" strokeWidth={2} />
                                    Demonstração guiada
                                </a>
                            </div>
                        </div>

                        {/* RIGHT — cockpit mock (static snapshot) */}
                        <div className="relative">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                className="rounded-2xl overflow-hidden"
                                style={{
                                    background: "rgba(11,14,18,0.92)",
                                    border: "1px solid rgba(21,86,192,0.28)",
                                    boxShadow: "0 24px 80px -20px rgba(21,86,192,0.35), 0 0 0 1px rgba(255,255,255,0.04)",
                                }}
                            >
                                {/* Window chrome */}
                                <div
                                    className="flex items-center justify-between px-4 py-2.5"
                                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-3.5 w-3.5" style={{ color: "rgba(91,155,255,0.75)" }} strokeWidth={2} />
                                        <span className="font-mono" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
                                            agência-vertice.vyzon.com.br / clientes
                                        </span>
                                    </div>
                                    <span className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                                        ABR · SEM 17
                                    </span>
                                </div>

                                <div className="grid grid-cols-[180px_1fr]">
                                    <div
                                        className="p-2.5"
                                        style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
                                    >
                                        <div
                                            className="px-2 pb-2 mb-1 font-mono"
                                            style={{
                                                fontSize: "0.6rem",
                                                color: "rgba(255,255,255,0.35)",
                                                letterSpacing: "0.1em",
                                            }}
                                        >
                                            CLIENTES · 5
                                        </div>
                                        <ClientRail active={heroClient} onSelect={setHeroClient} compact />
                                    </div>
                                    <ClientDetail clientKey={heroClient} showMetrics={false} />
                                </div>
                            </motion.div>

                            {/* Floating aside: agency-level summary */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="hidden sm:block absolute -left-6 -bottom-6 rounded-xl px-4 py-3"
                                style={{
                                    background: "rgba(21,86,192,0.12)",
                                    border: "1px solid rgba(21,86,192,0.4)",
                                    backdropFilter: "blur(8px)",
                                }}
                            >
                                <div className="font-mono" style={{ fontSize: "0.6rem", color: "#5B9BFF", letterSpacing: "0.1em", fontWeight: 600 }}>
                                    PORTFÓLIO · MÉDIA 12M
                                </div>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                    <span className="font-heading" style={{ fontSize: "1.35rem", fontWeight: 800, color: "#F3F7FF", letterSpacing: "-0.02em" }}>
                                        3.2%
                                    </span>
                                    <span className="font-mono" style={{ fontSize: "0.72rem", color: "#33FF9E" }}>
                                        churn ↓ 0.4pp
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ SEÇÃO 1 — Client switcher interactive ════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="mb-10 max-w-2xl">
                        <Eyebrow tone="blue">ARQUITETURA MULTI-CLIENTE</Eyebrow>
                        <SectionHeading>
                            Um painel por cliente.{" "}
                            <span style={{ background: "linear-gradient(90deg, #5B9BFF, #33FF9E)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                Nunca planilha por projeto.
                            </span>
                        </SectionHeading>
                        <p
                            className="mt-4 max-w-xl"
                            style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}
                        >
                            Cada cliente da sua agência é um workspace isolado: integrações, pipeline, usuários e
                            relatório próprios. Troque de contexto clicando no cliente — o painel inteiro muda.
                            Clique e experimente.
                        </p>
                    </div>

                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            background: "rgba(11,14,18,0.85)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 24px 64px -16px rgba(0,0,0,0.55)",
                        }}
                    >
                        <div
                            className="flex items-center justify-between px-5 py-3"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}
                        >
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-4 w-4" style={{ color: "rgba(91,155,255,0.8)" }} strokeWidth={2} />
                                <span className="font-mono" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>
                                    Troque de cliente →
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-mono">live</span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-[240px_1fr]">
                            <div
                                className="p-3"
                                style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
                            >
                                <div
                                    className="px-2 pb-2 font-mono"
                                    style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}
                                >
                                    CLIENTES · 5
                                </div>
                                <ClientRail active={switcherClient} onSelect={setSwitcherClient} />
                            </div>
                            <ClientDetail clientKey={switcherClient} />
                        </div>
                    </div>

                    <div className="mt-6 grid sm:grid-cols-3 gap-3">
                        {[
                            { icon: Users, title: "Usuário do cliente", body: "O CMO interno entra só no workspace dele, não vê os outros clientes." },
                            { icon: Briefcase, title: "Integrações isoladas", body: "Meta Ads, Google Ads e GA4 conectados por cliente, não misturam." },
                            { icon: LineChart, title: "Relatório white-label", body: "Link público com logo do seu cliente. Nada de slide manual na sexta." },
                        ].map((f) => {
                            const Icon = f.icon;
                            return (
                                <div
                                    key={f.title}
                                    className="rounded-xl p-4"
                                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                                >
                                    <Icon className="h-4 w-4 mb-2" style={{ color: "#5B9BFF" }} strokeWidth={2} />
                                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F3F7FF" }}>{f.title}</div>
                                    <div className="mt-1" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                                        {f.body}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══ SEÇÃO 2 — Segunda-feira 9h na Vértice (timeline narrada) ══ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(21,86,192,0.08) 0%, transparent 70%)",
                    }}
                />
                <div className="relative max-w-4xl mx-auto">
                    <div className="text-center mb-14">
                        <Eyebrow>USE CASE · LEAD → FECHADO EM 8 HORAS</Eyebrow>
                        <SectionHeading>
                            Uma segunda-feira na <span className="text-emerald-400">Agência Vértice</span>.
                        </SectionHeading>
                        <p
                            className="mt-4 max-w-xl mx-auto"
                            style={{ fontSize: "1rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}
                        >
                            Um lead do Meta vira contrato fechado antes do fim do expediente, sem ninguém abrir
                            planilha, sem "quem ia responder esse?", sem perder de vista MRR e renovação.
                        </p>
                    </div>

                    <div className="relative">
                        {/* Vertical line */}
                        <div
                            className="absolute left-[60px] sm:left-[80px] top-2 bottom-2 w-px"
                            style={{ background: "linear-gradient(to bottom, transparent, rgba(91,155,255,0.3), rgba(0,227,122,0.3), transparent)" }}
                        />

                        <div className="space-y-5">
                            {TIMELINE.map((evt, i) => {
                                const Icon = evt.icon;
                                const toneColor =
                                    evt.tone === "win"
                                        ? "#33FF9E"
                                        : evt.tone === "system"
                                        ? "#C4B5FD"
                                        : evt.tone === "closer"
                                        ? "#FBBF24"
                                        : evt.tone === "sdr"
                                        ? "#5B9BFF"
                                        : "rgba(255,255,255,0.65)";
                                const toneBg =
                                    evt.tone === "win"
                                        ? "rgba(0,227,122,0.14)"
                                        : evt.tone === "system"
                                        ? "rgba(196,181,253,0.12)"
                                        : evt.tone === "closer"
                                        ? "rgba(251,191,36,0.12)"
                                        : evt.tone === "sdr"
                                        ? "rgba(91,155,255,0.14)"
                                        : "rgba(255,255,255,0.05)";

                                return (
                                    <motion.div
                                        key={evt.time}
                                        initial={{ x: -8 }}
                                        whileInView={{ x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: i * 0.04 }}
                                        className="flex items-start gap-4 sm:gap-6"
                                    >
                                        {/* Time */}
                                        <div
                                            className="flex-shrink-0 font-mono pt-2"
                                            style={{
                                                width: "50px",
                                                fontSize: "0.82rem",
                                                fontWeight: 700,
                                                color: "rgba(255,255,255,0.6)",
                                                letterSpacing: "-0.02em",
                                                textAlign: "right",
                                            }}
                                        >
                                            {evt.time}
                                        </div>

                                        {/* Icon node */}
                                        <div
                                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative z-10"
                                            style={{
                                                background: toneBg,
                                                border: `1px solid ${toneColor}40`,
                                            }}
                                        >
                                            <Icon className="h-4 w-4" style={{ color: toneColor }} strokeWidth={2} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 rounded-xl px-4 py-3"
                                            style={{
                                                background: "rgba(255,255,255,0.025)",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                            }}
                                        >
                                            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#F3F7FF" }}>
                                                {evt.title}
                                            </div>
                                            <div className="mt-1" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                                                {evt.body}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Outcome badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="mt-8 ml-[104px] sm:ml-[128px] inline-block"
                        >
                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                                style={{
                                    background: "linear-gradient(135deg, rgba(0,227,122,0.14), rgba(21,86,192,0.12))",
                                    border: "1px solid rgba(0,227,122,0.35)",
                                }}
                            >
                                <CheckCircle2 className="h-4 w-4" style={{ color: "#33FF9E" }} strokeWidth={2} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F3F7FF" }}>
                                    Lead → contrato em 8h39min. Sem uma planilha aberta.
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══ SEÇÃO 3 — Relatório pro head apresentar ══════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
                        <div>
                            <Eyebrow tone="blue">RELATÓRIO EXECUTIVO</Eyebrow>
                            <h2
                                className="font-heading mb-5"
                                style={{ fontWeight: 700, fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.04em" }}
                            >
                                O relatório que o head abre na segunda e{" "}
                                <span style={{ background: "linear-gradient(90deg, #5B9BFF, #33FF9E)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                    não monta no PowerPoint.
                                </span>
                            </h2>
                            <p className="mb-6" style={{ fontSize: "1rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
                                Funil por origem, forecast do mês, MRR novo vs meta, renovações da semana. Tudo calculado
                                direto do pipeline e dos contratos, sem "extrair de 3 lugares" pra conciliar. E cada cliente
                                tem o próprio dashboard public link, com seu logo, pra ele abrir sozinho.
                            </p>

                            <ul className="space-y-2.5">
                                {[
                                    "Funil por origem · lead → discovery → proposta → fechado",
                                    "Forecast em tempo real · MRR novo + pipeline ponderado",
                                    "Contratos · MRR ativo, renovações e churn do portfólio",
                                    "Public link white-label · logo do seu cliente",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3">
                                        <div
                                            className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5"
                                            style={{ background: "rgba(21,86,192,0.18)" }}
                                        >
                                            <CheckCircle2 className="h-3 w-3" style={{ color: "#5B9BFF" }} strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: "0.93rem", color: "rgba(255,255,255,0.8)" }}>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Dashboard mock */}
                        <motion.div
                            initial={{ y: 16 }}
                            whileInView={{ y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: "rgba(11,14,18,0.92)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                boxShadow: "0 24px 64px -16px rgba(0,0,0,0.55)",
                            }}
                        >
                            {/* Chrome */}
                            <div
                                className="flex items-center justify-between px-4 py-2.5"
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                            >
                                <div className="flex items-center gap-2">
                                    <LineChart className="h-3.5 w-3.5" style={{ color: "rgba(91,155,255,0.8)" }} strokeWidth={2} />
                                    <span className="font-mono" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.55)" }}>
                                        Relatório · Novellus Saúde · abril/26
                                    </span>
                                </div>
                                <span
                                    className="font-mono px-2 py-0.5 rounded"
                                    style={{
                                        fontSize: "0.58rem",
                                        color: "#33FF9E",
                                        background: "rgba(0,227,122,0.12)",
                                        border: "1px solid rgba(0,227,122,0.25)",
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    WHITE-LABEL
                                </span>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* CPL by campaign */}
                                <div>
                                    <div
                                        className="flex items-center justify-between mb-3"
                                        style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em" }}
                                    >
                                        <span className="font-mono">CPL · POR CAMPANHA</span>
                                        <span className="font-mono">MENOR É MELHOR</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {CPL_BY_CAMPAIGN.map((c, i) => (
                                            <div key={c.name} className="flex items-center gap-3">
                                                <div
                                                    className="truncate"
                                                    style={{ width: "40%", fontSize: "0.76rem", color: "rgba(255,255,255,0.7)" }}
                                                >
                                                    {c.name}
                                                </div>
                                                <div className="flex-1 h-5 rounded" style={{ background: "rgba(255,255,255,0.03)", position: "relative" }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        whileInView={{ width: `${c.bar}%` }}
                                                        viewport={{ once: true }}
                                                        transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
                                                        className="h-full rounded"
                                                        style={{
                                                            background:
                                                                c.value < 40
                                                                    ? "linear-gradient(90deg, rgba(0,227,122,0.6), rgba(0,227,122,0.9))"
                                                                    : c.value < 55
                                                                    ? "linear-gradient(90deg, rgba(91,155,255,0.6), rgba(91,155,255,0.9))"
                                                                    : "linear-gradient(90deg, rgba(251,191,36,0.6), rgba(251,191,36,0.9))",
                                                        }}
                                                    />
                                                </div>
                                                <div
                                                    className="font-mono flex-shrink-0 text-right"
                                                    style={{ width: "58px", fontSize: "0.78rem", fontWeight: 700, color: "#F3F7FF" }}
                                                >
                                                    R$ {c.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Funnel by origin */}
                                <div>
                                    <div
                                        className="mb-3 font-mono"
                                        style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em" }}
                                    >
                                        FUNIL · POR ORIGEM DO LEAD
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full" style={{ fontSize: "0.75rem" }}>
                                            <thead>
                                                <tr style={{ color: "rgba(255,255,255,0.4)" }}>
                                                    <th className="text-left py-1.5 font-mono" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>ORIGEM</th>
                                                    <th className="text-right py-1.5 font-mono" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>LEADS</th>
                                                    <th className="text-right py-1.5 font-mono" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>DISC.</th>
                                                    <th className="text-right py-1.5 font-mono" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>PROP.</th>
                                                    <th className="text-right py-1.5 font-mono" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>GANHO</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {FUNNEL_BY_ORIGIN.map((row, i) => (
                                                    <tr
                                                        key={row.origin}
                                                        style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}
                                                    >
                                                        <td className="py-1.5" style={{ color: "#F3F7FF", fontWeight: 600 }}>
                                                            {row.origin}
                                                        </td>
                                                        <td className="text-right py-1.5 font-mono" style={{ color: "rgba(255,255,255,0.75)" }}>{row.leads}</td>
                                                        <td className="text-right py-1.5 font-mono" style={{ color: "rgba(255,255,255,0.75)" }}>{row.discovery}</td>
                                                        <td className="text-right py-1.5 font-mono" style={{ color: "rgba(255,255,255,0.75)" }}>{row.proposta}</td>
                                                        <td className="text-right py-1.5 font-mono" style={{ color: "#33FF9E", fontWeight: 700 }}>{row.fechado}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Forecast callout */}
                                <div
                                    className="rounded-xl p-3 flex items-center justify-between"
                                    style={{
                                        background: "linear-gradient(90deg, rgba(91,155,255,0.08), rgba(0,227,122,0.08))",
                                        border: "1px solid rgba(91,155,255,0.25)",
                                    }}
                                >
                                    <div>
                                        <div className="font-mono" style={{ fontSize: "0.6rem", color: "rgba(91,155,255,0.9)", letterSpacing: "0.1em", fontWeight: 600 }}>
                                            FORECAST · ABRIL
                                        </div>
                                        <div className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#F3F7FF", letterSpacing: "-0.02em" }}>
                                            R$ 218.000
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.55)" }}>
                                            R$ 151k fechado + R$ 67k em pipe ponderado
                                        </div>
                                        <div className="font-mono mt-0.5" style={{ fontSize: "0.72rem", color: "#33FF9E", fontWeight: 700 }}>
                                            ↗ 121% da meta
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══ SEÇÃO 4 — Métricas que agência já cobra ══════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <Eyebrow tone="blue">MÉTRICAS NATIVAS</Eyebrow>
                        <SectionHeading>
                            As métricas que você já cobra do seu cliente.{" "}
                            <span className="text-emerald-400">Sem exportar CSV.</span>
                        </SectionHeading>
                        <p className="mt-4 max-w-2xl mx-auto" style={{ fontSize: "1rem", color: "rgba(255,255,255,0.55)" }}>
                            MRR, forecast, churn, win rate, ciclo, renovação. Calculados do pipeline e dos
                            contratos reais, por cliente, e consolidados no portfólio da agência.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AGENCY_METRICS.map((m, i) => {
                            const isGood = m.trend.endsWith("good");
                            const TrendIcon = m.trend.startsWith("up") ? TrendingUp : TrendingDown;
                            return (
                                <motion.div
                                    key={m.label}
                                    initial={{ y: 10 }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.04, duration: 0.4 }}
                                    className="rounded-xl p-4 relative overflow-hidden"
                                    style={{
                                        background: "rgba(11,14,18,0.6)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span
                                            className="font-mono"
                                            style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", fontWeight: 600 }}
                                        >
                                            {m.label.toUpperCase()}
                                        </span>
                                        <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono"
                                            style={{
                                                fontSize: "0.6rem",
                                                fontWeight: 700,
                                                color: isGood ? "#33FF9E" : "#F87171",
                                                background: isGood ? "rgba(0,227,122,0.1)" : "rgba(239,68,68,0.1)",
                                            }}
                                        >
                                            <TrendIcon className="h-2.5 w-2.5" strokeWidth={3} />
                                            {m.delta}
                                        </span>
                                    </div>
                                    <div className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "#F3F7FF", letterSpacing: "-0.03em" }}>
                                        {m.value}
                                    </div>
                                    <div className="mt-1 font-mono" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)" }}>
                                        {m.hint}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="mt-10 grid sm:grid-cols-2 gap-3">
                        <div
                            className="rounded-xl p-4 flex items-start gap-3"
                            style={{ background: "rgba(21,86,192,0.06)", border: "1px solid rgba(21,86,192,0.22)" }}
                        >
                            <Target className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#5B9BFF" }} strokeWidth={2} />
                            <div>
                                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F3F7FF" }}>Contratos com MRR normalizado</div>
                                <div className="mt-1" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                                    Mensal, trimestral, anual ou one-time. O Vyzon normaliza pra MRR e acompanha o portfólio.
                                </div>
                            </div>
                        </div>
                        <div
                            className="rounded-xl p-4 flex items-start gap-3"
                            style={{ background: "rgba(0,227,122,0.06)", border: "1px solid rgba(0,227,122,0.22)" }}
                        >
                            <DollarSign className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#33FF9E" }} strokeWidth={2} />
                            <div>
                                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#F3F7FF" }}>Aviso de renovação antecipado</div>
                                <div className="mt-1" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                                    Defina quantos dias antes do vencimento o contrato entra na fila de renovação. Conversa antes do cliente lembrar.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ FAQ ═══════════════════════════════════════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <Eyebrow tone="blue">PERGUNTAS DE QUEM RODA AGÊNCIA</Eyebrow>
                        <SectionHeading>
                            As dúvidas que <span className="text-emerald-400">toda agência tem</span>.
                        </SectionHeading>
                    </div>

                    <div className="space-y-3">
                        {FAQ.map((item) => (
                            <details
                                key={item.q}
                                className="group rounded-xl px-5 py-4"
                                style={{ background: "rgba(11,14,18,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
                            >
                                <summary
                                    className="cursor-pointer list-none flex items-start justify-between gap-4"
                                    style={{ fontWeight: 600, fontSize: "0.98rem", color: "#F3F7FF" }}
                                >
                                    {item.q}
                                    <span
                                        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-transform group-open:rotate-45"
                                        style={{ background: "rgba(91,155,255,0.14)", color: "#5B9BFF", fontWeight: 700 }}
                                    >
                                        +
                                    </span>
                                </summary>
                                <p
                                    className="mt-3 pr-10"
                                    style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "rgba(255,255,255,0.62)" }}
                                >
                                    {item.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FINAL CTA ═════════════════════════════════════════════════ */}
            <LazyOnVisible minHeight="400px">
                <Suspense fallback={null}>
                    <FinalCTA onCTAClick={handlePrimary} onScheduleDemoClick={handleSecondary} />
                </Suspense>
            </LazyOnVisible>

            {/* ═══ FOOTER ════════════════════════════════════════════════════ */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div
                    className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                >
                    <span>© {new Date().getFullYear()} Vyzon. CRM multi-cliente pra agência que entrega resultado.</span>
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
