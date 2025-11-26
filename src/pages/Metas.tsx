import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MetaProgressCard } from "@/components/metas/MetaProgressCard";
import { MetasRanking } from "@/components/metas/MetasRanking";
import { MetaEvolutionChart } from "@/components/metas/MetaEvolutionChart";
import { Target, TrendingUp, Zap } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const Metas = () => {
  const { user, isAdmin } = useAuth();
  const mesAtual = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const [selectedMetaId, setSelectedMetaId] = useState<string>("all");

  // Buscar metas consolidadas
  const { data: metasConsolidadas = [] } = useQuery({
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

  // Buscar contribuições dos vendedores para a meta selecionada
  const { data: contribuicoes = [] } = useQuery({
    queryKey: ["contribuicoes-vendedores", metaConsolidadaSelecionada?.mes_referencia],
    queryFn: async () => {
      if (!metaConsolidadaSelecionada) return [];

      const mesRef = metaConsolidadaSelecionada.mes_referencia;
      const [year, month] = mesRef.split('-');
      const inicioMes = `${year}-${month}-01`;
      const fimMes = endOfMonth(new Date(parseInt(year), parseInt(month) - 1)).toISOString().split('T')[0];

      // Buscar todas as metas individuais do mês
      const { data: metasIndividuais, error: metasError } = await supabase
        .from("metas")
        .select("*, profiles!inner(id, nome, avatar_url)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (metasError) throw metasError;

      // Para cada meta individual, calcular o realizado
      const contribuicoesPromises = metasIndividuais.map(async (meta) => {
        const { data: vendas } = await supabase
          .from("vendas")
          .select("valor")
          .eq("user_id", meta.user_id)
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes);

        const valorRealizado = vendas?.reduce((sum, v) => sum + Number(v.valor), 0) || 0;
        const valorMeta = Number(meta.valor_meta);
        const percentual = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;

        return {
          nome: meta.profiles.nome,
          avatar_url: meta.profiles.avatar_url,
          valorMeta,
          valorRealizado,
          percentual,
        };
      });

      const resultado = await Promise.all(contribuicoesPromises);
      return resultado.sort((a, b) => b.valorRealizado - a.valorRealizado);
    },
    enabled: !!metaConsolidadaSelecionada,
  });

  // Calcular valores consolidados
  const valorConsolidadoAtingido = contribuicoes.reduce((acc, v) => acc + v.valorRealizado, 0);
  const metaConsolidadaTotal = metaConsolidadaSelecionada?.valor_meta || 0;
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

  // Buscar progresso das metas individuais (para visão pessoal)
  const { data: metasProgresso, isLoading: loadingProgresso } = useQuery({
    queryKey: ["metas-progresso"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      const { data: metas, error: metasError } = await supabase
        .from("metas")
        .select("*, profiles!inner(id, nome)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (metasError) throw metasError;

      const progressoPromises = metas.map(async (meta) => {
        const { data: vendas } = await supabase
          .from("vendas")
          .select("valor")
          .eq("user_id", meta.user_id)
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes);

        const valorRealizado = vendas?.reduce((sum, v) => sum + Number(v.valor), 0) || 0;
        const valorMeta = Number(meta.valor_meta);
        const percentual = (valorRealizado / valorMeta) * 100;
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

      const resultado = await Promise.all(progressoPromises);
      
      // Filtrar por usuário se não for admin
      if (!isAdmin && user) {
        return resultado.filter(m => m.id === user.id);
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
    <div className="space-y-6">
      {/* Cabeçalho com Seletor */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Metas de Vendas</h1>
            <p className="text-muted-foreground">Acompanhamento mensal de performance</p>
          </div>
        </div>
        
        {metasConsolidadas.length > 0 && (
          <Select value={selectedMetaId} onValueChange={setSelectedMetaId}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Selecione a meta" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="all">Todas</SelectItem>
              {metasConsolidadas.map((meta) => (
                <SelectItem key={meta.id} value={meta.id}>
                  {meta.descricao || format(new Date(meta.mes_referencia), "MMMM 'de' yyyy", { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loadingProgresso ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4">Carregando metas...</p>
        </div>
      ) : (
        <>
          {/* Card de Meta Consolidada */}
          {metaConsolidadaSelecionada && (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
              <CardHeader className="pb-4 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl sm:text-3xl font-bold">
                        {metaConsolidadaSelecionada.descricao || "Meta Consolidada"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Meta Consolidada da Equipe
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl sm:text-5xl font-bold text-primary">
                      {percentualConsolidado.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">do objetivo</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <div className="flex flex-wrap gap-3 sm:gap-6">
                    <span className="font-semibold text-sm sm:text-base">
                      Realizado: <span className="text-primary">{formatCurrency(valorConsolidadoAtingido)}</span>
                    </span>
                    <span className="font-semibold text-sm sm:text-base">
                      Meta: <span className="text-foreground">{formatCurrency(metaConsolidadaTotal)}</span>
                    </span>
                  </div>
                </div>
                
                {/* Barra de Progresso Principal */}
                <div className="relative h-8 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/50">
                  <div
                    className={`h-full ${getProgressColor(percentualConsolidado)} transition-all duration-1000 ease-out relative`}
                    style={{ width: `${Math.min(percentualConsolidado, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-foreground drop-shadow-lg">
                      {percentualConsolidado >= 10 && `${percentualConsolidado.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {getStatusBadge(percentualConsolidado)}
              </CardContent>
            </Card>
          )}

          {/* Lista de Contribuições Individuais */}
          {metaConsolidadaSelecionada && contribuicoes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Contribuição Individual</h3>
                <span className="text-sm text-muted-foreground">
                  ({contribuicoes.length} {contribuicoes.length === 1 ? "vendedor" : "vendedores"})
                </span>
              </div>

              <div className="grid gap-3">
                {contribuicoes.map((vendedor, index) => {
                  const posicao = index + 1;
                  const percentualContribuicao = metaConsolidadaTotal > 0 
                    ? (vendedor.valorRealizado / metaConsolidadaTotal) * 100 
                    : 0;

                  return (
                    <Card
                      key={vendedor.nome}
                      className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 hover:shadow-lg hover:border-primary/30"
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          {/* Avatar e Posição */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-base sm:text-lg">
                                {getInitials(vendedor.nome)}
                              </AvatarFallback>
                            </Avatar>
                            {posicao <= 3 && (
                              <div className="absolute -top-1 -right-1 bg-background border-2 border-primary rounded-full w-6 h-6 flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : "🥉"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Informações e Progresso */}
                          <div className="flex-1 min-w-0 space-y-3 w-full">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-base sm:text-lg truncate">{vendedor.nome}</h4>
                                <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-1">
                                  <span>
                                    Contribuiu: <span className="font-semibold text-primary">{formatCurrency(vendedor.valorRealizado)}</span>
                                  </span>
                                  <span className="hidden sm:inline">•</span>
                                  <span>
                                    Meta: <span className="font-semibold text-foreground">{formatCurrency(vendedor.valorMeta)}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className="text-xl sm:text-2xl font-bold text-primary">
                                  {vendedor.percentual.toFixed(1)}%
                                </span>
                                {getStatusBadge(vendedor.percentual)}
                              </div>
                            </div>

                            {/* Barra de Progresso Individual */}
                            <div className="space-y-1">
                              <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor(vendedor.percentual)} transition-all duration-700 ease-out`}
                                  style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row justify-between gap-1 text-xs text-muted-foreground">
                                <span>Meta individual</span>
                                <span>
                                  Contribuição geral: <span className="font-semibold text-primary">{percentualContribuicao.toFixed(1)}%</span>
                                </span>
                              </div>
                            </div>
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
