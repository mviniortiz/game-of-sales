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
        <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
          {/* Agendamentos - Topo do funil (mais largo) */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm px-2">
              <span className="font-medium">Agendamentos</span>
              <span className="font-bold text-lg">{agendamentos}</span>
            </div>
            <div 
              className="w-full h-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-t-lg flex items-center justify-center shadow-lg relative"
              style={{
                clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"
              }}
            >
              <span className="text-white font-bold text-xl">100%</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-3xl text-muted-foreground -my-2">↓</div>

          {/* Calls Realizadas - Meio do funil */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm px-2">
              <span className="font-medium">Calls Realizadas</span>
              <span className="font-bold text-lg">{callsRealizadas}</span>
            </div>
            <div className="w-full flex justify-center">
              <div
                className="h-14 bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center shadow-lg transition-all"
                style={{ 
                  width: `${Math.max(taxaComparecimento, 20)}%`,
                  clipPath: "polygon(5% 0, 95% 0, 90% 100%, 10% 100%)"
                }}
              >
                <span className="text-white font-bold whitespace-nowrap">{taxaComparecimento.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-3xl text-muted-foreground -my-2">↓</div>

          {/* Vendas - Base do funil (mais estreito) */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm px-2">
              <span className="font-medium">Vendas Fechadas</span>
              <span className="font-bold text-lg">{vendas}</span>
            </div>
            <div className="w-full flex justify-center">
              <div
                className="h-12 bg-gradient-to-r from-green-500 to-emerald-400 rounded-b-lg flex items-center justify-center shadow-lg transition-all"
                style={{ 
                  width: `${Math.max(taxaConversao, 15)}%`,
                  clipPath: "polygon(10% 0, 90% 0, 85% 100%, 15% 100%)"
                }}
              >
                <span className="text-white font-bold whitespace-nowrap">{taxaConversao.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
