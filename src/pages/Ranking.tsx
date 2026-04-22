import { useState, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Target, Loader2, Minus,
  RefreshCw, ChevronUp,
  Crown, Medal, Star, Gem, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================
// Hoisted utilities
// ============================================

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatCurrencyCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return formatCurrency(value);
};

const NIVEL_CONFIG: Record<string, { color: string; bg: string; icon: typeof Shield }> = {
  Bronze: { color: "text-amber-700", bg: "bg-amber-700/20 border-amber-700/30", icon: Shield },
  Prata: { color: "text-gray-400", bg: "bg-gray-400/20 border-gray-400/30", icon: Medal },
  Ouro: { color: "text-yellow-500", bg: "bg-yellow-500/20 border-yellow-500/30", icon: Star },
  Platina: { color: "text-blue-400", bg: "bg-blue-400/20 border-blue-400/30", icon: Crown },
  Diamante: { color: "text-emerald-400", bg: "bg-emerald-400/20 border-emerald-400/30", icon: Gem },
};

const getNivelConfig = (nivel: string) =>
  NIVEL_CONFIG[nivel] || { color: "text-gray-500", bg: "bg-gray-500/20 border-gray-500/30", icon: Shield };

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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

const Ranking = () => {
  const { user, isAdmin, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const [periodo, setPeriodo] = useState<PeriodoTab>("mensal");

  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;
  const currentUserId = user?.id;

  // Date boundaries based on selected period
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
  }, [hoje.toDateString()]);

  const inicioPeriodo = periodo === "mensal" ? inicioMes : inicioSemana;
  const fimPeriodo = periodo === "mensal" ? fimMes : fimSemana;

  // Fetch meta consolidada
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

  // Fetch sellers ranking for current period
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

      // Individual goals (always monthly)
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

  // Fetch previous period for delta comparison
  const previousPeriodStart = useMemo(() => {
    if (periodo === "mensal") {
      const prevMonth = new Date(ano, mes - 1, 1);
      return format(prevMonth, "yyyy-MM-dd");
    }
    const prevWeekStart = startOfWeek(new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    return format(prevWeekStart, "yyyy-MM-dd");
  }, [periodo, ano, mes, hoje.toDateString()]);

  const previousPeriodEnd = useMemo(() => {
    if (periodo === "mensal") {
      const prevMonthEnd = new Date(ano, mes, 0);
      return format(prevMonthEnd, "yyyy-MM-dd");
    }
    const prevWeekEnd = endOfWeek(new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    return format(prevWeekEnd, "yyyy-MM-dd");
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

  // Build previous rank map
  const previousRankMap = useMemo(() => {
    const map: Record<string, number> = {};
    previousRanking.forEach((v, i) => {
      map[v.user_id] = i + 1;
    });
    return map;
  }, [previousRanking]);

  const isLoading = loadingMeta || loadingVendedores;

  const handleRefresh = () => {
    refetchMeta();
    refetchVendedores();
  };

  // KPI calculations
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
  }, [hoje.toDateString()]);

  // Podium data
  const contribuicoesForPodium = useMemo(
    () =>
      vendedoresRanking.map((v, index) => ({
        user_id: v.user_id,
        nome: v.nome,
        avatar_url: v.avatar_url || null,
        contribuicao: v.valor_vendido,
        percentual_contribuicao: metaAtual
          ? (v.valor_vendido / Number(metaAtual.valor_meta)) * 100
          : 0,
        posicao_ranking: index + 1,
        nivel: v.nivel,
      })),
    [vendedoresRanking, metaAtual],
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Carregando ranking...</p>
          </div>
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
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Ranking
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
            <span className="hidden sm:inline"> · atualiza a cada 30s</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period pill */}
          <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5 backdrop-blur-sm">
            {([
              { id: "semanal", label: "Semanal" },
              { id: "mensal", label: "Mensal" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriodo(opt.id)}
                className={cn(
                  "h-7 rounded-full px-3 text-[11px] font-medium transition-all",
                  periodo === opt.id
                    ? "bg-background text-foreground ring-1 ring-border shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            aria-label="Atualizar"
            className="h-8 rounded-full border border-border/60 bg-muted/40 px-3 text-[11px] font-medium hover:bg-muted/60 backdrop-blur-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/40">
          <KpiCell label="Total vendido" value={formatCurrencyCompact(kpis.total)} accent />
          <KpiCell label="Maior venda" value={formatCurrencyCompact(kpis.maiorVenda)} />
          <KpiCell label="Média / vendedor" value={formatCurrencyCompact(kpis.media)} />
          <KpiCell
            label="Vendedores ativos"
            value={
              <>
                {kpis.ativos}
                <span className="text-sm font-normal text-muted-foreground">
                  /{kpis.totalVendedores}
                </span>
              </>
            }
          />
        </div>

        {/* Meta consolidada inline */}
        {periodo === "mensal" && metaAtual && (
          <div className="border-t border-border/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Meta do time
                </span>
                {metaAtual.descricao && (
                  <span className="text-[11px] text-muted-foreground/70 truncate">
                    · {metaAtual.descricao}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
                <span className="text-muted-foreground tabular-nums">
                  {formatCurrencyCompact(kpis.total)} / {formatCurrencyCompact(metaValor)}
                </span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {metaPercent.toFixed(0)}%
                </span>
                <span className="hidden sm:inline text-muted-foreground/60">
                  · {diasRestantes}d restantes
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metaPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {vendedoresRanking.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 py-16 px-6 text-center backdrop-blur-sm">
          <div className="mx-auto w-12 h-12 rounded-full border border-border/60 bg-muted/40 flex items-center justify-center mb-4">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            Sem movimentação {periodo === "mensal" ? "este mês" : "esta semana"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Nenhuma venda registrada no período selecionado.
          </p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div
              data-tour="ranking-section"
              className="grid grid-cols-3 gap-2 sm:gap-3 items-end"
            >
              {/* 2nd */}
              <div className="pt-4 sm:pt-6">
                <PodiumCard
                  vendedor={second}
                  rank={2}
                  isCurrentUser={second?.user_id === currentUserId}
                  metaAtual={metaValor}
                  delay={0.1}
                />
              </div>
              {/* 1st */}
              <PodiumCard
                vendedor={first}
                rank={1}
                isCurrentUser={first?.user_id === currentUserId}
                metaAtual={metaValor}
                delay={0}
              />
              {/* 3rd */}
              <div className="pt-8 sm:pt-12">
                <PodiumCard
                  vendedor={third}
                  rank={3}
                  isCurrentUser={third?.user_id === currentUserId}
                  metaAtual={metaValor}
                  delay={0.2}
                />
              </div>
            </div>
          )}

          {/* Full Ranking List */}
          {rest.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Classificação
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">
                    · {rest.length} {rest.length === 1 ? "vendedor" : "vendedores"}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-border/40">
                <AnimatePresence>
                  {rest.map((vendedor, idx) => {
                    const posicao = idx + 4;
                    const isCurrentUser = vendedor.user_id === currentUserId;
                    const hasIndividualMeta =
                      vendedor.meta_individual && vendedor.meta_individual > 0;
                    const progressValue = hasIndividualMeta
                      ? Math.min(
                          (vendedor.valor_vendido / vendedor.meta_individual!) * 100,
                          100,
                        )
                      : 0;

                    const prevPos = previousRankMap[vendedor.user_id];
                    const delta = prevPos ? prevPos - posicao : 0;

                    const pessoaAcima =
                      idx === 0 ? top3[top3.length - 1] : rest[idx - 1];
                    const gapParaUltrapassar = pessoaAcima
                      ? pessoaAcima.valor_vendido - vendedor.valor_vendido
                      : 0;

                    const nivelConfig = getNivelConfig(vendedor.nivel || "Bronze");
                    const NivelIcon = nivelConfig.icon;

                    return (
                      <motion.div
                        key={vendedor.user_id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={cn(
                          "relative flex items-center gap-3 sm:gap-4 px-4 py-3 transition-colors",
                          isCurrentUser
                            ? "bg-emerald-500/[0.06]"
                            : "hover:bg-card/40",
                        )}
                      >
                        {isCurrentUser && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500" />
                        )}

                        {/* Position */}
                        <div className="flex items-center gap-1.5 w-10 sm:w-12 flex-shrink-0">
                          <span className="text-xs font-medium text-muted-foreground tabular-nums w-5 text-right">
                            {posicao}
                          </span>
                          {delta !== 0 ? (
                            <span
                              className={cn(
                                "flex items-center text-[9px] font-semibold",
                                delta > 0 ? "text-emerald-400" : "text-red-400",
                              )}
                            >
                              <ChevronUp
                                className={cn(
                                  "h-2.5 w-2.5",
                                  delta < 0 && "rotate-180",
                                )}
                              />
                              {Math.abs(delta)}
                            </span>
                          ) : prevPos ? (
                            <Minus className="h-2.5 w-2.5 text-muted-foreground/40" />
                          ) : (
                            <span className="w-2.5" />
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border/60 flex-shrink-0">
                          <AvatarImage src={vendedor.avatar_url} />
                          <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">
                            {getInitials(vendedor.nome)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name + Level + Meta progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-foreground text-sm truncate">
                              {vendedor.nome}
                            </p>
                            {isCurrentUser && (
                              <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                                você
                              </span>
                            )}
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 text-[10px] font-medium",
                                nivelConfig.color,
                              )}
                            >
                              <NivelIcon className="h-2.5 w-2.5" />
                              {vendedor.nivel || "Bronze"}
                            </span>
                          </div>

                          {hasIndividualMeta ? (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-0.5 flex-1 rounded-full bg-muted overflow-hidden max-w-[200px]">
                                <div
                                  className="h-full bg-emerald-500/80 rounded-full"
                                  style={{ width: `${progressValue}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {vendedor.percentual_meta?.toFixed(0)}%
                              </span>
                            </div>
                          ) : gapParaUltrapassar > 0 ? (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              +{formatCurrencyCompact(gapParaUltrapassar)} p/ #{posicao - 1}
                            </p>
                          ) : null}
                        </div>

                        {/* Value */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
                            {formatCurrencyCompact(vendedor.valor_vendido)}
                          </p>
                          {hasIndividualMeta && (
                            <p className="hidden sm:block text-[10px] text-muted-foreground/70 tabular-nums">
                              de {formatCurrencyCompact(vendedor.meta_individual!)}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}

      {/* No consolidated goal warning */}
      {periodo === "mensal" && !metaAtual && vendedoresRanking.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 flex items-center gap-3">
          <Target className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-amber-200/90">
            {isAdmin
              ? "Nenhuma meta consolidada definida para este mês. Defina uma meta na página de Metas para acompanhar o progresso global."
              : "Aguardando definição da meta consolidada do mês pelo administrador."}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================
// Subcomponents
// ============================================

interface KpiCellProps {
  label: string;
  value: ReactNode;
  accent?: boolean;
}

const KpiCell = ({ label, value, accent }: KpiCellProps) => (
  <div className="px-4 py-3 sm:py-3.5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
      {label}
    </p>
    <p
      className={cn(
        "text-lg sm:text-xl font-semibold tabular-nums",
        accent ? "text-emerald-400" : "text-foreground",
      )}
    >
      {value}
    </p>
  </div>
);

interface PodiumCardProps {
  vendedor?: VendedorRanking;
  rank: 1 | 2 | 3;
  isCurrentUser: boolean;
  metaAtual: number;
  delay: number;
}

const PODIUM_STYLES: Record<1 | 2 | 3, { glow: string; ring: string; badge: string; icon: string }> = {
  1: {
    glow: "from-yellow-400/20 via-yellow-500/5 to-transparent",
    ring: "ring-yellow-400/40",
    badge: "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950",
    icon: "text-yellow-400",
  },
  2: {
    glow: "from-slate-300/15 via-slate-400/5 to-transparent",
    ring: "ring-slate-300/30",
    badge: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900",
    icon: "text-slate-300",
  },
  3: {
    glow: "from-amber-600/15 via-amber-700/5 to-transparent",
    ring: "ring-amber-600/30",
    badge: "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50",
    icon: "text-amber-500",
  },
};

const PodiumCard = ({ vendedor, rank, isCurrentUser, metaAtual, delay }: PodiumCardProps) => {
  if (!vendedor) {
    return <div className="rounded-2xl border border-border/40 bg-muted/20 h-32" />;
  }

  const style = PODIUM_STYLES[rank];
  const nivelConfig = getNivelConfig(vendedor.nivel || "Bronze");
  const NivelIcon = nivelConfig.icon;
  const percentContrib = metaAtual > 0 ? (vendedor.valor_vendido / metaAtual) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col",
        rank === 1 && "ring-1 ring-yellow-400/30",
      )}
    >
      {/* Radial glow */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b opacity-80 pointer-events-none",
          style.glow,
        )}
      />

      {/* Current user stripe */}
      {isCurrentUser && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
      )}

      {/* Crown for rank 1 */}
      {rank === 1 && (
        <Crown
          className={cn(
            "absolute top-2 right-2 h-4 w-4 sm:h-5 sm:w-5 fill-current",
            style.icon,
          )}
        />
      )}

      <div className="relative z-10 p-3 sm:p-4 flex flex-col items-center text-center gap-2">
        {/* Avatar */}
        <div className="relative">
          <Avatar
            className={cn(
              "h-10 w-10 sm:h-14 sm:w-14 ring-2 ring-offset-2 ring-offset-background",
              style.ring,
            )}
          >
            <AvatarImage src={vendedor.avatar_url} />
            <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
              {getInitials(vendedor.nome)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg",
              style.badge,
            )}
          >
            {rank}
          </div>
        </div>

        {/* Name */}
        <div className="w-full px-1">
          <p className="text-[11px] sm:text-sm font-semibold text-foreground truncate">
            {vendedor.nome}
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <NivelIcon className={cn("h-2.5 w-2.5", nivelConfig.color)} />
            <span className={cn("text-[9px] font-medium", nivelConfig.color)}>
              {vendedor.nivel || "Bronze"}
            </span>
          </div>
        </div>

        {/* Value */}
        <p className="text-sm sm:text-lg font-bold tabular-nums text-foreground">
          {formatCurrencyCompact(vendedor.valor_vendido)}
        </p>

        {metaAtual > 0 && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground tabular-nums -mt-1">
            {percentContrib.toFixed(0)}% da meta
          </p>
        )}

        {isCurrentUser && (
          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider -mt-0.5">
            você
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default Ranking;
