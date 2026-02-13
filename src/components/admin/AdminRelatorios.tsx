import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingBag,
  CalendarIcon,
  Download,
  Crown,
  Trophy,
  Medal
} from "lucide-react";
import { EvolucaoVendasChart } from "./charts/EvolucaoVendasChart";
import { DistribuicaoProdutosChart } from "./charts/DistribuicaoProdutosChart";
import { ComparativoVendedoresChart } from "./charts/ComparativoVendedoresChart";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

// Mini Sparkline Component for KPI Cards
interface SparklineProps {
  data: number[];
  color: string;
}

const Sparkline = ({ data, color }: SparklineProps) => {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sparkline-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Enhanced KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: number;
  sparklineData?: number[];
  sparklineColor?: string;
}

const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  sparklineData,
  sparklineColor = "#4F46E5"
}: KPICardProps) => {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all group">
      {sparklineData && sparklineData.length > 0 && (
        <Sparkline data={sparklineData} color={sparklineColor} />
      )}
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
              {value}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {trend !== undefined && (
                <span className={`flex items-center text-sm font-semibold ${isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}>
                  <TrendIcon className="h-4 w-4 mr-0.5" />
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Top Performer Item Component
interface TopItemProps {
  rank: number;
  name: string;
  subtitle: string;
  value: string;
  maxValue: number;
  currentValue: number;
  avatarUrl?: string;
  showAvatar?: boolean;
}

const TopItem = ({ rank, name, subtitle, value, maxValue, currentValue, avatarUrl, showAvatar }: TopItemProps) => {
  const progress = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

  const getInitials = (nome: string) => {
    return nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRankIcon = (r: number) => {
    switch (r) {
      case 1: return <Crown className="h-4 w-4 text-amber-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Trophy className="h-4 w-4 text-amber-700" />;
      default: return <span className="text-sm font-bold text-gray-400">{r}</span>;
    }
  };

  const getRankBg = (r: number) => {
    switch (r) {
      case 1: return "bg-amber-100 dark:bg-amber-500/20 ring-2 ring-amber-300 dark:ring-amber-500/30";
      case 2: return "bg-gray-100 dark:bg-gray-500/20 ring-2 ring-gray-300 dark:ring-gray-500/30";
      case 3: return "bg-orange-100 dark:bg-orange-500/20 ring-2 ring-orange-300 dark:ring-orange-500/30";
      default: return "bg-gray-50 dark:bg-gray-800";
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Rank Badge or Avatar */}
      {showAvatar ? (
        <div className="relative">
          <Avatar className={`h-10 w-10 ${getRankBg(rank)}`}>
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200 font-semibold text-xs">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          {rank <= 3 && (
            <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-sm">
              {getRankIcon(rank)}
            </div>
          )}
        </div>
      ) : (
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getRankBg(rank)}`}>
          {getRankIcon(rank)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-gray-900 dark:text-white truncate pr-2">{name}</p>
          <p className="font-bold text-gray-900 dark:text-white text-sm tabular-nums whitespace-nowrap">
            {value}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AdminRelatorios = () => {
  const { activeCompanyId } = useTenant();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch profiles for avatar URLs
  const { data: profiles } = useQuery({
    queryKey: ["profiles-avatars", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data } = await supabase.from("profiles").select("id, nome, avatar_url").eq("company_id", activeCompanyId);
      return data || [];
    },
    enabled: !!activeCompanyId,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats", dateRange, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("*, profiles:user_id(id, nome, avatar_url)")
        .eq("company_id", activeCompanyId)
        .gte("data_venda", dateRange.from.toISOString())
        .lte("data_venda", dateRange.to.toISOString());

      if (error) throw error;

      const totalVendas = vendas?.length || 0;
      const faturamentoTotal = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;

      // Get previous period for comparison
      const prevStart = subMonths(dateRange.from, 1);
      const prevEnd = subMonths(dateRange.to, 1);

      const { data: prevVendas } = await supabase
        .from("vendas")
        .select("id, valor")
        .eq("company_id", activeCompanyId)
        .gte("data_venda", prevStart.toISOString())
        .lte("data_venda", prevEnd.toISOString());

      const prevTotal = prevVendas?.length || 0;
      const prevFaturamento = prevVendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;

      const trendVendas = prevTotal > 0 ? ((totalVendas - prevTotal) / prevTotal) * 100 : 0;
      const trendFaturamento = prevFaturamento > 0 ? ((faturamentoTotal - prevFaturamento) / prevFaturamento) * 100 : 0;

      // Top 3 vendedores
      const vendedoresMap = new Map();
      vendas?.forEach((venda) => {
        const vendedorId = venda.profiles?.id;
        const vendedorNome = venda.profiles?.nome || "Desconhecido";
        const avatarUrl = venda.profiles?.avatar_url;
        const current = vendedoresMap.get(vendedorNome) || {
          id: vendedorId,
          nome: vendedorNome,
          avatarUrl,
          total: 0,
          vendas: 0
        };
        current.total += Number(venda.valor);
        current.vendas += 1;
        vendedoresMap.set(vendedorNome, current);
      });

      const topVendedores = Array.from(vendedoresMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Top 3 produtos
      const produtosMap = new Map();
      vendas?.forEach((venda) => {
        const produtoNome = venda.produto_nome;
        const current = produtosMap.get(produtoNome) || { nome: produtoNome, total: 0, vendas: 0 };
        current.total += Number(venda.valor);
        current.vendas += 1;
        produtosMap.set(produtoNome, current);
      });

      const topProdutos = Array.from(produtosMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Top plataforma
      const plataformasMap = new Map();
      vendas?.forEach((venda) => {
        const plataforma = venda.plataforma || "Não especificada";
        const current = plataformasMap.get(plataforma) || 0;
        plataformasMap.set(plataforma, current + 1);
      });

      const topPlataforma = Array.from(plataformasMap.entries())
        .sort((a, b) => b[1] - a[1])[0];

      // Generate sparkline data (last 7 days)
      const sparklineVendas: number[] = [];
      const sparklineFaturamento: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        const dayStr = day.toISOString().split("T")[0];
        const dayVendas = vendas?.filter(v => v.data_venda?.startsWith(dayStr)) || [];
        sparklineVendas.push(dayVendas.length);
        sparklineFaturamento.push(dayVendas.reduce((acc, v) => acc + Number(v.valor), 0));
      }

      return {
        totalVendas,
        faturamentoTotal,
        ticketMedio,
        topVendedores,
        topProdutos,
        topPlataforma: topPlataforma ? { nome: topPlataforma[0], vendas: topPlataforma[1] } : null,
        trendVendas,
        trendFaturamento,
        sparklineVendas,
        sparklineFaturamento,
      };
    },
    enabled: !!activeCompanyId,
  });

  // Chart data queries
  const { data: evolucaoData } = useQuery({
    queryKey: ["evolucao-vendas", dateRange, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const sixMonthsAgo = subMonths(dateRange.from, 6);

      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("data_venda, valor")
        .eq("company_id", activeCompanyId)
        .gte("data_venda", sixMonthsAgo.toISOString())
        .order("data_venda");

      if (error) throw error;

      const monthlyData = new Map<string, { vendas: number; faturamento: number }>();

      vendas?.forEach((venda) => {
        const date = new Date(venda.data_venda);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        const current = monthlyData.get(monthName) || { vendas: 0, faturamento: 0 };
        current.vendas += 1;
        current.faturamento += Number(venda.valor);
        monthlyData.set(monthName, current);
      });

      return Array.from(monthlyData.entries()).map(([periodo, data]) => ({
        periodo,
        vendas: data.vendas,
        faturamento: data.faturamento,
      }));
    },
    enabled: !!activeCompanyId,
  });

  const { data: produtosData } = useQuery({
    queryKey: ["distribuicao-produtos", dateRange, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("produto_nome, valor")
        .eq("company_id", activeCompanyId)
        .gte("data_venda", dateRange.from.toISOString())
        .lte("data_venda", dateRange.to.toISOString());

      if (error) throw error;

      const produtosMap = new Map<string, { valor: number; vendas: number }>();

      vendas?.forEach((venda) => {
        const current = produtosMap.get(venda.produto_nome) || { valor: 0, vendas: 0 };
        current.valor += Number(venda.valor);
        current.vendas += 1;
        produtosMap.set(venda.produto_nome, current);
      });

      return Array.from(produtosMap.entries()).map(([nome, data]) => ({
        nome,
        valor: data.valor,
        vendas: data.vendas,
      }));
    },
    enabled: !!activeCompanyId,
  });

  const { data: vendedoresData } = useQuery({
    queryKey: ["comparativo-vendedores", dateRange, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("user_id, valor, profiles:user_id(nome)")
        .eq("company_id", activeCompanyId)
        .gte("data_venda", dateRange.from.toISOString())
        .lte("data_venda", dateRange.to.toISOString());

      if (error) throw error;

      const vendedoresMap = new Map<string, { vendas: number; faturamento: number }>();

      vendas?.forEach((venda) => {
        const nome = venda.profiles?.nome || "Desconhecido";
        const current = vendedoresMap.get(nome) || { vendas: 0, faturamento: 0 };
        current.vendas += 1;
        current.faturamento += Number(venda.valor);
        vendedoresMap.set(nome, current);
      });

      return Array.from(vendedoresMap.entries())
        .map(([nome, data]) => ({
          nome: nome.length > 15 ? nome.substring(0, 15) + '...' : nome,
          vendas: data.vendas,
          faturamento: data.faturamento,
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 10);
    },
    enabled: !!activeCompanyId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyFull = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const handleExport = () => {
    toast.info("Funcionalidade de exportação em desenvolvimento");
  };

  const maxVendedorTotal = stats?.topVendedores?.[0]?.total || 1;
  const maxProdutoTotal = stats?.topProdutos?.[0]?.total || 1;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Relatórios Gerais
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analytics & Performance • {format(dateRange.from, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, "dd MMM", { locale: ptBR })} - {format(dateRange.to, "dd MMM", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  } else if (range?.from) {
                    setDateRange({ from: range.from, to: range.from });
                  }
                }}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Export Button */}
          <Button
            variant="outline"
            className="gap-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Vendas"
          value={stats?.totalVendas || 0}
          subtitle="vs mês anterior"
          icon={ShoppingBag}
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          trend={stats?.trendVendas}
          sparklineData={stats?.sparklineVendas}
          sparklineColor="#4F46E5"
        />

        <KPICard
          title="Faturamento Total"
          value={formatCurrency(stats?.faturamentoTotal || 0)}
          subtitle="vs mês anterior"
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          trend={stats?.trendFaturamento}
          sparklineData={stats?.sparklineFaturamento}
          sparklineColor="#10B981"
        />

        <KPICard
          title="Ticket Médio"
          value={formatCurrency(stats?.ticketMedio || 0)}
          subtitle="por venda"
          icon={TrendingUp}
          iconBg="bg-emerald-100 dark:bg-emerald-500/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <KPICard
          title="Top Plataforma"
          value={stats?.topPlataforma?.nome || "-"}
          subtitle={`${stats?.topPlataforma?.vendas || 0} vendas`}
          icon={Package}
          iconBg="bg-amber-100 dark:bg-amber-500/20"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Charts */}
      <div className="space-y-6">
        {evolucaoData && evolucaoData.length > 0 && (
          <EvolucaoVendasChart data={evolucaoData} />
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {produtosData && produtosData.length > 0 && (
            <DistribuicaoProdutosChart data={produtosData} />
          )}

          {vendedoresData && vendedoresData.length > 0 && (
            <ComparativoVendedoresChart data={vendedoresData} />
          )}
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top 3 Vendedores */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Top 3 Vendedores
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ranking por faturamento</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-1">
              {stats?.topVendedores?.map((vendedor, index) => (
                <TopItem
                  key={index}
                  rank={index + 1}
                  name={vendedor.nome}
                  subtitle={`${vendedor.vendas} vendas`}
                  value={formatCurrencyFull(vendedor.total)}
                  maxValue={maxVendedorTotal}
                  currentValue={vendedor.total}
                  avatarUrl={vendedor.avatarUrl}
                  showAvatar={true}
                />
              ))}
              {(!stats?.topVendedores || stats.topVendedores.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Nenhum vendedor encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Produtos */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Top 3 Produtos
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ranking por faturamento</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-1">
              {stats?.topProdutos?.map((produto, index) => (
                <TopItem
                  key={index}
                  rank={index + 1}
                  name={produto.nome}
                  subtitle={`${produto.vendas} vendas`}
                  value={formatCurrencyFull(produto.total)}
                  maxValue={maxProdutoTotal}
                  currentValue={produto.total}
                  showAvatar={false}
                />
              ))}
              {(!stats?.topProdutos || stats.topProdutos.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Nenhum produto encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
