import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";

interface MetaProgressCardProps {
  nome: string;
  valorMeta: number;
  valorRealizado: number;
  percentual: number;
  faltaAtingir: number;
  diasRestantes: number;
  mediaDiariaNecessaria: number;
}

export const MetaProgressCard = ({
  nome,
  valorMeta,
  valorRealizado,
  percentual,
  faltaAtingir,
  diasRestantes,
  mediaDiariaNecessaria,
}: MetaProgressCardProps) => {
  const getStatusColor = () => {
    if (percentual >= 100) return "border-green-500";
    if (percentual >= 80) return "border-blue-500";
    if (percentual >= 50) return "border-yellow-500";
    return "border-red-500";
  };

  const getProgressColor = () => {
    if (percentual >= 100) return "bg-green-500";
    if (percentual >= 80) return "bg-blue-500";
    if (percentual >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (percentual >= 100) return "✅ Meta Atingida";
    if (percentual >= 80) return "🟢 Quase Lá";
    if (percentual >= 50) return "🟡 No Caminho";
    return "🔴 Atenção";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className={`border-l-4 ${getStatusColor()} transition-all hover:shadow-lg`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg">{nome}</h3>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Meta:</span>
            <span className="font-semibold">{formatCurrency(valorMeta)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Realizado:</span>
            <span className="font-semibold">{formatCurrency(valorRealizado)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={Math.min(percentual, 100)} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentual.toFixed(1)}%</span>
            <span className={getProgressColor().replace("bg-", "text-")}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {percentual < 100 && (
          <div className="space-y-1 pt-2 border-t border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Faltam:</span>
              <span className="font-medium">{formatCurrency(faltaAtingir)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dias restantes:</span>
              <span className="font-medium">{diasRestantes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Média necessária:</span>
              <span className="font-medium">{formatCurrency(mediaDiariaNecessaria)}/dia</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
