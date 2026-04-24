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
    rd: { text: string; note?: string };
};

const COMPARISON: Row[] = [
    {
        label: "Preço CRM por usuário",
        vyzon: { text: "A partir de R$ 147 / mês", good: true },
        rd: { text: "~R$ 80 / mês*", note: "plano Pro, consulte rdstation.com/precos" },
    },
    {
        label: "Marketing Automation nativo",
        vyzon: { text: "Não. Integra via API" },
        rd: { text: "Sim, com RD Marketing", note: "ponto forte: RD é originalmente MA, CRM vem depois" },
    },
    {
        label: "WhatsApp no CRM",
        vyzon: { text: "Evolution API nativa", good: true },
        rd: { text: "Via integração/extensão", note: "RD Conversas ou parceiros pagos" },
    },
    {
        label: "Hotmart, Kiwify, Greenn",
        vyzon: { text: "Webhook nativo", good: true },
        rd: { text: "Via Zapier ou custom", note: "sem conector oficial nativo" },
    },
    {
        label: "Ranking ao vivo gamificado",
        vyzon: { text: "Nativo, tempo real", good: true },
        rd: { text: "Dashboards custom", note: "relatórios, sem gamificação nativa forte" },
    },
    {
        label: "IA que cobra lead parado",
        vyzon: { text: "Eva IA generativa", good: true },
        rd: { text: "RD Station IA", note: "em evolução, foco em automações e insights" },
    },
    {
        label: "Email marketing + landing pages",
        vyzon: { text: "Integra com ferramentas externas" },
        rd: { text: "Tudo incluído", note: "ponto forte: MA + email + LP + fluxos no mesmo produto" },
    },
    {
        label: "Lead scoring e nutrição",
        vyzon: { text: "Regras de pipeline básicas" },
        rd: { text: "Scoring avançado nativo", note: "ponto forte: Lead Scoring + Perfil Ideal integrados" },
    },
    {
        label: "Base de clientes e ecossistema",
        vyzon: { text: "Startup brasileira em crescimento" },
        rd: { text: "Base consolidada", note: "ponto forte: 30k+ clientes, RD Summit, academia" },
    },
    {
        label: "Setup",
        vyzon: { text: "Self-service, ~1 dia", good: true },
        rd: { text: "Self-service ou assistido", note: "time pequeno em dias, enterprise com CS em semanas" },
    },
    {
        label: "Foco principal",
        vyzon: { text: "Fundo de funil, WhatsApp", good: true },
        rd: { text: "Topo/meio de funil, MA", note: "CRM é complemento ao ecossistema RD" },
    },
];

type Feature = {
    icon: typeof MessageSquare;
    isEva?: boolean;
    accent: string;
    title: string;
    pitch: string;
    vyzonSteps: string[];
    rdSteps: string[];
    outcome: string;
};

