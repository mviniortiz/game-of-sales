import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    TrendingUp,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    Sparkles,
    Calendar as CalendarIcon,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, startOfWeek, isSameDay, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";
import { GoldenHoursHeatmap } from "@/components/dashboard/GoldenHoursHeatmap";
import { ConversionFunnelDonut } from "@/components/dashboard/ConversionFunnelDonut";
import { TeamPulseSection } from "@/components/dashboard/TeamPulseSection";
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Currency formatters
const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')}M`;
    }
    if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`;
    }
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

// KPI Card with Sparkline
interface KPICardProps {
    title: string;
    value: string;
    fullValue?: string;
    subtitle?: string;
    icon: React.ElementType;
    trend?: number;
    trendLabel?: string;
    iconColor?: string;
    iconBg?: string;
    sparklineData?: number[];
}

const KPICard = ({
    title,
    value,
    fullValue,
    subtitle,
    icon: Icon,
    trend,
    trendLabel,
    iconColor = "text-emerald-400",
    iconBg = "bg-emerald-500/10",
    sparklineData,
}: KPICardProps) => {
    const isPositive = trend && trend > 0;
    const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    const cardContent = (
        <Card className="relative overflow-hidden border border-slate-800 bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-default rounded-xl">
            <CardContent className="relative p-5">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon */}
                    <div className={`relative p-3 rounded-2xl ${iconBg} group-hover:scale-105 transition-all duration-200 ease-out`}>
                        <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 text-right">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">
                            {title}
                        </p>
                        <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight leading-none">
                            {value}
                        </p>

                        {/* Trend or Subtitle */}
                        <div className="flex items-center justify-end gap-2 mt-2">
                            {trend !== undefined && (
                                <span className={`
                  inline-flex items-center gap-0.5 
                  px-2 py-0.5 rounded-full text-[11px] font-semibold
                  ${isPositive
                                        ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20'
                                    }
                `}>
                                    <TrendIcon className="h-3 w-3" />
                                    {Math.abs(trend).toFixed(1)}%
                                </span>
                            )}
                            {(trendLabel || subtitle) && (
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    {trendLabel || subtitle}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sparkline */}
                {sparklineData && sparklineData.length > 0 && (
                    <div className="mt-4 h-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData.map((v, i) => ({ v, i }))}>
                                <defs>
                                    <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={iconColor.includes("emerald") ? "#10b981" : "#10b981"} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={iconColor.includes("emerald") ? "#10b981" : "#10b981"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="v"
                                    stroke={iconColor.includes("emerald") ? "#10b981" : "#10b981"}
                                    strokeWidth={1.5}
                                    fill={`url(#spark-${title})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (fullValue) {
        return (
            <UITooltip>
                <TooltipTrigger asChild>
                    {cardContent}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 border-slate-700 text-white font-mono">
                    {fullValue}
                </TooltipContent>
            </UITooltip>
        );
    }

    return cardContent;
};

