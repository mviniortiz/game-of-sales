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
    kommo: { text: string; note?: string };
};

const COMPARISON: Row[] = [
    {
        label: "Preço inicial",
        vyzon: { text: "R$ 147 / mês (BRL)", good: true },
        kommo: { text: "US$ 15 / mês*", note: "~R$ 80 com câmbio + IOF + taxa cartão internacional" },
    },
    {
        label: "Cobrança",
        vyzon: { text: "Em Real (BRL)", good: true },
        kommo: { text: "Em USD*", note: "sujeito a câmbio, IOF 6,38% e taxa internacional" },
    },
    {
        label: "WhatsApp",
        vyzon: { text: "Evolution API, seu número", good: true },
        kommo: { text: "Integração via Meta", note: "tier Advanced em diante, API oficial" },
    },
    {
        label: "Instagram Direct, Facebook, Telegram",
        vyzon: { text: "Roadmap (WhatsApp-first)" },
        kommo: { text: "Nativo, multi-canal", note: "ponto forte: chats unificados numa inbox" },
    },
    {
        label: "Hotmart, Kiwify, Greenn",
        vyzon: { text: "Webhook nativo", good: true },
        kommo: { text: "Via API/Zapier", note: "sem conector oficial nativo" },
    },
    {
        label: "Gamificação e ranking ao vivo",
        vyzon: { text: "Nativo, tempo real", good: true },
        kommo: { text: "Widgets pagos", note: "via marketplace de extensões" },
    },
    {
        label: "IA que cobra lead parado",
        vyzon: { text: "Eva IA generativa", good: true },
        kommo: { text: "SalesBot automação if-then", note: "bots de regras, não generativo" },
    },
    {
        label: "Idioma primário",
        vyzon: { text: "100% português BR", good: true },
        kommo: { text: "Localizado pt-BR", note: "interface traduzida, suporte avançado em inglês" },
    },
    {
        label: "Suporte",
        vyzon: { text: "WhatsApp, chat, email em BR", good: true },
        kommo: { text: "Chat/email, pt-BR limitado", note: "base global com time internacional" },
    },
    {
        label: "Digital Pipeline automation",
        vyzon: { text: "Regras de estágio" },
        kommo: { text: "Digital Pipeline maduro", note: "ponto forte: automações visuais avançadas, flow builder" },
    },
    {
        label: "Base global e marketplace",
        vyzon: { text: "Startup BR em crescimento" },
        kommo: { text: "Base mundial consolidada", note: "ponto forte: 35k+ clientes globais, 600+ integrações no marketplace" },
    },
];

type Feature = {
    icon: typeof MessageSquare;
    isEva?: boolean;
    accent: string;
    title: string;
    pitch: string;
    vyzonSteps: string[];
    kommoSteps: string[];
    outcome: string;
};

