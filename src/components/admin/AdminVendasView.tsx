import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Target, DollarSign, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AdminVendasViewProps {
  dateRange: { from?: Date; to?: Date };
  selectedVendedor: string;
}

export const AdminVendasView = ({ dateRange, selectedVendedor }: AdminVendasViewProps) => {
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
        .select("valor, status")
        .gte("data_venda", inicioMes)
        .lte("data_venda", fimMes);

      if (selectedVendedor !== "todos") {
        vendasQuery = vendasQuery.eq("user_id", selectedVendedor);
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

  // Progresso de metas
  const { data: progressoMetas } = useQuery({
    queryKey: ["admin-progresso-metas", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      let metasQuery = supabase
        .from("metas")
        .select("user_id, valor_meta, profiles!inner(nome)")
        .gte("mes_referencia", inicioMes)
        .lte("mes_referencia", fimMes);

      if (selectedVendedor !== "todos") {
        metasQuery = metasQuery.eq("user_id", selectedVendedor);
      }

      const { data: metas } = await metasQuery;

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
      {/* Cards de estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "0ms" }}>
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

        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Faturamento</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.totalVendas || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalTransacoes || 0} transações
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "200ms" }}>
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

        <Card className="border-border/50 bg-card/50 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Target className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Meta Total</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.totalMetas || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalMetas && stats?.totalVendas 
                  ? `${((stats.totalVendas / stats.totalMetas) * 100).toFixed(1)}% atingido`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 lg:col-span-2 animate-fade-in" style={{ animationDelay: "400ms" }}>
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
              Top 5 Vendedores
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

        {/* Progresso de Metas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Progresso de Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressoMetas?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma meta definida para o período
                </div>
              ) : (
                progressoMetas?.map((meta, index) => {
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
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
