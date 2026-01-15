import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  UserCheck
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { MetasRankingCard } from "@/components/admin/MetasRankingCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, subDays } from "date-fns";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTenant } from "@/contexts/TenantContext";
import { logger } from "@/utils/logger";

interface AdminVendasViewProps {
  dateRange: { from?: Date; to?: Date };
  selectedVendedor: string;
  selectedFormaPagamento?: string;
  selectedProduto?: string;
  vendedores?: Array<{ id: string; nome: string }>;
  produtos?: Array<{ id: string; nome: string }>;
}

// Compact currency formatter
const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')} M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')} k`;
  }
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Premium KPI Card Component - Linear/Stripe Style
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
  glowColor?: string;
}

const KPICard = ({
  title,
  value,
  fullValue,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = "text-indigo-400",
  iconBg = "bg-indigo-500/10",
  glowColor = "shadow-indigo-500/20"
}: KPICardProps) => {
  const isPositive = trend && trend > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  const cardContent = (
    <Card className={`
      relative overflow-hidden
      border border-border 
      bg-card
      shadow-sm
      hover:shadow-md hover:${glowColor}
      transition-all duration-300 ease-out
      group cursor-default
    `}>
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon */}
          <div className={`
            relative p-3 rounded-2xl ${iconBg} 
            group-hover:scale-105
            transition-all duration-200 ease-out
          `}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>

          {/* Right: Content */}
          <div className="flex-1 text-right">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight leading-none">
              {value}
            </p>

            {/* Trend or Subtitle */}
            <div className="flex items-center justify-end gap-2 mt-2">
              {trend !== undefined && (
                <span className={`
                  inline-flex items-center gap-0.5 
                  px-2 py-0.5 rounded-full text-[11px] font-semibold
                  ${isPositive
                    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20'
                    : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20'
                  }
                `}>
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
      </CardContent>
    </Card>
  );

  // Wrap with tooltip if fullValue is provided
  if (fullValue) {
    return (
      <UITooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-card border border-border text-foreground font-mono shadow-md"
        >
          {fullValue}
        </TooltipContent>
      </UITooltip>
    );
  }

  return cardContent;
};

export const AdminVendasView = ({
  dateRange,
  selectedVendedor,
  selectedFormaPagamento = "todas",
  selectedProduto = "todos",
  vendedores = [],
  produtos = []
}: AdminVendasViewProps) => {
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [topView, setTopView] = useState<"vendedores" | "produtos">("vendedores");
  const inicioMes = dateRange.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  const fimMes = dateRange.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  const { activeCompanyId } = useTenant();

  const applyCompanyFilter = <T,>(query: any) => {
    // SECURITY: Always require a valid company_id to prevent data leakage
    if (!activeCompanyId) {
      return query.eq("company_id", "00000000-0000-0000-0000-000000000000");
    }
    return query.eq("company_id", activeCompanyId);
  };

  // Estatísticas gerais
  const { data: stats } = useQuery({
    queryKey: ["admin-stats-vendas", inicioMes, fimMes, selectedVendedor, selectedFormaPagamento, selectedProduto, activeCompanyId],
    queryFn: async () => {
      // Total de vendedores
      const { data: vendedoresData } = await applyCompanyFilter(
        supabase.from("profiles").select("id", { count: "exact" })
      );

      // Vendas do período
      let vendasQuery = applyCompanyFilter(
        supabase
          .from("vendas")
          .select("valor, status, forma_pagamento, produto_id")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
      );

      if (selectedVendedor !== "todos") {
        vendasQuery = vendasQuery.eq("user_id", selectedVendedor);
      }
      if (selectedFormaPagamento !== "todas") {
        vendasQuery = vendasQuery.eq("forma_pagamento", selectedFormaPagamento as any);
      }
      if (selectedProduto !== "todos") {
        vendasQuery = vendasQuery.eq("produto_id", selectedProduto as any);
      }

      const { data: vendas } = await vendasQuery;

      // Meta Consolidada do mês (usa a data do filtro para determinar o mês)
      const dataFiltro = new Date(inicioMes + "T12:00:00");
      const mesReferenciaConsolidada = `${dataFiltro.getFullYear()}-${String(
        dataFiltro.getMonth() + 1
      ).padStart(2, "0")}-01`;

      const { data: metaConsolidadaData } = await applyCompanyFilter(
        supabase
          .from("metas_consolidadas")
          .select("valor_meta")
          .eq("mes_referencia", mesReferenciaConsolidada)
          .maybeSingle()
      );

      // Show Rate calculation (exclui super-admins)
      let callsQuery = applyCompanyFilter(
        supabase
          .from("calls")
          .select("id, attendance_status, profiles!inner(is_super_admin)")
          .gte("data_call", inicioMes)
          .lte("data_call", fimMes)
          .eq("profiles.is_super_admin", false)
      );

      if (selectedVendedor !== "todos") {
        callsQuery = callsQuery.eq("user_id", selectedVendedor);
      }

      const { data: calls } = await callsQuery;

      const totalCalls = calls?.length || 0;
      const showCalls = calls?.filter((c: any) => c.attendance_status === 'show').length || 0;
      const showRate = totalCalls > 0 ? (showCalls / totalCalls) * 100 : 0;

      const totalVendedores = vendedoresData?.length || 0;
      const totalVendas = vendas?.filter(v => v.status === "Aprovado").reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const totalTransacoes = vendas?.filter(v => v.status === "Aprovado").length || 0;
      // Usa a meta consolidada real do banco
      const totalMetas = metaConsolidadaData?.valor_meta || 0;
      const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;
      const metaProgress = totalMetas > 0 ? (totalVendas / totalMetas) * 100 : 0;

      return {
        totalVendedores,
        totalVendas,
        totalTransacoes,
        totalMetas,
        ticketMedio,
        metaProgress,
        showRate,
        showCalls,
        totalCalls,
      };
    },
  });

  // Top vendedores
  const { data: topVendedores } = useQuery({
    queryKey: ["admin-top-vendedores", inicioMes, fimMes, selectedVendedor, activeCompanyId],
    queryFn: async () => {
      let profilesQuery = applyCompanyFilter(supabase.from("profiles").select("id, nome, avatar_url"));

      if (selectedVendedor !== "todos") {
        profilesQuery = profilesQuery.eq("id", selectedVendedor);
      }

      const { data: profiles } = await profilesQuery;

      if (!profiles) return [];

      const vendedoresData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: vendas } = await applyCompanyFilter(
            supabase
              .from("vendas")
              .select("valor")
              .eq("user_id", profile.id)
              .eq("status", "Aprovado")
              .gte("data_venda", inicioMes)
              .lte("data_venda", fimMes)
          );

          const total = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
          const quantidade = vendas?.length || 0;

          return {
            nome: profile.nome,
            avatar_url: profile.avatar_url,
            total,
            quantidade,
          };
        })
      );

      return vendedoresData
        .filter(v => v.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  // Top produtos
  const { data: topProdutos } = useQuery({
    queryKey: ["admin-top-produtos", inicioMes, fimMes, selectedVendedor, activeCompanyId],
    queryFn: async () => {
      let vendasQuery = applyCompanyFilter(
        supabase
          .from("vendas")
          .select("valor, produto_nome, user_id")
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
      );

      if (selectedVendedor !== "todos") {
        vendasQuery = vendasQuery.eq("user_id", selectedVendedor);
      }

      const { data: vendas } = await vendasQuery;
      if (!vendas) return [];

      const map = new Map<string, { nome: string; total: number; quantidade: number }>();
      vendas.forEach((v: any) => {
        const nome = v.produto_nome || "Produto";
        const current = map.get(nome) || { nome, total: 0, quantidade: 0 };
        current.total += Number(v.valor) || 0;
        current.quantidade += 1;
        map.set(nome, current);
      });

      return Array.from(map.values())
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  // Sales Evolution Chart Data
  const { data: vendasEvolution } = useQuery({
    queryKey: ["admin-vendas-evolution", inicioMes, fimMes, selectedVendedor, activeCompanyId],
    queryFn: async () => {
      let vendasQuery = applyCompanyFilter(
        supabase
          .from("vendas")
          .select("data_venda, valor")
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
          .order("data_venda", { ascending: true })
      );

      if (selectedVendedor !== "todos") {
        vendasQuery = vendasQuery.eq("user_id", selectedVendedor);
      }

      const { data: vendas } = await vendasQuery;

      // Group by date
      const grouped = (vendas || []).reduce((acc: Record<string, number>, v) => {
        const date = format(new Date(v.data_venda), "dd/MM");
        acc[date] = (acc[date] || 0) + Number(v.valor);
        return acc;
      }, {});

      // Fill in dates
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
  });

  // Meta consolidada - busca a meta do mês atual (baseado no filtro)
  const { data: metaConsolidada } = useQuery({
    queryKey: ["meta-consolidada", inicioMes, activeCompanyId],
    queryFn: async () => {
      // Usa a data do filtro para determinar o mês
      const dataFiltro = new Date(inicioMes + "T12:00:00"); // Adiciona horário para evitar problemas de timezone
      const mesReferencia = `${dataFiltro.getFullYear()}-${String(
        dataFiltro.getMonth() + 1
      ).padStart(2, "0")}-01`;

      logger.log("[Dashboard] Buscando meta consolidada para:", mesReferencia);

      const { data, error } = await applyCompanyFilter(
        supabase
          .from("metas_consolidadas")
          .select("*")
          .eq("mes_referencia", mesReferencia)
          .maybeSingle()
      );

      logger.log("[Dashboard] Meta consolidada encontrada:", data);

      if (error) throw error;
      return data;
    },
  });

  // Vendedores metas
  const { data: vendedoresMetas } = useQuery({
    queryKey: ["vendedores-metas", inicioMes, fimMes, selectedVendedor, selectedFormaPagamento, selectedProduto, activeCompanyId],
    queryFn: async () => {
      const dataFiltro = new Date(inicioMes + "T12:00:00");
      const mesReferencia = `${dataFiltro.getFullYear()}-${String(
        dataFiltro.getMonth() + 1
      ).padStart(2, "0")}-01`;

      let metasQuery = applyCompanyFilter(
        supabase
          .from("metas")
          .select(`
            id,
            user_id,
            valor_meta,
            profiles!inner(nome, avatar_url)
          `)
          .eq("mes_referencia", mesReferencia)
      );

      if (selectedVendedor !== "todos") {
        metasQuery = metasQuery.eq("user_id", selectedVendedor);
      }

      const { data: metas } = await metasQuery;

      if (!metas || metas.length === 0) return [];

      const vendedoresData = await Promise.all(
        metas.map(async (meta: any) => {
          let vendasQuery = applyCompanyFilter(
            supabase
              .from("vendas")
              .select("valor")
              .eq("user_id", meta.user_id)
              .eq("status", "Aprovado")
              .gte("data_venda", inicioMes)
              .lte("data_venda", fimMes)
          );

          if (selectedFormaPagamento !== "todas") {
            vendasQuery = vendasQuery.eq("forma_pagamento", selectedFormaPagamento as any);
          }
          if (selectedProduto !== "todos") {
            vendasQuery = vendasQuery.eq("produto_id", selectedProduto as any);
          }

          const { data: vendas } = await vendasQuery;

          const valorRealizado = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
          const percentual = meta.valor_meta > 0 ? (valorRealizado / meta.valor_meta) * 100 : 0;

          return {
            nome: meta.profiles.nome,
            avatar_url: meta.profiles.avatar_url,
            valorMeta: Number(meta.valor_meta),
            valorRealizado,
            percentual,
          };
        })
      );

      return vendedoresData.sort((a, b) => b.percentual - a.percentual);
    },
  });

  const valorConsolidadoAtingido = vendedoresMetas?.reduce((acc, v) => acc + v.valorRealizado, 0) || 0;
  const metaTotalConsolidada = Number(metaConsolidada?.valor_meta || 0);
  const percentualConsolidado = metaTotalConsolidada > 0
    ? (valorConsolidadoAtingido / metaTotalConsolidada) * 100
    : 0;

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Faturamento Total"
          value={formatCurrencyCompact(stats?.totalVendas || 0)}
          fullValue={formatCurrency(stats?.totalVendas || 0)}
          icon={DollarSign}
          trend={18.4}
          trendLabel="vs período anterior"
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          glowColor="shadow-emerald-500/20"
        />
        <KPICard
          title="Ticket Médio"
          value={formatCurrencyCompact(stats?.ticketMedio || 0)}
          fullValue={formatCurrency(stats?.ticketMedio || 0)}
          icon={TrendingUp}
          trend={5.2}
          trendLabel="vs período anterior"
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
          glowColor="shadow-indigo-500/20"
        />
        <KPICard
          title="Vendedores Ativos"
          value={(stats?.totalVendedores || 0).toString()}
          subtitle={`${stats?.totalTransacoes || 0} vendas no período`}
          icon={Users}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          glowColor="shadow-violet-500/20"
        />
        <KPICard
          title="Taxa de Show"
          value={`${(stats?.showRate || 0).toFixed(0)}%`}
          subtitle={`${stats?.showCalls || 0}/${stats?.totalCalls || 0} calls`}
          icon={UserCheck}
          trend={(stats?.showRate || 0) - 75}
          trendLabel="vs média"
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          glowColor="shadow-amber-500/20"
        />
      </div>

      {/* Row 2: Charts - 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Chart - Sales Evolution (60%) */}
        <Card className="lg:col-span-3 relative overflow-hidden border border-border bg-card shadow-sm">
          {/* Subtle corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none" />

          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                    <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-200" />
                  </div>
                  Evolução de Vendas
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1 ml-8">Últimos 15 dias • Faturamento diário</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={vendasEvolution || []} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValorAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
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
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    border: "1px solid rgba(148,163,184,0.3)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(15,23,42,0.15)",
                    padding: "12px 16px"
                  }}
                  labelStyle={{ color: "#475569", fontSize: 11, marginBottom: 4 }}
                  formatter={(value: number) => [
                    <span className="text-indigo-600 font-semibold">{formatCurrency(value)}</span>,
                    "Faturamento"
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#colorValorAdmin)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "#6366F1",
                    stroke: "#fff",
                    strokeWidth: 2,
                    filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))"
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Secondary Chart - Top Sellers / Products (40%) */}
        <Card className="lg:col-span-2 relative overflow-hidden border border-border bg-card shadow-sm">
          {/* Subtle corner accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl pointer-events-none" />

          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                  <Award className="h-4 w-4 text-amber-500 dark:text-amber-200" />
                </div>
                {topView === "vendedores" ? "Top 5 Vendedores" : "Top 5 Produtos"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={topView === "vendedores" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setTopView("vendedores")}
                >
                  Vendedores
                </Button>
                <Button
                  variant={topView === "produtos" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setTopView("produtos")}
                >
                  Produtos
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 ml-8">
              {topView === "vendedores" ? "Por faturamento no período" : "Top produtos por faturamento"}
            </p>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={(topView === "vendedores" ? topVendedores : topProdutos) || []}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barSize={24}
              >
                <defs>
                  <linearGradient id="barGradientAdmin" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#6366F1" />
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
                  dataKey="nome"
                  stroke="rgba(100,116,139,0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tick={{ fill: 'rgba(71,85,105,0.9)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    border: "1px solid rgba(148,163,184,0.3)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(15,23,42,0.15)",
                    padding: "12px 16px"
                  }}
                  formatter={(value: number) => [
                    <span className="text-emerald-600 font-semibold">{formatCurrency(value)}</span>,
                    "Faturamento"
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="url(#barGradientAdmin)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>


      {/* Row 4: Ranking de Metas */}
      {(metaConsolidada || vendedoresMetas || true) && (() => {
        const hasActiveFilters = selectedVendedor !== "todos" || selectedFormaPagamento !== "todas" || selectedProduto !== "todos";

        const filterParts = [];
        if (selectedVendedor !== "todos") {
          const vendedorNome = vendedores?.find(v => v.id === selectedVendedor)?.nome;
          if (vendedorNome) filterParts.push(`Vendedor: ${vendedorNome}`);
        }
        if (selectedFormaPagamento !== "todas") {
          filterParts.push(`Forma: ${selectedFormaPagamento}`);
        }
        if (selectedProduto !== "todos") {
          const produtoNome = produtos?.find(p => p.id === selectedProduto)?.nome;
          if (produtoNome) filterParts.push(`Produto: ${produtoNome}`);
        }

        const filterDescription = filterParts.length > 0
          ? `Filtros ativos: ${filterParts.join(" • ")}`
          : "Acompanhamento mensal de performance";

        // Only render if there's real data
        if (!vendedoresMetas || vendedoresMetas.length === 0) {
          return null;
        }

        return (
          <MetasRankingCard
            metaConsolidada={metaTotalConsolidada}
            valorConsolidadoAtingido={valorConsolidadoAtingido}
            percentualConsolidado={percentualConsolidado}
            vendedores={vendedoresMetas}
            statusFiltro={statusFiltro}
            onStatusChange={setStatusFiltro}
            hasActiveFilters={hasActiveFilters}
            filterDescription={filterDescription}
          />
        );
      })()}
    </div>
  );
};