const FEATURES: Feature[] = [
    {
        icon: MessageSquare,
        accent: C.brand,
        title: "WhatsApp com seu próprio número, sem tier pago",
        pitch: "Kommo integra via API oficial do Meta a partir do tier Advanced. Custo por conversa se aplica fora da janela de 24h. No Vyzon, conecta seu número direto via Evolution API, sem custo por mensagem.",
        vyzonSteps: [
            "QR code no Vyzon em 3 minutos conectando seu número pessoal ou empresarial",
            "Sincronização automática das conversas com os deals correspondentes",
            "Template por estágio do pipeline, envio em massa sem fila de aprovação",
            "Custo marginal por mensagem: zero",
        ],
        kommoSteps: [
            "Contratar WhatsApp Business API pela Meta ou parceiro (BSP)",
            "Configurar número oficial, homologar templates de mensagem",
            "Enviar template pré-aprovado fora da janela de 24h (custo por mensagem)",
            "Disponível a partir do plano Advanced em diante",
        ],
        outcome: "Vyzon serve quem quer WhatsApp nativo sem camada fiscal e sem custo por mensagem.",
    },
    {
        icon: Webhook,
        accent: C.blue,
        title: "Hotmart, Kiwify e Greenn nativos",
        pitch: "Kommo é multi-canal global. Não foi feito com infoprodutor brasileiro em mente. O Vyzon nasce com Hotmart, Kiwify, Greenn e Eduzz como integração nativa.",
        vyzonSteps: [
            "Integrações → Hotmart → gera URL de webhook com secret no Vyzon",
            "Cola no painel da Hotmart em Ferramentas → Webhook",
            "Próxima venda vira deal com nome, email, telefone, produto e origem",
            "Pipeline já tem template pra lançamento, perpétuo, esteira e boleto",
        ],
        kommoSteps: [
            "Usar API do Kommo diretamente ou Zapier pra webhook",
            "Mapear campos custom manualmente, ajustar formato do payload",
            "Manter integração quando API da plataforma mudar",
            "Replicar pra Kiwify, Greenn, Eduzz separadamente",
        ],
        outcome: "Infoprodutor BR tem caminho direto no Vyzon. Zero middleware.",
    },
    {
        icon: Trophy,
        accent: C.gold,
        title: "Ranking ao vivo gamificado",
        pitch: "Kommo tem widgets de leaderboard pagos no marketplace. No Vyzon, ranking é feature central, nativa, em tempo real.",
        vyzonSteps: [
            "Define meta do mês (receita, deals ou % de pipeline)",
            "Ranking atualiza a cada deal movido pra Ganho, em tempo real",
            "Pódio, percentual, streak, selos incluídos",
            "TV da sala vira ritual diário do time",
        ],
        kommoSteps: [
            "Procurar widget de leaderboard no marketplace do Kommo",
            "Contratar o widget (tipicamente US$ 5 a US$ 20/mês)",
            "Configurar campos de cálculo, dashboard custom",
            "Atualização geralmente não é tempo real verdadeiro",
        ],
        outcome: "Ranking como feature nativa, não extensão paga.",
    },
    {
        icon: MessageSquare,
        isEva: true,
        accent: C.violet,
        title: "Eva IA vs SalesBot do Kommo",
        pitch: "Kommo tem SalesBot: bot de regras if-then pra automação. Eva é generativa: lê contexto do lead, propõe mensagem específica com tom brasileiro de vender.",
        vyzonSteps: [
            "Eva roda a cada 6h analisando deals parados há X dias",
            "Gera mensagem baseada em estágio, histórico e voz do time",
            "Vendedor vê proposta, edita se quiser, manda em 1 clique",
            "Aprende com aceite/rejeição, melhora ao longo do tempo",
        ],
        kommoSteps: [
            "Configurar SalesBot com triggers (tag, estágio, tempo)",
            "Redigir template de mensagem manualmente",
            "Sem adaptação por lead, texto é o mesmo pra todos",
            "Pra IA generativa, integrar ChatGPT por fora via webhook",
        ],
        outcome: "Eva é generativa por conversa. SalesBot é automação por regra.",
    },
];

const TCO = {
    headline: "Custo real por mês, time de 5 vendedores",
    subtitle:
        "Kommo e Vyzon disputam ICP parecido, mas o câmbio e o custo do WhatsApp oficial mudam a conta final.",
    vyzon: [
        { label: "Licença Vyzon Pro (5 usuários)", value: "R$ 985" },
        { label: "WhatsApp Evolution", value: "R$ 0" },
        { label: "Webhooks Hotmart/Kiwify", value: "R$ 0" },
        { label: "Ranking ao vivo", value: "Incluído" },
        { label: "Eva IA", value: "Incluído" },
    ],
    vyzonTotal: "R$ 985",
    kommo: [
        { label: "Kommo Advanced (5 usuários)*", value: "~R$ 625" },
        { label: "IOF + câmbio + taxa cartão", value: "~R$ 80" },
        { label: "WhatsApp Business API", value: "R$ 200 a R$ 400" },
        { label: "Widget ranking no marketplace", value: "R$ 50 a R$ 100" },
        { label: "Zapier (Hotmart/Kiwify, se usar)*", value: "R$ 100 a R$ 150" },
    ],
    kommoTotal: "~R$ 1.150 / mês",
    note: "Cálculo com Kommo Advanced US$ 25 por usuário, câmbio médio R$ 5,00 e IOF 6,38%. Valores em USD públicos sujeitos a alteração, consulte kommo.com/pricing pra valor atualizado. Se você não usa WhatsApp oficial nem widgets extras, a conta fica mais próxima (R$ 700 vs R$ 985).",
};

