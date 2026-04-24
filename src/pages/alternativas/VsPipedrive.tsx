import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, CircleAlert, TrendingUp, MessageSquare, Users, Webhook, Trophy, Wallet, Calendar } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { trackEvent } from "@/lib/analytics";

const C = { brand: "#00E37A", brandDim: "#00B266", blue: "#1556C0", violet: "#8B5CF6", gold: "#F5B84A" };

type Row = { label: string; vyzon: { text: string; good?: boolean }; pd: { text: string; note?: string } };

const COMPARISON: Row[] = [
    { label: "Preço inicial", vyzon: { text: "R$ 147 / mês (BRL)", good: true }, pd: { text: "US$ 14 / mês*", note: "plano Essential, ~R$ 80 com câmbio e IOF" } },
    { label: "Plano comum", vyzon: { text: "R$ 197 / mês" }, pd: { text: "US$ 29 a US$ 59 / mês*", note: "Advanced e Professional, ~R$ 160 a R$ 320 com câmbio + IOF" } },
    { label: "Cobrança", vyzon: { text: "Em Real (BRL)", good: true }, pd: { text: "Em USD*", note: "sujeito a câmbio, IOF 6,38% e taxa internacional" } },
    { label: "Pipeline visual drag-and-drop", vyzon: { text: "Nativo, dark mode", good: true }, pd: { text: "Referência do mercado", note: "ponto forte: UX de pipeline é o core do Pipedrive há 10+ anos" } },
    { label: "WhatsApp", vyzon: { text: "Evolution API nativa", good: true }, pd: { text: "Via app marketplace", note: "apps de terceiros pagos, sem nativo" } },
    { label: "Hotmart, Kiwify, Greenn", vyzon: { text: "Webhook nativo", good: true }, pd: { text: "Via Zapier/Make", note: "sem conector oficial nativo" } },
    { label: "Gamificação e ranking ao vivo", vyzon: { text: "Nativo, tempo real", good: true }, pd: { text: "Apps do marketplace", note: "widgets pagos de terceiros" } },
    { label: "IA que cobra lead parado", vyzon: { text: "Eva IA generativa", good: true }, pd: { text: "AI Sales Assistant", note: "assistente com insights, planos Advanced+" } },
    { label: "Idioma primário", vyzon: { text: "100% português BR", good: true }, pd: { text: "Localizado pt-BR", note: "UI traduzida, docs/suporte avançado em inglês" } },
    { label: "Base global", vyzon: { text: "Startup BR em crescimento" }, pd: { text: "Base mundial consolidada", note: "ponto forte: 100k+ clientes em 170 países, marketplace maduro" } },
    { label: "Insights e relatórios", vyzon: { text: "Dashboards nativos" }, pd: { text: "Insights avançados", note: "ponto forte: forecasting, deals analytics, activity reports" } },
];

type Feature = { icon: typeof MessageSquare; isEva?: boolean; accent: string; title: string; pitch: string; vyzonSteps: string[]; pdSteps: string[]; outcome: string };

