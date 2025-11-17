import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EvolucaoVendasChartProps {
  data: Array<{
    periodo: string;
    vendas: number;
    faturamento: number;
  }>;
}

export const EvolucaoVendasChart = ({ data }: EvolucaoVendasChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Vendas (Últimos 6 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="periodo" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              label={{ value: 'Faturamento (R$)', angle: 90, position: 'insideRight', fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'Faturamento') {
                  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                }
                return value;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => value === 'vendas' ? 'Quantidade de Vendas' : 'Faturamento (R$)'}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="vendas" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="vendas"
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="faturamento" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              name="Faturamento"
              dot={{ fill: 'hsl(var(--accent))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
