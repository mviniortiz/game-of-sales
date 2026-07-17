import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
// F5C.5.3 — Phosphor duotone (mesmo set da sidebar e do pipeline /pipeline).
import {
    Warning as AlertTriangle,
    CaretRight as ChevronRight,
    CaretDown as ChevronDown,
    Check,
    CheckCircle,
    Clock,
    CurrencyDollar,
    SlidersHorizontal as Filter,
    Funnel,
    ArrowClockwise as RefreshCw,
    Target,
    Timer,
    UserPlus,
    X,
} from "@phosphor-icons/react";
import { useInicioData } from "@/hooks/useInicioData";
import { useCockpitData, type CockpitData, type CockpitRange, type DayPoint } from "@/hooks/useCockpitData";
import { useCommandCenterData, type DailyPriority } from "@/hooks/useCommandCenterData";
import {
    ActionQueue,
    ActivityTimeline,
    CARD_STYLE,
    type QueueHandlers,
} from "@/components/inicio/DecisionWorkspace";
import { OnboardingChecklist } from "@/components/inicio/OnboardingChecklist";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
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
// Central de Comando — COMMAND.UI.7 "Cockpit do gestor" (2026-07-06)
//
// A página virou dashboard: números e gráficos do NEGÓCIO à esquerda (receita
// vs meta, leads/dia, pipeline por etapa, tempo de resposta — useCockpitData),
// fila de ação compacta à direita (ActionQueue). A EVA saiu da página inteira
// (rail, síntese, chat) — fica só o dock flutuante global (EvaHelpDock).
//
// Identidade vs /performance: aqui é operação de HOJE/semana; análise de
// período (funil, ciclo, ranking, heatmap) continua em /performance.
// Dataviz: 1 série por gráfico (sem legenda), azul #2563EB único hue, meta =
// linha neutra tracejada, grid recessivo, tooltip em todo gráfico.
// ─────────────────────────────────────────────────────────────────────────────

const INK = "#0B1220";
const SUB = "#475569";
const MUTE = "#94A3B8";
const BLUE = "#2563EB";
const GRID = "#EAF0F6";

const fmtBRL = (v: number) =>
    v >= 1000
        ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: v >= 100_000 ? 0 : 1 })}k`
        : `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

