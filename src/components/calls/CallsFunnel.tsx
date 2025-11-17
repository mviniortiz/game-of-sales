import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CallsFunnelProps {
  agendamentos: number;
  callsRealizadas: number;
  vendas: number;
  taxaComparecimento: number;
  taxaConversao: number;
}

export const CallsFunnel = ({
  agendamentos,
  callsRealizadas,
  vendas,
  taxaComparecimento,
  taxaConversao,
}: CallsFunnelProps) => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Agendamentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Agendamentos</span>
              <span className="font-bold text-lg">{agendamentos}</span>
            </div>
            <div className="h-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">100%</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-4xl text-muted-foreground">↓</div>
          </div>

          {/* Calls Realizadas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Calls Realizadas</span>
              <span className="font-bold text-lg">{callsRealizadas}</span>
            </div>
            <div
              className="h-14 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg transition-all"
              style={{ width: `${taxaComparecimento}%` }}
            >
              <span className="text-white font-bold">{taxaComparecimento.toFixed(1)}%</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-4xl text-muted-foreground">↓</div>
          </div>

          {/* Vendas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Vendas Fechadas</span>
              <span className="font-bold text-lg">{vendas}</span>
            </div>
            <div
              className="h-12 bg-gradient-to-r from-green-500 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg transition-all"
              style={{ width: `${taxaConversao}%` }}
            >
              <span className="text-white font-bold">{taxaConversao.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
