import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flame, AlertTriangle, Trophy, TrendingUp, Clock, Sparkles, ArrowRight, Zap } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, endOfWeek, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
    if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
};

const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

const RANK_COLORS = [
    { bg: "from-amber-500/20 to-yellow-500/10", ring: "ring-amber-500/30", badge: "bg-gradient-to-r from-amber-500 to-yellow-500", text: "text-amber-400" },
    { bg: "from-slate-400/20 to-gray-400/10", ring: "ring-slate-400/30", badge: "bg-gradient-to-r from-slate-400 to-gray-400", text: "text-slate-300" },
    { bg: "from-amber-700/20 to-orange-700/10", ring: "ring-amber-700/30", badge: "bg-gradient-to-r from-amber-700 to-orange-600", text: "text-amber-600" },
];

const STAGE_LABELS: Record<string, string> = {
    lead: "Lead",
    qualification: "Qualificando",
    proposal: "Proposta",
    negotiation: "Negociação",
};

export const TeamPulseSection = () => {
    const { activeCompanyId } = useTenant();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0];
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0];

    // Top sellers this week
    const { data: topSellers, isLoading: loadingTopSellers } = useQuery({
        queryKey: ["team-pulse-top-sellers", weekStart, weekEnd, activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return [];

            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, nome, avatar_url")
                .eq("company_id", activeCompanyId)
                .eq("is_super_admin", false);

            if (!profiles) return [];

            const sellersWithSales = await Promise.all(
                profiles.map(async (profile) => {
                    const { data: vendas } = await supabase
                        .from("vendas")
                        .select("valor")
                        .eq("user_id", profile.id)
                        .eq("status", "Aprovado")
                        .gte("data_venda", weekStart)
                        .lte("data_venda", weekEnd);

                    const total = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
                    return { ...profile, total, count: vendas?.length || 0 };
                })
            );

            return sellersWithSales
                .filter((s) => s.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 3);
        },
        enabled: !!activeCompanyId,
    });

    // Hot deals (high probability, recent activity)
    const { data: hotDeals, isLoading: loadingHotDeals } = useQuery({
        queryKey: ["team-pulse-hot-deals", activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return [];

            const { data: deals, error } = await supabase
                .from("deals")
                .select("id, title, value, stage, updated_at, profiles(nome)")
                .eq("company_id", activeCompanyId)
                .in("stage", ["proposal", "negotiation"])
                .order("updated_at", { ascending: false })
                .limit(3);

            if (error) throw error;
            return deals || [];
        },
        enabled: !!activeCompanyId,
    });

    // Stale deals (no activity in 7+ days)
    const { data: staleDeals, isLoading: loadingStaleDeals } = useQuery({
        queryKey: ["team-pulse-stale-deals", activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return [];

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: deals, error } = await supabase
                .from("deals")
                .select("id, title, value, stage, updated_at, profiles(nome)")
                .eq("company_id", activeCompanyId)
                .not("stage", "in", "(closed_won,closed_lost)")
                .lt("updated_at", sevenDaysAgo.toISOString())
                .order("updated_at", { ascending: true })
                .limit(3);

            if (error) throw error;
            return deals || [];
        },
        enabled: !!activeCompanyId,
    });

    const totalWeekSales = topSellers?.reduce((acc, s) => acc + s.total, 0) || 0;

    return (
        <Card className="relative overflow-hidden border border-slate-800 bg-slate-900/95 backdrop-blur-sm shadow-xl rounded-2xl">
            {/* Background effects */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-1/2 w-48 h-48 bg-gradient-to-b from-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

            <CardHeader className="pb-3 relative">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 ring-1 ring-emerald-500/20">
                                <Users className="h-4 w-4 text-emerald-400" />
                            </div>
                            <span>Team Pulse</span>
                            <span className="ml-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full ring-1 ring-emerald-500/20">
                                <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />
                                Live
                            </span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-2 ml-11">
                            Visão rápida do time e oportunidades
                        </p>
                    </div>

                    {/* Week summary */}
                    {totalWeekSales > 0 && (
                        <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/5 px-4 py-2 rounded-xl ring-1 ring-emerald-500/20">
                            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">Vendas da Semana</p>
                            <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalWeekSales)}</p>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-0 relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Top Sellers */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                            </div>
                            Top da Semana
                        </div>

                        {loadingTopSellers ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full bg-slate-800/50 rounded-xl" />
                                ))}
                            </div>
                        ) : (topSellers?.length || 0) > 0 ? (
                            <div className="space-y-2">
                                {topSellers?.map((seller, index) => {
                                    const rankStyle = RANK_COLORS[index] || RANK_COLORS[2];
                                    return (
                                        <div
                                            key={seller.id}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-xl 
                                                bg-gradient-to-r ${rankStyle.bg}
                                                ring-1 ${rankStyle.ring}
                                                hover:scale-[1.02] transition-all duration-200 cursor-default
                                            `}
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-700">
                                                    <AvatarImage src={seller.avatar_url || undefined} />
                                                    <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                                                        {getInitials(seller.nome)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute -top-1 -right-1 w-5 h-5 ${rankStyle.badge} rounded-full flex items-center justify-center shadow-lg`}>
                                                    <span className="text-[9px] text-white font-bold">{index + 1}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground font-medium truncate">{seller.nome}</p>
                                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Zap className="h-3 w-3" />
                                                    {seller.count} {seller.count === 1 ? 'venda' : 'vendas'}
                                                </p>
                                            </div>
                                            <p className={`text-base font-bold ${rankStyle.text}`}>{formatCurrency(seller.total)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-800/30 rounded-xl">
                                <Trophy className="h-8 w-8 text-slate-700 mb-2" />
                                <p className="text-xs text-muted-foreground">Nenhuma venda esta semana</p>
                                <p className="text-[10px] text-slate-600 mt-1">Seja o primeiro!</p>
                            </div>
                        )}
                    </div>

                    {/* Hot Deals */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                            <div className="p-1.5 rounded-lg bg-orange-500/10">
                                <Flame className="h-3.5 w-3.5 text-orange-400" />
                            </div>
                            Deals Quentes
                        </div>

                        {loadingHotDeals ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full bg-slate-800/50 rounded-xl" />
                                ))}
                            </div>
                        ) : (hotDeals?.length || 0) > 0 ? (
                            <div className="space-y-2">
                                {hotDeals?.map((deal: any, index) => (
                                    <div
                                        key={deal.id}
                                        className="p-3 rounded-xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 ring-1 ring-orange-500/20 hover:ring-orange-500/40 hover:scale-[1.02] transition-all duration-200 cursor-default group"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-foreground font-medium truncate group-hover:text-orange-300 transition-colors">{deal.title}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">{deal.profiles?.nome}</p>
                                            </div>
                                            <p className="text-sm font-bold text-emerald-400 shrink-0">
                                                {formatCurrency(Number(deal.value) || 0)}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-medium ring-1 ring-orange-500/20">
                                                    <TrendingUp className="h-3 w-3" />
                                                    {STAGE_LABELS[deal.stage] || deal.stage}
                                                </span>
                                            </div>
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-800/30 rounded-xl">
                                <Flame className="h-8 w-8 text-slate-700 mb-2" />
                                <p className="text-xs text-muted-foreground">Nenhum deal em negociação</p>
                                <p className="text-[10px] text-slate-600 mt-1">Mova deals para o pipeline</p>
                            </div>
                        )}
                    </div>

                    {/* Stale Deals */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                            <div className="p-1.5 rounded-lg bg-rose-500/10">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                            </div>
                            Atenção Necessária
                            {(staleDeals?.length || 0) > 0 && (
                                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 rounded-full">
                                    {staleDeals?.length}
                                </span>
                            )}
                        </div>

                        {loadingStaleDeals ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full bg-slate-800/50 rounded-xl" />
                                ))}
                            </div>
                        ) : (staleDeals?.length || 0) > 0 ? (
                            <div className="space-y-2">
                                {staleDeals?.map((deal: any, index) => (
                                    <div
                                        key={deal.id}
                                        className="p-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-red-500/5 ring-1 ring-rose-500/30 hover:ring-rose-400/50 hover:scale-[1.02] transition-all duration-200 cursor-default group"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-foreground font-medium truncate group-hover:text-rose-300 transition-colors">{deal.title}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">{deal.profiles?.nome}</p>
                                            </div>
                                            <p className="text-sm font-bold text-rose-400 shrink-0">
                                                {formatCurrency(Number(deal.value) || 0)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Clock className="h-3 w-3 text-rose-400" />
                                            <span className="text-[10px] text-rose-400 font-medium">
                                                Última atividade {formatDistanceToNow(new Date(deal.updated_at), { locale: ptBR, addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-xl ring-1 ring-emerald-500/20">
                                <div className="p-3 rounded-full bg-emerald-500/10 mb-2">
                                    <Sparkles className="h-6 w-6 text-emerald-400" />
                                </div>
                                <p className="text-xs text-emerald-400 font-medium">Tudo em dia! ✓</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Nenhum deal parado há mais de 7 dias</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
