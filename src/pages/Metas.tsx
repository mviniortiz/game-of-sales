import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MetaProgressCard } from "@/components/metas/MetaProgressCard";
import { MetasRanking } from "@/components/metas/MetasRanking";
import { MetaEvolutionChart } from "@/components/metas/MetaEvolutionChart";
import { Target, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const Metas = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMetaId, setSelectedMetaId] = useState<string>("all");

  // Refetch function for real-time updates
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
    queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
    queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
  };

  // Buscar metas consolidadas - READ FROM DB (current_value)
  const { data: metasConsolidadas = [], isLoading: loadingConsolidadas } = useQuery({
    queryKey: ["metas-consolidadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_consolidadas")
        .select("*")
        .order("mes_referencia", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar a meta consolidada selecionada
  const metaConsolidadaSelecionada = selectedMetaId === "all" 
    ? metasConsolidadas[0] 
    : metasConsolidadas.find(m => m.id === selectedMetaId);

  // Buscar metas individuais - READ FROM DB (current_value) - NO FRONTEND CALCULATION
  const { data: metasIndividuais = [] } = useQuery({
    queryKey: ["metas-individuais", metaConsolidadaSelecionada?.mes_referencia],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada) return [];

      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const [year, month] = mesRef.split('-');
      const inicioMes = `${year}-${month}-01`;
      const fimMes = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString().split('T')[0];

      // Fetch metas with current_value directly from DB
      const { data, error } = await supabase
        .from("metas")
        .select("*, profiles!inner(id, nome, avatar_url)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (error) throw error;

      // Map data - NO CALCULATION, just read current_value
      return (data || []).map((meta: any) => {
        const valorMeta = Number(meta.valor_meta) || 0;
        const valorRealizado = Number(meta.current_value) || 0; // READ FROM DB
        const percentual = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;

        return {
          id: meta.id,
          user_id: meta.user_id,
          nome: meta.profiles.nome,
          avatar_url: meta.profiles.avatar_url,
          valorMeta,
          valorRealizado,
          percentual,
        };
      }).sort((a: any, b: any) => b.valorRealizado - a.valorRealizado);
    },
    enabled: !!metaConsolidadaSelecionada,
  });

  // Calculate consolidated values from DB current_value
  const valorConsolidadoAtingido = Number(metaConsolidadaSelecionada?.current_value) || 0;
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

  // Buscar progresso das metas individuais (para visão pessoal) - READ FROM DB
  const { data: metasProgresso, isLoading: loadingProgresso } = useQuery({
    queryKey: ["metas-progresso"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      const { data: metas, error } = await supabase
        .from("metas")
        .select("*, profiles!inner(id, nome)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (error) throw error;

      // Map data - READ current_value FROM DB, NO FRONTEND CALCULATION
      const resultado = (metas || []).map((meta: any) => {
        const valorMeta = Number(meta.valor_meta) || 0;
        const valorRealizado = Number(meta.current_value) || 0; // READ FROM DB
        const percentual = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;
        const faltaAtingir = Math.max(0, valorMeta - valorRealizado);
        
        const hoje = new Date();
        const ultimoDiaMes = endOfMonth(hoje);
        const diasRestantes = Math.ceil((ultimoDiaMes.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const mediaDiariaNecessaria = diasRestantes > 0 ? faltaAtingir / diasRestantes : 0;

        return {
          id: meta.user_id,
          nome: meta.profiles.nome,
          valorMeta,
          valorRealizado,
          percentual,
          faltaAtingir,
          diasRestantes,
          mediaDiariaNecessaria,
        };
      });
      
      // Filtrar por usuário se não for admin
      if (!isAdmin && user) {
        return resultado.filter((m: any) => m.id === user.id);
      }
      
      return resultado;
    },
  });

  // Buscar ranking
  const { data: ranking } = useQuery({
    queryKey: ["metas-ranking"],
    queryFn: async () => {
      if (!metasProgresso) return [];
      
      const rankingData = [...metasProgresso]
        .sort((a, b) => b.percentual - a.percentual)
        .map((meta, index) => ({
          posicao: index + 1,
          nome: meta.nome,
          valorMeta: meta.valorMeta,
          valorRealizado: meta.valorRealizado,
          percentual: meta.percentual,
        }));

      return rankingData;
    },
    enabled: !!metasProgresso,
  });

  // Buscar evolução (apenas para o usuário logado ou todos se admin)
  const { data: evolucao } = useQuery({
    queryKey: ["meta-evolucao", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const inicioMes = startOfMonth(new Date());
      const hoje = new Date();
      const dias = [];

      // Buscar meta do usuário
      const { data: meta } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("user_id", user.id)
        .gte("mes_referencia", inicioMes.toISOString().split('T')[0])
        .maybeSingle();

      if (!meta) return [];

      // Buscar vendas do mês
      const { data: vendas } = await supabase
        .from("vendas")
        .select("data_venda, valor")
        .eq("user_id", user.id)
        .eq("status", "Aprovado")
        .gte("data_venda", inicioMes.toISOString().split('T')[0])
        .lte("data_venda", hoje.toISOString().split('T')[0])
        .order("data_venda");

      // Agrupar vendas por dia e calcular acumulado
      const vendasPorDia: { [key: string]: number } = {};
      vendas?.forEach(venda => {
        const dia = new Date(venda.data_venda).getDate();
        vendasPorDia[dia] = (vendasPorDia[dia] || 0) + Number(venda.valor);
      });

      let acumulado = 0;
      for (let dia = 1; dia <= hoje.getDate(); dia++) {
        acumulado += vendasPorDia[dia] || 0;
        dias.push({
          dia,
          acumulado,
          meta: Number(meta.valor_meta),
        });
      }

      return dias;
    },
    enabled: !!user,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getStatusBadge = (percentual: number) => {
    if (percentual >= 100) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
          🟢 Meta atingida
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1">
        🟡 Em andamento
      </Badge>
    );
  };

  const getProgressColor = (percentual: number) => {
    if (percentual >= 100) return "bg-gradient-to-r from-green-500 to-emerald-500";
    return "bg-gradient-to-r from-yellow-500 to-amber-500";
  };

  return (
    <div className="space-y-8">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metas</h1>
          <p className="text-muted-foreground">Acompanhe o progresso das metas da equipe</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Seletor de Meta - Chips */}
      {metasConsolidadas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedMetaId("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedMetaId === "all"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Atual
          </button>
          {metasConsolidadas.map((meta) => (
            <button
              key={meta.id}
              onClick={() => setSelectedMetaId(meta.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetaId === meta.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {meta.descricao || format(new Date(meta.mes_referencia), "MMM yyyy", { locale: ptBR })}
            </button>
          ))}
        </div>
      )}

      {loadingProgresso || loadingConsolidadas ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4">Carregando metas...</p>
        </div>
      ) : (
        <>
          {/* Hero Compacto - Meta Consolidada */}
          {metaConsolidadaSelecionada && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48" />
              
              <div className="relative z-10 grid lg:grid-cols-[1fr,auto] gap-6 items-start">
                {/* Lado Esquerdo - Título e Descrição */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl sm:text-4xl font-bold">
                      {metaConsolidadaSelecionada.descricao || "Meta Consolidada"}
                    </h1>
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Meta Consolidada da Equipe • {format(new Date(metaConsolidadaSelecionada.mes_referencia), "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    ⚡ Atualizado automaticamente via trigger do banco de dados
                  </p>
                </div>

                {/* Lado Direito - Card de Progresso */}
                <Card className="lg:w-[360px] border-primary/30 bg-background/80 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-6 space-y-4">
                    {/* Percentual Grande */}
                    <div className="text-center">
                      <div className="text-6xl font-bold text-primary mb-1">
                        {percentualConsolidado.toFixed(1)}%
                      </div>
                      {getStatusBadge(percentualConsolidado)}
                    </div>

                    {/* Valores */}
                    <div className="space-y-2 text-center">
                      <div className="text-2xl font-bold">
                        {formatCurrency(valorConsolidadoAtingido)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        de {formatCurrency(metaConsolidadaTotal)}
                      </div>
                    </div>

                    {/* Barra de Progresso Compacta */}
                    <div className="space-y-2">
                      <div className="relative h-6 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(percentualConsolidado)} transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.min(percentualConsolidado, 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Mini KPI - O que falta */}
                    <div className="pt-4 border-t border-border/50 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Faltam</div>
                      <div className="text-xl font-bold text-foreground">
                        {formatCurrency(Math.max(0, metaConsolidadaTotal - valorConsolidadoAtingido))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {percentualConsolidado < 100 
                          ? `${diasRestantes} dias restantes`
                          : "Meta atingida! 🎉"
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Contribuição Individual */}
          {metaConsolidadaSelecionada && metasIndividuais.length > 0 && (
            <div className="space-y-4">
              {/* Cabeçalho da Seção */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Contribuição Individual</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {metasIndividuais.length} {metasIndividuais.length === 1 ? "vendedor" : "vendedores"}
                </span>
              </div>

              {/* Grid de Cards Compactos */}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {metasIndividuais.map((vendedor: any, index: number) => {
                  const posicao = index + 1;
                  const percentualContribuicao = metaConsolidadaTotal > 0 
                    ? (vendedor.valorRealizado / metaConsolidadaTotal) * 100 
                    : 0;

                  // Determinar cor da barra baseada em performance
                  let barColor = "bg-gradient-to-r from-yellow-500 to-yellow-600"; // < 80%
                  if (vendedor.percentual >= 100) {
                    barColor = "bg-gradient-to-r from-green-500 to-emerald-600";
                  } else if (vendedor.percentual >= 80) {
                    barColor = "bg-gradient-to-r from-orange-500 to-orange-600";
                  }

                  return (
                    <Card
                      key={vendedor.id}
                      className={`border bg-card/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                        posicao === 1 
                          ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30" 
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Linha 1: Avatar + Nome + Troféu/Posição */}
                        <div className="flex items-center gap-3">
                          {/* Posição Numérica */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            #{posicao}
                          </div>

                          {/* Avatar com Glow no Top 1 */}
                          <div className="relative flex-shrink-0">
                            <Avatar className={`h-10 w-10 border-2 ${
                              posicao === 1 
                                ? "border-primary shadow-lg shadow-primary/50" 
                                : "border-primary/20"
                            }`}>
                              <AvatarFallback className={`font-bold text-sm ${
                                posicao === 1 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-primary/10 text-primary"
                              }`}>
                                {getInitials(vendedor.nome)}
                              </AvatarFallback>
                            </Avatar>
                            {posicao <= 3 && (
                              <div className="absolute -top-1 -right-1 text-sm">
                                {posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : "🥉"}
                              </div>
                            )}
                          </div>

                          {/* Nome + Troféu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <h4 className="font-bold text-sm truncate">{vendedor.nome}</h4>
                              {vendedor.percentual >= 100 && (
                                <Target className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex-shrink-0">
                            {vendedor.percentual >= 100 ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-2 py-0.5 text-[10px]">
                                Atingida
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-2 py-0.5 text-[10px]">
                                Andamento
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Linha 2: Valores e Percentual */}
                        <div className="flex items-end justify-between">
                          <div className="space-y-0.5">
                            <div className="text-xs text-muted-foreground">Realizado</div>
                            <div className="font-bold text-base">{formatCurrency(vendedor.valorRealizado)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              de {formatCurrency(vendedor.valorMeta)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">
                              {vendedor.percentual.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="space-y-1.5">
                          <div className="relative h-2.5 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-700 ease-out`}
                              style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground/80">
                            <span>Meta individual</span>
                            <span className="font-semibold">
                              {percentualContribuicao.toFixed(1)}% da geral
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção de Metas Individuais (visão antiga - mantida para compatibilidade) */}
          {!metaConsolidadaSelecionada && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metasProgresso?.map((meta) => (
                  <MetaProgressCard key={meta.id} {...meta} />
                ))}
              </div>

              {ranking && ranking.length > 0 && (
                <MetasRanking ranking={ranking} />
              )}

              {evolucao && evolucao.length > 0 && (
                <MetaEvolutionChart data={evolucao} />
              )}

              {(!metasProgresso || metasProgresso.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma meta definida para este mês</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Metas;
