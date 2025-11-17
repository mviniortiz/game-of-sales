import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Target, Phone, DollarSign, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { startOfMonth, endOfMonth } from "date-fns";

export const AdminDashboardOverview = () => {
  // Estatísticas gerais
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      // Total de vendedores
      const { data: vendedores } = await supabase
        .from("profiles")
        .select("id", { count: "exact" });

      // Vendas do mês
      const { data: vendas } = await supabase
        .from("vendas")
        .select("valor, status")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes);

      // Calls do mês
      const { data: calls } = await supabase
        .from("calls")
        .select("resultado")
        .gte("data_call", inicioMes)
        .lte("data_call", fimMes);

      // Metas do mês
      const { data: metas } = await supabase
        .from("metas")
        .select("valor_meta")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      const totalVendedores = vendedores?.length || 0;
      const totalVendas = vendas?.filter(v => v.status === "Aprovado").reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const totalTransacoes = vendas?.filter(v => v.status === "Aprovado").length || 0;
      const totalCalls = calls?.length || 0;
      const totalMetas = metas?.reduce((acc, m) => acc + Number(m.valor_meta), 0) || 0;
      const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;

      return {
        totalVendedores,
        totalVendas,
        totalTransacoes,
        totalCalls,
        totalMetas,
        ticketMedio,
      };
    },
  });

  // Top vendedores
  const { data: topVendedores } = useQuery({
    queryKey: ["admin-top-vendedores"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome");

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

  // Calls por vendedor
  const { data: callsPorVendedor } = useQuery({
    queryKey: ["admin-calls-vendedores"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome");

      if (!profiles) return [];

      const callsData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: calls } = await supabase
            .from("calls")
            .select("resultado")
            .eq("user_id", profile.id)
            .gte("data_call", inicioMes)
            .lte("data_call", fimMes);

          const total = calls?.length || 0;
          const sucesso = calls?.filter(c => c.resultado === "venda").length || 0;

          return {
            nome: profile.nome,
            total,
            sucesso,
            taxa: total > 0 ? ((sucesso / total) * 100).toFixed(1) : "0",
          };
        })
      );

      return callsData
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  // Progresso de metas
  const { data: progressoMetas } = useQuery({
    queryKey: ["admin-progresso-metas"],
    queryFn: async () => {
      const inicioMes = startOfMonth(new Date()).toISOString().split('T')[0];
      const fimMes = endOfMonth(new Date()).toISOString().split('T')[0];

      const { data: metas } = await supabase
        .from("metas")
        .select("user_id, valor_meta, profiles!inner(nome)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (!metas) return [];

      const metasData = await Promise.all(
        metas.map(async (meta) => {
          const { data: vendas } = await supabase
            .from("vendas")
            .select("valor")
            .eq("user_id", meta.user_id)
            .eq("status", "Aprovado")
            .gte("data_venda", inicioMes)
            .lte("data_venda", fimMes);

          const realizado = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
          const percentual = (realizado / Number(meta.valor_meta)) * 100;

          return {
            nome: meta.profiles.nome,
            meta: Number(meta.valor_meta),
            realizado,
            percentual: percentual.toFixed(1),
          };
        })
      );

      return metasData.sort((a, b) => Number(b.percentual) - Number(a.percentual));
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Visão Geral - Admin</h1>
        <p className="text-muted-foreground">Dashboard consolidado de toda a equipe</p>
      </div>

      {/* Cards de estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Vendedores</p>
              <p className="text-3xl font-bold">{stats?.totalVendedores || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Faturamento do Mês</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.totalVendas || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalTransacoes || 0} transações
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.ticketMedio || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Phone className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Calls Realizadas</p>
              <p className="text-3xl font-bold">{stats?.totalCalls || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Target className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Meta Total do Mês</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.totalMetas || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalMetas && stats?.totalVendas 
                  ? `${((stats.totalVendas / stats.totalMetas) * 100).toFixed(1)}% atingido`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Award className="h-5 w-5 text-pink-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Top Vendedor</p>
              <p className="text-xl font-bold">{topVendedores?.[0]?.nome || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {topVendedores?.[0] ? formatCurrency(topVendedores[0].total) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top 5 Vendedores do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topVendedores}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="nome" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="total" fill="hsl(217, 91%, 60%)" name="Faturamento" radius={[8, 8, 0, 0]} />
                <Bar dataKey="quantidade" fill="hsl(142, 71%, 45%)" name="Quantidade" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Calls por Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Calls por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callsPorVendedor}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="nome" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={100}
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
                />
                <Legend />
                <Bar dataKey="total" fill="hsl(38, 92%, 50%)" name="Total de Calls" radius={[8, 8, 0, 0]} />
                <Bar dataKey="sucesso" fill="hsl(142, 71%, 45%)" name="Calls com Sucesso" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Progresso de Metas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progresso de Metas da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progressoMetas?.map((meta, index) => {
              const percentual = Number(meta.percentual);
              const getColor = () => {
                if (percentual >= 100) return "bg-green-500";
                if (percentual >= 80) return "bg-blue-500";
                if (percentual >= 50) return "bg-yellow-500";
                return "bg-red-500";
              };

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{meta.nome}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(meta.realizado)} / {formatCurrency(meta.meta)} ({meta.percentual}%)
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getColor()} transition-all`}
                      style={{ width: `${Math.min(percentual, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
