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

const BAR_COLORS = ["#2563EB", "#4A8CE8", "#7C3AED", "#0EA5E9", "#22C55E", "#94A3B8"];

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
    <div className="rounded-2xl border border-[#E6EDF5] bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: "#EFF4FF" }}>
          <Package className="h-4 w-4 text-[#2563EB]" />
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
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6EDF5",
              borderRadius: "12px",
              boxShadow: "0 8px 24px -8px rgba(11,18,32,0.12)",
              padding: "10px 14px",
              color: "#0B1220",
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
