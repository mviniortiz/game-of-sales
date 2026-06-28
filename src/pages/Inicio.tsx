import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { recordMetricSnapshot, getMetricTrend, type MetricTrend } from "@/lib/metricHistory";
// F5C.5.3 — Phosphor duotone (mesmo set da sidebar e do pipeline /pipeline).
// Alias mantém os mesmos nomes locais (AlertTriangle, ArrowRight, …) pra não
// reescrever cada call site — só adicionei weight="duotone" no JSX.
import {
    Warning as AlertTriangle,
    ArrowRight,
    ArrowUp,
    CaretRight as ChevronRight,
    CaretDown as ChevronDown,
    CalendarBlank as Calendar,
    Check,
    CheckCircle,
    CircleNotch,
    Clock,
    SlidersHorizontal as Filter,
    FireSimple as Flame,
    ChatCircle as MessageCircle,
    DotsThree as MoreHorizontal,
    ArrowClockwise as RefreshCw,
    Question,
    Target,
    X,
} from "@phosphor-icons/react";
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
import { useTypewriter } from "@/hooks/useTypewriter";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { DecisionWorkspace } from "@/components/inicio/DecisionWorkspace";
import { useEvolutionSender } from "@/hooks/useEvolutionSender";
import {
    loadLiveActions,
    resolvePriority,
    snoozePriority,
    startOfTomorrowIso,
    isResolved,
    isSnoozed,
    type PriorityActionState,
} from "@/lib/priorityActions";

// ─────────────────────────────────────────────────────────────────────────────
// Central de Comando — F5C.1 (2026-05-20)
//
// Dados reais via useCommandCenterData (channel_*/deals/summaries/gaps) +
// useInicioData (pipeline real). Sem mocks de métrica. Sem mutation. Sem
// chamada à EVA/Evolution/Meta.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helpers visuais ────────────────────────────────────────────────────────

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
    low:    { bg: "rgba(148,163,184,0.15)", color: "#475569", label: "Baixa" },
};

const ATTENTION_ICON: Record<AttentionItem["type"], typeof MessageCircle> = {
    unread_conversation: MessageCircle,
    hot_lead_waiting:    Flame,
    stale_conversation:  Clock,
    stale_deal:          Target,
    knowledge_gap:       Question,
};

// ─── Building blocks ────────────────────────────────────────────────────────

// COMMAND.UI.2 — faixa densa de KPIs (substitui os 4 cards gigantes).
// Glance bar: número + label, clicável (leva ao filtro/seção). Trend + sparkline
// só quando há histórico real (≥2 dias via metricHistory); sem isso, nada renderiza.
interface KpiStripItem {
    label: string;
    value: string;
    icon: typeof MessageCircle;
    accent: string;
    href: string;
    metricKey: string;
    /** true = subir é bom (conversas/leads/oportunidades); false = subir é ruim (aguardando). */
    goodWhenUp: boolean;
    loading?: boolean;
}

