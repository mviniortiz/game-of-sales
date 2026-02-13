import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface RankingEvolutionChartProps {
  vendedores: Array<{
    user_id: string;
    nome: string;
    contribuicao: number;
    percentual_contribuicao: number;
  }>;
}

export const RankingEvolutionChart = ({ vendedores }: RankingEvolutionChartProps) => {
  // Cores para cada vendedor (top 5)
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#10b981"];
  
  // Simular dados de evolução ao longo do mês (dias 1, 7, 14, 21, 28)
  const topVendedores = vendedores.slice(0, 5);
  
  const generateEvolutionData = () => {
    const days = [1, 7, 14, 21, 28];
    return days.map((day) => {
      const dataPoint: any = { dia: `Dia ${day}` };
      topVendedores.forEach((vendedor) => {
        // Simular progressão crescente até o valor atual
        const progressFactor = day / 28;
        dataPoint[vendedor.nome] = Number((vendedor.contribuicao * progressFactor).toFixed(2));
      });
      return dataPoint;
    });
  };

  const data = generateEvolutionData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Evolução do Ranking (Top 5)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="dia" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
            />
            {topVendedores.map((vendedor, index) => (
              <Line
                key={vendedor.user_id}
                type="monotone"
                dataKey={vendedor.nome}
                stroke={colors[index]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
