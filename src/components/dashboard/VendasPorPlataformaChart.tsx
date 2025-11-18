import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Globe } from "lucide-react";

interface VendasPorPlataformaChartProps {
  data: Array<{ plataforma: string; quantidade: number; total: number }>;
}

const COLORS = [
  "hsl(217, 91%, 60%)", // Azul vibrante
  "hsl(142, 71%, 45%)", // Verde vibrante
  "hsl(38, 92%, 50%)",  // Laranja vibrante
  "hsl(280, 87%, 60%)", // Roxo vibrante
  "hsl(0, 84%, 60%)",   // Vermelho vibrante
  "hsl(187, 71%, 50%)", // Ciano vibrante
];

export const VendasPorPlataformaChart = ({ data }: VendasPorPlataformaChartProps) => {
  const chartData = data.map(item => ({
    name: item.plataforma,
    value: item.quantidade,
    total: item.total,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Vendas por Plataforma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
                padding: "12px",
                boxShadow: "0 4px 12px hsl(var(--border) / 0.3)"
              }}
              labelStyle={{
                color: "hsl(var(--popover-foreground))",
                fontWeight: 600,
                marginBottom: "4px"
              }}
              itemStyle={{
                color: "hsl(var(--popover-foreground))",
                padding: "4px 0"
              }}
              formatter={(value: number, name: string, props: any) => {
                return [
                  `${value} vendas (${formatCurrency(props.payload.total)})`,
                  props.payload.name
                ];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