// Sparkline minúscula a partir do histórico real (≥2 dias). Sem dado → não renderiza.
function Sparkline({ series, color }: { series: number[]; color: string }) {
    if (series.length < 2) return null;
    const w = 46, h = 16;
    const min = Math.min(...series), max = Math.max(...series);
    const span = max - min || 1;
    const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / span) * (h - 2) - 1}`).join(" ");
    return (
        <svg width={w} height={h} aria-hidden className="shrink-0">
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        </svg>
    );
}

function KpiStrip({ items, trends, onNavigate }: { items: KpiStripItem[]; trends: Record<string, MetricTrend>; onNavigate: (href: string) => void }) {
    return (
        <div
            className="rounded-2xl overflow-hidden grid grid-cols-2 sm:grid-cols-4 gap-px"
            style={{
                background: "#D9E2EC",
                border: "1px solid #D9E2EC",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}
        >
            {items.map((it) => {
                const Icon = it.icon;
                const t = trends[it.metricKey];
                const delta = t?.delta ?? null;
                const improving = delta != null && delta !== 0 && ((delta > 0) === it.goodWhenUp);
                const deltaColor = delta == null || delta === 0 ? "#475569" : improving ? "#047857" : "#B91C1C";
                // Sparkline neutro = cinza (não azul, que = ação). Só ganha cor
                // quando há tom real: verde (melhorando) / vermelho (piorando).
                const sparkColor = delta == null || delta === 0 ? "#94A3B8" : improving ? "#047857" : "#B91C1C";
                return (
                    <button
                        key={it.label}
                        type="button"
                        onClick={() => onNavigate(it.href)}
                        className="min-w-0 flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left transition-all hover:brightness-[0.97]"
                        style={{ background: "#FFFFFF" }}
                        aria-label={`${it.label}: ${it.value}`}
                    >
                        <span
                            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${it.accent}1F`, border: `1px solid ${it.accent}3D` }}
                        >
                            <Icon size={17} weight="duotone" style={{ color: it.accent }} />
                        </span>
                        <div className="min-w-0 flex-1">
                            {it.loading ? (
                                <span className="inline-block h-6 w-12 rounded" style={{ background: "#EAF0F6" }} aria-label="Carregando" />
                            ) : (
                                <div className="flex items-baseline gap-1.5">
                                    <p className="text-[24px] sm:text-[26px] font-bold tabular-nums leading-none" style={{ color: "#0B1220", letterSpacing: "-0.03em" }}>
                                        {it.value}
                                    </p>
                                    {delta != null && delta !== 0 && (
                                        <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color: deltaColor }} title="vs. dia anterior">
                                            {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
                                        </span>
                                    )}
                                    {delta === 0 && (
                                        <span className="text-[10.5px] font-semibold leading-none" style={{ color: "#475569" }} title="sem mudança vs. dia anterior">
                                            estável
                                        </span>
                                    )}
                                </div>
                            )}
                            <p className="text-[11px] uppercase mt-1.5 truncate" style={{ color: "#1E293B", fontWeight: 600, letterSpacing: "0.06em" }}>
                                {it.label}
                            </p>
                        </div>
                        {!it.loading && <Sparkline series={t?.series ?? []} color={sparkColor} />}
                        <ChevronRight size={14} weight="bold" className="shrink-0" style={{ color: "#64748B" }} />
                    </button>
                );
            })}
        </div>
    );
}

// ─── Pipeline removido de /inicio (COMMAND.UI.6) ────────────────────────────
// O funil é view analítica e vive em /pipeline (linkado pelo KPI "Oportunidades
// abertas"); deal parado já vira item da fila. Tirado daqui pra não competir
// com o plano do dia. O dado do pipeline segue alimentando o cérebro da EVA
// (evaInput.pipelineStages), só não tem mais card próprio.

// ─── Seções de Atenção / Movimentos / Leituras da EVA: agora vivem em
//     components/inicio/DecisionWorkspace.tsx (COMMAND.UI). ──────────────────

// ─── EvaChat — o chat da EVA, renderizado dentro do território unificado ─────
// (EvaPanel, à direita). Sem card próprio: a identidade é do painel. Não chama
// IA externa; responde com dados já carregados via useCentralEvaAssistant.

// F5C.6 — confiança legível
const CONFIDENCE_LABEL: Record<EvaResponse["confidence"], string> = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
};

