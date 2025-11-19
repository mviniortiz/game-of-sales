import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface VendedorMeta {
  nome: string;
  valorMeta: number;
  valorRealizado: number;
  percentual: number;
}

interface MetasRankingCardProps {
  metaConsolidada: number;
  valorConsolidadoAtingido: number;
  percentualConsolidado: number;
  vendedores: VendedorMeta[];
  statusFiltro: string;
  onStatusChange: (status: string) => void;
}

export const MetasRankingCard = ({
  metaConsolidada,
  valorConsolidadoAtingido,
  percentualConsolidado,
  vendedores,
  statusFiltro,
  onStatusChange,
}: MetasRankingCardProps) => {
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
          🟢 Atingida
        </Badge>
      );
    }
    if (percentual >= 80) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1">
          🟡 Quase lá
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
        🔵 Em andamento
      </Badge>
    );
  };

  const getProgressColor = (percentual: number) => {
    if (percentual >= 100) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (percentual >= 80) return "bg-gradient-to-r from-yellow-500 to-amber-500";
    return "bg-gradient-to-r from-blue-500 to-cyan-500";
  };

  const filteredVendedores = vendedores.filter((v) => {
    if (statusFiltro === "todos") return true;
    if (statusFiltro === "atingida") return v.percentual >= 100;
    if (statusFiltro === "em_andamento") return v.percentual < 100;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Filtro */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Metas de Vendas</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhamento mensal de performance
            </p>
          </div>
        </div>
        <Select value={statusFiltro} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="atingida">Atingida</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card Principal - Meta Consolidada */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">Black Friday 2025</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Meta Consolidada da Equipe
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-primary">
                {percentualConsolidado.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">do objetivo</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <div className="flex gap-6">
              <span className="font-semibold">
                Realizado: <span className="text-primary">{formatCurrency(valorConsolidadoAtingido)}</span>
              </span>
              <span className="font-semibold">
                Meta: <span className="text-foreground">{formatCurrency(metaConsolidada)}</span>
              </span>
            </div>
          </div>
          
          {/* Barra de Progresso Principal - Grossa e Impactante */}
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

      {/* Lista de Vendedores */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Contribuição Individual</h3>
          <span className="text-sm text-muted-foreground">
            ({filteredVendedores.length} {filteredVendedores.length === 1 ? "vendedor" : "vendedores"})
          </span>
        </div>

        {filteredVendedores.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum vendedor encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ajuste os filtros para ver os resultados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredVendedores.map((vendedor, index) => {
              const posicao = index + 1;
              const percentualContribuicao = metaConsolidada > 0 
                ? (vendedor.valorRealizado / metaConsolidada) * 100 
                : 0;

              return (
                <Card
                  key={vendedor.nome}
                  className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-200 hover:shadow-lg hover:border-primary/30"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar e Posição */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
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
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-lg truncate">{vendedor.nome}</h4>
                              {posicao <= 3 && (
                                <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span>
                                Contribuiu: <span className="font-semibold text-primary">{formatCurrency(vendedor.valorRealizado)}</span>
                              </span>
                              <span>•</span>
                              <span>
                                Meta: <span className="font-semibold text-foreground">{formatCurrency(vendedor.valorMeta)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-2xl font-bold text-primary">
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
                          <div className="flex justify-between text-xs text-muted-foreground">
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
        )}
      </div>
    </div>
  );
};
