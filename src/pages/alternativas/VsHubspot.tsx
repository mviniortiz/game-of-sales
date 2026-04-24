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

// Paleta Vyzon 2026
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
    hubspot: { text: string; note?: string };
};

const COMPARISON: Row[] = [
    {
        label: "Preço inicial por usuário",
        vyzon: { text: "R$ 147 / mês", good: true },
        hubspot: { text: "US$ 20 / mês*", note: "Starter Customer Platform, aproximadamente R$ 100 na cotação" },
    },
    {
        label: "Plano intermediário",
        vyzon: { text: "R$ 197 / mês" },
        hubspot: { text: "US$ 100 / mês*", note: "Sales Hub Professional, aproximadamente R$ 500" },
    },
    {
        label: "Plano avançado",
        vyzon: { text: "R$ 297 / mês" },
        hubspot: { text: "US$ 150 / mês*", note: "Enterprise, aproximadamente R$ 750" },
    },
    {
        label: "Interface em português nativa",
        vyzon: { text: "100% BR", good: true },
        hubspot: { text: "Localizado", note: "UI em pt-BR, documentação e suporte premium em inglês" },
    },
    {
        label: "Cobrança em Real",
        vyzon: { text: "BRL, boleto ou cartão", good: true },
        hubspot: { text: "Cobrado em USD*", note: "sujeito a câmbio, IOF 6,38% e taxa internacional do cartão" },
    },
    {
        label: "WhatsApp integrado nativo",
        vyzon: { text: "Conversa direto no CRM", good: true },
        hubspot: { text: "Via conector Meta", note: "requer WhatsApp Business API + tier pago" },
    },
    {
        label: "Hotmart, Kiwify, Greenn",
        vyzon: { text: "Webhook nativo", good: true },
        hubspot: { text: "Via Zapier ou custom", note: "sem conector oficial nativo" },
    },
    {
        label: "Gamificação e ranking ao vivo",
        vyzon: { text: "Nativo no app", good: true },
        hubspot: { text: "Via apps marketplace", note: "soluções pagas de terceiros" },
    },
    {
        label: "IA que qualifica e cobra lead",
        vyzon: { text: "Eva IA nativa", good: true },
        hubspot: { text: "Breeze AI", note: "disponível em planos Professional e acima" },
    },
    {
        label: "Teste grátis",
        vyzon: { text: "14 dias completos", good: true },
        hubspot: { text: "Free CRM perpétuo", note: "limitado em features comerciais" },
    },
    {
        label: "Suporte em português",
        vyzon: { text: "WhatsApp, chat, email", good: true },
        hubspot: { text: "Em pt-BR no Starter+", note: "tickets em inglês fora do horário BR" },
    },
];

const FAQ = [
    {
        q: "O Vyzon é realmente uma alternativa ao HubSpot?",
        a: "Para o time comercial brasileiro de pequena e média empresa, sim. O Vyzon cobre pipeline visual, CRM, gestão de leads, automação de WhatsApp, gamificação e IA. O HubSpot cobre isso e vai muito além com Marketing Hub, Service Hub, CMS e uma academia global. A pergunta certa é: você precisa de toda a plataforma HubSpot ou do que ela faz pra vendas? Se for só vendas em português com WhatsApp, o Vyzon resolve por uma fração do preço.",
    },
    {
        q: "Vou pagar menos migrando do HubSpot para o Vyzon?",
        a: "Na maioria dos casos sim. O HubSpot Sales Hub Professional custa cerca de US$ 100 por usuário mês. Com IOF e câmbio, isso bate em R$ 550 a R$ 600 por usuário. O Vyzon começa em R$ 147 por usuário, cobrado em Real, sem surpresa cambial. Para um time de 5 vendedores, a economia fica na faixa de R$ 2.000 a R$ 2.500 por mês.",
    },
    {
        q: "Consigo migrar meus contatos e deals do HubSpot?",
        a: "Sim. Exporte CSV do HubSpot (contacts, companies, deals) e importe no Vyzon em Configurações, aba Importar Dados. O mapeamento de campos é automático para os nomes padrão. Campos customizados você ajusta manualmente. Nos planos anuais, nossa equipe faz a migração assistida.",
    },
    {
        q: "O WhatsApp no Vyzon é oficial do Meta ou não oficial?",
        a: "O Vyzon conecta via Evolution API, uma ponte estável com o WhatsApp Web. Você usa seu próprio número sem custo adicional de API oficial. A conversa acontece dentro do CRM com histórico do lead e contexto do pipeline. O HubSpot exige a API oficial do Meta, que tem tier pago por conversa.",
    },
    {
        q: "O Vyzon tem Marketing Automation como o HubSpot?",
        a: "Nativamente o Vyzon foca em vendas. Para marketing automation (email nurturing, landing pages, blog), nossos clientes usam integração com ferramentas especialistas brasileiras. Se seu uso principal é gestão comercial e WhatsApp, essa separação é até mais saudável e barata. Se você precisa de tudo em uma stack só, o HubSpot faz mais sentido.",
    },
    {
        q: "O que acontece se eu quiser sair do Vyzon no futuro?",
        a: "Você exporta todos os dados em CSV quando quiser, sem vendor lock-in. O Vyzon não taxa exportação nem esconde informação em formato proprietário. Isso é diferente de algumas ferramentas que cobram pra liberar a base na saída.",
    },
];