// EvaChat — só o chat (composer + chips + resposta). Vive DENTRO do território
// unificado da EVA (EvaPanel), por isso não tem card/avatar/narração próprios:
// a identidade já é dada pelo painel. Antes era um 2º card "EVA Comercial".
function EvaChat({ evaInput, onNavigate }: { evaInput: CentralEvaInput; onNavigate: (href: string) => void }) {
    const [composer, setComposer] = useState("");
    const [showAllCommands, setShowAllCommands] = useState(false);
    const assistant = useCentralEvaAssistant(evaInput);
    const isThinking = assistant.state === "loading";

    const handleAsk = (e: React.FormEvent) => {
        e.preventDefault();
        if (!composer.trim() || isThinking) return;
        assistant.ask(composer);
    };

    const visibleCommands = showAllCommands ? assistant.commands : assistant.commands.slice(0, 4);
    const hasMore = assistant.commands.length > 4;

    return (
        <div>
            <p className="text-[10px] uppercase mb-2" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>
                Pergunte à EVA
            </p>
            <form onSubmit={handleAsk} className="relative">
                <input
                    type="text"
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Pergunte sobre operação, pipeline ou conversas"
                    disabled={isThinking}
                    className="w-full h-11 pl-4 pr-14 rounded-xl text-[13px] outline-none transition-all focus:border-[#2563EB]/40 disabled:opacity-70"
                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#0B1220" }}
                />
                <button
                    type="submit"
                    disabled={!composer.trim() || isThinking}
                    aria-label="Perguntar à EVA"
                    className={`eva-send-btn absolute right-1.5 top-1.5 inline-flex items-center justify-center h-8 w-8 rounded-full text-white disabled:opacity-40 disabled:shadow-none ${composer.trim() && !isThinking ? "eva-send-idle" : ""}`}
                    style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
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
                        style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.18)", color: "#1D4ED8", fontWeight: 600 }}
                    >
                        Mais ações
                        <MoreHorizontal size={13} weight="bold" />
                    </button>
                )}
            </div>

            {/* Resposta da EVA — loading / answered / error / out_of_scope */}
            {isThinking && (
                <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl eva-think-in"
                    style={{ background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.14)" }}>
                    <EvaOrb variant="blue" state="analyzing" size={24} showVoice={false} className="shrink-0" />
                    <span className="text-[13px]" style={{ color: "#475569" }}>
                        EVA lendo sua operação<span className="eva-dots" aria-hidden="true" />
                    </span>
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

            <style>{`
                @keyframes evaBlink { 0%,100%{opacity:1} 50%{opacity:0} }
                .eva-caret { display:inline-block; margin-left:1px; color:#1D4ED8; animation: evaBlink 0.9s steps(1) infinite; }
                @keyframes evaOrbPulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.14);opacity:1} }
                .eva-orb-pulse { animation: evaOrbPulse 1.1s ease-in-out infinite; }
                @keyframes evaThinkIn { from{opacity:0; transform:translateY(4px)} to{opacity:1; transform:none} }
                .eva-think-in { animation: evaThinkIn 0.28s ease-out both; }
                .eva-reveal { animation: evaThinkIn 0.32s ease-out both; }
                .eva-dots::after { content:""; animation: evaDots 1.3s steps(1,end) infinite; }
                @keyframes evaDots { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} 100%{content:""} }
                @media (prefers-reduced-motion: reduce) {
                    .eva-caret, .eva-orb-pulse, .eva-think-in, .eva-reveal, .eva-dots::after { animation: none !important; }
                    .eva-caret { display:none; }
                }
            `}</style>
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
    const { displayed, done } = useTypewriter(response.answer);
    return (
        <div className="mt-4 rounded-xl p-4 eva-think-in"
            style={{ background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.16)" }}>
            <div className="flex items-start gap-2.5">
                <EvaOrb variant="blue" size={28} showVoice={false} state={done ? "idle" : "analyzing"} className="shrink-0" />
                <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#0B1220" }}>
                    {displayed}
                    {!done && <span className="eva-caret" aria-hidden="true">▍</span>}
                </p>
            </div>
            {done && response.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pl-[38px] eva-reveal">
                    {response.actions.map((a) => (
                        <button
                            key={a.href}
                            type="button"
                            onClick={() => onNavigate(a.href)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all hover:brightness-105"
                            style={{ background: "#FFFFFF", border: "1px solid rgba(37,99,235,0.28)", color: "#1D4ED8" }}
                        >
                            {a.label}
                            <ArrowRight size={12} weight="bold" />
                        </button>
                    ))}
                </div>
            )}
            {done && (
                <div className="flex items-center justify-between mt-3 pl-[38px] eva-reveal">
                    <span className="text-[10px] uppercase"
                        style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>
                        Confiança: {CONFIDENCE_LABEL[response.confidence]}
                    </span>
                    <button type="button" onClick={onReset} className="text-[11px] font-semibold" style={{ color: "#1D4ED8" }}>
                        Nova pergunta
                    </button>
                </div>
            )}
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
            <button type="button" onClick={onReset} className="text-[11px] font-semibold shrink-0" style={{ color: "#1D4ED8" }}>
                Voltar
            </button>
        </div>
    );
}

// ─── Filtros da Fila de ação ────────────────────────────────────────────────
// Popover client-side: filtra dailyPriorities por nível e origem. Sem query
// nova — opera sobre dados já carregados (read-only da Central).

type PriorityLevel = DailyPriority["priority"];
type PrioritySource = DailyPriority["source"];

const LEVEL_OPTIONS: { key: PriorityLevel; label: string; color: string }[] = [
    { key: "critical", label: "Crítico", color: "#BE123C" },
    { key: "high",     label: "Alto",    color: "#B45309" },
    { key: "medium",   label: "Médio",   color: "#1D4ED8" },
    { key: "low",      label: "Baixo",   color: "#475569" },
];

// Só as origens que o gerador de prioridades realmente produz (sem "calendar").
const SOURCE_OPTIONS: { key: PrioritySource; label: string }[] = [
    { key: "conversation", label: "Conversa" },
    { key: "deal",         label: "Oportunidade" },
    { key: "eva",          label: "Insight da EVA" },
];

export interface CentralFilters {
    levels: Set<PriorityLevel>;
    sources: Set<PrioritySource>;
}

function FilterCheckRow({
    label,
    dot,
    checked,
    onToggle,
}: {
    label: string;
    dot?: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[#F1F5F9]"
        >
            <span
                className="h-[18px] w-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-colors"
                style={{
                    background: checked ? "#2563EB" : "#FFFFFF",
                    border: `1.5px solid ${checked ? "#2563EB" : "#CBD5E1"}`,
                }}
            >
                {checked && <Check size={12} weight="bold" style={{ color: "#FFFFFF" }} />}
            </span>
            {dot && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />}
            <span className="text-[13px]" style={{ color: "#334155", fontWeight: 500 }}>{label}</span>
        </button>
    );
}

function FilterMenu({
    filters,
    onChange,
    activeCount,
}: {
    filters: CentralFilters;
    onChange: (next: CentralFilters) => void;
    activeCount: number;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const toggleLevel = (k: PriorityLevel) => {
        const next = new Set(filters.levels);
        if (next.has(k)) next.delete(k); else next.add(k);
        onChange({ ...filters, levels: next });
    };
    const toggleSource = (k: PrioritySource) => {
        const next = new Set(filters.sources);
        if (next.has(k)) next.delete(k); else next.add(k);
        onChange({ ...filters, sources: next });
    };
    const clear = () => onChange({ levels: new Set(), sources: new Set() });

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="true"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white shrink-0"
                style={{
                    background: activeCount > 0 ? "#FFFFFF" : "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: `1px solid ${activeCount > 0 ? "#BFD3F2" : "#D9E2EC"}`,
                    color: "#475569",
                }}
            >
                <Filter size={14} weight="duotone" style={{ color: activeCount > 0 ? "#2563EB" : "#475569" }} />
                Filtros
                {activeCount > 0 && (
                    <span
                        className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[11px] font-bold tabular-nums text-white"
                        style={{ background: "#2563EB" }}
                    >
                        {activeCount}
                    </span>
                )}
                <ChevronDown size={13} weight="bold" className="transition-transform" style={{ color: "#94A3B8", transform: open ? "rotate(180deg)" : "none" }} />
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-2 z-40 w-[244px] rounded-xl p-3"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid #D9E2EC",
                        boxShadow: "0 4px 12px rgba(15,23,42,0.08), 0 18px 40px rgba(15,23,42,0.12)",
                    }}
                >
                    <div className="flex items-center justify-between px-1 pb-1.5">
                        <span className="text-[11px] uppercase" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.05em" }}>
                            Filtrar fila de ação
                        </span>
                        {activeCount > 0 && (
                            <button type="button" onClick={clear} className="text-[11px] font-semibold" style={{ color: "#2563EB" }}>
                                Limpar
                            </button>
                        )}
                    </div>

                    <p className="text-[10px] uppercase px-2.5 mt-1 mb-0.5" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>
                        Nível
                    </p>
                    {LEVEL_OPTIONS.map((o) => (
                        <FilterCheckRow key={o.key} label={o.label} dot={o.color} checked={filters.levels.has(o.key)} onToggle={() => toggleLevel(o.key)} />
                    ))}

                    <div className="h-px my-1.5" style={{ background: "#F1F5F9" }} />

                    <p className="text-[10px] uppercase px-2.5 mb-0.5" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>
                        Origem
                    </p>
                    {SOURCE_OPTIONS.map((o) => (
                        <FilterCheckRow key={o.key} label={o.label} checked={filters.sources.has(o.key)} onToggle={() => toggleSource(o.key)} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Chips de filtro ativo — tornam o recorte VISÍVEL (antes ficava escondido no
// popover). Cada chip remove só aquele filtro; "Limpar tudo" zera. Aparece só
// quando há filtro aplicado.
function ActiveFilterChips({ filters, onChange }: { filters: CentralFilters; onChange: (next: CentralFilters) => void }) {
    const levelLabel = Object.fromEntries(LEVEL_OPTIONS.map((o) => [o.key, o.label])) as Record<PriorityLevel, string>;
    const sourceLabel = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.key, o.label])) as Record<PrioritySource, string>;

    const chips: { key: string; label: string; dot?: string; remove: () => void }[] = [];
    filters.levels.forEach((l) =>
        chips.push({
            key: `l-${l}`,
            label: levelLabel[l],
            dot: PRIORITY_BAR_COLOR[l],
            remove: () => { const n = new Set(filters.levels); n.delete(l); onChange({ ...filters, levels: n }); },
        }),
    );
    filters.sources.forEach((s) =>
        chips.push({
            key: `s-${s}`,
            label: sourceLabel[s],
            remove: () => { const n = new Set(filters.sources); n.delete(s); onChange({ ...filters, sources: n }); },
        }),
    );
    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[11px] uppercase" style={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.06em" }}>
                Filtrando
            </span>
            {chips.map((c) => (
                <button
                    key={c.key}
                    type="button"
                    onClick={c.remove}
                    className="group inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full text-[12px] font-medium transition-colors hover:bg-[#EEF2F7]"
                    style={{ background: "#FFFFFF", border: "1px solid #D9E2EC", color: "#334155" }}
                    aria-label={`Remover filtro ${c.label}`}
                >
                    {c.dot && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.dot }} />}
                    {c.label}
                    <X size={11} weight="bold" style={{ color: "#94A3B8" }} />
                </button>
            ))}
            <button
                type="button"
                onClick={() => onChange({ levels: new Set(), sources: new Set() })}
                className="text-[12px] font-semibold transition-colors hover:underline"
                style={{ color: "#2563EB" }}
            >
                Limpar tudo
            </button>
        </div>
    );
}

