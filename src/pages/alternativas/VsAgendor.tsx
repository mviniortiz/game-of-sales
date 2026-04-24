import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, CircleAlert, TrendingUp, MessageSquare, Users, Webhook, Trophy, Wallet, Calendar } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { trackEvent } from "@/lib/analytics";

const C = { brand: "#00E37A", brandDim: "#00B266", blue: "#1556C0", violet: "#8B5CF6", gold: "#F5B84A" };

type Row = { label: string; vyzon: { text: string; good?: boolean }; ag: { text: string; note?: string } };

const COMPARISON: Row[] = [
    { label: "Preço por usuário", vyzon: { text: "A partir de R$ 147 / mês", good: true }, ag: { text: "~R$ 53 a R$ 85 / mês*", note: "Pró e Performance, cobrados no anual" } },
    { label: "Cobrança", vyzon: { text: "Em Real, mensal ou anual", good: true }, ag: { text: "Em Real, anual típico", note: "preços anunciados são anuais" } },
    { label: "WhatsApp no CRM", vyzon: { text: "Evolution API nativa", good: true }, ag: { text: "Via integração/extensão", note: "conectores de parceiros, sem nativo profundo" } },
    { label: "Hotmart, Kiwify, Greenn", vyzon: { text: "Webhook nativo", good: true }, ag: { text: "Via Zapier/API", note: "sem conector oficial nativo" } },
    { label: "Gamificação e ranking ao vivo", vyzon: { text: "Nativo, tempo real", good: true }, ag: { text: "Relatórios e dashboards", note: "atingimento de meta por vendedor via reports" } },
    { label: "IA que cobra lead parado", vyzon: { text: "Eva IA generativa", good: true }, ag: { text: "Funis e automações", note: "automação tradicional if-then" } },
    { label: "Interface", vyzon: { text: "Dark mode, Linear-style", good: true }, ag: { text: "Clara, tradicional", note: "interface limpa, curva baixa" } },
    { label: "Relatórios e funis", vyzon: { text: "Dashboards nativos" }, ag: { text: "Relatórios detalhados", note: "ponto forte: reports robustos, análise de funil madura" } },
    { label: "Time brasileiro e suporte BR", vyzon: { text: "100% BR", good: true }, ag: { text: "100% BR", note: "ambos com time e suporte nacionais" } },
    { label: "Base de clientes", vyzon: { text: "Startup em crescimento" }, ag: { text: "Base consolidada BR", note: "ponto forte: 10k+ empresas brasileiras, fundado em 2012" } },
    { label: "Foco principal", vyzon: { text: "Time ágil com WhatsApp e IA", good: true }, ag: { text: "B2B tradicional brasileiro", note: "serviços, consultoria, PME clássica" } },
];

type Feature = { icon: typeof MessageSquare; isEva?: boolean; accent: string; title: string; pitch: string; vyzonSteps: string[]; agSteps: string[]; outcome: string };