const FEATURES: Feature[] = [
    { icon: MessageSquare, accent: C.brand, title: "WhatsApp no card do deal, sem app pago", pitch: "Pipedrive tem pipeline impecável, mas WhatsApp fica no marketplace de terceiros. No Vyzon, o chat aparece dentro do próprio card.", vyzonSteps: ["QR code em 3 minutos pelo Evolution API, custo adicional zero", "Histórico sincronizado com o deal correspondente", "Template por estágio, envio sem fila de aprovação", "Gestor audita todas conversas sem pedir print"], pdSteps: ["Procurar app de WhatsApp no Pipedrive Marketplace", "Contratar solução (tipicamente US$ 15 a US$ 50/mês)", "Integrar número, mapear conversas manualmente", "Suporte depende do vendor do app"], outcome: "Vyzon entrega WhatsApp como feature central. Pipedrive trata como extensão." },
    { icon: Webhook, accent: C.blue, title: "Hotmart, Kiwify e Greenn como webhook nativo", pitch: "Pipedrive é global, não foi feito pensando em infoprodutor BR. Webhooks de checkout brasileiro não têm conector oficial.", vyzonSteps: ["Integrações → Hotmart → gera URL de webhook com secret no Vyzon", "Cola no painel do produtor em Ferramentas → Webhook", "Próxima venda cria deal com nome, email, telefone, produto, origem", "Pipeline templates prontos pra lançamento, perpétuo, esteira"], pdSteps: ["Conectar Zapier ou Make ao Pipedrive (custo mensal extra)", "Criar zap Hotmart → Zapier → Pipedrive Deal, mapear campos", "Debugar payload quando API da plataforma muda", "Replicar pra Kiwify, Greenn, Eduzz separadamente"], outcome: "Infoprodutor BR tem caminho direto no Vyzon, sem middleware." },
    { icon: Trophy, accent: C.gold, title: "Ranking nativo em tempo real", pitch: "Pipedrive tem leaderboards via apps pagos no marketplace. No Vyzon, ranking é nativo, em tempo real, incluído no plano.", vyzonSteps: ["Define meta (receita, deals ou % de pipeline)", "Ranking atualiza a cada deal movido pra Ganho", "Pódio com percentual, streak, selos nativos", "TV da sala vira ritual do time"], pdSteps: ["Procurar app de leaderboard/gamification no marketplace", "Contratar widget (US$ 5 a US$ 25/mês)", "Configurar campos de cálculo e atualização", "Nem sempre tempo real verdadeiro"], outcome: "Ranking nativo vira combustível diário, não addon pago." },
    { icon: MessageSquare, isEva: true, accent: C.violet, title: "Eva IA vs AI Sales Assistant", pitch: "Pipedrive tem AI Sales Assistant com insights e sugestões. Eva é generativa por conversa: escreve o texto de cobrança adaptado a cada lead.", vyzonSteps: ["Eva roda a cada 6h analisando deals parados há X dias", "Gera mensagem baseada em estágio, histórico e voz do time", "Vendedor edita se quiser, manda em 1 clique", "Aprende com aceite/rejeição ao longo do tempo"], pdSteps: ["AI Sales Assistant entrega insights (deal risk, next step)", "Sugere ações baseado em padrões, sem redigir mensagem custom", "Pra copy generativa, integrar ChatGPT via Zapier", "Disponível no plano Advanced em diante"], outcome: "Vyzon entrega IA generativa que fala português de vendedor BR. Pipedrive entrega assistente de produtividade." },
];

const TCO = {
    headline: "Custo real por mês, time de 5 vendedores",
    subtitle: "Pipedrive tem preço competitivo em licença mas cobrado em USD. WhatsApp e gamificação vêm pelo marketplace.",
    vyzon: [{ label: "Licença Vyzon Pro (5 usuários)", value: "R$ 985" }, { label: "WhatsApp Evolution", value: "R$ 0" }, { label: "Webhooks Hotmart/Kiwify", value: "R$ 0" }, { label: "Ranking ao vivo", value: "Incluído" }, { label: "Eva IA", value: "Incluído" }],
    vyzonTotal: "R$ 985",
    pd: [{ label: "Pipedrive Advanced (5 usuários)*", value: "~R$ 725" }, { label: "IOF + câmbio + taxa cartão", value: "~R$ 90" }, { label: "App WhatsApp no marketplace", value: "R$ 150 a R$ 300" }, { label: "App leaderboard/gamification", value: "R$ 50 a R$ 120" }, { label: "Zapier (Hotmart/Kiwify, se usar)", value: "R$ 100 a R$ 150" }],
    pdTotal: "~R$ 1.235 / mês",
    note: "Cálculo com Pipedrive Advanced US$ 29 por usuário, câmbio médio R$ 5,00 e IOF 6,38%. Valores em USD públicos sujeitos a alteração, consulte pipedrive.com/en/pricing pra valor atualizado. Sem apps extras, Pipedrive sai mais barato que o valor acima.",
};