const fmtMin = (min: number | null) => {
    if (min == null) return "—";
    if (min < 60) return `${min}min`;
    return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
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

// ─── KPIs do cockpit ─────────────────────────────────────────────────────────

interface KpiDef {
    label: string;
    value: string;
    sub: string | null;
    icon: typeof Target;
    accent: string;
    href: string;
}

function KpiCard({ kpi, loading, onNavigate }: { kpi: KpiDef; loading: boolean; onNavigate: (href: string) => void }) {
    const Icon = kpi.icon;
    return (
        <button
            type="button"
            onClick={() => onNavigate(kpi.href)}
            className="min-w-0 rounded-2xl px-5 py-4 text-left transition-all hover:brightness-[0.985]"
            style={CARD_STYLE}
            aria-label={`${kpi.label}: ${kpi.value}`}
        >
            <div className="flex items-center gap-2 mb-2.5">
                <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${kpi.accent}17` }}>
                    <Icon size={15} weight="duotone" style={{ color: kpi.accent }} />
                </span>
                <p className="text-[11px] uppercase truncate" style={{ color: SUB, fontWeight: 700, letterSpacing: "0.06em" }}>
                    {kpi.label}
                </p>
            </div>
            {loading ? (
                <span className="inline-block h-8 w-20 rounded" style={{ background: GRID }} aria-label="Carregando" />
            ) : (
                <p className="text-[27px] font-bold tabular-nums leading-none" style={{ color: INK, letterSpacing: "-0.03em" }}>
                    {kpi.value}
                </p>
            )}
            <p className="text-[11.5px] mt-1.5 truncate" style={{ color: kpi.sub ? SUB : MUTE }}>
                {kpi.sub ?? " "}
            </p>
        </button>
    );
}

// ─── Gráficos (recharts, 1 série, tooltip sempre) ───────────────────────────

function ChartPanel({ title, hint, loading, error, children, height = 190 }: {
    title: string;
    hint?: string;
    loading?: boolean;
    error?: boolean;
    children: React.ReactNode;
    height?: number;
}) {
    return (
        <section className="rounded-2xl px-5 pt-4 pb-2 min-w-0" style={CARD_STYLE}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <h2 className="text-[13px] font-bold" style={{ color: INK }}>{title}</h2>
                {hint && <span className="text-[11px] shrink-0" style={{ color: MUTE }}>{hint}</span>}
            </div>
            <div style={{ height }}>
                {loading ? (
                    <div className="h-full w-full flex items-end gap-2 pb-3 px-2" aria-label="Carregando">
                        {[38, 62, 45, 76, 52, 68, 40, 58, 72, 48].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t animate-pulse" style={{ height: `${h}%`, background: GRID }} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="h-full flex items-center justify-center text-[12.5px]" style={{ color: MUTE }}>
                        Não consegui carregar este gráfico. Recarregue a página.
                    </div>
                ) : (
                    children
                )}
            </div>
        </section>
    );
}

function CockpitTooltip({ active, payload, label, format }: {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
    format: (v: number) => string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg px-3 py-2" style={{ background: "#FFFFFF", border: "1px solid #D9E2EC", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}>
            <p className="text-[11px]" style={{ color: MUTE }}>{label}</p>
            <p className="text-[13px] font-bold tabular-nums" style={{ color: INK }}>{format(payload[0].value)}</p>
        </div>
    );
}

const AXIS_TICK = { fontSize: 10.5, fill: MUTE } as const;

// Receita acumulada do mês vs meta (linha neutra tracejada).
function RevenueChart({ series, goal }: { series: DayPoint[]; goal: number | null }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                    <linearGradient id="ck-rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BLUE} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={46} tickFormatter={(v: number) => fmtBRL(v)} domain={[0, (max: number) => Math.max(max, goal ?? 0) * 1.08 || 10]} />
                <Tooltip content={<CockpitTooltip format={(v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`} />} cursor={{ stroke: "#CBD5E1", strokeDasharray: "3 3" }} />
                {goal != null && goal > 0 && (
                    <ReferenceLine
                        y={goal}
                        stroke={MUTE}
                        strokeDasharray="6 4"
                        label={{ value: `meta ${fmtBRL(goal)}`, position: "insideTopRight", fontSize: 10.5, fill: SUB }}
                    />
                )}
                <Area type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} fill="url(#ck-rev)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#FFFFFF" }} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// Novos leads por dia (14d) — barras finas, ponta arredondada na baseline.
