import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight,
    Calendar,
    Check,
    Zap,
    Copy,
    Link as LinkIcon,
    CircleCheck,
    CreditCard,
    AlertCircle,
    Rocket,
    Flame,
    Infinity as InfinityIcon,
    Trophy,
    MessageSquare,
    User,
    Plug,
    TrendingUp,
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
// Data
// ═══════════════════════════════════════════════════════════════════════════

type PanelKind = "lancamento" | "perpetuo" | "esteira" | "integracoes";

const PIPELINES: Record<
    Exclude<PanelKind, "integracoes">,
    {
        label: string;
        sub: string;
        tagline: string;
        icon: typeof Rocket;
        columns: Array<{ title: string; badge?: string; deals: Array<{ name: string; value: string; tag?: string; hot?: boolean }> }>;
    }
> = {
    lancamento: {
        label: "Lançamento",
        sub: "Janela curta, alta conversão",
        tagline: "Funil do lançamento em quatro etapas: inscrito → carrinho → pago → boleto aberto. Pipeline nasce pronto, você só conecta a plataforma.",
        icon: Rocket,
        columns: [
            {
                title: "Inscritos",
                badge: "428",
                deals: [
                    { name: "Ana Paula — R$997", value: "", tag: "Via anúncio", hot: true },
                    { name: "Carlos M. — R$997", value: "" },
                    { name: "+ 426 leads", value: "" },
                ],
            },
            {
                title: "Carrinho aberto",
                badge: "64",
                deals: [
                    { name: "Rodrigo T. — 2x R$997", value: "", hot: true },
                    { name: "Beatriz L. — R$997", value: "" },
                    { name: "+ 62 em aberto", value: "" },
                ],
            },
            {
                title: "Pago",
                badge: "31",
                deals: [
                    { name: "Felipe S. — R$1.997", value: "+order bump" },
                    { name: "Júlia V. — R$997", value: "" },
                    { name: "+ 29 aprovados", value: "" },
                ],
            },
            {
                title: "Boleto / PIX aberto",
                badge: "9",
                deals: [
                    { name: "Marcos A. — R$997", value: "vence em 18h", hot: true },
                    { name: "Paula R. — R$997", value: "vencido" },
                ],
            },
        ],
    },
    perpetuo: {
        label: "Perpétuo High-Ticket",
        sub: "Lead frio → call → proposta",
        tagline: "Pipeline por temperatura: frio, aquecido, call, proposta. Ideal pra ticket alto vendido no 1-a-1 pelo WhatsApp.",
        icon: Flame,
        columns: [
            {
                title: "Lead frio",
                badge: "152",
                deals: [
                    { name: "Lucas R. — formulário", value: "origem: Meta Ads" },
                    { name: "Isadora C. — lead magnet", value: "" },
                    { name: "+ 150 leads", value: "" },
                ],
            },
            {
                title: "Aquecido",
                badge: "38",
                deals: [
                    { name: "Daniel V. — R$4.997", value: "respondeu 3 mensagens", hot: true },
                    { name: "Helena F. — R$7.997", value: "agendou retorno" },
                ],
            },
            {
                title: "Call agendada",
                badge: "12",
                deals: [
                    { name: "Roberto L. — R$9.997", value: "amanhã 14h", hot: true },
                    { name: "Camila N. — R$4.997", value: "hoje 17h" },
                ],
            },
            {
                title: "Proposta",
                badge: "6",
                deals: [
                    { name: "Bruno S. — R$14.997", value: "enviada 2d" },
                    { name: "Teresa O. — R$9.997", value: "aguardando" },
                ],
            },
        ],
    },
    esteira: {
        label: "Esteira de Recorrência",
        sub: "Assinante sobe de produto",
        tagline: "Pipeline orientado a ciclo: ativos, upsell disparado, renovação, retenção. Cartão vai falhar? Vira deal antes do churn.",
        icon: InfinityIcon,
        columns: [
            {
                title: "Ativos",
                badge: "1.284",
                deals: [
                    { name: "Plano Essencial — R$47/mês", value: "982 assinantes" },
                    { name: "Plano Pro — R$147/mês", value: "302 assinantes" },
                ],
            },
            {
                title: "Upsell disparado",
                badge: "48",
                deals: [
                    { name: "Renata G. — Essencial → Pro", value: "mês 4", hot: true },
                    { name: "Tiago H. — Pro → VIP", value: "mês 7" },
                ],
            },
            {
                title: "Renovação próxima",
                badge: "124",
                deals: [
                    { name: "14 renovações hoje", value: "R$3.428" },
                    { name: "28 amanhã", value: "R$7.056" },
                ],
            },
            {
                title: "Retenção (churn risk)",
                badge: "7",
                deals: [
                    { name: "João P. — cartão vai falhar", value: "cobra em 2d", hot: true },
                    { name: "Mariana K. — 30d sem login", value: "atenção" },
                ],
            },
        ],
    },
};

