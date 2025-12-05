import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaConsolidadaCard } from "@/components/metas/MetaConsolidadaCard";
import { RankingPodium } from "@/components/metas/RankingPodium";
import { RankingEvolutionChart } from "@/components/metas/RankingEvolutionChart";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Target, Loader2, Trophy, TrendingUp, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VendedorRanking {
  user_id: string;
  nome: string;
  avatar_url?: string;
  valor_vendido: number;
  meta_individual?: number;
  percentual_meta?: number;
  nivel?: string;
}

const Ranking = () => {
  const { isAdmin, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  
  // Determine which company to filter by for permissions
  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  // Get current month boundaries - using local date to avoid timezone issues
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth(); // 0-indexed
  
  // Create dates in local timezone
  const inicioMesDate = new Date(ano, mes, 1);
  const fimMesDate = new Date(ano, mes + 1, 0); // Last day of current month
  
  const inicioMes = format(inicioMesDate, "yyyy-MM-dd");
  const fimMes = format(fimMesDate, "yyyy-MM-dd");
  const mesReferencia = format(inicioMesDate, "yyyy-MM-dd");
  
  console.log("[Ranking] Período:", { inicioMes, fimMes, mesReferencia });

  // Fetch meta consolidada (optional - won't block ranking)
  const { data: metaAtual, isLoading: loadingMeta, refetch: refetchMeta } = useQuery({
    queryKey: ["meta-consolidada-atual", mesReferencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_consolidadas")
        .select("*")
        .eq("mes_referencia", mesReferencia)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5000,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch sellers with their sales - respecting permission hierarchy
  // Super Admins: See all sellers (except other Super Admins)
  // Admins: See only their company's sellers
  // Sellers: See all visible sellers in their context
  const { data: vendedoresRanking = [], isLoading: loadingVendedores, refetch: refetchVendedores } = useQuery({
    queryKey: ["vendedores-ranking", inicioMes, fimMes, effectiveCompanyId, isSuperAdmin],
    queryFn: async () => {
      console.log("[Ranking] Buscando dados...", { 
        inicioMes, 
        fimMes, 
        effectiveCompanyId,
        isSuperAdmin,
        companyId,
        activeCompanyId 
      });
      
      // 1. Fetch profiles (sellers)
      // For now, let's fetch ALL profiles to debug
      let profilesQuery = supabase
        .from("profiles")
        .select("id, nome, avatar_url, nivel, is_super_admin, company_id")
        .eq("is_super_admin", false);

      // Apply company filter based on role
      if (isSuperAdmin && activeCompanyId) {
        profilesQuery = profilesQuery.eq("company_id", activeCompanyId);
      } else if (!isSuperAdmin && companyId) {
        profilesQuery = profilesQuery.eq("company_id", companyId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) {
        console.error("[Ranking] Erro ao buscar profiles:", profilesError);
        throw profilesError;
      }
      
      console.log("[Ranking] Profiles encontrados:", profiles?.length, profiles);

      // Get the user IDs from profiles to filter sales
      const userIds = profiles?.map(p => p.id) || [];
      
      console.log("[Ranking] User IDs:", userIds);
      
      if (userIds.length === 0) {
        console.log("[Ranking] Nenhum perfil encontrado - retornando vazio");
        return [];
      }

      // 2. Fetch all approved sales for this month
      // First, let's see ALL sales to debug
      const { data: allVendas, error: allVendasError } = await supabase
        .from("vendas")
        .select("user_id, valor, status, data_venda, company_id")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes);
      
      console.log("[Ranking] TODAS as vendas do período:", allVendas?.length, allVendas);

      // Now filter by status and user IDs
      const vendas = allVendas?.filter(v => 
        v.status === "Aprovado" && userIds.includes(v.user_id)
      ) || [];
      
      console.log("[Ranking] Vendas filtradas (Aprovado + userIds):", vendas?.length, vendas);

      // 3. Fetch individual goals for this month
      const { data: metas, error: metasError } = await supabase
        .from("metas")
        .select("user_id, valor_meta")
        .eq("mes_referencia", mesReferencia)
        .in("user_id", userIds);

      if (metasError) {
        console.error("[Ranking] Erro ao buscar metas:", metasError);
        throw metasError;
      }
      
      console.log("[Ranking] Metas encontradas:", metas?.length);

      // 4. Aggregate sales by user
      const vendasPorUsuario: Record<string, number> = {};
      vendas?.forEach((venda) => {
        vendasPorUsuario[venda.user_id] = (vendasPorUsuario[venda.user_id] || 0) + Number(venda.valor);
      });
      
      console.log("[Ranking] Vendas por usuário:", vendasPorUsuario);

      // 5. Map goals by user
      const metasPorUsuario: Record<string, number> = {};
      metas?.forEach((meta: any) => {
        metasPorUsuario[meta.user_id] = Number(meta.valor_meta) || 0;
      });

      // 6. Build ranking list
      const ranking: VendedorRanking[] = (profiles || []).map((profile: any) => {
        const valorVendido = vendasPorUsuario[profile.id] || 0;
        const metaIndividual = metasPorUsuario[profile.id];
        const percentualMeta = metaIndividual && metaIndividual > 0 
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

      // 7. Sort by valor_vendido descending
      return ranking.sort((a, b) => b.valor_vendido - a.valor_vendido);
    },
    staleTime: 5000,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const isLoading = loadingMeta || loadingVendedores;

  const handleRefresh = () => {
    refetchMeta();
    refetchVendedores();
  };

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

  const valorTotalVendido = vendedoresRanking.reduce((acc, v) => acc + v.valor_vendido, 0);

  const calcularDiasRestantes = () => {
    const ultimoDiaMes = endOfMonth(hoje);
    const diffTime = ultimoDiaMes.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const diasRestantes = calcularDiasRestantes();

  const getNivelColor = (nivel: string) => {
    const colors: Record<string, string> = {
      "Bronze": "bg-amber-700",
      "Prata": "bg-gray-400",
      "Ouro": "bg-yellow-500",
      "Platina": "bg-blue-400",
      "Diamante": "bg-indigo-400"
    };
    return colors[nivel] || "bg-gray-500";
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Top 3 for podium
  const top3 = vendedoresRanking.slice(0, 3);
  // Rest of sellers
  const restanteVendedores = vendedoresRanking.slice(3);

  // Convert to format expected by RankingPodium
  const contribuicoesForPodium = vendedoresRanking.map((v, index) => ({
    user_id: v.user_id,
    nome: v.nome,
    avatar_url: v.avatar_url || null,
    contribuicao: v.valor_vendido,
    percentual_contribuicao: metaAtual 
      ? (v.valor_vendido / Number(metaAtual.valor_meta)) * 100 
      : 0,
    posicao_ranking: index + 1,
    nivel: v.nivel,
  }));

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
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
            <span className="hidden sm:inline"> • Atualização automática a cada 5s</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Meta Consolidada Card - Only show if exists */}
        {metaAtual && (
          <MetaConsolidadaCard
            metaTotal={Number(metaAtual.valor_meta)}
            valorAtingido={valorTotalVendido}
            diasRestantes={diasRestantes}
            descricao={metaAtual.descricao || undefined}
          />
        )}

        {/* No sellers found */}
        {vendedoresRanking.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Nenhum Vendedor Encontrado
                </h2>
                <p className="text-muted-foreground">
                  Não há vendedores cadastrados ou nenhuma venda foi registrada este mês.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium - Top 3 */}
            {top3.length > 0 && (
              <div data-tour="ranking-section">
                <RankingPodium vendedores={contribuicoesForPodium} />
              </div>
            )}

            {/* Evolution Chart */}
            {vendedoresRanking.length > 0 && (
              <RankingEvolutionChart vendedores={contribuicoesForPodium} />
            )}

            {/* Full Ranking List */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Classificação Completa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-2 sm:space-y-3">
                  {vendedoresRanking.map((vendedor, index) => {
                    const posicao = index + 1;
                    const hasIndividualMeta = vendedor.meta_individual && vendedor.meta_individual > 0;
                    const progressValue = hasIndividualMeta 
                      ? Math.min((vendedor.valor_vendido / vendedor.meta_individual!) * 100, 100)
                      : 100; // Full bar if no individual goal

                    return (
                      <div 
                        key={vendedor.user_id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg transition-all hover:scale-[1.01] gap-3 ${
                          posicao <= 3 
                            ? "bg-gradient-to-r from-primary/10 to-transparent border border-primary/20" 
                            : "bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Position */}
                          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-lg flex-shrink-0 ${
                            posicao === 1 ? "bg-yellow-500 text-yellow-900" :
                            posicao === 2 ? "bg-gray-300 text-gray-700" :
                            posicao === 3 ? "bg-amber-600 text-amber-100" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {posicao <= 3 ? (
                              posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : "🥉"
                            ) : (
                              `#${posicao}`
                            )}
                          </div>

                          {/* Avatar */}
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/20 flex-shrink-0">
                            <AvatarImage src={vendedor.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                              {getInitials(vendedor.nome)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Name and Level */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground text-sm sm:text-base truncate">{vendedor.nome}</p>
                              <Badge className={`${getNivelColor(vendedor.nivel || 'Bronze')} text-white text-[10px] sm:text-xs`}>
                                {vendedor.nivel || 'Bronze'}
                              </Badge>
                            </div>
                            
                            {/* Progress Bar - Hidden on mobile, shown in separate row */}
                            <div className="hidden sm:flex mt-2 items-center gap-2">
                              <Progress 
                                value={progressValue} 
                                className={`h-2 flex-1 ${!hasIndividualMeta ? 'opacity-50' : ''}`}
                              />
                              <span className="text-xs text-muted-foreground w-16 text-right">
                                {hasIndividualMeta 
                                  ? `${vendedor.percentual_meta?.toFixed(0)}%`
                                  : "Sem meta"
                                }
                              </span>
                            </div>
                          </div>

                          {/* Value - Desktop */}
                          <div className="hidden sm:block text-right flex-shrink-0">
                            <p className="text-xl font-bold text-emerald-500">
                              {formatCurrency(vendedor.valor_vendido)}
                            </p>
                            {hasIndividualMeta && (
                              <p className="text-xs text-muted-foreground">
                                Meta: {formatCurrency(vendedor.meta_individual!)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Mobile: Value and Progress */}
                        <div className="sm:hidden flex items-center justify-between pl-11">
                          <div className="flex-1 mr-3">
                            <Progress 
                              value={progressValue} 
                              className={`h-1.5 ${!hasIndividualMeta ? 'opacity-50' : ''}`}
                            />
                          </div>
                          <p className="text-base font-bold text-emerald-500 flex-shrink-0">
                            {formatCurrency(vendedor.valor_vendido)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Info about no consolidated goal */}
        {!metaAtual && vendedoresRanking.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-amber-400">
                <Target className="h-5 w-5" />
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
    </div>
  );
};

export default Ranking;
