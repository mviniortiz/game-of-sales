import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// F5C.5.3 — Phosphor duotone (mesmo set da sidebar e do pipeline /pipeline).
// Alias mantém os mesmos nomes locais (AlertTriangle, ArrowRight, …) pra não
// reescrever cada call site — só adicionei weight="duotone" no JSX.
import {
    Warning as AlertTriangle,
    ArrowRight,
    CalendarBlank as Calendar,
    Clock,
    Funnel as Filter,
    FireSimple as Flame,
    Tray as InboxIcon,
    ChatCircle as MessageCircle,
    ChatText as MessageSquare,
    DotsThree as MoreHorizontal,
    ArrowsClockwise as RefreshCw,
    PaperPlaneTilt as Send,
    Sparkle as Sparkles,
    Target,
} from "@phosphor-icons/react";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { useInicioData } from "@/hooks/useInicioData";
import {
    useCommandCenterData,
    type AttentionItem,
    type CommandCenterMetrics,
    type DailyPriority,
    type EvaHighlight,
    type RecentActivityItem,
} from "@/hooks/useCommandCenterData";
import {
    useCentralEvaAssistant,
    type CentralEvaInput,
    type EvaResponse,
} from "@/hooks/useCentralEvaAssistant";

// ─────────────────────────────────────────────────────────────────────────────
// Central de Comando — F5C.1 (2026-05-20)
//
// Dados reais via useCommandCenterData (channel_*/deals/summaries/gaps) +
// useInicioData (pipeline real). Sem mocks de métrica. Sem mutation. Sem
// chamada à EVA/Evolution/Meta.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helpers visuais ────────────────────────────────────────────────────────

