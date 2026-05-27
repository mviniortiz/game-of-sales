import { useMemo, useState, Fragment, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// F5C.5.3 — Phosphor duotone (mesmo set da sidebar e do pipeline /pipeline).
// Alias mantém os mesmos nomes locais (AlertTriangle, ArrowRight, …) pra não
// reescrever cada call site — só adicionei weight="duotone" no JSX.
import {
    Warning as AlertTriangle,
    ArrowRight,
    ArrowUp,
    CaretRight as ChevronRight,
    CalendarBlank as Calendar,
    CircleNotch,
    Clock,
    Funnel as Filter,
    FireSimple as Flame,
    Tray as InboxIcon,
    ChatCircle as MessageCircle,
    ChatText as MessageSquare,
    DotsThree as MoreHorizontal,
    ArrowsClockwise as RefreshCw,
    Sparkle as Sparkles,
    Plus,
    Target,
} from "@phosphor-icons/react";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { useInicioData, PIPELINE_STAGE_KEYS, type PipelineStageData } from "@/hooks/useInicioData";
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

// ─── Panorama do Pipeline (COMMAND.UI.1) ────────────────────────────────────
// Síntese executiva e acionável: fluxo de etapas conectado + uma etapa em foco
// + leitura da EVA, tudo num card único. Operacional (não analítico como
// Performance). Sem kanban, donut ou funil. Dados reais (usePipelineStages).

// Próximo passo recomendado por etapa em foco (movimenta o funil pra frente).
const STAGE_NEXT_REC: Record<string, string> = {
    lead: "qualificar esses leads para destravar o funil",
    qualification: "revisar oportunidades paradas e avançar para proposta",
    proposal: "acompanhar as propostas enviadas e abrir negociação",
    negotiation: "priorizar o fechamento das negociações em aberto",
};

// Célula de uma etapa no fluxo. Peso = barra discreta proporcional ao count.
function StageCell({
    name,
    count,
    value,
    color,
    weightPct,
    focus,
    won,
}: {
    name: string;
    count: number;
    value: string;
    color: string;
    weightPct: number;
    focus: boolean;
    won: boolean;
}) {
    return (
        <div
            className="flex-1 min-w-0 rounded-xl px-3.5 py-3.5 border transition-colors"
            style={
                focus
                    ? { background: "#EFF6FF", border: "1px solid rgba(37,99,235,0.35)" }
                    : { background: "#F8FAFC", border: "1px solid #E2E8F0" }
            }
        >
            <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] font-semibold truncate" style={{ color: "#475569", letterSpacing: "0.01em" }}>
                    {name}
                </span>
            </div>
            <p className="text-[22px] sm:text-[24px] font-bold tabular-nums leading-none" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                {count}
            </p>
            <p className="text-[11.5px] mt-1" style={{ color: "#64748B" }}>{value}</p>
            <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(count > 0 ? 6 : 0, weightPct)}%`, background: won ? "#10B981" : focus ? "#2563EB" : "#94A3B8" }}
                />
            </div>
        </div>
    );
}

function PipelineFlowSkeleton() {
    return (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-xl px-3.5 py-3.5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div className="h-2.5 w-16 rounded mb-3" style={{ background: "#EAF0F6" }} />
                    <div className="h-6 w-10 rounded mb-2" style={{ background: "#EAF0F6" }} />
                    <div className="h-2.5 w-12 rounded" style={{ background: "#EAF0F6" }} />
                </div>
            ))}
        </div>
    );
}

function PipelinePanoramaCard({
    rawStages,
    total,
    loading,
    onOpen,
}: {
    rawStages: PipelineStageData[];
    total: number;
    loading: boolean;
    onOpen: () => void;
}) {
    const view = useMemo(() => {
        const openStages = rawStages.filter((s) => s.key !== "closed_won");
        const won = rawStages.find((s) => s.key === "closed_won") ?? null;
        const openCount = openStages.reduce((a, s) => a + s.count, 0);
        const openValue = openStages.reduce((a, s) => a + s.totalValue, 0);
        const maxCount = Math.max(1, ...rawStages.map((s) => s.count));

        // Etapa em foco (determinística): maior count → maior valor → mais cedo no funil.
        let focusKey: string | null = null;
        if (openCount > 0) {
            const ranked = [...openStages].sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
                return PIPELINE_STAGE_KEYS.indexOf(a.key) - PIPELINE_STAGE_KEYS.indexOf(b.key);
            });
            focusKey = ranked[0] && ranked[0].count > 0 ? ranked[0].key : null;
        }
        const focusStage = focusKey ? openStages.find((s) => s.key === focusKey) ?? null : null;
        const focusPct = focusStage && openCount > 0 ? Math.round((focusStage.count / openCount) * 100) : 0;

        return { won, openCount, openValue, maxCount, focusKey, focusStage, focusPct };
    }, [rawStages]);

    const wonValue = view.won?.totalValue ?? 0;
    const wonStr = formatCompactBRL(wonValue);
    const isEmpty = !loading && total === 0;

    const subtitle = loading
        ? "Carregando…"
        : `${view.openCount} ${view.openCount === 1 ? "oportunidade" : "oportunidades"} em movimento · ${formatCompactBRL(view.openValue)} em aberto`;

    // Leitura da EVA — integrada, acionável.
    const wonClause = wonValue > 0
        ? <> Ganho registrado: <strong style={{ color: "#0B1220" }}>{wonStr}</strong>.</>
        : null;
    const focusStage = view.focusStage;
    let evaBody: ReactNode;
    if (view.openCount === 0) {
        evaBody = <>Nenhuma oportunidade em aberto no momento.{wonClause}</>;
    } else if (view.openCount === 1 || !focusStage) {
        evaBody = <>Histórico ainda inicial. Acompanhe o avanço entre etapas nos próximos dias.{wonClause}</>;
    } else {
        const rec = STAGE_NEXT_REC[focusStage.key] ?? "revisar as oportunidades paradas";
        evaBody = (
            <>
                <strong style={{ color: "#0B1220" }}>{view.focusPct}%</strong> dos deals abertos estão em{" "}
                <strong style={{ color: "#0B1220" }}>{focusStage.name}</strong>. Recomendação: {rec}.{wonClause}
            </>
        );
    }

    return (
        <SectionCard
            title="Panorama do Pipeline"
            subtitle={subtitle}
            action={
                isEmpty ? undefined : (
                    <button
                        onClick={onOpen}
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-9 px-3 rounded-lg transition-colors hover:bg-[#F1F5F9]"
                        style={{ color: "#2563EB" }}
                    >
                        Ver pipeline
                        <ArrowRight size={12} weight="bold" />
                    </button>
                )
            }
        >
            {loading ? (
                <PipelineFlowSkeleton />
            ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-3">
                    <p className="text-[13.5px]" style={{ color: "#475569" }}>Ainda não há oportunidades em movimento.</p>
                    <button
                        onClick={onOpen}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-colors hover:opacity-90"
                        style={{ background: "#2563EB" }}
                    >
                        <Plus size={13} weight="bold" /> Criar oportunidade
                    </button>
                </div>
            ) : (
                <>
                    {/* Fluxo horizontal conectado: Novo lead → … → Ganho */}
                    <div className="flex flex-col sm:flex-row sm:items-stretch">
                        {rawStages.map((s, i) => (
                            <Fragment key={s.key}>
                                <StageCell
                                    name={s.name}
                                    count={s.count}
                                    value={formatCompactBRL(s.totalValue)}
                                    color={s.color}
                                    weightPct={Math.round((s.count / view.maxCount) * 100)}
                                    focus={s.key === view.focusKey}
                                    won={s.key === "closed_won"}
                                />
                                {i < rawStages.length - 1 && (
                                    <div className="flex items-center justify-center shrink-0 py-1 sm:py-0 sm:px-0.5">
                                        <ChevronRight size={14} weight="bold" className="rotate-90 sm:rotate-0" style={{ color: "#CBD5E1" }} />
                                    </div>
                                )}
                            </Fragment>
                        ))}
                    </div>

                    {/* Leitura da EVA — integrada ao card */}
                    <div
                        className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5"
                        style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.12)" }}
                    >
                        <span
                            className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-px leading-none"
                            style={{ background: "#7C3AED" }}
                        >
                            E
                        </span>
                        <p className="text-[12.5px] leading-relaxed flex-1" style={{ color: "#475569" }}>
                            <span className="font-semibold" style={{ color: "#0B1220" }}>Leitura da EVA:</span> {evaBody}
                        </p>
                    </div>
                </>
            )}
        </SectionCard>
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
    gapsCount,
    loading,
    onNavigate,
    evaInput,
}: {
    priorities: DailyPriority[];
    gapsCount: number;
    loading: boolean;
    onNavigate: (href: string) => void;
    evaInput: CentralEvaInput;
}) {
    const [composer, setComposer] = useState("");
    const [showAllCommands, setShowAllCommands] = useState(false);
    // F5C.6 — assistente determinístico (sem IA): responde com dados já carregados.
    const assistant = useCentralEvaAssistant(evaInput);

    // V1.1 — avatar "pensando" enquanto a EVA lê a operação.
    const isThinking = assistant.state === "loading";

    const critical = priorities[0];
    const secondary = priorities.slice(1, 3);
    const total = priorities.length;
    const criticalCount = priorities.filter((p) => p.priority === "critical").length;

    // Linha-resumo (leitura em 5s): quantas, quantas críticas, quantas lacunas.
    const summaryParts: ReactNode[] = [];
    if (loading || isThinking) {
        summaryParts.push("Lendo a operação…");
    } else if (total === 0) {
        summaryParts.push("Nenhuma prioridade crítica agora");
    } else {
        summaryParts.push(`${total} ${total === 1 ? "prioridade detectada" : "prioridades detectadas"}`);
        if (criticalCount > 0) summaryParts.push(<span style={{ color: "#BE123C", fontWeight: 600 }}>{criticalCount} {criticalCount === 1 ? "crítica" : "críticas"}</span>);
        if (gapsCount > 0) summaryParts.push(<span style={{ color: "#475569", fontWeight: 600 }}>{gapsCount} {gapsCount === 1 ? "lacuna de contexto" : "lacunas de contexto"}</span>);
    }

    const handleAsk = (e: React.FormEvent) => {
        e.preventDefault();
        if (!composer.trim() || isThinking) return;
        assistant.ask(composer);
    };

    const visibleCommands = showAllCommands ? assistant.commands : assistant.commands.slice(0, 4);
    const hasMore = assistant.commands.length > 4;

    return (
        <div
            className="rounded-2xl"
            style={{
                background: "linear-gradient(180deg, rgba(124,58,237,0.022) 0%, #FFFFFF 30%)",
                border: "1px solid #E4E9F2",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            <div className="px-5 sm:px-7 pt-6 pb-6">
                {/* 1. Header compacto */}
                <div className="flex items-start gap-3.5 mb-5">
                    <EvaPhotoAvatar size="md" ring="glow" thinking={isThinking} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h2 className="text-[16px] sm:text-[17px] font-bold tracking-tight"
                                style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                                EVA Comercial
                            </h2>
                            <span className="inline-flex items-center text-[9.5px] uppercase px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(124,58,237,0.10)", color: "#6D28D9", fontWeight: 700, letterSpacing: "0.08em" }}>
                                Prévia
                            </span>
                        </div>
                        <p className="text-[14px] sm:text-[15px] font-semibold leading-snug"
                            style={{ color: "#0B1220", letterSpacing: "-0.01em" }}>
                            {summaryParts.map((part, i) => (
                                <Fragment key={i}>
                                    {i > 0 && <span style={{ color: "#CBD5E1" }}> · </span>}
                                    {part}
                                </Fragment>
                            ))}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: "#64748B" }}>
                            A EVA leu conversas, oportunidades e sinais da operação.
                        </p>
                    </div>
                </div>

                {/* 2. Prioridades em grid (principal + 2 secundárias) */}
                {!loading && total === 0 ? (
                    <div className="rounded-xl px-5 py-5 text-center"
                        style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <p className="text-[13px] font-semibold" style={{ color: "#047857" }}>Sem prioridades críticas agora.</p>
                        <p className="text-[11.5px] mt-1" style={{ color: "#64748B" }}>
                            Continuo acompanhando as conversas e te aviso quando aparecer algo urgente.
                        </p>
                    </div>
                ) : critical ? (
                    <div className={`grid gap-3 ${secondary.length > 0 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                        <PrimaryPriorityCard item={critical} onNavigate={onNavigate} />
                        {secondary.length > 0 && (
                            <div className="flex flex-col gap-3">
                                {secondary.map((p) => (
                                    <SecondaryPriorityCard key={p.id} item={p} onNavigate={onNavigate} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-2xl h-36" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
                        <div className="flex flex-col gap-3">
                            <div className="rounded-xl flex-1 min-h-[64px]" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
                            <div className="rounded-xl flex-1 min-h-[64px]" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
                        </div>
                    </div>
                )}

                {/* 3. Command bar — botão ícone-only (acento roxo da EVA) */}
                <form onSubmit={handleAsk} className="mt-5 relative">
                    <input
                        type="text"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder="Pergunte à EVA sobre a operação, pipeline ou conversas"
                        disabled={isThinking}
                        className="w-full h-11 pl-4 pr-14 rounded-xl text-[13px] outline-none transition-all focus:border-[#7C3AED]/40 disabled:opacity-70"
                        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0B1220" }}
                    />
                    <button
                        type="submit"
                        disabled={!composer.trim() || isThinking}
                        aria-label="Perguntar à EVA"
                        className={`eva-send-btn absolute right-1.5 top-1.5 inline-flex items-center justify-center h-8 w-8 rounded-full text-white disabled:opacity-40 disabled:shadow-none ${composer.trim() && !isThinking ? "eva-send-idle" : ""}`}
                        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" }}
                    >
                        {isThinking
                            ? <CircleNotch size={15} weight="bold" className="animate-spin" />
                            : <ArrowUp size={15} weight="bold" />}
                    </button>
                </form>

                {/* Chips: no máximo 4 + "Mais ações" */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {visibleCommands.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            disabled={isThinking}
                            onClick={() => {
                                setComposer(c.label);
                                assistant.ask(c.label, c.id);
                            }}
                            className="text-[12px] px-3 py-1.5 rounded-full transition-colors hover:bg-[#F1F5F9] disabled:opacity-50"
                            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#475569", fontWeight: 500 }}
                        >
                            {c.label}
                        </button>
                    ))}
                    {hasMore && !showAllCommands && (
                        <button
                            type="button"
                            onClick={() => setShowAllCommands(true)}
                            className="inline-flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-full transition-colors hover:brightness-105"
                            style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", color: "#6D28D9", fontWeight: 600 }}
                        >
                            Mais ações
                            <MoreHorizontal size={13} weight="bold" />
                        </button>
                    )}
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

// Card principal: fundo branco + acento na borda esquerda (sem chapado).
// Coral = urgência real; âmbar/azul/cinza pros demais níveis.
const PRIMARY_TONE: Record<DailyPriority["priority"], { accent: string; chipBg: string; chipColor: string; label: string }> = {
    critical: { accent: "#F43F5E", chipBg: "rgba(244,63,94,0.10)",   chipColor: "#BE123C", label: "Mais urgente" },
    high:     { accent: "#F59E0B", chipBg: "rgba(245,158,11,0.12)",  chipColor: "#B45309", label: "Prioridade alta" },
    medium:   { accent: "#2563EB", chipBg: "rgba(37,99,235,0.10)",   chipColor: "#1D4ED8", label: "Atenção" },
    low:      { accent: "#94A3B8", chipBg: "rgba(148,163,184,0.15)", chipColor: "#64748B", label: "Acompanhar" },
};

function PrimaryPriorityCard({
    item,
    onNavigate,
}: {
    item: DailyPriority;
    onNavigate: (href: string) => void;
}) {
    const tone = PRIMARY_TONE[item.priority];
    return (
        <div
            className="rounded-2xl p-4 sm:p-5 flex flex-col"
            style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderLeft: `3px solid ${tone.accent}`,
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            }}
        >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: tone.chipBg, color: tone.chipColor, letterSpacing: "0.06em" }}>
                    <AlertTriangle size={10} weight="duotone" />
                    {tone.label}
                </span>
                {item.contactName && (
                    <span className="text-[11px] truncate" style={{ color: "#64748B" }}>· {item.contactName}</span>
                )}
            </div>
            <p className="text-[15px] sm:text-[16px] font-semibold mb-1"
                style={{ color: "#0B1220", letterSpacing: "-0.01em" }}>
                {item.title}
            </p>
            <p className="text-[12.5px]" style={{ color: "#475569", lineHeight: 1.5 }}>
                {item.description}
            </p>
            <p className="text-[11px] mt-2" style={{ color: "#94A3B8" }}>
                <span style={{ fontWeight: 600 }}>Por que:</span> {item.reason}
            </p>
            {item.href && (
                <div className="mt-auto pt-4">
                    <button
                        type="button"
                        onClick={() => onNavigate(item.href!)}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110"
                        style={{ background: "#2563EB", boxShadow: "0 6px 14px -6px rgba(37,99,235,0.45)" }}
                    >
                        {item.actionLabel}
                        <ArrowRight size={12} weight="bold" />
                    </button>
                </div>
            )}
        </div>
    );
}

