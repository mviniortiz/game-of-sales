import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, TrendingUp, TrendingDown, Target, ChevronRight } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface ConversionFunnelDonutProps {
    dateRange?: { from?: Date; to?: Date };
}

const STAGE_CONFIG: Record<string, { color: string; gradient: string; label: string; icon?: string }> = {
    lead: {
        color: "#64748b",
        gradient: "from-slate-500 to-slate-600",
        label: "Lead"
    },
    qualification: {
        color: "#3b82f6",
        gradient: "from-blue-500 to-blue-600",
        label: "Qualificado"
    },
    proposal: {
        color: "#10b981",
        gradient: "from-emerald-500 to-emerald-600",
        label: "Proposta"
    },
    negotiation: {
        color: "#f59e0b",
        gradient: "from-amber-500 to-orange-500",
        label: "Negociação"
    },
    closed_won: {
        color: "#10b981",
        gradient: "from-emerald-500 to-green-600",
        label: "Ganho",
        icon: "✓"
    },
    closed_lost: {
        color: "#ef4444",
        gradient: "from-red-500 to-rose-600",
        label: "Perdido",
        icon: "×"
    },
};

const formatCurrency = (value: number) => {
    if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export const ConversionFunnelDonut = ({ dateRange }: ConversionFunnelDonutProps) => {
    const { activeCompanyId } = useTenant();

    const { data: funnelData, isLoading } = useQuery({
        queryKey: ["conversion-funnel", activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return [];

            const { data: deals, error } = await supabase
                .from("deals")
                .select("stage, value")
                .eq("company_id", activeCompanyId);

            if (error) throw error;

            const stageMap = new Map<string, { count: number; value: number }>();

            (deals || []).forEach((deal) => {
                const stage = deal.stage || "lead";
                const current = stageMap.get(stage) || { count: 0, value: 0 };
                current.count++;
                current.value += Number(deal.value) || 0;
                stageMap.set(stage, current);
            });

            return Array.from(stageMap.entries())
                .map(([stage, data]) => ({
                    name: STAGE_CONFIG[stage]?.label || stage,
                    stage,
                    value: data.count,
                    totalValue: data.value,
                    color: STAGE_CONFIG[stage]?.color || "#6b7280",
                    gradient: STAGE_CONFIG[stage]?.gradient || "from-gray-500 to-gray-600",
                }))
                .sort((a, b) => {
                    const order = ["lead", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"];
                    return order.indexOf(a.stage) - order.indexOf(b.stage);
                });
        },
        enabled: !!activeCompanyId,
    });

    const totalDeals = funnelData?.reduce((acc, item) => acc + item.value, 0) || 0;
    const totalValue = funnelData?.reduce((acc, item) => acc + item.totalValue, 0) || 0;
    const wonDeals = funnelData?.find((item) => item.stage === "closed_won")?.value || 0;
    const lostDeals = funnelData?.find((item) => item.stage === "closed_lost")?.value || 0;
    const closedDeals = wonDeals + lostDeals;
    const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;
    const pipelineValue = funnelData
        ?.filter(item => !["closed_won", "closed_lost"].includes(item.stage))
        .reduce((acc, item) => acc + item.totalValue, 0) || 0;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = totalDeals > 0 ? ((data.value / totalDeals) * 100).toFixed(1) : "0";
            return (
                <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: data.color }}
                        />
                        <p className="font-semibold text-white">{data.name}</p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-xs text-muted-foreground">Quantidade</span>
                            <span className="text-sm font-semibold text-white">{data.value} deals</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <span className="text-xs text-muted-foreground">Percentual</span>
                            <span className="text-sm font-semibold text-emerald-400">{percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-700">
                            <span className="text-xs text-muted-foreground">Valor Total</span>
                            <span className="text-sm font-bold text-emerald-400">{formatCurrencyFull(data.totalValue)}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="relative overflow-hidden border border-slate-800 bg-slate-900/95 backdrop-blur-sm shadow-xl rounded-2xl">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/5 to-transparent blur-2xl pointer-events-none" />

            <CardHeader className="pb-2 relative">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 ring-1 ring-emerald-500/20">
                                <Filter className="h-4 w-4 text-emerald-400" />
                            </div>
                            <span>Funil de Conversão</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-2 ml-11">
                            Distribuição e valor de deals por estágio
                        </p>
                    </div>

                    {/* Pipeline Value */}
                    <div className="text-right bg-slate-800/50 px-3 py-2 rounded-xl ring-1 ring-slate-700/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline Ativo</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(pipelineValue)}</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-2 relative">
                {isLoading ? (
                    <div className="flex items-center gap-6">
                        <Skeleton className="w-44 h-44 rounded-full bg-slate-800/50" />
                        <div className="flex-1 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full bg-slate-800/50" />
                            ))}
                        </div>
                    </div>
                ) : totalDeals === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-slate-800/50 mb-4">
                            <Target className="h-8 w-8 text-slate-600" />
                        </div>
                        <p className="text-sm text-muted-foreground">Nenhum deal cadastrado</p>
                        <p className="text-xs text-slate-600 mt-1">Comece adicionando seus primeiros deals</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        {/* Chart with center stats */}
                        <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={funnelData || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                        animationBegin={0}
                                        animationDuration={800}
                                    >
                                        {(funnelData || []).map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center stat */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-emerald-400' : winRate >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                                        {winRate.toFixed(0)}%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        {winRate >= 50 ? (
                                            <TrendingUp className="h-3 w-3 text-emerald-400" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 text-rose-400" />
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                            {wonDeals}/{closedDeals}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Legend */}
                        <div className="flex-1 space-y-1.5">
                            {(funnelData || []).map((item, index) => {
                                const percentage = totalDeals > 0 ? ((item.value / totalDeals) * 100).toFixed(0) : "0";
                                return (
                                    <div
                                        key={item.stage}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group cursor-default"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div
                                            className={`w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-slate-900`}
                                            style={{ backgroundColor: item.color, ringColor: item.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <p className="text-xs text-foreground font-medium truncate">
                                                    {item.name}
                                                </p>
                                                {STAGE_CONFIG[item.stage]?.icon && (
                                                    <span className={`text-xs ${item.stage === 'closed_won' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {STAGE_CONFIG[item.stage].icon}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Mini progress bar */}
                                            <div className="mt-1 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: item.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-foreground">{item.value}</p>
                                            <p className="text-[10px] text-muted-foreground">{percentage}%</p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer stats */}
                {totalDeals > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deals</p>
                                <p className="text-sm font-bold text-foreground">{totalDeals}</p>
                            </div>
                            <div className="h-6 w-px bg-slate-800" />
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Total</p>
                                <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalValue)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                                ✓ {wonDeals} ganhos
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                                × {lostDeals} perdidos
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