const JOURNEY = {
    vyzon: [
        { day: "Dia 1", title: "Conta + WhatsApp conectado", detail: "Self-service, QR code, primeiro deal no pipeline." },
        { day: "Dia 2", title: "Import de leads via CSV", detail: "Mapeamento automático, 2 mil contatos em 5 minutos." },
        { day: "Dia 3", title: "Webhooks Hotmart/Kiwify", detail: "URL gerada no Vyzon, colada no painel do checkout." },
        { day: "Dia 7", title: "Time completo operando", detail: "5 vendedores, ranking ao vivo, Eva cobrando lead parado." },
    ],
    kommo: [
        { day: "Dia 1-2", title: "Trial self-service", detail: "Conta criada, pipeline básico, Digital Pipeline configurado." },
        { day: "Dia 3-5", title: "Multi-canal conectado", detail: "WhatsApp oficial, Instagram, Facebook, Telegram via apps." },
        { day: "Semana 2", title: "Automações SalesBot", detail: "Bots de regra configurados, templates de mensagem aprovados." },
        { day: "Semana 3", title: "Time adaptado", detail: "Vendedores acostumados à inbox multi-canal e templates." },
    ],
};

const SCENARIOS = [
    {
        icon: TrendingUp,
        accent: C.brand,
        tint: "rgba(0,227,122,0.08)",
        border: "rgba(0,227,122,0.25)",
        title: "Time brasileiro que só usa WhatsApp (nem Instagram, nem Telegram)",
        body: "Kommo brilha em multi-canal: Instagram DM, Facebook Messenger, Telegram tudo na mesma inbox. Se o teu time vende só via WhatsApp (maioria do B2B BR e infoprodutor), tu não usa 70% do que paga no Kommo. Vyzon foca em WhatsApp profundo, não raso multi-canal.",
    },
    {
        icon: Users,
        accent: C.blue,
        tint: "rgba(21,86,192,0.08)",
        border: "rgba(21,86,192,0.28)",
        title: "Infoprodutor com Hotmart, Kiwify, Greenn",
        body: "Kommo é global, não foi feito com infoprodutor brasileiro no radar. Venda na Hotmart vai ter que passar por Zapier ou custom integration. No Vyzon, webhook é nativo e o pipeline já tem template pra lançamento, perpétuo e esteira.",
    },
    {
        icon: MessageSquare,
        accent: C.violet,
        tint: "rgba(139,92,246,0.08)",
        border: "rgba(139,92,246,0.28)",
        title: "Quer IA generativa, não SalesBot de regras",
        body: "SalesBot do Kommo é automação if-then: se X então Y. Serve pra flows padronizados. Eva IA do Vyzon é generativa: lê histórico do lead e propõe texto específico pra aquele caso. Dois mundos diferentes de automação.",
    },
];

const FAQ = [
    {
        q: "Kommo é mais barato, né? US$ 15/mês vs R$ 147.",
        a: "Só na licença básica do Base. O Kommo Base é muito limitado (sem automação avançada, sem API completa, sem leaderboards). O plano que a maioria usa é Advanced (US$ 25) ou Enterprise (US$ 45) — aí a conta em Real, com IOF 6,38% e câmbio R$ 5, bate em R$ 130 a R$ 240 por usuário. Vyzon R$ 147 inclui WhatsApp nativo e Eva IA que no Kommo seriam add-ons.",
    },
    {
        q: "Kommo tem mais canais que o Vyzon. Isso vale a pena?",
        a: "Depende do teu negócio. Se teu time vende por Instagram DM, Facebook Messenger, Telegram e email no mesmo dia, o multi-canal do Kommo é único. A maioria do B2B brasileiro e infoprodutor vive 95% no WhatsApp. Se é teu caso, o multi-canal do Kommo é custo sem benefício. Vyzon foca em profundidade no WhatsApp, não largura multi-canal.",
    },
    {
        q: "Como migrar do Kommo pro Vyzon?",
        a: "Exporte CSV do Kommo (contacts, companies, leads/deals) e importe no Vyzon em Configurações > Importar Dados. Mapeamento automático pros campos padrão, ajuste manual em campos custom. Planos anuais incluem migração assistida com nosso time.",
    },
    {
        q: "WhatsApp do Vyzon é oficial do Meta?",
        a: "Não. Conectamos via Evolution API, uma ponte com o WhatsApp Web. Você usa seu próprio número pessoal ou empresarial sem custo adicional. O WhatsApp do Kommo é pela API oficial do Meta (tier Advanced+), que exige homologação de templates e cobra por conversa fora da janela de 24h. Tradeoff: oficial dá mais robustez em volume enterprise, não oficial dá custo zero e mais simplicidade.",
    },
    {
        q: "Em que pontos o Kommo é melhor que o Vyzon?",
        a: "Honestamente: multi-canal nativo (Instagram Direct, Facebook Messenger, Telegram unificados) é único e o Vyzon ainda é WhatsApp-first. Digital Pipeline (flow builder visual pra automações) é mais maduro. Marketplace com 600+ integrações globais é mais amplo. Base de clientes mundial dá casos de uso em 50+ países. Se teu negócio precisa disso, Kommo é escolha melhor.",
    },
    {
        q: "Vyzon vai ter Instagram Direct no futuro?",
        a: "Está no roadmap, sim. Priorizamos primeiro aprofundar WhatsApp (integrado com pipeline, Eva IA, automações, handoff de conversas). Instagram Direct e outros canais vêm depois, quando a profundidade no WhatsApp estiver madura.",
    },
    {
        q: "Quando faz mais sentido o Kommo?",
        a: "Negócio que vende por Instagram Direct e Facebook Messenger (não só WhatsApp), operação em múltiplos países precisa de suporte global, uso intensivo de automação visual com Digital Pipeline, integrações específicas do marketplace internacional, e time confortável com interface em inglês pro nível avançado.",
    },
];

