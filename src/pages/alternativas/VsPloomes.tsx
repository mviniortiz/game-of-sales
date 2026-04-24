import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Check,
    ArrowRight,
    CircleAlert,
    TrendingUp,
    MessageSquare,
    Users,
    Webhook,
    Trophy,
    Wallet,
    Calendar,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { trackEvent } from "@/lib/analytics";

const C = {
    brand: "#00E37A",
    brandDim: "#00B266",
    blue: "#1556C0",
    violet: "#8B5CF6",
    gold: "#F5B84A",
};

type Row = {
    label: string;
    vyzon: { text: string; good?: boolean };
    ploomes: { text: string; note?: string };
};

const COMPARISON: Row[] = [
    {
        label: "Preço por usuário",
        vyzon: { text: "A partir de R$ 147 / mês", good: true },
        ploomes: { text: "A partir de R$ 167 / mês*", note: "plano Starter com mínimo de 3 usuários" },
    },
    {
        label: "Mínimo de usuários",
        vyzon: { text: "1 usuário", good: true },
        ploomes: { text: "3 usuários*", note: "contrato não fecha abaixo disso" },
    },
    {
        label: "WhatsApp no CRM",
        vyzon: { text: "Evolution API nativa", good: true },
        ploomes: { text: "Via integração paga", note: "conector WhatsApp oficial ou parceiro" },
    },
    {
        label: "Hotmart, Kiwify, Greenn",
        vyzon: { text: "Webhook nativo", good: true },
        ploomes: { text: "Via Zapier ou custom", note: "sem conector oficial nativo" },
    },
    {
        label: "Gamificação e ranking ao vivo",
        vyzon: { text: "Nativo, tempo real", good: true },
        ploomes: { text: "Dashboards custom", note: "configuração manual com relatórios" },
    },
    {
        label: "IA que cobra lead parado",
        vyzon: { text: "Eva IA nativa", good: true },
        ploomes: { text: "Automações tradicionais", note: "regras if/then, sem IA generativa" },
    },
    {
        label: "Setup completo",
        vyzon: { text: "Self-service, ~1 dia", good: true },
        ploomes: { text: "Self-service ou assistido", note: "time pequeno configura em dias, enterprise com CS em 2 a 4 semanas" },
    },
    {
        label: "Teste grátis",
        vyzon: { text: "14 dias self-service", good: true },
        ploomes: { text: "Tem trial", note: "disponível no fluxo online, alguns planos requerem contato" },
    },
    {
        label: "Interface",
        vyzon: { text: "Dark mode, Linear-style", good: true },
        ploomes: { text: "Tradicional robusta", note: "mais densa em funcionalidades, curva de aprendizado maior" },
    },
    {
        label: "Foco principal",
        vyzon: { text: "Time ágil com WhatsApp", good: true },
        ploomes: { text: "B2B enterprise", note: "indústria, serviços, propostas formais, account management" },
    },
    {
        label: "CPQ e faturamento",
        vyzon: { text: "Pipeline com anexos" },
        ploomes: { text: "Módulo completo", note: "ponto forte: propostas, CPQ, integração Bling/Omie/TOTVS" },
    },
    {
        label: "Relatórios e BI",
        vyzon: { text: "Dashboards nativos" },
        ploomes: { text: "BI aprofundado", note: "ponto forte: relatórios custom, pivots e analytics avançados" },
    },
];

type Feature = {
    icon: typeof MessageSquare;
    isEva?: boolean;
    accent: string;
    title: string;
    pitch: string;
    vyzonSteps: string[];
    ploomesSteps: string[];
    outcome: string;
};