const JOURNEY = {
    vyzon: [{ day: "Dia 1", title: "Conta + WhatsApp conectado", detail: "Self-service, QR code, primeiro deal no pipeline." }, { day: "Dia 2", title: "Import de leads via CSV", detail: "Mapeamento automático, 2 mil contatos em 5 minutos." }, { day: "Dia 3", title: "Webhooks Hotmart/Kiwify", detail: "URL gerada no Vyzon, colada no painel do checkout." }, { day: "Dia 7", title: "Time completo operando", detail: "5 vendedores, ranking ao vivo, Eva cobrando lead parado." }],
    pd: [{ day: "Dia 1-2", title: "Trial self-service", detail: "Conta criada, pipeline configurado, primeira venda registrada." }, { day: "Dia 3-5", title: "Apps do marketplace", detail: "WhatsApp, gamification, automações — cada um contratado à parte." }, { day: "Semana 2", title: "Automações Workflow", detail: "Regras if-then configuradas, AI Sales Assistant calibrado." }, { day: "Semana 3", title: "Time operando", detail: "Vendedores acostumados ao pipeline, rotina de atividades." }],
};

const SCENARIOS = [
    { icon: TrendingUp, accent: C.brand, tint: "rgba(0,227,122,0.08)", border: "rgba(0,227,122,0.25)", title: "Time brasileiro que prefere pagar em Real", body: "Pipedrive tem plano base barato (~US$ 14), mas o que vira fatura em Real é câmbio + IOF 6,38% + taxa cartão internacional. Pro plano Advanced (US$ 29), a conta fica em torno de R$ 160 a R$ 180 por usuário. Vyzon em R$ 147 é cobrado direto no cartão ou boleto BR, sem volatilidade." },
    { icon: Users, accent: C.blue, tint: "rgba(21,86,192,0.08)", border: "rgba(21,86,192,0.28)", title: "Infoprodutor com Hotmart e Kiwify", body: "Pipedrive é CRM global, forte em pipeline e UX. Hotmart, Kiwify, Greenn não têm conector nativo. Você paga Zapier ou mantém integração no braço. No Vyzon, webhook é nativo e pipeline já vem com template de lançamento." },
    { icon: MessageSquare, accent: C.violet, tint: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.28)", title: "Time que quer WhatsApp sem pagar app extra", body: "Pipedrive Marketplace tem várias opções de WhatsApp, todas pagas. Custo começa em US$ 15/mês e vai até US$ 50. No Vyzon, WhatsApp é feature central, sem tier extra. Seu número pessoal ou empresarial conecta via QR code." },
];

const FAQ = [
    { q: "Pipedrive tem preço base mais barato, vale a pena trocar?", a: "O plano Essential (US$ 14) do Pipedrive é mais limitado que o plano Pro do Vyzon. A maioria usa Advanced (US$ 29) ou Professional (US$ 59). Com câmbio R$ 5 e IOF 6,38%, isso vira R$ 155 a R$ 315 por usuário. Vyzon R$ 147 fica no mesmo patamar do Advanced, mas inclui WhatsApp nativo, Eva IA e ranking ao vivo, que no Pipedrive seriam apps pagos." },
    { q: "Pipedrive tem fama de ter o melhor pipeline visual. Vyzon chega nesse nível?", a: "Pipedrive tem 10+ anos refinando UX de pipeline e isso se sente. Vyzon entrega pipeline visual Kanban moderno, dark mode Linear-style, drag-and-drop, templates por caso de uso (lançamento, perpétuo, esteira). Pra quem quer pipeline clean brasileiro, entregamos bem. Pra quem quer a referência do mercado global, Pipedrive." },
    { q: "Como migrar do Pipedrive pro Vyzon?", a: "Exporte CSV do Pipedrive (contacts, organizations, deals, activities) e importe no Vyzon em Configurações > Importar Dados. Mapeamento automático pros campos padrão. Campos custom e filtros você ajusta manualmente. Planos anuais incluem migração assistida." },
    { q: "Pipedrive tem AI Sales Assistant. Vyzon compete com isso?", a: "AI Sales Assistant do Pipedrive foca em insights e sugestões (deal risk, next step, forecast). Eva IA do Vyzon foca em ação: redige mensagem de cobrança pra lead parado, adapta ao contexto e manda no WhatsApp. São dois tipos de IA com propósitos diferentes." },
    { q: "Em que pontos o Pipedrive é melhor que o Vyzon?", a: "Honestamente: UX de pipeline é referência, 10+ anos de refinamento; marketplace global com 400+ apps dá flexibilidade pra casos específicos (WhatsApp, gamification, analytics); base mundial de 100k+ clientes em 170 países dá casos de uso enterprise; insights e forecasting são mais maduros. Se teu processo depende disso, Pipedrive é escolha natural." },
    { q: "Quando faz mais sentido o Pipedrive?", a: "Time global com operação em múltiplos países, dependência de apps específicos do marketplace (forecasting avançado, integrações nicho), budget corporativo em USD sem restrição cambial, cultura de vendas anglo-saxã (livros, metodologias importadas) e processo já investido no ecossistema Pipedrive." },
];

