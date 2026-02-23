import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { useMemo } from "react";

interface DistribuicaoProdutosChartProps {
  data: Array<{
    nome: string;
    valor: number;
    vendas: number;
  }>;
}

// Color palette for bars — Emerald brand palette
const BAR_COLORS = [
  "#10b981", // Emerald-500 (primary)
  "#059669", // Emerald-600
  "#34d399", // Emerald-400
  "#6ee7b7", // Emerald-300
  "#0891b2", // Cyan-600 (accent)
  "#94A3B8", // Slate-400 for "Others"
];

export const DistribuicaoProdutosChart = ({ data }: DistribuicaoProdutosChartProps) => {
  // Process data: top 5 + Others
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.valor - a.valor);

    if (sorted.length <= 6) {
      return sorted.map((item, index) => ({
        ...item,
        shortName: item.nome.length > 25 ? item.nome.substring(0, 22) + "..." : item.nome,
        color: BAR_COLORS[index % BAR_COLORS.length]
      }));
    }

    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersTotal = others.reduce((acc, item) => acc + item.valor, 0);
    const othersVendas = others.reduce((acc, item) => acc + item.vendas, 0);

    return [
      ...top5.map((item, index) => ({
        ...item,
        shortName: item.nome.length > 25 ? item.nome.substring(0, 22) + "..." : item.nome,
        color: BAR_COLORS[index]
      })),
      {
        nome: `Outros (${others.length} produtos)`,
        shortName: `Outros (${others.length})`,
        valor: othersTotal,
        vendas: othersVendas,
        color: BAR_COLORS[5]
      }
    ];
  }, [data]);

  const maxValue = Math.max(...chartData.map(d => d.valor));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const formatCurrencyFull = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
              Faturamento por Produto
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Top {Math.min(5, data.length)} produtos do mês
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.2)"
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="rgba(100,116,139,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              stroke="rgba(100,116,139,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={130}
              tick={{ fill: "rgb(107, 114, 128)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(226,232,240,0.8)",
                borderRadius: "12px",
                boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
                padding: "12px 16px"
              }}
              labelStyle={{
                color: "#1e293b",
                fontWeight: 600,
                marginBottom: "8px"
              }}
              formatter={(value: number, _name: string, props: any) => {
                const percent = ((value / maxValue) * 100).toFixed(1);
                return [
                  <div key="tooltip" className="space-y-1">
                    <div className="font-bold text-gray-900">{formatCurrencyFull(value)}</div>
                    <div className="text-xs text-gray-500">{props.payload.vendas} vendas • {percent}% do top</div>
                  </div>,
                  ""
                ];
              }}
              labelFormatter={(label) => label}
            />
            <Bar
              dataKey="valor"
              radius={[0, 6, 6, 0]}
              barSize={28}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend with percentages */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2">
            {chartData.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600 dark:text-gray-400 truncate">
                  {item.vendas} vendas
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
