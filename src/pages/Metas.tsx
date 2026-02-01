import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import {
  Target,
  TrendingUp,
  Zap,
  RefreshCw,
  Trophy,
  Medal,
  Crown,
  Flame,
  Users,
  ChevronUp,
  ChevronDown,
  Minus,
  PieChart
} from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { logger } from "@/utils/logger";

const Metas = () => {
  const { user, isAdmin } = useAuth();
  const { needsUpgrade } = usePlan();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useTenant();
  const [selectedMetaId, setSelectedMetaId] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Note: Feature gate check moved after all hooks (React rules of hooks)

  const applyCompanyFilter = (query: any) => {
    // SECURITY: Always require a valid company_id to prevent data leakage
    if (!activeCompanyId) {
      return query.eq("company_id", "00000000-0000-0000-0000-000000000000");
    }
    return query.eq("company_id", activeCompanyId);
  };

  // Filter profiles join, not metas columns
  const applyNonSuperAdmin = (query: any) => query.eq("profiles.is_super_admin", false);

  // Refetch function for real-time updates
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
      await queryClient.invalidateQueries({ queryKey: ["metas-individuais-full"] });
      await queryClient.invalidateQueries({ queryKey: ["vendas-mes-atual"] });
      toast.success("Dados atualizados!");
    } catch (error) {
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Buscar metas consolidadas
  const { data: metasConsolidadas = [], isLoading: loadingConsolidadas } = useQuery({
    queryKey: ["metas-consolidadas", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await applyCompanyFilter(
        supabase
          .from("metas_consolidadas")
          .select("*")
          .order("mes_referencia", { ascending: false })
      );

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
    refetchInterval: 10000, // Auto-refetch every 10 seconds
  });

  useEffect(() => {
    // When company changes, reset selected meta to default (all)
    setSelectedMetaId("all");
  }, [activeCompanyId]);

  // Buscar a meta consolidada selecionada
  const metaConsolidadaSelecionada = selectedMetaId === "all"
    ? metasConsolidadas[0]
    : metasConsolidadas.find(m => m.id === selectedMetaId);

  // Buscar vendas do mês atual para calcular valores reais
  const { data: vendasMesAtual = [] } = useQuery({
    queryKey: ["vendas-mes-atual", metaConsolidadaSelecionada?.mes_referencia, activeCompanyId],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada) return [];

      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const [year, month] = mesRef.split('-');
      const inicioMes = `${year}-${month}-01`;

      // Calcular fim do mês sem problemas de timezone
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const ultimoDia = new Date(yearNum, monthNum, 0).getDate(); // Último dia do mês
      const fimMes = `${year}-${month}-${String(ultimoDia).padStart(2, '0')}`;

      logger.log(`[Metas] Buscando vendas de ${inicioMes} até ${fimMes}`);

      const { data, error } = await applyCompanyFilter(
        supabase
          .from("vendas")
          .select("user_id, valor, status, data_venda, company_id")
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
      );

      if (error) throw error;

      logger.log(`[Metas] Vendas encontradas:`, data);
      return data || [];
    },
    enabled: !!metaConsolidadaSelecionada,
    refetchInterval: 10000,
  });

  // Buscar metas individuais com cálculo real baseado em vendas
  const { data: metasIndividuais = [], isLoading: loadingIndividuais } = useQuery({
    queryKey: ["metas-individuais-full", metaConsolidadaSelecionada?.mes_referencia, vendasMesAtual, activeCompanyId],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada) return [];

      const mesRef = metaConsolidadaSelecionada.mes_referencia;

      // Use exact match on mes_referencia (format: "YYYY-MM-01")
      logger.log(`[Metas] Buscando metas individuais para mes_referencia: ${mesRef}, company: ${activeCompanyId}`);

      // First, fetch metas for this month and company (using same join syntax as AdminMetas)
      let metasQuery = supabase
        .from("metas")
        .select("*, profiles:user_id(id, nome, avatar_url, is_super_admin)")
        .eq("mes_referencia", mesRef);

      // Filter by metas.company_id directly
      if (activeCompanyId) {
        metasQuery = metasQuery.eq("company_id", activeCompanyId);
      }

      const { data: metas, error: metasError } = await metasQuery;

      if (metasError) {
        logger.error("[Metas] Erro ao buscar metas individuais:", metasError);
        throw metasError;
      }

      logger.log(`[Metas] Metas individuais encontradas (raw):`, metas);

      // Calculate total vendas by user from the already fetched vendas
      const vendasPorUsuario: { [key: string]: number } = {};
      vendasMesAtual.forEach((venda: any) => {
        vendasPorUsuario[venda.user_id] = (vendasPorUsuario[venda.user_id] || 0) + Number(venda.valor);
      });

      // Total de vendas do mês (para calcular contribuição)
      const totalVendasMes = Object.values(vendasPorUsuario).reduce((a, b) => a + b, 0);

      // Map data with real sales values
      const resultado = (metas || [])
        .filter((meta: any) => !meta.profiles?.is_super_admin)
        .map((meta: any) => {
          const valorMeta = Number(meta.valor_meta) || 0;
          const valorRealizado = vendasPorUsuario[meta.user_id] || 0;
          const percentual = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;
          const contribuicaoPercentual = totalVendasMes > 0 ? (valorRealizado / totalVendasMes) * 100 : 0;
          const faltaAtingir = Math.max(0, valorMeta - valorRealizado);

          return {
            id: meta.id,
            user_id: meta.user_id,
            nome: meta.profiles.nome,
            avatar_url: meta.profiles.avatar_url,
            valorMeta,
            valorRealizado,
            percentual,
            contribuicaoPercentual,
            faltaAtingir,
            status: percentual >= 100 ? 'atingida' : percentual >= 50 ? 'progresso' : 'inicio',
          };
        }).sort((a: any, b: any) => b.valorRealizado - a.valorRealizado);

      return resultado;
    },
    enabled: !!metaConsolidadaSelecionada,
  });

  // Calculate consolidated values from actual sales
  const valorConsolidadoAtingido = vendasMesAtual.reduce((acc: number, v: any) => acc + Number(v.valor), 0);
  const metaConsolidadaTotal = Number(metaConsolidadaSelecionada?.valor_meta) || 0;
  const percentualConsolidado = metaConsolidadaTotal > 0
    ? (valorConsolidadoAtingido / metaConsolidadaTotal) * 100
    : 0;

  // Calcular dias restantes
  const calcularDiasRestantes = () => {
    if (!metaConsolidadaSelecionada) return 0;
    const mesRef = metaConsolidadaSelecionada.mes_referencia;
    const [year, month] = mesRef.split('-');
    const hoje = new Date();
    const ultimoDiaMes = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const diffTime = ultimoDiaMes.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const diasRestantes = calcularDiasRestantes();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')} M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} k`;
    }
    return formatCurrency(value);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  // Progress bar color logic based on percentage
  const getProgressBarColor = (percentual: number) => {
    if (percentual >= 100) {
      return "bg-gradient-to-r from-emerald-500 to-emerald-400";
    }
    if (percentual >= 50) {
      return "bg-gradient-to-r from-cyan-500 to-cyan-400";
    }
    return "bg-gradient-to-r from-indigo-500 to-indigo-400";
  };

  // Avatar ring color based on status
  const getAvatarRingColor = (percentual: number) => {
    if (percentual >= 100) return "ring-emerald-500 ring-2";
    if (percentual >= 50) return "ring-cyan-500 ring-2";
    return "ring-indigo-500/50 ring-2";
  };

  // Status badge based on percentage
  const getStatusBadge = (percentual: number) => {
    if (percentual >= 100) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-xs">
          <Trophy className="h-3 w-3 mr-1" />
          Meta Batida!
        </Badge>
      );
    }
    if (percentual >= 75) {
      return (
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-2 py-0.5 text-xs">
          <Flame className="h-3 w-3 mr-1" />
          Quase lá!
        </Badge>
      );
    }
    if (percentual >= 50) {
      return (
        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 px-2 py-0.5 text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Em progresso
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted text-muted-foreground border-border px-2 py-0.5 text-xs">
        <Target className="h-3 w-3 mr-1" />
        Iniciando
      </Badge>
    );
  };

  const isLoading = loadingConsolidadas || loadingIndividuais;

  // Feature gate check - must be after all hooks
  if (needsUpgrade('metas')) {
    return <UpgradePrompt feature="metas" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-1">
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Metas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Acompanhe o progresso das metas da equipe</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 border-border bg-muted text-foreground hover:bg-muted/80 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* Seletor de Meta - Pills */}
      {metasConsolidadas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none">
          <button
            onClick={() => setSelectedMetaId("all")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${selectedMetaId === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            Atual
          </button>
          {metasConsolidadas.map((meta) => (
            <button
              key={meta.id}
              onClick={() => setSelectedMetaId(meta.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${selectedMetaId === meta.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              {meta.descricao || format(new Date(meta.mes_referencia + "T12:00:00"), "MMM yyyy", { locale: ptBR })}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
          <p className="mt-4">Carregando metas...</p>
        </div>
      ) : !metaConsolidadaSelecionada ? (
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma Meta Consolidada</h3>
          <p className="text-muted-foreground">Crie uma meta consolidada em Administração → Metas</p>
        </div>
      ) : (
        <>
          {/* HERO BANNER - Meta Consolidada */}
          <Card className="relative overflow-hidden border border-border bg-card shadow-sm">
            <CardContent className="relative z-10 p-6 sm:p-8">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Left Side - Info */}
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                        <Zap className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-200 uppercase tracking-wider">
                        Meta Consolidada
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {metaConsolidadaSelecionada.descricao || "Meta da Equipe"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(metaConsolidadaSelecionada.mes_referencia + "T12:00:00"), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Values - Realizado vs Meta */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Realizado</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">
                        {formatCurrencyCompact(valorConsolidadoAtingido)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Meta</p>
                      <p className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                        {formatCurrencyCompact(metaConsolidadaTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar - Thick */}
                  <div className="space-y-2">
                    <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(percentualConsolidado, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      </div>
                      {/* Percentage inside bar */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground drop-shadow-sm">
                          {percentualConsolidado.toFixed(1)}% completo
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>Faltam {diasRestantes} dias</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Big Percentage */}
                <div className="text-center lg:text-right">
                  <div className="inline-block">
                    {/* Giant Percentage */}
                    <div className="relative">
                      <span className="text-7xl sm:text-8xl lg:text-9xl font-bold bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent tabular-nums">
                        {percentualConsolidado.toFixed(1)}
                      </span>
                      <span className="text-3xl sm:text-4xl font-bold text-muted-foreground">%</span>
                    </div>

                    {/* Status */}
                    <div className="mt-4">
                      {percentualConsolidado >= 100 ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200">
                          <Trophy className="h-5 w-5" />
                          <span className="font-semibold">Meta Atingida!</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-200">
                          <Target className="h-5 w-5" />
                          <span className="font-semibold">
                            Faltam {formatCurrencyCompact(Math.max(0, metaConsolidadaTotal - valorConsolidadoAtingido))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contribuição Individual */}
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-200">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Contribuição Individual</h2>
                  <p className="text-xs text-muted-foreground">
                    {metasIndividuais.length} {metasIndividuais.length === 1 ? "vendedor" : "vendedores"} com meta definida
                  </p>
                </div>
              </div>
            </div>

            {metasIndividuais.length === 0 ? (
              <Card className="border border-border bg-card p-8 text-center">
                <Medal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma Meta Individual</h3>
                <p className="text-muted-foreground text-sm">
                  Defina metas individuais para os vendedores em Administração → Metas
                </p>
              </Card>
            ) : (
              /* Grid of Seller Cards */
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {metasIndividuais.map((vendedor: any, index: number) => {
                  const posicao = index + 1;
                  const isWinner = vendedor.percentual >= 100;
                  const isTop3 = posicao <= 3;

                  return (
                    <Card
                      key={vendedor.id}
                      className={`relative overflow-hidden border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md ${isWinner
                        ? "ring-2 ring-emerald-200 dark:ring-emerald-500/50 shadow-lg shadow-emerald-500/20"
                        : isTop3
                          ? "ring-1 ring-indigo-200 dark:ring-indigo-500/30"
                          : ""
                        }`}
                    >
                      {/* Winner glow effect */}
                      {isWinner && (
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 via-transparent to-emerald-100/50 dark:from-emerald-500/5 dark:to-emerald-500/5" />
                      )}

                      <CardContent className="relative z-10 p-4 space-y-4">
                        {/* Row 1: Avatar + Name + Percentage */}
                        <div className="flex items-center gap-3">
                          {/* Position Badge */}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${posicao === 1
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            : posicao === 2
                              ? "bg-slate-200 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300"
                              : posicao === 3
                                ? "bg-amber-200 text-amber-700 dark:bg-amber-700/20 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}>
                            {posicao <= 3 ? (
                              posicao === 1 ? <Crown className="h-4 w-4" /> : `#${posicao}`
                            ) : (
                              `#${posicao}`
                            )}
                          </div>

                          {/* Avatar with status ring */}
                          <div className="relative flex-shrink-0">
                            <Avatar className={`h-10 w-10 ${getAvatarRingColor(vendedor.percentual)}`}>
                              {vendedor.avatar_url && (
                                <AvatarImage src={vendedor.avatar_url} alt={vendedor.nome} />
                              )}
                              <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
                                {getInitials(vendedor.nome)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Winner trophy */}
                            {isWinner && (
                              <div className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50">
                                <Trophy className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{vendedor.nome}</h4>
                            {getStatusBadge(vendedor.percentual)}
                          </div>

                          {/* Percentage */}
                          <div className="flex-shrink-0 text-right">
                            <span className={`text-2xl font-bold tabular-nums ${isWinner
                              ? "text-emerald-600 dark:text-emerald-300"
                              : vendedor.percentual >= 50
                                ? "text-cyan-600 dark:text-cyan-300"
                                : "text-indigo-600 dark:text-indigo-300"
                              }`}>
                              {vendedor.percentual.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Progress Bar */}
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor(vendedor.percentual)} rounded-full transition-all duration-700`}
                            style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                          >
                            {isWinner && (
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                            )}
                          </div>
                        </div>

                        {/* Row 3: Values */}
                        <div className="flex items-center justify-between text-sm text-foreground">
                          <div>
                            <span className="text-muted-foreground">Realizado: </span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(vendedor.valorRealizado)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Meta: </span>
                            <span className="font-medium text-muted-foreground">
                              {formatCurrency(vendedor.valorMeta)}
                            </span>
                          </div>
                        </div>

                        {/* Row 4: Contribution to Consolidated */}
                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PieChart className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                              <span className="text-xs text-muted-foreground">Contribuição para Meta Global</span>
                            </div>
                            <span className={`text-sm font-bold ${vendedor.contribuicaoPercentual >= 30
                              ? "text-emerald-600 dark:text-emerald-300"
                              : vendedor.contribuicaoPercentual >= 15
                                ? "text-cyan-600 dark:text-cyan-300"
                                : "text-indigo-600 dark:text-indigo-300"
                              }`}>
                              {vendedor.contribuicaoPercentual.toFixed(1)}%
                            </span>
                          </div>
                          {/* Mini contribution bar */}
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                              style={{ width: `${Math.min(vendedor.contribuicaoPercentual, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Row 5: What's missing */}
                        {vendedor.faltaAtingir > 0 && (
                          <div className="text-xs text-muted-foreground text-center">
                            Faltam <span className="text-foreground font-medium">{formatCurrency(vendedor.faltaAtingir)}</span> para bater a meta
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Metas;
