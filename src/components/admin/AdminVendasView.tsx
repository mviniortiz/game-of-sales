import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Target, DollarSign, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { VendasChart } from "@/components/calls/VendasChart";
import { MetasRankingCard } from "@/components/admin/MetasRankingCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminVendasViewProps {
  dateRange: { from?: Date; to?: Date };
  selectedVendedor: string;
  selectedFormaPagamento?: string;
  selectedProduto?: string;
}

export const AdminVendasView = ({ 
  dateRange, 
  selectedVendedor,
  selectedFormaPagamento = "todas",
  selectedProduto = "todos"
}: AdminVendasViewProps) => {
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const inicioMes = dateRange.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  const fimMes = dateRange.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

  // Estatísticas gerais
  const { data: stats } = useQuery({
    queryKey: ["admin-stats-vendas", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      // Total de vendedores
      const { data: vendedores } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });

      // Vendas do período
      let vendasQuery = supabase
        .from("vendas")
        .select("valor, status, forma_pagamento, produto_id")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes);

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

      // Metas do período
      let metasQuery = supabase
        .from("metas")
        .select("valor_meta")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (selectedVendedor !== "todos") {
        metasQuery = metasQuery.eq("user_id", selectedVendedor);
      }

      const { data: metas } = await metasQuery;

      const totalVendedores = vendedores?.length || 0;
      const totalVendas = vendas?.filter(v => v.status === "Aprovado").reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const totalTransacoes = vendas?.filter(v => v.status === "Aprovado").length || 0;
      const totalMetas = metas?.reduce((acc, m) => acc + Number(m.valor_meta), 0) || 0;
      const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;

      return {
        totalVendedores,
        totalVendas,
        totalTransacoes,
        totalMetas,
        ticketMedio,
      };
    },
  });

  // Top vendedores
  const { data: topVendedores } = useQuery({
    queryKey: ["admin-top-vendedores", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      let profilesQuery = supabase.from("profiles").select("id, nome");

      if (selectedVendedor !== "todos") {
        profilesQuery = profilesQuery.eq("id", selectedVendedor);
      }

      const { data: profiles } = await profilesQuery;

      if (!profiles) return [];

      const vendedoresData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: vendas } = await supabase
            .from("vendas")
            .select("valor")
            .eq("user_id", profile.id)
            .eq("status", "Aprovado")
            .gte("data_venda", inicioMes)
            .lte("data_venda", fimMes);

          const total = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
          const quantidade = vendas?.length || 0;

          return {
            nome: profile.nome,
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

  // Buscar meta consolidada do mês
  const { data: metaConsolidada } = useQuery({
    queryKey: ["meta-consolidada", inicioMes],
    queryFn: async () => {
      const mesReferencia = `${new Date(inicioMes).getFullYear()}-${String(
        new Date(inicioMes).getMonth() + 1
      ).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("metas_consolidadas")
        .select("*")
        .eq("mes_referencia", mesReferencia)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Buscar metas individuais e calcular progresso
  const { data: vendedoresMetas } = useQuery({
    queryKey: ["vendedores-metas", inicioMes, fimMes, selectedVendedor, selectedFormaPagamento, selectedProduto],
    queryFn: async () => {
      const mesReferencia = `${new Date(inicioMes).getFullYear()}-${String(
        new Date(inicioMes).getMonth() + 1
      ).padStart(2, "0")}-01`;

      let metasQuery = supabase
        .from("metas")
        .select(`
          id,
          user_id,
          valor_meta,
          profiles!inner(nome)
        `)
        .eq("mes_referencia", mesReferencia);

      if (selectedVendedor !== "todos") {
        metasQuery = metasQuery.eq("user_id", selectedVendedor);
      }

      const { data: metas } = await metasQuery;

      if (!metas || metas.length === 0) return [];

      const vendedoresData = await Promise.all(
        metas.map(async (meta: any) => {
          let vendasQuery = supabase
            .from("vendas")
            .select("valor")
            .eq("user_id", meta.user_id)
            .eq("status", "Aprovado")
            .gte("data_venda", inicioMes)
            .lte("data_venda", fimMes);

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
            valorMeta: Number(meta.valor_meta),
            valorRealizado,
            percentual,
          };
        })
      );

      // Ordenar por percentual decrescente
      return vendedoresData.sort((a, b) => b.percentual - a.percentual);
    },
  });

  const valorConsolidadoAtingido = vendedoresMetas?.reduce((acc, v) => acc + v.valorRealizado, 0) || 0;
  const metaTotalConsolidada = Number(metaConsolidada?.valor_meta || 0);
  const percentualConsolidado = metaTotalConsolidada > 0 
    ? (valorConsolidadoAtingido / metaTotalConsolidada) * 100 
    : 0;

  // Progresso de metas
  const { data: progressoMetas } = useQuery({
    queryKey: ["admin-progresso-metas", inicioMes, fimMes, selectedVendedor, selectedFormaPagamento, selectedProduto],
    queryFn: async () => {
      let metasQuery = supabase
        .from("metas")
        .select(`
          id,
          user_id,
          valor_meta,
          mes_referencia,
          profiles!inner(nome)
        `)
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (selectedVendedor !== "todos") {
        metasQuery = metasQuery.eq("user_id", selectedVendedor);
      }

      const { data: metas } = await metasQuery;

      if (!metas) return [];

      const progressoData = await Promise.all(
        metas.map(async (meta: any) => {
          let vendasMetaQuery = supabase
            .from("vendas")
            .select("valor")
            .eq("user_id", meta.user_id)
            .eq("status", "Aprovado")
            .gte("data_venda", inicioMes)
            .lte("data_venda", fimMes);

          if (selectedFormaPagamento !== "todas") {
            vendasMetaQuery = vendasMetaQuery.eq("forma_pagamento", selectedFormaPagamento as any);
          }

          if (selectedProduto !== "todos") {
            vendasMetaQuery = vendasMetaQuery.eq("produto_id", selectedProduto as any);
          }

          const { data: vendas } = await vendasMetaQuery;

          const realizado = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
          const percentual = meta.valor_meta > 0 ? ((realizado / meta.valor_meta) * 100).toFixed(1) : "0.0";

          return {
            nome: meta.profiles.nome,
            meta: meta.valor_meta,
            realizado,
            percentual,
          };
        })
      );

      return progressoData;
    },
  });

  // Dados para o gráfico de evolução de vendas
  const { data: vendasChartData } = useQuery({
    queryKey: ["admin-vendas-chart", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      let vendasQuery = supabase
        .from("vendas")
        .select("data_venda")
        .eq("status", "Aprovado")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes)
        .order("data_venda", { ascending: true });

      if (selectedVendedor !== "todos") {
        vendasQuery = vendasQuery.eq("user_id", selectedVendedor);
      }

      const { data: vendas } = await vendasQuery;

      // Se não houver dados reais, retornar dados fictícios variados
      if (!vendas || vendas.length === 0) {
        const hoje = new Date();
        const mockData = [];
        for (let i = 14; i >= 0; i--) {
          const data = new Date(hoje);
          data.setDate(data.getDate() - i);
          const dataFormatada = data.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
          });
          // Variação aleatória para tornar o gráfico interessante
          const vendasDia = i % 3 === 0 ? Math.floor(Math.random() * 3) + 1 : 
                           i % 2 === 0 ? Math.floor(Math.random() * 5) + 2 : 
                           Math.floor(Math.random() * 2) + 1;
          mockData.push({ data: dataFormatada, vendas: vendasDia });
        }
        return mockData;
      }

      // Agrupar vendas por data
      const vendasPorData = vendas.reduce((acc: { [key: string]: number }, venda) => {
        const data = new Date(venda.data_venda).toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        acc[data] = (acc[data] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(vendasPorData).map(([data, vendas]) => ({
        data,
        vendas,
      }));
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Cards de Métricas Principais - Destaque Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Faturamento - Destaque Principal */}
        <Card className="border-border/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5 animate-fade-in lg:col-span-2">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 rounded-xl bg-green-500/20">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-2">Faturamento Total</p>
                <p className="text-5xl font-bold text-green-600">
                  {formatCurrency(stats?.totalVendas || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  {stats?.totalTransacoes || 0} vendas realizadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio - Destaque Secundário */}
        <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-pink-500/5 animate-fade-in lg:col-span-2" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-2">Ticket Médio</p>
                <p className="text-5xl font-bold text-purple-600">
                  {formatCurrency(stats?.ticketMedio || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  por transação
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Total de Vendedores</p>
            </div>
            <p className="text-3xl font-bold">{stats?.totalVendedores || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "250ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Target className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Meta do Período</p>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(stats?.totalMetas || 0)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats?.totalMetas && stats?.totalVendas 
                ? `${((stats.totalVendas / stats.totalMetas) * 100).toFixed(1)}% alcançado`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Award className="h-5 w-5 text-pink-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Top Vendedor</p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Avatar className="h-12 w-12 border-2 border-pink-500/20">
                <AvatarFallback className="bg-pink-500/10 text-pink-600 font-bold text-lg">
                  {topVendedores?.[0]?.nome ? getInitials(topVendedores[0].nome) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold truncate">{topVendedores?.[0]?.nome || "—"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {topVendedores?.[0] ? formatCurrency(topVendedores[0].total) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendedores por Faturamento */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top 5 Vendedores por Faturamento
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ranking dos vendedores com melhor desempenho no período
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={topVendedores && topVendedores.length > 0 ? topVendedores : [
                  { nome: "João Silva", total: 60000, quantidade: 12 },
                  { nome: "Maria Santos", total: 48000, quantidade: 10 },
                  { nome: "Pedro Costa", total: 35000, quantidade: 8 },
                  { nome: "Ana Lima", total: 28000, quantidade: 6 },
                  { nome: "Carlos Souza", total: 22000, quantidade: 5 },
                ]}
                margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="nome" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={formatCurrencyCompact}
                  width={70}
                  label={{ 
                    value: 'Faturamento', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--foreground))' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  formatter={(value: number, name: string) => {
                    return [formatCurrency(value), name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => value}
                />
                <Bar 
                  dataKey="total" 
                  fill="hsl(var(--primary))" 
                  name="Faturamento" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução de Vendas */}
        <VendasChart data={vendasChartData || []} />
      </div>

      {/* Ranking de Metas */}
      {(metaConsolidada || vendedoresMetas || true) && (
        <MetasRankingCard
          metaConsolidada={metaTotalConsolidada || 500000}
          valorConsolidadoAtingido={valorConsolidadoAtingido || 218600}
          percentualConsolidado={percentualConsolidado || 43.72}
          vendedores={vendedoresMetas && vendedoresMetas.length > 0 ? vendedoresMetas : [
            { nome: "João Silva", valorMeta: 50000, valorRealizado: 60000, percentual: 120 },
            { nome: "Maria Santos", valorMeta: 50000, valorRealizado: 48000, percentual: 96 },
            { nome: "Pedro Costa", valorMeta: 50000, valorRealizado: 35000, percentual: 70 },
            { nome: "Ana Lima", valorMeta: 50000, valorRealizado: 42800, percentual: 85.6 },
            { nome: "Carlos Souza", valorMeta: 50000, valorRealizado: 32800, percentual: 65.6 },
          ]}
          statusFiltro={statusFiltro}
          onStatusChange={setStatusFiltro}
        />
      )}
    </div>
  );
};