const FEATURES: Feature[] = [
    {
        icon: MessageSquare,
        accent: C.brand,
        title: "WhatsApp direto no deal, sem extensão",
        pitch: "RD foi desenhado pra email e MA. WhatsApp entra via RD Conversas ou parceiros pagos. No Vyzon, o chat já mora dentro do pipeline.",
        vyzonSteps: [
            "QR code em 3 minutos via Evolution API, sem custo adicional",
            "Histórico completo anexo ao deal, sincronizado em tempo real",
            "Template de mensagem por estágio do pipeline",
            "Auditoria: gestor vê todas as conversas do time sem pedir print",
        ],
        rdSteps: [
            "Contratar RD Conversas (módulo pago à parte) ou integração de parceiro",
            "Configurar números do time no painel separado",
            "Conversas ficam numa caixa de entrada fora do card do lead",
            "Dependência da API oficial Meta se for conversa em massa",
        ],
        outcome: "WhatsApp é primeira classe no Vyzon. No RD, é add-on.",
    },
    {
        icon: Webhook,
        accent: C.blue,
        title: "Infoprodutor: venda da Hotmart vira deal sozinha",
        pitch: "RD é fortíssimo pra topo de funil (landing page, captura, nutrição). Pro fundo, quando a venda rola na Hotmart/Kiwify, quem precisa virar deal rápido fica no braço.",
        vyzonSteps: [
            "Integrações → Hotmart → gera URL de webhook com secret no Vyzon",
            "Cola no painel da Hotmart em Ferramentas → Webhook",
            "Próxima venda vira deal com nome, email, telefone, produto, origem",
            "Pipeline templates prontos pra lançamento, perpétuo, esteira",
        ],
        rdSteps: [
            "Conectar Zapier ou Make ao RD Station (custo mensal extra)",
            "Criar zap Hotmart → Zapier → RD CRM Deal, mapear campos",
            "Debugar payload, manter quando a API da plataforma muda",
            "Replicar processo pra Kiwify, Greenn, Eduzz separadamente",
        ],
        outcome: "Infoprodutor vende e o deal nasce sem middleware. Zero perda no handoff.",
    },
    {
        icon: Trophy,
        accent: C.gold,
        title: "Ranking ao vivo que muda o clima do time",
        pitch: "Vendedor fecha, sobe no pódio em tempo real. No RD é dashboard custom. No Vyzon é ritual diário.",
        vyzonSteps: [
            "Define meta (receita, nº deals ou % de pipeline fechado)",
            "Ranking atualiza a cada deal movido pra Ganho",
            "Pódio com percentual, receita e deals por pessoa",
            "Selos e alertas de streak opcionais",
        ],
        rdSteps: [
            "Montar dashboard custom no RD Station Analytics",
            "Dados atualizam por ciclo, raramente tempo real",
            "Gamificação avançada depende de relatórios manuais",
            "Gestor monta a rotina de premiação por fora do produto",
        ],
        outcome: "Ranking nativo vira clima do time, não relatório do gerente.",
    },
    {
        icon: MessageSquare,
        isEva: true,
        accent: C.violet,
        title: "Eva IA: o SDR que não dorme",
        pitch: "RD Station tem automações maduras (fluxos, lead scoring, alertas). Eva é generativa: lê o contexto e redige a cobrança do jeito brasileiro.",
        vyzonSteps: [
            "Eva roda a cada 6h analisando deals parados há mais de X dias",
            "Pra cada lead, propõe mensagem baseada em estágio e histórico",
            "Vendedor edita se quiser e manda com 1 clique",
            "Aprende com aceite/rejeição: mensagens que fecham sobem",
        ],
        rdSteps: [
            "Criar automação if-then no fluxo do RD (template pronto)",
            "Redigir texto manualmente, adaptar pra cada persona",
            "Sem adaptação por lead, cada mensagem é genérica",
            "Pra IA generativa, integrar ChatGPT/Claude externamente",
        ],
        outcome: "Eva escreve do jeito brasileiro de vender. Não é template, é contexto.",
    },
];

const TCO = {
    headline: "Custo real por mês, time de 5 vendedores",
    subtitle:
        "RD Pro tem licença competitiva, mas se você quer o pacote completo de MA + CRM + WhatsApp, o cálculo muda.",
    vyzon: [
        { label: "Licença Vyzon Pro (5 usuários)", value: "R$ 985" },
        { label: "WhatsApp Evolution", value: "R$ 0" },
        { label: "Webhooks Hotmart/Kiwify", value: "R$ 0" },
        { label: "Onboarding self-service", value: "Incluído" },
        { label: "Eva IA", value: "Incluído" },
    ],
    vyzonTotal: "R$ 985",
    rd: [
        { label: "RD Station CRM Pro (5 usuários)*", value: "~R$ 400" },
        { label: "RD Station Marketing Pro*", value: "~R$ 900" },
        { label: "RD Conversas (WhatsApp)*", value: "~R$ 200" },
        { label: "Zapier (Hotmart/Kiwify)*", value: "R$ 100 a R$ 150" },
        { label: "Onboarding one-time (opcional)*", value: "~R$ 125 / mês" },
    ],
    rdTotal: "~R$ 1.725 / mês",
    note: "Se você usa RD só pro CRM (sem Marketing, sem Conversas), os dois ficam mais próximos (~R$ 400 vs R$ 985). O cálculo acima considera pacote completo RD (MA + CRM + WhatsApp), que é o caso mais comum de quem escolhe RD pra fazer tudo junto.",
};

