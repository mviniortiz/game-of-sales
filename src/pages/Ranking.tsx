import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { isAdmin } = useAuth();

  // Get current month boundaries
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje).toISOString().split('T')[0];
  const fimMes = endOfMonth(hoje).toISOString().split('T')[0];
  const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

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

  // Fetch ALL sellers with their sales - INDEPENDENT of meta
  const { data: vendedoresRanking = [], isLoading: loadingVendedores, refetch: refetchVendedores } = useQuery({
    queryKey: ["vendedores-ranking", inicioMes, fimMes],
    queryFn: async () => {
      // 1. Fetch all profiles (sellers)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, nivel");

      if (profilesError) throw profilesError;

      // 2. Fetch all approved sales for this month
      const { data: vendas, error: vendasError } = await supabase
        .from("vendas")
        .select("user_id, valor")
        .eq("status", "Aprovado")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes);

      if (vendasError) throw vendasError;

      // 3. Fetch individual goals for this month
      const { data: metas, error: metasError } = await supabase
        .from("metas")
        .select("user_id, valor_meta, current_value")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (metasError) throw metasError;

      // 4. Aggregate sales by user
      const vendasPorUsuario: Record<string, number> = {};
      vendas?.forEach((venda) => {
        vendasPorUsuario[venda.user_id] = (vendasPorUsuario[venda.user_id] || 0) + Number(venda.valor);
      });

      // 5. Map goals by user
      const metasPorUsuario: Record<string, { valor_meta: number; current_value: number }> = {};
      metas?.forEach((meta) => {
        metasPorUsuario[meta.user_id] = {
          valor_meta: Number(meta.valor_meta) || 0,
          current_value: Number(meta.current_value) || 0,
        };
      });

      // 6. Build ranking list
      const ranking: VendedorRanking[] = (profiles || []).map((profile) => {
        const valorVendido = vendasPorUsuario[profile.id] || 0;
        const metaIndividual = metasPorUsuario[profile.id]?.valor_meta;
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

  // Convert to format expected by RankingPodium (if it exists)
  const contribuicoesForPodium = vendedoresRanking.map((v) => ({
    user_id: v.user_id,
    nome: v.nome,
    avatar_url: v.avatar_url,
    contribuicao: v.valor_vendido,
    percentual_contribuicao: metaAtual 
      ? (v.valor_vendido / Number(metaAtual.valor_meta)) * 100 
      : 0,
    nivel: v.nivel,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Ranking de Vendedores
          </h1>
          <p className="text-muted-foreground">
            {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })} • Atualização automática a cada 5s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
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
              <CardContent>
                <div className="space-y-3">
                  {vendedoresRanking.map((vendedor, index) => {
                    const posicao = index + 1;
                    const hasIndividualMeta = vendedor.meta_individual && vendedor.meta_individual > 0;
                    const progressValue = hasIndividualMeta 
                      ? Math.min((vendedor.valor_vendido / vendedor.meta_individual!) * 100, 100)
                      : 100; // Full bar if no individual goal

                    return (
                      <div 
                        key={vendedor.user_id}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all hover:scale-[1.01] ${
                          posicao <= 3 
                            ? "bg-gradient-to-r from-primary/10 to-transparent border border-primary/20" 
                            : "bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Position */}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
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
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={vendedor.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {getInitials(vendedor.nome)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Name and Level */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{vendedor.nome}</p>
                              <Badge className={`${getNivelColor(vendedor.nivel || 'Bronze')} text-white text-xs`}>
                                {vendedor.nivel || 'Bronze'}
                              </Badge>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-2 flex items-center gap-2">
                              <Progress 
                                value={progressValue} 
                                className={`h-2 flex-1 ${!hasIndividualMeta ? 'opacity-50' : ''}`}
                              />
                              <span className="text-xs text-muted-foreground w-16 text-right">
                                {hasIndividualMeta 
                                  ? `${vendedor.percentual_meta?.toFixed(0)}% da meta`
                                  : "Sem meta"
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Value */}
                        <div className="text-right">
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