function LeadsChart({ series }: { series: DayPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="34%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={22} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<CockpitTooltip format={(v) => `${v} ${v === 1 ? "lead novo" : "leads novos"}`} />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                <Bar dataKey="value" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// Funil do pipeline v3 — silhueta contínua com dimensões DETERMINÍSTICAS:
// cada linha é flex com altura fixa e o svg leva width/height explícitos em
// atributo (h-full aqui já quebrou 2x: sem altura definida no pai, o SVG cai
// no default de 150px e os segmentos se sobrepõem). O fundo de um segmento
// tem a largura do topo do próximo (silhueta emendada), laterais em bezier,
// rampa azul claro→escuro, Ganho como base verde, passagem % em pill na
// divisória. Labels laterais em tinta, nunca texto sobre a cor.
const FUNNEL_RAMP = ["#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB"];
const FUNNEL_ROW = 58;
const FUNNEL_WON_ROW = 36;
const FUNNEL_SIDE = 132; // colunas de label (esquerda/direita)

interface FunnelStage { key: string; name: string; count: number; totalValue: number }

function FunnelRow({ height, left, right, children, onClick, ariaLabel }: {
    height: number;
    left: React.ReactNode;
    right: React.ReactNode;
    children: React.ReactNode;
    onClick: () => void;
    ariaLabel: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className="group flex w-full items-center gap-4 text-left"
            style={{ height }}
        >
            <span className="shrink-0 text-right" style={{ width: FUNNEL_SIDE }}>{left}</span>
            <span className="relative min-w-0 flex-1" style={{ height }}>{children}</span>
            <span className="shrink-0" style={{ width: FUNNEL_SIDE }}>{right}</span>
        </button>
    );
}

function PipelineFunnel({ stages, onNavigate }: { stages: FunnelStage[]; onNavigate: (href: string) => void }) {
    const open = stages.filter((s) => s.key !== "closed_won");
    const won = stages.find((s) => s.key === "closed_won");
    const maxCount = Math.max(1, ...open.map((s) => s.count));
    const w = (count: number) => Math.max(18, (count / maxCount) * 94);
    const widths = open.map((st) => w(st.count));
    const bottomOf = (i: number) => (i < open.length - 1 ? widths[i + 1] : widths[i] * 0.72);
    const goPipeline = () => onNavigate("/pipeline");

    const valueLabel = (st: FunnelStage) => (
        <span className="block text-[13px] tabular-nums truncate" style={{ color: INK }}>
            <strong className="text-[14px]">{st.count}</strong>
            <span style={{ color: MUTE }}> · {fmtBRL(st.totalValue)}</span>
        </span>
    );

    return (
        <div className="flex flex-col" role="img" aria-label="Funil do pipeline por etapa">
            {open.map((st, i) => {
                const next = open[i + 1];
                const tw = widths[i];
                const bw = bottomOf(i);
                const k = FUNNEL_ROW * 0.5;
                const pass = next && st.count > 0 ? Math.round((next.count / st.count) * 100) : null;
                const d = [
                    `M ${50 - tw / 2} 0`,
                    `L ${50 + tw / 2} 0`,
                    `C ${50 + tw / 2} ${k}, ${50 + bw / 2} ${FUNNEL_ROW - k}, ${50 + bw / 2} ${FUNNEL_ROW}`,
                    `L ${50 - bw / 2} ${FUNNEL_ROW}`,
                    `C ${50 - bw / 2} ${FUNNEL_ROW - k}, ${50 - tw / 2} ${k}, ${50 - tw / 2} 0`,
                    "Z",
                ].join(" ");
                return (
                    <FunnelRow
                        key={st.key}
                        height={FUNNEL_ROW}
                        onClick={goPipeline}
                        ariaLabel={`${st.name}: ${st.count} oportunidades, ${fmtBRL(st.totalValue)}`}
                        left={
                            <span className="block text-[13px] font-semibold truncate transition-colors group-hover:text-[#0B1220]" style={{ color: SUB }}>
                                {st.name}
                            </span>
                        }
                        right={valueLabel(st)}
                    >
                        <svg
                            width="100%"
                            height={FUNNEL_ROW}
                            viewBox={`0 0 100 ${FUNNEL_ROW}`}
                            preserveAspectRatio="none"
                            className="block"
                            aria-hidden
                        >
                            <path
                                d={d}
                                fill={FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 2)]}
                                className="transition-[filter] duration-200 group-hover:brightness-[0.96]"
                                style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                            />
                            {/* hairline branca só no topo (divisória), não nas laterais:
                                stroke no path todo engrossava a silhueta */}
                            {i > 0 && <line x1={50 - tw / 2} y1={0.75} x2={50 + tw / 2} y2={0.75} stroke="#FFFFFF" strokeWidth={1.5} />}
                        </svg>
                        {pass != null && (
                            <span
                                className="absolute left-1/2 -translate-x-1/2 z-10 inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-mono tabular-nums whitespace-nowrap"
                                style={{
                                    bottom: -9,
                                    background: "#FFFFFF",
                                    border: "1px solid #E4E9F2",
                                    color: SUB,
                                    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                                }}
                            >
                                {pass}% ↓
                            </span>
                        )}
                    </FunnelRow>
                );
            })}

            {won && (
                <div className="mt-2.5">
                    <FunnelRow
                        height={FUNNEL_WON_ROW}
                        onClick={goPipeline}
                        ariaLabel={`Ganho: ${won.count} oportunidades, ${fmtBRL(won.totalValue)}`}
                        left={
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "#047857" }}>
                                <Check size={13} weight="bold" /> Ganho
                            </span>
                        }
                        right={valueLabel(won)}
                    >
                        <svg
                            width="100%"
                            height={FUNNEL_WON_ROW}
                            viewBox={`0 0 100 ${FUNNEL_WON_ROW}`}
                            preserveAspectRatio="none"
                            className="block"
                            aria-hidden
                        >
                            <rect
                                x={50 - (widths[widths.length - 1] ?? 40) * 0.36}
                                y={5}
                                width={(widths[widths.length - 1] ?? 40) * 0.72}
                                height={FUNNEL_WON_ROW - 10}
                                rx={4}
                                fill="#10B981"
                                className="transition-[filter] duration-200 group-hover:brightness-[0.96]"
                            />
                        </svg>
                    </FunnelRow>
                </div>
            )}
        </div>
    );
}

