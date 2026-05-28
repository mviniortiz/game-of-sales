// ─────────────────────────────────────────────────────────────────────────────
// Ranking — redesign light premium (2026-05-28). Realtime, hooks e cálculos
// preservados (vendedores-ranking, meta-consolidada, ranking anterior pra
// delta, KPIs, contribuições). Reescreve só o JSX seguindo o padrão do
// Início/Metas: branco, borda #E4E9F2, sombras suaves, Phosphor duotone,
// papéis claros (azul=ação, verde=positivo, coral=urgência, neutros=estrutura).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Target,
    CircleNotch,
    Minus,
    ArrowsClockwise as RefreshIcon,
    CaretUp,
    Crown,
    Medal,
    Star,
    Diamond,
    Shield,
    Warning,
} from "@phosphor-icons/react";
import { endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Helpers ────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatCurrencyCompact = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
    return formatCurrency(value);
};

const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const NIVEL_CONFIG: Record<string, { color: string; bg: string; icon: typeof Shield }> = {
    Bronze:   { color: "#B45309", bg: "rgba(245,158,11,0.12)", icon: Shield },
    Prata:    { color: "#475569", bg: "rgba(148,163,184,0.18)", icon: Medal },
    Ouro:     { color: "#A16207", bg: "rgba(234,179,8,0.14)",  icon: Star },
    Platina:  { color: "#1D4ED8", bg: "rgba(37,99,235,0.10)",  icon: Crown },
    Diamante: { color: "#047857", bg: "rgba(16,185,129,0.12)", icon: Diamond },
};

const getNivelConfig = (nivel: string) =>
    NIVEL_CONFIG[nivel] || { color: "#64748B", bg: "rgba(148,163,184,0.15)", icon: Shield };

// Tons do pódio (light, acento sutil — sem pillars escalonados).
const PODIUM_RANK: Record<1 | 2 | 3, {
    badgeBg: string;
    badgeColor: string;
    ringColor: string;
    softBg: string;
    accentBorder: string;
}> = {
    1: { badgeBg: "#A16207", badgeColor: "#FFFFFF", ringColor: "#EAB308", softBg: "linear-gradient(180deg, rgba(234,179,8,0.07) 0%, #FFFFFF 35%)", accentBorder: "rgba(234,179,8,0.32)" },
    2: { badgeBg: "#475569", badgeColor: "#FFFFFF", ringColor: "#94A3B8", softBg: "#FFFFFF", accentBorder: "#E4E9F2" },
    3: { badgeBg: "#B45309", badgeColor: "#FFFFFF", ringColor: "#D97706", softBg: "#FFFFFF", accentBorder: "#E4E9F2" },
};

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface VendedorRanking {
    user_id: string;
    nome: string;
    avatar_url?: string;
    valor_vendido: number;
    meta_individual?: number;
    percentual_meta?: number;
    nivel?: string;
}

type PeriodoTab = "mensal" | "semanal";

// ─── Subcomponentes ─────────────────────────────────────────────────────────

interface KpiCellProps {
    label: string;
    value: ReactNode;
    accent?: string;
}

function KpiCell({ label, value, accent }: KpiCellProps) {
    return (
        <div className="px-4 py-3.5">
            <p className="text-[10.5px] uppercase tracking-wider font-bold mb-1" style={{ color: "#475569", letterSpacing: "0.06em" }}>
                {label}
            </p>
            <p className="text-[18px] sm:text-[20px] font-bold tabular-nums leading-none"
                style={{ color: accent ?? "#0B1220", letterSpacing: "-0.02em" }}>
                {value}
            </p>
        </div>
    );
}

function NivelChip({ nivel }: { nivel: string }) {
    const cfg = getNivelConfig(nivel);
    const Icon = cfg.icon;
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: cfg.bg, color: cfg.color, letterSpacing: "0.04em" }}>
            <Icon size={10} weight="duotone" />
            {nivel}
        </span>
    );
}

