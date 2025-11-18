import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, DollarSign } from "lucide-react";

interface MetaConsolidadaCardProps {
  metaTotal: number;
  valorAtingido: number;
  diasRestantes: number;
  descricao?: string;
}

export const MetaConsolidadaCard = ({
  metaTotal,
  valorAtingido,
  diasRestantes,
  descricao,
}: MetaConsolidadaCardProps) => {
  const percentual = (valorAtingido / metaTotal) * 100;
  const faltam = metaTotal - valorAtingido;
  const mediaDiaria = faltam / diasRestantes;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-card via-card/95 to-card shadow-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      
      <CardContent className="p-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Target className="h-7 w-7 text-primary" />
              Meta Consolidada
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {descricao || "Meta mensal da equipe"}
            </p>
          </div>

          {/* Percentual total */}
          <div className="text-right">
            <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {percentual.toFixed(1)}%
            </div>
            <div className="text-sm text-primary font-medium">
              Progresso da meta
            </div>
          </div>
        </div>

        {/* Barra de progresso GRANDE */}
        <div className="relative mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-foreground font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Progresso
            </span>
            <span className="text-muted-foreground text-sm ml-auto">
              R$ {valorAtingido.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}{" "}
              / R${" "}
              {metaTotal.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Barra animada */}
          <div className="h-8 bg-muted rounded-full overflow-hidden shadow-inner border border-border">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary 
                         relative overflow-hidden transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(percentual, 100)}%` }}
            >
              {/* Shine effect */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                            animate-shimmer"
              />

              {/* Porcentagem dentro da barra */}
              {percentual > 15 && (
                <div className="absolute inset-0 flex items-center justify-end pr-4">
                  <span className="text-primary-foreground font-bold text-sm drop-shadow-lg">
                    {percentual.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold text-primary">
              R${" "}
              {faltam.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-xs text-muted-foreground">Faltam</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <Calendar className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-500">
              {diasRestantes}
            </div>
            <div className="text-xs text-muted-foreground">Dias restantes</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <TrendingUp className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-purple-500">
              R${" "}
              {mediaDiaria.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-xs text-muted-foreground">Média/dia necessária</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