const PANEL_NAV: Array<{ key: PanelKind; label: string; sub: string; icon: typeof Rocket }> = [
    { key: "lancamento", label: "Lançamento", sub: "Janela curta", icon: Rocket },
    { key: "perpetuo", label: "Perpétuo", sub: "High-ticket 1-a-1", icon: Flame },
    { key: "esteira", label: "Esteira", sub: "Recorrência", icon: InfinityIcon },
    { key: "integracoes", label: "Integrações", sub: "Hotmart · Kiwify · Greenn", icon: Plug },
];

const WHATSAPP_THREAD = [
    { from: "eva", text: "Oi Marcos! Aqui é a Luana do time Vyzon 👋 vi que seu boleto do Curso Pro venceu hoje." },
    { from: "eva", text: "Posso gerar um novo com validade de 48h? Ou prefere PIX — aprova na hora e libera o acesso?" },
    { from: "lead", text: "PIX, por favor" },
    { from: "eva", text: "Pronto. Chave copiada aí 👇 qualquer coisa me chama." },
    { from: "system", text: "Deal movido: Boleto aberto → Pago • +R$997" },
] as const;

const RANKING = [
    { pos: 1, name: "Mariana A.", sales: 34, revenue: "R$ 42.380", percent: 100 },
    { pos: 2, name: "Thiago R.", sales: 29, revenue: "R$ 36.710", percent: 86 },
    { pos: 3, name: "Camila F.", sales: 24, revenue: "R$ 28.940", percent: 71 },
    { pos: 4, name: "Rodrigo L.", sales: 18, revenue: "R$ 21.460", percent: 53 },
    { pos: 5, name: "Beatriz N.", sales: 14, revenue: "R$ 16.730", percent: 41 },
] as const;

const INTEGRATIONS = [
    { name: "Hotmart", highlight: true, note: "webhook nativo" },
    { name: "Kiwify", highlight: true, note: "webhook nativo" },
    { name: "Greenn", highlight: true, note: "webhook nativo" },
    { name: "Eduzz", highlight: true, note: "webhook nativo" },
    { name: "Mercado Pago", highlight: true, note: "webhook nativo" },
    { name: "Stripe", highlight: true, note: "webhook nativo" },
    { name: "Pagar.me", highlight: true, note: "webhook nativo" },
    { name: "WhatsApp", highlight: false, note: "Evolution API" },
] as const;

