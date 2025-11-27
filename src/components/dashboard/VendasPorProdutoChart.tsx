import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package } from "lucide-react";

interface VendasPorProdutoChartProps {
  data: Array<{ produto: string; quantidade: number; total: number }>;
}

export const VendasPorProdutoChart = ({ data }: VendasPorProdutoChartProps) => {
  const chartData = data.map(item => ({
    produto: item.produto.length > 12 ? item.produto.substring(0, 12) + "..." : item.produto,
    quantidade: item.quantidade,
    total: item.total,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-400" />
          Vendas por Produto
        </CardTitle>
        <p className="text-xs text-slate-500">Faturamento por categoria</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
            barSize={48}
          >
            <defs>
              <linearGradient id="colorProduto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity={1}/>
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="produto" 
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrencyCompact}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number, name: string) => {
                if (name === "total") return [formatCurrency(value), "Faturamento"];
                return [value, "Quantidade"];
              }}
            />
            <Bar 
              dataKey="total" 
              fill="url(#colorProduto)" 
              name="total" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