const formatCompactBRL = (v: number): string => {
    if (!v) return "R$ 0";
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
    return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

function relativeTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "agora";
    const min = Math.floor(diffMs / 60_000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

// F5C.5.2 — descrição humana da atividade recente
// Recebe o item normalizado (ex: title="Imagem recebida", description="De Mayara")
// e devolve uma frase única ("Mayara enviou uma imagem").
const INBOUND_PHRASE: Record<string, string> = {
    "Áudio recebido":        "enviou um áudio",
    "Imagem recebida":       "enviou uma imagem",
    "Vídeo recebido":        "enviou um vídeo",
    "Documento recebido":    "enviou um documento",
    "Localização recebida":  "enviou uma localização",
    "Contato recebido":      "enviou um contato",
    "Nova mensagem":         "enviou nova mensagem",
};

function describeActivity(item: RecentActivityItem): string {
    const name = (item.contactName && item.contactName.trim()) || "Contato";
    if (item.type === "message_outbound") {
        return item.title === "Resposta enviada"
            ? `Resposta enviada para ${name}`
            : `Mensagem enviada para ${name}`;
    }
    const verb = INBOUND_PHRASE[item.title] || "enviou uma mensagem";
    return `${name} ${verb}`;
}

const PRIORITY_TONE: Record<AttentionItem["priority"], { bg: string; color: string; label: string }> = {
    high:   { bg: "rgba(220,38,38,0.10)",  color: "#B91C1C", label: "Urgente" },
    medium: { bg: "rgba(245,158,11,0.10)", color: "#B45309", label: "Atenção" },
    low:    { bg: "rgba(148,163,184,0.15)", color: "#64748B", label: "Baixa" },
};

const ATTENTION_ICON: Record<AttentionItem["type"], typeof MessageCircle> = {
    unread_conversation: MessageCircle,
    hot_lead_waiting:    Flame,
    stale_conversation:  Clock,
    stale_deal:          Target,
    knowledge_gap:       Sparkles,
};

// ─── Building blocks ────────────────────────────────────────────────────────

function SectionCard({
    title,
    subtitle,
    action,
    children,
    className = "",
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-2xl ${className}`}
            style={{
                background: "#FFFFFF",
                border: "1px solid #D9E2EC",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            <div className="px-6 sm:px-8 pt-6 pb-5 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-[16px] sm:text-[18px]"
                        style={{ color: "#0B1220", letterSpacing: "-0.018em" }}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8">{children}</div>
        </div>
    );
}

interface KpiCardProps {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
    hint?: string;
    loading?: boolean;
    accent?: string;
}

function KpiCard({ label, value, icon: Icon, hint, loading, accent = "#2563EB" }: KpiCardProps) {
    return (
        <div
            className="rounded-2xl p-6 sm:p-7"
            style={{
                background: "#FFFFFF",
                border: "1px solid #D9E2EC",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{
                        background: `${accent}14`,
                        border: `1px solid ${accent}29`,
                    }}
                >
                    <Icon size={20} weight="duotone" style={{ color: accent }} />
                </div>
                {hint && (
                    <span className="text-[11px] uppercase"
                        style={{ color: "#94A3B8", fontWeight: 600, letterSpacing: "0.08em" }}>
                        {hint}
                    </span>
                )}
            </div>
            <p className="text-[12px] uppercase mb-2"
                style={{ color: "#475569", fontWeight: 600, letterSpacing: "0.08em" }}>
                {label}
            </p>
            <div className="flex items-baseline gap-2.5">
                {loading ? (
                    <span className="inline-block h-8 sm:h-10 w-20 rounded-md"
                        style={{ background: "#EAF0F6" }} aria-label="Carregando" />
                ) : (
                    <span className="text-[30px] sm:text-[38px] font-bold tabular-nums leading-none"
                        style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                        {value}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Pipeline (real, já existia) ────────────────────────────────────────────

interface PipelineSectionProps {
    stages: { name: string; count: number; value: string; color: string }[];
    total: number;
    loading: boolean;
    onOpen: () => void;
}

function PipelineSection({ stages, total, loading, onOpen }: PipelineSectionProps) {
    return (
        <SectionCard
            title="Pipeline de Oportunidades"
            subtitle={loading ? "Carregando…" : `${total} deals em movimento`}
            action={
                <button
                    onClick={onOpen}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-9 px-3 rounded-lg transition-colors hover:bg-[#F1F5F9]"
                    style={{ color: "#2563EB" }}
                >
                    Ver pipeline
                    <ArrowRight size={12} weight="bold" />
                </button>
            }
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {stages.map((stage) => (
                    <div
                        key={stage.name}
                        className="rounded-xl p-5 transition-all hover:translate-y-[-1px] hover:shadow-sm"
                        style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                    >
                        <div className="flex items-center gap-2 mb-2.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                            <span className="text-[12px]"
                                style={{ color: "#475569", fontWeight: 600, letterSpacing: "0.01em" }}>
                                {stage.name}
                            </span>
                        </div>
                        <p className="text-[30px] sm:text-[34px] font-bold tabular-nums leading-none"
                            style={{ color: "#0B1220", letterSpacing: "-0.028em" }}>
                            {stage.count}
                        </p>
                        <p className="text-[13px] mt-2" style={{ color: "#64748B" }}>
                            {stage.value}
                        </p>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}

// F5C.5 — Pipeline + leitura simples ("Onde está travando")
function PipelineDiagnosticCard({
    stages,
    rawStages,
    total,
    loading,
    onOpen,
}: {
    stages: { name: string; count: number; value: string; color: string }[];
    rawStages: Array<{ name: string; count: number; key: string }>;
    total: number;
    loading: boolean;
    onOpen: () => void;
}) {
    // Identifica o estágio aberto (não won/lost) com maior concentração de deals
    const insight = useMemo(() => {
        if (loading || rawStages.length === 0 || total === 0) return null;
        const openStages = rawStages.filter((s) => s.key !== "closed_won" && s.key !== "closed_lost");
        if (openStages.length === 0) return null;
        const top = [...openStages].sort((a, b) => b.count - a.count)[0];
        if (!top || top.count === 0) return null;
        const pct = Math.round((top.count / total) * 100);
        if (pct < 35) return null; // só destaca se concentração for relevante
        return { name: top.name, count: top.count, pct };
    }, [rawStages, total, loading]);

    return (
        <div className="space-y-3">
            <PipelineSection stages={stages} total={total} loading={loading} onOpen={onOpen} />
            {insight && (
                <div
                    className="rounded-xl px-4 py-3 flex items-start gap-3"
                    style={{
                        background: "rgba(124,58,237,0.04)",
                        border: "1px solid rgba(124,58,237,0.12)",
                    }}
                >
                    <Sparkles size={14} weight="duotone" className="mt-0.5 shrink-0" style={{ color: "#6D28D9" }} />
                    <p className="text-[12.5px] leading-relaxed flex-1" style={{ color: "#475569" }}>
                        <span className="font-semibold" style={{ color: "#0B1220" }}>
                            Leitura da EVA:
                        </span>{" "}
                        {insight.pct}% dos deals abertos estão concentrados em{" "}
                        <strong style={{ color: "#0B1220" }}>{insight.name}</strong> ({insight.count} deals). Vale revisar se algum está parado.
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Daily priorities (F5C.4) ───────────────────────────────────────────────

const PRIORITY_DAILY_TONE: Record<DailyPriority["priority"], { bg: string; color: string; label: string; ring: string }> = {
    critical: { bg: "rgba(220,38,38,0.10)",  color: "#B91C1C", label: "Crítico",  ring: "#DC2626" },
    high:     { bg: "rgba(245,158,11,0.10)", color: "#B45309", label: "Alta",     ring: "#F59E0B" },
    medium:   { bg: "rgba(37,99,235,0.10)",  color: "#1D4ED8", label: "Média",    ring: "#2563EB" },
    low:      { bg: "rgba(148,163,184,0.15)", color: "#64748B", label: "Baixa",   ring: "#94A3B8" },
};

const PRIORITY_DAILY_ICON: Record<DailyPriority["source"], typeof MessageCircle> = {
    conversation: MessageCircle,
    deal:         Target,
    eva:          Sparkles,
    calendar:     Calendar,
};

function DailyPrioritiesSection({
    items,
    loading,
    onNavigate,
}: {
    items: DailyPriority[];
    loading: boolean;
    onNavigate: (href: string) => void;
}) {
    return (
        <SectionCard
            title="Prioridades do dia"
            subtitle={
                loading
                    ? "Carregando…"
                    : items.length === 0
                        ? "Sem prioridades críticas agora."
                        : "Comece por estas ações para não deixar oportunidades esfriarem."
            }
        >
            {loading ? (
                <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl" style={{ background: "#F1F5F9" }} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <EmptyHint
                    icon={Target}
                    title="Tudo em dia"
                    description="Sem prioridades críticas agora. Continue acompanhando as novas conversas."
                />
            ) : (
                <ul className="flex flex-col gap-2.5">
                    {items.map((p, idx) => {
                        const tone = PRIORITY_DAILY_TONE[p.priority];
                        const Icon = PRIORITY_DAILY_ICON[p.source];
                        const clickable = !!p.href;
                        return (
                            <li
                                key={p.id}
                                className={`flex items-start gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                                    clickable ? "cursor-pointer hover:bg-[#F4F7FB]" : ""
                                }`}
                                style={{ border: "1px solid #E2E8F0", background: "#FFFFFF" }}
                                onClick={() => { if (p.href) onNavigate(p.href); }}
                            >
                                <div className="flex flex-col items-center shrink-0 pt-0.5">
                                    <span
                                        className="text-[13px] font-bold tabular-nums w-6 text-center"
                                        style={{ color: tone.color }}
                                    >
                                        {idx + 1}
                                    </span>
                                </div>
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: tone.bg }}>
                                    <Icon size={16} weight="duotone" style={{ color: tone.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span className="text-[14px] font-semibold truncate"
                                            style={{ color: "#0B1220" }}>
                                            {p.title}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                            style={{ background: tone.bg, color: tone.color, fontWeight: 700, letterSpacing: "0.05em" }}>
                                            {tone.label.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-[12.5px] mb-1" style={{ color: "#475569" }}>
                                        {p.description}
                                    </p>
                                    <p className="text-[11px] italic" style={{ color: "#94A3B8" }}>
                                        Por que: {p.reason}
                                    </p>
                                </div>
                                {clickable && (
                                    <span className="inline-flex items-center gap-1 text-[11.5px] shrink-0 mt-1"
                                        style={{ color: "#2563EB", fontWeight: 600 }}>
                                        {p.actionLabel}
                                        <ArrowRight size={12} weight="bold" />
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </SectionCard>
    );
}

// ─── Attention list (real) ──────────────────────────────────────────────────

// F5C.2 — Decide rota + label do CTA por type/conteúdo do item
function resolveAttentionRoute(it: AttentionItem): { href: string | null; cta: string | null } {
    if (it.conversationId) {
        return { href: `/inbox?conversationId=${it.conversationId}`, cta: "Abrir conversa" };
    }
    if (it.dealId) {
        return { href: `/deals/${it.dealId}`, cta: "Ver oportunidade" };
    }
    if (it.type === "knowledge_gap") {
        // F5C.5.2 — CTA mais explícito (era "Resolver contexto")
        return { href: `/configuracoes/eva?tab=conhecimento`, cta: "Completar contexto da EVA" };
    }
    return { href: null, cta: null };
}

function AttentionSection({
    items,
    loading,
    onNavigate,
}: {
    items: AttentionItem[];
    loading: boolean;
    onNavigate: (href: string) => void;
}) {
    // F5C.5.2 — subtítulo enfatiza melhoria da leitura da EVA
    const subtitle = loading
        ? "Carregando…"
        : items.length === 0
            ? "Nenhum ponto crítico de contexto encontrado."
            : `${items.length} ${items.length === 1 ? "ponto" : "pontos"} que podem melhorar a leitura da EVA`;

    return (
        <SectionCard
            title="O que precisa de atenção"
            subtitle={subtitle}
        >
            {loading ? (
                <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl" style={{ background: "#F1F5F9" }} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <EmptyHint
                    icon={MessageSquare}
                    title="Tudo sob controle"
                    description="Nenhum ponto crítico de contexto encontrado. Quando aparecer um lead quente ou conversa parada, vai aparecer aqui."
                />
            ) : (
                <ul className="flex flex-col gap-2">
                    {items.map((it) => {
                        const tone = PRIORITY_TONE[it.priority];
                        const Icon = ATTENTION_ICON[it.type];
                        const route = resolveAttentionRoute(it);
                        const clickable = !!route.href;
                        return (
                            <li
                                key={it.id}
                                className={`flex items-start gap-3 px-3.5 py-3 rounded-xl transition-colors ${
                                    clickable ? "hover:bg-[#F4F7FB] cursor-pointer" : ""
                                }`}
                                onClick={() => { if (route.href) onNavigate(route.href); }}
                            >
                                <div
                                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: tone.bg }}
                                >
                                    <Icon size={16} weight="duotone" style={{ color: tone.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[14px] font-semibold truncate"
                                            style={{ color: "#0B1220" }}>
                                            {it.title}
                                        </span>
                                        <span className="text-[10.5px] px-1.5 py-0.5 rounded shrink-0"
                                            style={{ background: tone.bg, color: tone.color, fontWeight: 700, letterSpacing: "0.04em" }}>
                                            {tone.label}
                                        </span>
                                    </div>
                                    <p className="text-[12.5px] truncate" style={{ color: "#64748B" }}>
                                        {it.description}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {it.createdAt && (
                                        <span className="text-[11px] tabular-nums"
                                            style={{ color: "#94A3B8", fontWeight: 500 }}>
                                            {relativeTime(it.createdAt)}
                                        </span>
                                    )}
                                    {route.cta && (
                                        <span className="inline-flex items-center gap-1 text-[11px]"
                                            style={{ color: "#2563EB", fontWeight: 600 }}>
                                            {route.cta}
                                            <ArrowRight size={12} weight="bold" />
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </SectionCard>
    );
}

// ─── Recent activity (real) ─────────────────────────────────────────────────

function RecentActivitySection({
    items,
    loading,
    onNavigate,
}: {
    items: RecentActivityItem[];
    loading: boolean;
    onNavigate: (href: string) => void;
}) {
    // F5C.5.2 — limita lista a 5 itens (era 12 do hook)
    const visible = useMemo(() => items.slice(0, 5), [items]);

    return (
        <SectionCard
            title="Últimos movimentos"
            subtitle={loading ? "Carregando…" : "Conversas e respostas recentes"}
        >
            {loading ? (
                <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 rounded-lg" style={{ background: "#F1F5F9" }} />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <EmptyHint
                    icon={InboxIcon}
                    title="Sem movimentos recentes"
                    description="Nenhum movimento recente encontrado. Quando chegarem novas mensagens, aparecem aqui."
                />
            ) : (
                <ul className="flex flex-col gap-1">
                    {visible.map((it) => {
                        const clickable = !!it.conversationId;
                        const isOut = it.type === "message_outbound";
                        return (
                            <li
                                key={it.id}
                                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors ${
                                    clickable ? "cursor-pointer hover:bg-[#F4F7FB]" : ""
                                }`}
                                onClick={() => {
                                    if (it.conversationId) onNavigate(`/inbox?conversationId=${it.conversationId}`);
                                }}
                            >
                                <span
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ background: isOut ? "#10B981" : "#2563EB" }}
                                />
                                <p className="flex-1 min-w-0 text-[12.5px] truncate" style={{ color: "#475569" }}>
                                    {describeActivity(it)}
                                </p>
                                <span className="text-[10.5px] tabular-nums shrink-0"
                                    style={{ color: "#94A3B8" }}>
                                    {relativeTime(it.timestamp)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </SectionCard>
    );
}

