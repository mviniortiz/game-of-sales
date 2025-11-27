import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface VendasChartProps {
  data: Array<{ data: string; vendas: number }>;
}

export const VendasChart = ({ data }: VendasChartProps) => {
  // Calcular o valor máximo para adicionar padding
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.vendas)) : 0;
  const yAxisMax = Math.ceil(maxValue * 1.2); // 20% de padding no topo

  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Evolução de Vendas
        </CardTitle>
        <p className="text-xs text-slate-500">
          Quantidade de vendas ao longo do tempo
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart 
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="data"
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={data.length > 10 ? Math.floor(data.length / 7) : 0}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, yAxisMax || 10]}
              allowDecimals={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number) => [value, "Vendas"]}
            />
            <Area
              type="monotone"
              dataKey="vendas"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#colorVendas)"
              dot={{ r: 0 }}
              activeDot={{ r: 6, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
