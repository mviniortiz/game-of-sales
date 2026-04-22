import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PixelRevenueTrendChart } from "@/components/dashboard/PixelRevenueTrendChart";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Filter,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Receipt
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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

// No separate KPICard component needed — inlined in render for maximum control

export const AdminVendasView = ({
  dateRange,
  selectedVendedor,
  selectedFormaPagamento = "todas",
  selectedProduto = "todos",
  vendedores = [],
  produtos = []
}: AdminVendasViewProps) => {
  const [statusFiltro, setStatusFiltro] = useState("todos");
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

      if (!profiles || profiles.length === 0) return [];

      // Antes: 1 query por vendedor (N+1 — 50 vendedores = 50 queries paralelas,
      // Supabase throttle/timeout). Agora: 1 query única com in(user_id) e
      // agregação client-side.
      const profileIds = profiles.map((p) => p.id);
      const { data: vendas } = await applyCompanyFilter(
        supabase
          .from("vendas")
          .select("valor, user_id")
          .in("user_id", profileIds)
          .eq("status", "Aprovado")
          .gte("data_venda", inicioMes)
          .lte("data_venda", fimMes)
      );

      const totals = new Map<string, { total: number; quantidade: number }>();
      for (const v of vendas || []) {
        const current = totals.get(v.user_id) || { total: 0, quantidade: 0 };
        totals.set(v.user_id, {
          total: current.total + Number(v.valor),
          quantidade: current.quantidade + 1,
        });
      }

      return profiles
        .map((profile) => {
          const agg = totals.get(profile.id) || { total: 0, quantidade: 0 };
          return {
            nome: profile.nome,
            avatar_url: profile.avatar_url,
            total: agg.total,
            quantidade: agg.quantidade,
          };
        })
        .filter((v) => v.total > 0)
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
    { id: "closed_won", label: "Fechado (Ganho)", color: "#00E37A", bgColor: "bg-emerald-100 dark:bg-emerald-500/10" },
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
    <div className="space-y-5">

      {/* ── Row 1: KPI Strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Faturamento */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5 cursor-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground">Faturamento</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none">
                {formatCurrencyCompact(stats?.totalVendas || 0)}
              </p>
              <div className="mt-3">
                <svg className="w-full h-8" viewBox="0 0 120 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E37A" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#00E37A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const d = (vendasEvolution || []).slice(-12);
                    if (d.length < 2) return null;
                    const max = Math.max(...d.map(v => v.valor), 1);
                    const pts = d.map((v, i) => `${(i / (d.length - 1)) * 120},${22 - (v.valor / max) * 20}`).join(" L");
                    return (
                      <>
                        <path d={`M${pts} L120,24 L0,24 Z`} fill="url(#kpiSparkFill)" />
                        <path d={`M${pts}`} fill="none" stroke="#00E37A" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-xs">{formatCurrency(stats?.totalVendas || 0)}</TooltipContent>
        </UITooltip>

        {/* Vendas */}
        <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5 cursor-default">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-muted-foreground">Vendas</span>
            <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none">
            {stats?.totalTransacoes || 0}
          </p>
          <div className="mt-3 flex items-end gap-[2px] h-8">
            {(() => {
              const d = (vendasEvolution || []).slice(-14);
              const max = Math.max(...d.map(v => v.valor), 1);
              return d.map((v, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-blue-500/40 dark:bg-blue-400/35 min-h-[2px]"
                  style={{ height: `${Math.max((v.valor / max) * 100, 6)}%` }} />
              ));
            })()}
          </div>
        </div>

        {/* Ticket Médio */}
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5 cursor-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground">Ticket Médio</span>
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none">
                {formatCurrencyCompact(stats?.ticketMedio || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-3">
                {stats?.totalVendedores || 0} vendedores ativos
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-xs">{formatCurrency(stats?.ticketMedio || 0)}</TooltipContent>
        </UITooltip>

        {/* Meta */}
        <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5 cursor-default">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-muted-foreground">Meta</span>
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15" fill="none"
                  className={percentualConsolidado >= 70 ? "stroke-emerald-500" : percentualConsolidado >= 30 ? "stroke-amber-500" : "stroke-rose-400"}
                  strokeWidth="2.5" strokeLinecap="round" strokeDasharray="94.25"
                  strokeDashoffset={94.25 - (94.25 * Math.min(percentualConsolidado, 100)) / 100}
                  style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold tabular-nums text-foreground">{percentualConsolidado.toFixed(0)}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrencyCompact(valorConsolidadoAtingido)}</p>
              <p className="text-[10px] text-muted-foreground">de {formatCurrencyCompact(metaTotalConsolidada)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Evolução + Pipeline Funnel ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Revenue chart (65%) */}
        <Card className="lg:col-span-7 border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">Evolução de Vendas</p>
              <span className="text-[10px] text-muted-foreground">Últimos 15 dias</span>
            </div>
            <PixelRevenueTrendChart data={vendasEvolution || []} height={280} />
          </CardContent>
        </Card>

        {/* Pipeline Funnel (35%) */}
        <Card className="lg:col-span-5 border-border bg-card">
          <CardContent className="p-5">
            {pipelineData && pipelineData.some(s => s.count > 0) ? (() => {
              const funnelStages = pipelineData.filter(s => s.id !== "closed_lost" && s.id !== "closed_won");
              const wonStage = pipelineData.find(s => s.id === "closed_won");
              const lostStage = pipelineData.find(s => s.id === "closed_lost");
              const leadStage = pipelineData.find(s => s.id === "lead");
              const totalDeals = pipelineData.reduce((a, s) => a + s.count, 0);
              const winRate = leadStage && leadStage.count > 0 && wonStage ? ((wonStage.count / leadStage.count) * 100) : 0;
              const widthTiers = [100, 80, 60, 42];

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-foreground">Pipeline</p>
                    <span className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md ${
                      winRate >= 30 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      winRate >= 15 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {winRate.toFixed(0)}% win rate
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    {funnelStages.map((stage, i) => {
                      const w = widthTiers[i] || 30;
                      const next = funnelStages[i + 1];
                      const conv = next && stage.count > 0 ? ((next.count / stage.count) * 100).toFixed(0) : null;
                      return (
                        <div key={stage.id} className="w-full flex flex-col items-center">
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-md border-l-[3px] transition-colors hover:bg-accent/5"
                            style={{ width: `${w}%`, borderLeftColor: stage.color, backgroundColor: `${stage.color}08` }}>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                              <span className="text-[11px] font-medium text-foreground">{stage.label}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] tabular-nums text-muted-foreground">{formatCurrencyCompact(stage.value)}</span>
                              <span className="text-xs font-semibold tabular-nums text-foreground">{stage.count}</span>
                            </div>
                          </div>
                          {conv && (
                            <div className="flex items-center gap-1 py-1">
                              <div className="w-px h-2 bg-border" />
                              <span className={`text-[9px] font-semibold tabular-nums ${
                                Number(conv) >= 60 ? "text-emerald-500" : Number(conv) >= 35 ? "text-amber-500" : "text-rose-400"
                              }`}>↓ {conv}%</span>
                              <div className="w-px h-2 bg-border" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Won / Lost summary */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      {wonStage && wonStage.count > 0 && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[11px] font-semibold text-foreground tabular-nums">{wonStage.count}</span>
                          <span className="text-[10px] text-muted-foreground">ganhos</span>
                        </div>
                      )}
                      {lostStage && lostStage.count > 0 && (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5 text-rose-400" />
                          <span className="text-[11px] font-semibold text-foreground tabular-nums">{lostStage.count}</span>
                          <span className="text-[10px] text-muted-foreground">perdidos</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{totalDeals} total</span>
                  </div>
                </>
              );
            })() : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Filter className="h-5 w-5 mb-2 opacity-40" />
                <p className="text-xs">Nenhum deal no pipeline</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Top Vendedores + Top Produtos ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Vendedores */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Top Vendedores</p>
            <div className="space-y-3">
              {(topVendedores || []).length > 0 ? (topVendedores || []).map((seller, i) => {
                const maxVal = Math.max(...(topVendedores || []).map(s => s.total), 1);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-muted-foreground w-4 text-right tabular-nums">{i + 1}</span>
                    {seller.avatar_url ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={seller.avatar_url} />
                        <AvatarFallback className="text-[9px] bg-muted">{getInitials(seller.nome)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold text-muted-foreground">{getInitials(seller.nome)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-medium text-foreground truncate">{seller.nome}</p>
                        <span className="text-[11px] font-semibold tabular-nums text-foreground ml-2 shrink-0">{formatCurrencyCompact(seller.total)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1">
                        <div className="h-1 bg-emerald-500/50 rounded-full transition-all duration-700"
                          style={{ width: `${(seller.total / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-muted-foreground text-center py-6">Sem vendas no período</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Produtos */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Top Produtos</p>
            {(topProdutos || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={(topProdutos || []).slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  barSize={18}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false}
                    fontSize={11} width={100} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                  />
                  <defs>
                    <linearGradient id="prodBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#00E37A" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="total" fill="url(#prodBarGrad)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">Sem vendas no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Ranking de Metas ──────────────────────────────── */}
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
