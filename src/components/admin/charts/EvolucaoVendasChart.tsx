import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface EvolucaoVendasChartProps {
  data: Array<{
    periodo: string;
    vendas: number;
    faturamento: number;
  }>;
}

export const EvolucaoVendasChart = ({ data }: EvolucaoVendasChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                Evolução de Vendas
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 6 meses</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Gradient for Sales Area */}
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              {/* Gradient for Revenue Area */}
              <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.2)"
              vertical={false}
            />
            <XAxis
              dataKey="periodo"
              stroke="rgba(100,116,139,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(100,116,139,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(100,116,139,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={65}
              tickFormatter={formatCurrency}
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
              formatter={(value: number, name: string) => {
                if (name === "Faturamento") {
                  return [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "💰 Faturamento"];
                }
                return [value, "📦 Vendas"];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "16px" }}
              formatter={(value) => (
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  {value === "vendas" ? "Quantidade de Vendas" : "Faturamento (R$)"}
                </span>
              )}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="vendas"
              stroke="#4F46E5"
              strokeWidth={3}
              fill="url(#colorVendas)"
              name="vendas"
              dot={{ fill: "#4F46E5", r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#4F46E5", stroke: "#fff", strokeWidth: 2 }}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="faturamento"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#colorFaturamento)"
              name="Faturamento"
              dot={{ fill: "#10B981", r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