const FEATURES: Feature[] = [
    { icon: MessageSquare, accent: C.brand, title: "WhatsApp dentro do deal, sem extensão paga", pitch: "Agendor integra WhatsApp via parceiros ou extensões. No Vyzon, o chat mora dentro do pipeline, sem fricção.", vyzonSteps: ["QR code via Evolution API, conecta em 3 minutos", "Histórico sincronizado com o deal correspondente", "Template por estágio, variável de nome e oferta", "Custo marginal por mensagem: zero"], agSteps: ["Contratar extensão ou parceiro de WhatsApp homologado", "Configurar número no painel separado do deal", "Conversas ficam em caixa à parte, não anexas ao card", "Custo adicional do conector"], outcome: "Vyzon entrega WhatsApp como primeira classe. Agendor trata como add-on." },
    { icon: Webhook, accent: C.blue, title: "Infoprodutor com Hotmart, Kiwify, Greenn", pitch: "Agendor foi feito pra B2B tradicional brasileiro (serviços, consultoria). Venda via checkout de infoproduto não tem conector nativo.", vyzonSteps: ["Integrações → Hotmart → gera URL de webhook com secret", "Cola no painel da Hotmart em Ferramentas → Webhook", "Venda vira deal com nome, email, telefone, produto, origem", "Pipeline já tem template de lançamento, perpétuo, esteira"], agSteps: ["Conectar Zapier ou Make ao Agendor", "Criar zap Hotmart → Zapier → Agendor Negócio", "Mapear campos manualmente, manter quando API mudar", "Replicar pra Kiwify, Greenn, Eduzz separadamente"], outcome: "Infoprodutor BR entra direto no Vyzon, sem middleware." },
    { icon: Trophy, accent: C.gold, title: "Ranking ao vivo que muda o clima", pitch: "Agendor tem relatórios fortes de atingimento de meta. Vyzon traz ranking gamificado em tempo real, feature central, não relatório.", vyzonSteps: ["Define meta (receita, deals ou % de pipeline)", "Ranking atualiza a cada deal movido pra Ganho", "Pódio com percentual, streak, selos", "TV da sala vira ritual diário"], agSteps: ["Relatório de meta por vendedor (geralmente diário/semanal)", "Dashboards com atingimento percentual", "Sem feature central de ranking em tempo real", "Gestor monta rotina de premiação por fora"], outcome: "Ranking nativo vira clima de time. Relatório vira reunião de gestor." },
    { icon: MessageSquare, isEva: true, accent: C.violet, title: "Eva IA vs automações tradicionais", pitch: "Agendor tem funis e automações if-then maduros. Eva é generativa: escreve a mensagem de cobrança por lead, adapta ao contexto.", vyzonSteps: ["Eva roda a cada 6h analisando deals parados há X dias", "Gera mensagem específica baseada em estágio, histórico e voz do time", "Vendedor edita se quiser, manda em 1 clique", "Aprende com aceite/rejeição ao longo do tempo"], agSteps: ["Configurar automação: se deal parado há X dias, então cria tarefa", "Texto do lembrete é template genérico", "Sem adaptação por lead, cada mensagem é padrão", "Pra IA generativa, integrar ChatGPT externamente"], outcome: "Eva escreve do jeito brasileiro de vender. Automação dispara tarefa genérica." },
];

const TCO = {
    headline: "Custo real por mês, time de 5 vendedores",
    subtitle: "Agendor tem licença competitiva em Real. A conta muda quando você precisa de WhatsApp profundo, infoprodutor e gamificação nativa.",
    vyzon: [{ label: "Licença Vyzon Pro (5 usuários)", value: "R$ 985" }, { label: "WhatsApp Evolution", value: "R$ 0" }, { label: "Webhooks Hotmart/Kiwify", value: "R$ 0" }, { label: "Ranking ao vivo", value: "Incluído" }, { label: "Eva IA", value: "Incluído" }],
    vyzonTotal: "R$ 985",
    ag: [{ label: "Agendor Performance (5 usuários)*", value: "~R$ 425" }, { label: "WhatsApp via parceiro/extensão", value: "R$ 200 a R$ 400" }, { label: "Zapier (Hotmart/Kiwify, se usar)", value: "R$ 100 a R$ 150" }, { label: "IA generativa externa (se usar)", value: "~R$ 100" }, { label: "Gamificação custom", value: "Trabalho manual" }],
    agTotal: "~R$ 825 / mês",
    note: "Cálculo com Agendor Performance R$ 85 por usuário (anual). Valores do Agendor costumam ser cobrados no anual, mês a mês cobrança varia. Consulte agendor.com.br/precos pra atualização. Se você não usa WhatsApp profundo nem infoprodutor, Agendor sai bem mais barato que o Vyzon.",
};

const JOURNEY = {
    vyzon: [{ day: "Dia 1", title: "Conta + WhatsApp conectado", detail: "Self-service, QR code, primeiro deal no pipeline." }, { day: "Dia 2", title: "Import de leads via CSV", detail: "Mapeamento automático, 2 mil contatos em 5 minutos." }, { day: "Dia 3", title: "Webhooks Hotmart/Kiwify", detail: "URL gerada no Vyzon, colada no painel do checkout." }, { day: "Dia 7", title: "Time completo operando", detail: "5 vendedores, ranking ao vivo, Eva cobrando lead parado." }],
    ag: [{ day: "Dia 1-2", title: "Trial ou self-service", detail: "Agendor tem cadastro aberto e interface amigável." }, { day: "Dia 3-5", title: "Pipeline e automações", detail: "Configurar funis, automações if-then, propriedades custom." }, { day: "Semana 2", title: "Relatórios e metas", detail: "Definir metas por vendedor, configurar dashboards." }, { day: "Semana 2-3", title: "Time adaptado", detail: "Vendedores usando rotina de deals, relatórios semanais." }],
};