const VsKommo = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Alternativa ao Kommo | Vyzon, CRM brasileiro com WhatsApp e Eva IA";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) {
            meta.content =
                "Vyzon vs Kommo: CRM brasileiro com cobrança em Real, WhatsApp nativo, Hotmart/Kiwify e Eva IA generativa. Kommo é multi-canal global, Vyzon é WhatsApp-first e BR.";
        }
        trackEvent("compare_page_view", { vs: "kommo" });
    }, []);

    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            { "@type": "Product", name: "Vyzon CRM", description: "CRM brasileiro com WhatsApp nativo, Hotmart/Kiwify/Greenn, ranking ao vivo e Eva IA.", brand: { "@type": "Brand", name: "Vyzon" }, offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "147", highPrice: "297", offerCount: "3", url: "https://vyzon.com.br/" } },
            { "@type": "FAQPage", mainEntity: FAQ.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
            { "@type": "BreadcrumbList", itemListElement: [
                { "@type": "ListItem", position: 1, name: "Vyzon", item: "https://vyzon.com.br/" },
                { "@type": "ListItem", position: 2, name: "Alternativas", item: "https://vyzon.com.br/alternativas" },
                { "@type": "ListItem", position: 3, name: "Vyzon vs Kommo", item: "https://vyzon.com.br/alternativa-kommo" },
            ] },
        ],
    };

    return (
        <div className="min-h-screen bg-[#06080a] text-white relative overflow-x-hidden">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: `radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(239,68,68,0.05), transparent 60%)` }} />

            <LandingNav onCTAClick={() => { window.location.href = "/#agendar-demo"; }} onLoginClick={() => navigate("/auth")} />

            <section className="pt-28 md:pt-36 pb-20 px-6 max-w-5xl mx-auto relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ background: "rgba(0,227,122,0.08)", border: `1px solid ${C.brand}33`, color: C.brand }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                    Vyzon vs Kommo
                </div>

                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    <span style={{ color: C.brand }}>WhatsApp-first</span>,
                    <br />
                    em <span className="text-white/85">Real</span>,
                    <br />
                    <span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>feito pro Brasil</span>.
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    Kommo é excelente CRM multi-canal global cobrado em USD. Vyzon é CRM WhatsApp-first
                    brasileiro, em Real, com Hotmart/Kiwify nativo e Eva IA generativa. ICP parecido,
                    posicionamento diferente.
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
                        { label: "Preço em", value: "BRL", accent: C.brand },
                        { label: "WhatsApp", value: "Nativo", accent: C.gold },
                        { label: "Hotmart/Kiwify", value: "Sim", accent: C.blue },
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
                                "Teu time vende quase tudo pelo WhatsApp",
                                "Quer cobrar em Real, sem IOF ou câmbio",
                                "Vende infoproduto via Hotmart/Kiwify/Greenn",
                                "Valoriza ranking ao vivo e gamificação nativa",
                                "Busca IA generativa, não SalesBot de regras",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.brand}22` }}><Check className="h-3 w-3" style={{ color: C.brand }} strokeWidth={3} /></span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-7 rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(245,184,74,0.04), rgba(245,184,74,0.01))", border: `1px solid ${C.gold}2A` }}>
                        <div className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase" style={{ color: C.gold }}>Fique com Kommo se</div>
                        <ul className="space-y-3 text-white/75 text-[15px]">
                            {[
                                "Vende por Instagram DM, Facebook Messenger, Telegram",
                                "Opera em múltiplos países com time global",
                                "Valoriza Digital Pipeline com flow builder visual",
                                "Precisa de marketplace com 600+ integrações",
                                "Time confortável com interface avançada em inglês",
                            ].map((t, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.gold}22` }}><Check className="h-3 w-3" style={{ color: C.gold }} strokeWidth={3} /></span>
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
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Quatro fluxos onde<br /> o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.</h2>
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
                                            No Kommo
                                        </div>
                                        <ol className="space-y-3">
                                            {f.kommoSteps.map((s, j) => (
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
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Onde cada um<br /><span style={{ color: C.brand }}>faz sentido</span>.</h2>
                </div>

                <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-bold" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-white/40">Critério</div>
                        <div style={{ color: C.brand }}>Vyzon</div>
                        <div className="text-white/55">Kommo</div>
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
                                <div className="text-white/80 text-[14px]">{row.kommo.text}</div>
                                {row.kommo.note && <div className="text-[11px] text-white/35 mt-1 leading-snug">{row.kommo.note}</div>}
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
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1 text-white/45">Kommo</div>
                                    <div className="text-[13px] text-white/85 font-medium">{row.kommo.text}</div>
                                    {row.kommo.note && <div className="text-[10px] text-white/40 mt-1 leading-snug">{row.kommo.note}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">Dados públicos dos sites oficiais em abril 2026. Consulte <a href="https://www.kommo.com/pricing/" className="underline hover:text-white/60 transition" target="_blank" rel="noopener noreferrer">kommo.com/pricing</a> pra valores atualizados. Features e disponibilidade podem ter mudado desde esta publicação.</p>
                </div>
            </section>

            {/* TCO */}
            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Custo total real</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">{TCO.headline.split(",")[0]},<br /><span style={{ color: C.gold }}>time de 5 vendedores</span>.</h2>
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
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">Kommo, time de 5</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            {TCO.kommo.map((it) => (
                                <div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                                    <span className="text-[14px] text-white/60">{it.label}</span>
                                    <span className="text-[14px] font-semibold text-white/75 whitespace-nowrap">{it.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                            <span className="text-[13px] uppercase tracking-wider font-bold text-white/55">Total mensal</span>
                            <span className="text-2xl md:text-3xl font-bold tracking-tight text-white/80">{TCO.kommoTotal}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 p-5 md:p-6 rounded-xl text-center" style={{ background: `linear-gradient(90deg, ${C.brand}0A, ${C.gold}0A)`, border: `1px solid ${C.gold}25` }}>
                    <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-white/50 mb-1">Diferença por mês, time de 5</div>
                    <div className="text-3xl md:text-4xl font-bold tracking-tight">
                        <span style={{ color: C.brand }}>~R$ 165</span>{" "}
                        <span className="text-white/50 text-lg md:text-xl font-medium">economizados / mês</span>
                    </div>
                    <div className="text-[12px] text-white/40 mt-2">Sem WhatsApp oficial e widgets extras, Kommo fica mais barato. Depende muito do uso.</div>
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
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight"><span style={{ color: C.brand }}>7 dias</span> no Vyzon<br /> vs <span className="text-white/70">2 a 3 semanas</span> no Kommo.</h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">Os dois são self-service. O que estica o Kommo é configurar multi-canal, homologar WhatsApp oficial e montar SalesBot.</p>
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
                            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">Kommo, jornada 2 a 3 semanas</span>
                        </div>
                        <ol className="space-y-5 relative">
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
                            {JOURNEY.kommo.map((step, i) => (
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
                <div className="relative p-8 md:p-14 rounded-3xl text-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.brand}18, ${C.gold}10)`, border: `1px solid ${C.brand}30` }}>
                    <div aria-hidden className="absolute inset-0 -z-10 opacity-40" style={{ background: `radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%), radial-gradient(500px 250px at 80% 80%, ${C.gold}22, transparent 60%)` }} />
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">Testa 14 dias.<br /><span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Decide depois</span>.</h2>
                    <p className="text-white/65 mb-8 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed">Se o Kommo fizer mais sentido no fim, tu leva teus dados em CSV e segue vida. Zero vendor lock-in.</p>
                    <button onClick={() => { window.location.href = "/#agendar-demo"; }} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition group" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 24px 60px -20px ${C.brand}88` }}>
                        Começar agora
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default VsKommo;