type Feature = {
    icon: typeof MessageSquare;
    isEva?: boolean;
    accent: string;
    title: string;
    pitch: string;
    vyzonSteps: string[];
    hubspotSteps: string[];
    outcome: string;
};

const FEATURES: Feature[] = [
    {
        icon: MessageSquare,
        accent: C.brand,
        title: "WhatsApp dentro do CRM",
        pitch: "Lead entra no pipeline com o chat do WhatsApp ao lado do deal. Vendedor manda mensagem sem trocar de aba, sem copiar contato.",
        vyzonSteps: [
            "Conecta seu número via Evolution API em 3 minutos (QR code)",
            "Mensagens antigas e novas sincronizam automaticamente no deal correto",
            "Template de mensagem por estágio do pipeline, com variável de nome e oferta",
            "Histórico completo fica anexo ao lead, pronto pra handover ou auditoria",
        ],
        hubspotSteps: [
            "Contratar WhatsApp Business API pela Meta ou BSP (tier pago por conversa)",
            "Configurar conector HubSpot - Meta Business Suite",
            "Treinar o time pra usar a Inbox da HubSpot, que não é o WhatsApp puro",
            "Pagar por cada mensagem dentro da janela de 24 horas",
        ],
        outcome: "Time responde em minutos, não em abas. Custo marginal por mensagem = zero.",
    },
    {
        icon: Webhook,
        accent: C.blue,
        title: "Venda de Hotmart, Kiwify e Greenn vira deal sozinha",
        pitch: "Webhook nativo. Venda acontece, deal nasce. Sem Zapier, sem automação custom.",
        vyzonSteps: [
            "Em Integrações → Hotmart, você gera uma URL de webhook com secret próprio",
            "Cola a URL no painel da Hotmart em Ferramentas → Webhook",
            "Próxima venda dispara o webhook, o Vyzon cria deal com nome, email, telefone, produto e origem",
            "Pipeline já tem templates para lançamento, perpétuo, esteira e boleto aberto",
        ],
        hubspotSteps: [
            "Conectar Zapier ao HubSpot (R$ 100 a R$ 600 por mês dependendo do volume)",
            "Criar zap Hotmart → Zapier → HubSpot Contact + Deal, mapeando campos manualmente",
            "Debugar payload, manter zap quando API muda, pagar por execução",
            "Replicar todo esse trabalho para Kiwify, Greenn, Eduzz separadamente",
        ],
        outcome: "Zero middleware. O infoprodutor brasileiro é cidadão de primeira classe no Vyzon.",
    },
    {
        icon: Trophy,
        accent: C.gold,
        title: "Ranking ao vivo que empurra meta",
        pitch: "Time vê a própria posição no TV da sala. Vendedor #4 fecha um deal, salta pra #2, vira ritual. Isso não é relatório, é combustível.",
        vyzonSteps: [
            "Define meta do mês (receita, nº deals, ou % de pipeline fechado)",
            "Dashboard Ranking atualiza em tempo real a cada deal movido pra Ganho",
            "Pódio automático com percentual de meta, receita e deals por pessoa",
            "Gatilho opcional: quem bater meta ganha selo, streak quebra gera alerta",
        ],
        hubspotSteps: [
            "HubSpot tem Leaderboards mas precisa do Sales Hub Professional",
            "Configurar dashboard custom com Reports, alguns campos precisam SQL/workflow",
            "Dados atualizam no ciclo de report, não tempo real de verdade",
            "Gamificação avançada depende de apps de terceiros pagos no Marketplace",
        ],
        outcome: "Ranking é nativo, não addon. Time vira comunidade competitiva em vez de planilha compartilhada.",
    },
    {
        icon: MessageSquare, // placeholder, EvaAvatar renderizado via isEva flag
        isEva: true,
        accent: C.violet,
        title: "Eva IA: o SDR que não dorme",
        pitch: "Eva lê o pipeline, identifica lead parado, redige a mensagem de cobrança com o tom certo, sugere horário e espera você aprovar com 1 clique.",
        vyzonSteps: [
            "Eva roda a cada 6 horas olhando deals parados há mais de X dias",
            "Pra cada lead, ela gera uma proposta de mensagem baseada no estágio e histórico",
            "Vendedor abre o chat, vê a sugestão, edita se quiser e dispara",
            "Aprende com aceite/rejeição: mensagens que fecham aparecem mais, as ignoradas somem",
        ],
        hubspotSteps: [
            "Breeze AI está disponível no Sales Hub Professional em diante",
            "Configurar playbooks e sequences em inglês, adaptar tom manualmente",
            "Integração com email é forte, mas com WhatsApp depende do conector oficial pago",
            "IA treinada em dados globais, não específica pra dinâmica de vendas BR",
        ],
        outcome: "Eva é treinada pro jeito brasileiro de vender: WhatsApp, áudio, voz humana. Não é tradução de US.",
    },
];