const FAQ = [
    {
        q: "Como conecto uma venda da Hotmart no Vyzon?",
        a: "Em 3 cliques: no Vyzon você copia uma URL de webhook, abre o produtor na Hotmart em Ferramentas → Webhook, cola a URL e escolhe o evento (venda aprovada, boleto gerado, cartão recusado). Na próxima venda, o deal cai direto no pipeline do produto certo. Kiwify e Greenn seguem o mesmo padrão.",
    },
    {
        q: "E se eu vendo o mesmo produto em 3 plataformas ao mesmo tempo?",
        a: "Você cria um webhook diferente por plataforma dentro do Vyzon, cada um aponta pro mesmo pipeline. O deal entra com a origem marcada (hotmart, kiwify, greenn) e o ranking consolida os três. Filtro por origem fica disponível em todos relatórios.",
    },
    {
        q: "Funciona pra lançamento-relâmpago de 3 a 5 dias?",
        a: "Funciona. O pipeline de lançamento já vem pronto com quatro etapas (inscritos, carrinho, pago, boleto aberto) e o setup é em minutos. Durante o lançamento, o ranking pode rodar com meta de turma (todos somam pra um número único) ou individual. Depois do encerramento você duplica o pipeline pra próxima campanha.",
    },
    {
        q: "Como funciona recuperação de boleto vencido?",
        a: "Boleto vencido vira um estágio ativo do pipeline. A Eva (nossa IA) identifica o deal, propõe uma mensagem no WhatsApp com o tom certo e sugere o horário de envio. Vendedor aprova e dispara com um toque. O deal move sozinho pra Pago assim que o webhook de pagamento chegar.",
    },
    {
        q: "Tenho esteira com upsell e downsell. Dá pra automatizar?",
        a: "Dá. Você configura triggers por tempo de assinatura (ex.: no mês 2, oferece o Pro) ou por comportamento (ex.: se abriu 3 aulas, oferece o VIP). Quando a condição bate, o deal de upsell aparece no pipeline pro vendedor abordar. Tudo com histórico de tentativas.",
    },
    {
        q: "Já uso outro CRM. Dá pra migrar sem parar a operação?",
        a: "Dá. Você importa contatos e deals via CSV ou API. Durante a migração os dois sistemas rodam em paralelo: webhooks novos apontam pro Vyzon, os antigos continuam no sistema atual até você virar a chave. Nosso time acompanha esse setup no seu primeiro mês.",
    },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Reusable atoms
// ═══════════════════════════════════════════════════════════════════════════

const SectionEyebrow = ({ children }: { children: React.ReactNode }) => (
    <span
        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
        style={{
            fontWeight: 600,
            letterSpacing: "0.08em",
            background: "var(--vyz-accent-soft-10)",
            border: "1px solid var(--vyz-accent-border)",
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

const SectionSub = ({ children }: { children: React.ReactNode }) => (
    <p className="mt-4 max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "var(--vyz-text-soft)" }}>
        {children}
    </p>
);

// ═══════════════════════════════════════════════════════════════════════════
// The single interactive panel (replaces hero mockup + 3-pipeline tabs)
// ═══════════════════════════════════════════════════════════════════════════

const KanbanBoard = ({ pipeline }: { pipeline: typeof PIPELINES[Exclude<PanelKind, "integracoes">] }) => (
    <div className="p-4 sm:p-5">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {pipeline.columns.map((col) => (
                <div key={col.title} className="min-w-0">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span
                            className="truncate"
                            style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--vyz-text-muted)", letterSpacing: "0.04em" }}
                        >
                            {col.title.toUpperCase()}
                        </span>
                        {col.badge && (
                            <span
                                className="px-1.5 rounded text-[10px] flex-shrink-0"
                                style={{ background: "var(--vyz-border-subtle)", color: "var(--vyz-text-soft)", fontWeight: 600 }}
                            >
                                {col.badge}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {col.deals.map((d, i) => (
                            <div
                                key={i}
                                className="rounded-lg px-2.5 py-2"
                                style={{
                                    background: d.hot ? "rgba(0,227,122,0.07)" : "rgba(255,255,255,0.025)",
                                    border: `1px solid ${d.hot ? "var(--vyz-accent-border)" : "var(--vyz-border-subtle)"}`,
                                }}
                            >
                                <div
                                    className="truncate"
                                    style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}
                                >
                                    {d.name}
                                </div>
                                {d.tag && (
                                    <div
                                        className="truncate mt-0.5"
                                        style={{ fontSize: "0.625rem", color: d.hot ? "var(--vyz-accent-light)" : "var(--vyz-text-dim)" }}
                                    >
                                        {d.tag}
                                    </div>
                                )}
                                {d.value && !d.tag && (
                                    <div className="truncate mt-0.5" style={{ fontSize: "0.625rem", color: "var(--vyz-text-dim)" }}>
                                        {d.value}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const IntegrationsPanel = () => (
    <div className="p-5 sm:p-6">
        <div className="grid sm:grid-cols-2 gap-4">
            <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--vyz-text-muted)", letterSpacing: "0.04em" }}>
                    URL DO WEBHOOK · HOTMART
                </div>
                <div
                    className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--vyz-border)" }}
                >
                    <span className="truncate flex-1" style={{ fontSize: "0.75rem", color: "var(--vyz-text)" }}>
                        https://api.vyzon.com.br/wh/hotmart/3f2a…
                    </span>
                    <Copy className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--vyz-text-dim)" }} strokeWidth={2} />
                </div>

                <div className="mt-4" style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--vyz-text-muted)", letterSpacing: "0.04em" }}>
                    EVENTOS CAPTURADOS
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Venda aprovada", "Boleto gerado", "Cartão recusado", "Chargeback", "Reembolso"].map((e) => (
                        <span
                            key={e}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
                            style={{
                                fontSize: "0.7rem",
                                background: "var(--vyz-accent-soft-8)",
                                color: "var(--vyz-accent-light)",
                                border: "1px solid rgba(0,227,122,0.15)",
                            }}
                        >
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            {e}
                        </span>
                    ))}
                </div>

                <div
                    className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5"
                    style={{ background: "var(--vyz-accent-soft-8)", border: "1px solid var(--vyz-accent-border)" }}
                >
                    <CircleCheck className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                    <span style={{ fontSize: "0.8rem", color: "var(--vyz-accent-text)", fontWeight: 600 }}>
                        Conectado · última venda há 2min
                    </span>
                </div>
            </div>

            <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--vyz-text-muted)", letterSpacing: "0.04em" }}>
                    PLATAFORMAS ATIVAS
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    {INTEGRATIONS.slice(0, 6).map((i) => (
                        <div
                            key={i.name}
                            className="rounded-lg px-3 py-2.5"
                            style={{
                                background: i.highlight ? "var(--vyz-accent-soft-6)" : "var(--vyz-surface-1)",
                                border: `1px solid ${i.highlight ? "var(--vyz-accent-border)" : "var(--vyz-border)"}`,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {i.highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                <span
                                    style={{
                                        fontSize: "0.82rem",
                                        fontWeight: 700,
                                        color: i.highlight ? "var(--vyz-accent-text)" : "var(--vyz-text-strong)",
                                    }}
                                >
                                    {i.name}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--vyz-text-dim)", marginTop: 2 }}>{i.note}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const WhatsAppMock = () => (
    <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0b1014", border: "1px solid var(--vyz-border-strong)" }}
    >
        <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "rgba(0,227,122,0.05)", borderBottom: "1px solid var(--vyz-border-subtle)" }}
        >
            <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "var(--vyz-gradient-accent)" }}
            >
                <User className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}>
                    Marcos A. (Lead · boleto vencido)
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--vyz-accent-light)" }}>Eva está escrevendo…</div>
            </div>
        </div>

        <div className="p-4 space-y-2.5 min-h-[380px]">
            {WHATSAPP_THREAD.map((m, i) => {
                if (m.from === "system") {
                    return (
                        <div key={i} className="flex justify-center my-3">
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
                                style={{
                                    background: "var(--vyz-accent-soft-10)",
                                    color: "var(--vyz-accent-light)",
                                    border: "1px solid var(--vyz-accent-border)",
                                    fontWeight: 600,
                                }}
                            >
                                <CircleCheck className="h-3 w-3" strokeWidth={2} />
                                {m.text}
                            </span>
                        </div>
                    );
                }
                const isEva = m.from === "eva";
                return (
                    <div key={i} className={`flex ${isEva ? "justify-start" : "justify-end"}`}>
                        <div
                            className="max-w-[80%] rounded-2xl px-3.5 py-2"
                            style={{
                                background: isEva ? "var(--vyz-surface-2)" : "var(--vyz-accent-soft-12)",
                                border: `1px solid ${isEva ? "var(--vyz-border-subtle)" : "var(--vyz-accent-border)"}`,
                                borderTopLeftRadius: isEva ? 4 : undefined,
                                borderTopRightRadius: !isEva ? 4 : undefined,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "0.825rem",
                                    lineHeight: 1.5,
                                    color: isEva ? "var(--vyz-text-strong)" : "var(--vyz-text-primary)",
                                }}
                            >
                                {m.text}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const RankingMock = () => (
    <div
        className="rounded-2xl p-5"
        style={{ background: "var(--vyz-surface-elevated)", border: "1px solid var(--vyz-border-strong)" }}
    >
        <div className="flex items-center justify-between mb-5 pb-3" style={{ borderBottom: "1px solid var(--vyz-border-subtle)" }}>
            <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}>
                    Ranking · Abril · Lançamento Pro
                </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--vyz-text-dim)" }}>
                atualiza a cada venda
            </span>
        </div>

        <div className="space-y-2.5">
            {RANKING.map((r) => (
                <div
                    key={r.pos}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{
                        background: r.pos <= 3 ? "var(--vyz-accent-soft-4)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${r.pos <= 3 ? "var(--vyz-accent-soft-12)" : "var(--vyz-border-subtle)"}`,
                    }}
                >
                    <div
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-heading"
                        style={{
                            background:
                                r.pos === 1
                                    ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                                    : r.pos === 2
                                    ? "linear-gradient(135deg, #e5e7eb, #9ca3af)"
                                    : r.pos === 3
                                    ? "linear-gradient(135deg, #fb923c, #ea580c)"
                                    : "var(--vyz-border-subtle)",
                            color: r.pos <= 3 ? "#0b0f13" : "var(--vyz-text-soft)",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                        }}
                    >
                        {r.pos}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}>
                                {r.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--vyz-text-soft)" }}>
                                {r.sales} vendas · {r.revenue}
                            </span>
                        </div>
                        <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ background: "var(--vyz-border-subtle)" }}
                        >
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                whileInView={{ width: `${r.percent}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: r.pos * 0.1, ease: "easeOut" }}
                                style={{
                                    background:
                                        r.pos === 1
                                            ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                                            : "linear-gradient(90deg, #33FF9E, #00E37A)",
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div
            className="mt-5 pt-4 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--vyz-border-subtle)" }}
        >
            <span className="text-[12px]" style={{ color: "var(--vyz-text-soft)" }}>
                Meta da turma:
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}>
                R$ 146.220 / R$ 180.000 <span style={{ color: "var(--vyz-accent-light)" }}>(81%)</span>
            </span>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function ForInfoprodutores() {
    const navigate = useNavigate();
    const [panel, setPanel] = useState<PanelKind>("lancamento");

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
    const handleLogin = () => navigate("/auth");

    const activePipeline = panel !== "integracoes" ? PIPELINES[panel] : null;
    const activeNavItem = PANEL_NAV.find((n) => n.key === panel)!;

    return (
        <div className="min-h-screen" style={{ background: "var(--vyz-bg)", color: "var(--vyz-text-primary)" }}>
            <LandingNav onCTAClick={handleSecondary} onLoginClick={handleLogin} />

            {/* ═══ HERO (sem mockup — stats cards) ══════════════════════════ */}
            <section className="relative overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute inset-x-0 top-0 h-[700px]"
                        style={{
                            background:
                                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,227,122,0.22) 0%, var(--vyz-accent-soft-8) 30%, transparent 65%)",
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
                    <div className="pt-32 sm:pt-40 pb-16 sm:pb-24 text-center">
                        <SectionEyebrow>PARA INFOPRODUTORES</SectionEyebrow>

                        <h1
                            className="font-heading mx-auto"
                            style={{
                                fontSize: "clamp(2.25rem, 6.5vw, 4.25rem)",
                                lineHeight: 1.05,
                                letterSpacing: "-0.04em",
                                maxWidth: "880px",
                            }}
                        >
                            <span style={{ fontWeight: 700, color: "var(--vyz-text-primary)" }}>
                                Cada venda da Hotmart vira um{" "}
                            </span>
                            <span
                                style={{
                                    fontWeight: 900,
                                    background: "var(--vyz-gradient-hero-text)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                card no pipeline.
                            </span>
                        </h1>

                        <p
                            className="mt-6 mx-auto max-w-2xl"
                            style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", lineHeight: 1.7, color: "var(--vyz-text)" }}
                        >
                            Aprovada, boleto, cartão recusado — tudo entra no painel na hora. O vendedor vê a posição subir,
                            a Eva manda follow-up no WhatsApp e você para de abrir planilha da Hotmart, Kiwify e Greenn
                            pra saber quanto fechou hoje.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-10 w-full max-w-md mx-auto sm:max-w-none">
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
                                <span className="relative">Começar 14 dias grátis</span>
                                <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                            </a>
                            <a
                                href="/#agendar-demo"
                                onClick={(e) => { e.preventDefault(); handleSecondary(); }}
                                className="group inline-flex h-12 items-center justify-center gap-2 px-7 rounded-xl text-[15px] no-underline"
                                style={{
                                    color: "var(--vyz-text-strong)",
                                    background: "var(--vyz-surface-2)",
                                    boxShadow: "0 0 0 1px rgba(255,255,255,0.16)",
                                    fontWeight: 600,
                                }}
                            >
                                <Calendar className="h-4 w-4 transition-colors group-hover:text-emerald-300" strokeWidth={2} />
                                Agendar demonstração
                            </a>
                        </div>

                        {/* Stat strip: números que aparecem "ao vivo" */}
                        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
                            {[
                                { icon: Users, label: "Inscritos hoje", value: "428" },
                                { icon: CreditCard, label: "Boletos em aberto", value: "9" },
                                { icon: DollarSign, label: "Aprovado hoje", value: "R$42k" },
                                { icon: TrendingUp, label: "Conversão", value: "7,2%" },
                            ].map((s) => (
                                <div
                                    key={s.label}
                                    className="rounded-xl px-4 py-3.5 text-left"
                                    style={{
                                        background: "var(--vyz-surface-1)",
                                        border: "1px solid var(--vyz-border)",
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <s.icon className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
                                        <span style={{ fontSize: "0.7rem", color: "var(--vyz-text-soft)", fontWeight: 600, letterSpacing: "0.03em" }}>
                                            {s.label.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--vyz-text-primary)", letterSpacing: "-0.02em" }}>
                                        {s.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div
                    className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, transparent, var(--vyz-bg))" }}
                />
            </section>

            {/* ═══ PAINEL ÚNICO INTERATIVO ═════════════════════════════════ */}
            <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 70% 50% at 50% 0%, var(--vyz-accent-soft-8) 0%, transparent 70%)",
                    }}
                />
                <div className="relative max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <SectionEyebrow>VEJA FUNCIONANDO</SectionEyebrow>
                        <SectionHeading>
                            Um painel, <span className="text-emerald-400">três jeitos de vender</span>.
                        </SectionHeading>
                        <SectionSub>
                            Clique nas abas: lançamento, perpétuo, esteira ou integrações. O Vyzon roda os três
                            pipelines lado a lado, alimentados pelos mesmos webhooks.
                        </SectionSub>
                    </div>

                    {/* Unified panel — sidebar + content */}
                    <motion.div
                        className="relative rounded-3xl overflow-hidden"
                        initial={{ y: 20 }}
                        whileInView={{ y: 0 }}
                        viewport={{ once: true, margin: "-10%" }}
                        transition={{ duration: 0.5 }}
                        style={{
                            background: "rgba(11,14,18,0.85)",
                            border: "1px solid var(--vyz-border-strong)",
                            boxShadow: "var(--vyz-shadow-panel)",
                        }}
                    >
                        {/* Toolbar */}
                        <div
                            className="flex items-center justify-between px-4 sm:px-5 py-3"
                            style={{ borderBottom: "1px solid var(--vyz-border)", background: "rgba(255,255,255,0.015)" }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(239,68,68,0.6)" }} />
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(251,191,36,0.6)" }} />
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,227,122,0.6)" }} />
                                </div>
                                <span className="ml-3 font-mono" style={{ fontSize: "0.7rem", color: "var(--vyz-text-dim)" }}>
                                    vyzon.com.br/painel · {activeNavItem.label.toLowerCase()}
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5 text-[11px]" style={{ color: "var(--vyz-text-dim)" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Ao vivo
                            </div>
                        </div>

                        {/* Sidebar + content */}
                        <div className="grid md:grid-cols-[220px_1fr]">
                            {/* Sidebar */}
                            <nav
                                className="p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible"
                                style={{ borderRight: "1px solid var(--vyz-border-subtle)" }}
                            >
                                {PANEL_NAV.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = panel === item.key;
                                    return (
                                        <button
                                            key={item.key}
                                            onClick={() => setPanel(item.key)}
                                            className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-left whitespace-nowrap md:whitespace-normal transition-colors flex-shrink-0 md:flex-shrink md:w-full"
                                            style={{
                                                color: isActive ? "var(--vyz-text-primary)" : "var(--vyz-text-soft)",
                                            }}
                                        >
                                            {isActive && (
                                                <motion.span
                                                    layoutId="panel-pill"
                                                    className="absolute inset-0 rounded-lg"
                                                    style={{
                                                        background: "var(--vyz-accent-soft-8)",
                                                        border: "1px solid var(--vyz-accent-border)",
                                                    }}
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                                />
                                            )}
                                            <Icon
                                                className={`relative h-4 w-4 flex-shrink-0 ${isActive ? "text-emerald-400" : ""}`}
                                                strokeWidth={2}
                                            />
                                            <div className="relative min-w-0">
                                                <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{item.label}</div>
                                                <div className="hidden md:block truncate" style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                                                    {item.sub}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Content */}
                            <div className="min-w-0">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={panel}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activePipeline ? (
                                            <>
                                                <div
                                                    className="px-5 py-4"
                                                    style={{ borderBottom: "1px solid var(--vyz-border-subtle)" }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <activePipeline.icon className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                                                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--vyz-text-strong)" }}>
                                                            Pipeline · {activePipeline.label}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: "0.82rem", color: "var(--vyz-text-soft)", lineHeight: 1.5 }}>
                                                        {activePipeline.tagline}
                                                    </p>
                                                </div>
                                                <KanbanBoard pipeline={activePipeline} />
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    className="px-5 py-4"
                                                    style={{ borderBottom: "1px solid var(--vyz-border-subtle)" }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Plug className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                                                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--vyz-text-strong)" }}>
                                                            Integrações
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: "0.82rem", color: "var(--vyz-text-soft)", lineHeight: 1.5 }}>
                                                        Copia a URL de webhook do Vyzon, cola no produtor da Hotmart (ou Kiwify, Greenn).
                                                        Cada evento vira um deal na etapa certa do pipeline.
                                                    </p>
                                                </div>
                                                <IntegrationsPanel />
                                            </>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hint abaixo do painel */}
                    <p
                        className="text-center mt-8"
                        style={{ fontSize: "0.875rem", color: "var(--vyz-text-dim)" }}
                    >
                        Setup em 5 minutos · webhook nativo nas 3 plataformas · funciona no mesmo painel
                    </p>
                </div>
            </section>

            {/* ═══ RECUPERAÇÃO BOLETO (WhatsApp) ══════════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
                        <div>
                            <SectionEyebrow>BOLETO / PIX / CARTÃO RECUSADO</SectionEyebrow>
                            <h2
                                className="font-heading mb-5"
                                style={{
                                    fontWeight: 700,
                                    fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                                    lineHeight: 1.1,
                                    letterSpacing: "-0.04em",
                                }}
                            >
                                Boleto vencido virou{" "}
                                <span className="text-emerald-400">deal ativo</span>, não relatório esquecido.
                            </h2>
                            <p className="mb-6" style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "var(--vyz-text-muted)" }}>
                                Webhook da Hotmart dispara "boleto gerado" → deal entra na etapa "Boleto aberto" com
                                SLA de 48h. Se não pagou, a Eva identifica, escreve a mensagem no seu tom e sugere o
                                horário de envio. Vendedor aprova com um toque, nada escapa porque ninguém lembrou.
                            </p>

                            <ul className="space-y-3">
                                {[
                                    {
                                        icon: CreditCard,
                                        title: "Boleto vence em 18h",
                                        body: "Eva sugere mensagem 24h antes, com link pra novo boleto ou PIX.",
                                    },
                                    {
                                        icon: AlertCircle,
                                        title: "Cartão recusado",
                                        body: "Mensagem automática explica e oferece troca pra PIX na hora.",
                                    },
                                    {
                                        icon: MessageSquare,
                                        title: "PIX aberto há 30min",
                                        body: "Eva lembra no WhatsApp antes do lead esfriar e fechar o navegador.",
                                    },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.title} className="flex items-start gap-3">
                                            <div
                                                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                                                style={{ background: "var(--vyz-accent-soft-10)", border: "1px solid var(--vyz-accent-border)" }}
                                            >
                                                <Icon className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--vyz-text-strong)" }}>
                                                    {item.title}
                                                </div>
                                                <div style={{ fontSize: "0.875rem", color: "var(--vyz-text-muted)" }}>
                                                    {item.body}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <motion.div
                            initial={{ y: 16 }}
                            whileInView={{ y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <WhatsAppMock />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══ RANKING AO VIVO ════════════════════════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse 70% 50% at 50% 0%, var(--vyz-accent-soft-6) 0%, transparent 70%)",
                    }}
                />
                <div className="relative max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-14 items-center">
                        <motion.div
                            initial={{ y: 16 }}
                            whileInView={{ y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="order-2 lg:order-1"
                        >
                            <RankingMock />
                        </motion.div>

                        <div className="order-1 lg:order-2">
                            <SectionEyebrow>RANKING POR PRODUTO</SectionEyebrow>
                            <h2
                                className="font-heading mb-5"
                                style={{
                                    fontWeight: 700,
                                    fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                                    lineHeight: 1.1,
                                    letterSpacing: "-0.04em",
                                }}
                            >
                                O time abre o celular e{" "}
                                <span className="text-emerald-400">vê a posição antes do café</span>.
                            </h2>
                            <p className="mb-6" style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "var(--vyz-text-muted)" }}>
                                Cada venda aprovada sobe o ranking em segundos. Gestor não "roda os números" no fim do mês,
                                a meta da turma e a posição individual ficam visíveis no painel. E você filtra por produto,
                                por esteira ou por origem (Hotmart vs Kiwify vs Greenn).
                            </p>

                            <ul className="space-y-2.5">
                                {[
                                    "Pódio ao vivo com meta da turma + meta individual",
                                    "Ranking separado por produto, esteira ou campanha",
                                    "Comissão calculada automática no deal fechado",
                                    "Histórico mensal sem planilha, export pronto",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3">
                                        <div
                                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                            style={{ background: "var(--vyz-accent-soft-12)" }}
                                        >
                                            <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: "0.95rem", color: "var(--vyz-text)" }}>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ FAQ ═══════════════════════════════════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "var(--vyz-bg)" }}>
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <SectionEyebrow>PERGUNTAS COMUNS</SectionEyebrow>
                        <SectionHeading>
                            Dúvidas de quem <span className="text-emerald-400">vende todo dia</span>.
                        </SectionHeading>
                    </div>

                    <div className="space-y-3">
                        {FAQ.map((item) => (
                            <details
                                key={item.q}
                                className="group rounded-2xl px-6 py-5"
                                style={{ background: "var(--vyz-surface-1)", border: "1px solid var(--vyz-border)" }}
                            >
                                <summary
                                    className="cursor-pointer list-none flex items-start justify-between gap-4"
                                    style={{ fontWeight: 600, fontSize: "1.0125rem", color: "var(--vyz-text-strong)" }}
                                >
                                    {item.q}
                                    <span
                                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform group-open:rotate-45"
                                        style={{ background: "var(--vyz-accent-soft-12)", color: "var(--vyz-accent-light)", fontWeight: 700 }}
                                    >
                                        +
                                    </span>
                                </summary>
                                <p
                                    className="mt-4 pr-10"
                                    style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--vyz-text-muted)" }}
                                >
                                    {item.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FINAL CTA ═════════════════════════════════════════════ */}
            <LazyOnVisible minHeight="400px">
                <Suspense fallback={null}>
                    <FinalCTA onCTAClick={handlePrimary} onScheduleDemoClick={handleSecondary} />
                </Suspense>
            </LazyOnVisible>

            {/* ═══ FOOTER ════════════════════════════════════════════════ */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: "var(--vyz-border)" }}>
                <div
                    className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
                    style={{ color: "var(--vyz-text-dim)" }}
                >
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
