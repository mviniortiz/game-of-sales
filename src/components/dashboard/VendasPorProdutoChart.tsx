import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Package } from "lucide-react";

interface VendasPorProdutoChartProps {
  data: Array<{ produto: string; quantidade: number; total: number }>;
}

export const VendasPorProdutoChart = ({ data }: VendasPorProdutoChartProps) => {
  const chartData = data.map(item => ({
    produto: item.produto.length > 15 ? item.produto.substring(0, 15) + "..." : item.produto,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Vendas por Produto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="produto" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "total") return [formatCurrency(value), "Faturamento"];
                return [value, "Quantidade"];
              }}
            />
            <Legend />
            <Bar dataKey="quantidade" fill="hsl(var(--primary))" name="Quantidade" radius={[8, 8, 0, 0]} />
            <Bar dataKey="total" fill="hsl(var(--accent))" name="Faturamento (R$)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
