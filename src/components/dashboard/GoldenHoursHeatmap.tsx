import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Flame, Zap, TrendingUp } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface GoldenHoursHeatmapProps {
    dateRange?: { from?: Date; to?: Date };
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h to 19h

const getIntensityStyles = (value: number, max: number): { bg: string; glow: string } => {
    if (value === 0) return { bg: "bg-slate-800/30", glow: "" };
    const intensity = value / max;
    if (intensity < 0.25) return {
        bg: "bg-gradient-to-br from-amber-900/40 to-amber-950/40 ring-1 ring-amber-800/20",
        glow: ""
    };
    if (intensity < 0.5) return {
        bg: "bg-gradient-to-br from-amber-700/50 to-amber-800/50 ring-1 ring-amber-600/30",
        glow: ""
    };
    if (intensity < 0.75) return {
        bg: "bg-gradient-to-br from-orange-500/60 to-amber-600/60 ring-1 ring-orange-400/40",
        glow: "shadow-[0_0_12px_rgba(251,146,60,0.3)]"
    };
    return {
        bg: "bg-gradient-to-br from-orange-400/90 to-amber-500/80 ring-1 ring-orange-300/50",
        glow: "shadow-[0_0_20px_rgba(251,146,60,0.5)]"
    };
};

const getTextColor = (value: number, max: number) => {
    if (value === 0) return "text-slate-700";
    const intensity = value / max;
    if (intensity < 0.5) return "text-amber-300/90";
    return "text-white font-bold";
};

export const GoldenHoursHeatmap = ({ dateRange }: GoldenHoursHeatmapProps) => {
    const { activeCompanyId } = useTenant();
    const inicioMes = dateRange?.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
    const fimMes = dateRange?.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

    const { data: heatmapData, isLoading } = useQuery({
        queryKey: ["golden-hours-heatmap", inicioMes, fimMes, activeCompanyId],
        queryFn: async () => {
            const grid: number[][] = Array(7).fill(null).map(() => Array(12).fill(0));

            let vendasQuery = supabase
                .from("vendas")
                .select("created_at")
                .eq("status", "Aprovado")
                .gte("data_venda", inicioMes)
                .lte("data_venda", fimMes);

            if (activeCompanyId) {
                vendasQuery = vendasQuery.eq("company_id", activeCompanyId);
            }

            const { data: vendas } = await vendasQuery;

            (vendas || []).forEach((venda) => {
                const date = new Date(venda.created_at);
                const dayOfWeek = date.getDay();
                const hour = date.getHours();

                if (hour >= 8 && hour <= 19) {
                    const hourIndex = hour - 8;
                    grid[dayOfWeek][hourIndex]++;
                }
            });

            let callsQuery = supabase
                .from("calls")
                .select("data_call, attendance_status")
                .eq("attendance_status", "show")
                .gte("data_call", inicioMes)
                .lte("data_call", fimMes);

            if (activeCompanyId) {
                callsQuery = callsQuery.eq("company_id", activeCompanyId);
            }

            const { data: calls } = await callsQuery;

            (calls || []).forEach((call) => {
                if (call.data_call) {
                    const date = new Date(call.data_call);
                    const dayOfWeek = date.getDay();
                    const hour = date.getHours();

                    if (hour >= 8 && hour <= 19) {
                        const hourIndex = hour - 8;
                        grid[dayOfWeek][hourIndex]++;
                    }
                }
            });

            return grid;
        },
        enabled: !!activeCompanyId,
    });

    const maxValue = Math.max(1, ...(heatmapData?.flat() || [1]));

    // Find the best hour/day combination
    const findBestTime = () => {
        if (!heatmapData) return null;
        let bestValue = 0;
        let bestDay = 0;
        let bestHour = 0;
        heatmapData.forEach((dayData, dayIndex) => {
            dayData.forEach((value, hourIndex) => {
                if (value > bestValue) {
                    bestValue = value;
                    bestDay = dayIndex;
                    bestHour = hourIndex;
                }
            });
        });
        return bestValue > 0 ? { day: DAYS[bestDay], hour: HOURS[bestHour], value: bestValue } : null;
    };

    const bestTime = findBestTime();
    const totalActivities = heatmapData?.flat().reduce((a, b) => a + b, 0) || 0;

    return (
        <Card className="relative overflow-hidden border border-slate-800 bg-slate-900/95 backdrop-blur-sm shadow-xl rounded-2xl">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-amber-500/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-amber-500/5 to-transparent blur-2xl pointer-events-none" />

            <CardHeader className="pb-2 relative">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 ring-1 ring-orange-500/20">
                                <Flame className="h-4 w-4 text-orange-400" />
                            </div>
                            <span>Golden Hours</span>
                            <span className="ml-1 px-2 py-0.5 text-[10px] font-medium bg-orange-500/10 text-orange-400 rounded-full ring-1 ring-orange-500/20">
                                <Zap className="h-2.5 w-2.5 inline mr-0.5" />
                                Insights
                            </span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-2 ml-11">
                            Horários com mais vendas e calls bem-sucedidas
                        </p>
                    </div>

                    {/* Quick Stats */}
                    {bestTime && (
                        <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-2 rounded-xl ring-1 ring-slate-700/50">
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Melhor Horário</p>
                                <p className="text-sm font-bold text-orange-400">{bestTime.day} {bestTime.hour}h</p>
                            </div>
                            <div className="h-8 w-px bg-slate-700" />
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Atividades</p>
                                <p className="text-sm font-bold text-foreground">{totalActivities}</p>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-2 relative">
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(7)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full bg-slate-800/50" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Hours header */}
                        <div className="flex items-center gap-1.5 mb-3 ml-12">
                            {HOURS.map((hour) => (
                                <div
                                    key={hour}
                                    className="w-9 text-center text-[10px] text-muted-foreground font-medium"
                                >
                                    {hour}h
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="space-y-1.5">
                            {DAYS.map((day, dayIndex) => (
                                <div key={day} className="flex items-center gap-1.5 group">
                                    <div className="w-10 text-[11px] text-muted-foreground font-medium text-right pr-2 group-hover:text-foreground transition-colors">
                                        {day}
                                    </div>
                                    {HOURS.map((_, hourIndex) => {
                                        const value = heatmapData?.[dayIndex]?.[hourIndex] || 0;
                                        const { bg, glow } = getIntensityStyles(value, maxValue);
                                        return (
                                            <Tooltip key={hourIndex}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={`
                                                            w-9 h-8 rounded-lg flex items-center justify-center
                                                            transition-all duration-300 cursor-default
                                                            hover:scale-110 hover:z-10 hover:ring-2 hover:ring-white/20
                                                            ${bg} ${glow}
                                                        `}
                                                        style={{
                                                            animationDelay: `${(dayIndex * 12 + hourIndex) * 15}ms`,
                                                            animation: 'fadeIn 0.3s ease-out forwards'
                                                        }}
                                                    >
                                                        <span className={`text-[11px] ${getTextColor(value, maxValue)}`}>
                                                            {value > 0 ? value : ""}
                                                        </span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="top"
                                                    className="bg-slate-900/95 backdrop-blur-sm border-slate-700 text-white shadow-xl"
                                                >
                                                    <div className="text-xs">
                                                        <p className="font-semibold flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-orange-400" />
                                                            {day} às {HOURS[hourIndex]}h
                                                        </p>
                                                        <p className="text-muted-foreground mt-1">
                                                            <span className="text-orange-400 font-semibold">{value}</span> {value === 1 ? "atividade" : "atividades"}
                                                        </p>
                                                        {value > 0 && (
                                                            <p className="text-emerald-400 text-[10px] mt-1">
                                                                {((value / maxValue) * 100).toFixed(0)}% do pico
                                                            </p>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">Intensidade de atividade</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">Baixa</span>
                                <div className="flex gap-1">
                                    <div className="w-5 h-5 rounded bg-slate-800/30 ring-1 ring-slate-700/30" />
                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-900/40 to-amber-950/40 ring-1 ring-amber-800/20" />
                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-700/50 to-amber-800/50 ring-1 ring-amber-600/30" />
                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-500/60 to-amber-600/60 ring-1 ring-orange-400/40" />
                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-400/90 to-amber-500/80 ring-1 ring-orange-300/50 shadow-[0_0_12px_rgba(251,146,60,0.4)]" />
                                </div>
                                <span className="text-[10px] text-muted-foreground">Alta</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* CSS Animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </Card>
    );
};