const TCO = {
    headline: "O que tu paga de verdade por mês",
    subtitle:
        "Licença é só a ponta do iceberg. HubSpot vem com gastos satélite que o vendedor médio não vê no primeiro contato.",
    vyzon: [
        { label: "Licença Vyzon Pro (5 usuários)", value: "R$ 985" },
        { label: "Zapier", value: "R$ 0" },
        { label: "WhatsApp Business API", value: "R$ 0" },
        { label: "Suporte em português", value: "Incluído" },
        { label: "Onboarding assistido", value: "Incluído no anual" },
    ],
    vyzonTotal: "R$ 985",
    hubspot: [
        { label: "Sales Hub Professional (5 usuários)*", value: "~R$ 3.000" },
        { label: "Zapier Professional (webhooks)", value: "R$ 150" },
        { label: "WhatsApp Business API (Meta)", value: "R$ 200+" },
        { label: "IOF + câmbio + taxa cartão", value: "~R$ 250" },
        { label: "Onboarding certificado", value: "R$ 1.800 (one-time)" },
    ],
    hubspotTotal: "~R$ 3.600 / mês",
    note: "Cálculo com câmbio R$ 5,00 e IOF 6,38%. Onboarding one-time diluído em 12 meses.",
};

const JOURNEY = {
    vyzon: [
        { day: "Dia 1", title: "Conta criada, WhatsApp conectado", detail: "Cadastro, QR code, primeiro deal no pipeline." },
        { day: "Dia 2", title: "Import de leads via CSV", detail: "Mapeamento automático, 2 mil contatos em 5 minutos." },
        { day: "Dia 3", title: "Hotmart/Kiwify linkadas", detail: "Webhook gerado no Vyzon, colado no painel do checkout." },
        { day: "Dia 7", title: "Time completo operando", detail: "5 vendedores treinados, ranking ao vivo, Eva rodando." },
    ],
    hubspot: [
        { day: "Semana 1", title: "Kickoff call com CS", detail: "Agendar horário em inglês, reunião formal." },
        { day: "Semana 2-3", title: "Configuração + imports", detail: "Propriedades custom, pipelines, automations." },
        { day: "Semana 4", title: "Zapier + WhatsApp API", detail: "Integração com Hotmart, debug de payload, API oficial Meta." },
        { day: "Semana 6+", title: "Team trained", detail: "HubSpot Academy, certificações, adaptação cultural." },
    ],
};