// ─── Saudação + Progresso do dia ────────────────────────────────────────────

function getHourlyGreeting(hour: number): string {
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
}

const PRIORITY_BAR_COLOR: Record<PriorityLevel, string> = {
    critical: "#F43F5E",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#94A3B8",
};

// Barra-missão do dia: um segmento por ação, cor = severidade. Resolvido fica
// sólido; pendente fica esmaecido. O avanço é o "plano com fim" da tela.
function DayProgress({ items, state }: { items: DailyPriority[]; state: PriorityActionState }) {
    const total = items.length;
    if (total === 0) return null;
    const resolved = items.filter((p) => isResolved(state, p.id)).length;
    const allDone = resolved === total;
    return (
        <div className="rounded-2xl px-5 sm:px-6 py-4" style={{ background: "#FFFFFF", border: "1px solid #D9E2EC", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-bold" style={{ color: "#0B1220" }}>Progresso do dia</span>
                <span className="text-[12px] font-semibold tabular-nums inline-flex items-center gap-1.5" style={{ color: allDone ? "#047857" : "#475569" }}>
                    {allDone && <CheckCircle size={14} weight="fill" />}
                    {resolved} de {total} {resolved === 1 ? "resolvida" : "resolvidas"}
                </span>
            </div>
            <div className="flex items-center gap-1">
                {items.map((p) => {
                    const done = isResolved(state, p.id);
                    const c = PRIORITY_BAR_COLOR[p.priority];
                    return (
                        <div
                            key={p.id}
                            className="h-2 flex-1 rounded-full"
                            style={{ background: done ? c : `${c}33`, transition: "background-color 0.45s cubic-bezier(0.4,0,0.2,1)" }}
                            title={`${p.title}${done ? " · resolvida" : ""}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Estado persistido de resolver/adiar (localStorage por empresa).
function usePriorityActions(companyId: string | null | undefined) {
    const [state, setState] = useState<PriorityActionState>({ resolved: {}, snoozed: {} });
    useEffect(() => {
        setState(loadLiveActions(companyId, Date.now()));
    }, [companyId]);
    const resolve = useCallback(
        (id: string) => {
            if (!companyId) return;
            setState(resolvePriority(companyId, id, new Date().toISOString()));
        },
        [companyId],
    );
    const snooze = useCallback(
        (id: string) => {
            if (!companyId) return;
            setState(snoozePriority(companyId, id, startOfTomorrowIso()));
        },
        [companyId],
    );
    return { state, resolve, snooze };
}

// ─── Main page ──────────────────────────────────────────────────────────────

const Inicio = () => {
    const navigate = useNavigate();
    const reduce = useReducedMotion();
    const { profile, companyId } = useAuth();

    // Pipeline real (mantém)
    const { pipeline, totalPipeline } = useInicioData();

    // Central de Comando — métricas reais + listas
    const cc = useCommandCenterData();

    const metrics: CommandCenterMetrics | null = cc.metrics;

    // Atualizar: refresca a Central inteira (métricas + pipeline), não só o cc.
    const [manualRefreshing, setManualRefreshing] = useState(false);
    const handleRefresh = useCallback(async () => {
        setManualRefreshing(true);
        try {
            await Promise.all([cc.refetch(), pipeline.refetch()]);
        } finally {
            setManualRefreshing(false);
        }
    }, [cc, pipeline]);
    const refreshing = manualRefreshing || cc.isFetching || pipeline.isFetching;

    // Filtros da Fila de ação (client-side, sobre dados já carregados).
    const [filters, setFilters] = useState<CentralFilters>({ levels: new Set(), sources: new Set() });
    const activeFilterCount = filters.levels.size + filters.sources.size;

    // Ações persistidas (resolver/adiar) + envio direto (Responder rápido).
    const actions = usePriorityActions(companyId);
    const sender = useEvolutionSender();
    const handleQuickReply = useCallback(
        async (chatJid: string, text: string) => {
            await sender.sendMessage(chatJid, text);
            void cc.refetch(); // reflete a resposta enviada
        },
        [sender, cc],
    );

    // Plano do dia: tira adiados; separa resolvidos de pendentes.
    const { dayItems, pendingAll } = useMemo(() => {
        const nowMs = Date.now();
        const day = cc.dailyPriorities.filter((p) => !isSnoozed(actions.state, p.id, nowMs));
        const pending = day.filter((p) => !isResolved(actions.state, p.id));
        return { dayItems: day, pendingAll: pending };
    }, [cc.dailyPriorities, actions.state]);

    // Fila visível = pendentes + filtro de UI.
    const queue = useMemo(
        () =>
            pendingAll.filter((p) => {
                if (filters.levels.size && !filters.levels.has(p.priority)) return false;
                if (filters.sources.size && !filters.sources.has(p.source)) return false;
                return true;
            }),
        [pendingAll, filters],
    );

    const criticalCount = useMemo(() => pendingAll.filter((p) => p.priority === "critical").length, [pendingAll]);
    const dayComplete = dayItems.length > 0 && pendingAll.length === 0;

    // COMMAND.UI.4 — tendência REAL: grava snapshot diário e lê delta/série.
    // Só aparece quando há histórico (≥2 dias). Nada fabricado.
    const [trends, setTrends] = useState<Record<string, MetricTrend>>({});
    useEffect(() => {
        if (cc.loading || !metrics || !companyId) return;
        recordMetricSnapshot(companyId, {
            activeConversations: metrics.activeConversations,
            hotLeads: metrics.hotLeads,
            needsFollowUp: metrics.needsFollowUp,
            opportunitiesOpen: metrics.opportunitiesOpen,
        });
        setTrends({
            activeConversations: getMetricTrend(companyId, "activeConversations"),
            hotLeads: getMetricTrend(companyId, "hotLeads"),
            needsFollowUp: getMetricTrend(companyId, "needsFollowUp"),
            opportunitiesOpen: getMetricTrend(companyId, "opportunitiesOpen"),
        });
    }, [cc.loading, metrics, companyId]);

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

    const kpiCards: KpiStripItem[] = useMemo(() => {
        const safe = (n: number | null | undefined) => (n == null ? "—" : String(n));
        return [
            { label: "Conversas ativas", value: safe(metrics?.activeConversations), icon: MessageCircle, accent: "#2563EB", href: "/inbox", metricKey: "activeConversations", goodWhenUp: true, loading: cc.loading },
            { label: "Leads quentes", value: safe(metrics?.hotLeads), icon: Flame, accent: "#DC2626", href: "/inbox", metricKey: "hotLeads", goodWhenUp: true, loading: cc.loading },
            { label: "Aguardando resposta", value: safe(metrics?.needsFollowUp), icon: Clock, accent: "#B45309", href: "/inbox", metricKey: "needsFollowUp", goodWhenUp: false, loading: cc.loading },
            { label: "Oportunidades abertas", value: safe(metrics?.opportunitiesOpen), icon: Target, accent: "#10B981", href: "/pipeline", metricKey: "opportunitiesOpen", goodWhenUp: true, loading: cc.loading },
        ];
    }, [metrics, cc.loading]);

    const firstName = (profile?.nome || "").split(" ")[0] || "";
    const greeting = getHourlyGreeting(new Date().getHours());
    const narration = cc.loading
        ? "A EVA está lendo sua operação…"
        : pendingAll.length === 0
            ? "A EVA leu sua operação. Nada pendente agora, tudo em dia."
            : `A EVA leu sua operação. Você tem ${pendingAll.length} ${pendingAll.length === 1 ? "ação" : "ações"} hoje${criticalCount > 0 ? `, ${criticalCount} não ${criticalCount === 1 ? "pode" : "podem"} esperar` : ""}.`;

    return (
        <div className="vz-stagger space-y-5 sm:space-y-6 mx-auto w-full max-w-[1600px] 2xl:px-4 pb-24 lg:pb-0">
            {/* Header */}
            <div
                className="rounded-2xl px-7 sm:px-9 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative overflow-hidden"
                style={{
                    background: "#FFFFFF",
                    border: "1px solid #E6EDF5",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                }}
            >
                <div
                    className="absolute top-0 inset-x-0 h-px pointer-events-none"
                    style={{
                        background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.30) 40%, rgba(37,99,235,0.16) 70%, transparent)",
                    }}
                />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-[30px] sm:text-[40px] leading-[1.04]"
                            style={{ color: "#0B1220", fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, letterSpacing: "-0.012em" }}>
                            {greeting}{firstName ? `, ${firstName}` : ""}
                        </h1>
                        {criticalCount > 0 && (
                            <button
                                onClick={() => navigate("/inbox")}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-transform hover:scale-[1.03] active:scale-95"
                                style={{
                                    background: "#CB4327",
                                    color: "#FFFFFF",
                                    letterSpacing: "0.06em",
                                    boxShadow: "0 4px 12px -3px rgba(203,67,39,0.5)",
                                }}>
                                <AlertTriangle size={12} weight="fill" />
                                {criticalCount} {criticalCount === 1 ? "urgente" : "urgentes"}
                            </button>
                        )}
                    </div>
                    <p className="text-[14.5px] sm:text-[15.5px]" style={{ color: "#475569" }}>
                        {narration}
                    </p>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                    <motion.button
                        onClick={() => void handleRefresh()}
                        disabled={refreshing}
                        whileTap={reduce ? undefined : { scale: 0.95 }}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white hover:border-[#BFD3F2] shrink-0 disabled:opacity-70"
                        style={{
                            background: "rgba(255,255,255,0.85)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid #D9E2EC",
                            color: "#475569",
                        }}
                    >
                        {/* Motion: gira em loop suave enquanto carrega e assenta com
                            spring (não para seco). Congela em reduced-motion. */}
                        <motion.span
                            className="inline-flex"
                            animate={refreshing && !reduce ? { rotate: 360 } : { rotate: 0 }}
                            transition={
                                refreshing && !reduce
                                    ? { repeat: Infinity, ease: "linear", duration: 0.7 }
                                    : { type: "spring", stiffness: 260, damping: 18 }
                            }
                            style={{ color: refreshing ? "#2563EB" : "#64748B" }}
                        >
                            <RefreshCw size={15} weight="bold" />
                        </motion.span>
                        {refreshing ? "Atualizando…" : "Atualizar"}
                    </motion.button>
                    <FilterMenu filters={filters} onChange={setFilters} activeCount={activeFilterCount} />
                </div>
            </div>

            {/* Filtro aplicado fica visível como chips removíveis (não escondido). */}
            <ActiveFilterChips filters={filters} onChange={setFilters} />

            {/* COMMAND.UI — 4 zonas (Pulso → Foco → Fila → Atividade) na coluna
                principal + rail da EVA. DayProgress e KPIs entram como slots da
                coluna pra alinhar com a fila e o rail subir desde o topo. */}
            <DecisionWorkspace
                priorities={pendingAll}
                queuePriorities={queue}
                filterActive={activeFilterCount > 0}
                dayComplete={dayComplete}
                highlights={cc.evaHighlights}
                recentActivity={cc.recentActivity}
                loading={cc.loading}
                onNavigate={navigate}
                onResolve={actions.resolve}
                onSnooze={actions.snooze}
                sendReply={handleQuickReply}
                replyConnected={sender.connected}
                evaChat={<EvaChat evaInput={evaInput} onNavigate={navigate} />}
                dayProgress={<DayProgress items={dayItems} state={actions.state} />}
                pulse={<KpiStrip items={kpiCards} trends={trends} onNavigate={navigate} />}
            />

            {/* Error inline */}
            {cc.error && (
                <div className="text-[11.5px] py-3 px-4 rounded-lg"
                    style={{ background: "rgba(220,38,38,0.06)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.20)" }}>
                    Erro ao carregar Central: {cc.error}
                </div>
            )}

            <div className="text-center text-[11.5px] py-4" style={{ color: "#475569" }}>
                Dados em tempo real {cc.lastUpdatedAt ? `· atualizado ${relativeTime(cc.lastUpdatedAt.toISOString())}` : ""}
            </div>
        </div>
    );
};

export default Inicio;
