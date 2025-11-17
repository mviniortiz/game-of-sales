import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComparativoVendedoresChartProps {
  data: Array<{
    nome: string;
    vendas: number;
    faturamento: number;
  }>;
}

export const ComparativoVendedoresChart = ({ data }: ComparativoVendedoresChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo de Vendedores (Mês Atual)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="nome" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              label={{ value: 'Quantidade de Vendas', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
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
                  return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento'];
                }
                return [value, 'Vendas'];
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
            />
            <Bar 
              yAxisId="left"
              dataKey="vendas" 
              fill="hsl(var(--primary))" 
              name="Vendas"
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              yAxisId="right"
              dataKey="faturamento" 
              fill="hsl(var(--accent))" 
              name="Faturamento"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