const JOURNEY = {
    vyzon: [
        { day: "Dia 1", title: "Conta + WhatsApp conectado", detail: "Cadastro self-service, QR code, primeiro deal no pipeline." },
        { day: "Dia 2", title: "Import de leads via CSV", detail: "Mapeamento automático, 2 mil contatos em 5 minutos." },
        { day: "Dia 3", title: "Webhooks Hotmart/Kiwify", detail: "URL gerada no Vyzon, colada no painel do checkout." },
        { day: "Dia 7", title: "Time completo operando", detail: "5 vendedores, ranking ao vivo, Eva cobrando lead parado." },
    ],
    rd: [
        { day: "Semana 1", title: "Trial ou demo comercial", detail: "Self-service do CRM, mas pacote completo pede sales call." },
        { day: "Semana 2", title: "Configuração de pipeline + fluxos MA", detail: "Propriedades, estágios, fluxos de email, lead scoring." },
        { day: "Semana 3-4", title: "Integrações + RD Conversas", detail: "Email autenticado, DNS/DKIM, WhatsApp no add-on." },
        { day: "Semana 5-6", title: "Time treinado", detail: "Academia RD, casos de uso, rotina de nutrição + vendas." },
    ],
};

const SCENARIOS = [
    {
        icon: TrendingUp,
        accent: C.brand,
        tint: "rgba(0,227,122,0.08)",
        border: "rgba(0,227,122,0.25)",
        title: "Time comercial que vende por WhatsApp, não por email",
        body: "RD nasceu pra Inbound via email. Se teu ciclo é WhatsApp-first (infoproduto, SaaS B2B com SDR, consultoria brasileira), o CRM do RD dá conta mas o WhatsApp vira add-on. No Vyzon, WhatsApp é cidadão de primeira classe, sem fricção.",
    },
    {
        icon: Users,
        accent: C.blue,
        tint: "rgba(21,86,192,0.08)",
        border: "rgba(21,86,192,0.28)",
        title: "Infoprodutor com venda via Hotmart e Kiwify",
        body: "RD tem ecossistema de Marketing Automation forte, mas Hotmart/Kiwify/Greenn não têm conector nativo. Você acaba pagando Zapier e mantendo integração no braço. No Vyzon, o webhook é nativo e o pipeline já tem template pra lançamento.",
    },
    {
        icon: MessageSquare,
        accent: C.violet,
        tint: "rgba(139,92,246,0.08)",
        border: "rgba(139,92,246,0.28)",
        title: "Quem usa RD Marketing e quer CRM mais leve",
        body: "Você pode manter RD Marketing pra gerar lead (onde ele é imbatível) e usar Vyzon pro fundo do funil. Integração via webhook/API passa lead de um pro outro. Time comercial ganha WhatsApp nativo e ranking sem perder a máquina de MA.",
    },
];