const FEATURES: Feature[] = [
    {
        icon: MessageSquare,
        accent: C.brand,
        title: "WhatsApp direto no deal, sem extra",
        pitch: "O Ploomes suporta WhatsApp via conector oficial ou parceiro pago. No Vyzon, o número do seu time se conecta via QR code e o chat abre dentro do próprio pipeline.",
        vyzonSteps: [
            "QR code em 3 minutos pelo Evolution API, sem custo adicional",
            "Conversas antigas e novas sincronizam com o deal correspondente",
            "Template de mensagem por estágio, variável de nome e oferta",
            "Histórico fica anexo ao lead, auditável pelo gestor",
        ],
        ploomesSteps: [
            "Contratar conector WhatsApp oficial do Meta ou parceiro homologado",
            "Configurar integração no painel, mapear números do time",
            "Treinar o time pra caixa de entrada separada do deal",
            "Acompanhar custo por conversa ou assinatura mensal do add-on",
        ],
        outcome: "Zero custo adicional, zero fricção. O WhatsApp é cidadão de primeira classe no Vyzon.",
    },
    {
        icon: Webhook,
        accent: C.blue,
        title: "Infoprodutor: venda da Hotmart vira deal em segundos",
        pitch: "O Ploomes foi feito pra indústria e serviço B2B tradicional. O Vyzon nasceu com infoprodutor em mente, então Hotmart, Kiwify, Greenn e Eduzz entram direto por webhook.",
        vyzonSteps: [
            "No Vyzon, abre Integrações → Hotmart, gera URL de webhook com secret",
            "Cola a URL no painel do produtor em Ferramentas → Webhook",
            "Próxima venda cria deal com nome, email, telefone, produto e origem",
            "Pipeline tem templates nativos pra lançamento, perpétuo, esteira e boleto",
        ],
        ploomesSteps: [
            "Conectar Zapier ou Make ao Ploomes (custo extra mensal)",
            "Criar zap Hotmart → Zapier → Ploomes Deal, mapear campos no braço",
            "Debugar payload, manter zap quando a API da plataforma muda",
            "Replicar tudo isso pra Kiwify, Greenn, Eduzz separadamente",
        ],
        outcome: "Infoprodutor entra no pipeline sem middleware. Lançamento não perde lead em transição.",
    },
    {
        icon: Trophy,
        accent: C.gold,
        title: "Ranking ao vivo que muda o clima do time",
        pitch: "Gestão comercial não é relatório mensal. É ranking no telão, vendedor #5 fecha e sobe pra #2 em tempo real. No Vyzon isso é nativo. No Ploomes, é dashboard custom.",
        vyzonSteps: [
            "Define meta do mês (receita, nº deals ou % de pipeline fechado)",
            "Dashboard Ranking atualiza a cada deal movido pra Ganho",
            "Pódio com percentual de meta, receita e deals por pessoa",
            "Gatilho opcional: selo pra quem bater meta, alerta de streak quebrada",
        ],
        ploomesSteps: [
            "Criar dashboards custom com filtros e pivots manuais",
            "Dados atualizam por ciclo de sync, raramente em tempo real",
            "Gamificação avançada depende de relatórios custom ou plugins",
            "Gestor monta a rotina de premiação por fora do sistema",
        ],
        outcome: "Ranking nativo vira ritual do time, não relatório do gerente.",
    },
    {
        icon: MessageSquare, // placeholder, EvaAvatar renderizado via isEva flag
        isEva: true,
        accent: C.violet,
        title: "Eva IA lê o pipeline e cobra quem precisa",
        pitch: "O Ploomes tem automações tradicionais (regras if/then). O Vyzon tem Eva, uma IA generativa que lê o contexto do lead e redige a cobrança com tom próprio.",
        vyzonSteps: [
            "Eva roda a cada 6 horas analisando deals parados há mais de X dias",
            "Pra cada lead, ela propõe uma mensagem baseada em estágio e histórico",
            "Vendedor abre o chat, vê a sugestão, edita se quiser e manda com 1 clique",
            "Aprende com aceite/rejeição: mensagens que convertem aparecem mais",
        ],
        ploomesSteps: [
            "Configurar automação if-then: se deal parado há X dias, então cria tarefa",
            "Redigir texto padrão manualmente, sem adaptação por lead",
            "Sem aprendizado sobre o que fecha, cada campanha é do zero",
            "Para IA generativa, integrar ChatGPT/Claude por fora via API",
        ],
        outcome: "Eva escreve do jeito brasileiro de vender, não é template genérico.",
    },
];

const TCO = {
    headline: "Custo real por mês, time de 5 vendedores",
    subtitle:
        "Os dois cobram em Real, mas custo total não é só licença. Veja o que entra em cada lado quando o time roda de verdade.",
    vyzon: [
        { label: "Licença Vyzon Pro (5 usuários)", value: "R$ 985" },
        { label: "WhatsApp Evolution", value: "R$ 0" },
        { label: "Webhooks Hotmart/Kiwify", value: "R$ 0" },
        { label: "Onboarding self-service", value: "Incluído" },
        { label: "Eva IA", value: "Incluído" },
    ],
    vyzonTotal: "R$ 985",
    ploomes: [
        { label: "Ploomes Pro (5 usuários)*", value: "~R$ 1.335" },
        { label: "WhatsApp API (se usar)*", value: "R$ 200 a R$ 400" },
        { label: "Zapier (se usar Hotmart/Kiwify)*", value: "R$ 100 a R$ 150" },
        { label: "Onboarding one-time (opcional)*", value: "~R$ 125 / mês" },
        { label: "IA generativa (se usar externa)*", value: "~R$ 100" },
    ],
    ploomesTotal: "~R$ 1.860 / mês",
    note: "Cálculo com Ploomes plano Pro estimado em R$ 267 por usuário (consulte ploomes.com/precos pra valor atualizado). WhatsApp e Zapier são opcionais, só entram se o uso exigir. Onboarding one-time varia de R$ 1.000 a R$ 3.000 conforme escopo, diluído em 12 meses. Cenário sem esses add-ons fica mais próximo de R$ 1.335.",
};