// Tempo de 1ª resposta por dia (mediana, 7d) — subir é ruim.
function ResponseChart({ series }: { series: DayPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="38%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={34} tickFormatter={(v: number) => fmtMin(v)} allowDecimals={false} />
                <Tooltip content={<CockpitTooltip format={(v) => (v === 0 ? "sem respostas no dia" : `mediana ${fmtMin(v)}`)} />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                <Bar dataKey="value" fill="#B45309" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// ─── Período dos gráficos (leads + tempo de resposta; receita é sempre o mês) ─

const RANGE_OPTIONS: CockpitRange[] = [7, 14, 30];

function PeriodToggle({ value, onChange }: { value: CockpitRange; onChange: (v: CockpitRange) => void }) {
    return (
        <div
            className="inline-flex h-10 items-center rounded-xl p-1"
            style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #D9E2EC" }}
            role="group"
            aria-label="Período dos gráficos"
        >
            {RANGE_OPTIONS.map((d) => (
                <button
                    key={d}
                    type="button"
                    onClick={() => onChange(d)}
                    aria-pressed={value === d}
                    className="h-8 px-3 rounded-lg text-[12.5px] font-semibold transition-colors"
                    style={value === d
                        ? { background: "#0B1220", color: "#FFFFFF" }
                        : { color: SUB }}
                >
                    {d}d
                </button>
            ))}
        </div>
    );
}

// ─── Filtros da Fila de ação (client-side, inalterado) ──────────────────────

type PrioritySource = DailyPriority["source"];
type StaleWindow = 24 | 48;

const ACTION_OPTIONS: { key: PrioritySource; label: string }[] = [
    { key: "conversation", label: "Responder lead" },
    { key: "deal",         label: "Avançar oportunidade" },
    { key: "eva",          label: "Completar a EVA" },
];
const STALE_OPTIONS: { key: StaleWindow; label: string }[] = [
    { key: 24, label: "Parado +24h" },
    { key: 48, label: "Parado +48h" },
];

export interface CentralFilters {
    actions: Set<PrioritySource>;
    urgent: boolean;
    stale: StaleWindow | null;
}

function emptyFilters(): CentralFilters {
    return { actions: new Set(), urgent: false, stale: null };
}
function countActiveFilters(f: CentralFilters): number {
    return f.actions.size + (f.urgent ? 1 : 0) + (f.stale != null ? 1 : 0);
}
function hoursSinceIso(iso?: string | null): number {
    if (!iso) return 0;
    return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}
function matchesFilters(p: DailyPriority, f: CentralFilters): boolean {
    if (f.actions.size && !f.actions.has(p.source)) return false;
    if (f.urgent && !(p.priority === "critical" || p.priority === "high")) return false;
    if (f.stale != null && hoursSinceIso(p.createdAt) < f.stale) return false;
    return true;
}

function FilterCheckRow({ label, dot, checked, onToggle }: { label: string; dot?: string; checked: boolean; onToggle: () => void }) {
    return (
        <button type="button" onClick={onToggle} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[#F1F5F9]">
            <span
                className="h-[18px] w-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-colors"
                style={{ background: checked ? BLUE : "#FFFFFF", border: `1.5px solid ${checked ? BLUE : "#CBD5E1"}` }}
            >
                {checked && <Check size={12} weight="bold" style={{ color: "#FFFFFF" }} />}
            </span>
            {dot && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />}
            <span className="text-[13px]" style={{ color: "#334155", fontWeight: 500 }}>{label}</span>
        </button>
    );
}

function FilterMenu({ filters, onChange, activeCount }: { filters: CentralFilters; onChange: (next: CentralFilters) => void; activeCount: number }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const computePos = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }, []);

    useEffect(() => {
        if (!open) return;
        computePos();
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        const onReflow = () => computePos();
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onReflow, true);
        window.addEventListener("resize", onReflow);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onReflow, true);
            window.removeEventListener("resize", onReflow);
        };
    }, [open, computePos]);

    const toggleAction = (k: PrioritySource) => {
        const next = new Set(filters.actions);
        if (next.has(k)) next.delete(k); else next.add(k);
        onChange({ ...filters, actions: next });
    };

    return (
        <div className="relative" ref={triggerRef}>
            <button
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="true"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white shrink-0"
                style={{
                    background: activeCount > 0 ? "#FFFFFF" : "rgba(255,255,255,0.85)",
                    border: `1px solid ${activeCount > 0 ? "#BFD3F2" : "#D9E2EC"}`,
                    color: SUB,
                }}
            >
                <Filter size={14} weight="duotone" style={{ color: activeCount > 0 ? BLUE : SUB }} />
                Filtros
                {activeCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[11px] font-bold tabular-nums text-white" style={{ background: BLUE }}>
                        {activeCount}
                    </span>
                )}
                <ChevronDown size={13} weight="bold" className="transition-transform" style={{ color: MUTE, transform: open ? "rotate(180deg)" : "none" }} />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[60] w-[244px] rounded-xl p-3"
                    style={{ top: pos.top, right: pos.right, background: "#FFFFFF", border: "1px solid #D9E2EC", boxShadow: "0 4px 12px rgba(15,23,42,0.08), 0 18px 40px rgba(15,23,42,0.12)" }}
                >
                    <div className="flex items-center justify-between px-1 pb-1.5">
                        <span className="text-[11px] uppercase" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.05em" }}>Filtrar a fila</span>
                        {activeCount > 0 && (
                            <button type="button" onClick={() => onChange(emptyFilters())} className="text-[11px] font-semibold" style={{ color: BLUE }}>Limpar</button>
                        )}
                    </div>
                    <p className="text-[10px] uppercase px-2.5 mt-1 mb-0.5" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>O que fazer</p>
                    {ACTION_OPTIONS.map((o) => (
                        <FilterCheckRow key={o.key} label={o.label} checked={filters.actions.has(o.key)} onToggle={() => toggleAction(o.key)} />
                    ))}
                    <div className="h-px my-1.5" style={{ background: "#F1F5F9" }} />
                    <p className="text-[10px] uppercase px-2.5 mb-0.5" style={{ color: "#1E293B", fontWeight: 700, letterSpacing: "0.06em" }}>Foco</p>
                    <FilterCheckRow label="Só urgentes" dot="#F43F5E" checked={filters.urgent} onToggle={() => onChange({ ...filters, urgent: !filters.urgent })} />
                    {STALE_OPTIONS.map((o) => (
                        <FilterCheckRow key={o.key} label={o.label} checked={filters.stale === o.key} onToggle={() => onChange({ ...filters, stale: filters.stale === o.key ? null : o.key })} />
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

function ActiveFilterChips({ filters, onChange }: { filters: CentralFilters; onChange: (next: CentralFilters) => void }) {
    const actionLabel = Object.fromEntries(ACTION_OPTIONS.map((o) => [o.key, o.label])) as Record<PrioritySource, string>;
    const chips: { key: string; label: string; dot?: string; remove: () => void }[] = [];
    filters.actions.forEach((a) =>
        chips.push({
            key: `a-${a}`,
            label: actionLabel[a],
            remove: () => { const n = new Set(filters.actions); n.delete(a); onChange({ ...filters, actions: n }); },
        }),
    );
    if (filters.urgent) chips.push({ key: "urgent", label: "Urgentes", dot: "#F43F5E", remove: () => onChange({ ...filters, urgent: false }) });
    if (filters.stale != null) chips.push({ key: "stale", label: `Parado +${filters.stale}h`, remove: () => onChange({ ...filters, stale: null }) });
    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-[11px] uppercase" style={{ color: MUTE, fontWeight: 700, letterSpacing: "0.06em" }}>Filtrando</span>
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
                    <X size={11} weight="bold" style={{ color: MUTE }} />
                </button>
            ))}
            <button type="button" onClick={() => onChange(emptyFilters())} className="text-[12px] font-semibold transition-colors hover:underline" style={{ color: BLUE }}>
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

const PRIORITY_BAR_COLOR: Record<DailyPriority["priority"], string> = {
    critical: "#F43F5E",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#94A3B8",
};

function DayProgress({ items, state }: { items: DailyPriority[]; state: PriorityActionState }) {
    const total = items.length;
    if (total === 0) return null;
    const resolved = items.filter((p) => isResolved(state, p.id)).length;
    const allDone = resolved === total;
    return (
        <div className="rounded-2xl px-5 py-4" style={CARD_STYLE}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-bold" style={{ color: INK }}>Progresso do dia</span>
                <span className="text-[12px] font-semibold tabular-nums inline-flex items-center gap-1.5" style={{ color: allDone ? "#047857" : SUB }}>
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

    const { pipeline } = useInicioData();
    const [rangeDays, setRangeDays] = useState<CockpitRange>(14);
    const cockpit = useCockpitData(rangeDays);
    const cc = useCommandCenterData();
    const onboarding = useOnboardingProgress();
    const [searchParams] = useSearchParams();
    const onboardingPreview = searchParams.get("firstrun") === "1";

    const [manualRefreshing, setManualRefreshing] = useState(false);
    const handleRefresh = useCallback(async () => {
        setManualRefreshing(true);
        try {
            await Promise.all([cc.refetch(), pipeline.refetch(), cockpit.refetch()]);
        } finally {
            setManualRefreshing(false);
        }
    }, [cc, pipeline, cockpit]);
    const refreshing = manualRefreshing || cc.isFetching || pipeline.isFetching;

    const [filters, setFilters] = useState<CentralFilters>(emptyFilters);
    const activeFilterCount = countActiveFilters(filters);

    const actions = usePriorityActions(companyId);
    const sender = useEvolutionSender();
    const handleQuickReply = useCallback(
        async (chatJid: string, text: string) => {
            await sender.sendMessage(chatJid, text);
            void cc.refetch();
        },
        [sender, cc],
    );

    const { dayItems, pendingAll } = useMemo(() => {
        const nowMs = Date.now();
        const day = cc.dailyPriorities.filter((p) => !isSnoozed(actions.state, p.id, nowMs));
        const pending = day.filter((p) => !isResolved(actions.state, p.id));
        return { dayItems: day, pendingAll: pending };
    }, [cc.dailyPriorities, actions.state]);

    const allPending = useMemo(() => {
        const nowMs = Date.now();
        return cc.dailyPrioritiesAll
            .filter((p) => !isSnoozed(actions.state, p.id, nowMs))
            .filter((p) => !isResolved(actions.state, p.id));
    }, [cc.dailyPrioritiesAll, actions.state]);

    const queue = useMemo(() => {
        const base = activeFilterCount > 0 ? allPending : pendingAll;
        return base.filter((p) => matchesFilters(p, filters));
    }, [activeFilterCount, allPending, pendingAll, filters]);

    const criticalCount = useMemo(() => pendingAll.filter((p) => p.priority === "critical").length, [pendingAll]);
    const dayComplete = dayItems.length > 0 && pendingAll.length === 0;
    const handlers: QueueHandlers = {
        onNavigate: navigate,
        onResolve: actions.resolve,
        onSnooze: actions.snooze,
        sendReply: handleQuickReply,
        replyConnected: sender.connected,
    };

    // KPIs do negócio (useCockpitData) + oportunidades abertas (pipeline real).
    const ck: CockpitData | null = cockpit.data;
    const goalPct = ck?.monthGoal ? Math.round((ck.wonMonthTotal / ck.monthGoal) * 100) : null;
    // totalPipeline (useInicioData) é CONTAGEM; o valor aberto vem das etapas.
    const openStages = (pipeline.data ?? []).filter((s) => s.key !== "closed_won");
    const openValue = openStages.reduce((n, s) => n + s.totalValue, 0);
    const openCount = openStages.reduce((n, s) => n + s.count, 0);
    const kpis: KpiDef[] = [
        {
            label: "Ganho no mês",
            value: ck ? fmtBRL(ck.wonMonthTotal) : "—",
            sub: goalPct != null ? `${goalPct}% da meta de ${fmtBRL(ck!.monthGoal!)}` : "sem meta cadastrada",
            icon: CurrencyDollar, accent: "#047857", href: "/metas",
        },
        {
            label: "Pipeline aberto",
            value: pipeline.data ? fmtBRL(openValue) : "—",
            sub: `${openCount} ${openCount === 1 ? "oportunidade aberta" : "oportunidades abertas"}`,
            icon: Funnel, accent: BLUE, href: "/pipeline",
        },
        {
            label: "Novos leads (7d)",
            value: ck ? String(ck.leads7dTotal) : "—",
            sub: ck && ck.leadsPerDay.length > 0 ? `${ck.leadsPerDay[ck.leadsPerDay.length - 1].value} hoje` : null,
            icon: UserPlus, accent: "#7C3AED", href: "/inbox",
        },
        {
            label: "Tempo de resposta",
            value: ck ? fmtMin(ck.responseMedianMin) : "—",
            sub: `mediana da 1ª resposta, ${rangeDays} dias`,
            icon: Timer, accent: "#B45309", href: "/inbox",
        },
    ];

    const firstName = (profile?.nome || "").split(" ")[0] || "";
    const greeting = getHourlyGreeting(new Date().getHours());
    const subtitle = cc.loading
        ? "Carregando sua operação…"
        : pendingAll.length === 0
            ? "Operação em dia. Nada esperando por você agora."
            : `Sua operação em números. ${pendingAll.length} ${pendingAll.length === 1 ? "ação espera" : "ações esperam"} por você na fila.`;

    return (
        <div className="vz-stagger space-y-5 sm:space-y-6 mx-auto w-full max-w-[1920px] 2xl:px-2">
            {/* Header */}
            <div
                className="rounded-2xl px-5 sm:px-9 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative overflow-hidden"
                style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
            >
                <div
                    className="absolute top-0 inset-x-0 h-px pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.30) 40%, rgba(37,99,235,0.16) 70%, transparent)" }}
                />
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2">
                        <h1 className="text-[30px] sm:text-[40px] leading-[1.04]"
                            style={{ color: INK, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, letterSpacing: "-0.012em" }}>
                            {greeting}{firstName ? `, ${firstName}` : ""}
                        </h1>
                        {criticalCount > 0 && (
                            <button
                                onClick={() => navigate("/inbox")}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-transform hover:scale-[1.03] active:scale-95"
                                style={{ background: "#CB4327", color: "#FFFFFF", letterSpacing: "0.06em", boxShadow: "0 4px 12px -3px rgba(203,67,39,0.5)" }}>
                                <AlertTriangle size={12} weight="fill" />
                                {criticalCount} {criticalCount === 1 ? "urgente" : "urgentes"}
                            </button>
                        )}
                    </div>
                    <p className="text-[14.5px] sm:text-[15.5px]" style={{ color: SUB }}>{subtitle}</p>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                    <motion.button
                        onClick={() => void handleRefresh()}
                        disabled={refreshing}
                        whileTap={reduce ? undefined : { scale: 0.95 }}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-medium transition-colors hover:bg-white hover:border-[#BFD3F2] shrink-0 disabled:opacity-70"
                        style={{ background: "rgba(255,255,255,0.85)", border: "1px solid #D9E2EC", color: SUB }}
                    >
                        <motion.span
                            className="inline-flex"
                            animate={refreshing && !reduce ? { rotate: 360 } : { rotate: 0 }}
                            transition={refreshing && !reduce ? { repeat: Infinity, ease: "linear", duration: 0.7 } : { type: "spring", stiffness: 260, damping: 18 }}
                            style={{ color: refreshing ? BLUE : "#64748B" }}
                        >
                            <RefreshCw size={15} weight="bold" />
                        </motion.span>
                        {refreshing ? "Atualizando…" : "Atualizar"}
                    </motion.button>
                    <PeriodToggle value={rangeDays} onChange={setRangeDays} />
                </div>
            </div>

            {(onboardingPreview || (!onboarding.loading && !onboarding.allDone)) && (
                <OnboardingChecklist
                    progress={onboardingPreview ? { whatsapp: false, eva: false, leads: false, deal: false } : onboarding.progress}
                    doneCount={onboardingPreview ? 0 : onboarding.doneCount}
                    total={onboarding.total}
                    nextStep={onboardingPreview ? "whatsapp" : onboarding.nextStep}
                    onNavigate={navigate}
                />
            )}

            {/* COMMAND.UI.7 — Cockpit: números/gráficos (esquerda) + fila (direita). */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px] gap-5 2xl:gap-6 items-start">
                <div className="flex flex-col gap-5 min-w-0">
                    {/* KPIs do negócio */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {kpis.map((k) => (
                            <KpiCard key={k.label} kpi={k} loading={cockpit.loading || cc.loading} onNavigate={navigate} />
                        ))}
                    </div>

                    {/* Gráficos operacionais, no 2xl (tela grande) em pares */}
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 2xl:gap-6 items-stretch">
                        <ChartPanel title="Receita do mês" hint={ck?.monthGoal ? "acumulada vs meta" : "acumulada"} height={248} loading={cockpit.loading} error={!!cockpit.error}>
                            {ck && <RevenueChart series={ck.wonMonthSeries} goal={ck.monthGoal} />}
                        </ChartPanel>
                        <section className="rounded-2xl px-5 pt-4 pb-4 min-w-0" style={CARD_STYLE}>
                            <div className="flex items-baseline justify-between gap-3 mb-3">
                                <h2 className="text-[13px] font-bold" style={{ color: INK }}>Funil do pipeline</h2>
                                <span className="text-[11px] shrink-0" style={{ color: MUTE }}>oportunidades e valor por etapa</span>
                            </div>
                            {pipeline.isLoading ? (
                                <div className="space-y-1 py-1" aria-label="Carregando">
                                    {[92, 74, 56, 40].map((wd, i) => (
                                        <div key={i} className="mx-auto animate-pulse" style={{ width: `${wd}%`, height: 48, background: GRID, borderRadius: 6 }} />
                                    ))}
                                </div>
                            ) : (
                                <PipelineFunnel
                                    stages={(pipeline.data ?? []).map((s) => ({ key: s.key, name: s.name, count: s.count, totalValue: s.totalValue }))}
                                    onNavigate={navigate}
                                />
                            )}
                        </section>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 2xl:gap-6">
                        <ChartPanel title="Novos leads por dia" hint={`últimos ${rangeDays} dias`} height={210} loading={cockpit.loading} error={!!cockpit.error}>
                            {ck && <LeadsChart series={ck.leadsPerDay} />}
                        </ChartPanel>
                        <ChartPanel title="Tempo de 1ª resposta" hint={`mediana por dia, ${rangeDays} dias`} height={210} loading={cockpit.loading} error={!!cockpit.error}>
                            {ck && <ResponseChart series={ck.responsePerDay} />}
                        </ChartPanel>
                    </div>
                </div>

                {/* Rail direito: o que precisa de você agora. No mobile vem
                    ANTES dos gráficos (order-first): a fila de ações é a razão
                    de ser da tela e ficava 4 telas de scroll abaixo. */}
                <aside className="flex flex-col gap-5 min-w-0 order-first lg:order-none">
                    <DayProgress items={dayItems} state={actions.state} />
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <ActiveFilterChips filters={filters} onChange={setFilters} />
                            <span className="ml-auto shrink-0">
                                <FilterMenu filters={filters} onChange={setFilters} activeCount={activeFilterCount} />
                            </span>
                        </div>
                    </div>
                    <ActionQueue compact queue={queue} loading={cc.loading} dayComplete={dayComplete} filterActive={activeFilterCount > 0} handlers={handlers} />
                    <ActivityTimeline items={cc.recentActivity} loading={cc.loading} onNavigate={navigate} />
                </aside>
            </div>

            {cc.error && (
                <div className="text-[11.5px] py-3 px-4 rounded-lg"
                    style={{ background: "rgba(220,38,38,0.06)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.20)" }}>
                    Erro ao carregar Central: {cc.error}
                </div>
            )}

            <div className="text-center text-[11.5px] py-4" style={{ color: SUB }}>
                Dados em tempo real {cc.lastUpdatedAt ? `· atualizado ${relativeTime(cc.lastUpdatedAt.toISOString())}` : ""}
            </div>
        </div>
    );
};

export default Inicio;
