import { MessageCircle, Workflow, Check, ArrowRight, Search } from "lucide-react";
import { EvaNode } from "./EvaNode";

// LP.2.2 2026-05-25: prova visual de produto em mock CSS de alta fidelidade
// (sem screenshot real). Mostra o fluxo WhatsApp → EVA → Pipeline:
// Inbox (esquerda) · Conversa (centro) · Painel EVA (direita) · Pipeline (rodapé).
// Sem promessa de automação — a EVA sugere, o time aprova.

const INBOX = [
    { name: "Carla Ribeiro", meta: "Meta Ads · Clínica Estética", badge: "Lead novo", tone: "blue", active: true },
    { name: "Mayara Sampaio", meta: "WhatsApp · Diagnóstico", badge: "Aguardando resposta", tone: "amber", active: false },
    { name: "Jean Spínola", meta: "Indicação · Tráfego pago", badge: "Follow-up", tone: "neutral", active: false },
] as const;

const ANALYSIS = [
    { label: "Intenção", value: "preço", tone: "blue" },
    { label: "Fit", value: "bom", tone: "green" },
    { label: "Falta", value: "orçamento", tone: "amber" },
] as const;

const PIPELINE = [
    { name: "Novo lead", active: false },
    { name: "Qualificação", active: true },
    { name: "Proposta", active: false },
] as const;

const toneColor = {
    blue: { bg: "rgba(37,99,235,0.1)", border: "rgba(37,99,235,0.28)", text: "#1D4ED8" },
    amber: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#B45309" },
    green: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#047857" },
    neutral: { bg: "rgba(10,10,10,0.05)", border: "rgba(10,10,10,0.1)", text: "rgba(10,10,10,0.6)" },
} as const;

type Tone = keyof typeof toneColor;

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
    const c = toneColor[tone];
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] whitespace-nowrap"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontWeight: 600 }}
        >
            {children}
        </span>
    );
}