// ─── EVA highlights (real, derivado de summaries+gaps) ──────────────────────

// F5C.3 — rota por type do highlight. Quando tem conversationId único, deep
// link direto na conversa. Caso contrário, navega pra Inbox/contexto da EVA.
function resolveHighlightRoute(it: EvaHighlight): { href: string | null; cta: string | null } {
    // missing_information → sempre vai pro contexto da EVA
    if (it.type === "missing_information" || it.source === "knowledge_gap") {
        return { href: "/configuracoes/eva?tab=conhecimento", cta: "Resolver contexto" };
    }
    // Highlight com conversa específica → deep link
    if (it.conversationId) {
        return { href: `/inbox?conversationId=${it.conversationId}`, cta: "Abrir conversa" };
    }
    // Tipos que afetam várias conversas → Inbox
    if (
        it.type === "hot_leads_without_deal" ||
        it.type === "meeting_intent_without_meeting" ||
        it.type === "high_intent_unanswered"
    ) {
        return { href: "/inbox", cta: "Abrir Inbox" };
    }
    // Padrões/insights agregados sem destino direto (objection, services)
    return { href: null, cta: null };
}

function EvaHighlightsSection({
    items,
    loading,
    onNavigate,
}: {
    items: EvaHighlight[];
    loading: boolean;
    onNavigate: (href: string) => void;
}) {
    return (
        <SectionCard
            title="Leituras da EVA"
            subtitle={loading ? "Carregando…" : items.length === 0 ? "Sem destaques hoje." : `${items.length} destaque${items.length > 1 ? "s" : ""}`}
        >
            {loading ? (
                <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 rounded-lg" style={{ background: "#F1F5F9" }} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <EmptyHint
                    icon={Sparkles}
                    title="EVA ainda não destacou nada"
                    description="Quando a EVA acumular análises suficientes, ela vai destacar padrões comerciais aqui."
                />
            ) : (
                <ul className="flex flex-col gap-2">
                    {items.map((it) => {
                        const route = resolveHighlightRoute(it);
                        const clickable = !!route.href;
                        const sevTone =
                            it.severity === "high"   ? { dot: "#DC2626", chip: "Alta",  bg: "rgba(220,38,38,0.10)" } :
                            it.severity === "medium" ? { dot: "#B45309", chip: "Média", bg: "rgba(245,158,11,0.10)" } :
                                                       { dot: "#64748B", chip: "Baixa", bg: "rgba(148,163,184,0.12)" };
                        return (
                        <li
                            key={it.id}
                            className={`flex items-start gap-3 px-3.5 py-3 rounded-xl transition-colors ${
                                clickable ? "cursor-pointer hover:brightness-[1.02]" : ""
                            }`}
                            style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.10)" }}
                            onClick={() => { if (route.href) onNavigate(route.href); }}
                        >
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: "rgba(124,58,237,0.10)" }}>
                                <Sparkles size={16} weight="duotone" style={{ color: "#6D28D9" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[13.5px] font-semibold truncate" style={{ color: "#0B1220" }}>
                                        {it.title}
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                        style={{ background: sevTone.bg, color: sevTone.dot, fontWeight: 700, letterSpacing: "0.04em" }}>
                                        <span className="h-1 w-1 rounded-full" style={{ background: sevTone.dot }} />
                                        {sevTone.chip}
                                    </span>
                                </div>
                                <p className="text-[12px] mt-0.5" style={{ color: "#64748B" }}>
                                    {it.description}
                                </p>
                            </div>
                            {route.cta && (
                                <span className="inline-flex items-center gap-1 text-[11px] shrink-0 mt-0.5"
                                    style={{ color: "#6D28D9", fontWeight: 600 }}>
                                    {route.cta}
                                    <ArrowRight size={12} weight="bold" />
                                </span>
                            )}
                        </li>
                        );
                    })}
                </ul>
            )}
        </SectionCard>
    );
}

