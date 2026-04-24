import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Check,
    Calendar,
    MessageSquare,
    TrendingUp,
    Target,
    Workflow,
    Clock,
    Bot,
    LineChart,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LazyOnVisible } from "@/components/LazyOnVisible";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { trackEvent } from "@/lib/analytics";

const FinalCTA = lazy(() =>
    import("@/components/landing/FinalCTA").then((m) => ({ default: m.FinalCTA }))
);

// Deep-link pra /#agendar-demo na home
const SCHEDULE_URL = "/#agendar-demo";

// ═══════════════════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════════════════

const PAIN_POINTS = [
    {
        icon: LineChart,
        title: "Pipeline vive entre planilha, WhatsApp e Excel mental",
        body: "SDR tem uma lista de leads. Closer tem outra. Planilha do RevOps diverge das duas. Quando tu precisa projetar MRR do trimestre, são 3 horas cruzando dados.",
    },
    {
        icon: Clock,
        title: "Lead de 50k esquecido há 8 dias",
        body: "SDR qualifica, entrega pro closer. Closer tem 12 contas simultâneas no head. Oportunidade esfria, concorrente fecha. E tu só descobre no forecast do mês seguinte.",
    },
    {
        icon: Target,
        title: "SDR sem visibilidade de própria meta",
        body: "Quantos SQLs já entreguei esse mês? Quanto falta pra bater meta? Vendedor abre o CRM e vê uma tela genérica. Motivação cai, pipeline sofre.",
    },
    {
        icon: MessageSquare,
        title: "WhatsApp fora do CRM é duplo trabalho",
        body: "Lead responde no WhatsApp pessoal do closer. Ninguém anotou. Gestor pede relatório da conversa, vira screenshot. Handoff entre SDR→Closer perde contexto.",
    },
];

const FEATURES = [
    {
        icon: Workflow,
        title: "Pipeline por conta, não só por contato",
        body: "SaaS B2B tem empresa-alvo, múltiplos stakeholders e ciclo multi-touch. Vyzon organiza por conta, mostra todos os deals abertos, toda conversa por pessoa e o peso da conta no forecast.",
        stats: [
            { label: "Estágios customizáveis", value: "∞" },
            { label: "Templates pipeline", value: "B2B, SaaS, expansion" },
        ],
    },
    {
        icon: TrendingUp,
        title: "Ranking ao vivo que empurra meta",
        body: "SDR vê em tempo real quantos SQLs entregou vs meta. Closer vê receita fechada vs target. Ranking público, pódio atualiza a cada deal. Funciona como ritual diário, não relatório mensal.",
        stats: [
            { label: "Atualização", value: "Tempo real" },
            { label: "Métricas por cargo", value: "SDR, Closer, AM" },
        ],
    },
    {
        icon: Bot,
        title: "Eva IA cobra lead parado automaticamente",
        body: "A cada 6 horas a Eva lê o pipeline, identifica deals sem touch há X dias e redige uma mensagem de follow-up específica pro contexto daquele lead. Closer abre, aprova e manda com 1 clique no WhatsApp.",
        stats: [
            { label: "Tipo de IA", value: "Generativa" },
            { label: "Adaptação", value: "Por lead, por estágio" },
        ],
    },
    {
        icon: MessageSquare,
        title: "WhatsApp dentro do card do deal",
        body: "Evolution API nativa, conecta o número do time via QR code sem custo por mensagem. Histórico sincroniza automaticamente com o deal. Handoff SDR→Closer preserva todo contexto.",
        stats: [
            { label: "Custo por mensagem", value: "R$ 0" },
            { label: "API", value: "Evolution, não oficial Meta" },
        ],
    },
];

const SCENARIOS = [
    {
        title: "SaaS B2B com ciclo de 30-60 dias",
        role: "Head of Sales",
        team: "3 SDRs, 2 Closers",
        body: "Outbound intenso no LinkedIn, qualificação por WhatsApp, demo online, proposta em PDF, fechamento em 4-8 semanas. Vyzon dá pipeline por conta, handoff transparente SDR→Closer e Eva cobra lead que ficou sem touch depois da demo.",
        result: "Lead esquecido cai de 28% pra <10%. Ciclo reduz em 5-8 dias.",
    },
    {
        title: "SaaS self-service com time de Expansion",
        role: "Customer Success Lead",
        team: "2 CSMs, 1 Closer de expansion",
        body: "Base de 200 clientes, objetivo upsell/cross-sell. Pipeline de expansion separado do pipeline de new business. Gatilhos por uso do produto entram como deals automáticos. Closer aborda no WhatsApp com contexto da conta.",
        result: "NRR sobe de 102% pra 115% em 2 trimestres.",
    },
    {
        title: "Vertical SaaS B2B com venda consultiva",
        role: "Founder / CRO",
        team: "1 BDR, 2 founders vendendo",
        body: "Ciclo 60-120 dias com multiple stakeholders, demo custom pra cada cliente, PoC de 30 dias antes de fechar. Pipeline documenta cada interação, anexos (propostas, termos de uso, PoC reports) ficam no deal, Eva lembra de follow-up crítico.",
        result: "Win rate sobe de 15% pra 28% pela melhor orquestração de touchpoints.",
    },
];