const VsPipedrive = () => {
    const navigate = useNavigate();
    useEffect(() => {
        document.title = "Alternativa ao Pipedrive | Vyzon, CRM brasileiro com WhatsApp";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) meta.content = "Vyzon vs Pipedrive: CRM brasileiro com cobrança em Real, WhatsApp nativo, Hotmart/Kiwify e Eva IA. Veja quando cada um faz mais sentido.";
        trackEvent("compare_page_view", { vs: "pipedrive" });
    }, []);

    const schema = { "@context": "https://schema.org", "@graph": [
        { "@type": "Product", name: "Vyzon CRM", description: "CRM brasileiro com WhatsApp nativo, Hotmart/Kiwify, ranking ao vivo e Eva IA.", brand: { "@type": "Brand", name: "Vyzon" }, offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "147", highPrice: "297", offerCount: "3", url: "https://vyzon.com.br/" } },
        { "@type": "FAQPage", mainEntity: FAQ.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Vyzon", item: "https://vyzon.com.br/" }, { "@type": "ListItem", position: 2, name: "Alternativas", item: "https://vyzon.com.br/alternativas" }, { "@type": "ListItem", position: 3, name: "Vyzon vs Pipedrive", item: "https://vyzon.com.br/alternativa-pipedrive" }] },
    ] };

    return (
        <div className="min-h-screen bg-[#06080a] text-white relative overflow-x-hidden">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: `radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(21,86,192,0.06), transparent 60%)` }} />
            <LandingNav />

            <section className="pt-28 md:pt-36 pb-20 px-6 max-w-5xl mx-auto relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ background: "rgba(0,227,122,0.08)", border: `1px solid ${C.brand}33`, color: C.brand }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                    Vyzon vs Pipedrive
                </div>
                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    A força do <span style={{ color: C.brand }}>Pipedrive</span>,
                    <br />em <span className="text-white/85">Real</span>,
                    <br /><span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>com o que falta</span>.
                </h1>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    Pipedrive é referência global em pipeline visual e UX. O Vyzon adiciona o que o
                    time brasileiro precisa: WhatsApp nativo, Hotmart/Kiwify, ranking ao vivo,
                    Eva IA e cobrança em Real.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                    <button onClick={() => navigate("/")} className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 16px 40px -12px ${C.brand}55` }}>Testar 14 dias grátis<ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" /></button>
                    <a href="#comparativo" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>Ver comparativo</a>
                </div>
                <div className="mt-14 grid grid-cols-3 gap-3 md:gap-6 max-w-xl">
                    {[{ label: "Preço em", value: "BRL", accent: C.brand }, { label: "WhatsApp", value: "Nativo", accent: C.gold }, { label: "Hotmart/Kiwify", value: "Sim", accent: C.blue }].map((m) => (
                        <div key={m.label} className="p-3 md:p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: m.accent }}>{m.value}</div>
                            <div className="text-[11px] md:text-xs text-white/45 mt-1 uppercase tracking-wider font-medium">{m.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="p-7 rounded-2xl relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(0,227,122,0.06), rgba(0,227,122,0.015))", border: `1px solid ${C.brand}33` }}>
                        <div className="absolute inset-0 -z-10 opacity-30" style={{ background: `radial-gradient(600px 200px at 50% -50%, ${C.brand}22, transparent 70%)` }} />
                        <div className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase" style={{ color: C.brand }}>Escolha o Vyzon se</div>
                        <ul className="space-y-3 text-white/85 text-[15px]">
                            {["Teu time vive no WhatsApp e quer chat no deal", "Vende infoproduto via Hotmart, Kiwify ou Greenn", "Quer cobrar em Real, sem câmbio ou IOF", "Valoriza ranking ao vivo gamificado", "Quer IA generativa que escreve a mensagem"].map((t, i) => (
                                <li key={i} className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.brand}22` }}><Check className="h-3 w-3" style={{ color: C.brand }} strokeWidth={3} /></span><span>{t}</span></li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-7 rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(21,86,192,0.04), rgba(21,86,192,0.01))", border: `1px solid ${C.blue}2A` }}>
                        <div className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase" style={{ color: C.blue }}>Fique com Pipedrive se</div>
                        <ul className="space-y-3 text-white/75 text-[15px]">
                            {["Opera globalmente em múltiplos países", "Precisa de marketplace com 400+ apps", "Forecasting e analytics são centrais", "Cultura de vendas anglo-saxã (playbooks importados)", "Budget em USD sem restrição cambial"].map((t, i) => (
                                <li key={i} className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.blue}22` }}><Check className="h-3 w-3" style={{ color: C.blue }} strokeWidth={3} /></span><span>{t}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.blue }}>Como funciona</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Quatro fluxos onde<br />o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.</h2>
                </div>
                <div className="space-y-5">
                    {FEATURES.map((f, i) => { const Icon = f.icon; return (
                        <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div className="p-6 md:p-8" style={{ background: `linear-gradient(135deg, ${f.accent}10, transparent 50%)`, borderBottom: `1px solid ${f.accent}25` }}>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}40` }}>{f.isEva ? <EvaAvatar size={28} /> : <Icon className="h-5 w-5" style={{ color: f.accent }} />}</div>
                                    <div className="flex-1 min-w-0"><h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">{f.title}</h3><p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{f.pitch}</p></div>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                <div className="p-6 md:p-7" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                    <div className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: f.accent }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: f.accent }} />No Vyzon</div>
                                    <ol className="space-y-3">{f.vyzonSteps.map((s, j) => (<li key={j} className="flex gap-3 text-[14px] leading-relaxed text-white/80"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px" style={{ background: `${f.accent}18`, color: f.accent }}>{j + 1}</span>{s}</li>))}</ol>
                                </div>
                                <div className="p-6 md:p-7" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                                    <div className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase text-white/45 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white/25" />No Pipedrive</div>
                                    <ol className="space-y-3">{f.pdSteps.map((s, j) => (<li key={j} className="flex gap-3 text-[14px] leading-relaxed text-white/55"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px bg-white/5 text-white/50">{j + 1}</span>{s}</li>))}</ol>
                                </div>
                            </div>
                            <div className="px-6 md:px-8 py-4 text-[13px] md:text-[14px] font-medium" style={{ background: `${f.accent}08`, borderTop: `1px solid ${f.accent}20`, color: "rgba(255,255,255,0.85)" }}><span className="font-bold" style={{ color: f.accent }}>Resultado:</span> {f.outcome}</div>
                        </div>
                    ); })}
                </div>
            </section>

            <section id="comparativo" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Linha por linha</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Onde cada um<br /><span style={{ color: C.brand }}>faz sentido</span>.</h2>
                </div>
                <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-bold" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="text-white/40">Critério</div><div style={{ color: C.brand }}>Vyzon</div><div className="text-white/55">Pipedrive</div>
                    </div>
                    {COMPARISON.map((row, i) => (
                        <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-5 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                            <div className="text-white/75 text-[14px] font-medium self-center">{row.label}</div>
                            <div className="self-center"><div className="inline-flex items-center gap-1.5 text-[14px]" style={{ color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)", fontWeight: row.vyzon.good ? 600 : 500 }}>{row.vyzon.good && <Check className="h-3.5 w-3.5" strokeWidth={3} />}{row.vyzon.text}</div></div>
                            <div className="self-center"><div className="text-white/80 text-[14px]">{row.pd.text}</div>{row.pd.note && <div className="text-[11px] text-white/35 mt-1 leading-snug">{row.pd.note}</div>}</div>
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
                                    <div className="text-[9px] uppercase tracking-wider font-bold mb-1 text-white/45">Pipedrive</div>
                                    <div className="text-[13px] text-white/85 font-medium">{row.pd.text}</div>
                                    {row.pd.note && <div className="text-[10px] text-white/40 mt-1 leading-snug">{row.pd.note}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-5 flex gap-2 text-[11px] text-white/35 max-w-3xl">
                    <CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">Dados públicos dos sites oficiais em abril 2026. Consulte <a href="https://www.pipedrive.com/en/pricing" className="underline hover:text-white/60 transition" target="_blank" rel="noopener noreferrer">pipedrive.com/en/pricing</a> pra valores atualizados. Features e disponibilidade podem ter mudado desde esta publicação.</p>
                </div>
            </section>

            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10">
                    <div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Custo total real</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">{TCO.headline.split(",")[0]},<br /><span style={{ color: C.gold }}>time de 5 vendedores</span>.</h2>
                    <p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">{TCO.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}04)`, border: `1px solid ${C.brand}30` }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.brand}20` }}><Wallet className="h-4 w-4" style={{ color: C.brand }} /><span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: C.brand }}>Vyzon, time de 5</span></div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>{TCO.vyzon.map((it) => (<div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}><span className="text-[14px] text-white/75">{it.label}</span><span className="text-[14px] font-semibold text-white/90 whitespace-nowrap">{it.value}</span></div>))}</div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: `${C.brand}10`, borderTop: `1px solid ${C.brand}30` }}><span className="text-[13px] uppercase tracking-wider font-bold text-white/70">Total mensal</span><span className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.brand }}>{TCO.vyzonTotal}</span></div>
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><Wallet className="h-4 w-4 text-white/40" /><span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">Pipedrive, time de 5</span></div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>{TCO.pd.map((it) => (<div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}><span className="text-[14px] text-white/60">{it.label}</span><span className="text-[14px] font-semibold text-white/75 whitespace-nowrap">{it.value}</span></div>))}</div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.08)" }}><span className="text-[13px] uppercase tracking-wider font-bold text-white/55">Total mensal</span><span className="text-2xl md:text-3xl font-bold tracking-tight text-white/80">{TCO.pdTotal}</span></div>
                    </div>
                </div>
                <div className="mt-5 p-5 md:p-6 rounded-xl text-center" style={{ background: `linear-gradient(90deg, ${C.brand}0A, ${C.gold}0A)`, border: `1px solid ${C.gold}25` }}>
                    <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-white/50 mb-1">Diferença por mês, time de 5</div>
                    <div className="text-3xl md:text-4xl font-bold tracking-tight"><span style={{ color: C.brand }}>~R$ 250</span> <span className="text-white/50 text-lg md:text-xl font-medium">economizados / mês</span></div>
                    <div className="text-[12px] text-white/40 mt-2">Sem apps do marketplace e sem Zapier, Pipedrive sai mais barato que o Vyzon.</div>
                </div>
                <div className="mt-4 flex gap-2 text-[11px] text-white/35 max-w-3xl"><CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" /><p className="leading-relaxed">{TCO.note}</p></div>
            </section>

            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.violet }}>Cenários reais</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Três situações onde<br />o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.</h2></div>
                <div className="space-y-4">{SCENARIOS.map((s, i) => { const Icon = s.icon; return (
                    <div key={i} className="p-6 md:p-8 rounded-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.tint}, transparent 60%)`, border: `1px solid ${s.border}` }}>
                        <div className="flex items-start gap-4 md:gap-5">
                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}40` }}><Icon className="h-5 w-5 md:h-6 md:w-6" style={{ color: s.accent }} /></div>
                            <div className="flex-1 min-w-0"><h3 className="text-lg md:text-xl font-semibold text-white mb-2">{s.title}</h3><p className="text-white/65 leading-relaxed text-[15px]">{s.body}</p></div>
                        </div>
                    </div>
                ); })}</div>
            </section>

            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.brand }}>Do zero ao operando</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight"><span style={{ color: C.brand }}>7 dias</span> no Vyzon<br />vs <span className="text-white/70">2 a 3 semanas</span> no Pipedrive.</h2><p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">Pipedrive é self-service rápido. O que estica é configurar apps do marketplace e integrações custom.</p></div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <div className="rounded-2xl p-6 md:p-7 relative" style={{ background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}03)`, border: `1px solid ${C.brand}30` }}>
                        <div className="flex items-center gap-2 mb-6"><Calendar className="h-4 w-4" style={{ color: C.brand }} /><span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: C.brand }}>Vyzon, jornada de 7 dias</span></div>
                        <ol className="space-y-5 relative"><div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: `${C.brand}30` }} />
                            {JOURNEY.vyzon.map((step, i) => (<li key={i} className="flex gap-4 relative"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: C.brand, color: "#06080a", boxShadow: `0 0 0 4px ${C.brand}15` }}>{i + 1}</span><div className="flex-1 min-w-0 pb-1"><div className="text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: C.brand }}>{step.day}</div><div className="font-semibold text-white text-[15px] mb-1">{step.title}</div><div className="text-[13px] text-white/55 leading-relaxed">{step.detail}</div></div></li>))}
                        </ol>
                    </div>
                    <div className="rounded-2xl p-6 md:p-7 relative" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-6"><Calendar className="h-4 w-4 text-white/40" /><span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">Pipedrive, jornada 2 a 3 semanas</span></div>
                        <ol className="space-y-5 relative"><div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
                            {JOURNEY.pd.map((step, i) => (<li key={i} className="flex gap-4 relative"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 bg-white/10 text-white/70 ring-4 ring-white/5">{i + 1}</span><div className="flex-1 min-w-0 pb-1"><div className="text-[11px] uppercase tracking-wider font-bold mb-1 text-white/50">{step.day}</div><div className="font-semibold text-white/85 text-[15px] mb-1">{step.title}</div><div className="text-[13px] text-white/45 leading-relaxed">{step.detail}</div></div></li>))}
                        </ol>
                    </div>
                </div>
            </section>

            <section className="px-6 max-w-5xl mx-auto pb-12">
                <a href="/alternativas" className="group flex items-center justify-between gap-4 p-5 md:p-6 rounded-2xl transition hover:translate-y-[-1px]" style={{ background: `linear-gradient(90deg, ${C.brand}0C, ${C.blue}08)`, border: `1px solid ${C.brand}25` }}>
                    <div>
                        <div className="text-[11px] font-bold tracking-[0.25em] uppercase mb-1" style={{ color: C.brand }}>Comparativos</div>
                        <div className="text-white font-semibold text-[15px] md:text-base">Ver Vyzon vs outros 5 CRMs</div>
                    </div>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1 flex-shrink-0" style={{ color: C.brand }} />
                </a>
            </section>

            <section className="px-6 max-w-4xl mx-auto pb-20">
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Perguntas reais</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Dúvidas que a gente<br /><span style={{ color: C.gold }}>escuta direto</span>.</h2></div>
                <div className="space-y-3">{FAQ.map((item, i) => (
                    <details key={i} className="group p-5 md:p-6 rounded-xl transition" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <summary className="cursor-pointer flex items-center justify-between gap-4 list-none"><span className="text-[15px] md:text-base font-semibold text-white/90">{item.q}</span><span className="text-2xl leading-none transition-transform group-open:rotate-45 flex-shrink-0" style={{ color: C.gold }}>+</span></summary>
                        <p className="mt-4 text-white/65 leading-relaxed text-[15px]">{item.a}</p>
                    </details>
                ))}</div>
            </section>

            <section className="px-6 max-w-4xl mx-auto pb-28">
                <div className="relative p-8 md:p-14 rounded-3xl text-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.brand}18, ${C.blue}10)`, border: `1px solid ${C.brand}30` }}>
                    <div aria-hidden className="absolute inset-0 -z-10 opacity-40" style={{ background: `radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%), radial-gradient(500px 250px at 80% 80%, ${C.blue}22, transparent 60%)` }} />
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">Testa 14 dias.<br /><span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.blue})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Decide depois</span>.</h2>
                    <p className="text-white/65 mb-8 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed">Se o Pipedrive fizer mais sentido no fim, tu leva teus dados em CSV e segue vida.</p>
                    <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition group" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 24px 60px -20px ${C.brand}88` }}>Começar agora<ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" /></button>
                </div>
            </section>
        </div>
    );
};

export default VsPipedrive;