function PodiumCard({
    vendedor, rank, isCurrentUser, metaAtual,
}: {
    vendedor?: VendedorRanking;
    rank: 1 | 2 | 3;
    isCurrentUser: boolean;
    metaAtual: number;
}) {
    if (!vendedor) {
        return (
            <div className="rounded-2xl h-[180px]" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
        );
    }
    const style = PODIUM_RANK[rank];
    const percentContrib = metaAtual > 0 ? (vendedor.valor_vendido / metaAtual) * 100 : 0;

    return (
        <div className="rounded-2xl overflow-hidden flex flex-col"
            style={{
                background: style.softBg,
                border: `1px solid ${style.accentBorder}`,
                boxShadow: rank === 1
                    ? "0 1px 2px rgba(15,23,42,0.04), 0 14px 32px -10px rgba(234,179,8,0.20)"
                    : "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
            }}>
            <div className="p-5 flex flex-col items-center text-center gap-2.5">
                {/* Avatar + badge rank */}
                <div className="relative">
                    <Avatar className="h-14 w-14 ring-2" style={{ boxShadow: `0 0 0 2px ${style.ringColor}40` }}>
                        {vendedor.avatar_url && <AvatarImage src={vendedor.avatar_url} alt={vendedor.nome} />}
                        <AvatarFallback style={{ background: "#F1F5F9", color: "#0B1220" }} className="text-[13px] font-semibold">
                            {getInitials(vendedor.nome)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-[0_2px_6px_rgba(15,23,42,0.18)]"
                        style={{ background: style.badgeBg, color: style.badgeColor }}>
                        {rank}
                    </span>
                    {rank === 1 && (
                        <Crown size={14} weight="fill" className="absolute -top-1 -left-1" style={{ color: "#EAB308" }} />
                    )}
                </div>

                {/* Nome + nível */}
                <div className="w-full">
                    <p className="text-[13.5px] font-bold truncate" style={{ color: "#0B1220" }}>{vendedor.nome}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                        <NivelChip nivel={vendedor.nivel || "Bronze"} />
                        {isCurrentUser && (
                            <span className="inline-flex items-center text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(37,99,235,0.10)", color: "#1D4ED8", letterSpacing: "0.05em" }}>
                                você
                            </span>
                        )}
                    </div>
                </div>

                {/* Valor */}
                <p className="text-[18px] sm:text-[20px] font-bold tabular-nums leading-none"
                    style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                    {formatCurrencyCompact(vendedor.valor_vendido)}
                </p>

                {metaAtual > 0 && (
                    <p className="text-[11px] tabular-nums" style={{ color: "#64748B" }}>
                        {percentContrib.toFixed(0)}% da meta do time
                    </p>
                )}
            </div>
        </div>
    );
}