const COMPARISON = [
    { label: "Preço por usuário / mês", vyzon: "R$ 147 (BRL)", hubspot: "US$ 100 (~R$ 550)*", pipedrive: "US$ 29 (~R$ 165)*" },
    { label: "Cobrança em Real", vyzon: "Sim", hubspot: "USD + IOF", pipedrive: "USD + IOF" },
    { label: "WhatsApp dentro do deal", vyzon: "Evolution nativa", hubspot: "API Meta paga", pipedrive: "App marketplace pago" },
    { label: "Ranking ao vivo time comercial", vyzon: "Nativo", hubspot: "Apps pagos", pipedrive: "Apps pagos" },
    { label: "IA generativa pra cobrar lead", vyzon: "Eva IA nativa", hubspot: "Breeze (Professional+)", pipedrive: "AI Sales Assistant" },
    { label: "Pipeline por conta B2B", vyzon: "Sim", hubspot: "Sim", pipedrive: "Sim" },
    { label: "Forecasting e analytics", vyzon: "Dashboards", hubspot: "Maduro", pipedrive: "Maduro" },
    { label: "Setup", vyzon: "~1 dia self-service", hubspot: "2-6 semanas", pipedrive: "1-2 semanas" },
];

const EARLY_ACCESS = [
    { label: "Tempo grátis", value: "3 meses" },
    { label: "Preço vitalício", value: "R$ 97 / user" },
    { label: "Vagas disponíveis", value: "10" },
    { label: "Requisitos", value: "Time 3-15 vendedores" },
];

