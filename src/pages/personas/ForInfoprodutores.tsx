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
    PlayCircle,
    User,
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

type PipelineKind = "lancamento" | "perpetuo" | "esteira";

const PIPELINES: Record<
    PipelineKind,
    {
        label: string;
        tagline: string;
        icon: typeof Rocket;
        columns: Array<{ title: string; badge?: string; deals: Array<{ name: string; value: string; tag?: string; hot?: boolean }> }>;
    }
> = {
    lancamento: {
        label: "Lançamento",
        tagline: "Janela curta, pipeline cheio. Etapas refletem o funil do lançamento.",
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
        tagline: "Lead frio → call → proposta. Pipeline por temperatura.",
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
        tagline: "Assinante entra, sobe de produto. Churn vira deal de retenção.",
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
    { name: "Eduzz", highlight: false, note: "webhook genérico" },
    { name: "Mercado Pago", highlight: false, note: "webhook genérico" },
    { name: "Stripe", highlight: false, note: "API + webhook" },
    { name: "WhatsApp", highlight: false, note: "Evolution API" },
    { name: "Outros", highlight: false, note: "via webhook HTTP" },
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
// Sub-components (mockups visuais)
// ═══════════════════════════════════════════════════════════════════════════

const SectionEyebrow = ({ children }: { children: React.ReactNode }) => (
    <span
        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
        style={{
            fontWeight: 600,
            letterSpacing: "0.08em",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
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
    <p className="mt-4 max-w-xl mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}>
        {children}
    </p>
);

const KanbanMock = ({ pipeline }: { pipeline: typeof PIPELINES[PipelineKind] }) => (
    <div
        className="rounded-2xl p-4 sm:p-5 overflow-hidden"
        style={{
            background: "rgba(11,14,18,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
        }}
    >
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
                <pipeline.icon className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                    Pipeline · {pipeline.label}
                </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
            </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {pipeline.columns.map((col) => (
                <div key={col.title} className="min-w-0">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span
                            className="truncate"
                            style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}
                        >
                            {col.title.toUpperCase()}
                        </span>
                        {col.badge && (
                            <span
                                className="px-1.5 rounded text-[10px] flex-shrink-0"
                                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}
                            >
                                {col.badge}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {col.deals.map((d, i) => (
                            <div
                                key={i}
                                className="rounded-lg px-2 py-2"
                                style={{
                                    background: d.hot ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.025)",
                                    border: `1px solid ${d.hot ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`,
                                }}
                            >
                                <div
                                    className="truncate"
                                    style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}
                                >
                                    {d.name}
                                </div>
                                {d.tag && (
                                    <div
                                        className="truncate mt-0.5"
                                        style={{ fontSize: "0.625rem", color: d.hot ? "#34d399" : "rgba(255,255,255,0.4)" }}
                                    >
                                        {d.tag}
                                    </div>
                                )}
                                {d.value && !d.tag && (
                                    <div className="truncate mt-0.5" style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)" }}>
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

const WebhookSetupMock = () => (
    <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: "rgba(11,14,18,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
        <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <LinkIcon className="h-4 w-4 text-emerald-400" strokeWidth={2} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                Integrações · Hotmart
            </span>
        </div>
        <div className="space-y-2">
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>
                URL DO WEBHOOK
            </div>
            <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <span className="truncate flex-1" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    https://api.vyzon.com.br/wh/hotmart/3f2a…
                </span>
                <Copy className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} strokeWidth={2} />
            </div>
        </div>
        <div className="space-y-2">
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>
                EVENTOS CAPTURADOS
            </div>
            <div className="flex flex-wrap gap-1.5">
                {["Venda aprovada", "Boleto gerado", "Cartão recusado", "Chargeback", "Reembolso"].map((e) => (
                    <span
                        key={e}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
                        style={{
                            fontSize: "0.7rem",
                            background: "rgba(16,185,129,0.08)",
                            color: "#34d399",
                            border: "1px solid rgba(16,185,129,0.15)",
                        }}
                    >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        {e}
                    </span>
                ))}
            </div>
        </div>
        <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
            <CircleCheck className="h-4 w-4 text-emerald-400" strokeWidth={2} />
            <span style={{ fontSize: "0.8rem", color: "rgba(16,185,129,0.95)", fontWeight: 600 }}>
                Conectado · última venda há 2min
            </span>
        </div>
    </div>
);

const WhatsAppMock = () => (
    <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0b1014", border: "1px solid rgba(255,255,255,0.08)" }}
    >
        {/* Chat header */}
        <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "rgba(16,185,129,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
            <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
                <User className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                    Marcos A. (Lead — boleto vencido)
                </div>
                <div style={{ fontSize: "0.7rem", color: "#34d399" }}>Eva está escrevendo…</div>
            </div>
        </div>

        {/* Thread */}
        <div className="p-4 space-y-2.5 min-h-[380px]">
            {WHATSAPP_THREAD.map((m, i) => {
                if (m.from === "system") {
                    return (
                        <div key={i} className="flex justify-center my-3">
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
                                style={{
                                    background: "rgba(16,185,129,0.1)",
                                    color: "#34d399",
                                    border: "1px solid rgba(16,185,129,0.2)",
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
                                background: isEva ? "rgba(255,255,255,0.04)" : "rgba(16,185,129,0.12)",
                                border: `1px solid ${isEva ? "rgba(255,255,255,0.05)" : "rgba(16,185,129,0.2)"}`,
                                borderTopLeftRadius: isEva ? 4 : undefined,
                                borderTopRightRadius: !isEva ? 4 : undefined,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "0.825rem",
                                    lineHeight: 1.5,
                                    color: isEva ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.95)",
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
        style={{ background: "rgba(11,14,18,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
        <div className="flex items-center justify-between mb-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                    Ranking · Abril · Lançamento Pro
                </span>
            </div>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                atualiza a cada venda
            </span>
        </div>

        <div className="space-y-2.5">
            {RANKING.map((r) => (
                <div
                    key={r.pos}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{
                        background: r.pos <= 3 ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${r.pos <= 3 ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)"}`,
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
                                    : "rgba(255,255,255,0.05)",
                            color: r.pos <= 3 ? "#0b0f13" : "rgba(255,255,255,0.5)",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                        }}
                    >
                        {r.pos}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                                {r.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                                {r.sales} vendas · {r.revenue}
                            </span>
                        </div>
                        <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.05)" }}
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
                                            : "linear-gradient(90deg, #34d399, #10b981)",
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div
            className="mt-5 pt-4 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                Meta da turma:
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                R$ 146.220 / R$ 180.000 <span style={{ color: "#34d399" }}>(81%)</span>
            </span>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function ForInfoprodutores() {
    const navigate = useNavigate();
    const [pipelineTab, setPipelineTab] = useState<PipelineKind>("lancamento");

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

    const currentPipeline = PIPELINES[pipelineTab];

    return (
        <div className="min-h-screen" style={{ background: "#06080a", color: "rgba(255,255,255,0.95)" }}>
            <LandingNav onCTAClick={handleSecondary} onLoginClick={handleLogin} />

            {/* ═══ HERO ═══════════════════════════════════════════════════ */}
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

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="pt-32 sm:pt-40 pb-10 text-center">
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
                            <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                                Cada venda da Hotmart vira um{" "}
                            </span>
                            <span
                                style={{
                                    fontWeight: 900,
                                    background: "linear-gradient(135deg, #34d399, #10b981, #14b8a6)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}
                            >
                                card no pipeline.
                            </span>
                        </h1>

                        <p
                            className="mt-6 mx-auto max-w-2xl"
                            style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", lineHeight: 1.7, color: "rgba(255,255,255,0.7)" }}
                        >
                            Aprovada, boleto, cartão recusado. Tudo entra no painel na hora. O vendedor vê a posição subir,
                            a Eva manda o follow-up no WhatsApp e você para de abrir planilha da Hotmart, Kiwify e Greenn
                            pra saber quanto fechou hoje.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-10 w-full max-w-md mx-auto sm:max-w-none">
                            <a
                                href="/onboarding?plan=pro"
                                onClick={(e) => { e.preventDefault(); handlePrimary(); }}
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
                                onClick={(e) => { e.preventDefault(); handleSecondary(); }}
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

                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
                            {["Hotmart, Kiwify e Greenn nativos", "Primeira venda em 5 min", "Sem cartão pra testar"].map((t) => (
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

                    {/* Hero mockup */}
                    <motion.div
                        className="relative mt-4 max-w-5xl mx-auto"
                        initial={{ y: 16 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div
                            className="absolute -inset-6 -z-10 rounded-3xl"
                            style={{
                                background: "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 60%)",
                            }}
                        />
                        <KanbanMock pipeline={PIPELINES.lancamento} />
                    </motion.div>
                </div>

                <div
                    className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
                    style={{ background: "linear-gradient(to bottom, transparent, #06080a)" }}
                />
            </section>

            {/* ═══ SETUP STEP-BY-STEP ═════════════════════════════════════ */}
            <section className="relative py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <SectionEyebrow>SETUP EM 5 MINUTOS</SectionEyebrow>
                        <SectionHeading>
                            Conecta uma vez, <span className="text-emerald-400">nunca mais mexe</span>.
                        </SectionHeading>
                        <SectionSub>
                            Webhook copiado do Vyzon, colado no produtor da Hotmart (ou Kiwify, ou Greenn).
                            Pronto — a próxima venda já cai no pipeline.
                        </SectionSub>
                    </div>

                    <div className="grid md:grid-cols-[1fr_1fr] gap-8 items-start">
                        {/* Steps left */}
                        <ol className="space-y-4">
                            {[
                                {
                                    n: "1",
                                    title: "Abre a tela de integrações no Vyzon",
                                    body: "Escolhe Hotmart, Kiwify, Greenn ou webhook genérico. Cada plataforma tem uma URL própria — você não mistura as vendas.",
                                },
                                {
                                    n: "2",
                                    title: "Copia a URL, cola na plataforma",
                                    body: "Na Hotmart: Ferramentas → Notificação por URL → cola a URL do Vyzon. Marca os eventos (venda, boleto, cartão recusado, chargeback).",
                                },
                                {
                                    n: "3",
                                    title: "Primeira venda aprova e o deal aparece",
                                    body: "Em segundos o card cai na etapa certa do pipeline. Ranking sobe. Se você configurou Eva, follow-up de boleto já dispara sozinho.",
                                },
                            ].map((s) => (
                                <motion.li
                                    key={s.n}
                                    initial={{ y: 12 }}
                                    whileInView={{ y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: Number(s.n) * 0.1 }}
                                    className="flex gap-4 rounded-2xl p-5"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                                >
                                    <div
                                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-heading"
                                        style={{
                                            background: "linear-gradient(135deg, #10b981, #059669)",
                                            boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                                            fontWeight: 800,
                                        }}
                                    >
                                        {s.n}
                                    </div>
                                    <div>
                                        <h3
                                            className="font-heading mb-1.5"
                                            style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}
                                        >
                                            {s.title}
                                        </h3>
                                        <p style={{ fontSize: "0.925rem", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
                                            {s.body}
                                        </p>
                                    </div>
                                </motion.li>
                            ))}
                        </ol>

                        {/* Mockup right */}
                        <div className="relative md:sticky md:top-24">
                            <WebhookSetupMock />
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ 3 PIPELINES (TABS) ═════════════════════════════════════ */}
            <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                    }}
                />
                <div className="relative max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <SectionEyebrow>TRÊS MODELOS, UM PAINEL</SectionEyebrow>
                        <SectionHeading>
                            Cada jeito de vender tem <span className="text-emerald-400">seu pipeline</span>.
                        </SectionHeading>
                        <SectionSub>
                            Lançamento tem etapas de funil. Perpétuo roda por temperatura. Esteira trabalha recorrência
                            e churn. Os três rodam no mesmo Vyzon, separados por produto.
                        </SectionSub>
                    </div>

                    {/* Tab selector */}
                    <div className="flex justify-center mb-8 px-2">
                        <div
                            className="inline-flex gap-1 p-1 rounded-xl"
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
                            }}
                        >
                            {(Object.keys(PIPELINES) as PipelineKind[]).map((k) => {
                                const p = PIPELINES[k];
                                const isActive = pipelineTab === k;
                                const Icon = p.icon;
                                return (
                                    <button
                                        key={k}
                                        onClick={() => setPipelineTab(k)}
                                        className="relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-colors"
                                        style={{
                                            fontWeight: 600,
                                            color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
                                        }}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="pipeline-pill"
                                                className="absolute inset-0 rounded-lg"
                                                style={{
                                                    background: "rgba(255,255,255,0.08)",
                                                    boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
                                                }}
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                            />
                                        )}
                                        <Icon className={`relative h-4 w-4 ${isActive ? "text-emerald-400" : ""}`} strokeWidth={2} />
                                        <span className="relative">{p.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <p
                        className="text-center mb-8 max-w-2xl mx-auto"
                        style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)" }}
                    >
                        {currentPipeline.tagline}
                    </p>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pipelineTab}
                            initial={{ y: 12 }}
                            animate={{ y: 0 }}
                            exit={{ y: -12 }}
                            transition={{ duration: 0.25 }}
                        >
                            <KanbanMock pipeline={currentPipeline} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* ═══ RECUPERAÇÃO BOLETO (WhatsApp) ══════════════════════════ */}
            <section className="relative py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
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
                            <p className="mb-6" style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
                                Webhook da Hotmart dispara "boleto gerado" → deal entra na etapa "Boleto aberto" com
                                SLA de 48h. Se não pagou, a Eva identifica, escreve a mensagem no seu tom e sugere o
                                horário de envio. Vendedor aprova com um toque — nada escapa porque ninguém lembrou.
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
                                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                                            >
                                                <Icon className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                                                    {item.title}
                                                </div>
                                                <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)" }}>
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
            <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
                <div
                    className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)",
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
                            <p className="mb-6" style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
                                Cada venda aprovada sobe o ranking em segundos. Gestor não "roda os números" no fim do mês —
                                a meta da turma e a posição individual ficam visíveis no painel. E você filtra por produto,
                                por esteira ou por origem (Hotmart vs Kiwify vs Greenn).
                            </p>

                            <ul className="space-y-2.5">
                                {[
                                    "Pódio ao vivo com meta da turma + meta individual",
                                    "Ranking separado por produto, esteira ou campanha",
                                    "Comissão calculada automática no deal fechado",
                                    "Histórico mensal sem planilha — export pronto",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-3">
                                        <div
                                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                            style={{ background: "rgba(16,185,129,0.12)" }}
                                        >
                                            <Check className="h-3 w-3 text-emerald-400" strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)" }}>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ INTEGRAÇÕES ═════════════════════════════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
                <div className="max-w-5xl mx-auto text-center">
                    <SectionEyebrow>PLATAFORMAS SUPORTADAS</SectionEyebrow>
                    <SectionHeading>
                        Conecta com <span className="text-emerald-400">tudo que você já usa</span>.
                    </SectionHeading>
                    <SectionSub>
                        Webhook nativo nas três plataformas que dominam o mercado BR. O resto roda via webhook
                        genérico ou API — sem Zapier no meio cobrando assinatura.
                    </SectionSub>

                    <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {INTEGRATIONS.map((i) => (
                            <div
                                key={i.name}
                                className="rounded-xl p-4 text-left"
                                style={{
                                    background: i.highlight ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${i.highlight ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                                }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    {i.highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                    <span
                                        style={{
                                            fontSize: "0.9rem",
                                            fontWeight: 700,
                                            color: i.highlight ? "rgba(16,185,129,0.95)" : "rgba(255,255,255,0.9)",
                                        }}
                                    >
                                        {i.name}
                                    </span>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{i.note}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FAQ ═══════════════════════════════════════════════════ */}
            <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
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
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
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

            {/* ═══ FINAL CTA ═════════════════════════════════════════════ */}
            <LazyOnVisible minHeight="400px">
                <Suspense fallback={null}>
                    <FinalCTA onCTAClick={handlePrimary} onScheduleDemoClick={handleSecondary} />
                </Suspense>
            </LazyOnVisible>

            {/* ═══ FOOTER ════════════════════════════════════════════════ */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div
                    className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
                    style={{ color: "rgba(255,255,255,0.4)" }}
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
