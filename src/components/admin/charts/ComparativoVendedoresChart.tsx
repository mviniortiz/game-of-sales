import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

interface ComparativoVendedoresChartProps {
  data: Array<{
    nome: string;
    vendas: number;
    faturamento: number;
  }>;
}

export const ComparativoVendedoresChart = ({ data }: ComparativoVendedoresChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Comparativo de Vendedores</h4>
          <p className="text-[11px] text-muted-foreground">Mês atual</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
          <XAxis
            dataKey="nome"
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
            fontSize={11}
            stroke="rgba(128,128,128,0.4)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            yAxisId="left"
            fontSize={11}
            stroke="rgba(128,128,128,0.4)"
            tickLine={false}
            axisLine={false}
            width={30}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            fontSize={11}
            stroke="rgba(128,128,128,0.4)"
            tickLine={false}
            axisLine={false}
            width={55}
            tickFormatter={formatCurrency}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
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
            formatter={(value: number, name: string) => {
              if (name === "Faturamento") return [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"];
              return [value, "Vendas"];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "8px" }}
            formatter={(value) => (
              <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>{value}</span>
            )}
          />
          <Bar yAxisId="left" dataKey="vendas" fill="#6366f1" name="Vendas" radius={[4, 4, 0, 0]} barSize={16} />
          <Bar yAxisId="right" dataKey="faturamento" fill="#00E37A" name="Faturamento" radius={[4, 4, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