const SCENARIOS = [
    {
        icon: TrendingUp,
        accent: C.brand,
        tint: "rgba(0,227,122,0.08)",
        border: "rgba(0,227,122,0.25)",
        title: "Infoprodutor com lançamento pela Hotmart",
        body: "Você dispara lançamento com 3.000 inscritos no evento. Cada compra precisa virar follow-up no WhatsApp em minutos. O Vyzon recebe o webhook da Hotmart, cria o deal, e sua vendedora aborda direto no chat dentro do CRM. No HubSpot, você precisaria de Zapier mais conector WhatsApp pago, tempo de integração e custo por trigger.",
    },
    {
        icon: Users,
        accent: C.blue,
        tint: "rgba(21,86,192,0.08)",
        border: "rgba(21,86,192,0.28)",
        title: "SaaS B2B com time de 6 vendedores",
        body: "O Sales Hub Professional do HubSpot fica em torno de R$ 3.300 por mês só na licença, sem contar marketing. O mesmo time no Vyzon custa R$ 882. E ainda vem com ranking ao vivo que empurra meta, WhatsApp integrado e a Eva IA cobrando lead parado.",
    },
    {
        icon: MessageSquare,
        accent: C.violet,
        tint: "rgba(139,92,246,0.08)",
        border: "rgba(139,92,246,0.28)",
        title: "Agência que revende CRM pros clientes",
        body: "Clientes brasileiros odeiam cartão em USD e suporte em inglês fora do horário. O Vyzon cobra em Real, suporte em português e API aberta pra white label. O HubSpot tem programa de agências, mas o cliente final sente o choque cambial todo mês.",
    },
];

