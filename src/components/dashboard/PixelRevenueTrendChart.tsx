import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type TrendPoint = {
  date: string;
  valor: number;
};

interface PixelRevenueTrendChartProps {
  data: TrendPoint[];
  height?: number;
}

const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const chartConfig = {
  valor: {
    label: "Faturamento",
    color: "hsl(160, 84%, 39%)",
  },
} satisfies ChartConfig;

export function PixelRevenueTrendChart({ data, height = 260 }: PixelRevenueTrendChartProps) {
  const total = useMemo(() => data.reduce((acc, item) => acc + item.valor, 0), [data]);

  if (data.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Sem vendas no período para montar o gráfico.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with total */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(total)}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          Faturamento do mês
        </div>
      </div>

      {/* Area Chart */}
      <ChartContainer config={chartConfig} className="w-full" style={{ height, minHeight: 200 }}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="areaGradientValor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
              <stop offset="60%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickMargin={8}
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={10}
            tickMargin={4}
            width={52}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={formatCurrencyCompact}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(value as number)}
                  </span>
                )}
                labelFormatter={(label) => `Dia ${label}`}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={2.5}
            fill="url(#areaGradientValor)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "hsl(160, 84%, 39%)",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