function SecondaryPriorityCard({
    item,
    onNavigate,
}: {
    item: DailyPriority;
    onNavigate: (href: string) => void;
}) {
    const tone = PRIORITY_DAILY_TONE[item.priority];
    const clickable = !!item.href;
    return (
        <div
            className={`flex-1 min-h-[64px] rounded-xl p-3.5 flex flex-col justify-center transition-colors ${
                clickable ? "cursor-pointer hover:bg-[#F8FAFC]" : ""
            }`}
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
            onClick={() => clickable && onNavigate(item.href!)}
        >
            <div className="flex items-center gap-2 mb-1">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                <p className="text-[12.5px] font-semibold truncate" style={{ color: "#0B1220" }}>{item.title}</p>
            </div>
            <p className="text-[11px] truncate" style={{ color: "#64748B" }}>{item.reason}</p>
            {clickable && (
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold self-start"
                    style={{ color: "#2563EB" }}>
                    {item.actionLabel}
                    <ArrowRight size={11} weight="bold" />
                </span>
            )}
        </div>
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

    const metrics: CommandCenterMetrics | null = cc.metrics;

    // Lacunas de contexto detectadas (dado já carregado, só leitura) — alimenta a
    // linha-resumo da EVA. Max evita dupla contagem entre as duas fontes.
    const gapsCount = useMemo(() => {
        const fromHighlights = cc.evaHighlights.filter((h) => h.source === "knowledge_gap" || h.type === "missing_information").length;
        const fromAttention = cc.attentionItems.filter((a) => a.type === "knowledge_gap").length;
        return Math.max(fromHighlights, fromAttention);
    }, [cc.evaHighlights, cc.attentionItems]);

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
                gapsCount={gapsCount}
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

            {/* COMMAND.UI.1 — Panorama do Pipeline (fluxo + foco + leitura da EVA) */}
            <PipelinePanoramaCard
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