const FAQ = [
    {
        q: "Como o Vyzon lida com pipeline B2B de ciclo longo?",
        a: "O pipeline é organizado por conta (empresa), não só por contato. Tu adiciona múltiplos stakeholders pro mesmo deal, cada um com conversa própria no WhatsApp, e o deal acumula atividades (ligações, emails, propostas) em timeline. Estágios são customizáveis por pipeline: tu pode ter um pipeline pra new business (MQL → SQL → Demo → Proposta → Ganho) e outro separado pra expansion (Trigger → Discovery → Upsell Proposta → Ganho).",
    },
    {
        q: "Tem integração com LinkedIn Sales Navigator e outros outbound tools?",
        a: "Ainda não temos conector nativo. Usamos webhook + API REST pra receber leads de qualquer fonte (Apollo, Lusha, Zapier, Make). Leads entram direto no pipeline marcado com origem. Se tiveres fluxo específico, nossa equipe ajuda a configurar webhook durante o onboarding.",
    },
    {
        q: "Como é o handoff SDR para Closer?",
        a: "Quando SDR move o deal pra estágio SQL (ou o que equivaler no teu pipeline), notificação automática vai pro Closer. O Closer assume o deal mantendo todo histórico: conversas no WhatsApp, email, notas e atividades. Tu pode configurar SLA (ex: Closer tem 48h pra primeiro touch após handoff) e a Eva IA alerta se o SLA estourar.",
    },
    {
        q: "Vyzon tem forecasting e relatórios executivos?",
        a: "Temos dashboards nativos pra receita projetada, funil de conversão por estágio, tempo médio por estágio, performance por vendedor e meta realizada. Pra BI profundo com pivots e analytics customizados (tipo o do HubSpot Enterprise), a gente expõe tudo via API REST, tu conecta com Metabase, Looker ou tabelas do seu BI.",
    },
    {
        q: "LGPD, segurança e controle de acesso?",
        a: "Hospedagem no Brasil (Supabase BR), RLS (row-level security) por nível de usuário, criptografia em trânsito e repouso. Cada vendedor enxerga só suas contas por padrão, gestor vê todos. Auditoria de ações críticas (login, export, delete) fica logada. Termo de uso + política LGPD atualizados em vyzon.com.br/termos-de-servico.",
    },
    {
        q: "Como é o contrato? Tem SSO, SLA, multi-tenant?",
        a: "Plano mensal sem fidelidade (cancela quando quiser). Anual 10% de desconto. SSO via Google Workspace está nativo. Microsoft/Okta em roadmap. SLA de 99.5% uptime. Pro enterprise real (5k+ contatos, multi-tenant, SSO SAML, white-label), entra em contato comercial pra cotação custom.",
    },
    {
        q: "Migração do CRM atual (HubSpot, RD, Pipedrive)?",
        a: "Export CSV do teu CRM (contatos, empresas, deals, atividades). Import no Vyzon em Configurações > Importar Dados. Mapeamento automático pros nomes padrão, ajuste manual em campos custom. Planos anuais incluem migração assistida: nossa equipe configura pipeline, propriedades custom e faz o import contigo.",
    },
    {
        q: "Por que não tem Marketing Automation nativo?",
        a: "Decisão de produto: focamos em fundo de funil (time comercial) ao invés de topo (marketing). Pra nutrição de lead por email, landing pages e scoring avançado, nossos clientes usam RD Station, MailerLite ou Brevo e conectam via webhook/API. Vantagem: tu paga só pela ferramenta que usa a fundo, ao invés de pagar HubSpot Marketing Hub que geralmente sobrepõe.",
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Página
// ═══════════════════════════════════════════════════════════════════════════

const ForSaasB2B = () => {
    const navigate = useNavigate();
    const [pricingSize, setPricingSize] = useState<3 | 10 | 20>(3);

    useEffect(() => {
        document.title = "Vyzon para SaaS B2B | CRM em Real com WhatsApp e Eva IA";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.content =
                "CRM brasileiro pra time comercial de SaaS B2B: pipeline por conta, ranking ao vivo, Eva IA cobrando lead parado, WhatsApp nativo e cobrança em Real. Alternativa a HubSpot, Pipedrive e RD Station.";
        }
        trackEvent("persona_page_view", { persona: "saas_b2b" });
        // força dark mode nesta página (home é light)
        const html = document.documentElement;
        html.classList.add("dark");
        return () => {
            html.classList.remove("dark");
        };
    }, []);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Product",
                name: "Vyzon CRM para SaaS B2B",
                description:
                    "CRM brasileiro para times comerciais de SaaS B2B com pipeline por conta, ranking ao vivo, Eva IA e WhatsApp nativo.",
                brand: { "@type": "Brand", name: "Vyzon" },
                offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "97", highPrice: "297", offerCount: "3", url: "https://vyzon.com.br/para-saas-b2b" },
            },
            { "@type": "FAQPage", mainEntity: FAQ.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
        ],
    };

    const sizeOption = (n: 3 | 10 | 20) => ({
        base: n === 3 ? 147 : n === 10 ? 137 : 127,
        total: n * (n === 3 ? 147 : n === 10 ? 137 : 127),
        annual: n * (n === 3 ? 147 : n === 10 ? 137 : 127) * 12 * 0.9,
    });

    const price = sizeOption(pricingSize);

    return (
        <div
            className="min-h-screen w-full relative overflow-x-hidden"
            style={{ background: "var(--vyz-bg)", color: "var(--vyz-text-primary)" }}
        >
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

            {/* Background atmospheric */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
                <div
                    className="absolute inset-x-0 top-0 h-[900px]"
                    style={{ background: "var(--vyz-gradient-top-glow)" }}
                />
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "80px 80px",
                    }}
                />
                <div
                    className="absolute top-[40%] -left-[10%] w-[800px] h-[800px] rounded-full blur-[120px]"
                    style={{ background: "rgba(0,227,122,0.06)" }}
                />
                <div
                    className="absolute bottom-[10%] -right-[10%] w-[700px] h-[700px] rounded-full blur-[120px]"
                    style={{ background: "rgba(21,86,192,0.06)" }}
                />
            </div>

            <LandingNav
                onCTAClick={() => {
                    trackEvent("saas_b2b_nav_cta_click");
                    window.location.href = SCHEDULE_URL;
                }}
                onLoginClick={() => navigate("/auth")}
            />

            {/* ═════════════════════ HERO ═════════════════════ */}
            <section className="relative pt-32 md:pt-40 pb-20 px-6 max-w-6xl mx-auto">
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{
                        background: "var(--vyz-accent-soft-8)",
                        border: "1px solid var(--vyz-accent-border)",
                        color: "var(--vyz-accent)",
                    }}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--vyz-accent)", boxShadow: "0 0 8px var(--vyz-accent)" }}
                    />
                    Vyzon para SaaS B2B
                </div>

                <h1
                    className="font-heading text-white mb-7"
                    style={{
                        fontSize: "clamp(2.5rem, 7vw, 5rem)",
                        lineHeight: 1.02,
                        letterSpacing: "-0.04em",
                        fontWeight: 800,
                        maxWidth: "900px",
                    }}
                >
                    O CRM que teu time
                    <br />
                    <span style={{ background: "var(--vyz-gradient-dual)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                        SDR + Closer
                    </span>{" "}
                    merece.
                </h1>

                <p
                    className="text-xl md:text-2xl max-w-3xl leading-relaxed"
                    style={{ color: "var(--vyz-text)" }}
                >
                    Pipeline por conta, ranking ao vivo empurrando meta, Eva IA cobrando lead
                    parado e WhatsApp dentro do card do deal. Em Real, sem câmbio, sem planilha
                    paralela.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                    <a
                        href={SCHEDULE_URL}
                        onClick={() => trackEvent("saas_b2b_hero_demo_click")}
                        className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl font-semibold transition"
                        style={{
                            background: "var(--vyz-gradient-accent)",
                            color: "#06080a",
                            boxShadow: "var(--vyz-shadow-cta)",
                        }}
                    >
                        <Calendar className="h-4 w-4" />
                        Agendar demo de 15 min
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </a>
                    <a
                        href="#comparativo"
                        className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-medium transition"
                        style={{
                            background: "var(--vyz-surface-1)",
                            border: "1px solid var(--vyz-border-strong)",
                            color: "var(--vyz-text-strong)",
                        }}
                    >
                        Ver comparativo
                    </a>
                </div>

                {/* Métricas de ancoragem */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-4xl">
                    {[
                        { label: "Cobrança em", value: "BRL", accent: "var(--vyz-accent)" },
                        { label: "Setup", value: "~1 dia", accent: "var(--vyz-brand-blue-light)" },
                        { label: "WhatsApp nativo", value: "Evolution", accent: "var(--vyz-accent)" },
                        { label: "Teste grátis", value: "14 dias", accent: "var(--vyz-brand-blue-light)" },
                    ].map((m) => (
                        <div
                            key={m.label}
                            className="p-4 md:p-5 rounded-xl text-center"
                            style={{
                                background: "var(--vyz-surface-1)",
                                border: "1px solid var(--vyz-border)",
                            }}
                        >
                            <div
                                className="text-2xl md:text-3xl font-bold tracking-tight font-heading"
                                style={{ color: m.accent }}
                            >
                                {m.value}
                            </div>
                            <div
                                className="text-[11px] md:text-xs mt-1 uppercase tracking-wider font-medium"
                                style={{ color: "var(--vyz-text-dim)" }}
                            >
                                {m.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═════════════════════ PAIN POINTS ═════════════════════ */}
            <section className="relative px-6 max-w-6xl mx-auto pb-24 pt-8">
                <div className="mb-12 max-w-3xl">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "#EF4444" }}
                    >
                        Onde dói
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Teu time comercial perde
                        <br />
                        <span style={{ color: "#EF4444" }}>~30% de receita</span> em fricção.
                    </h2>
                    <p className="mt-5 text-lg" style={{ color: "var(--vyz-text)" }}>
                        São as 4 dores que a gente escuta em toda conversation com Head of Sales de
                        SaaS B2B brasileiro. O problema não é o produto que você vende, é a falta
                        de um CRM que o time usa de verdade.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {PAIN_POINTS.map((p, i) => {
                        const Icon = p.icon;
                        return (
                            <div
                                key={i}
                                className="p-6 md:p-7 rounded-2xl transition hover:translate-y-[-2px]"
                                style={{
                                    background: "var(--vyz-surface-1)",
                                    border: "1px solid var(--vyz-border-strong)",
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: "rgba(239,68,68,0.1)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                        }}
                                    >
                                        <Icon className="h-5 w-5" style={{ color: "#EF4444" }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3
                                            className="text-lg md:text-xl font-bold mb-2 leading-tight"
                                            style={{ color: "var(--vyz-text-primary)" }}
                                        >
                                            {p.title}
                                        </h3>
                                        <p
                                            className="text-[15px] leading-relaxed"
                                            style={{ color: "var(--vyz-text)" }}
                                        >
                                            {p.body}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═════════════════════ PIPELINE MOCKUP ═════════════════════ */}
            <section className="relative px-6 max-w-6xl mx-auto pb-24">
                <div className="mb-12 max-w-3xl">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "var(--vyz-accent)" }}
                    >
                        Como funciona
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Um card de deal SaaS B2B
                        <br />
                        no <span style={{ color: "var(--vyz-accent)" }}>Vyzon</span>.
                    </h2>
                </div>

                <div
                    className="rounded-3xl p-6 md:p-10 relative overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(180deg, rgba(0,227,122,0.06), rgba(255,255,255,0.01))",
                        border: "1px solid var(--vyz-accent-border)",
                        boxShadow: "0 40px 120px -30px rgba(0,227,122,0.15)",
                    }}
                >
                    <div className="grid md:grid-cols-5 gap-6">
                        {/* Card principal */}
                        <div
                            className="md:col-span-3 p-5 md:p-6 rounded-2xl"
                            style={{
                                background: "var(--vyz-surface-2)",
                                border: "1px solid var(--vyz-border-strong)",
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div
                                        className="text-[11px] uppercase tracking-wider font-bold mb-1"
                                        style={{ color: "var(--vyz-accent)" }}
                                    >
                                        SQL → Proposta enviada
                                    </div>
                                    <div
                                        className="font-heading text-xl font-bold"
                                        style={{ color: "var(--vyz-text-primary)" }}
                                    >
                                        Contratar Pipeline Analytics — Tractorize.ai
                                    </div>
                                </div>
                                <div
                                    className="px-3 py-1.5 rounded-lg text-sm font-bold font-heading"
                                    style={{
                                        background: "var(--vyz-accent-soft-12)",
                                        color: "var(--vyz-accent)",
                                    }}
                                >
                                    R$ 45k MRR
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-5 text-[11px]">
                                {["Inbound LinkedIn", "Ciclo 45 dias", "5 stakeholders", "SDR: Mariana → Closer: Thiago"].map((t) => (
                                    <span
                                        key={t}
                                        className="px-2.5 py-1 rounded-md"
                                        style={{
                                            background: "var(--vyz-surface-3)",
                                            border: "1px solid var(--vyz-border)",
                                            color: "var(--vyz-text-soft)",
                                        }}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>

                            {/* Timeline */}
                            <div className="space-y-2.5">
                                {[
                                    { when: "hoje 14h32", what: "Eva IA: 3 dias sem touch, sugerido follow-up", accent: "var(--vyz-accent)", icon: "eva" },
                                    { when: "ontem", what: "Thiago: enviou proposta PDF anexo", accent: "var(--vyz-brand-blue-light)" },
                                    { when: "2 dias", what: "Demo realizada: 5 stakeholders, feedback positivo", accent: "var(--vyz-text-soft)" },
                                    { when: "1 semana", what: "SDR Mariana: SQL entregue após 3 ligações", accent: "var(--vyz-text-soft)" },
                                    { when: "2 semanas", what: "Origem: LinkedIn outbound by Mariana", accent: "var(--vyz-text-dim)" },
                                ].map((e, i) => (
                                    <div
                                        key={i}
                                        className="flex gap-3 items-start p-3 rounded-lg"
                                        style={{
                                            background: i === 0 ? "var(--vyz-accent-soft-6)" : "var(--vyz-surface-1)",
                                            border: `1px solid ${i === 0 ? "var(--vyz-accent-border)" : "var(--vyz-border)"}`,
                                        }}
                                    >
                                        {e.icon === "eva" ? (
                                            <EvaAvatar size={20} />
                                        ) : (
                                            <span
                                                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                                style={{ background: e.accent }}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="text-[11px] uppercase tracking-wider font-bold mb-0.5"
                                                style={{ color: "var(--vyz-text-dim)" }}
                                            >
                                                {e.when}
                                            </div>
                                            <div
                                                className="text-[13px]"
                                                style={{ color: "var(--vyz-text)" }}
                                            >
                                                {e.what}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Eva sugere */}
                        <div
                            className="md:col-span-2 p-5 md:p-6 rounded-2xl relative"
                            style={{
                                background: "linear-gradient(180deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))",
                                border: "1px solid rgba(139,92,246,0.25)",
                            }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <EvaAvatar size={28} thinking />
                                <div
                                    className="text-[11px] uppercase tracking-wider font-bold"
                                    style={{ color: "#a78bfa" }}
                                >
                                    Eva sugere follow-up
                                </div>
                            </div>

                            <div
                                className="p-4 rounded-xl mb-4"
                                style={{
                                    background: "rgba(0,0,0,0.25)",
                                    border: "1px solid var(--vyz-border-strong)",
                                }}
                            >
                                <div
                                    className="text-[13px] leading-relaxed"
                                    style={{ color: "var(--vyz-text-strong)" }}
                                >
                                    Oi Ricardo, lembrei que ontem a Bruna mencionou dúvida sobre
                                    roll-out faseado. Preparei um esboço de cronograma em 3 etapas
                                    pra mostrar como outros clientes fizeram. Quer que agende 15
                                    min pra passar rápido?
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {["Enviar no WhatsApp", "Editar", "Pular"].map((t, i) => (
                                    <button
                                        key={t}
                                        className="px-3 py-2 rounded-lg text-[12px] font-semibold transition"
                                        style={{
                                            background: i === 0 ? "var(--vyz-accent)" : "var(--vyz-surface-2)",
                                            color: i === 0 ? "#06080a" : "var(--vyz-text-strong)",
                                            border: i === 0 ? "1px solid transparent" : "1px solid var(--vyz-border)",
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <div
                                className="mt-4 text-[11px] leading-relaxed"
                                style={{ color: "var(--vyz-text-dim)" }}
                            >
                                Eva adapta o tom e conteúdo baseado no estágio, histórico de
                                conversa e perfil da conta.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═════════════════════ FEATURES ═════════════════════ */}
            <section className="relative px-6 max-w-6xl mx-auto pb-24">
                <div className="mb-12 max-w-3xl">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "var(--vyz-brand-blue-light)" }}
                    >
                        O stack de vendas
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Quatro features que
                        <br />
                        <span style={{ color: "var(--vyz-accent)" }}>resolvem 80%</span> da dor.
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon;
                        const isEva = f.title.toLowerCase().includes("eva");
                        return (
                            <div
                                key={i}
                                className="p-7 md:p-8 rounded-2xl relative overflow-hidden"
                                style={{
                                    background: "var(--vyz-surface-1)",
                                    border: "1px solid var(--vyz-border-strong)",
                                }}
                            >
                                <div className="flex items-start gap-4 mb-5">
                                    <div
                                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: "var(--vyz-accent-soft-12)",
                                            border: "1px solid var(--vyz-accent-border)",
                                        }}
                                    >
                                        {isEva ? <EvaAvatar size={28} /> : <Icon className="h-5 w-5" style={{ color: "var(--vyz-accent)" }} />}
                                    </div>
                                    <div>
                                        <h3
                                            className="font-heading text-xl md:text-2xl font-bold tracking-tight leading-tight mb-2"
                                            style={{ color: "var(--vyz-text-primary)" }}
                                        >
                                            {f.title}
                                        </h3>
                                        <p
                                            className="text-[15px] leading-relaxed"
                                            style={{ color: "var(--vyz-text)" }}
                                        >
                                            {f.body}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="grid grid-cols-2 gap-3 pt-5"
                                    style={{ borderTop: "1px solid var(--vyz-border)" }}
                                >
                                    {f.stats.map((s) => (
                                        <div key={s.label}>
                                            <div
                                                className="text-[11px] uppercase tracking-wider font-bold mb-1"
                                                style={{ color: "var(--vyz-text-dim)" }}
                                            >
                                                {s.label}
                                            </div>
                                            <div
                                                className="text-[14px] font-bold font-heading"
                                                style={{ color: "var(--vyz-accent)" }}
                                            >
                                                {s.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═════════════════════ COMPARATIVO ═════════════════════ */}
            <section id="comparativo" className="relative px-6 max-w-6xl mx-auto pb-24">
                <div className="mb-12 max-w-3xl">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "#F5B84A" }}
                    >
                        Vs concorrentes
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Os 3 CRMs B2B
                        <br />
                        que teu time considera.
                    </h2>
                </div>

                {/* Desktop: table */}
                <div
                    className="hidden md:block rounded-2xl overflow-hidden"
                    style={{
                        background: "var(--vyz-surface-1)",
                        border: "1px solid var(--vyz-border-strong)",
                    }}
                >
                    <div
                        className="grid grid-cols-[1.4fr_1fr_1fr_1fr] px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-bold"
                        style={{
                            background: "var(--vyz-surface-2)",
                            borderBottom: "1px solid var(--vyz-border-strong)",
                        }}
                    >
                        <div style={{ color: "var(--vyz-text-dim)" }}>Critério</div>
                        <div style={{ color: "var(--vyz-accent)" }}>Vyzon</div>
                        <div style={{ color: "var(--vyz-text-soft)" }}>HubSpot</div>
                        <div style={{ color: "var(--vyz-text-soft)" }}>Pipedrive</div>
                    </div>
                    {COMPARISON.map((row, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1.4fr_1fr_1fr_1fr] px-6 py-5"
                            style={{
                                borderBottom: i === COMPARISON.length - 1 ? "none" : "1px solid var(--vyz-border)",
                                background: i % 2 === 0 ? "rgba(255,255,255,0.008)" : "transparent",
                            }}
                        >
                            <div className="text-[14px] font-medium" style={{ color: "var(--vyz-text-strong)" }}>
                                {row.label}
                            </div>
                            <div
                                className="text-[14px] font-semibold"
                                style={{ color: "var(--vyz-accent)" }}
                            >
                                <span className="inline-flex items-center gap-1">
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    {row.vyzon}
                                </span>
                            </div>
                            <div className="text-[14px]" style={{ color: "var(--vyz-text)" }}>{row.hubspot}</div>
                            <div className="text-[14px]" style={{ color: "var(--vyz-text)" }}>{row.pipedrive}</div>
                        </div>
                    ))}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                    {COMPARISON.map((row, i) => (
                        <div
                            key={i}
                            className="p-4 rounded-xl"
                            style={{
                                background: "var(--vyz-surface-1)",
                                border: "1px solid var(--vyz-border)",
                            }}
                        >
                            <div
                                className="text-[11px] uppercase tracking-wider font-bold mb-3"
                                style={{ color: "var(--vyz-text-dim)" }}
                            >
                                {row.label}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[12px]">
                                <div className="p-2 rounded-lg" style={{ background: "var(--vyz-accent-soft-8)", border: "1px solid var(--vyz-accent-border)" }}>
                                    <div className="text-[9px] font-bold uppercase mb-1" style={{ color: "var(--vyz-accent)" }}>Vyzon</div>
                                    <div className="font-semibold" style={{ color: "var(--vyz-accent)" }}>{row.vyzon}</div>
                                </div>
                                <div className="p-2 rounded-lg" style={{ background: "var(--vyz-surface-1)", border: "1px solid var(--vyz-border)" }}>
                                    <div className="text-[9px] font-bold uppercase mb-1" style={{ color: "var(--vyz-text-dim)" }}>HubSpot</div>
                                    <div style={{ color: "var(--vyz-text)" }}>{row.hubspot}</div>
                                </div>
                                <div className="p-2 rounded-lg" style={{ background: "var(--vyz-surface-1)", border: "1px solid var(--vyz-border)" }}>
                                    <div className="text-[9px] font-bold uppercase mb-1" style={{ color: "var(--vyz-text-dim)" }}>Pipedrive</div>
                                    <div style={{ color: "var(--vyz-text)" }}>{row.pipedrive}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    className="mt-5 text-[11px]"
                    style={{ color: "var(--vyz-text-dim)" }}
                >
                    * Valores em USD convertidos com câmbio R$ 5 e IOF 6,38%. Consulte sites
                    oficiais pra valores atualizados.{" "}
                    <a
                        href="/alternativa-hubspot"
                        className="underline transition"
                        style={{ color: "var(--vyz-accent)" }}
                    >
                        Ver comparativo completo vs HubSpot
                    </a>{" "}
                    e{" "}
                    <a
                        href="/alternativa-pipedrive"
                        className="underline transition"
                        style={{ color: "var(--vyz-accent)" }}
                    >
                        vs Pipedrive
                    </a>.
                </div>
            </section>

            {/* ═════════════════════ CENÁRIOS ═════════════════════ */}
            <section className="relative px-6 max-w-6xl mx-auto pb-24">
                <div className="mb-12 max-w-3xl">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "#8B5CF6" }}
                    >
                        Cenários reais
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Três operações
                        <br />
                        SaaS B2B no Vyzon.
                    </h2>
                </div>

                <div className="space-y-4">
                    {SCENARIOS.map((s, i) => (
                        <div
                            key={i}
                            className="p-7 md:p-8 rounded-2xl"
                            style={{
                                background: "var(--vyz-surface-1)",
                                border: "1px solid var(--vyz-border-strong)",
                            }}
                        >
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span
                                    className="text-[11px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-md"
                                    style={{
                                        background: "var(--vyz-accent-soft-8)",
                                        color: "var(--vyz-accent)",
                                    }}
                                >
                                    {s.role}
                                </span>
                                <span
                                    className="text-[12px]"
                                    style={{ color: "var(--vyz-text-dim)" }}
                                >
                                    {s.team}
                                </span>
                            </div>

                            <h3
                                className="font-heading text-xl md:text-2xl font-bold tracking-tight mb-3"
                                style={{ color: "var(--vyz-text-primary)" }}
                            >
                                {s.title}
                            </h3>

                            <p
                                className="text-[15px] leading-relaxed mb-4"
                                style={{ color: "var(--vyz-text)" }}
                            >
                                {s.body}
                            </p>

                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold"
                                style={{
                                    background: "var(--vyz-accent-soft-8)",
                                    border: "1px solid var(--vyz-accent-border)",
                                    color: "var(--vyz-accent)",
                                }}
                            >
                                <TrendingUp className="h-4 w-4" />
                                {s.result}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═════════════════════ PRICING CALCULATOR ═════════════════════ */}
            <section className="relative px-6 max-w-6xl mx-auto pb-24">
                <div className="mb-12 max-w-3xl">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "var(--vyz-accent)" }}
                    >
                        Preço transparente
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Escala por usuário,
                        <br />
                        em <span style={{ color: "var(--vyz-accent)" }}>Real</span>.
                    </h2>
                </div>

                <div
                    className="rounded-3xl p-8 md:p-12"
                    style={{
                        background:
                            "linear-gradient(180deg, rgba(0,227,122,0.05), rgba(255,255,255,0.01))",
                        border: "1px solid var(--vyz-accent-border)",
                    }}
                >
                    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                        <span
                            className="text-[13px] font-medium"
                            style={{ color: "var(--vyz-text)" }}
                        >
                            Quantos vendedores tu tem?
                        </span>
                        <div
                            className="flex rounded-xl overflow-hidden"
                            style={{
                                background: "var(--vyz-surface-2)",
                                border: "1px solid var(--vyz-border-strong)",
                            }}
                        >
                            {[3, 10, 20].map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setPricingSize(n as 3 | 10 | 20)}
                                    className="px-5 py-2 text-sm font-bold transition"
                                    style={{
                                        background: pricingSize === n ? "var(--vyz-accent)" : "transparent",
                                        color: pricingSize === n ? "#06080a" : "var(--vyz-text)",
                                    }}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div
                            className="p-6 rounded-2xl text-center"
                            style={{
                                background: "var(--vyz-surface-2)",
                                border: "1px solid var(--vyz-border-strong)",
                            }}
                        >
                            <div
                                className="text-[11px] uppercase tracking-wider font-bold mb-2"
                                style={{ color: "var(--vyz-text-dim)" }}
                            >
                                Preço por user
                            </div>
                            <div
                                className="font-heading text-4xl md:text-5xl font-bold tracking-tight"
                                style={{ color: "var(--vyz-accent)" }}
                            >
                                R$ {price.base}
                            </div>
                            <div className="text-[12px] mt-1" style={{ color: "var(--vyz-text-dim)" }}>
                                / mês
                            </div>
                        </div>

                        <div
                            className="p-6 rounded-2xl text-center"
                            style={{
                                background: "var(--vyz-accent-soft-8)",
                                border: "1px solid var(--vyz-accent-border-strong)",
                            }}
                        >
                            <div
                                className="text-[11px] uppercase tracking-wider font-bold mb-2"
                                style={{ color: "var(--vyz-accent)" }}
                            >
                                Total time de {pricingSize}
                            </div>
                            <div
                                className="font-heading text-4xl md:text-5xl font-bold tracking-tight"
                                style={{ color: "var(--vyz-accent)" }}
                            >
                                R$ {price.total.toLocaleString("pt-BR")}
                            </div>
                            <div className="text-[12px] mt-1" style={{ color: "var(--vyz-text-dim)" }}>
                                / mês
                            </div>
                        </div>

                        <div
                            className="p-6 rounded-2xl text-center"
                            style={{
                                background: "var(--vyz-surface-2)",
                                border: "1px solid var(--vyz-border-strong)",
                            }}
                        >
                            <div
                                className="text-[11px] uppercase tracking-wider font-bold mb-2"
                                style={{ color: "var(--vyz-text-dim)" }}
                            >
                                Anual (10% off)
                            </div>
                            <div
                                className="font-heading text-4xl md:text-5xl font-bold tracking-tight"
                                style={{ color: "var(--vyz-text-primary)" }}
                            >
                                R$ {Math.round(price.annual).toLocaleString("pt-BR")}
                            </div>
                            <div className="text-[12px] mt-1" style={{ color: "var(--vyz-text-dim)" }}>
                                / ano
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-3 mt-8 text-center">
                        {["WhatsApp Evolution incluído", "Eva IA incluída", "Ranking ao vivo incluído", "Suporte em português"].map((t) => (
                            <div
                                key={t}
                                className="p-3 rounded-lg flex items-center gap-2 justify-center"
                                style={{
                                    background: "var(--vyz-surface-2)",
                                    border: "1px solid var(--vyz-border)",
                                }}
                            >
                                <Check className="h-3.5 w-3.5" style={{ color: "var(--vyz-accent)" }} strokeWidth={3} />
                                <span className="text-[12px] font-medium" style={{ color: "var(--vyz-text-strong)" }}>
                                    {t}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═════════════════════ EARLY ACCESS ═════════════════════ */}
            <section className="relative px-6 max-w-6xl mx-auto pb-24">
                <div
                    className="p-8 md:p-12 rounded-3xl relative overflow-hidden"
                    style={{
                        background: "var(--vyz-gradient-dual)",
                        border: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <div aria-hidden className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(255,255,255,0.25), transparent 60%)" }} />

                    <div className="relative z-10 grid md:grid-cols-[2fr_1fr] gap-8 items-end">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-[11px] font-bold uppercase tracking-[0.25em]"
                                style={{
                                    background: "rgba(6,8,10,0.35)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "#06080a",
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#06080a" }} />
                                Early Access
                            </div>

                            <h2
                                className="font-heading text-3xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-4"
                                style={{ color: "#06080a" }}
                            >
                                10 vagas de
                                <br />
                                parceiros fundadores.
                            </h2>

                            <p className="text-[15px] md:text-lg leading-relaxed" style={{ color: "rgba(6,8,10,0.8)" }}>
                                3 meses grátis em troca de entrevistas mensais e depoimento público.
                                Depois, R$ 97/usuário vitalício (34% off do preço oficial).
                            </p>

                            <a
                                href={SCHEDULE_URL}
                                onClick={() => trackEvent("saas_b2b_early_access_click")}
                                className="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold transition"
                                style={{
                                    background: "#06080a",
                                    color: "var(--vyz-accent)",
                                    boxShadow: "0 12px 40px -12px rgba(0,0,0,0.5)",
                                }}
                            >
                                <Calendar className="h-4 w-4" />
                                Candidatar time
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {EARLY_ACCESS.map((it) => (
                                <div
                                    key={it.label}
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: "rgba(6,8,10,0.25)",
                                        border: "1px solid rgba(6,8,10,0.2)",
                                    }}
                                >
                                    <div
                                        className="text-[11px] uppercase tracking-wider font-bold mb-1"
                                        style={{ color: "rgba(6,8,10,0.6)" }}
                                    >
                                        {it.label}
                                    </div>
                                    <div
                                        className="font-heading text-lg font-bold"
                                        style={{ color: "#06080a" }}
                                    >
                                        {it.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═════════════════════ FAQ ═════════════════════ */}
            <section className="relative px-6 max-w-4xl mx-auto pb-24">
                <div className="mb-12">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: "#F5B84A" }}
                    >
                        Perguntas reais de CRO e Head of Sales
                    </div>
                    <h2
                        className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]"
                        style={{ color: "var(--vyz-text-primary)" }}
                    >
                        Dúvidas antes
                        <br />
                        da primeira <span style={{ color: "#F5B84A" }}>demo</span>.
                    </h2>
                </div>

                <div className="space-y-3">
                    {FAQ.map((item, i) => (
                        <details
                            key={i}
                            className="group p-5 md:p-6 rounded-xl transition"
                            style={{
                                background: "var(--vyz-surface-1)",
                                border: "1px solid var(--vyz-border-strong)",
                            }}
                        >
                            <summary className="cursor-pointer flex items-center justify-between gap-4 list-none">
                                <span className="text-[15px] md:text-base font-semibold" style={{ color: "var(--vyz-text-primary)" }}>
                                    {item.q}
                                </span>
                                <span
                                    className="text-2xl leading-none transition-transform group-open:rotate-45 flex-shrink-0"
                                    style={{ color: "#F5B84A" }}
                                >
                                    +
                                </span>
                            </summary>
                            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--vyz-text)" }}>
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* ═════════════════════ CTA final ═════════════════════ */}
            <LazyOnVisible minHeight="400px">
                <Suspense fallback={null}>
                    <FinalCTA
                        onCTAClick={() => {
                            trackEvent("saas_b2b_final_cta");
                            window.location.href = SCHEDULE_URL;
                        }}
                        onScheduleDemoClick={() => {
                            trackEvent("saas_b2b_final_schedule");
                            window.location.href = SCHEDULE_URL;
                        }}
                    />
                </Suspense>
            </LazyOnVisible>
        </div>
    );
};

export default ForSaasB2B;
