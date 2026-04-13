import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  CalendarIcon,
  Crown,
  Trophy,
  Medal,
  Package,
} from "lucide-react";
import { EvolucaoVendasChart } from "./charts/EvolucaoVendasChart";
import { DistribuicaoProdutosChart } from "./charts/DistribuicaoProdutosChart";
import { ComparativoVendedoresChart } from "./charts/ComparativoVendedoresChart";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";

export const AdminRelatorios = () => {
  const { activeCompanyId } = useTenant();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
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

      // Previous period for trend
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
      const vendedoresMap = new Map<string, { id: string; nome: string; avatarUrl?: string; total: number; vendas: number }>();
      vendas?.forEach((venda) => {
        const key = venda.profiles?.nome || "Desconhecido";
        const current = vendedoresMap.get(key) || {
          id: venda.profiles?.id || "",
          nome: key,
          avatarUrl: venda.profiles?.avatar_url,
          total: 0,
          vendas: 0,
        };
        current.total += Number(venda.valor);
        current.vendas += 1;
        vendedoresMap.set(key, current);
      });
      const topVendedores = Array.from(vendedoresMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Top 3 produtos
      const produtosMap = new Map<string, { nome: string; total: number; vendas: number }>();
      vendas?.forEach((venda) => {
        const key = venda.produto_nome;
        const current = produtosMap.get(key) || { nome: key, total: 0, vendas: 0 };
        current.total += Number(venda.valor);
        current.vendas += 1;
        produtosMap.set(key, current);
      });
      const topProdutos = Array.from(produtosMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Top plataforma
      const plataformasMap = new Map<string, number>();
      vendas?.forEach((venda) => {
        const p = venda.plataforma || "Manual";
        plataformasMap.set(p, (plataformasMap.get(p) || 0) + 1);
      });
      const topPlataforma = Array.from(plataformasMap.entries()).sort((a, b) => b[1] - a[1])[0];

      return {
        totalVendas,
        faturamentoTotal,
        ticketMedio,
        topVendedores,
        topProdutos,
        topPlataforma: topPlataforma ? { nome: topPlataforma[0], vendas: topPlataforma[1] } : null,
        trendVendas,
        trendFaturamento,
      };
    },
    enabled: !!activeCompanyId,
  });

  // Chart queries
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
        const monthName = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
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

      const map = new Map<string, { valor: number; vendas: number }>();
      vendas?.forEach((v) => {
        const current = map.get(v.produto_nome) || { valor: 0, vendas: 0 };
        current.valor += Number(v.valor);
        current.vendas += 1;
        map.set(v.produto_nome, current);
      });
      return Array.from(map.entries()).map(([nome, data]) => ({ nome, valor: data.valor, vendas: data.vendas }));
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

      const map = new Map<string, { vendas: number; faturamento: number }>();
      vendas?.forEach((v) => {
        const nome = v.profiles?.nome || "Desconhecido";
        const current = map.get(nome) || { vendas: 0, faturamento: 0 };
        current.vendas += 1;
        current.faturamento += Number(v.valor);
        map.set(nome, current);
      });
      return Array.from(map.entries())
        .map(([nome, data]) => ({
          nome: nome.length > 15 ? nome.substring(0, 15) + "..." : nome,
          vendas: data.vendas,
          faturamento: data.faturamento,
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 10);
    },
    enabled: !!activeCompanyId,
  });

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getRankIcon = (r: number) => {
    if (r === 1) return <Crown className="h-3.5 w-3.5 text-amber-400" />;
    if (r === 2) return <Medal className="h-3.5 w-3.5 text-gray-400" />;
    if (r === 3) return <Trophy className="h-3.5 w-3.5 text-amber-600" />;
    return null;
  };

  const maxVendedor = stats?.topVendedores?.[0]?.total || 1;
  const maxProduto = stats?.topProdutos?.[0]?.total || 1;

  const TrendBadge = ({ value }: { value?: number }) => {
    if (value === undefined || value === 0) return null;
    const positive = value >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : ""}{value.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Relatórios</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(dateRange.from, "dd MMM", { locale: ptBR })} — {format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-border/50 text-muted-foreground hover:text-foreground shrink-0">
              <CalendarIcon className="h-3.5 w-3.5" />
              Período
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                else if (range?.from) setDateRange({ from: range.from, to: range.from });
              }}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Vendas</p>
            <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{stats?.totalVendas || 0}</p>
            <TrendBadge value={stats?.trendVendas} />
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Faturamento</p>
            <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{formatCurrency(stats?.faturamentoTotal || 0)}</p>
            <TrendBadge value={stats?.trendFaturamento} />
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ticket Médio</p>
            <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{formatCurrency(stats?.ticketMedio || 0)}</p>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Top Plataforma</p>
            <p className="text-2xl font-bold text-foreground mt-1 truncate">{stats?.topPlataforma?.nome || "—"}</p>
            <span className="text-xs text-muted-foreground">{stats?.topPlataforma?.vendas || 0} vendas</span>
          </div>
        </div>
      )}

      {/* Charts */}
      {evolucaoData && evolucaoData.length > 0 && (
        <EvolucaoVendasChart data={evolucaoData} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {produtosData && produtosData.length > 0 && (
          <DistribuicaoProdutosChart data={produtosData} />
        )}
        {vendedoresData && vendedoresData.length > 0 && (
          <ComparativoVendedoresChart data={vendedoresData} />
        )}
      </div>

      {/* Top Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Vendedores */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Top Vendedores</h4>
          {stats?.topVendedores && stats.topVendedores.length > 0 ? (
            <div className="space-y-3">
              {stats.topVendedores.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={v.avatarUrl || ""} />
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                        {getInitials(v.nome)}
                      </AvatarFallback>
                    </Avatar>
                    {getRankIcon(i + 1) && (
                      <div className="absolute -top-1 -right-1 bg-card rounded-full p-0.5">
                        {getRankIcon(i + 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{v.nome}</span>
                      <span className="text-sm font-bold text-foreground tabular-nums shrink-0 ml-2">{formatCurrency(v.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(v.total / maxVendedor) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{v.vendas} vendas</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período</p>
          )}
        </div>

        {/* Top Produtos */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Top Produtos</h4>
          {stats?.topProdutos && stats.topProdutos.length > 0 ? (
            <div className="space-y-3">
              {stats.topProdutos.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted shrink-0">
                    {getRankIcon(i + 1) || <Package className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{p.nome}</span>
                      <span className="text-sm font-bold text-foreground tabular-nums shrink-0 ml-2">{formatCurrency(p.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(p.total / maxProduto) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{p.vendas} vendas</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período</p>
          )}
        </div>
      </div>
    </div>
  );
};
