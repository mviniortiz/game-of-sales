import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DistribuicaoProdutosChartProps {
  data: Array<{
    nome: string;
    valor: number;
    vendas: number;
  }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(346, 77%, 50%)',
];

export const DistribuicaoProdutosChart = ({ data }: DistribuicaoProdutosChartProps) => {
  const renderLabel = (entry: any) => {
    const percent = ((entry.valor / data.reduce((acc, item) => acc + item.valor, 0)) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Produto (Faturamento)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="valor"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number, name: string, props: any) => {
                if (name === 'valor') {
                  return [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    `${props.payload.nome} (${props.payload.vendas} vendas)`
                  ];
                }
                return value;
              }}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => {
                const item = data.find(d => d.nome === entry.payload.nome);
                return `${entry.payload.nome} - ${item?.vendas || 0} vendas`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
