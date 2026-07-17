import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    Target,
    Clock,
    Users,
    UserX,
    ArrowRight,
    Plus,
} from "lucide-react";
import { startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleSellers } from "@/hooks/useVisibleSellers";
import { stageLabelFor } from "@/lib/demoPipeline";
import { recordMetricSnapshot, getMetricTrend, type MetricTrend } from "@/lib/metricHistory";
import { GoldenHoursHeatmap } from "@/components/dashboard/GoldenHoursHeatmap";
import { PeriodToggle, DateRangePicker } from "@/components/filters";
import { PerformanceSkeleton } from "@/components/ui/skeletons";

// ─── Formatação ──────────────────────────────────────────────────────────────
const formatCurrencyCompact = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};
const daysSince = (iso?: string | null) => (iso ? differenceInDays(new Date(), new Date(iso)) : 0);

// Etapas abertas, em ordem do funil (IDs fixos do banco; label relabelado por company).
const STAGE_ORDER = [
    { id: "lead", label: "Lead" },
    { id: "qualification", label: "Qualificação" },
    { id: "proposal", label: "Proposta" },
    { id: "negotiation", label: "Negociação" },
] as const;
// Volume mínimo de origem pra medir uma passagem sem virar ruído.
const MIN_TRANSITION_BASE = 3;
// Volume mínimo total pra confiar no funil de conversão.
const MIN_FUNNEL_BASE = 4;

interface OpenDeal {
    id: string;
    value: number | null;
    stage: string;
    created_at: string;
    updated_at: string;
    is_hot: boolean | null;
    user_id: string | null;
    customer_name: string | null;
}