// ─── Empty hint compacto ────────────────────────────────────────────────────

function EmptyHint({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center text-center py-6 px-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgba(148,163,184,0.12)" }}>
                <Icon size={20} weight="duotone" style={{ color: "#64748B" }} />
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                {title}
            </p>
            <p className="text-[11.5px] max-w-[320px]" style={{ color: "#64748B", lineHeight: 1.5 }}>
                {description}
            </p>
        </div>
    );
}

// ─── F5C.5 — EvaCommandCard (card dominante) ───────────────────────────────
//
// Domina a primeira dobra da Central. Não chama IA; apenas exibe priorities
// já carregadas e oferece um input visual (preview honesto).

// F5C.6 — confiança legível
const CONFIDENCE_LABEL: Record<EvaResponse["confidence"], string> = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
};

function EvaCommandCard({
    priorities,
    loading,
    onNavigate,
    evaInput,
}: {
    priorities: DailyPriority[];
    loading: boolean;
    onNavigate: (href: string) => void;
    evaInput: CentralEvaInput;
}) {
    const [composer, setComposer] = useState("");
    // F5C.6 — assistente determinístico (sem IA): responde com dados já carregados.
    const assistant = useCentralEvaAssistant(evaInput);

    // V1.1 — avatar "pensando" enquanto a EVA lê a operação.
    const isThinking = assistant.state === "loading";

    const critical = priorities[0];
    const secondary = priorities.slice(1, 3);
    const totalPriorities = priorities.length;

    const headline = loading
        ? "Lendo a operação…"
        : isThinking
            ? "Analisando sua operação…"
            : totalPriorities > 0
                ? `Você tem ${totalPriorities} ${totalPriorities === 1 ? "prioridade comercial" : "prioridades comerciais"} para resolver agora.`
                : "Tudo em dia por enquanto.";

    const subtext = isThinking
        ? "Estou cruzando conversas, oportunidades e qualificações…"
        : "Eu li conversas, oportunidades e sinais do pipeline.";

    const handleAsk = (e: React.FormEvent) => {
        e.preventDefault();
        if (!composer.trim() || isThinking) return;
        assistant.ask(composer);
    };

    return (
        <div
            className="rounded-3xl relative overflow-hidden"
            style={{
                background:
                    "linear-gradient(135deg, #FFFFFF 0%, rgba(124,58,237,0.04) 50%, rgba(37,99,235,0.04) 100%)",
                border: "1px solid rgba(148,163,184,0.30)",
                boxShadow:
                    "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -16px rgba(15,23,42,0.10)",
            }}
        >
            {/* Topline lilás → azul */}
            <div
                className="absolute top-0 inset-x-0 h-[2px] pointer-events-none"
                style={{
                    background:
                        "linear-gradient(90deg, transparent, rgba(124,58,237,0.55) 35%, rgba(37,99,235,0.55) 65%, transparent)",
                }}
            />
            {/* Glow lilás canto direito */}
            <div
                className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none hidden sm:block"
                style={{
                    background:
                        "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)",
                }}
                aria-hidden
            />

            <div className="relative z-10 px-6 sm:px-9 pt-7 sm:pt-9 pb-6">
                {/* Header */}
                <div className="flex items-start gap-5 mb-6">
                    <EvaPhotoAvatar size="lg" ring="glow" thinking={isThinking} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                            <h2 className="text-[19px] sm:text-[22px] font-bold tracking-tight"
                                style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                                EVA Comercial
                            </h2>
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase px-2 py-0.5 rounded"
                                style={{
                                    background: "rgba(124,58,237,0.10)",
                                    color: "#6D28D9",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                }}>
                                <Sparkles size={10} weight="duotone" />
                                Prévia
                            </span>
                        </div>
                        <p className="text-[16px] sm:text-[19px] font-semibold leading-snug mb-1"
                            style={{ color: "#0B1220", letterSpacing: "-0.015em" }}>
                            {headline}
                        </p>
                        <p className="text-[13px]" style={{ color: "#475569" }}>
                            {subtext}
                        </p>
                    </div>
                </div>

                {/* Prioridade crítica em destaque */}
                {critical && <CriticalPriorityBlock item={critical} onNavigate={onNavigate} />}

                {/* Prioridades secundárias */}
                {secondary.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                        {secondary.map((p) => (
                            <SecondaryPriorityRow key={p.id} item={p} onNavigate={onNavigate} />
                        ))}
                    </ul>
                )}

                {/* Empty state quando sem prioridades */}
                {!loading && totalPriorities === 0 && (
                    <div className="rounded-xl px-5 py-6 text-center"
                        style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <p className="text-[13px] font-semibold" style={{ color: "#047857" }}>
                            Sem prioridades críticas agora.
                        </p>
                        <p className="text-[11.5px] mt-1" style={{ color: "#64748B" }}>
                            Continuo acompanhando as conversas e te aviso quando aparecer algo urgente.
                        </p>
                    </div>
                )}

                {/* F5C.6 — Pergunte à EVA (funcional, determinístico) */}
                <form onSubmit={handleAsk} className="mt-5 sm:mt-6 relative">
                    <input
                        type="text"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder="Pergunte à EVA sobre sua operação…"
                        disabled={isThinking}
                        className="w-full h-11 pl-4 pr-32 rounded-xl text-[13.5px] outline-none transition-colors disabled:opacity-70"
                        style={{
                            background: "rgba(255,255,255,0.8)",
                            border: "1px solid rgba(148,163,184,0.30)",
                            color: "#0B1220",
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!composer.trim() || isThinking}
                        className="absolute right-1.5 top-1.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #6D28D9, #2563EB)" }}
                    >
                        Perguntar
                        <Send size={12} weight="duotone" />
                    </button>
                </form>

                {/* Chips de comandos sugeridos */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {assistant.commands.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            disabled={isThinking}
                            onClick={() => {
                                setComposer(c.label);
                                assistant.ask(c.label, c.id);
                            }}
                            className="text-[12px] px-3 py-1.5 rounded-full transition-colors hover:bg-white disabled:opacity-50"
                            style={{
                                background: "rgba(255,255,255,0.65)",
                                border: "1px solid rgba(148,163,184,0.30)",
                                color: "#475569",
                                fontWeight: 500,
                            }}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Resposta da EVA — loading / answered / error / out_of_scope */}
                {isThinking && (
                    <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl"
                        style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.14)" }}>
                        <Sparkles size={15} weight="duotone" className="animate-pulse" style={{ color: "#6D28D9" }} />
                        <span className="text-[13px]" style={{ color: "#475569" }}>EVA analisando sua operação…</span>
                    </div>
                )}

                {assistant.state === "answered" && assistant.response && (
                    <EvaAnswerBlock
                        response={assistant.response}
                        onNavigate={onNavigate}
                        onReset={() => {
                            assistant.reset();
                            setComposer("");
                        }}
                    />
                )}

                {assistant.state === "error" && (
                    <EvaStatusRow tone="error" onReset={() => { assistant.reset(); setComposer(""); }}>
                        Não consegui ler sua operação agora. Tente atualizar.
                    </EvaStatusRow>
                )}

                {assistant.state === "out_of_scope" && (
                    <EvaStatusRow tone="neutral" onReset={() => { assistant.reset(); setComposer(""); }}>
                        Consigo te ajudar com conversas, oportunidades, pipeline e prioridades comerciais.
                    </EvaStatusRow>
                )}
            </div>
        </div>
    );
}