const JOURNEY = {
    vyzon: [
        { day: "Dia 1", title: "Conta criada, WhatsApp conectado", detail: "Cadastro self-service, QR code, primeiro deal no pipeline." },
        { day: "Dia 2", title: "Import de leads via CSV", detail: "Mapeamento automático, 2 mil contatos em 5 minutos." },
        { day: "Dia 3", title: "Webhooks Hotmart/Kiwify", detail: "URL gerada no Vyzon, colada no painel do checkout." },
        { day: "Dia 7", title: "Time completo operando", detail: "5 vendedores treinados, ranking ao vivo, Eva cobrando lead parado." },
    ],
    ploomes: [
        { day: "Semana 1", title: "Demo ou trial self-service", detail: "Time pequeno pode ir self-service. Enterprise agenda demo e negocia escopo." },
        { day: "Semana 2", title: "Configuração de pipeline", detail: "Propriedades custom, estágios, automações if-then. CS ajuda em planos maiores." },
        { day: "Semana 3-4", title: "Integrações adicionais", detail: "Bling/Omie/TOTVS conectados. Zapier pra Hotmart/Kiwify se aplicável." },
        { day: "Semana 5-6", title: "Treinamento e rotina", detail: "Time aprende a interface robusta, primeiros deals fechados no pipeline." },
    ],
};

const SCENARIOS = [
    {
        icon: TrendingUp,
        accent: C.brand,
        tint: "rgba(0,227,122,0.08)",
        border: "rgba(0,227,122,0.25)",
        title: "Infoprodutor com lançamento via Hotmart",
        body: "Lançamento com 3 mil inscritos no evento. Vendedor precisa abordar cada compra no WhatsApp em minutos. No Vyzon, webhook da Hotmart cria o deal e o chat abre ao lado. No Ploomes, você configura Zapier e ainda precisa do conector WhatsApp pago pra o time conversar.",
    },
    {
        icon: Users,
        accent: C.blue,
        tint: "rgba(21,86,192,0.08)",
        border: "rgba(21,86,192,0.28)",
        title: "SaaS B2B com ciclo de venda curto (1 a 4 semanas)",
        body: "Time de 5 SDRs que vivem no WhatsApp prospectando. O Ploomes é robusto pra ciclo longo B2B tradicional com propostas formais. O Vyzon é mais leve e rápido pra quem fecha no chat, não em reunião de 1 hora.",
    },
    {
        icon: MessageSquare,
        accent: C.violet,
        tint: "rgba(139,92,246,0.08)",
        border: "rgba(139,92,246,0.28)",
        title: "Time pequeno querendo começar sem consultoria",
        body: "O Ploomes opera bem com onboarding assistido (R$ 2.000 típico). Se seu time tem 2 a 6 pessoas e você quer subir o CRM em uma tarde, o Vyzon é self-service. Dá teste grátis de 14 dias sem falar com vendedor.",
    },
];