const VsHubspot = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Alternativa ao HubSpot | Vyzon, CRM brasileiro com WhatsApp";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.content =
                "Vyzon é a alternativa brasileira ao HubSpot pra times comerciais: preço em Real, WhatsApp nativo, integração Hotmart/Kiwify. Compare preço, features e quando cada um faz sentido.";
        }
        trackEvent("compare_page_view", { vs: "hubspot" });
    }, []);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Product",
                name: "Vyzon CRM",
                description:
                    "CRM de vendas brasileiro com WhatsApp nativo, integração Hotmart/Kiwify/Greenn, gamificação e IA.",
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
                    { "@type": "ListItem", position: 3, name: "Vyzon vs HubSpot", item: "https://vyzon.com.br/alternativa-hubspot" },
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

            {/* Atmosfera: dois gradientes sutis de fundo, verde e azul */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    background: `
                        radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%),
                        radial-gradient(900px 500px at 90% 10%, rgba(21,86,192,0.06), transparent 60%)
                    `,
                }}
            />

            <LandingNav />

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
                    Vyzon vs HubSpot
                </div>

                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    O <span style={{ color: C.brand }}>CRM brasileiro</span>
                    <br />
                    que o HubSpot
                    <br />
                    <span
                        style={{
                            background: `linear-gradient(90deg, ${C.blue}, ${C.violet})`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                        }}
                    >
                        cobraria em dólar
                    </span>
                    .
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    Time comercial que vive no WhatsApp, vende infoproduto ou SaaS para o mercado
                    BR. O HubSpot é potente mas caro e estrangeiro. O Vyzon foi desenhado pra esse
                    cenário, cobra em Real, integra o que você já usa e custa uma fração.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                    <button
                        onClick={() => navigate("/")}
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

                {/* Métricas de ancoragem */}
                <div className="mt-14 grid grid-cols-3 gap-3 md:gap-6 max-w-xl">
                    {[
                        { label: "A partir de", value: "R$ 147", accent: C.brand },
                        { label: "Economia típica", value: "~75%", accent: C.gold },
                        { label: "WhatsApp nativo", value: "Sim", accent: C.blue },
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

            {/* TL;DR 2 cards */}
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
                                "Seu time vende no WhatsApp e você quer o chat direto no CRM",
                                "Vende infoproduto via Hotmart, Kiwify ou Greenn",
                                "Quer pagar em Real, sem IOF nem câmbio",
                                "Team de 2 a 30 vendedores no Brasil",
                                "Valoriza gamificação e ranking ao vivo do time",
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
                            background: "linear-gradient(180deg, rgba(139,92,246,0.04), rgba(139,92,246,0.01))",
                            border: `1px solid ${C.violet}2A`,
                        }}
                    >
                        <div
                            className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase"
                            style={{ color: C.violet }}
                        >
                            Fique com HubSpot se
                        </div>
                        <ul className="space-y-3 text-white/75 text-[15px]">
                            {[
                                "Precisa de Marketing Automation, Service Hub e CMS juntos",
                                "Opera globalmente e precisa de vários idiomas",
                                "Valoriza HubSpot Academy e ecossistema de agências",
                                "Team de 50+ com processo enterprise",
                                "Já tem budget corporativo internacional",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span
                                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                        style={{ background: `${C.violet}22` }}
                                    >
                                        <Check className="h-3 w-3" style={{ color: C.violet }} strokeWidth={3} />
                                    </span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* COMO FUNCIONA — 4 features deep-dive */}
            <section id="como-funciona" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.blue }}
                    >
                        Como funciona
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        O que muda no dia a dia
                        <br />
                        <span style={{ color: C.brand }}>do teu time comercial</span>.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">
                        Quatro fluxos que no Vyzon são nativos e no HubSpot pedem stack extra ou
                        configuração avançada.
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
                                            No HubSpot
                                        </div>
                                        <ol className="space-y-3">
                                            {f.hubspotSteps.map((s, j) => (
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

                {/* Desktop: grid 3 cols, Mobile: cards empilhados */}
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
                        <div className="text-white/55">HubSpot</div>
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
                                <div className="text-white/80 text-[14px]">{row.hubspot.text}</div>
                                {row.hubspot.note && (
                                    <div className="text-[11px] text-white/35 mt-1 leading-snug">
                                        {row.hubspot.note}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile: cada linha vira card empilhado */}
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
                                        HubSpot
                                    </div>
                                    <div className="text-[13px] text-white/85 font-medium">
                                        {row.hubspot.text}
                                    </div>
                                    {row.hubspot.note && (
                                        <div className="text-[10px] text-white/40 mt-1 leading-snug">
                                            {row.hubspot.note}
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
                        Valores em USD convertidos usando câmbio médio de R$ 5,00 e consideram IOF
                        de 6,38% sobre cartão internacional. Consulte{" "}
                        <a
                            href="https://www.hubspot.com/pricing/crm"
                            className="underline hover:text-white/60 transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            hubspot.com/pricing
                        </a>{" "}
                        pra valores atualizados. Features e disponibilidade podem ter mudado desde
                        esta publicação.
                    </p>
                </div>
            </section>

            {/* CUSTO TOTAL DE POSSE (TCO) */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div
                        className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: C.gold }}
                    >
                        Custo total real
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        {TCO.headline.split("de verdade")[0]}
                        <br />
                        <span style={{ color: C.gold }}>de verdade</span>
                        {TCO.headline.split("de verdade")[1] || ""}.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">
                        {TCO.subtitle}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    {/* Vyzon col */}
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

                    {/* HubSpot col */}
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
                                HubSpot, time de 5
                            </span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            {TCO.hubspot.map((it) => (
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
                                {TCO.hubspotTotal}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Diferença destaque */}
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
                        <span style={{ color: C.brand }}>R$ 2.615</span>{" "}
                        <span className="text-white/50 text-lg md:text-xl font-medium">
                            economizados / mês
                        </span>
                    </div>
                    <div className="text-[12px] text-white/40 mt-2">
                        R$ 31.380 por ano. O suficiente pra contratar mais um vendedor.
                    </div>
                </div>

                <div className="mt-4 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{TCO.note}</p>
                </div>
            </section>

            {/* CENÁRIOS com cores variadas */}
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
                                className="group p-6 md:p-8 rounded-2xl relative overflow-hidden transition"
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

            {/* JORNADA DE ADOÇÃO */}
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
                        vs <span className="text-white/70">6 semanas</span> no HubSpot.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">
                        Time comercial não pode esperar um trimestre pra começar a produzir. Aqui o
                        cronograma real de adoção dos dois lados.
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
                                HubSpot, jornada de 6+ semanas
                            </span>
                        </div>
                        <ol className="space-y-5 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
                            {JOURNEY.hubspot.map((step, i) => (
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
                        background: `linear-gradient(135deg, ${C.brand}18, ${C.blue}10)`,
                        border: `1px solid ${C.brand}30`,
                    }}
                >
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-10 opacity-40"
                        style={{
                            background: `
                                radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%),
                                radial-gradient(500px 250px at 80% 80%, ${C.blue}22, transparent 60%)
                            `,
                        }}
                    />

                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">
                        Testa 14 dias.
                        <br />
                        <span
                            style={{
                                background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`,
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
                        Se ainda preferir o HubSpot no fim, tu leva teus dados em CSV e segue vida.
                        Zero vendor lock-in.
                    </p>
                    <button
                        onClick={() => navigate("/")}
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

export default VsHubspot;
