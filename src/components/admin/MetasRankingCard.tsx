import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const getStatusColor = (percentual: number) => {
    if (percentual >= 100) return "bg-green-500";
    if (percentual >= 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusBadge = (percentual: number) => {
    if (percentual >= 100) return <Badge className="bg-green-500">Atingida</Badge>;
    if (percentual >= 80) return <Badge className="bg-yellow-500">Em andamento</Badge>;
    return <Badge className="bg-red-500">Não atingida</Badge>;
  };

  const getMedalIcon = (posicao: number) => {
    if (posicao === 1) return "🥇";
    if (posicao === 2) return "🥈";
    if (posicao === 3) return "🥉";
    return null;
  };

  const filteredVendedores = vendedores.filter((v) => {
    if (statusFiltro === "todos") return true;
    if (statusFiltro === "atingida") return v.percentual >= 100;
    if (statusFiltro === "em_andamento") return v.percentual >= 80 && v.percentual < 100;
    if (statusFiltro === "nao_atingida") return v.percentual < 80;
    return true;
  });

  const top3 = filteredVendedores.slice(0, 3);
  const resto = filteredVendedores.slice(3);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Metas de Vendas</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhamento mensal de metas
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
              <SelectItem value="nao_atingida">Não atingida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meta Consolidada */}
        <div className="bg-card/50 border-2 border-primary/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Meta Consolidada</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">
                {percentualConsolidado.toFixed(1)}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Meta consolidada</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Realizado: <span className="font-semibold text-foreground">{formatCurrency(valorConsolidadoAtingido)}</span>
            </span>
            <span>
              Meta: <span className="font-semibold text-foreground">{formatCurrency(metaConsolidada)}</span>
            </span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${getStatusColor(percentualConsolidado)} transition-all duration-500 ease-out shadow-sm`}
              style={{ width: `${Math.min(percentualConsolidado, 100)}%` }}
            />
          </div>
        </div>

        {/* Top 3 - Ranking com Medalhas */}
        {top3.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-lg">Top 3 Vendedores</h3>
            </div>
            {top3.map((vendedor, index) => {
              const posicao = index + 1;
              const medal = getMedalIcon(posicao);
              const percentualContribuicao = metaConsolidada > 0 
                ? (vendedor.valorRealizado / metaConsolidada) * 100 
                : 0;

              return (
                <div
                  key={vendedor.nome}
                  className={`p-5 rounded-xl border-2 bg-card/50 space-y-3 ${
                    posicao === 1 ? "border-yellow-500/50 bg-yellow-500/5" :
                    posicao === 2 ? "border-gray-400/50 bg-gray-400/5" :
                    "border-orange-600/50 bg-orange-600/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{medal}</span>
                      <div>
                        <span className="text-lg font-semibold">{vendedor.nome}</span>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(vendedor.valorRealizado)} de {formatCurrency(vendedor.valorMeta)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">
                        {vendedor.percentual.toFixed(1)}%
                      </span>
                      {getStatusBadge(vendedor.percentual)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso da meta</span>
                      <span>{vendedor.percentual.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(vendedor.percentual)} transition-all duration-500`}
                        style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Contribuição para meta geral</span>
                      <span className="font-semibold">{percentualContribuicao.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Demais Vendedores */}
        {resto.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Demais Vendedores
            </h3>
            {resto.map((vendedor, index) => {
              const posicao = index + 4;
              const percentualContribuicao = metaConsolidada > 0 
                ? (vendedor.valorRealizado / metaConsolidada) * 100 
                : 0;

              return (
                <div
                  key={vendedor.nome}
                  className="p-4 rounded-xl border bg-card/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {posicao}º
                      </span>
                      <div>
                        <span className="font-semibold">{vendedor.nome}</span>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(vendedor.valorRealizado)} de {formatCurrency(vendedor.valorMeta)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold">
                        {vendedor.percentual.toFixed(1)}%
                      </span>
                      {getStatusBadge(vendedor.percentual)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span>{vendedor.percentual.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(vendedor.percentual)} transition-all duration-500`}
                        style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Contribuição geral</span>
                      <span className="font-semibold">{percentualContribuicao.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredVendedores.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhuma meta encontrada</p>
            <p className="text-sm mt-2">Ajuste os filtros para ver os resultados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
