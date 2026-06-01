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
    <div className="rounded-2xl border border-[#E6EDF5] bg-white p-5" style={{ boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: "#EFF4FF" }}>
          <Users className="h-4 w-4 text-[#2563EB]" />
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
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6EDF5",
              borderRadius: "12px",
              boxShadow: "0 8px 24px -8px rgba(11,18,32,0.12)",
              padding: "10px 14px",
              color: "#0B1220",
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
          <Bar yAxisId="left" dataKey="vendas" fill="#2563EB" name="Vendas" radius={[4, 4, 0, 0]} barSize={16} />
          <Bar yAxisId="right" dataKey="faturamento" fill="#16A34A" name="Faturamento" radius={[4, 4, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
