import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ChartPayload } from "@/hooks/useReportAgent";

const COLORS = [
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
];

const formatCurrency = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold tabular-nums">
          {entry.name}: {typeof entry.value === "number" && entry.value >= 100
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

function EvaBarChart({ chart }: { chart: ChartPayload }) {
  const xKey = chart.xKey || "name";
  const yKey = chart.yKey || "value";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {chart.data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EvaLineChart({ chart }: { chart: ChartPayload }) {
  const xKey = chart.xKey || "name";
  const yKey = chart.yKey || "value";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chart.data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: "#8b5cf6", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#8b5cf6", stroke: "hsl(var(--card))", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EvaPieChart({ chart }: { chart: ChartPayload }) {
  const nameKey = chart.xKey || "name";
  const valueKey = chart.yKey || "value";

  const total = useMemo(
    () => chart.data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0),
    [chart.data, valueKey]
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chart.data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={45}
          strokeWidth={0}
          paddingAngle={2}
          label={({ name, value }) => {
            const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(0) : "0";
            return `${name} (${pct}%)`;
          }}
          labelLine={{ stroke: "hsl(var(--border))" }}
        >
          {chart.data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EvaChartRenderer({ chart }: { chart: ChartPayload }) {
  return (
    <div className="mt-3 rounded-xl border border-border/30 bg-muted/50 p-3">
      {chart.title && (
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 pl-1">
          {chart.title}
        </p>
      )}
      {chart.type === "bar" && <EvaBarChart chart={chart} />}
      {chart.type === "line" && <EvaLineChart chart={chart} />}
      {chart.type === "pie" && <EvaPieChart chart={chart} />}
    </div>
  );
}
