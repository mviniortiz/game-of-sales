import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PixelRevenueTrendChart } from "@/components/dashboard/PixelRevenueTrendChart";
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
  UserCheck,
  Filter,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  iconColor = "text-emerald-600 dark:text-emerald-400",
  iconBg = "bg-emerald-50 dark:bg-emerald-500/10",
}: KPICardProps) => {
  const isPositive = trend && trend > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  const cardContent = (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-default"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="p-3 sm:p-4">
        {/* Top row: title + icon */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
            {title}
          </p>
          <div className={`p-1.5 rounded-lg ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
        </div>

        {/* Value */}
        <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none mb-2">
          {value}
        </p>

        {/* Trend chip + label */}
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isPositive
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            }`}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {(trendLabel || subtitle) && (
            <span className="text-[10px] text-muted-foreground truncate">
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
          className="bg-popover border-border text-popover-foreground font-mono"
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
  const inicioMes = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const fimMes = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
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

  // Pipeline Funnel - deals por estágio
  const PIPELINE_STAGES = [
    { id: "lead", label: "Leads", color: "#6B7280", bgColor: "bg-gray-100 dark:bg-gray-500/10" },
    { id: "qualification", label: "Qualificação", color: "#3B82F6", bgColor: "bg-blue-100 dark:bg-blue-500/10" },
    { id: "proposal", label: "Proposta", color: "#6366F1", bgColor: "bg-indigo-100 dark:bg-indigo-500/10" },
    { id: "negotiation", label: "Negociação", color: "#F59E0B", bgColor: "bg-amber-100 dark:bg-amber-500/10" },
    { id: "closed_won", label: "Fechado (Ganho)", color: "#10B981", bgColor: "bg-emerald-100 dark:bg-emerald-500/10" },
    { id: "closed_lost", label: "Perdido", color: "#EF4444", bgColor: "bg-rose-100 dark:bg-rose-500/10" },
  ];

  const { data: pipelineData } = useQuery({
    queryKey: ["admin-pipeline-funnel", activeCompanyId, selectedVendedor],
    queryFn: async () => {
      let query = applyCompanyFilter(
        supabase
          .from("deals")
          .select("id, stage, value")
      );

      if (selectedVendedor !== "todos") {
        query = query.eq("user_id", selectedVendedor);
      }

      const { data: deals, error } = await query;
      if (error) throw error;

      const stageMap: Record<string, { count: number; value: number }> = {};
      PIPELINE_STAGES.forEach(s => { stageMap[s.id] = { count: 0, value: 0 }; });

      (deals || []).forEach((deal: any) => {
        if (stageMap[deal.stage]) {
          stageMap[deal.stage].count += 1;
          stageMap[deal.stage].value += Number(deal.value) || 0;
        }
      });

      return PIPELINE_STAGES.map(stage => ({
        ...stage,
        count: stageMap[stage.id].count,
        value: stageMap[stage.id].value,
      }));
    },
    enabled: !!activeCompanyId,
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
            profiles!inner(nome, avatar_url, company_id)
          `)
          .eq("mes_referencia", mesReferencia)
      );

      if (selectedVendedor !== "todos") {
        metasQuery = metasQuery.eq("user_id", selectedVendedor);
      }
      if (activeCompanyId) {
        metasQuery = metasQuery.eq("profiles.company_id", activeCompanyId);
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
      {/* Row 1: KPI Cards with mini charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Faturamento com sparkline */}
        <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Faturamento</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{formatCurrencyCompact(stats?.totalVendas || 0)}</p>
          <div className="flex items-center gap-1.5 mt-1 mb-2">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />vs anterior
            </span>
          </div>
          {/* Sparkline from evolution data */}
          <svg className="w-full h-10" viewBox="0 0 120 30" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkFillAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const d = (vendasEvolution || []).slice(-12);
              if (d.length < 2) return null;
              const max = Math.max(...d.map(v => v.valor), 1);
              const points = d.map((v, i) => `${(i / (d.length - 1)) * 120},${30 - (v.valor / max) * 25}`).join(" L");
              return (
                <>
                  <path d={`M${points} L120,30 L0,30 Z`} fill="url(#sparkFillAdmin)" />
                  <path d={`M${points}`} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                </>
              );
            })()}
          </svg>
        </div>

        {/* Vendas com mini barras azuis */}
        <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Vendas</p>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{stats?.totalTransacoes || 0}</p>
          <div className="flex items-center gap-1.5 mt-1 mb-2">
            <span className="text-[10px] text-muted-foreground">{stats?.totalVendedores || 0} vendedores ativos</span>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-[3px] h-10">
            {(() => {
              const d = (vendasEvolution || []).slice(-14);
              const max = Math.max(...d.map(v => v.valor), 1);
              return d.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-blue-400/70 dark:bg-blue-400/50 min-h-[2px]"
                  style={{ height: `${Math.max((v.valor / max) * 100, 5)}%` }}
                />
              ));
            })()}
          </div>
        </div>

        {/* Meta com anel de progresso */}
        <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Meta</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Ring */}
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" className="stroke-muted" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  className={percentualConsolidado >= 70 ? "stroke-emerald-500" : "stroke-amber-500"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="88"
                  strokeDashoffset={88 - (88 * Math.min(percentualConsolidado, 100)) / 100}
                  style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${percentualConsolidado >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                  {percentualConsolidado.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{formatCurrencyCompact(valorConsolidadoAtingido)}</p>
              <p className="text-[10px] text-muted-foreground">de {formatCurrencyCompact(metaTotalConsolidada)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Pipeline + Top Performers side by side */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Pipeline de Vendas */}
        <div className="md:col-span-3 rounded-xl border border-border bg-card p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Performance Semanal</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-muted-foreground">Live</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { stage: "Vendas", count: stats?.totalTransacoes || 0, color: "from-emerald-500 to-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
              { stage: "Vendedores", count: stats?.totalVendedores || 0, color: "from-blue-500 to-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400" },
              { stage: "Ticket Médio", count: formatCurrencyCompact(stats?.ticketMedio || 0), color: "from-violet-500 to-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-400" },
              { stage: "Show Rate", count: `${(stats?.showRate || 0).toFixed(0)}%`, color: "from-amber-500 to-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="flex-1">
                <div className={`${s.bg} rounded-lg p-3 text-center border border-transparent hover:border-border transition-colors`}>
                  <div className={`w-8 h-1 mx-auto rounded-full bg-gradient-to-r ${s.color} mb-2`} />
                  <p className={`text-lg font-bold ${s.text}`}>{s.count}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{s.stage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers - Ranking Live */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">🏆 Top Performers</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-muted-foreground">Live</span>
            </div>
          </div>
          <div className="space-y-2">
            {(vendedoresMetas || []).slice(0, 5).map((seller, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const avatarColors = [
                "bg-gradient-to-br from-rose-400 to-pink-500",
                "bg-gradient-to-br from-blue-400 to-indigo-500",
                "bg-gradient-to-br from-amber-400 to-orange-500",
                "bg-gradient-to-br from-violet-400 to-purple-500",
                "bg-gradient-to-br from-teal-400 to-cyan-500",
              ];
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{medals[i] || `${i + 1}º`}</span>
                  {seller.avatar_url ? (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={seller.avatar_url} />
                      <AvatarFallback className="text-[9px]">{getInitials(seller.nome)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={`w-7 h-7 rounded-full ${avatarColors[i % avatarColors.length]} flex items-center justify-center shrink-0`}>
                      <span className="text-[9px] font-bold text-white">{getInitials(seller.nome)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{seller.nome}</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-0.5">
                      <div
                        className="h-1.5 bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(seller.percentual, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatCurrencyCompact(seller.valorRealizado)}
                  </span>
                </div>
              );
            })}
            {(!vendedoresMetas || vendedoresMetas.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma meta definida</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Charts - 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart - Sales Evolution (60%) */}
        <Card className="lg:col-span-8 relative overflow-hidden border border-border bg-card shadow-sm rounded-xl">
          {/* Subtle corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />

          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  Evolução de Vendas
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1 ml-8">Últimos 15 dias • Faturamento em blocos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <PixelRevenueTrendChart data={vendasEvolution || []} height={300} />
          </CardContent>
        </Card>

        {/* Secondary Chart - Top Sellers / Products (40%) */}
        <Card className="lg:col-span-4 relative overflow-hidden border border-border bg-card shadow-sm rounded-xl">
          {/* Subtle corner accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl pointer-events-none" />

          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Award className="h-4 w-4 text-amber-400" />
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
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    padding: "12px 16px"
                  }}
                  formatter={(value: number) => [
                    <span className="text-emerald-400 font-semibold">{formatCurrency(value)}</span>,
                    <span className="text-muted-foreground">Faturamento</span>
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


      {/* Row 4: Pipeline Funnel — Premium Centered Design */}
      {pipelineData && pipelineData.some(s => s.count > 0) && (() => {
        const funnelStages = pipelineData.filter(s => s.id !== "closed_lost" && s.id !== "closed_won");
        const wonStage = pipelineData.find(s => s.id === "closed_won");
        const lostStage = pipelineData.find(s => s.id === "closed_lost");
        const totalDeals = pipelineData.reduce((acc, s) => acc + s.count, 0);
        const totalValue = pipelineData.reduce((acc, s) => acc + s.value, 0);
        const leadStage = pipelineData.find(s => s.id === "lead");
        const winRate = leadStage && leadStage.count > 0 && wonStage
          ? ((wonStage.count / leadStage.count) * 100) : 0;

        // Width tiers for the funnel shape (centered, decreasing)
        const widthTiers = [100, 82, 62, 44];

        return (
          <Card className="relative overflow-hidden border border-border bg-card shadow-sm rounded-xl">
            <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />

            <CardHeader className="pb-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10">
                      <Filter className="h-4 w-4 text-indigo-400" />
                    </div>
                    Funil do Pipeline
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1 ml-8">
                    {totalDeals} deals no pipeline • {formatCurrency(totalValue)} em valor total
                  </p>
                </div>
                {/* Win rate badge */}
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    winRate >= 30 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20" :
                    winRate >= 15 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20" :
                    "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20"
                  }`}>
                    {winRate.toFixed(1)}% Win Rate
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 relative pb-5">
              {/* Funnel visualization */}
              <div className="flex flex-col items-center gap-0">
                {funnelStages.map((stage, i) => {
                  const width = widthTiers[i] || 30;
                  const nextStage = funnelStages[i + 1];
                  const convRate = nextStage && stage.count > 0
                    ? ((nextStage.count / stage.count) * 100).toFixed(0)
                    : null;
                  const convColor = convRate
                    ? Number(convRate) >= 60 ? "text-emerald-500" : Number(convRate) >= 35 ? "text-amber-500" : "text-rose-400"
                    : "";

                  return (
                    <div key={stage.id} className="w-full flex flex-col items-center">
                      {/* Stage bar */}
                      <div
                        className="relative rounded-lg border-l-4 flex items-center justify-between px-4 py-3 transition-all duration-300 hover:scale-[1.01] cursor-default group"
                        style={{
                          width: `${width}%`,
                          borderLeftColor: stage.color,
                          backgroundColor: `${stage.color}10`,
                        }}
                      >
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${stage.color}08, ${stage.color}15)` }} />

                        <div className="relative flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                        </div>
                        <div className="relative flex items-center gap-3">
                          <span className="text-xs tabular-nums text-muted-foreground">{formatCurrencyCompact(stage.value)}</span>
                          <span className="text-sm font-bold tabular-nums text-foreground min-w-[28px] text-right">{stage.count}</span>
                        </div>
                      </div>

                      {/* Conversion connector */}
                      {convRate && (
                        <div className="flex items-center gap-1.5 py-1.5">
                          <div className="w-px h-3 bg-border" />
                          <span className={`text-[10px] font-bold ${convColor}`}>
                            ↓ {convRate}%
                          </span>
                          <div className="w-px h-3 bg-border" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Won / Lost results */}
                <div className="w-full flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/40">
                  {wonStage && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{wonStage.count} ganhos</p>
                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{formatCurrencyCompact(wonStage.value)}</p>
                      </div>
                    </div>
                  )}
                  {lostStage && lostStage.count > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20">
                      <XCircle className="h-4 w-4 text-rose-500" />
                      <div>
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{lostStage.count} perdidos</p>
                        <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70">{formatCurrencyCompact(lostStage.value)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Row 5: Ranking de Metas */}
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