const FAQ = [
    {
        q: "Se eu já uso RD Station Marketing, posso ficar com ele e usar só o Vyzon como CRM?",
        a: "Sim, essa é uma combinação comum. RD Marketing continua no topo do funil (email, landing page, nutrição) e o lead passa pro Vyzon quando fica sales-ready. Integração acontece via webhook do RD ou API (captura de novo lead, mudança de estágio, conversão). Time de vendas ganha WhatsApp nativo e ranking sem perder a máquina de Marketing Automation do RD.",
    },
    {
        q: "RD Station é mais barato, né? R$ 80 vs R$ 147.",
        a: "Só a licença do RD CRM Pro é menor. Mas RD geralmente é contratado no pacote com RD Marketing (R$ 900+ por mês) e RD Conversas pra WhatsApp (~R$ 200). Se você quer o stack completo deles, a conta passa fácil de R$ 1.500 por mês. Vyzon R$ 985 inclui WhatsApp nativo e Eva IA. Se você só precisa do CRM e usa outro tool pra MA, RD sai mais barato em licença.",
    },
    {
        q: "O RD tem IA também, qual a diferença?",
        a: "RD tem o RD Station IA em evolução, focado em insights, automações e enriquecimento de leads. A Eva IA do Vyzon é generativa por conversa: lê histórico do lead, estágio e contexto, propõe mensagem específica pra aquele deal. Foco diferente: RD olha a base como um todo, Eva olha o lead individual.",
    },
    {
        q: "Dá pra migrar do RD CRM pro Vyzon?",
        a: "Sim. Exporte CSV do RD (contatos, empresas, oportunidades) e importe no Vyzon em Configurações > Importar Dados. Mapeamento automático pros nomes padrão, ajuste manual em campos custom. Planos anuais incluem migração assistida.",
    },
    {
        q: "Em que pontos o RD Station é melhor que o Vyzon?",
        a: "Honestamente: Marketing Automation é o DNA do RD e o Vyzon não tem MA nativo (email marketing, landing pages, nutrição automatizada). Lead scoring, perfil ideal e fluxos de automação são muito mais maduros. Ecossistema RD Summit, academia, base de agências parceiras e casos enterprise também são muito maiores. Se sua dor é 'preciso gerar e nutrir lead', RD é escolha natural.",
    },
    {
        q: "Vyzon tem lead scoring e nutrição automatizada?",
        a: "Temos regras básicas de pipeline (mover estágio por condição, criar tarefa, notificar). Pra lead scoring avançado e nutrição por email, nossos clientes usam ferramenta externa (RD Marketing, MailerLite, Brevo) e conectam via API. Foco do Vyzon é fundo de funil com WhatsApp e pipeline visual.",
    },
    {
        q: "Quando faz mais sentido ficar com RD Station?",
        a: "Time com operação de Inbound consolidada, dependência forte de email marketing, landing pages custom, nutrição por jornada, lead scoring maduro, integração com RD Summit/academia, e/ou stack MA já investido. Se MA é central no seu processo, RD é a escolha.",
    },
];

