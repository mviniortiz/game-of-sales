import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Package } from "lucide-react";
import { useMemo } from "react";

interface DistribuicaoProdutosChartProps {
  data: Array<{
    nome: string;
    valor: number;
    vendas: number;
  }>;
}

const BAR_COLORS = ["#10b981", "#059669", "#34d399", "#6ee7b7", "#0891b2", "#64748b"];

export const DistribuicaoProdutosChart = ({ data }: DistribuicaoProdutosChartProps) => {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.valor - a.valor);

    if (sorted.length <= 6) {
      return sorted.map((item, index) => ({
        ...item,
        shortName: item.nome.length > 20 ? item.nome.substring(0, 18) + "..." : item.nome,
        color: BAR_COLORS[index % BAR_COLORS.length],
      }));
    }

    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    return [
      ...top5.map((item, index) => ({
        ...item,
        shortName: item.nome.length > 20 ? item.nome.substring(0, 18) + "..." : item.nome,
        color: BAR_COLORS[index],
      })),
      {
        nome: `Outros (${others.length})`,
        shortName: `Outros (${others.length})`,
        valor: others.reduce((a, i) => a + i.valor, 0),
        vendas: others.reduce((a, i) => a + i.vendas, 0),
        color: BAR_COLORS[5],
      },
    ];
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Faturamento por Produto</h4>
          <p className="text-[11px] text-muted-foreground">Top {Math.min(5, data.length)} produtos</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
          <XAxis type="number" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
          <YAxis type="category" dataKey="shortName" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} width={120} tick={{ fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              padding: "10px 14px",
              color: "hsl(var(--popover-foreground))",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number, _name: string, props: any) => [
              `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · ${props.payload.vendas} vendas`,
              "",
            ]}
          />
          <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={24}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
