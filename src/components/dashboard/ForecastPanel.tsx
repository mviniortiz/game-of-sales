// ForecastPanel
// Pipeline ponderado por mês de expected_close_date.
// Dado vem da RPC forecast_by_month (SECURITY DEFINER, autoriza pela company).

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Target } from "lucide-react";

type ForecastRow = {
    month_start: string;
    won_value: number;
    weighted_value: number;
    pipeline_value: number;
    deal_count: number;
};

interface ForecastPanelProps {
    companyId: string | null | undefined;
    monthsAhead?: number;
    goalValue?: number | null;
}

const formatCurrencyCompact = (n: number) => {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace(".", ",")}k`;
    return `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
};

const formatCurrency = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
    }).format(n);

const monthLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
};

export function ForecastPanel({ companyId, monthsAhead = 6, goalValue }: ForecastPanelProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["forecast_by_month", companyId, monthsAhead],
        queryFn: async () => {
            if (!companyId) return [] as ForecastRow[];
            const { data, error } = await supabase.rpc("forecast_by_month", {
                p_company_id: companyId,
                p_months_ahead: monthsAhead,
            });
            if (error) throw error;
            return (data ?? []) as unknown as ForecastRow[];
        },
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000,
    });

    const { totals, chartData, coverage } = useMemo(() => {
        const rows = data ?? [];
        const totalWon = rows.reduce((a, r) => a + Number(r.won_value || 0), 0);
        const totalWeighted = rows.reduce((a, r) => a + Number(r.weighted_value || 0), 0);
        const totalPipeline = rows.reduce((a, r) => a + Number(r.pipeline_value || 0), 0);
        const totalProjected = totalWon + totalWeighted;
        const coverage =
            goalValue && goalValue > 0 ? Math.round((totalProjected / goalValue) * 100) : null;

        const chartData = rows.map((r) => ({
            month: monthLabel(r.month_start),
            won: Number(r.won_value || 0),
            weighted: Number(r.weighted_value || 0),
            pipeline: Number(r.pipeline_value || 0),
        }));

        return {
            totals: { totalWon, totalWeighted, totalPipeline, totalProjected },
            chartData,
            coverage,
        };
    }, [data, goalValue]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center">
                        <p className="text-sm text-muted-foreground">
                            Sem deals com data de fechamento prevista nos próximos {monthsAhead}{" "}
                            meses.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Defina <span className="font-mono">expected_close_date</span> nos deals
                            pra gerar o forecast.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            Forecast · próximos {monthsAhead} meses
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Fechado + ponderado pela probabilidade de cada deal em aberto
                        </p>
                    </div>
                    {coverage !== null && goalValue && (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 px-3 py-1.5">
                            <Target className="h-3.5 w-3.5 text-emerald-400" />
                            <div className="text-right leading-tight">
                                <div className="text-xs text-muted-foreground">
                                    Meta {formatCurrencyCompact(goalValue)}
                                </div>
                                <div
                                    className={`text-sm font-bold tabular-nums ${
                                        coverage >= 100
                                            ? "text-emerald-400"
                                            : coverage >= 70
                                            ? "text-amber-400"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {coverage}% projetado
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <TotalTile
                        label="Projetado total"
                        value={formatCurrency(totals.totalProjected)}
                        tone="emerald"
                    />
                    <TotalTile
                        label="Já fechado"
                        value={formatCurrency(totals.totalWon)}
                        tone="neutral"
                    />
                    <TotalTile
                        label="Ponderado em aberto"
                        value={formatCurrency(totals.totalWeighted)}
                        tone="blue"
                    />
                    <TotalTile
                        label="Pipeline bruto"
                        value={formatCurrency(totals.totalPipeline)}
                        tone="muted"
                    />
                </div>

                {/* Stacked bar chart */}
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="forecast-won" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.95} />
                                    <stop offset="100%" stopColor="hsl(160, 84%, 35%)" stopOpacity={0.85} />
                                </linearGradient>
                                <linearGradient id="forecast-weighted" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(213, 94%, 60%)" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="hsl(213, 94%, 50%)" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={formatCurrencyCompact}
                                width={70}
                            />
                            <Tooltip
                                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                                content={<CustomTooltip />}
                            />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                            />
                            <Bar
                                dataKey="won"
                                stackId="f"
                                fill="url(#forecast-won)"
                                radius={[0, 0, 0, 0]}
                                name="Fechado"
                            />
                            <Bar
                                dataKey="weighted"
                                stackId="f"
                                fill="url(#forecast-weighted)"
                                radius={[6, 6, 0, 0]}
                                name="Ponderado"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function TotalTile({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "emerald" | "blue" | "neutral" | "muted";
}) {
    const toneClasses = {
        emerald: "text-emerald-500 dark:text-emerald-400",
        blue: "text-blue-500 dark:text-blue-400",
        neutral: "text-foreground",
        muted: "text-muted-foreground",
    } as const;
    return (
        <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {label}
            </div>
            <div className={`text-base font-bold tabular-nums mt-0.5 ${toneClasses[tone]}`}>
                {value}
            </div>
        </div>
    );
}

type TooltipPayload = {
    name: string;
    value: number;
    color: string;
    dataKey: string;
};

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) return null;
    const total = payload.reduce((a, p) => a + (p.value || 0), 0);
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
            <div className="text-xs font-semibold mb-1">{label}</div>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex items-center gap-2 text-xs">
                    <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                    />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-mono font-semibold">{formatCurrency(p.value)}</span>
                </div>
            ))}
            <div className="mt-1 pt-1 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-bold">{formatCurrency(total)}</span>
            </div>
        </div>
    );
}