const VsRDStation = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Alternativa ao RD Station | Vyzon, CRM com WhatsApp e Eva IA";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.content =
                "Vyzon vs RD Station: CRM brasileiro pra fundo de funil com WhatsApp nativo, Hotmart/Kiwify, ranking ao vivo e IA generativa. Veja quando cada um faz mais sentido.";
        }
        trackEvent("compare_page_view", { vs: "rd-station" });
    }, []);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Product",
                name: "Vyzon CRM",
                description: "CRM brasileiro com WhatsApp nativo, Hotmart/Kiwify/Greenn, ranking ao vivo e Eva IA.",
                brand: { "@type": "Brand", name: "Vyzon" },
                offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "147", highPrice: "297", offerCount: "3", url: "https://vyzon.com.br/" },
            },
            { "@type": "FAQPage", mainEntity: FAQ.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Vyzon", item: "https://vyzon.com.br/" },
                    { "@type": "ListItem", position: 2, name: "Alternativas", item: "https://vyzon.com.br/alternativas" },
                    { "@type": "ListItem", position: 3, name: "Vyzon vs RD Station", item: "https://vyzon.com.br/alternativa-rd-station" },
                ],
            },
        ],
    };

    return (
        <div className="min-h-screen bg-[#06080a] text-white relative overflow-x-hidden">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10"
                style={{ background: `radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(21,86,192,0.06), transparent 60%)` }}
            />

            <LandingNav onCTAClick={() => { window.location.href = "/#agendar-demo"; }} onLoginClick={() => navigate("/auth")} />

            <section className="pt-28 md:pt-36 pb-20 px-6 max-w-5xl mx-auto relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ background: "rgba(0,227,122,0.08)", border: `1px solid ${C.brand}33`, color: C.brand }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                    Vyzon vs RD Station
                </div>

                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    <span style={{ color: C.brand }}>Fundo de funil</span>,
                    <br />
                    onde o <span className="text-white/85">RD</span>
                    <br />
                    <span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>precisa de ajuda</span>.
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    RD Station é imbatível em Marketing Automation. O Vyzon é feito pra quando o lead fica
                    sales-ready: WhatsApp nativo, ranking ao vivo e Eva IA redigindo cobrança. Dois produtos,
                    momentos diferentes do funil.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                    <button onClick={() => { window.location.href = "/#agendar-demo"; }} className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 16px 40px -12px ${C.brand}55` }}>
                        Testar 14 dias grátis
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </button>
                    <a href="#comparativo" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>Ver comparativo</a>
                </div>

                <div className="mt-14 grid grid-cols-3 gap-3 md:gap-6 max-w-xl">
                    {[
                        { label: "A partir de", value: "R$ 147", accent: C.brand },
                        { label: "Setup", value: "1 dia", accent: C.gold },
                        { label: "WhatsApp nativo", value: "Sim", accent: C.blue },
                    ].map((m) => (
                        <div key={m.label} className="p-3 md:p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: m.accent }}>{m.value}</div>
                            <div className="text-[11px] md:text-xs text-white/45 mt-1 uppercase tracking-wider font-medium">{m.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* TL;DR */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="p-7 rounded-2xl relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(0,227,122,0.06), rgba(0,227,122,0.015))", border: `1px solid ${C.brand}33` }}>
                        <div className="absolute inset-0 -z-10 opacity-30" style={{ background: `radial-gradient(600px 200px at 50% -50%, ${C.brand}22, transparent 70%)` }} />
                        <div className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase" style={{ color: C.brand }}>Escolha o Vyzon se</div>
                        <ul className="space-y-3 text-white/85 text-[15px]">
                            {[
                                "Teu time vende no WhatsApp, não em email",
                                "Precisa de fundo de funil, não de MA",
                                "Quer ranking ao vivo empurrando meta",
                                "Vende infoproduto via Hotmart/Kiwify",
                                "Quer IA generativa cobrando lead parado",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.brand}22` }}><Check className="h-3 w-3" style={{ color: C.brand }} strokeWidth={3} /></span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-7 rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(21,86,192,0.04), rgba(21,86,192,0.01))", border: `1px solid ${C.blue}2A` }}>
                        <div className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase" style={{ color: C.blue }}>Fique com RD Station se</div>
                        <ul className="space-y-3 text-white/75 text-[15px]">
                            {[
                                "Inbound é central: email, nutrição, landing page",
                                "Precisa de lead scoring e perfil ideal maduros",
                                "Ecossistema RD Summit e academia importam",
                                "Processo já investiu em fluxos de MA",
                                "Time 15+ com MKT e vendas integrados",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.blue}22` }}><Check className="h-3 w-3" style={{ color: C.blue }} strokeWidth={3} /></span>
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
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.blue }}>Como funciona</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        Quatro fluxos onde
                        <br />
                        o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.
                    </h2>
                </div>

                <div className="space-y-5">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div className="p-6 md:p-8" style={{ background: `linear-gradient(135deg, ${f.accent}10, transparent 50%)`, borderBottom: `1px solid ${f.accent}25` }}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}40` }}>
                                            {f.isEva ? <EvaAvatar size={28} /> : <Icon className="h-5 w-5" style={{ color: f.accent }} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">{f.title}</h3>
                                            <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{f.pitch}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                    <div className="p-6 md:p-7" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                        <div className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: f.accent }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.accent }} />
                                            No Vyzon
                                        </div>
                                        <ol className="space-y-3">
                                            {f.vyzonSteps.map((s, j) => (
                                                <li key={j} className="flex gap-3 text-[14px] leading-relaxed text-white/80">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px" style={{ background: `${f.accent}18`, color: f.accent }}>{j + 1}</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                    <div className="p-6 md:p-7" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                        <div className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase text-white/45 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
                                            No RD Station
                                        </div>
                                        <ol className="space-y-3">
                                            {f.rdSteps.map((s, j) => (
                                                <li key={j} className="flex gap-3 text-[14px] leading-relaxed text-white/55">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px bg-white/5 text-white/50">{j + 1}</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                <div className="px-6 md:px-8 py-4 text-[13px] md:text-[14px] font-medium" style={{ background: `${f.accent}08`, borderTop: `1px solid ${f.accent}20`, color: "rgba(255,255,255,0.85)" }}>
                                    <span className="font-bold" style={{ color: f.accent }}>Resultado:</span> {f.outcome}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* COMPARATIVO */}
            <section id="comparativo" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Linha por linha</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        Onde cada um
                        <br />
                        <span style={{ color: C.brand }}>faz sentido</span>.
                    </h2>
                </div>

                <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-bold" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-white/40">Critério</div>
                        <div style={{ color: C.brand }}>Vyzon</div>
                        <div className="text-white/55">RD Station</div>
                    </div>
                    {COMPARISON.map((row, i) => (
                        <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-5 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                            <div className="text-white/75 text-[14px] font-medium self-center">{row.label}</div>
                            <div className="self-center">
                                <div className="inline-flex items-center gap-1.5 text-[14px]" style={{ color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)", fontWeight: row.vyzon.good ? 600 : 500 }}>
                                    {row.vyzon.good && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                    {row.vyzon.text}
                                </div>
                            </div>
                            <div className="self-center">
                                <div className="text-white/80 text-[14px]">{row.rd.text}</div>
                                {row.rd.note && <div className="text-[11px] text-white/35 mt-1 leading-snug">{row.rd.note}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="md:hidden space-y-3">
                    {COMPARISON.map((row, i) => (
                        <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-3">{row.label}</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg" style={{ background: row.vyzon.good ? `${C.brand}0F` : "rgba(255,255,255,0.02)", border: row.vyzon.good ? `1px solid ${C.brand}33` : "1px solid rgba(255,255,255,0.06)" }}>
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: C.brand }}>Vyzon</div>
                                    <div className="text-[13px] font-semibold" style={{ color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)" }}>{row.vyzon.text}</div>
                                </div>
                                <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1 text-white/45">RD Station</div>
                                    <div className="text-[13px] text-white/85 font-medium">{row.rd.text}</div>
                                    {row.rd.note && <div className="text-[10px] text-white/40 mt-1 leading-snug">{row.rd.note}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">Dados públicos dos sites oficiais em abril 2026. Consulte <a href="https://www.rdstation.com/crm/precos" className="underline hover:text-white/60 transition" target="_blank" rel="noopener noreferrer">rdstation.com/crm/precos</a> pra valores atualizados. Features e disponibilidade podem ter mudado desde esta publicação.</p>
                </div>
            </section>

            {/* TCO */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Custo total real</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
                        {TCO.headline.split(",")[0]},
                        <br />
                        <span style={{ color: C.gold }}>time de 5 vendedores</span>.
                    </h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">{TCO.subtitle}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}04)`, border: `1px solid ${C.brand}30` }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.brand}20` }}>
                            <Wallet className="h-4 w-4" style={{ color: C.brand }} />
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: C.brand }}>Vyzon, time de 5</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            {TCO.vyzon.map((it) => (
                                <div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                                    <span className="text-[14px] text-white/75">{it.label}</span>
                                    <span className="text-[14px] font-semibold text-white/90 whitespace-nowrap">{it.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: `${C.brand}10`, borderTop: `1px solid ${C.brand}30` }}>
                            <span className="text-[13px] uppercase tracking-wider font-bold text-white/70">Total mensal</span>
                            <span className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.brand }}>{TCO.vyzonTotal}</span>
                        </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <Wallet className="h-4 w-4 text-white/40" />
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">RD Station, time de 5</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            {TCO.rd.map((it) => (
                                <div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                                    <span className="text-[14px] text-white/60">{it.label}</span>
                                    <span className="text-[14px] font-semibold text-white/75 whitespace-nowrap">{it.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                            <span className="text-[13px] uppercase tracking-wider font-bold text-white/55">Total mensal</span>
                            <span className="text-2xl md:text-3xl font-bold tracking-tight text-white/80">{TCO.rdTotal}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 p-5 md:p-6 rounded-xl text-center" style={{ background: `linear-gradient(90deg, ${C.brand}0A, ${C.gold}0A)`, border: `1px solid ${C.gold}25` }}>
                    <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-white/50 mb-1">Diferença por mês, time de 5</div>
                    <div className="text-3xl md:text-4xl font-bold tracking-tight">
                        <span style={{ color: C.brand }}>R$ 740</span>{" "}
                        <span className="text-white/50 text-lg md:text-xl font-medium">economizados / mês</span>
                    </div>
                    <div className="text-[12px] text-white/40 mt-2">Se você precisa de Marketing Automation, a conta muda: aí RD faz sentido completo.</div>
                </div>

                <div className="mt-4 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{TCO.note}</p>
                </div>
            </section>

            {/* CENÁRIOS */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.violet }}>Cenários reais</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Três situações onde<br /> o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.</h2>
                </div>

                <div className="space-y-4">
                    {SCENARIOS.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className="p-6 md:p-8 rounded-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.tint}, transparent 60%)`, border: `1px solid ${s.border}` }}>
                                <div className="flex items-start gap-4 md:gap-5">
                                    <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}40` }}>
                                        <Icon className="h-5 w-5 md:h-6 md:w-6" style={{ color: s.accent }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg md:text-xl font-semibold text-white mb-2">{s.title}</h3>
                                        <p className="text-white/65 leading-relaxed text-[15px]">{s.body}</p>
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
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.brand }}>Do zero ao operando</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight"><span style={{ color: C.brand }}>7 dias</span> no Vyzon<br /> vs <span className="text-white/70">2 a 6 semanas</span> no RD.</h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">Configurar CRM no RD sozinho é rápido. O que estica é o pacote completo: MA, email autenticado, Conversas e integrações.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <div className="rounded-2xl p-6 md:p-7 relative" style={{ background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}03)`, border: `1px solid ${C.brand}30` }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar className="h-4 w-4" style={{ color: C.brand }} />
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: C.brand }}>Vyzon, jornada de 7 dias</span>
                        </div>
                        <ol className="space-y-5 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: `${C.brand}30` }} />
                            {JOURNEY.vyzon.map((step, i) => (
                                <li key={i} className="flex gap-4 relative">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: C.brand, color: "#06080a", boxShadow: `0 0 0 4px ${C.brand}15` }}>{i + 1}</span>
                                    <div className="flex-1 min-w-0 pb-1">
                                        <div className="text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: C.brand }}>{step.day}</div>
                                        <div className="font-semibold text-white text-[15px] mb-1">{step.title}</div>
                                        <div className="text-[13px] text-white/55 leading-relaxed">{step.detail}</div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="rounded-2xl p-6 md:p-7 relative" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar className="h-4 w-4 text-white/40" />
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">RD Station, jornada 2 a 6 semanas</span>
                        </div>
                        <ol className="space-y-5 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
                            {JOURNEY.rd.map((step, i) => (
                                <li key={i} className="flex gap-4 relative">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 bg-white/10 text-white/70 ring-4 ring-white/5">{i + 1}</span>
                                    <div className="flex-1 min-w-0 pb-1">
                                        <div className="text-[11px] uppercase tracking-wider font-bold mb-1 text-white/50">{step.day}</div>
                                        <div className="font-semibold text-white/85 text-[15px] mb-1">{step.title}</div>
                                        <div className="text-[13px] text-white/45 leading-relaxed">{step.detail}</div>
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
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Perguntas reais</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Dúvidas que a gente<br /><span style={{ color: C.gold }}>escuta direto</span>.</h2>
                </div>

                <div className="space-y-3">
                    {FAQ.map((item, i) => (
                        <details key={i} className="group p-5 md:p-6 rounded-xl transition" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <summary className="cursor-pointer flex items-center justify-between gap-4 list-none">
                                <span className="text-[15px] md:text-base font-semibold text-white/90">{item.q}</span>
                                <span className="text-2xl leading-none transition-transform group-open:rotate-45 flex-shrink-0" style={{ color: C.gold }}>+</span>
                            </summary>
                            <p className="mt-4 text-white/65 leading-relaxed text-[15px]">{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* CTA FINAL */}
            <section className="px-6 max-w-4xl mx-auto pb-28">
                <div className="relative p-8 md:p-14 rounded-3xl text-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.brand}18, ${C.blue}10)`, border: `1px solid ${C.brand}30` }}>
                    <div aria-hidden className="absolute inset-0 -z-10 opacity-40" style={{ background: `radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%), radial-gradient(500px 250px at 80% 80%, ${C.blue}22, transparent 60%)` }} />
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">Testa 14 dias.<br /><span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Decide depois</span>.</h2>
                    <p className="text-white/65 mb-8 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed">Se o RD ainda fizer mais sentido no fim, tu leva teus dados em CSV e segue vida. Zero vendor lock-in.</p>
                    <button onClick={() => { window.location.href = "/#agendar-demo"; }} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition group" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 24px 60px -20px ${C.brand}88` }}>
                        Começar agora
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default VsRDStation;