function RankingRow({
    vendedor, posicao, delta, prevPos, isCurrentUser, gapParaUltrapassar,
}: {
    vendedor: VendedorRanking;
    posicao: number;
    delta: number;
    prevPos: number | undefined;
    isCurrentUser: boolean;
    gapParaUltrapassar: number;
}) {
    const hasIndividualMeta = vendedor.meta_individual && vendedor.meta_individual > 0;
    const progressValue = hasIndividualMeta
        ? Math.min((vendedor.valor_vendido / vendedor.meta_individual!) * 100, 100)
        : 0;

    return (
        <div className="grid grid-cols-[auto_auto_1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3.5 transition-colors hover:bg-[#F8FAFC]"
            style={isCurrentUser ? { background: "rgba(37,99,235,0.04)" } : undefined}>
            {/* Posição + delta */}
            <div className="flex items-center gap-1.5 w-12 flex-shrink-0">
                <span className="text-[12px] font-bold tabular-nums w-5 text-right" style={{ color: "#94A3B8" }}>
                    {posicao}
                </span>
                {delta !== 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums"
                        style={{ color: delta > 0 ? "#0F8A63" : "#BE123C" }}>
                        <CaretUp size={9} weight="bold" style={delta < 0 ? { transform: "rotate(180deg)" } : undefined} />
                        {Math.abs(delta)}
                    </span>
                ) : prevPos ? (
                    <Minus size={10} weight="bold" style={{ color: "#CBD5E1" }} />
                ) : (
                    <span className="w-2.5" />
                )}
            </div>

            {/* Avatar */}
            <Avatar className="h-9 w-9 flex-shrink-0">
                {vendedor.avatar_url && <AvatarImage src={vendedor.avatar_url} alt={vendedor.nome} />}
                <AvatarFallback style={{ background: "#F1F5F9", color: "#0B1220" }} className="text-[11px] font-semibold">
                    {getInitials(vendedor.nome)}
                </AvatarFallback>
            </Avatar>

            {/* Nome + nível + barra/gap */}
            <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-[13.5px] truncate" style={{ color: "#0B1220" }}>{vendedor.nome}</p>
                    {isCurrentUser && (
                        <span className="inline-flex items-center text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(37,99,235,0.10)", color: "#1D4ED8", letterSpacing: "0.05em" }}>
                            você
                        </span>
                    )}
                    <NivelChip nivel={vendedor.nivel || "Bronze"} />
                </div>

                {hasIndividualMeta ? (
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1 flex-1 rounded-full overflow-hidden max-w-[220px]" style={{ background: "#EAF0F6" }}>
                            <div className="h-full rounded-full transition-all"
                                style={{
                                    width: `${progressValue}%`,
                                    background: progressValue >= 100
                                        ? "linear-gradient(90deg, #10B981, #34D399)"
                                        : "linear-gradient(90deg, #2563EB, #4A8CE8)",
                                }} />
                        </div>
                        <span className="text-[10.5px] tabular-nums font-semibold" style={{ color: "#64748B" }}>
                            {vendedor.percentual_meta?.toFixed(0)}% da meta
                        </span>
                    </div>
                ) : gapParaUltrapassar > 0 ? (
                    <p className="text-[10.5px] mt-0.5 tabular-nums" style={{ color: "#94A3B8" }}>
                        faltam {formatCurrencyCompact(gapParaUltrapassar)} para alcançar #{posicao - 1}
                    </p>
                ) : null}
            </div>

            {/* Valor */}
            <div className="text-right flex-shrink-0">
                <p className="text-[15px] sm:text-[16px] font-bold tabular-nums leading-none"
                    style={{ color: "#0B1220", letterSpacing: "-0.018em" }}>
                    {formatCurrencyCompact(vendedor.valor_vendido)}
                </p>
                {hasIndividualMeta && (
                    <p className="hidden sm:block text-[10.5px] mt-1 tabular-nums" style={{ color: "#94A3B8" }}>
                        de {formatCurrencyCompact(vendedor.meta_individual!)}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

const Ranking = () => {
    const { user, isAdmin, isSuperAdmin, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const queryClient = useQueryClient();
    const [livePulse, setLivePulse] = useState(false);
    const [periodo, setPeriodo] = useState<PeriodoTab>("mensal");

    const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;
    const currentUserId = user?.id;

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    const { inicioMes, fimMes, mesReferencia } = useMemo(() => {
        const inicioMesDate = new Date(ano, mes, 1);
        const fimMesDate = new Date(ano, mes + 1, 0);
        return {
            inicioMes: format(inicioMesDate, "yyyy-MM-dd"),
            fimMes: format(fimMesDate, "yyyy-MM-dd"),
            mesReferencia: format(inicioMesDate, "yyyy-MM-dd"),
        };
    }, [ano, mes]);

    const { inicioSemana, fimSemana } = useMemo(() => {
        const inicio = startOfWeek(hoje, { weekStartsOn: 1 });
        const fim = endOfWeek(hoje, { weekStartsOn: 1 });
        return {
            inicioSemana: format(inicio, "yyyy-MM-dd"),
            fimSemana: format(fim, "yyyy-MM-dd"),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hoje.toDateString()]);

    const inicioPeriodo = periodo === "mensal" ? inicioMes : inicioSemana;
    const fimPeriodo = periodo === "mensal" ? fimMes : fimSemana;

    // Realtime: escuta mudanças em deals e invalida o ranking.
    useEffect(() => {
        if (!effectiveCompanyId) return;
        const channel = supabase
            .channel(`ranking-deals-${effectiveCompanyId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "deals", filter: `company_id=eq.${effectiveCompanyId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["vendedores-ranking"] });
                    queryClient.invalidateQueries({ queryKey: ["meta-consolidada-atual"] });
                    setLivePulse(true);
                    setTimeout(() => setLivePulse(false), 1200);
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [effectiveCompanyId, queryClient]);

    // Meta consolidada do mês
    const { data: metaAtual, isLoading: loadingMeta, refetch: refetchMeta } = useQuery({
        queryKey: ["meta-consolidada-atual", mesReferencia, effectiveCompanyId],
        queryFn: async () => {
            if (!effectiveCompanyId) return null;
            const { data, error } = await supabase
                .from("metas_consolidadas")
                .select("*")
                .eq("mes_referencia", mesReferencia)
                .eq("company_id", effectiveCompanyId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!effectiveCompanyId,
        staleTime: 15_000,
        refetchInterval: 30_000,
    });

    // Ranking do período
    const {
        data: vendedoresRanking = [],
        isLoading: loadingVendedores,
        refetch: refetchVendedores,
    } = useQuery({
        queryKey: ["vendedores-ranking", inicioPeriodo, fimPeriodo, effectiveCompanyId, isSuperAdmin],
        queryFn: async () => {
            if (!effectiveCompanyId) return [];
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, nome, avatar_url, nivel, is_super_admin, company_id")
                .eq("company_id", effectiveCompanyId);
            if (profilesError) throw profilesError;

            const userIds = profiles?.map((p) => p.id) || [];
            if (userIds.length === 0) return [];

            const { data: vendas, error: vendasError } = await supabase
                .from("vendas")
                .select("user_id, valor, status, data_venda, company_id")
                .eq("company_id", effectiveCompanyId)
                .eq("status", "Aprovado")
                .gte("data_venda", inicioPeriodo)
                .lte("data_venda", fimPeriodo)
                .in("user_id", userIds);
            if (vendasError) throw vendasError;

            const { data: metas, error: metasError } = await supabase
                .from("metas")
                .select("user_id, valor_meta")
                .eq("mes_referencia", mesReferencia)
                .eq("company_id", effectiveCompanyId)
                .in("user_id", userIds);
            if (metasError) throw metasError;

            const vendasPorUsuario: Record<string, number> = {};
            vendas?.forEach((v) => {
                vendasPorUsuario[v.user_id] = (vendasPorUsuario[v.user_id] || 0) + Number(v.valor);
            });

            const metasPorUsuario: Record<string, number> = {};
            metas?.forEach((m: any) => {
                metasPorUsuario[m.user_id] = Number(m.valor_meta) || 0;
            });

            const ranking: VendedorRanking[] = (profiles || [])
                .filter((profile: any) => {
                    if (profile.id === currentUserId) return true;
                    if (profile.is_super_admin) return false;
                    return true;
                })
                .map((profile: any) => {
                    const valorVendido = vendasPorUsuario[profile.id] || 0;
                    const metaIndividual = metasPorUsuario[profile.id];
                    const percentualMeta =
                        metaIndividual && metaIndividual > 0
                            ? (valorVendido / metaIndividual) * 100
                            : undefined;
                    return {
                        user_id: profile.id,
                        nome: profile.nome || "Sem nome",
                        avatar_url: profile.avatar_url,
                        valor_vendido: valorVendido,
                        meta_individual: metaIndividual,
                        percentual_meta: percentualMeta,
                        nivel: profile.nivel || "Bronze",
                    };
                });

            return ranking.sort((a, b) => b.valor_vendido - a.valor_vendido);
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
    });

    // Período anterior pra delta de posição
    const previousPeriodStart = useMemo(() => {
        if (periodo === "mensal") {
            const prevMonth = new Date(ano, mes - 1, 1);
            return format(prevMonth, "yyyy-MM-dd");
        }
        const prevWeekStart = startOfWeek(new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
        return format(prevWeekStart, "yyyy-MM-dd");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo, ano, mes, hoje.toDateString()]);

    const previousPeriodEnd = useMemo(() => {
        if (periodo === "mensal") {
            const prevMonthEnd = new Date(ano, mes, 0);
            return format(prevMonthEnd, "yyyy-MM-dd");
        }
        const prevWeekEnd = endOfWeek(new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
        return format(prevWeekEnd, "yyyy-MM-dd");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo, ano, mes, hoje.toDateString()]);

    const { data: previousRanking = [] } = useQuery({
        queryKey: ["vendedores-ranking-prev", previousPeriodStart, previousPeriodEnd, effectiveCompanyId],
        queryFn: async () => {
            if (!effectiveCompanyId) return [];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", effectiveCompanyId);
            const userIds = profiles?.map((p) => p.id) || [];
            if (userIds.length === 0) return [];

            const { data: vendas } = await supabase
                .from("vendas")
                .select("user_id, valor")
                .eq("company_id", effectiveCompanyId)
                .eq("status", "Aprovado")
                .gte("data_venda", previousPeriodStart)
                .lte("data_venda", previousPeriodEnd)
                .in("user_id", userIds);

            const vendasPorUsuario: Record<string, number> = {};
            vendas?.forEach((v) => {
                vendasPorUsuario[v.user_id] = (vendasPorUsuario[v.user_id] || 0) + Number(v.valor);
            });

            return Object.entries(vendasPorUsuario)
                .map(([user_id, valor]) => ({ user_id, valor_vendido: valor }))
                .sort((a, b) => b.valor_vendido - a.valor_vendido);
        },
        enabled: !!effectiveCompanyId,
        staleTime: 60_000,
    });

    const previousRankMap = useMemo(() => {
        const map: Record<string, number> = {};
        previousRanking.forEach((v, i) => { map[v.user_id] = i + 1; });
        return map;
    }, [previousRanking]);

    const isLoading = loadingMeta || loadingVendedores;

    const handleRefresh = () => {
        refetchMeta();
        refetchVendedores();
    };

    // KPIs
    const kpis = useMemo(() => {
        const total = vendedoresRanking.reduce((acc, v) => acc + v.valor_vendido, 0);
        const ativos = vendedoresRanking.filter((v) => v.valor_vendido > 0).length;
        const maiorVenda = vendedoresRanking.length > 0 ? vendedoresRanking[0]?.valor_vendido || 0 : 0;
        const media = ativos > 0 ? total / ativos : 0;
        return { total, ativos, totalVendedores: vendedoresRanking.length, maiorVenda, media };
    }, [vendedoresRanking]);

    const diasRestantes = useMemo(() => {
        const ultimoDiaMes = endOfMonth(hoje);
        const diffTime = ultimoDiaMes.getTime() - hoje.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hoje.toDateString()]);

    if (isLoading) {
        return (
            <div className="space-y-5 sm:space-y-6">
                <div className="rounded-2xl p-10 text-center"
                    style={{ background: "#FFFFFF", border: "1px solid #E4E9F2", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                    <CircleNotch size={28} weight="bold" className="mx-auto animate-spin" style={{ color: "#2563EB" }} />
                    <p className="mt-3 text-[12.5px]" style={{ color: "#64748B" }}>Carregando ranking…</p>
                </div>
            </div>
        );
    }

    const metaValor = metaAtual ? Number(metaAtual.valor_meta) : 0;
    const metaPercent = metaValor > 0 ? Math.min((kpis.total / metaValor) * 100, 100) : 0;
    const top3 = vendedoresRanking.slice(0, 3);
    const rest = vendedoresRanking.slice(3);
    const [first, second, third] = top3;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-[22px] sm:text-[26px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.022em" }}>
                            Ranking
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase"
                            style={{
                                background: livePulse ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.10)",
                                color: "#0F8A63",
                                border: "1px solid rgba(16,185,129,0.24)",
                                letterSpacing: "0.06em",
                                transition: "background 0.3s",
                            }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${livePulse ? "animate-ping" : "animate-pulse"}`}
                                style={{ background: "#10B981" }} />
                            Ao vivo
                        </span>
                    </div>
                    <p className="text-[12.5px] sm:text-[13px] mt-0.5 capitalize" style={{ color: "#64748B" }}>
                        {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
                        <span className="hidden sm:inline" style={{ color: "#94A3B8" }}> · atualiza a cada movimento do pipeline</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Period pill */}
                    <div className="inline-flex items-center gap-0.5 rounded-full p-0.5"
                        style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>
                        {([
                            { id: "semanal", label: "Semanal" },
                            { id: "mensal", label: "Mensal" },
                        ] as const).map((opt) => {
                            const active = periodo === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setPeriodo(opt.id)}
                                    className="h-7 rounded-full px-3 text-[11.5px] font-semibold transition-colors"
                                    style={active
                                        ? { background: "#FFFFFF", color: "#0B1220", boxShadow: "0 1px 2px rgba(15,23,42,0.08)" }
                                        : { color: "#64748B", background: "transparent" }}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        aria-label="Atualizar"
                        className="gap-2"
                    >
                        <RefreshIcon size={14} weight="bold" />
                        <span className="hidden sm:inline">Atualizar</span>
                    </Button>
                </div>
            </div>

            {/* KPI strip */}
            <div className="rounded-2xl overflow-hidden"
                style={{
                    background: "#FFFFFF",
                    border: "1px solid #E4E9F2",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
                }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x" style={{ borderColor: "#F1F5F9" }}>
                    <KpiCell label="Total vendido" value={formatCurrencyCompact(kpis.total)} accent="#2563EB" />
                    <KpiCell label="Maior venda" value={formatCurrencyCompact(kpis.maiorVenda)} />
                    <KpiCell label="Média por vendedor" value={formatCurrencyCompact(kpis.media)} />
                    <KpiCell
                        label="Ativos no período"
                        value={
                            <>
                                {kpis.ativos}
                                <span className="text-[14px] font-semibold" style={{ color: "#94A3B8" }}>
                                    /{kpis.totalVendedores}
                                </span>
                            </>
                        }
                    />
                </div>

                {periodo === "mensal" && metaAtual && (
                    <div className="border-t px-5 py-3.5" style={{ borderColor: "#F1F5F9" }}>
                        <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10.5px] uppercase tracking-wider font-bold" style={{ color: "#475569", letterSpacing: "0.06em" }}>
                                    Meta do time
                                </span>
                                {metaAtual.descricao && (
                                    <span className="text-[11px] truncate" style={{ color: "#94A3B8" }}>
                                        · {metaAtual.descricao}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
                                <span className="tabular-nums" style={{ color: "#64748B" }}>
                                    <strong style={{ color: "#0B1220" }}>{formatCurrencyCompact(kpis.total)}</strong> de {formatCurrencyCompact(metaValor)}
                                </span>
                                <span className="font-bold tabular-nums" style={{ color: "#1D4ED8" }}>
                                    {metaPercent.toFixed(0)}%
                                </span>
                                <span className="hidden sm:inline tabular-nums" style={{ color: "#94A3B8" }}>
                                    · faltam {diasRestantes}d
                                </span>
                            </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#EAF0F6" }}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${metaPercent}%`,
                                    background: "linear-gradient(90deg, #2563EB 0%, #4A8CE8 100%)",
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Empty / Conteúdo */}
            {vendedoresRanking.length === 0 ? (
                <div className="rounded-2xl p-12 text-center"
                    style={{ background: "#FFFFFF", border: "1px solid #E4E9F2", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
                    <div className="h-12 w-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                        style={{ background: "rgba(148,163,184,0.12)" }}>
                        <Target size={24} weight="duotone" style={{ color: "#64748B" }} />
                    </div>
                    <p className="text-[14px] font-bold" style={{ color: "#0B1220" }}>
                        Sem movimentação {periodo === "mensal" ? "este mês" : "esta semana"}
                    </p>
                    <p className="text-[12px] mt-1 max-w-[340px] mx-auto" style={{ color: "#64748B" }}>
                        Nenhuma venda registrada no período. Assim que houver, o ranking aparece aqui em tempo real.
                    </p>
                </div>
            ) : (
                <>
                    {/* Pódio top 3 */}
                    {top3.length > 0 && (
                        <div data-tour="ranking-section" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <PodiumCard
                                vendedor={first}
                                rank={1}
                                isCurrentUser={first?.user_id === currentUserId}
                                metaAtual={metaValor}
                            />
                            <PodiumCard
                                vendedor={second}
                                rank={2}
                                isCurrentUser={second?.user_id === currentUserId}
                                metaAtual={metaValor}
                            />
                            <PodiumCard
                                vendedor={third}
                                rank={3}
                                isCurrentUser={third?.user_id === currentUserId}
                                metaAtual={metaValor}
                            />
                        </div>
                    )}

                    {/* Classificação */}
                    {rest.length > 0 && (
                        <div className="rounded-2xl overflow-hidden"
                            style={{
                                background: "#FFFFFF",
                                border: "1px solid #E4E9F2",
                                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.05)",
                            }}>
                            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "#F1F5F9" }}>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10.5px] uppercase tracking-wider font-bold" style={{ color: "#475569", letterSpacing: "0.06em" }}>
                                        Classificação
                                    </span>
                                    <span className="text-[11px]" style={{ color: "#94A3B8" }}>
                                        · {rest.length} {rest.length === 1 ? "vendedor" : "vendedores"}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                                {rest.map((vendedor, idx) => {
                                    const posicao = idx + 4;
                                    const isCurrentUser = vendedor.user_id === currentUserId;
                                    const prevPos = previousRankMap[vendedor.user_id];
                                    const delta = prevPos ? prevPos - posicao : 0;
                                    const pessoaAcima = idx === 0 ? top3[top3.length - 1] : rest[idx - 1];
                                    const gapParaUltrapassar = pessoaAcima
                                        ? pessoaAcima.valor_vendido - vendedor.valor_vendido
                                        : 0;
                                    return (
                                        <RankingRow
                                            key={vendedor.user_id}
                                            vendedor={vendedor}
                                            posicao={posicao}
                                            delta={delta}
                                            prevPos={prevPos}
                                            isCurrentUser={isCurrentUser}
                                            gapParaUltrapassar={gapParaUltrapassar}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Aviso meta não definida */}
            {periodo === "mensal" && !metaAtual && vendedoresRanking.length > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)" }}>
                    <Warning size={16} weight="duotone" className="shrink-0 mt-px" style={{ color: "#B45309" }} />
                    <p className="text-[12.5px]" style={{ color: "#92400E", lineHeight: 1.5 }}>
                        {isAdmin
                            ? "Nenhuma meta consolidada definida para este mês. Defina em Metas para acompanhar o progresso global."
                            : "Aguardando o gestor definir a meta consolidada do mês."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Ranking;
