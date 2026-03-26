import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaConsolidadaCard } from "@/components/metas/MetaConsolidadaCard";
import { RankingPodium } from "@/components/metas/RankingPodium";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, Loader2, Trophy, TrendingUp, TrendingDown, Minus,
  RefreshCw, Users, DollarSign, Award, BarChart3, ChevronUp,
  Flame, Crown, Medal, Star, Gem, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/utils/logger";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando ranking...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Trophy className="h-6 sm:h-8 w-6 sm:w-8 text-yellow-500" />
            <span className="hidden sm:inline">Ranking de Vendedores</span>
            <span className="sm:hidden">Ranking</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
            <span className="hidden sm:inline"> · Atualização automática a cada 30s</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoTab)}>
            <TabsList className="h-9">
              <TabsTrigger value="semanal" className="text-xs sm:text-sm px-3">
                Semanal
              </TabsTrigger>
              <TabsTrigger value="mensal" className="text-xs sm:text-sm px-3">
                Mensal
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            aria-label="Atualizar"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Vendido</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-500 mt-1">
                    {formatCurrencyCompact(kpis.total)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/50 bg-gradient-to-br from-yellow-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Maior Venda</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-500 mt-1">
                    {formatCurrencyCompact(kpis.maiorVenda)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Award className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Média/Vendedor</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-500 mt-1">
                    {formatCurrencyCompact(kpis.media)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Vendedores Ativos</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-500 mt-1">
                    {kpis.ativos}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{kpis.totalVendedores}
                    </span>
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Meta Consolidada - only for mensal */}
      {periodo === "mensal" && metaAtual && (
        <MetaConsolidadaCard
          metaTotal={Number(metaAtual.valor_meta)}
          valorAtingido={kpis.total}
          diasRestantes={diasRestantes}
          descricao={metaAtual.descricao || undefined}
        />
      )}

      {/* Content */}
      {vendedoresRanking.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Nenhum Vendedor Encontrado</h2>
              <p className="text-muted-foreground">
                Não há vendedores cadastrados ou nenhuma venda foi registrada{" "}
                {periodo === "mensal" ? "este mês" : "esta semana"}.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Podium */}
          {vendedoresRanking.length > 0 && (
            <div data-tour="ranking-section">
              <RankingPodium vendedores={contribuicoesForPodium} />
            </div>
          )}

          {/* Full Ranking List */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Classificação Completa
                <Badge variant="secondary" className="ml-auto text-xs font-normal">
                  {periodo === "mensal" ? "Mensal" : "Semanal"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="space-y-1.5 sm:space-y-2">
                <AnimatePresence>
                  {vendedoresRanking.map((vendedor, index) => {
                    const posicao = index + 1;
                    const isCurrentUser = vendedor.user_id === currentUserId;
                    const hasIndividualMeta =
                      vendedor.meta_individual && vendedor.meta_individual > 0;
                    const progressValue = hasIndividualMeta
                      ? Math.min(
                          (vendedor.valor_vendido / vendedor.meta_individual!) * 100,
                          100,
                        )
                      : 0;

                    // Delta from previous period
                    const prevPos = previousRankMap[vendedor.user_id];
                    const delta = prevPos ? prevPos - posicao : 0;

                    // Gap to next person above
                    const pessoaAcima = index > 0 ? vendedoresRanking[index - 1] : null;
                    const gapParaUltrapassar = pessoaAcima
                      ? pessoaAcima.valor_vendido - vendedor.valor_vendido
                      : 0;

                    const nivelConfig = getNivelConfig(vendedor.nivel || "Bronze");
                    const NivelIcon = nivelConfig.icon;

                    return (
                      <motion.div
                        key={vendedor.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl transition-all gap-2 sm:gap-3 ${
                          isCurrentUser
                            ? "bg-primary/10 border-2 border-primary/40 shadow-lg shadow-primary/5"
                            : posicao <= 3
                              ? "bg-gradient-to-r from-yellow-500/5 to-transparent border border-yellow-500/10"
                              : "bg-muted/20 hover:bg-muted/40 border border-transparent"
                        }`}
                      >
                        {/* Current user indicator */}
                        {isCurrentUser && (
                          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                        )}

                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Position + Delta */}
                          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-10">
                            <div
                              className={`flex items-center justify-center w-9 h-9 rounded-lg font-bold text-sm ${
                                posicao === 1
                                  ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-lg shadow-yellow-500/30"
                                  : posicao === 2
                                    ? "bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 shadow-lg shadow-gray-400/20"
                                    : posicao === 3
                                      ? "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 shadow-lg shadow-amber-500/20"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {posicao}
                            </div>
                            {/* Delta arrow */}
                            {delta !== 0 && (
                              <div
                                className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                                  delta > 0 ? "text-emerald-500" : "text-red-500"
                                }`}
                              >
                                {delta > 0 ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronUp className="h-3 w-3 rotate-180" />
                                )}
                                {Math.abs(delta)}
                              </div>
                            )}
                            {delta === 0 && prevPos && (
                              <Minus className="h-3 w-3 text-muted-foreground/50" />
                            )}
                          </div>

                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <Avatar
                              className={`h-10 w-10 sm:h-11 sm:w-11 border-2 ${
                                posicao === 1
                                  ? "border-yellow-500"
                                  : posicao === 2
                                    ? "border-gray-400"
                                    : posicao === 3
                                      ? "border-amber-600"
                                      : "border-border"
                              }`}
                            >
                              <AvatarImage src={vendedor.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {getInitials(vendedor.nome)}
                              </AvatarFallback>
                            </Avatar>
                            {posicao === 1 && (
                              <Crown className="absolute -top-2 -right-1 h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>

                          {/* Name, Level, Progress */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                                {vendedor.nome}
                              </p>
                              {isCurrentUser && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-primary/40 text-primary h-5"
                                >
                                  Você
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-5 gap-0.5 border ${nivelConfig.bg} ${nivelConfig.color}`}
                              >
                                <NivelIcon className="h-2.5 w-2.5" />
                                {vendedor.nivel || "Bronze"}
                              </Badge>
                            </div>

                            {/* Progress bar - desktop */}
                            {hasIndividualMeta && (
                              <div className="hidden sm:flex mt-1.5 items-center gap-2">
                                <Progress value={progressValue} className="h-1.5 flex-1" />
                                <span className="text-[11px] text-muted-foreground w-12 text-right tabular-nums">
                                  {vendedor.percentual_meta?.toFixed(0)}%
                                </span>
                              </div>
                            )}

                            {/* Gap indicator */}
                            {gapParaUltrapassar > 0 && posicao > 1 && (
                              <p className="hidden sm:block text-[11px] text-muted-foreground/70 mt-0.5">
                                <span className="text-primary/70 font-medium">
                                  {formatCurrencyCompact(gapParaUltrapassar)}
                                </span>{" "}
                                para ultrapassar #{posicao - 1}
                              </p>
                            )}
                          </div>

                          {/* Value - Desktop */}
                          <div className="hidden sm:block text-right flex-shrink-0">
                            <p className="text-lg font-bold text-emerald-500 tabular-nums">
                              {formatCurrency(vendedor.valor_vendido)}
                            </p>
                            {hasIndividualMeta && (
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                Meta: {formatCurrency(vendedor.meta_individual!)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Mobile: Value + Progress */}
                        <div className="sm:hidden flex items-center justify-between pl-[3.25rem]">
                          <div className="flex items-center gap-2 flex-1 mr-3">
                            {hasIndividualMeta && (
                              <>
                                <Progress value={progressValue} className="h-1.5 flex-1" />
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                  {vendedor.percentual_meta?.toFixed(0)}%
                                </span>
                              </>
                            )}
                            {gapParaUltrapassar > 0 && posicao > 1 && !hasIndividualMeta && (
                              <p className="text-[10px] text-muted-foreground/70">
                                <span className="text-primary/70 font-medium">
                                  {formatCurrencyCompact(gapParaUltrapassar)}
                                </span>{" "}
                                p/ #{posicao - 1}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-emerald-500 flex-shrink-0 tabular-nums">
                            {formatCurrency(vendedor.valor_vendido)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No consolidated goal warning */}
      {periodo === "mensal" && !metaAtual && vendedoresRanking.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Target className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                {isAdmin
                  ? "Nenhuma meta consolidada definida para este mês. Defina uma meta na página de Metas para acompanhar o progresso global."
                  : "Aguardando definição da meta consolidada do mês pelo administrador."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Ranking;
