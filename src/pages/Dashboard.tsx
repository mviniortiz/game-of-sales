import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboardOverview } from "@/components/dashboard/AdminDashboardOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Target,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  Percent
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Compact currency formatter with full value tooltip support
const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')} M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} k`;
  }
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} `;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Premium KPI Card — Game Sales Identity
interface KPICardProps {
  title: string;
  value: string;
  fullValue?: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  iconColor?: string;
  iconBg?: string;
  accentColor?: string; // CSS color for left border accent
}

const KPICard = ({
  title,
  value,
  fullValue,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = "text-emerald-400",
  iconBg = "bg-emerald-500/10",
  accentColor = "#10b981",
}: KPICardProps) => {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  const cardContent = (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group cursor-default">
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accentColor, opacity: 0.7 }}
      />

      <div className="p-5">
        {/* Top row: icon + title */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-105 transition-transform duration-200`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
            {title}
          </p>
        </div>

        {/* Value */}
        <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none mb-3">
          {value}
        </p>

        {/* Trend chip + label */}
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPositive
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20"
                }`}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {(trendLabel || subtitle) && (
            <span className="text-[11px] text-muted-foreground font-medium">
              {trendLabel || subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (fullValue) {
    return (
      <UITooltip>
        <TooltipTrigger asChild>
          <div>{cardContent}</div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-slate-900/95 border-white/10 text-white font-mono"
        >
          {fullValue}
        </TooltipContent>
      </UITooltip>
    );
  }

  return cardContent;
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  // Se for admin, mostrar dashboard administrativo
  if (isAdmin) {
    return <AdminDashboardOverview />;
  }

  const startOfMonthDate = startOfMonth(new Date()).toISOString().split("T")[0];
  const endOfMonthDate = endOfMonth(new Date()).toISOString().split("T")[0];

  const { data: vendas } = useQuery({
    queryKey: ["vendas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "Aprovado")
        .gte("data_venda", startOfMonthDate)
        .lte("data_venda", endOfMonthDate);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Sales evolution data for chart
  const { data: vendasEvolution } = useQuery({
    queryKey: ["vendas-evolution", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("data_venda, valor")
        .eq("user_id", user?.id)
        .gte("data_venda", startOfMonthDate)
        .order("data_venda", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc: Record<string, number>, v) => {
        const date = format(new Date(v.data_venda), "dd/MM");
        acc[date] = (acc[date] || 0) + Number(v.valor);
        return acc;
      }, {});

      // Fill in missing dates
      const result = [];
      const today = new Date();
      for (let i = 14; i >= 0; i--) {
        const date = subDays(today, i);
        const dateKey = format(date, "dd/MM");
        result.push({
          date: dateKey,
          valor: grouped[dateKey] || 0,
        });
      }

      return result;
    },
    enabled: !!user?.id,
  });

  const { data: vendasPorProduto } = useQuery<Array<{ produto: string; quantidade: number; total: number }>>({
    queryKey: ["vendas-por-produto", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("produto_nome, valor")
        .eq("user_id", user?.id)
        .gte("data_venda", startOfMonthDate);

      if (error) throw error;

      const agregado = data.reduce((acc: any, venda) => {
        const produto = venda.produto_nome;
        if (!acc[produto]) {
          acc[produto] = { produto, quantidade: 0, total: 0 };
        }
        acc[produto].quantidade += 1;
        acc[produto].total += Number(venda.valor);
        return acc;
      }, {});

      return Object.values(agregado).sort((a: any, b: any) => b.total - a.total).slice(0, 5) as Array<{ produto: string; quantidade: number; total: number }>;
    },
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Show Rate KPI
  const { data: showRateData } = useQuery({
    queryKey: ["show-rate", user?.id],
    queryFn: async () => {
      const { data: calls, error } = await supabase
        .from("calls")
        .select("id, attendance_status")
        .eq("user_id", user?.id)
        .gte("data_call", startOfMonthDate);

      if (error) throw error;

      const totalCalls = calls?.length || 0;
      const showCalls = calls?.filter((c: any) => c.attendance_status === 'show').length || 0;
      const showRate = totalCalls > 0 ? (showCalls / totalCalls) * 100 : 0;

      return { totalCalls, showCalls, showRate };
    },
    enabled: !!user?.id,
  });

  // Conversion Rate KPI (Calls Realizadas -> Vendas)
  const { data: conversionRateData } = useQuery({
    queryKey: ["conversion-rate", user?.id],
    queryFn: async () => {
      // Get calls that were realized (status = show)
      const { data: calls, error: callsError } = await supabase
        .from("calls")
        .select("id")
        .eq("user_id", user?.id)
        .eq("attendance_status", "show")
        .gte("data_call", startOfMonthDate);

      if (callsError) throw callsError;

      // Get approved sales in the same period
      const { data: sales, error: salesError } = await supabase
        .from("vendas")
        .select("id")
        .eq("user_id", user?.id)
        .eq("status", "Aprovado")
        .gte("data_venda", startOfMonthDate);

      if (salesError) throw salesError;

      const callsRealizadas = calls?.length || 0;
      const vendasRealizadas = sales?.length || 0;
      const conversionRate = callsRealizadas > 0 ? (vendasRealizadas / callsRealizadas) * 100 : 0;

      return { callsRealizadas, vendasRealizadas, conversionRate };
    },
    enabled: !!user?.id,
  });

  // Meta do mês
  const { data: metaData } = useQuery({
    queryKey: ["meta-mensal", user?.id],
    queryFn: async () => {
      const mesRef = format(new Date(), "yyyy-MM-01");
      const { data, error } = await supabase
        .from("metas")
        .select("valor_meta, current_value")
        .eq("user_id", user?.id)
        .eq("mes_referencia", mesRef)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalVendas = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
  const ticketMedio = vendas?.length ? totalVendas / vendas.length : 0;
  const totalTransacoes = vendas?.length || 0;
  const metaValor = Number(metaData?.valor_meta) || 0;
  const metaProgress = metaValor > 0 ? (totalVendas / metaValor) * 100 : 0;

  return (
    <div className="space-y-6 p-1">
      {/* Header - Premium Style */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-emerald-200/70 dark:ring-emerald-500/20">
              <Sparkles className="h-3 w-3" />
              Live
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Bem-vindo, <span className="text-foreground">{profile?.nome || "Vendedor"}</span> • {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Row 1: KPI Cards - 5 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <KPICard
          title="Faturamento"
          value={formatCurrencyCompact(totalVendas)}
          fullValue={formatCurrency(totalVendas)}
          icon={DollarSign}
          trend={18.4}
          trendLabel="vs mês anterior"
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          accentColor="#10b981"
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrencyCompact(ticketMedio)}
          fullValue={formatCurrency(ticketMedio)}
          icon={TrendingUp}
          trend={5.2}
          trendLabel="vs mês anterior"
          iconColor="text-sky-400"
          iconBg="bg-sky-500/10"
          accentColor="#0ea5e9"
        />
        <KPICard
          title="Transações"
          value={totalTransacoes.toString()}
          subtitle={`${totalTransacoes} vendas fechadas`}
          icon={ShoppingCart}
          trend={12.3}
          trendLabel="vs mês anterior"
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          accentColor="#8b5cf6"
        />
        <KPICard
          title="Taxa de Show"
          value={`${(showRateData?.showRate || 0).toFixed(0)}%`}
          subtitle={`${showRateData?.showCalls || 0}/${showRateData?.totalCalls || 0} calls`}
          icon={UserCheck}
          trend={showRateData?.showRate ? showRateData.showRate - 75 : 0}
          trendLabel="vs média"
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          accentColor="#f59e0b"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${(conversionRateData?.conversionRate || 0).toFixed(0)}%`}
          subtitle={`${conversionRateData?.vendasRealizadas || 0}/${conversionRateData?.callsRealizadas || 0} vendas`}
          icon={Percent}
          trend={conversionRateData?.conversionRate ? conversionRateData.conversionRate - 30 : 0}
          trendLabel="vs média"
          iconColor="text-rose-400"
          iconBg="bg-rose-500/10"
          accentColor="#f43f5e"
        />
      </div>

      {/* Row 2: Charts - 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Chart - Sales Evolution (60%) */}
        <Card className="lg:col-span-3 relative overflow-hidden bg-card border-border shadow-sm">
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  Evolução de Vendas
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1 ml-8">Últimos 15 dias • Faturamento diário</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={vendasEvolution || []} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="rgba(100,116,139,0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="rgba(100,116,139,0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "12px 16px",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 4 }}
                  formatter={(value: number) => [
                    <span className="text-foreground font-semibold">{formatCurrency(value)}</span>,
                    "Faturamento"
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#colorValor)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "#10b981",
                    stroke: "#fff",
                    strokeWidth: 2,
                    filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))"
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card >

        {/* Secondary Chart - Top Products (40%) */}
        < Card className="lg:col-span-2 relative overflow-hidden bg-card border-border shadow-sm" >
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              </div>
              Top Produtos
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 ml-8">Por faturamento no período</p>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={vendasPorProduto || []}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barSize={24}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="rgba(100,116,139,0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                />
                <YAxis
                  type="category"
                  dataKey="produto"
                  stroke="rgba(100,116,139,0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tick={{ fill: 'rgba(100,116,139,0.9)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    padding: "12px 16px",
                  }}
                  formatter={(value: number) => [
                    <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{formatCurrency(value)}</span>,
                    "Total"
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="url(#barGradient)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card >
      </div >

      {/* Row 3: Meta Progress - Premium Card */}
      {
        metaValor > 0 && (
          <Card className="relative overflow-hidden bg-card border-border shadow-sm">
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 group-hover:scale-105 transition-transform">
                    <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-200 relative z-10" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Meta do Mês</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="text-emerald-600 dark:text-emerald-300 font-medium">{formatCurrency(totalVendas)}</span>
                      <span className="mx-1.5 text-muted-foreground">/</span>
                      <span>{formatCurrency(metaValor)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold tabular-nums ${metaProgress >= 100 ? 'text-emerald-600 dark:text-emerald-300' :
                    metaProgress >= 70 ? 'text-emerald-600 dark:text-emerald-200' :
                      'text-amber-500 dark:text-amber-300'
                    }`}>
                    {metaProgress.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">alcançado</p>
                </div>
              </div>

              {/* Premium Progress Bar */}
              <div className="relative h-3 bg-muted rounded-full overflow-hidden ring-1 ring-border/60">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${metaProgress >= 100
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300'
                    : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400'
                    }`}
                  style={{ width: `${Math.min(metaProgress, 100)}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>

                {/* Milestone markers */}
                <div className="absolute inset-0 flex justify-between px-0.5">
                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="w-px h-full bg-border"
                      style={{ marginLeft: `${milestone}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Milestone labels */}
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[10px] text-muted-foreground">0%</span>
                <span className="text-[10px] text-muted-foreground">50%</span>
                <span className="text-[10px] text-muted-foreground">100%</span>
              </div>
            </CardContent>
          </Card>
        )
      }
    </div >
  );
};

export default Dashboard;