export const ProductShowcase = () => {
    return (
        <section className="lp-paper relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="relative max-w-6xl mx-auto">
                {/* Estação do fio */}
                <div className="lp-station mb-12 sm:mb-16 landing-fade-in-up">
                    <span className="lp-station-node" />
                    <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                        02 · a prova
                    </span>
                    <span className="lp-station-rule" />
                </div>

                {/* Header */}
                <div className="mb-12 sm:mb-14 landing-fade-in-up">
                    <h2
                        className="font-satoshi"
                        style={{
                            fontWeight: 900,
                            fontSize: "clamp(1.9rem, 4.8vw, 3.2rem)",
                            lineHeight: 1.04,
                            letterSpacing: "-0.04em",
                            color: "var(--lp-ink)",
                            maxWidth: "720px",
                        }}
                    >
                        Veja como a conversa vira{" "}
                        <span className="lp-serif" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                            oportunidade
                        </span>
                        .
                    </h2>
                    <p
                        className="mt-5 max-w-2xl"
                        style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)", lineHeight: 1.6, color: "var(--lp-ink-70)" }}
                    >
                        A Inbox organiza o atendimento, a EVA sugere o próximo passo e o pipeline mantém a oportunidade em movimento.
                    </p>
                </div>

                {/* Mock card — moldura blueprint com marcas de corte */}
                <div className="lp-frame relative landing-fade-in-up landing-delay-200">
                <div
                    className="relative rounded-[12px] overflow-hidden"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid var(--lp-line)",
                        boxShadow: "0 24px 64px -32px rgba(13,20,33,0.25)",
                    }}
                >
                    {/* Top chrome bar */}
                    <div
                        className="flex items-center gap-3 px-5 py-3.5 border-b"
                        style={{ borderColor: "rgba(10,10,10,0.07)", background: "rgba(247,250,255,0.7)" }}
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#EF4444" }} />
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#F59E0B" }} />
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#10B981" }} />
                        </div>
                        <span
                            className="text-[11px] uppercase ml-2"
                            style={{ letterSpacing: "0.14em", color: "rgba(10,10,10,0.4)", fontWeight: 700 }}
                        >
                            Vyzon · Central Comercial
                        </span>
                    </div>

                    {/* 3 colunas */}
                    <div className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_312px]">
                        {/* ── Coluna esquerda: Inbox ──────────────────────── */}
                        <div
                            className="hidden lg:flex flex-col border-r"
                            style={{ borderColor: "rgba(10,10,10,0.07)", background: "rgba(248,250,252,0.5)" }}
                        >
                            <div className="px-4 pt-4 pb-3">
                                <p
                                    className="text-[10.5px] uppercase mb-3"
                                    style={{ letterSpacing: "0.12em", color: "rgba(10,10,10,0.45)", fontWeight: 700 }}
                                >
                                    Inbox Comercial
                                </p>
                                <div
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                    style={{ background: "rgba(10,10,10,0.04)", border: "1px solid rgba(10,10,10,0.07)" }}
                                >
                                    <Search className="h-3.5 w-3.5" style={{ color: "rgba(10,10,10,0.35)" }} />
                                    <span className="text-[12px]" style={{ color: "rgba(10,10,10,0.4)" }}>Buscar conversa</span>
                                </div>
                            </div>
                            <div className="px-2 pb-3 flex flex-col gap-1">
                                {INBOX.map((c) => (
                                    <div
                                        key={c.name}
                                        className="px-3 py-3 rounded-xl"
                                        style={{
                                            background: c.active ? "rgba(37,99,235,0.08)" : "transparent",
                                            border: `1px solid ${c.active ? "rgba(37,99,235,0.3)" : "transparent"}`,
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span
                                                className="text-[13.5px] truncate"
                                                style={{ color: "#0B1220", fontWeight: 600 }}
                                            >
                                                {c.name}
                                            </span>
                                            <Badge tone={c.tone as Tone}>{c.badge}</Badge>
                                        </div>
                                        <p className="text-[11.5px] truncate" style={{ color: "rgba(10,10,10,0.5)" }}>
                                            {c.meta}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Coluna central: Conversa ────────────────────── */}
                        <div className="flex flex-col border-b lg:border-b-0 lg:border-r" style={{ borderColor: "rgba(10,10,10,0.07)" }}>
                            {/* Header da conversa */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(10,10,10,0.07)" }}>
                                <div
                                    className="h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
                                    style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                                >
                                    CR
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14.5px] truncate" style={{ color: "#0B1220", fontWeight: 600 }}>
                                        Carla Ribeiro
                                    </p>
                                    <p className="text-[12px] truncate" style={{ color: "rgba(10,10,10,0.5)" }}>
                                        Lead vindo de campanha Meta
                                    </p>
                                </div>
                                <MessageCircle className="h-4 w-4 shrink-0" style={{ color: "rgba(16,185,129,0.7)" }} />
                            </div>

                            {/* Mensagens */}
                            <div className="px-5 py-6 flex flex-col gap-3.5 flex-1" style={{ background: "rgba(248,250,252,0.4)" }}>
                                {/* Lead */}
                                <div className="flex justify-start">
                                    <div
                                        className="max-w-[80%] px-4 py-2.5 rounded-2xl text-[13.5px]"
                                        style={{
                                            background: "#FFFFFF",
                                            border: "1px solid rgba(10,10,10,0.08)",
                                            color: "rgba(10,10,10,0.8)",
                                            borderTopLeftRadius: 6,
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        Oi, vi o anúncio e queria entender os planos.
                                    </div>
                                </div>
                                {/* Equipe */}
                                <div className="flex justify-end">
                                    <div
                                        className="max-w-[82%] px-4 py-2.5 rounded-2xl text-[13.5px]"
                                        style={{
                                            background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                                            color: "#FFFFFF",
                                            borderTopRightRadius: 6,
                                            lineHeight: 1.45,
                                            boxShadow: "0 8px 22px -8px rgba(37,99,235,0.45)",
                                        }}
                                    >
                                        Claro, Carla. Antes de te passar o melhor caminho, posso entender seu objetivo com tráfego hoje?
                                    </div>
                                </div>
                            </div>

                            {/* Input decorativo */}
                            <div className="px-5 py-3.5 border-t" style={{ borderColor: "rgba(10,10,10,0.07)" }}>
                                <div
                                    className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl"
                                    style={{ background: "rgba(10,10,10,0.04)", border: "1px solid rgba(10,10,10,0.08)" }}
                                >
                                    <span className="text-[12.5px]" style={{ color: "rgba(10,10,10,0.4)" }}>
                                        Escreva ou use a sugestão da EVA…
                                    </span>
                                    <div
                                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                                    >
                                        <ArrowRight className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Coluna direita: Painel EVA ──────────────────── */}
                        <div className="flex flex-col" style={{ background: "rgba(250,249,255,0.6)" }}>
                            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(10,10,10,0.07)" }}>
                                <div
                                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
                                >
                                    <EvaNode size={15} color="#FFFFFF" />
                                </div>
                                <span className="text-[13.5px]" style={{ color: "#0B1220", fontWeight: 600 }}>
                                    EVA Comercial
                                </span>
                            </div>

                            <div className="px-5 py-5 flex flex-col gap-4 flex-1">
                                {/* Análise */}
                                <div className="flex flex-wrap gap-1.5">
                                    {ANALYSIS.map((a) => {
                                        const c = toneColor[a.tone as Tone];
                                        return (
                                            <span
                                                key={a.label}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px]"
                                                style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontWeight: 600 }}
                                            >
                                                <span style={{ opacity: 0.7 }}>{a.label}:</span> {a.value}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Próxima ação */}
                                <div
                                    className="rounded-lg px-3.5 py-3"
                                    style={{ background: "rgba(10,10,10,0.03)", border: "1px solid rgba(10,10,10,0.07)" }}
                                >
                                    <p className="text-[10.5px] uppercase mb-1" style={{ letterSpacing: "0.1em", color: "rgba(10,10,10,0.45)", fontWeight: 700 }}>
                                        Próxima ação
                                    </p>
                                    <p className="text-[13px]" style={{ color: "rgba(10,10,10,0.75)", lineHeight: 1.4, fontWeight: 500 }}>
                                        Perguntar urgência e verba mensal
                                    </p>
                                </div>

                                {/* Sugestão da EVA */}
                                <div
                                    className="rounded-xl px-4 py-4"
                                    style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.25)" }}
                                >
                                    <p
                                        className="text-[10.5px] uppercase mb-2 inline-flex items-center gap-1.5"
                                        style={{ letterSpacing: "0.1em", color: "#6D28D9", fontWeight: 700 }}
                                    >
                                        <EvaNode size={11} color="#6D28D9" />
                                        Sugestão da EVA
                                    </p>
                                    <p className="text-[13px] mb-3.5" style={{ color: "rgba(10,10,10,0.78)", lineHeight: 1.5 }}>
                                        Pergunte sobre orçamento e urgência antes de propor uma reunião.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] text-white"
                                            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)", fontWeight: 600 }}
                                        >
                                            <Check className="h-3 w-3" strokeWidth={2.6} />
                                            Usar sugestão
                                        </span>
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-[12px]"
                                            style={{ background: "rgba(10,10,10,0.05)", border: "1px solid rgba(10,10,10,0.1)", color: "rgba(10,10,10,0.6)", fontWeight: 600 }}
                                        >
                                            Editar
                                        </span>
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-[12px]"
                                            style={{ background: "rgba(10,10,10,0.05)", border: "1px solid rgba(10,10,10,0.1)", color: "rgba(10,10,10,0.6)", fontWeight: 600 }}
                                        >
                                            Ignorar
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Rodapé: Pipeline contextual ─────────────────── */}
                    <div
                        className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 border-t"
                        style={{ borderColor: "rgba(10,10,10,0.07)", background: "rgba(247,250,255,0.7)" }}
                    >
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Workflow className="h-3.5 w-3.5" style={{ color: "rgba(10,10,10,0.45)" }} />
                            <span className="text-[10.5px] uppercase" style={{ letterSpacing: "0.12em", color: "rgba(10,10,10,0.45)", fontWeight: 700 }}>
                                Pipeline
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {PIPELINE.map((stage, i) => (
                                <div key={stage.name} className="flex items-center gap-2 min-w-0">
                                    <span
                                        className="px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap"
                                        style={{
                                            background: stage.active ? "rgba(37,99,235,0.12)" : "rgba(10,10,10,0.04)",
                                            border: `1px solid ${stage.active ? "rgba(37,99,235,0.4)" : "rgba(10,10,10,0.08)"}`,
                                            color: stage.active ? "#1D4ED8" : "rgba(10,10,10,0.55)",
                                            fontWeight: stage.active ? 700 : 500,
                                        }}
                                    >
                                        {stage.name}
                                    </span>
                                    {i < PIPELINE.length - 1 && (
                                        <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(10,10,10,0.3)" }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                </div>

                {/* Microcopy — frase canônica (1ª de 2 ocorrências na página) */}
                <p
                    className="mt-8 text-center inline-flex items-center gap-2 mx-auto w-full justify-center landing-fade-in landing-delay-300 lp-serif"
                    style={{ fontSize: "1.0625rem", color: "var(--lp-ink-70)" }}
                >
                    <EvaNode size={13} color="var(--lp-eva)" />
                    A EVA sugere. Seu time aprova.
                </p>
            </div>
        </section>
    );
};
