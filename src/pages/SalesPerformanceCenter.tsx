import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    DollarSign,
    TrendingUp,
    Target,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Users,
    ArrowRight,
    Flame,
    Activity,
    Plus,
} from "lucide-react";
import { startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleSellers } from "@/hooks/useVisibleSellers";
import { stageLabelFor } from "@/lib/demoPipeline";
import { GoldenHoursHeatmap } from "@/components/dashboard/GoldenHoursHeatmap";
import { PeriodToggle, DateRangePicker } from "@/components/filters";

// ─── Formatação ──────────────────────────────────────────────────────────────
const formatCurrencyCompact = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};
const daysSince = (iso?: string | null) => (iso ? differenceInDays(new Date(), new Date(iso)) : 0);

// Etapas abertas do funil (IDs fixos do banco; label relabelado por company).
const OPEN_STAGE_DEFS = [
    { id: "lead", label: "Lead", color: "#94A3B8" },
    { id: "qualification", label: "Qualificação", color: "#1556C0" },
    { id: "proposal", label: "Proposta", color: "#7C3AED" },
    { id: "negotiation", label: "Negociação", color: "#F59E0B" },
];

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

// ─── KPI interpretativo ──────────────────────────────────────────────────────
const Kpi = ({ label, value, context, tone = "default" }: {
    label: string;
    value: string;
    context: string;
    tone?: "default" | "muted" | "positive";
}) => (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-[22px] font-bold leading-tight mt-1 tabular-nums ${tone === "muted" ? "text-slate-400" : tone === "positive" ? "text-[#10B981]" : "text-[#0B1220]"}`}>
            {value}
        </p>
        <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{context}</p>
    </div>
);

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
        const cycles = won.map((d: any) => differenceInDays(new Date(d.updated_at), new Date(d.created_at)));
        const avgCycle = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null;
        const forecast = winRate !== null ? pipelineValue * (winRate / 100) : null;

        const funnelAll = OPEN_STAGE_DEFS.map((s) => {
            const deals = visibleOpen.filter((d) => d.stage === s.id);
            return { ...s, count: deals.length, value: deals.reduce((a, d) => a + (Number(d.value) || 0), 0) };
        });
        const funnel = funnelAll.filter((s) => s.count > 0);
        const maxFunnelValue = Math.max(1, ...funnel.map((s) => s.value));
        const topByValue = funnel.slice().sort((a, b) => b.value - a.value)[0] ?? null;
        const topByCount = funnel.slice().sort((a, b) => b.count - a.count)[0] ?? null;

        // Atenção
        const stalledProposals = visibleOpen.filter((d) => d.stage === "proposal" && daysSince(d.updated_at) > 7);
        const stalledNegotiations = visibleOpen.filter((d) => d.stage === "negotiation" && daysSince(d.updated_at) > 7);
        const hotStalled = visibleOpen.filter((d) => d.is_hot && daysSince(d.updated_at) > 5);
        const anyStalled = visibleOpen.filter((d) => daysSince(d.updated_at) > 7);

        // Time (por responsável) — só gestor
        const byOwner = new Map<string, { count: number; value: number }>();
        for (const d of open) {
            const k = d.user_id ?? "none";
            const cur = byOwner.get(k) ?? { count: 0, value: 0 };
            cur.count += 1; cur.value += Number(d.value) || 0;
            byOwner.set(k, cur);
        }

        return {
            open, visibleOpen, pipelineValue, openCount, wonCount, wonValue, lostCount, decided,
            winRate, avgCycle, forecast, funnel, funnelAll, maxFunnelValue, topByValue, topByCount,
            stalledProposals, stalledNegotiations, hotStalled, anyStalled, byOwner,
        };
    }, [perf, isManager, user?.id]);

    const sellerName = (id: string) => sellers.find((s) => s.id === id)?.nome ?? "Sem responsável definido";

    // Resumo executivo determinístico
    const summary = useMemo(() => {
        if (!perf) return "Carregando o panorama da operação…";
        const parts: string[] = [];
        parts.push(`${formatCurrencyCompact(m.pipelineValue)} em pipeline ativo`);
        parts.push(`${m.openCount} ${m.openCount === 1 ? "oportunidade aberta" : "oportunidades abertas"}`);
        parts.push(m.wonCount > 0
            ? `${m.wonCount} ${m.wonCount === 1 ? "venda" : "vendas"} no período (${formatCurrencyCompact(m.wonValue)})`
            : "nenhuma venda registrada no período");
        let leitura = "";
        if (m.openCount === 0) {
            leitura = "Ainda não há oportunidades no funil — comece registrando os primeiros leads.";
        } else if (m.wonCount === 0) {
            leitura = "A operação ainda está em fase inicial: acompanhe o avanço de propostas, visitas e follow-ups.";
        } else {
            leitura = `Win rate de ${m.winRate}% no período. Mantenha o ritmo de avanço das oportunidades abertas.`;
        }
        return `${parts.join(", ")}. ${leitura}`;
    }, [perf, m]);

    // Itens de atenção
    const attention = useMemo(() => {
        const items: { sev: "high" | "mid"; text: string }[] = [];
        if (m.stalledNegotiations.length > 0) items.push({ sev: "high", text: `${m.stalledNegotiations.length} negociação(ões) parada(s) há mais de 7 dias` });
        if (m.hotStalled.length > 0) items.push({ sev: "high", text: `${m.hotStalled.length} lead(s) quente(s) sem movimento há dias` });
        if (m.stalledProposals.length > 0) items.push({ sev: "mid", text: `${m.stalledProposals.length} proposta(s) sem follow-up recente` });
        if (m.openCount > 0 && m.wonCount === 0) items.push({ sev: "mid", text: "Nenhum ganho registrado no período" });
        return items;
    }, [m]);

    const periodFilter = (
        <div className="flex flex-wrap items-center gap-2">
            <PeriodToggle value={dateRange} onChange={setDateRange} longLabels />
            <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Custom" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] -m-3 sm:-m-4 md:-m-6 p-3 sm:p-4 md:p-6 space-y-5">
            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#0B1220] tracking-tight">Performance Comercial</h1>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1556C0]/10 text-[#1556C0]">
                            {isManager ? "Visão da empresa" : "Minha performance"}
                        </span>
                    </div>
                    <p className="text-[13px] text-slate-500 mt-1">Entenda resultado, funil e ritmo do time em tempo real.</p>
                </div>
                {periodFilter}
            </div>

            {/* 2. Executive summary */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1556C0]/10 flex-shrink-0">
                        <Activity className="h-5 w-5 text-[#1556C0]" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Resumo do período</p>
                        <p className="text-[14px] text-[#0B1220] leading-relaxed">{summary}</p>
                    </div>
                </div>
            </div>

            {/* 3. KPIs interpretativos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Kpi label="Pipeline ativo" value={formatCurrencyCompact(m.pipelineValue)}
                    context={`${m.openCount} ${m.openCount === 1 ? "oportunidade aberta" : "oportunidades abertas"}`} />
                <Kpi label="Conversão"
                    value={m.winRate !== null ? `${m.winRate}%` : "Sem base"}
                    context={m.winRate !== null ? `${m.wonCount} ganhos / ${m.decided} decididos` : `${m.wonCount} ganhos no período`}
                    tone={m.winRate === null ? "muted" : "default"} />
                <Kpi label="Ciclo médio"
                    value={m.avgCycle !== null ? `${m.avgCycle} dias` : "Sem histórico"}
                    context={m.avgCycle !== null ? "da criação ao ganho" : "ainda sem vendas fechadas"}
                    tone={m.avgCycle === null ? "muted" : "default"} />
                <Kpi label="Forecast"
                    value={m.forecast !== null ? formatCurrencyCompact(m.forecast) : "—"}
                    context={m.forecast !== null ? "projeção pelo win rate" : "precisa de histórico de ganhos"}
                    tone={m.forecast === null ? "muted" : "default"} />
            </div>

            {/* 4. História do funil + Leitura da EVA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel className="lg:col-span-2">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-slate-400" />
                                <h2 className="text-[13px] font-semibold text-[#0B1220]">Mapa do funil</h2>
                            </div>
                            <p className="text-[12px] text-slate-500 mt-0.5">Distribuição de valor e oportunidades por etapa</p>
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

                            <div className="space-y-3.5">
                                {m.funnelAll.map((s) => {
                                    const pct = m.pipelineValue > 0 ? Math.round((s.value / m.pipelineValue) * 100) : 0;
                                    const isTopValue = m.topByValue?.id === s.id && s.count > 0;
                                    const insight =
                                        s.count === 0 ? { text: "Sem oportunidades nesta etapa", cls: "text-slate-400" }
                                        : isTopValue ? { text: "Maior concentração de valor", cls: "text-[#1556C0]" }
                                        : m.topByCount?.id === s.id ? { text: "Maior volume de oportunidades", cls: "text-[#1556C0]" }
                                        : (s.id === "proposal" || s.id === "negotiation") ? { text: "Follow-up recomendado", cls: "text-amber-600" }
                                        : { text: "Precisa avançar qualificação", cls: "text-slate-400" };
                                    return (
                                        <div key={s.id} className={`rounded-xl px-3 py-2.5 -mx-1 ${isTopValue ? "bg-[#1556C0]/[0.04] ring-1 ring-[#1556C0]/15" : ""}`}>
                                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[13px] font-semibold text-[#0B1220]">{stageLabelFor(activeCompanyId, s.id, s.label)}</span>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 text-slate-600">
                                                        {s.count} {s.count === 1 ? "oportunidade" : "oportunidades"}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0 tabular-nums">
                                                    <span className="text-[14px] font-bold text-[#0B1220]">{formatCurrencyCompact(s.value)}</span>
                                                    <span className="text-[12px] text-slate-400 ml-1.5">{pct}%</span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${s.count === 0 ? 0 : Math.max(4, (s.value / m.maxFunnelValue) * 100)}%`, background: s.color }} />
                                            </div>
                                            <p className={`text-[11px] mt-1 ${insight.cls}`}>{insight.text}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </Panel>

                <Panel className="bg-[#FAF5FF] border-[#E9D5FF]">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED] text-white text-[8px] font-bold leading-none">E</span>
                        <h2 className="text-[13px] font-semibold text-[#7C3AED]">Leitura da EVA</h2>
                    </div>
                    {m.funnel.length === 0 ? (
                        <p className="text-[12.5px] text-slate-500">Quando houver oportunidades no funil, a EVA aponta concentração e gargalos aqui.</p>
                    ) : (
                        <ul className="space-y-2 text-[12.5px] text-slate-600">
                            {m.topByValue && <li className="flex gap-1.5"><span className="text-[#7C3AED] mt-px">•</span><span>Maior valor concentrado em <strong className="text-[#0B1220]">{stageLabelFor(activeCompanyId, m.topByValue.id, m.topByValue.label)}</strong> ({formatCurrencyCompact(m.topByValue.value)}).</span></li>}
                            <li className="flex gap-1.5"><span className="text-[#7C3AED] mt-px">•</span><span>Prioridade: avançar oportunidades para a próxima etapa.</span></li>
                            {m.anyStalled.length > 0 && <li className="flex gap-1.5"><span className="text-amber-500 mt-px">•</span><span>{m.anyStalled.length} oportunidade(s) parada(s) há mais de 7 dias — possível gargalo.</span></li>}
                            {m.wonCount === 0 && <li className="flex gap-1.5"><span className="text-slate-400 mt-px">•</span><span>Histórico ainda insuficiente para medir conversão real.</span></li>}
                        </ul>
                    )}
                    <p className="text-[10px] text-[#7C3AED]/70 mt-3 pt-3 border-t border-[#E9D5FF]">A EVA aponta tendências. As decisões seguem com o time.</p>
                </Panel>
            </div>

            {/* 5. Atenção do gestor */}
            <Panel title="Atenção do gestor" icon={AlertTriangle}
                action={attention.length > 0 ? (
                    <button onClick={() => navigate("/pipeline")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1556C0] hover:underline">
                        Abrir pipeline <ArrowRight className="h-3 w-3" />
                    </button>
                ) : undefined}>
                {attention.length === 0 ? (
                    <div className="flex items-center gap-2 text-[13px] text-[#10B981]">
                        <CheckCircle2 className="h-4 w-4" />
                        Tudo em dia. Nenhum deal parado há mais de 7 dias.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {attention.map((a, i) => (
                            <li key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border" style={{
                                background: a.sev === "high" ? "rgba(244,63,94,0.05)" : "rgba(245,158,11,0.06)",
                                borderColor: a.sev === "high" ? "rgba(244,63,94,0.2)" : "rgba(245,158,11,0.25)",
                            }}>
                                <span className={`h-1.5 w-1.5 rounded-full ${a.sev === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
                                <span className="text-[13px] text-[#0B1220] flex-1">{a.text}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {/* 6. Performance do time / Minha performance */}
            <Panel title={isManager ? "Performance do time" : "Minha performance"} icon={Users}>
                {isManager ? (
                    m.byOwner.size === 0 ? (
                        <p className="text-[13px] text-slate-500">Nenhuma oportunidade aberta para distribuir entre o time.</p>
                    ) : (
                        <ul className="divide-y divide-[#F1F5F9]">
                            {[...m.byOwner.entries()].sort((a, b) => b[1].value - a[1].value).map(([uid, agg]) => {
                                const stalled = m.open.filter((d) => (d.user_id ?? "none") === uid && daysSince(d.updated_at) > 7).length;
                                return (
                                    <li key={uid} className="flex items-center justify-between gap-3 py-2.5">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-[#0B1220] truncate">{uid === "none" ? "Sem responsável definido" : sellerName(uid)}</p>
                                            <p className="text-[12px] text-slate-500">{agg.count} oportunidade(s) · {formatCurrencyCompact(agg.value)}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${stalled > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-[#10B981]/10 text-[#0F8A63] border border-[#10B981]/20"}`}>
                                            {stalled > 0 ? `${stalled} parado(s)` : "Em dia"}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[11px] text-slate-500">Minhas oportunidades</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{m.openCount}</p></div>
                        <div><p className="text-[11px] text-slate-500">Meu pipeline</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{formatCurrencyCompact(m.pipelineValue)}</p></div>
                        <div><p className="text-[11px] text-slate-500">Deals parados</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{m.anyStalled.length}</p></div>
                        <div><p className="text-[11px] text-slate-500">Leads quentes</p><p className="text-[18px] font-bold text-[#0B1220] tabular-nums">{m.visibleOpen.filter((d) => d.is_hot).length}</p></div>
                    </div>
                )}
            </Panel>

            {/* 7. Ritmo comercial */}
            <Panel title="Ritmo comercial" icon={Clock}>
                {m.open.length + m.wonCount >= 3 ? (
                    <GoldenHoursHeatmap dateRange={dateRange} />
                ) : (
                    <p className="text-[13px] text-slate-500 py-4">Volume insuficiente para calcular horários de maior atividade. Quando houver mais conversas e oportunidades, o ritmo aparece aqui.</p>
                )}
            </Panel>

            {isLoading && <p className="text-[12px] text-slate-400 text-center">Carregando dados…</p>}
        </div>
    );
};

export default SalesPerformanceCenter;
