import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface PerformanceData {
  vendedor: string;
  agendamentos: number;
  calls: number;
  taxaComparecimento: number;
  vendas: number;
  taxaConversao: number;
  status: "excelente" | "bom" | "precisa_melhorar";
  avatarUrl?: string;
}

interface PerformanceTableProps {
  data: PerformanceData[];
}

export const PerformanceTable = ({ data }: PerformanceTableProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string, taxaConversao: number) => {
    if (status === "excelente") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
          🟢 Alta Performance
        </Badge>
      );
    } else if (status === "bom") {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
          🟡 Desempenho Bom
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
          🔴 Baixa Conversão
        </Badge>
      );
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance por Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum dado disponível
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={row.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(row.vendedor)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">
                      {row.vendedor}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>{row.agendamentos} agend.</span>
                      <span>•</span>
                      <span>{row.calls} calls</span>
                      <span>•</span>
                      <span>{row.vendas} vendas</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Comparec.</div>
                    <div className="font-semibold text-cyan-400">
                      {row.taxaComparecimento.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Conversão</div>
                    <div className="font-bold text-lg text-primary">
                      {row.taxaConversao.toFixed(1)}%
                    </div>
                  </div>
                  <div className="ml-2">
                    {getStatusBadge(row.status, row.taxaConversao)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