const SCENARIOS = [
    { icon: TrendingUp, accent: C.brand, tint: "rgba(0,227,122,0.08)", border: "rgba(0,227,122,0.25)", title: "Time comercial que vive no WhatsApp", body: "Agendor é sólido pra B2B tradicional que ainda vive em ligação e email. Se teu time é WhatsApp-first (maioria do BR moderno), o conector do Agendor é um add-on. No Vyzon, WhatsApp é central, chat aparece dentro do card do deal." },
    { icon: Users, accent: C.blue, tint: "rgba(21,86,192,0.08)", border: "rgba(21,86,192,0.28)", title: "Infoprodutor com lançamento via Hotmart", body: "Agendor atende B2B tradicional bem. Mas infoprodutor, lançamento, esteira, recuperação de boleto, checkout da Hotmart não têm conector nativo. No Vyzon, webhook é nativo e o pipeline já vem com template pronto pra cada cenário." },
    { icon: MessageSquare, accent: C.violet, tint: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.28)", title: "Time que quer IA generativa e ranking ao vivo", body: "Agendor tem funis e relatórios maduros, mas gamificação e IA generativa não são o foco. Se teu time quer Eva cobrando lead automático com mensagem custom e ranking no telão atualizando em tempo real, o Vyzon é construído em volta disso." },
];

const FAQ = [
    { q: "Agendor é mais barato, né? R$ 53 vs R$ 147.", a: "Só a licença. Agendor Pró é R$ 53 no anual e Performance é R$ 85. Vyzon Pro é R$ 147 (mensal) ou R$ 127 (anual). A diferença aparece quando você soma o que é nativo no Vyzon e vira add-on no Agendor: WhatsApp integrado profundo (R$ 200-400/mês em extensões), webhooks Hotmart/Kiwify (Zapier R$ 100-150), gamificação ao vivo (custom) e IA generativa (externa). Se você só precisa do CRM puro, Agendor sai bem mais barato." },
    { q: "Agendor tem WhatsApp também, qual a diferença?", a: "Agendor integra WhatsApp via extensões ou parceiros homologados, tipicamente pago. Vyzon usa Evolution API: seu número conecta via QR code sem custo adicional, o chat aparece dentro do card do deal, histórico sincronizado automaticamente. É diferença de profundidade: Agendor suporta WhatsApp, Vyzon vive de WhatsApp." },
    { q: "Agendor tem relatórios melhores, o Vyzon compete nisso?", a: "Agendor tem relatórios robustos e maduros, é um ponto forte real. Vyzon tem dashboards nativos funcionais pra meta, receita, conversão por estágio, performance por vendedor. Pra quem precisa de BI profundo com pivots e analytics avançados, Agendor é mais forte. Pra dashboards operacionais do dia a dia comercial, Vyzon atende bem." },
    { q: "Dá pra migrar do Agendor pro Vyzon?", a: "Sim. Exporte CSV do Agendor (contatos, empresas, negócios) e importe no Vyzon em Configurações > Importar Dados. Mapeamento automático pros nomes padrão, ajuste manual em campos custom. Planos anuais incluem migração assistida." },
    { q: "Em que pontos o Agendor é melhor que o Vyzon?", a: "Honestamente: preço de licença é mais competitivo (~R$ 53 no anual), relatórios e funis são mais maduros, interface tradicional tem curva de aprendizado mais baixa pra quem vem de planilha, base de clientes consolidada (10k+ empresas BR desde 2012), e time de CS com experiência ampla em B2B clássico. Se teu negócio é B2B tradicional brasileiro sem WhatsApp intensivo, Agendor é escolha sólida." },
    { q: "Quando faz mais sentido o Agendor?", a: "B2B tradicional (consultoria, serviços, indústria leve), ciclo de venda longo, predominância de email e ligação sobre WhatsApp, relatórios complexos sendo requisito central, time pequeno que quer pagar menos na licença e não precisa de WhatsApp profundo nem infoprodutor nem IA generativa." },
];

