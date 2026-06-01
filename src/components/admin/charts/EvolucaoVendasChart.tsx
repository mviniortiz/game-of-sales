import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
    <div className="rounded-2xl border border-[#E6EDF5] bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: "#EFF4FF" }}>
          <TrendingUp className="h-4 w-4 text-[#2563EB]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Evolução de Vendas</h4>
          <p className="text-[11px] text-muted-foreground">Últimos 6 meses</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
          <XAxis dataKey="periodo" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} width={30} />
          <YAxis yAxisId="right" orientation="right" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} width={55} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6EDF5",
              borderRadius: "12px",
              boxShadow: "0 8px 24px -8px rgba(11,18,32,0.12)",
              padding: "10px 14px",
              color: "#0B1220",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 600, marginBottom: "6px" }}
            formatter={(value: number, name: string) => {
              if (name === "Faturamento") return [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"];
              return [value, "Vendas"];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "12px" }}
            formatter={(value) => (
              <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                {value === "vendas" ? "Qtd. Vendas" : "Faturamento (R$)"}
              </span>
            )}
          />
          <Area yAxisId="left" type="monotone" dataKey="vendas" stroke="#2563EB" strokeWidth={2} fill="url(#colorVendas)" name="vendas" dot={false} activeDot={{ r: 4, fill: "#2563EB", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
          <Area yAxisId="right" type="monotone" dataKey="faturamento" stroke="#16A34A" strokeWidth={2} fill="url(#colorFaturamento)" name="Faturamento" dot={false} activeDot={{ r: 4, fill: "#16A34A", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