// ─── Card base (premium light) ───────────────────────────────────────────────
const Panel = ({ title, icon: Icon, action, children, className = "" }: {
    title?: string;
    icon?: React.ElementType;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={`bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 ${className}`}>
        {title && (
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-slate-400" />}
                    <h2 className="text-[13px] font-semibold text-[#0B1220]">{title}</h2>
                </div>
                {action}
            </div>
        )}
        {children}
    </div>
);

// Sparkline minúscula a partir do histórico real (≥2 dias). Sem dado → não renderiza.
// Mesma linguagem do Pulso na home (polyline, sem cor decorativa).
function Sparkline({ series, color }: { series: number[]; color: string }) {
    if (series.length < 2) return null;
    const w = 50, h = 18;
    const min = Math.min(...series), max = Math.max(...series);
    const span = max - min || 1;
    const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / span) * (h - 2) - 1}`).join(" ");
    return (
        <svg width={w} height={h} aria-hidden className="shrink-0">
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        </svg>
    );
}

// ─── KPI com tendência (delta dia-a-dia + sparkline, igual ao Pulso) ─────────
const TrendKpi = ({ label, value, context, tone = "default", trend, goodWhenUp, formatDelta }: {
    label: string;
    value: string;
    context: string;
    tone?: "default" | "muted";
    trend?: MetricTrend;
    goodWhenUp: boolean;
    formatDelta: (abs: number) => string;
}) => {
    const delta = trend?.delta ?? null;
    const improving = delta != null && delta !== 0 && ((delta > 0) === goodWhenUp);
    const deltaColor = delta == null || delta === 0 ? "#64748B" : improving ? "#047857" : "#B91C1C";
    const sparkColor = delta == null || delta === 0 ? "#94A3B8" : improving ? "#047857" : "#B91C1C";
    return (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
            <p className="text-[11.5px] font-semibold text-slate-500">{label}</p>
            <div className="flex items-baseline gap-1.5 mt-1">
                <p className={`text-[22px] font-bold leading-tight tabular-nums ${tone === "muted" ? "text-slate-400" : "text-[#0B1220]"}`}>{value}</p>
                {delta != null && delta !== 0 && (
                    <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color: deltaColor }} title="vs. dia anterior">
                        {delta > 0 ? "↑" : "↓"}{formatDelta(Math.abs(delta))}
                    </span>
                )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-[12px] text-slate-500 leading-snug">{context}</p>
                <Sparkline series={trend?.series ?? []} color={sparkColor} />
            </div>
        </div>
    );
};

const SalesPerformanceCenter = () => {
    const { activeCompanyId } = useTenant();
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const isManager = isAdmin || isSuperAdmin;

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const inicio = dateRange.from?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
    const fim = dateRange.to?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];

    const { data: sellers = [] } = useVisibleSellers();

    const { data: perf, isLoading } = useQuery({
        queryKey: ["perf-story", inicio, fim, activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return null;
            const { data: openDeals } = await supabase
                .from("deals")
                .select("id, value, stage, created_at, updated_at, is_hot, user_id, customer_name")
                .eq("company_id", activeCompanyId)
                .not("stage", "in", "(closed_won,closed_lost)");
            const { data: wonDeals } = await supabase
                .from("deals")
                .select("id, value, created_at, updated_at")
                .eq("company_id", activeCompanyId)
                .eq("stage", "closed_won")
                .gte("updated_at", inicio).lte("updated_at", fim);
            const { data: lostDeals } = await supabase
                .from("deals")
                .select("id")
                .eq("company_id", activeCompanyId)
                .eq("stage", "closed_lost")
                .gte("updated_at", inicio).lte("updated_at", fim);
            return {
                openDeals: (openDeals || []) as OpenDeal[],
                wonDeals: wonDeals || [],
                lostCount: lostDeals?.length || 0,
            };
        },
        enabled: !!activeCompanyId,
    });

    const m = useMemo(() => {
        const open = perf?.openDeals ?? [];
        const won = perf?.wonDeals ?? [];
        const lostCount = perf?.lostCount ?? 0;
        const visibleOpen = isManager ? open : open.filter((d) => d.user_id === user?.id);

        const pipelineValue = visibleOpen.reduce((a, d) => a + (Number(d.value) || 0), 0);
        const openCount = visibleOpen.length;
        const wonCount = won.length;
        const wonValue = won.reduce((a, d) => a + (Number(d.value) || 0), 0);
        const decided = wonCount + lostCount;
        const winRate = decided > 0 ? Math.round((wonCount / decided) * 100) : null;
        const cycles = won.map((d: { updated_at: string; created_at: string }) => differenceInDays(new Date(d.updated_at), new Date(d.created_at)));
        const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null;
        const forecast = winRate !== null ? pipelineValue * (winRate / 100) : null;

        // Contagem aberta por etapa.
        const openByStage: Record<string, number> = {};
        for (const s of STAGE_ORDER) openByStage[s.id] = visibleOpen.filter((d) => d.stage === s.id).length;

        // Funil de CONVERSÃO por snapshot: "chegou até a etapa N ou além".
        // reached(i) = soma das etapas de i em diante + ganhos do período.
        const reached = (i: number) => {
            let sum = wonCount;
            for (let k = i; k < STAGE_ORDER.length; k++) sum += openByStage[STAGE_ORDER[k].id];
            return sum;
        };
        const conversions = STAGE_ORDER.map((s, i) => {
            const toId = i + 1 < STAGE_ORDER.length ? STAGE_ORDER[i + 1].id : "won";
            const toLabel = i + 1 < STAGE_ORDER.length ? STAGE_ORDER[i + 1].label : "Ganho";
            const base = reached(i);
            const passed = reached(i + 1);
            const pct = base > 0 ? Math.round((passed / base) * 100) : null;
            return { fromId: s.id, fromLabel: s.label, toId, toLabel, base, passed, pct };
        });
        const totalBase = reached(0);
        const funnelReliable = totalBase >= MIN_FUNNEL_BASE;
        // Gargalo = menor conversão entre as passagens com base suficiente.
        const bottleneck = funnelReliable
            ? conversions
                .filter((c) => c.pct !== null && c.base >= MIN_TRANSITION_BASE)
                .sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100))[0] ?? null
            : null;

        // Atenção (parados / quentes).
        const stalledProposals = visibleOpen.filter((d) => d.stage === "proposal" && daysSince(d.updated_at) > 7);
        const stalledNegotiations = visibleOpen.filter((d) => d.stage === "negotiation" && daysSince(d.updated_at) > 7);
        const hotStalled = visibleOpen.filter((d) => d.is_hot && daysSince(d.updated_at) > 5);
        const anyStalled = visibleOpen.filter((d) => daysSince(d.updated_at) > 7);

        // Time (por responsável) — só gestor. "none" = sem dono (vira alerta de topo).
        const byOwner = new Map<string, { count: number; value: number }>();
        for (const d of open) {
            const k = d.user_id ?? "none";
            const cur = byOwner.get(k) ?? { count: 0, value: 0 };
            cur.count += 1; cur.value += Number(d.value) || 0;
            byOwner.set(k, cur);
        }
        const unassigned = byOwner.get("none") ?? null;

        return {
            open, visibleOpen, pipelineValue, openCount, wonCount, wonValue, lostCount, decided,
            winRate, avgCycle, forecast, conversions, bottleneck, funnelReliable, totalBase,
            stalledProposals, stalledNegotiations, hotStalled, anyStalled, byOwner, unassigned,
        };
    }, [perf, isManager, user?.id]);

    // Grava snapshot diário desta tela (chaves próprias) pra a tendência acumular.
    useEffect(() => {
        if (!activeCompanyId || !perf) return;
        recordMetricSnapshot(activeCompanyId, {
            perf_pipeline: Math.round(m.pipelineValue),
            perf_winrate: m.winRate ?? undefined,
            perf_cycle: m.avgCycle ?? undefined,
            perf_forecast: m.forecast != null ? Math.round(m.forecast) : undefined,
        });
    }, [activeCompanyId, perf, m.pipelineValue, m.winRate, m.avgCycle, m.forecast]);

    // Lê o histórico (localStorage, snapshots diários por dia) no mount. O ponto de
    // "hoje" é gravado pelo effect acima e entra na série na próxima visita.
    const trends = useMemo(() => ({
        perf_pipeline: getMetricTrend(activeCompanyId, "perf_pipeline"),
        perf_winrate: getMetricTrend(activeCompanyId, "perf_winrate"),
        perf_cycle: getMetricTrend(activeCompanyId, "perf_cycle"),
        perf_forecast: getMetricTrend(activeCompanyId, "perf_forecast"),
    }), [activeCompanyId]);

    const sellerName = (id: string) => sellers.find((s) => s.id === id)?.nome ?? "Sem responsável definido";
    const stageLbl = useCallback(
        (id: string, fallback: string) => (id === "won" ? "Ganho" : stageLabelFor(activeCompanyId, id, fallback)),
        [activeCompanyId],
    );

    // ─── Leitura da EVA: única voz de insight (absorve a antiga "Atenção do gestor") ──
    const eva = useMemo(() => {
        const bullets: { tone: "eva" | "warn" | "muted"; text: React.ReactNode }[] = [];
        if (m.funnelReliable && m.bottleneck && m.bottleneck.pct !== null) {
            bullets.push({
                tone: "eva",
                text: <>Maior queda em <strong className="text-[#0B1220]">{stageLbl(m.bottleneck.fromId, m.bottleneck.fromLabel)} → {stageLbl(m.bottleneck.toId, m.bottleneck.toLabel)}</strong> ({m.bottleneck.pct}%). É onde os deals estão caindo.</>,
            });
        }
        if (m.stalledNegotiations.length > 0) bullets.push({ tone: "warn", text: `${m.stalledNegotiations.length} negociação(ões) parada(s) há mais de 7 dias.` });
        if (m.hotStalled.length > 0) bullets.push({ tone: "warn", text: `${m.hotStalled.length} lead(s) quente(s) sem movimento há dias.` });
        if (m.stalledProposals.length > 0) bullets.push({ tone: "warn", text: `${m.stalledProposals.length} proposta(s)/visita(s) que precisam avançar.` });
        if (m.openCount > 0 && m.wonCount === 0) bullets.push({ tone: "muted", text: "Nenhum ganho registrado no período." });
        if (m.decided > 0 && m.decided < 3) bullets.push({ tone: "muted", text: `Win rate com base pequena (${m.decided} decididos) — ainda é amostra, não tendência.` });
        if (bullets.length === 0 && m.openCount > 0) bullets.push({ tone: "eva", text: "Pipeline fluindo: nada parado há mais de 7 dias." });

        let headline: string;
        if (m.openCount === 0) headline = "Comece registrando os primeiros leads.";
        else if (m.funnelReliable && m.bottleneck && m.bottleneck.pct !== null) headline = `Destrave ${stageLbl(m.bottleneck.fromId, m.bottleneck.fromLabel)} → ${stageLbl(m.bottleneck.toId, m.bottleneck.toLabel)} — é onde os deals param.`;
        else if (m.stalledNegotiations.length + m.hotStalled.length > 0) headline = "Mexa nas oportunidades paradas antes que esfriem.";
        else if (m.wonCount === 0) headline = "Foco em fechar as oportunidades abertas.";
        else headline = "Mantenha o ritmo de avanço do pipeline.";

        return { headline, bullets };
    }, [m, stageLbl]);

    const periodFilter = (
        <div className="flex flex-wrap items-center gap-2">
            <PeriodToggle value={dateRange} onChange={setDateRange} longLabels />
            <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom" />
        </div>
    );

    const headerBlock = (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#0B1220] tracking-tight">Performance Comercial</h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1556C0]/10 text-[#1556C0]">
                        {isManager ? "Visão da empresa" : "Minha performance"}
                    </span>
                </div>
                <p className="text-[13px] text-slate-500 mt-1">
                    Entenda resultado, funil e ritmo do time em tempo real.
                    {/* Metas/Ranking saíram do menu principal (erasure 2026-07-17);
                        seguem descobríveis daqui. */}
                    <span className="ml-2">
                        <button onClick={() => navigate("/metas")} className="font-semibold text-[#1556C0] hover:underline">Metas</button>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <button onClick={() => navigate("/ranking")} className="font-semibold text-[#1556C0] hover:underline">Ranking</button>
                    </span>
                </p>
            </div>
            {periodFilter}
        </div>
    );

    // Skeleton enquanto os dados carregam (sem gráficos vazios).
    if (isLoading && !perf) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] -m-3 sm:-m-4 md:-m-6 p-3 sm:p-4 md:p-6 space-y-5">
                {headerBlock}
                <PerformanceSkeleton />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] -m-3 sm:-m-4 md:-m-6 p-3 sm:p-4 md:p-6 space-y-5">
            {/* 1. Header */}
            {headerBlock}

            {/* 2. Alerta de topo: pipeline sem dono (o fato mais importante da tela) */}
            {isManager && m.unassigned && m.unassigned.count > 0 && (
                <button
                    type="button"
                    onClick={() => navigate("/pipeline")}
                    className="w-full text-left flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100/70"
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 flex-shrink-0">
                        <UserX className="h-5 w-5 text-rose-600" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-[#0B1220]">
                            {m.unassigned.count} {m.unassigned.count === 1 ? "oportunidade" : "oportunidades"} sem responsável · {formatCurrencyCompact(m.unassigned.value)}
                        </p>
                        <p className="text-[12.5px] text-slate-600 mt-0.5">Ninguém está conduzindo esses deals. Distribua para o time avançar.</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose-600 shrink-0">
                        Distribuir <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </button>
            )}

            {/* 3. KPIs com tendência */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <TrendKpi label="Pipeline ativo" value={formatCurrencyCompact(m.pipelineValue)}
                    context={`${m.openCount} ${m.openCount === 1 ? "oportunidade aberta" : "oportunidades abertas"}`}
                    trend={trends.perf_pipeline} goodWhenUp formatDelta={(a) => formatCurrencyCompact(a)} />
                <TrendKpi label="Win rate"
                    value={m.winRate !== null ? `${m.winRate}%` : "Sem base"}
                    context={m.winRate !== null ? `${m.wonCount} ganhos / ${m.decided} decididos` : `${m.wonCount} ganhos no período`}
                    tone={m.winRate === null ? "muted" : "default"}
                    trend={trends.perf_winrate} goodWhenUp formatDelta={(a) => `${a} pts`} />
                <TrendKpi label="Ciclo médio"
                    value={m.avgCycle !== null ? `${m.avgCycle} dias` : "Sem histórico"}
                    context={m.avgCycle !== null ? "da criação ao ganho" : "ainda sem vendas fechadas"}
                    tone={m.avgCycle === null ? "muted" : "default"}
                    trend={trends.perf_cycle} goodWhenUp={false} formatDelta={(a) => `${a}d`} />
                <TrendKpi label="Forecast"
                    value={m.forecast !== null ? formatCurrencyCompact(m.forecast) : "—"}
                    context={m.forecast !== null ? "projeção pelo win rate" : "precisa de histórico de ganhos"}
                    tone={m.forecast === null ? "muted" : "default"}
                    trend={trends.perf_forecast} goodWhenUp formatDelta={(a) => formatCurrencyCompact(a)} />
            </div>

            {/* 4. Funil de conversão + Leitura da EVA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <Panel className="lg:col-span-2">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-slate-400" />
                                <h2 className="text-[13px] font-semibold text-[#0B1220]">Funil de conversão</h2>
                            </div>
                            <p className="text-[12px] text-slate-500 mt-0.5">Passagem entre etapas (snapshot do pipeline atual)</p>
                        </div>
                        {m.openCount > 0 && (
                            <button onClick={() => navigate("/pipeline")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1556C0] hover:underline shrink-0">
                                Abrir pipeline <ArrowRight className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {m.openCount === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-[13px] text-slate-500 mb-3">Ainda não há oportunidades abertas para analisar o funil.</p>
                            <button onClick={() => navigate("/pipeline")} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold bg-[#1556C0] text-white hover:brightness-110 transition">
                                <Plus className="h-4 w-4" /> Criar oportunidade
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-8 pb-4 mb-4 border-b border-[#F1F5F9]">
                                <div>
                                    <p className="text-[11px] text-slate-500">Pipeline total</p>
                                    <p className="text-[20px] font-bold text-[#0B1220] tabular-nums leading-tight">{formatCurrencyCompact(m.pipelineValue)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Oportunidades</p>
                                    <p className="text-[20px] font-bold text-[#0B1220] tabular-nums leading-tight">{m.openCount} abertas</p>
                                </div>
                            </div>

                            {!m.funnelReliable ? (
                                <p className="text-[12.5px] text-slate-500 py-2 leading-relaxed">
                                    Ainda há poucas oportunidades para medir a passagem entre etapas com segurança. Conforme o pipeline cresce, a conversão de cada etapa aparece aqui.
                                </p>
                            ) : (
                                <div className="space-y-2.5">
                                    {m.conversions.map((c) => {
                                        const isBottleneck = m.bottleneck?.fromId === c.fromId;
                                        const weak = c.base < MIN_TRANSITION_BASE;
                                        return (
                                            <div key={c.fromId} className={`rounded-xl px-3 py-2.5 -mx-1 ${isBottleneck ? "bg-rose-50 ring-1 ring-rose-200" : ""}`}>
                                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                                    <span className="text-[13px] font-medium text-[#0B1220] min-w-0 truncate">
                                                        {stageLbl(c.fromId, c.fromLabel)} <span className="text-slate-400">→</span> {stageLbl(c.toId, c.toLabel)}
                                                    </span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {isBottleneck && <span className="text-[10.5px] font-semibold text-rose-600">maior queda</span>}
                                                        <span className={`text-[14px] font-bold tabular-nums ${isBottleneck ? "text-rose-600" : weak ? "text-slate-400" : "text-[#0B1220]"}`}>
                                                            {c.pct !== null ? `${c.pct}%` : "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${c.pct ?? 0}%`, background: isBottleneck ? "#E11D48" : "#94A3B8" }} />
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    de {c.base} {c.base === 1 ? "oportunidade" : "oportunidades"}{isBottleneck ? " · é aqui que os deals caem" : weak ? " · base pequena" : ""}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </Panel>

                {/* Leitura da EVA — única voz de insight (gargalo + atenção, num lugar só) */}
                <Panel className="bg-[#FAF5FF] border-[#E9D5FF]">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED] text-white text-[8px] font-bold leading-none">E</span>
                        <h2 className="text-[13px] font-semibold text-[#7C3AED]">Leitura da EVA</h2>
                    </div>
                    {m.openCount === 0 ? (
                        <p className="text-[12.5px] text-slate-500">Quando houver oportunidades no funil, a EVA aponta o gargalo e o que destravar aqui.</p>
                    ) : (
                        <>
                            <p className="text-[13px] font-semibold text-[#0B1220] leading-snug mb-3">{eva.headline}</p>
                            <ul className="space-y-2 text-[12.5px] text-slate-600">
                                {eva.bullets.map((b, i) => (
                                    <li key={i} className="flex gap-1.5">
                                        <span className={`mt-px ${b.tone === "warn" ? "text-amber-500" : b.tone === "muted" ? "text-slate-400" : "text-[#7C3AED]"}`}>•</span>
                                        <span>{b.text}</span>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => navigate("/pipeline")} className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:underline">
                                Abrir pipeline <ArrowRight className="h-3 w-3" />
                            </button>
                        </>
                    )}
                    <p className="text-[10px] text-[#7C3AED]/70 mt-3 pt-3 border-t border-[#E9D5FF]">A EVA aponta tendências. As decisões seguem com o time.</p>
                </Panel>
            </div>

            {/* 5. Performance do time / Minha performance */}
            <Panel title={isManager ? "Performance do time" : "Minha performance"} icon={Users}>
                {isManager ? (
                    (() => {
                        const owners = [...m.byOwner.entries()].filter(([uid]) => uid !== "none").sort((a, b) => b[1].value - a[1].value);
                        if (owners.length === 0) {
                            return (
                                <p className="text-[13px] text-slate-500">
                                    {m.unassigned && m.unassigned.count > 0
                                        ? "Distribua as oportunidades acima para montar o ranking do time."
                                        : "Nenhuma oportunidade aberta para distribuir entre o time."}
                                </p>
                            );
                        }
                        return (
                            <ul className="divide-y divide-[#F1F5F9]">
                                {owners.map(([uid, agg]) => {
                                    const stalled = m.open.filter((d) => (d.user_id ?? "none") === uid && daysSince(d.updated_at) > 7).length;
                                    return (
                                        <li key={uid} className="flex items-center justify-between gap-3 py-2.5">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-[#0B1220] truncate">{sellerName(uid)}</p>
                                                <p className="text-[12px] text-slate-500">{agg.count} oportunidade(s) · {formatCurrencyCompact(agg.value)}</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${stalled > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-[#10B981]/10 text-[#0F8A63] border border-[#10B981]/20"}`}>
                                                {stalled > 0 ? `${stalled} parado(s)` : "Em dia"}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        );
                    })()
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[11px] text-slate-500">Minhas oportunidades</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{m.openCount}</p></div>
                        <div><p className="text-[11px] text-slate-500">Meu pipeline</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{formatCurrencyCompact(m.pipelineValue)}</p></div>
                        <div><p className="text-[11px] text-slate-500">Deals parados</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{m.anyStalled.length}</p></div>
                        <div><p className="text-[11px] text-slate-500">Leads quentes</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{m.visibleOpen.filter((d) => d.is_hot).length}</p></div>
                    </div>
                )}
            </Panel>

            {/* 6. Ritmo comercial */}
            <Panel title="Ritmo comercial" icon={Clock}>
                {m.open.length + m.wonCount >= 3 ? (
                    <GoldenHoursHeatmap dateRange={dateRange} />
                ) : (
                    <p className="text-[13px] text-slate-500 py-4">Volume insuficiente para calcular horários de maior atividade. Quando houver mais conversas e oportunidades, o ritmo aparece aqui.</p>
                )}
            </Panel>
        </div>
    );
};

export default SalesPerformanceCenter;
