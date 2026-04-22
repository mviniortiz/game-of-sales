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
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E37A" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00E37A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
          <XAxis dataKey="periodo" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} width={30} />
          <YAxis yAxisId="right" orientation="right" stroke="rgba(128,128,128,0.4)" fontSize={11} tickLine={false} axisLine={false} width={55} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              padding: "10px 14px",
              color: "hsl(var(--popover-foreground))",
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
          <Area yAxisId="left" type="monotone" dataKey="vendas" stroke="#6366f1" strokeWidth={2} fill="url(#colorVendas)" name="vendas" dot={false} activeDot={{ r: 4, fill: "#6366f1", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
          <Area yAxisId="right" type="monotone" dataKey="faturamento" stroke="#00E37A" strokeWidth={2} fill="url(#colorFaturamento)" name="Faturamento" dot={false} activeDot={{ r: 4, fill: "#00E37A", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