const VsAgendor = () => {
    const navigate = useNavigate();
    useEffect(() => {
        document.title = "Alternativa ao Agendor | Vyzon, CRM com WhatsApp e Eva IA";
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (meta) meta.content = "Vyzon vs Agendor: dois CRMs brasileiros com propósitos diferentes. Vyzon é WhatsApp-first com IA generativa; Agendor é B2B tradicional com relatórios maduros.";
        trackEvent("compare_page_view", { vs: "agendor" });
    }, []);

    const schema = { "@context": "https://schema.org", "@graph": [
        { "@type": "Product", name: "Vyzon CRM", description: "CRM brasileiro com WhatsApp nativo, Hotmart/Kiwify, ranking ao vivo e Eva IA.", brand: { "@type": "Brand", name: "Vyzon" }, offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "147", highPrice: "297", offerCount: "3", url: "https://vyzon.com.br/" } },
        { "@type": "FAQPage", mainEntity: FAQ.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Vyzon", item: "https://vyzon.com.br/" }, { "@type": "ListItem", position: 2, name: "Alternativas", item: "https://vyzon.com.br/alternativas" }, { "@type": "ListItem", position: 3, name: "Vyzon vs Agendor", item: "https://vyzon.com.br/alternativa-agendor" }] },
    ] };

    return (
        <div className="min-h-screen bg-[#06080a] text-white relative overflow-x-hidden">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: `radial-gradient(1000px 500px at 10% -10%, rgba(0,227,122,0.06), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(245,184,74,0.05), transparent 60%)` }} />
            <LandingNav onCTAClick={() => { window.location.href = "/#agendar-demo"; }} onLoginClick={() => navigate("/auth")} />

            <section className="pt-28 md:pt-36 pb-20 px-6 max-w-5xl mx-auto relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ background: "rgba(0,227,122,0.08)", border: `1px solid ${C.brand}33`, color: C.brand }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.brand, boxShadow: `0 0 8px ${C.brand}` }} />
                    Vyzon vs Agendor
                </div>
                <h1 className="text-[44px] md:text-7xl font-bold leading-[1.02] tracking-[-0.03em] mb-7">
                    Dois <span style={{ color: C.brand }}>brasileiros</span>.
                    <br />Dois <span className="text-white/85">propósitos</span>
                    <br /><span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>diferentes</span>.
                </h1>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
                    Agendor é o CRM brasileiro clássico pra B2B tradicional, com 10+ anos de mercado
                    e relatórios maduros. Vyzon é o CRM moderno BR pra time que vive no WhatsApp,
                    vende infoproduto e quer IA generativa.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                    <button onClick={() => { window.location.href = "/#agendar-demo"; }} className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 16px 40px -12px ${C.brand}55` }}>Testar 14 dias grátis<ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" /></button>
                    <a href="#comparativo" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>Ver comparativo</a>
                </div>
                <div className="mt-14 grid grid-cols-3 gap-3 md:gap-6 max-w-xl">
                    {[{ label: "Foco", value: "Moderno", accent: C.brand }, { label: "WhatsApp", value: "Nativo", accent: C.gold }, { label: "IA", value: "Generativa", accent: C.blue }].map((m) => (
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
                            {["Teu time vive no WhatsApp e quer chat no deal", "Vende infoproduto via Hotmart, Kiwify, Greenn", "Quer ranking ao vivo empurrando meta", "Busca IA generativa, não só automação if-then", "Valoriza UX dark moderna tipo Linear"].map((t, i) => (
                                <li key={i} className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.brand}22` }}><Check className="h-3 w-3" style={{ color: C.brand }} strokeWidth={3} /></span><span>{t}</span></li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-7 rounded-2xl" style={{ background: "linear-gradient(180deg, rgba(245,184,74,0.04), rgba(245,184,74,0.01))", border: `1px solid ${C.gold}2A` }}>
                        <div className="text-[11px] font-bold mb-4 tracking-[0.25em] uppercase" style={{ color: C.gold }}>Fique com Agendor se</div>
                        <ul className="space-y-3 text-white/75 text-[15px]">
                            {["Vende B2B tradicional: serviços, consultoria, indústria", "Preço de licença é central e WhatsApp é secundário", "Precisa de relatórios e funis profundos", "Prefere interface clara e curva baixa", "Valoriza base BR consolidada com 10+ anos"].map((t, i) => (
                                <li key={i} className="flex gap-3"><span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${C.gold}22` }}><Check className="h-3 w-3" style={{ color: C.gold }} strokeWidth={3} /></span><span>{t}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.blue }}>Como funciona</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Quatro fluxos onde<br />o <span style={{ color: C.brand }}>Vyzon ganha</span> claro.</h2></div>
                <div className="space-y-5">{FEATURES.map((f, i) => { const Icon = f.icon; return (
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
                                <div className="text-[11px] font-bold mb-4 tracking-[0.2em] uppercase text-white/45 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white/25" />No Agendor</div>
                                <ol className="space-y-3">{f.agSteps.map((s, j) => (<li key={j} className="flex gap-3 text-[14px] leading-relaxed text-white/55"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-px bg-white/5 text-white/50">{j + 1}</span>{s}</li>))}</ol>
                            </div>
                        </div>
                        <div className="px-6 md:px-8 py-4 text-[13px] md:text-[14px] font-medium" style={{ background: `${f.accent}08`, borderTop: `1px solid ${f.accent}20`, color: "rgba(255,255,255,0.85)" }}><span className="font-bold" style={{ color: f.accent }}>Resultado:</span> {f.outcome}</div>
                    </div>
                ); })}</div>
            </section>

            <section id="comparativo" className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Linha por linha</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">Onde cada um<br /><span style={{ color: C.brand }}>faz sentido</span>.</h2></div>
                <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-bold" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}><div className="text-white/40">Critério</div><div style={{ color: C.brand }}>Vyzon</div><div className="text-white/55">Agendor</div></div>
                    {COMPARISON.map((row, i) => (
                        <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr] px-6 py-5 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                            <div className="text-white/75 text-[14px] font-medium self-center">{row.label}</div>
                            <div className="self-center"><div className="inline-flex items-center gap-1.5 text-[14px]" style={{ color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)", fontWeight: row.vyzon.good ? 600 : 500 }}>{row.vyzon.good && <Check className="h-3.5 w-3.5" strokeWidth={3} />}{row.vyzon.text}</div></div>
                            <div className="self-center"><div className="text-white/80 text-[14px]">{row.ag.text}</div>{row.ag.note && <div className="text-[11px] text-white/35 mt-1 leading-snug">{row.ag.note}</div>}</div>
                        </div>
                    ))}
                </div>
                <div className="md:hidden space-y-3">{COMPARISON.map((row, i) => (
                    <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-3">{row.label}</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg" style={{ background: row.vyzon.good ? `${C.brand}0F` : "rgba(255,255,255,0.02)", border: row.vyzon.good ? `1px solid ${C.brand}33` : "1px solid rgba(255,255,255,0.06)" }}><div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: C.brand }}>Vyzon</div><div className="text-[13px] font-semibold" style={{ color: row.vyzon.good ? C.brand : "rgba(255,255,255,0.9)" }}>{row.vyzon.text}</div></div>
                            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}><div className="text-[9px] uppercase tracking-wider font-bold mb-1 text-white/45">Agendor</div><div className="text-[13px] text-white/85 font-medium">{row.ag.text}</div>{row.ag.note && <div className="text-[10px] text-white/40 mt-1 leading-snug">{row.ag.note}</div>}</div>
                        </div>
                    </div>
                ))}</div>
                <div className="mt-5 flex gap-2 text-[11px] text-white/35 max-w-3xl"><CircleAlert className="h-3 w-3 flex-shrink-0 mt-0.5" /><p className="leading-relaxed">Dados públicos dos sites oficiais em abril 2026. Consulte <a href="https://www.agendor.com.br/precos" className="underline hover:text-white/60 transition" target="_blank" rel="noopener noreferrer">agendor.com.br/precos</a> pra valores atualizados. Features e disponibilidade podem ter mudado desde esta publicação.</p></div>
            </section>

            <section className="px-6 max-w-5xl mx-auto pb-20">
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.gold }}>Custo total real</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">{TCO.headline.split(",")[0]},<br /><span style={{ color: C.gold }}>time de 5 vendedores</span>.</h2><p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">{TCO.subtitle}</p></div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                    <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}04)`, border: `1px solid ${C.brand}30` }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.brand}20` }}><Wallet className="h-4 w-4" style={{ color: C.brand }} /><span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: C.brand }}>Vyzon, time de 5</span></div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>{TCO.vyzon.map((it) => (<div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}><span className="text-[14px] text-white/75">{it.label}</span><span className="text-[14px] font-semibold text-white/90 whitespace-nowrap">{it.value}</span></div>))}</div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: `${C.brand}10`, borderTop: `1px solid ${C.brand}30` }}><span className="text-[13px] uppercase tracking-wider font-bold text-white/70">Total mensal</span><span className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.brand }}>{TCO.vyzonTotal}</span></div>
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}><Wallet className="h-4 w-4 text-white/40" /><span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">Agendor, time de 5</span></div>
                        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>{TCO.ag.map((it) => (<div key={it.label} className="px-6 py-3.5 flex items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}><span className="text-[14px] text-white/60">{it.label}</span><span className="text-[14px] font-semibold text-white/75 whitespace-nowrap">{it.value}</span></div>))}</div>
                        <div className="px-6 py-5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.08)" }}><span className="text-[13px] uppercase tracking-wider font-bold text-white/55">Total mensal</span><span className="text-2xl md:text-3xl font-bold tracking-tight text-white/80">{TCO.agTotal}</span></div>
                    </div>
                </div>
                <div className="mt-5 p-5 md:p-6 rounded-xl text-center" style={{ background: `linear-gradient(90deg, ${C.brand}0A, ${C.gold}0A)`, border: `1px solid ${C.gold}25` }}>
                    <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-white/50 mb-1">Diferença por mês, time de 5</div>
                    <div className="text-3xl md:text-4xl font-bold tracking-tight"><span style={{ color: C.brand }}>~R$ 160</span> <span className="text-white/50 text-lg md:text-xl font-medium">economizados / mês</span></div>
                    <div className="text-[12px] text-white/40 mt-2">Se você não usa WhatsApp profundo nem infoprodutor, Agendor sai bem mais barato (~R$ 425 vs R$ 985).</div>
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
                <div className="mb-10"><div className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] mb-3" style={{ color: C.brand }}>Do zero ao operando</div><h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight"><span style={{ color: C.brand }}>7 dias</span> no Vyzon<br />vs <span className="text-white/70">2 a 3 semanas</span> no Agendor.</h2><p className="text-white/55 mt-5 max-w-2xl text-[15px] md:text-base leading-relaxed">Agendor é self-service amigável. O que estica é montar automações complexas e treinar equipe.</p></div>
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <div className="rounded-2xl p-6 md:p-7 relative" style={{ background: `linear-gradient(180deg, ${C.brand}0E, ${C.brand}03)`, border: `1px solid ${C.brand}30` }}>
                        <div className="flex items-center gap-2 mb-6"><Calendar className="h-4 w-4" style={{ color: C.brand }} /><span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: C.brand }}>Vyzon, jornada de 7 dias</span></div>
                        <ol className="space-y-5 relative"><div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: `${C.brand}30` }} />
                            {JOURNEY.vyzon.map((step, i) => (<li key={i} className="flex gap-4 relative"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10" style={{ background: C.brand, color: "#06080a", boxShadow: `0 0 0 4px ${C.brand}15` }}>{i + 1}</span><div className="flex-1 min-w-0 pb-1"><div className="text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: C.brand }}>{step.day}</div><div className="font-semibold text-white text-[15px] mb-1">{step.title}</div><div className="text-[13px] text-white/55 leading-relaxed">{step.detail}</div></div></li>))}
                        </ol>
                    </div>
                    <div className="rounded-2xl p-6 md:p-7 relative" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-6"><Calendar className="h-4 w-4 text-white/40" /><span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50">Agendor, jornada 2 a 3 semanas</span></div>
                        <ol className="space-y-5 relative"><div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
                            {JOURNEY.ag.map((step, i) => (<li key={i} className="flex gap-4 relative"><span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 bg-white/10 text-white/70 ring-4 ring-white/5">{i + 1}</span><div className="flex-1 min-w-0 pb-1"><div className="text-[11px] uppercase tracking-wider font-bold mb-1 text-white/50">{step.day}</div><div className="font-semibold text-white/85 text-[15px] mb-1">{step.title}</div><div className="text-[13px] text-white/45 leading-relaxed">{step.detail}</div></div></li>))}
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
                <div className="relative p-8 md:p-14 rounded-3xl text-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.brand}18, ${C.gold}10)`, border: `1px solid ${C.brand}30` }}>
                    <div aria-hidden className="absolute inset-0 -z-10 opacity-40" style={{ background: `radial-gradient(500px 250px at 20% 20%, ${C.brand}22, transparent 60%), radial-gradient(500px 250px at 80% 80%, ${C.gold}22, transparent 60%)` }} />
                    <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.05] mb-5">Testa 14 dias.<br /><span style={{ background: `linear-gradient(90deg, ${C.brand}, ${C.gold})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Decide depois</span>.</h2>
                    <p className="text-white/65 mb-8 max-w-xl mx-auto text-[15px] md:text-base leading-relaxed">Se o Agendor fizer mais sentido no fim, tu leva teus dados em CSV e segue vida.</p>
                    <button onClick={() => { window.location.href = "/#agendar-demo"; }} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition group" style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandDim})`, color: "#06080a", boxShadow: `0 24px 60px -20px ${C.brand}88` }}>Começar agora<ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" /></button>
                </div>
            </section>
        </div>
    );
};

export default VsAgendor;
