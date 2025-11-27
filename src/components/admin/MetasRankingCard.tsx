import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Target, Zap, Crown, Flame, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VendedorMeta {
  nome: string;
  avatar_url?: string;
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
  hasActiveFilters?: boolean;
  filterDescription?: string;
}

export const MetasRankingCard = ({
  metaConsolidada,
  valorConsolidadoAtingido,
  percentualConsolidado,
  vendedores,
  statusFiltro,
  onStatusChange,
  hasActiveFilters = false,
  filterDescription = "",
}: MetasRankingCardProps) => {
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

  // Progress bar color logic
  const getProgressBarColor = (percentual: number) => {
    if (percentual >= 100) return "bg-gradient-to-r from-emerald-500 to-emerald-400";
    if (percentual >= 50) return "bg-gradient-to-r from-cyan-500 to-cyan-400";
    return "bg-gradient-to-r from-indigo-500 to-indigo-400";
  };

  // Avatar ring color
  const getAvatarRingColor = (percentual: number) => {
    if (percentual >= 100) return "ring-emerald-500 ring-2";
    if (percentual >= 50) return "ring-cyan-500 ring-2";
    return "ring-indigo-500/50 ring-2";
  };

  // Status badge
  const getStatusBadge = (percentual: number) => {
    if (percentual >= 100) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-xs">
          <Trophy className="h-3 w-3 mr-1" />
          Atingida
        </Badge>
      );
    }
    if (percentual >= 50) {
      return (
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-2 py-0.5 text-xs">
          <Flame className="h-3 w-3 mr-1" />
          Quase lá
        </Badge>
      );
    }
    return (
      <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 px-2 py-0.5 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        Em progresso
      </Badge>
    );
  };

  const filteredVendedores = vendedores.filter((v) => {
    if (statusFiltro === "todos") return true;
    if (statusFiltro === "atingida") return v.percentual >= 100;
    if (statusFiltro === "em_andamento") return v.percentual < 100;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Medal className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Metas de Vendas</h2>
              {hasActiveFilters && (
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-xs">
                  Filtrado
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {hasActiveFilters && filterDescription 
                ? filterDescription
                : "Acompanhamento mensal de performance"}
            </p>
          </div>
        </div>
        <Select value={statusFiltro} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px] bg-slate-900/50 border-white/10 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="atingida">Atingida</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hero Card - Meta Consolidada */}
      <Card className="relative overflow-hidden border-white/5 bg-gradient-to-r from-indigo-900/50 via-slate-900/80 to-slate-900">
        {/* Background effects */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mt-32" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -mr-24 -mb-24" />
        
        <CardContent className="relative z-10 p-6">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            {/* Left - Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <Zap className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Meta Consolidada</h3>
                  <p className="text-xs text-slate-500">Objetivo da equipe</p>
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Realizado</p>
                  <p className="text-xl font-bold text-white">{formatCurrencyCompact(valorConsolidadoAtingido)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Meta</p>
                  <p className="text-xl font-bold text-slate-400">{formatCurrencyCompact(metaConsolidada)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(percentualConsolidado, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Big Percentage */}
            <div className="text-center md:text-right">
              <div className="inline-block">
                <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent tabular-nums">
                  {percentualConsolidado.toFixed(1)}
                </span>
                <span className="text-2xl font-bold text-slate-500">%</span>
              </div>
              <div className="mt-2">
                {getStatusBadge(percentualConsolidado)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Contributions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Contribuição Individual</h3>
          <span className="text-xs text-slate-500">
            ({filteredVendedores.length} {filteredVendedores.length === 1 ? "vendedor" : "vendedores"})
          </span>
        </div>

        {filteredVendedores.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-slate-900/30">
            <CardContent className="py-8 text-center">
              <Target className="h-10 w-10 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400 text-sm">Nenhum vendedor encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredVendedores.map((vendedor, index) => {
              const posicao = index + 1;
              const isWinner = vendedor.percentual >= 100;
              const percentualContribuicao = metaConsolidada > 0 
                ? (vendedor.valorRealizado / metaConsolidada) * 100 
                : 0;

              return (
                <Card
                  key={vendedor.nome}
                  className={`relative overflow-hidden border-white/5 bg-slate-900/50 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] ${
                    isWinner 
                      ? "ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/10" 
                      : ""
                  }`}
                >
                  {isWinner && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5" />
                  )}

                  <CardContent className="relative z-10 p-4 space-y-3">
                    {/* Row 1: Avatar + Name + Percentage */}
                    <div className="flex items-center gap-3">
                      {/* Position */}
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        posicao === 1 
                          ? "bg-amber-500/20 text-amber-400" 
                          : posicao === 2 
                            ? "bg-slate-400/20 text-slate-300" 
                            : posicao === 3 
                              ? "bg-amber-700/20 text-amber-600" 
                              : "bg-slate-800 text-slate-500"
                      }`}>
                        {posicao <= 3 ? (
                          posicao === 1 ? <Crown className="h-3 w-3" /> : `#${posicao}`
                        ) : (
                          `#${posicao}`
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar className={`h-9 w-9 ${getAvatarRingColor(vendedor.percentual)}`}>
                          {vendedor.avatar_url && (
                            <AvatarImage src={vendedor.avatar_url} alt={vendedor.nome} />
                          )}
                          <AvatarFallback className="bg-slate-800 text-white font-bold text-xs">
                            {getInitials(vendedor.nome)}
                          </AvatarFallback>
                        </Avatar>
                        {isWinner && (
                          <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50">
                            <Trophy className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">{vendedor.nome}</h4>
                      </div>

                      {/* Percentage */}
                      <span className={`text-xl font-bold tabular-nums ${
                        isWinner 
                          ? "text-emerald-400" 
                          : vendedor.percentual >= 50 
                            ? "text-cyan-400" 
                            : "text-indigo-400"
                      }`}>
                        {vendedor.percentual.toFixed(0)}%
                      </span>
                    </div>

                    {/* Row 2: Progress Bar */}
                    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(vendedor.percentual)} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(vendedor.percentual, 100)}%` }}
                      />
                    </div>

                    {/* Row 3: Values */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {formatCurrencyCompact(vendedor.valorRealizado)} / {formatCurrencyCompact(vendedor.valorMeta)}
                      </span>
                      <span className="text-slate-500">
                        {percentualContribuicao.toFixed(1)}% do total
                      </span>
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