// ─── F5C.6 — blocos de resposta da EVA na Central ───────────────────────────

function EvaAnswerBlock({
    response,
    onNavigate,
    onReset,
}: {
    response: EvaResponse;
    onNavigate: (href: string) => void;
    onReset: () => void;
}) {
    return (
        <div className="mt-4 rounded-xl p-4"
            style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.16)" }}>
            <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(124,58,237,0.10)" }}>
                    <Sparkles size={15} weight="duotone" style={{ color: "#6D28D9" }} />
                </div>
                <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#0B1220" }}>
                    {response.answer}
                </p>
            </div>
            {response.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pl-[38px]">
                    {response.actions.map((a) => (
                        <button
                            key={a.href}
                            type="button"
                            onClick={() => onNavigate(a.href)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all hover:brightness-105"
                            style={{ background: "#FFFFFF", border: "1px solid rgba(37,99,235,0.30)", color: "#1D4ED8" }}
                        >
                            {a.label}
                            <ArrowRight size={12} weight="bold" />
                        </button>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between mt-3 pl-[38px]">
                <span className="text-[10px] uppercase"
                    style={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.06em" }}>
                    Confiança: {CONFIDENCE_LABEL[response.confidence]}
                </span>
                <button type="button" onClick={onReset} className="text-[11px] font-semibold" style={{ color: "#6D28D9" }}>
                    Nova pergunta
                </button>
            </div>
        </div>
    );
}

function EvaStatusRow({
    tone,
    children,
    onReset,
}: {
    tone: "error" | "neutral";
    children: React.ReactNode;
    onReset: () => void;
}) {
    const s = tone === "error"
        ? { bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.20)", color: "#B91C1C" }
        : { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)", color: "#475569" };
    return (
        <div className="mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <span className="text-[12.5px]" style={{ color: s.color }}>{children}</span>
            <button type="button" onClick={onReset} className="text-[11px] font-semibold shrink-0" style={{ color: "#6D28D9" }}>
                Voltar
            </button>
        </div>
    );
}

function CriticalPriorityBlock({
    item,
    onNavigate,
}: {
    item: DailyPriority;
    onNavigate: (href: string) => void;
}) {
    const tone = PRIORITY_DAILY_TONE[item.priority];
    return (
        <div
            className="rounded-2xl p-4 sm:p-5"
            style={{
                background: "rgba(220,38,38,0.04)",
                border: "1px solid rgba(220,38,38,0.16)",
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: tone.bg, color: tone.color, letterSpacing: "0.06em" }}>
                    <AlertTriangle size={10} weight="duotone" />
                    Mais urgente
                </span>
                {item.contactName && (
                    <span className="text-[11px] truncate" style={{ color: "#64748B" }}>
                        · {item.contactName}
                    </span>
                )}
            </div>
            <p className="text-[15px] sm:text-[16px] font-semibold mb-1"
                style={{ color: "#0B1220", letterSpacing: "-0.01em" }}>
                {item.title}
            </p>
            <p className="text-[12.5px] mb-3" style={{ color: "#475569", lineHeight: 1.5 }}>
                {item.description}
            </p>
            <p className="text-[11px] italic mb-3" style={{ color: "#94A3B8" }}>
                Por que: {item.reason}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
                {item.href && (
                    <button
                        type="button"
                        onClick={() => onNavigate(item.href!)}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110"
                        style={{
                            background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                            boxShadow: "0 6px 14px -4px rgba(37,99,235,0.40)",
                        }}
                    >
                        {item.actionLabel}
                        <ArrowRight size={12} weight="bold" />
                    </button>
                )}
            </div>
        </div>
    );
}

function SecondaryPriorityRow({
    item,
    onNavigate,
}: {
    item: DailyPriority;
    onNavigate: (href: string) => void;
}) {
    const tone = PRIORITY_DAILY_TONE[item.priority];
    const clickable = !!item.href;
    return (
        <li
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                clickable ? "cursor-pointer hover:bg-[#F8FAFC]" : ""
            }`}
            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(148,163,184,0.18)" }}
            onClick={() => clickable && onNavigate(item.href!)}
        >
            <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: tone.color }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "#0B1220" }}>
                    {item.title}
                </p>
                <p className="text-[11px] truncate" style={{ color: "#64748B" }}>
                    {item.reason}
                </p>
            </div>
            {clickable && (
                <span className="text-[11px] font-semibold shrink-0 inline-flex items-center gap-1"
                    style={{ color: "#2563EB" }}>
                    {item.actionLabel}
                    <ArrowRight size={12} weight="bold" />
                </span>
            )}
        </li>
    );
}

// ─── Main page ──────────────────────────────────────────────────────────────

const Inicio = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();

    // Pipeline real (mantém)
    const { pipeline, totalPipeline } = useInicioData();

    // Central de Comando — métricas reais + listas
    const cc = useCommandCenterData();

    const pipelineStagesForUI = useMemo(
        () =>
            (pipeline.data || []).map((s) => ({
                name: s.name,
                count: s.count,
                value: formatCompactBRL(s.totalValue),
                color: s.color,
            })),
        [pipeline.data],
    );

    const metrics: CommandCenterMetrics | null = cc.metrics;

    // F5C.6 — entrada do assistente da EVA (dados já carregados, read-only)
    const evaInput: CentralEvaInput = useMemo(
        () => ({
            metrics: cc.metrics,
            attentionItems: cc.attentionItems,
            dailyPriorities: cc.dailyPriorities,
            evaHighlights: cc.evaHighlights,
            recentActivity: cc.recentActivity,
            pipelineStages: (pipeline.data || []).map((s) => ({ name: s.name, count: s.count, key: s.key })),
            pipelineTotal: totalPipeline,
            dataError: !!cc.error,
        }),
        [cc.metrics, cc.attentionItems, cc.dailyPriorities, cc.evaHighlights, cc.recentActivity, cc.error, pipeline.data, totalPipeline],
    );

    const kpiCards: KpiCardProps[] = useMemo(() => {
        const safe = (n: number | null | undefined) => (n == null ? "—" : String(n));
        return [
            {
                label: "Conversas ativas",
                value: safe(metrics?.activeConversations),
                icon: MessageCircle,
                hint: "em aberto",
                loading: cc.loading,
                accent: "#2563EB",
            },
            {
                label: "Leads quentes",
                value: safe(metrics?.hotLeads),
                icon: Flame,
                hint: "segundo a EVA",
                loading: cc.loading,
                accent: "#DC2626",
            },
            {
                label: "Aguardando resposta",
                value: safe(metrics?.needsFollowUp),
                icon: Clock,
                hint: "conversas na fila",
                loading: cc.loading,
                accent: "#B45309",
            },
            {
                label: "Oportunidades abertas",
                value: safe(metrics?.opportunitiesOpen),
                icon: Target,
                hint: "no pipeline",
                loading: cc.loading,
                accent: "#10B981",
            },
        ];
    }, [metrics, cc.loading]);

    const firstName = (profile?.nome || "").split(" ")[0] || "";
    const totalAttention = metrics?.needsFollowUp ?? 0;

    return (
        <div className="space-y-6 sm:space-y-8 mx-auto w-full max-w-[1880px] 2xl:px-4">
            {/* Header */}
            <div
                className="rounded-2xl px-7 sm:px-9 py-7 sm:py-9 flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(37,99,235,0.07) 0%, rgba(74,140,232,0.04) 45%, rgba(16,185,129,0.05) 100%)",
                    border: "1px solid rgba(148,163,184,0.26)",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
                }}
            >
                <div
                    className="absolute top-0 inset-x-0 h-px pointer-events-none"
                    style={{
                        background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.35) 30%, rgba(16,185,129,0.30) 70%, transparent)",
                    }}
                />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.05]"
                            style={{ color: "#0B1220", letterSpacing: "-0.028em" }}>
                            Central de Comando
                        </h1>
                        {totalAttention > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase"
                                style={{
                                    background: "rgba(245,158,11,0.14)",
                                    color: "#B45309",
                                    border: "1px solid rgba(245,158,11,0.30)",
                                    letterSpacing: "0.10em",
                                }}>
                                <AlertTriangle size={12} weight="duotone" />
                                {totalAttention} pra agir
                            </span>
                        )}
                    </div>
                    <p className="text-[14.5px] sm:text-[15.5px]" style={{ color: "#475569" }}>
                        Acompanhe conversas, oportunidades e prioridades comerciais em tempo real{firstName ? `, ${firstName}` : ""}.
                    </p>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                    <button
                        onClick={() => void cc.refetch()}
                        disabled={cc.isFetching}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white shrink-0 disabled:opacity-60"
                        style={{
                            background: "rgba(255,255,255,0.85)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid #D9E2EC",
                            color: "#475569",
                        }}
                    >
                        <RefreshCw size={14} weight="duotone" className={cc.isFetching ? "animate-spin" : ""} />
                        Atualizar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white shrink-0"
                        style={{
                            background: "rgba(255,255,255,0.85)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid #D9E2EC",
                            color: "#475569",
                        }}
                    >
                        <Filter size={14} weight="duotone" />
                        Filtros
                        <MoreHorizontal size={14} weight="bold" />
                    </button>
                </div>
            </div>

            {/* F5C.5/F5C.6 — Card EVA dominante + assistente funcional */}
            <EvaCommandCard
                priorities={cc.dailyPriorities}
                loading={cc.loading}
                onNavigate={navigate}
                evaInput={evaInput}
            />

            {/* F5C.5 — Pilar 2: Acompanhar (4 KPIs principais) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {kpiCards.map((kpi) => (
                    <KpiCard key={kpi.label} {...kpi} />
                ))}
            </div>

            {/* F5C.5 — Pilar 3: Onde está travando (Pipeline + leitura simples) */}
            <PipelineDiagnosticCard
                stages={pipelineStagesForUI}
                rawStages={pipeline.data || []}
                total={totalPipeline}
                loading={pipeline.isLoading}
                onOpen={() => navigate("/pipeline")}
            />

            {/* Todas as prioridades (compacta — até 5, já é o cap do hook) */}
            {cc.dailyPriorities.length > 3 && (
                <DailyPrioritiesSection
                    items={cc.dailyPriorities}
                    loading={cc.loading}
                    onNavigate={navigate}
                />
            )}

            {/* Attention + Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-7">
                    <AttentionSection
                        items={cc.attentionItems}
                        loading={cc.loading}
                        onNavigate={navigate}
                    />
                </div>
                <div className="lg:col-span-5">
                    <RecentActivitySection
                        items={cc.recentActivity}
                        loading={cc.loading}
                        onNavigate={navigate}
                    />
                </div>
            </div>

            {/* EVA highlights */}
            <EvaHighlightsSection
                items={cc.evaHighlights}
                loading={cc.loading}
                onNavigate={navigate}
            />

            {/* Error inline */}
            {cc.error && (
                <div className="text-[11.5px] py-3 px-4 rounded-lg"
                    style={{ background: "rgba(220,38,38,0.06)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.20)" }}>
                    Erro ao carregar Central: {cc.error}
                </div>
            )}

            <div className="text-center text-[11.5px] py-4" style={{ color: "#94A3B8" }}>
                Dados em tempo real {cc.lastUpdatedAt ? `· atualizado ${relativeTime(cc.lastUpdatedAt.toISOString())}` : ""}
            </div>
        </div>
    );
};

export default Inicio;