const SalesPerformanceCenter = () => {
    const { activeCompanyId } = useTenant();
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const inicioMes = dateRange.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
    const fimMes = dateRange.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

    // Main stats query
    const { data: stats } = useQuery({
        queryKey: ["spc-stats", inicioMes, fimMes, activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return null;

            // Pipeline value (deals not closed)
            const { data: deals } = await supabase
                .from("deals")
                .select("value, stage, created_at")
                .eq("company_id", activeCompanyId)
                .not("stage", "in", "(closed_won,closed_lost)");

            const pipelineValue = deals?.reduce((acc, d) => acc + (Number(d.value) || 0), 0) || 0;

            // Won deals for win rate
            const { data: wonDeals } = await supabase
                .from("deals")
                .select("id, value, created_at, updated_at")
                .eq("company_id", activeCompanyId)
                .eq("stage", "closed_won")
                .gte("updated_at", inicioMes)
                .lte("updated_at", fimMes);

            const { data: lostDeals } = await supabase
                .from("deals")
                .select("id")
                .eq("company_id", activeCompanyId)
                .eq("stage", "closed_lost")
                .gte("updated_at", inicioMes)
                .lte("updated_at", fimMes);

            const wonCount = wonDeals?.length || 0;
            const lostCount = lostDeals?.length || 0;
            const winRate = (wonCount + lostCount) > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

            // Average sales cycle (days from created to won)
            const salesCycles = wonDeals?.map((d) => {
                const created = new Date(d.created_at);
                const updated = new Date(d.updated_at);
                return differenceInDays(updated, created);
            }) || [];
            const avgCycle = salesCycles.length > 0 ? salesCycles.reduce((a, b) => a + b, 0) / salesCycles.length : 0;

            // Forecast (pipeline value * win rate)
            const forecast = pipelineValue * (winRate / 100);

            return {
                pipelineValue,
                winRate,
                avgCycle,
                forecast,
                wonCount,
                wonValue: wonDeals?.reduce((acc, d) => acc + (Number(d.value) || 0), 0) || 0,
            };
        },
        enabled: !!activeCompanyId,
    });

    // Sales evolution
    const { data: salesEvolution } = useQuery({
        queryKey: ["spc-evolution", inicioMes, fimMes, activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return [];

            const { data: vendas } = await supabase
                .from("vendas")
                .select("data_venda, valor")
                .eq("company_id", activeCompanyId)
                .eq("status", "Aprovado")
                .gte("data_venda", inicioMes)
                .lte("data_venda", fimMes)
                .order("data_venda", { ascending: true });

            // Group by date
            const grouped = (vendas || []).reduce((acc: Record<string, number>, v) => {
                const date = format(new Date(v.data_venda), "dd/MM");
                acc[date] = (acc[date] || 0) + Number(v.valor);
                return acc;
            }, {});

            // Fill dates
            const result = [];
            const today = new Date();
            for (let i = 14; i >= 0; i--) {
                const date = subDays(today, i);
                const dateKey = format(date, "dd/MM");
                result.push({
                    date: dateKey,
                    valor: grouped[dateKey] || 0,
                });
            }

            return result;
        },
        enabled: !!activeCompanyId,
    });

    // Sparkline data for KPIs
    const sparklineData = salesEvolution?.map((d) => d.valor) || [];

    return (
        <div className="space-y-6 min-h-screen">
            {/* Header */}
            <div className="relative">
                <div className="absolute -top-4 -left-4 w-64 h-64 bg-emerald-500/5 blur-3xl pointer-events-none" />

                <div className="relative flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                            Sales Performance Center
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider ring-1 ring-amber-500/20">
                                <Sparkles className="h-3 w-3" />
                                Beta
                            </span>
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            <span className="text-foreground/80 font-medium">Análise avançada</span> • Insights de vendas em tempo real
                        </p>
                    </div>

                    {/* Quick Date Filters */}
                    <div className="flex items-center gap-2">
                        {[
                            { id: "hoje", label: "Hoje" },
                            { id: "semana", label: "Esta Semana" },
                            { id: "mes", label: "Este Mês" },
                            { id: "30dias", label: "30 dias" },
                        ].map((range) => {
                            const isActive = (() => {
                                if (!dateRange.from || !dateRange.to) return false;
                                const today = new Date();
                                switch (range.id) {
                                    case "hoje":
                                        return isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today);
                                    case "semana":
                                        return isSameDay(dateRange.to, today) && isSameDay(dateRange.from, startOfWeek(today));
                                    case "mes":
                                        return isSameDay(dateRange.to, today) && isSameDay(dateRange.from, startOfMonth(today));
                                    case "30dias":
                                        return isSameDay(dateRange.to, today) && differenceInCalendarDays(today, dateRange.from) === 30;
                                    default:
                                        return false;
                                }
                            })();

                            const handleClick = () => {
                                const today = new Date();
                                const from = new Date();
                                switch (range.id) {
                                    case "hoje":
                                        setDateRange({ from: today, to: today });
                                        break;
                                    case "semana":
                                        from.setDate(today.getDate() - today.getDay());
                                        setDateRange({ from, to: today });
                                        break;
                                    case "mes":
                                        from.setDate(1);
                                        setDateRange({ from, to: today });
                                        break;
                                    case "30dias":
                                        from.setDate(today.getDate() - 30);
                                        setDateRange({ from, to: today });
                                        break;
                                }
                            };

                            return (
                                <Button
                                    key={range.id}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "h-8 text-xs",
                                        isActive
                                            ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700"
                                            : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                                    )}
                                    onClick={handleClick}
                                >
                                    {range.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Row 1: KPIs + Main Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: 4 KPI Cards stacked 2x2 */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <KPICard
                        title="Pipeline Ativo"
                        value={formatCurrencyCompact(stats?.pipelineValue || 0)}
                        fullValue={formatCurrency(stats?.pipelineValue || 0)}
                        icon={DollarSign}
                        iconColor="text-emerald-400"
                        iconBg="bg-emerald-500/10"
                        sparklineData={sparklineData}
                    />
                    <KPICard
                        title="Win Rate"
                        value={`${(stats?.winRate || 0).toFixed(0)}%`}
                        subtitle={`${stats?.wonCount || 0} ganhos`}
                        icon={Target}
                        trend={(stats?.winRate || 0) - 30}
                        trendLabel="vs média"
                        iconColor="text-emerald-400"
                        iconBg="bg-emerald-500/10"
                    />
                    <KPICard
                        title="Ciclo de Venda"
                        value={`${Math.round(stats?.avgCycle || 0)}d`}
                        subtitle="média de dias"
                        icon={CalendarIcon}
                        iconColor="text-emerald-400"
                        iconBg="bg-emerald-500/10"
                    />
                    <KPICard
                        title="Forecast"
                        value={formatCurrencyCompact(stats?.forecast || 0)}
                        fullValue={formatCurrency(stats?.forecast || 0)}
                        subtitle="projeção"
                        icon={TrendingUp}
                        iconColor="text-amber-400"
                        iconBg="bg-amber-500/10"
                    />
                </div>

                {/* Right: Main Chart */}
                <Card className="lg:col-span-3 relative overflow-hidden border border-slate-800 bg-slate-900 shadow-sm rounded-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />

                    <CardHeader className="pb-2 relative">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                        <BarChart3 className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    Evolução de Vendas
                                </CardTitle>
                                <p className="text-[11px] text-muted-foreground mt-1 ml-8">Últimos 15 dias • Faturamento diário</p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0 relative">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={salesEvolution || []} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValorSPC" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                                        <stop offset="50%" stopColor="#4F46E5" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(100,116,139,0.6)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="rgba(100,116,139,0.6)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => formatCurrencyCompact(v)}
                                    width={55}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid rgba(51, 65, 85, 0.5)",
                                        borderRadius: "12px",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                        padding: "12px 16px"
                                    }}
                                    labelStyle={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}
                                    formatter={(value: number) => [
                                        <span className="text-emerald-400 font-semibold">{formatCurrency(value)}</span>,
                                        <span className="text-slate-400">Faturamento</span>
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="valor"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fill="url(#colorValorSPC)"
                                    dot={false}
                                    activeDot={{
                                        r: 6,
                                        fill: "#10b981",
                                        stroke: "#fff",
                                        strokeWidth: 2,
                                        filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))"
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Heatmap + Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GoldenHoursHeatmap dateRange={dateRange} />
                <ConversionFunnelDonut dateRange={dateRange} />
            </div>

            {/* Row 3: Team Pulse */}
            <TeamPulseSection />
        </div>
    );
};

export default SalesPerformanceCenter;
