import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Globe } from "lucide-react";

interface VendasPorPlataformaChartProps {
  data: Array<{ plataforma: string; quantidade: number; total: number }>;
}

const COLORS = [
  "#4F46E5", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EF4444", // Red
  "#06B6D4", // Cyan
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

    if (percent < 0.05) return null; // Don't show label for small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-bold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan-400" />
          Vendas por Plataforma
        </CardTitle>
        <p className="text-xs text-slate-500">Distribuição por canal</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center">
          <ResponsiveContainer width="60%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={85}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                strokeWidth={2}
                stroke="rgba(15, 23, 42, 0.8)"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value: number, name: string, props: any) => {
                  return [
                    `${value} vendas • ${formatCurrency(props.payload.total)}`,
                    props.payload.name
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="flex-1 space-y-2">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.value} vendas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
