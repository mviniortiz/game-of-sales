import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface VendasChartProps {
  data: Array<{ data: string; vendas: number }>;
}

export const VendasChart = ({ data }: VendasChartProps) => {
  // Calcular o valor máximo para adicionar padding
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.vendas)) : 0;
  const yAxisMax = Math.ceil(maxValue * 1.2); // 20% de padding no topo
  const yAxisMin = 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução de Vendas no Período
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Quantidade de vendas realizadas ao longo do tempo
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart 
            data={data}
            margin={{ top: 40, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="data"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={data.length > 15 ? Math.floor(data.length / 10) : 0}
              tick={{ dy: 10 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              domain={[yAxisMin, yAxisMax]}
              allowDecimals={false}
              label={{ 
                value: 'Quantidade', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--foreground))' }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
                padding: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              labelStyle={{
                color: "hsl(var(--popover-foreground))",
                fontWeight: 600,
                marginBottom: "8px"
              }}
              itemStyle={{
                color: "hsl(var(--popover-foreground))",
                padding: "4px 0"
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="vendas"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ 
                fill: "hsl(var(--primary))", 
                strokeWidth: 2,
                stroke: "hsl(var(--background))",
                r: 6 
              }}
              activeDot={{ 
                r: 8,
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
                fill: "hsl(var(--background))"
              }}
              name="Vendas"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