const FAQ = [
    {
        q: "Se eu sou infoprodutor, qual é a diferença prática?",
        a: "O Ploomes foi desenhado pra B2B tradicional (indústria, serviços, SaaS enterprise). Webhooks de Hotmart, Kiwify, Greenn e Eduzz não têm conector nativo e precisam de Zapier. O Vyzon nasce com esses checkouts como integração nativa, pipeline templates de lançamento e esteira, e regras específicas pra recuperação de boleto vencido.",
    },
    {
        q: "Ploomes tem WhatsApp também, qual é a vantagem do Vyzon?",
        a: "O Ploomes integra WhatsApp via conector oficial do Meta ou parceiros, tipicamente com custo extra por conversa ou assinatura mensal. O Vyzon usa Evolution API que conecta seu próprio número via QR code, sem custo por mensagem, e o chat aparece direto no card do deal no pipeline.",
    },
    {
        q: "O Ploomes tem gamificação parecida com o ranking do Vyzon?",
        a: "O Ploomes permite dashboards custom com relatórios, mas não tem ranking ao vivo atualizando em tempo real de forma nativa. No Vyzon, o ranking é feature central: cada deal movido pra Ganho atualiza o pódio em tempo real, com meta, percentual e streak por vendedor.",
    },
    {
        q: "Como funciona a migração do Ploomes pro Vyzon?",
        a: "Você exporta contatos, empresas e deals do Ploomes em CSV. No Vyzon, vai em Configurações > Importar Dados e o mapeamento de campos é automático pros nomes padrão. Campos customizados você ajusta manualmente. Nos planos anuais, nossa equipe faz a migração assistida.",
    },
    {
        q: "O Ploomes tem IA também?",
        a: "O Ploomes tem automações tradicionais no modelo if-then (se deal parado X dias, então cria tarefa). Não tem IA generativa nativa que redija mensagem por lead. A Eva IA do Vyzon é generativa: lê histórico, estágio e contexto do lead e propõe texto de cobrança adaptado. Vendedor aprova com 1 clique.",
    },
    {
        q: "Quando faz mais sentido o Ploomes?",
        a: "Ploomes é forte em B2B tradicional com ciclo longo (3 a 12 meses), múltiplas propostas por deal, CPQ avançado, módulo de cotações, faturamento integrado com Bling, Omie e TOTVS. Se você vende serviços complexos pra indústria, construção ou consultoria com documentação formal, Ploomes tem mais profundidade nesses módulos. Também tem BI/relatórios mais densos e gestão de contas (account management) madura.",
    },
    {
        q: "Em que pontos o Ploomes é melhor que o Vyzon hoje?",
        a: "Honestamente: CPQ completo e propostas formais (o Vyzon tem pipeline com anexos, mas não módulo dedicado de propostas/cotações); integração nativa com sistemas de gestão brasileiros como Bling, Omie e TOTVS (o Vyzon integra via API ou webhook); relatórios BI com pivots e analytics avançados; e base de usuários consolidada com casos enterprise. Se teu processo depende disso, o Ploomes é escolha mais madura.",
    },
];

