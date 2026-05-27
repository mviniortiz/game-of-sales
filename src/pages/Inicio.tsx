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
import { DecisionWorkspace } from "@/components/inicio/DecisionWorkspace";

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

// ─── Seções de Atenção / Movimentos / Leituras da EVA: agora vivem em
//     components/inicio/DecisionWorkspace.tsx (COMMAND.UI). ──────────────────

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

                {/* Command bar — botão ícone-only (acento roxo da EVA) */}
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

            {/* COMMAND.UI — Decision workspace: fila de ação + leitura da EVA +
                gargalos + atividade. Substitui as 3 listas planas anteriores. */}
            <DecisionWorkspace
                priorities={cc.dailyPriorities}
                highlights={cc.evaHighlights}
                recentActivity={cc.recentActivity}
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
