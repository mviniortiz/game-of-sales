import { useCallback, useEffect, useMemo, useState } from "react";
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
    Check,
    CheckCircle,
    CurrencyDollar,
    Funnel,
    ArrowClockwise as RefreshCw,
    Target,
    Timer,
    UserPlus,
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

// Funil do pipeline v5 — "cada bloco é uma oportunidade". Nada de silhueta
// nem barra agregada: com o volume real de uma agência (unidades, não
// centenas), proporção contínua é abstração genérica. Aqui cada deal vira um
// bloco discreto cuja largura é o VALOR dele numa régua compartilhada entre
// as etapas — dá pra ver em que etapa o dinheiro está sentado e quantas
// oportunidades compõem cada total. Bloco sem valor cadastrado fica vazado
// (outline). Acima de MUITOS deals a etapa degrada pra barra sólida (blocos
// perdem leitura). Rampa azul por profundidade, Ganho verde após hairline.
const FUNNEL_RAMP = ["#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8"];
const FUNNEL_BLOCK_LIMIT = 16;

interface FunnelStage { key: string; name: string; count: number; totalValue: number; values: number[] }

function FunnelBlocks({ stage, color, maxTotal }: { stage: FunnelStage; color: string; maxTotal: number }) {
    if (stage.count === 0) {
        return <span className="block h-px w-full self-center" style={{ borderTop: `1.5px dashed ${GRID}` }} />;
    }
    // Largura da faixa = fatia da etapa na régua; piso pra etapa sem valores
    // não sumir (blocos de valor 0 precisam de corpo pra contar unidades).
    const stripPct = Math.min(100, Math.max((stage.totalValue / maxTotal) * 100, stage.count * 5, 6));
    const solid = stage.count > FUNNEL_BLOCK_LIMIT;
    return (
        <span className="flex h-[14px] items-stretch gap-[3px]" style={{ width: `${stripPct}%` }}>
            {solid ? (
                <span className="min-w-0 flex-1 rounded-[4px] transition-[filter] duration-200 group-hover:brightness-[0.94]" style={{ background: color }} />
            ) : (
                stage.values.map((v, i) => (
                    <span
                        key={i}
                        title={v > 0 ? fmtBRL(v) : "sem valor cadastrado"}
                        className="min-w-[9px] rounded-[4px] transition-[filter] duration-200 group-hover:brightness-[0.94]"
                        style={{
                            flexGrow: Math.max(v, stage.totalValue * 0.04, 1),
                            flexBasis: 0,
                            ...(v > 0
                                ? { background: color }
                                : { background: "transparent", boxShadow: `inset 0 0 0 1.5px ${color}` }),
                        }}
                    />
                ))
            )}
        </span>
    );
}

function FunnelRow({ label, ariaName, stage, color, maxTotal, onClick }: {
    label: React.ReactNode;
    ariaName: string;
    stage: FunnelStage;
    color: string;
    maxTotal: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${ariaName}: ${stage.count} ${stage.count === 1 ? "oportunidade" : "oportunidades"}, ${fmtBRL(stage.totalValue)}`}
            className="group flex w-full items-center gap-4 rounded-lg px-1.5 py-[8px] text-left transition-colors hover:bg-[#F8FAFC]"
        >
            <span className="w-[108px] shrink-0 text-[13px] font-semibold truncate transition-colors group-hover:text-[#0B1220]" style={{ color: SUB }}>
                {label}
            </span>
            <span className="flex min-w-0 flex-1 items-center">
                <FunnelBlocks stage={stage} color={color} maxTotal={maxTotal} />
            </span>
            <span className="w-[108px] shrink-0 text-right text-[13px] tabular-nums truncate" style={{ color: stage.count === 0 ? MUTE : INK }}>
                <strong className="text-[14px]">{stage.count}</strong>
                <span style={{ color: MUTE }}> · {fmtBRL(stage.totalValue)}</span>
            </span>
        </button>
    );
}

function PipelineFunnel({ stages, onNavigate }: { stages: FunnelStage[]; onNavigate: (href: string) => void }) {
    const open = stages.filter((s) => s.key !== "closed_won");
    const won = stages.find((s) => s.key === "closed_won");
    const maxTotal = Math.max(1, ...open.map((s) => s.totalValue), won?.totalValue ?? 0);
    const goPipeline = () => onNavigate("/pipeline");

    return (
        <div className="flex flex-col" aria-label="Funil do pipeline por etapa">
            {open.map((st, i) => (
                <FunnelRow
                    key={st.key}
                    label={st.name}
                    ariaName={st.name}
                    stage={st}
                    color={FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)]}
                    maxTotal={maxTotal}
                    onClick={goPipeline}
                />
            ))}
            {won && (
                <>
                    <div className="mx-1.5 my-1.5 h-px" style={{ background: GRID }} />
                    <FunnelRow
                        label={
                            <span className="inline-flex items-center gap-1.5" style={{ color: "#047857" }}>
                                <Check size={13} weight="bold" /> Ganho
                            </span>
                        }
                        ariaName="Ganho"
                        stage={won}
                        color="#10B981"
                        maxTotal={maxTotal}
                        onClick={goPipeline}
                    />
                </>
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
                                <span className="text-[11px] shrink-0" style={{ color: MUTE }}>cada bloco é uma oportunidade · largura = valor</span>
                            </div>
                            {pipeline.isLoading ? (
                                <div className="space-y-2 py-2" aria-label="Carregando">
                                    {[92, 74, 56, 40, 66].map((wd, i) => (
                                        <div key={i} className="animate-pulse" style={{ width: `${wd}%`, height: 22, background: GRID, borderRadius: 9999 }} />
                                    ))}
                                </div>
                            ) : (
                                <PipelineFunnel
                                    stages={(pipeline.data ?? []).map((s) => ({ key: s.key, name: s.name, count: s.count, totalValue: s.totalValue, values: s.values }))}
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
                    <ActionQueue compact queue={pendingAll} loading={cc.loading} dayComplete={dayComplete} handlers={handlers} />
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
