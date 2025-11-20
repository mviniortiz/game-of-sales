import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboardOverview } from "@/components/dashboard/AdminDashboardOverview";
import { StatCard } from "@/components/dashboard/StatCard";
import { VendasPorProdutoChart } from "@/components/dashboard/VendasPorProdutoChart";
import { VendasPorPlataformaChart } from "@/components/dashboard/VendasPorPlataformaChart";
import { DollarSign, TrendingUp, ShoppingCart, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonStatCard, SkeletonChart } from "@/components/ui/skeleton-card";

const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  // Se for admin, mostrar dashboard administrativo
  if (isAdmin) {
    return <AdminDashboardOverview />;
  }

  const { data: vendas, isLoading: loadingVendas } = useQuery({
    queryKey: ["vendas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("user_id", user?.id)
        .gte("data_venda", new Date(new Date().setDate(1)).toISOString().split("T")[0]);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: vendasPorProduto, isLoading: loadingProdutos } = useQuery<Array<{ produto: string; quantidade: number; total: number }>>({
    queryKey: ["vendas-por-produto", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().setDate(1)).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("vendas")
        .select("produto_nome, valor")
        .eq("user_id", user?.id)
        .gte("data_venda", startOfMonth);
      
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
      
      return Object.values(agregado).sort((a: any, b: any) => b.total - a.total).slice(0, 6) as Array<{ produto: string; quantidade: number; total: number }>;
    },
    enabled: !!user?.id,
  });

  const { data: vendasPorPlataforma, isLoading: loadingPlataformas } = useQuery<Array<{ plataforma: string; quantidade: number; total: number }>>({
    queryKey: ["vendas-por-plataforma", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().setDate(1)).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("vendas")
        .select("plataforma, valor")
        .eq("user_id", user?.id)
        .gte("data_venda", startOfMonth);
      
      if (error) throw error;
      
      const agregado = data.reduce((acc: any, venda) => {
        const plat = venda.plataforma || "Não informado";
        if (!acc[plat]) {
          acc[plat] = { plataforma: plat, quantidade: 0, total: 0 };
        }
        acc[plat].quantidade += 1;
        acc[plat].total += Number(venda.valor);
        return acc;
      }, {});
      
      return Object.values(agregado).sort((a: any, b: any) => b.total - a.total) as Array<{ plataforma: string; quantidade: number; total: number }>;
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

  const totalVendas = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
  const ticketMedio = vendas?.length ? totalVendas / vendas.length : 0;
  
  const plataformaMaisUsada = vendasPorPlataforma?.[0];
  const totalVendasMes = vendas?.length || 0;
  const percentualPlataforma = plataformaMaisUsada && totalVendasMes > 0 
    ? ((plataformaMaisUsada.quantidade / totalVendasMes) * 100).toFixed(1)
    : "0";

  const isLoading = loadingVendas || loadingProdutos || loadingPlataformas;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo de volta, {profile?.nome || "Vendedor"}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Vendas"
          value={`R$ ${totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={18.4}
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Ticket Médio"
          value={`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          change={5.2}
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="Total de Transações"
          value={vendas?.length?.toString() || "0"}
          change={12.3}
          trend="up"
          icon={ShoppingCart}
        />
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plataforma Mais Usada</p>
              <p className="text-2xl font-bold">{plataformaMaisUsada?.plataforma || "—"}</p>
              {plataformaMaisUsada && (
                <p className="text-xs text-muted-foreground mt-1">
                  {plataformaMaisUsada.quantidade} vendas ({percentualPlataforma}%)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vendasPorProduto && vendasPorProduto.length > 0 && (
          <VendasPorProdutoChart data={vendasPorProduto} />
        )}
        
        {vendasPorPlataforma && vendasPorPlataforma.length > 0 && (
          <VendasPorPlataformaChart data={vendasPorPlataforma} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