const VsPloomes = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Alternativa ao Ploomes | Vyzon, CRM com WhatsApp e Eva IA";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.content =
                "Vyzon vs Ploomes: CRM brasileiro pra time ágil que vende no WhatsApp, com integração nativa Hotmart/Kiwify, ranking ao vivo e IA generativa. Compare preço, features e quando cada um faz sentido.";
        }
        trackEvent("compare_page_view", { vs: "ploomes" });
    }, []);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Product",
                name: "Vyzon CRM",
                description:
                    "CRM brasileiro com WhatsApp nativo, integração Hotmart/Kiwify/Greenn, ranking ao vivo e Eva IA.",
                brand: { "@type": "Brand", name: "Vyzon" },
                offers: {
                    "@type": "AggregateOffer",
                    priceCurrency: "BRL",
                    lowPrice: "147",
                    highPrice: "297",
                    offerCount: "3",
                    url: "https://vyzon.com.br/",
                },
            },
            {
                "@type": "FAQPage",
                mainEntity: FAQ.map((it) => ({
                    "@type": "Question",
                    name: it.q,
                    acceptedAnswer: { "@type": "Answer", text: it.a },
                })),
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Vyzon", item: "https://vyzon.com.br/" },
                    { "@type": "ListItem", position: 2, name: "Alternativas", item: "https://vyzon.com.br/alternativas" },
                    { "@type": "ListItem", position: 3, name: "Vyzon vs Ploomes", item: "https://vyzon.com.br/alternativa-ploomes" },
                ],
            },
        ],
    };

    return (
        <div className="min-h-screen bg-[#06080a] text-white relative overflow-x-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />

            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    background: `
                        radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%),
                        radial-gradient(900px 500px at 90% 10%, rgba(245,184,74,0.05), transparent 60%)
                    `,
                }}
            />

            <LandingNav onCTAClick={() => { window.location.href = "/#agendar-demo"; }} onLoginClick={() => navigate("/auth")} />

            {/* HERO */}
            <section className="pt-28 md:pt-36 pb-20 px-6 max-w-5xl mx-auto relative">
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{
                        background: "rgba(0,227,122,0.08)",
                        border: `1px solid ${C.brand}33`,
                        color: C.brand,
                    }}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: C.brand, boxShadow: `0 0 8px ${C.brand}` }}
                    />
                    Vyzon vs Ploomes
                </div>

                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    O <span style={{ color: C.brand }}>CRM moderno</span>
                    <br />
                    pra quem vende
                    <br />
                    <span
                        style={{
                            background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                        }}
                    >
                        no WhatsApp
                    </span>
                    .
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    Ploomes é robusto pra B2B tradicional com propostas formais. Vyzon é pra time
                    ágil que fecha no chat, vive em lançamento de infoproduto e quer ranking ao
                    vivo empurrando meta. Dois mundos, mesma categoria, ICPs diferentes.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                    <button
                        onClick={() => { window.location.href = "/#agendar-demo"; }}
                        className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition"
                        style={{
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                            color: "#06080a",
                            boxShadow: `0 16px 40px -12px ${C.brand}55`,
                        }}
                    >
                        Testar 14 dias grátis
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </button>
                    <a
                        href="#comparativo"
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.9)",
                        }}
                    >
                        Ver comparativo
                    </a>
                </div>

                <div className="mt-14 grid grid-cols-3 gap-3 md:gap-6 max-w-xl">
                    {[
                        { label: "A partir de", value: "R$ 147", accent: C.brand },
                        { label: "Mínimo de users", value: "1", accent: C.gold },
                        { label: "Setup", value: "1 dia", accent: C.blue },
                    ].map((m) => (
                        <div
                            key={m.label}
                            className="p-3 md:p-4 rounded-xl text-center"
                            style={{
                                background: "rgba(255,255,255,0.025)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div
                                className="text-2xl md:text-3xl font-bold tracking-tight"
                                style={{ color: m.accent }}
                            >
                                {m.value}
                            </div>
                            <div className="text-[11px] md:text-xs text-white/45 mt-1 uppercase tracking-wider font-medium">
                                {m.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TL;DR */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div
                        className="p-7 rounded-2xl relative overflow-hidden"
                        style={{
                            background: "linear-gradient(180deg, rgba(0,227,122,0.06), rgba(0,227,122,0.015))",
                            border: `1px solid ${C.brand}33`,
                        }}
                    >
                        <div
                            className="absolute inset-0 -z-10 opacity-30"
                            style={{
                                background: `radial-gradient(600px 200px at 50% -50%, ${C.brand}22, transparent 70%)`,
                            }}
                        />
                        <div
                            className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase"
                            style={{ color: C.brand }}
                        >
                            Escolha o Vyzon se
                        </div>
                        <ul className="space-y-3 text-white/85 text-[15px]">
                            {[
                                "Seu time vive no WhatsApp, não em email",
                                "Vende infoproduto via Hotmart, Kiwify ou Greenn",
                                "Quer ranking ao vivo empurrando meta do time",
                                "Ciclo de venda curto (dias a semanas)",
                                "Team de 1 a 30 pessoas, setup em 1 dia",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span
                                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                        style={{ background: `${C.brand}22` }}
                                    >
                                        <Check className="h-3 w-3" style={{ color: C.brand }} strokeWidth={3} />
                                    </span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div
                        className="p-7 rounded-2xl"
                        style={{
                            background: "linear-gradient(180deg, rgba(245,184,74,0.04), rgba(245,184,74,0.01))",
                            border: `1px solid ${C.gold}2A`,
                        }}
                    >
                        <div
                            className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase"
                            style={{ color: C.gold }}
                        >
                            Fique com Ploomes se
                        </div>
                        <ul className="space-y-3 text-white/75 text-[15px]">
                            {[
                                "Vende B2B tradicional com ciclo de 3 a 12 meses",
                                "Precisa de CPQ, cotações e propostas formais robustas",
                                "Integra com Bling, Omie, TOTVS pra faturamento",
                                "Processo de indústria, construção ou consultoria",
                                "Valoriza BI/relatórios avançados e account management",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span
                                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                        style={{ background: `${C.gold}22` }}
                                    >
                                        <Check className="h-3 w-3" style={{ color: C.gold }} strokeWidth={3} />
                                    </span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* COMO FUNCIONA */}
            <section id="como-funciona" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.blue }}
                    >
                        Como funciona
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        Quatro fluxos onde
                        <br />
                        o <span style={{ color: C.brand }}>Vyzon ganha</span> mais limpo.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">
                        Features centrais do dia a dia comercial comparadas lado a lado, com fluxo
                        real de cada ferramenta.
                    </p>
                </div>

                <div className="space-y-5">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div
                                key={i}
                                className="rounded-2xl overflow-hidden"
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                <div
                                    className="p-6 md:p-8"
                                    style={{
                                        background: `linear-gradient(135deg, ${f.accent}10, transparent 50%)`,
                                        borderBottom: `1px solid ${f.accent}25`,
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                                            style={{
                                                background: `${f.accent}18`,
                                                border: `1px solid ${f.accent}40`,
                                            }}
                                        >
                                            {f.isEva ? (
                                                <EvaAvatar size={28} />
                                            ) : (
                                                <Icon className="h-5 w-5" style={{ color: f.accent }} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                                                {f.title}
                                            </h3>
                                            <p
                                                className="text-[15px] leading-relaxed"
                                                style={{ color: "rgba(255,255,255,0.75)" }}
                                            >
                                                {f.pitch}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                    <div
                                        className="p-6 md:p-7"
                                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                                    >
                                        <div
                                            className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase flex items-center gap-2"
                                            style={{ color: f.accent }}
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: f.accent }}
                                            />
                                            No Vyzon
                                        </div>
                                        <ol className="space-y-3">
                                            {f.vyzonSteps.map((s, j) => (
                                                <li
                                                    key={j}
                                                    className="flex gap-3 text-[14px] leading-relaxed text-white/80"
                                                >
                                                    <span
                                                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px"
                                                        style={{
                                                            background: `${f.accent}18`,
                                                            color: f.accent,
                                                        }}
                                                    >
                                                        {j + 1}
                                                    </span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                    <div
                                        className="p-6 md:p-7"
                                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                                    >
                                        <div className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase text-white/45 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
                                            No Ploomes
                                        </div>
                                        <ol className="space-y-3">
                                            {f.ploomesSteps.map((s, j) => (
                                                <li
                                                    key={j}
                                                    className="flex gap-3 text-[14px] leading-relaxed text-white/55"
                                                >
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px bg-white/5 text-white/50">
                                                        {j + 1}
                                                    </span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                <div
                                    className="px-6 md:px-8 py-4 text-[13px] md:text-[14px] font-medium"
                                    style={{
                                        background: `${f.accent}08`,
                                        borderTop: `1px solid ${f.accent}20`,
                                        color: "rgba(255,255,255,0.85)",
                                    }}
                                >
                                    <span className="font-bold" style={{ color: f.accent }}>
                                        Resultado:
                                    </span>{" "}
                                    {f.outcome}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* COMPARATIVO */}
            <section id="comparativo" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.gold }}
                    >
                        Linha por linha
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        Onde cada um
                        <br />
                        <span style={{ color: C.brand }}>faz sentido</span>.
                    </h2>
                </div>

                <div
                    className="hidden md:block rounded-2xl overflow-hidden"
                    style={{
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <div
                        className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-bold"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <div className="text-white/40">Critério</div>
                        <div style={{ color: C.brand }}>Vyzon</div>
                        <div className="text-white/55">Ploomes</div>
                    </div>

                    {COMPARISON.map((row, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-5 border-b last:border-b-0"
                            style={{
                                borderColor: "rgba(255,255,255,0.05)",
                                background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                            }}
                        >
                            <div className="text-white/75 text-[14px] font-medium self-center">
                                {row.label}
                            </div>
                            <div className="self-center">
                                <div
                                    className="inline-flex items-center gap-1.5 text-[14px]"
                                    style={{
                                        color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)",
                                        fontWeight: row.vyzon.good ? 600 : 500,
                                    }}
                                >
                                    {row.vyzon.good && (
                                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    )}
                                    {row.vyzon.text}
                                </div>
                            </div>
                            <div className="self-center">
                                <div className="text-white/80 text-[14px]">{row.ploomes.text}</div>
                                {row.ploomes.note && (
                                    <div className="text-[11px] text-white/35 mt-1 leading-snug">
                                        {row.ploomes.note}
                                    </div>
                                )}
                            </div>
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
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-3">
                                {row.label}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    className="p-3 rounded-lg"
                                    style={{
                                        background: row.vyzon.good ? `${C.brand}0F` : "rgba(255,255,255,0.02)",
                                        border: row.vyzon.good
                                            ? `1px solid ${C.brand}33`
                                            : "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: C.brand }}>
                                        Vyzon
                                    </div>
                                    <div
                                        className="text-[13px] font-semibold"
                                        style={{ color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)" }}
                                    >
                                        {row.vyzon.text}
                                    </div>
                                </div>
                                <div
                                    className="p-3 rounded-lg"
                                    style={{
                                        background: "rgba(255,255,255,0.02)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1 text-white/45">
                                        Ploomes
                                    </div>
                                    <div className="text-[13px] text-white/85 font-medium">
                                        {row.ploomes.text}
                                    </div>
                                    {row.ploomes.note && (
                                        <div className="text-[10px] text-white/40 mt-1 leading-snug">
                                            {row.ploomes.note}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                        Dados públicos dos sites oficiais em abril 2026. Consulte{" "}
                        <a
                            href="https://www.ploomes.com/precos"
                            className="underline hover:text-white/60 transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ploomes.com/precos
                        </a>{" "}
                        pra valores atualizados. Features e disponibilidade podem ter mudado desde
                        esta publicação.
                    </p>
                </div>
            </section>

            {/* TCO */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.gold }}
                    >
                        Custo total real
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        {TCO.headline.split(",")[0]},
                        <br />
                        <span style={{ color: C.gold }}>time de 5 vendedores</span>.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">
                        {TCO.subtitle}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}04)`,
                            border: `1px solid ${C.brand}30`,
                        }}
                    >
                        <div
                            className="px-6 py-4 flex items-center gap-2"
                            style={{ borderBottom: `1px solid ${C.brand}20` }}
                        >
                            <Wallet className="h-4 w-4" style={{ color: C.brand }} />
                            <span
                                className="text-[11px] font-bold tracking-[0.2em] uppercase"
                                style={{ color: C.brand }}
                            >
                                Vyzon, time de 5
                            </span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            {TCO.vyzon.map((it) => (
                                <div
                                    key={it.label}
                                    className="px-6 py-3.5 flex items-center justify-between gap-4"
                                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                                >
                                    <span className="text-[14px] text-white/75">{it.label}</span>
                                    <span className="text-[14px] font-semibold text-white/90 whitespace-nowrap">
                                        {it.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div
                            className="px-6 py-5 flex items-center justify-between"
                            style={{
                                background: `${C.brand}10`,
                                borderTop: `1px solid ${C.brand}30`,
                            }}
                        >
                            <span className="text-[13px] uppercase tracking-wider font-bold text-white/70">
                                Total mensal
                            </span>
                            <span
                                className="text-2xl md:text-3xl font-bold tracking-tight"
                                style={{ color: C.brand }}
                            >
                                {TCO.vyzonTotal}
                            </span>
                        </div>
                    </div>

                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <div
                            className="px-6 py-4 flex items-center gap-2"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                        >
                            <Wallet className="h-4 w-4 text-white/40" />
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">
                                Ploomes, time de 5
                            </span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            {TCO.ploomes.map((it) => (
                                <div
                                    key={it.label}
                                    className="px-6 py-3.5 flex items-center justify-between gap-4"
                                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                                >
                                    <span className="text-[14px] text-white/60">{it.label}</span>
                                    <span className="text-[14px] font-semibold text-white/75 whitespace-nowrap">
                                        {it.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div
                            className="px-6 py-5 flex items-center justify-between"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderTop: "1px solid rgba(255,255,255,0.08)",
                            }}
                        >
                            <span className="text-[13px] uppercase tracking-wider font-bold text-white/55">
                                Total mensal
                            </span>
                            <span className="text-2xl md:text-3xl font-bold tracking-tight text-white/80">
                                {TCO.ploomesTotal}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="mt-5 p-5 md:p-6 rounded-xl text-center"
                    style={{
                        background: `linear-gradient(90deg, ${C.brand}0A, ${C.gold}0A)`,
                        border: `1px solid ${C.gold}25`,
                    }}
                >
                    <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-white/50 mb-1">
                        Diferença por mês pra time de 5
                    </div>
                    <div className="text-3xl md:text-4xl font-bold tracking-tight">
                        <span style={{ color: C.brand }}>R$ 350 a R$ 875</span>{" "}
                        <span className="text-white/50 text-lg md:text-xl font-medium">
                            economizados / mês
                        </span>
                    </div>
                    <div className="text-[12px] text-white/40 mt-2">
                        Faixa depende se você vai usar WhatsApp API, Zapier e onboarding
                        consultivo. Sem nenhum desses, os dois ficam mais próximos.
                    </div>
                </div>

                <div className="mt-4 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{TCO.note}</p>
                </div>
            </section>

            {/* CENÁRIOS */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.violet }}
                    >
                        Cenários reais
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        Três situações onde
                        <br />
                        o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.
                    </h2>
                </div>

                <div className="space-y-4">
                    {SCENARIOS.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={i}
                                className="p-6 md:p-8 rounded-2xl relative overflow-hidden"
                                style={{
                                    background: `linear-gradient(135deg, ${s.tint}, transparent 60%)`,
                                    border: `1px solid ${s.border}`,
                                }}
                            >
                                <div className="flex items-start gap-4 md:gap-5">
                                    <div
                                        className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: `${s.accent}15`,
                                            border: `1px solid ${s.accent}40`,
                                        }}
                                    >
                                        <Icon className="h-5 w-5 md:h-6 md:w-6" style={{ color: s.accent }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                                            {s.title}
                                        </h3>
                                        <p className="text-white/65 leading-relaxed text-[15px]">
                                            {s.body}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* JORNADA */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.brand }}
                    >
                        Do zero ao operando
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        <span style={{ color: C.brand }}>7 dias</span> no Vyzon
                        <br />
                        vs <span className="text-white/70">2 a 6 semanas</span> no Ploomes.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">
                        Time pequeno pode subir o Ploomes em dias também. A diferença aparece
                        quando você precisa ligar integrações brasileiras (Bling, Omie) e CPQ,
                        aí o cronograma estica.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <div
                        className="rounded-2xl p-6 md:p-7 relative"
                        style={{
                            background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}03)`,
                            border: `1px solid ${C.brand}30`,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar className="h-4 w-4" style={{ color: C.brand }} />
                            <span
                                className="text-[11px] font-bold tracking-[0.2em] uppercase"
                                style={{ color: C.brand }}
                            >
                                Vyzon, jornada de 7 dias
                            </span>
                        </div>
                        <ol className="space-y-5 relative">
                            <div
                                className="absolute left-[11px] top-2 bottom-2 w-px"
                                style={{ background: `${C.brand}30` }}
                            />
                            {JOURNEY.vyzon.map((step, i) => (
                                <li key={i} className="flex gap-4 relative">
                                    <span
                                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
                                        style={{
                                            background: C.brand,
                                            color: "#06080a",
                                            boxShadow: `0 0 0 4px ${C.brand}15`,
                                        }}
                                    >
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0 pb-1">
                                        <div
                                            className="text-[11px] uppercase tracking-wider font-bold mb-1"
                                            style={{ color: C.brand }}
                                        >
                                            {step.day}
                                        </div>
                                        <div className="font-semibold text-white text-[15px] mb-1">
                                            {step.title}
                                        </div>
                                        <div className="text-[13px] text-white/55 leading-relaxed">
                                            {step.detail}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div
                        className="rounded-2xl p-6 md:p-7 relative"
                        style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar className="h-4 w-4 text-white/40" />
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">
                                Ploomes, jornada de 2 a 6 semanas
                            </span>
                        </div>
                        <ol className="space-y-5 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
                            {JOURNEY.ploomes.map((step, i) => (
                                <li key={i} className="flex gap-4 relative">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 bg-white/10 text-white/70 ring-4 ring-white/5">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0 pb-1">
                                        <div className="text-[11px] uppercase tracking-wider font-bold mb-1 text-white/50">
                                            {step.day}
                                        </div>
                                        <div className="font-semibold text-white/85 text-[15px] mb-1">
                                            {step.title}
                                        </div>
                                        <div className="text-[13px] text-white/45 leading-relaxed">
                                            {step.detail}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* Ver outros comparativos */}
            <section className="px-6 max-w-5xl mx-auto pb-12">
                <a href="/alternativas" className="group flex items-center justify-between gap-4 p-5 md:p-6 rounded-2xl transition hover:translate-y-[-1px]" style={{ background: `linear-gradient(90deg, ${C.brand}0C, ${C.blue}08)`, border: `1px solid ${C.brand}25` }}>
                    <div>
                        <div className="text-[11px] font-bold tracking-[0.25em] uppercase mb-1" style={{ color: C.brand }}>Comparativos</div>
                        <div className="text-white font-semibold text-[15px] md:text-base">Ver Vyzon vs outros 5 CRMs</div>
                    </div>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1 flex-shrink-0" style={{ color: C.brand }} />
                </a>
            </section>

            {/* FAQ */}
            <section className="px-6 max-w-4xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.gold }}
                    >
                        Perguntas reais
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        Dúvidas que a gente
                        <br />
                        <span style={{ color: C.gold }}>escuta direto</span>.
                    </h2>
                </div>

                <div className="space-y-3">
                    {FAQ.map((item, i) => (
                        <details
                            key={i}
                            className="group p-5 md:p-6 rounded-xl transition"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <summary className="cursor-pointer flex items-center justify-between gap-4 list-none">
                                <span className="text-[15px] md:text-base font-semibold text-white/90">
                                    {item.q}
                                </span>
                                <span
                                    className="text-2xl leading-none transition-transform group-open:rotate-45 flex-shrink-0"
                                    style={{ color: C.gold }}
                                >
                                    +
                                </span>
                            </summary>
                            <p className="mt-4 text-white/65 leading-relaxed text-[15px]">
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="px-6 max-w-4xl mx-auto pb-28">
                <div
                    className="relative p-8 md:p-14 rounded-3xl text-center overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${C.brand}18, ${C.gold}10)`,
                        border: `1px solid ${C.brand}30`,
                    }}
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 opacity-40"
                        style={{
                            background: `
                                radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%),
                                radial-gradient(500px 250px at 80% 80%, ${C.gold}22, transparent 60%)
                            `,
                        }}
                    />

                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">
                        Testa 14 dias.
                        <br />
                        <span
                            style={{
                                background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`,
                                WebkitBackgroundClip: "text",
                                backgroundClip: "text",
                                color: "transparent",
                            }}
                        >
                            Decide depois
                        </span>
                        .
                    </h2>
                    <p className="text-white/65 mb-8 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed">
                        Se o Ploomes ainda fizer mais sentido no fim, tu leva teus dados em CSV e
                        segue vida. Zero vendor lock-in.
                    </p>
                    <button
                        onClick={() => { window.location.href = "/#agendar-demo"; }}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition group"
                        style={{
                            background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`,
                            color: "#06080a",
                            boxShadow: `0 24px 60px -20px ${C.brand}88`,
                        }}
                    >
                        Começar agora
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default VsPloomes;
