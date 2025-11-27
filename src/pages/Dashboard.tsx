import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboardOverview } from "@/components/dashboard/AdminDashboardOverview";
import { StatCard } from "@/components/dashboard/StatCard";
import { VendasPorProdutoChart } from "@/components/dashboard/VendasPorProdutoChart";
import { VendasPorPlataformaChart } from "@/components/dashboard/VendasPorPlataformaChart";
import { DollarSign, TrendingUp, ShoppingCart, Target, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  // Se for admin, mostrar dashboard administrativo
  if (isAdmin) {
    return <AdminDashboardOverview />;
  }

  const { data: vendas } = useQuery({
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

  const { data: vendasPorProduto } = useQuery<Array<{ produto: string; quantidade: number; total: number }>>({
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

  const { data: vendasPorPlataforma } = useQuery<Array<{ plataforma: string; quantidade: number; total: number }>>({
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

  // Show Rate KPI - Calls with 'show' attendance
  const { data: showRateData } = useQuery({
    queryKey: ["show-rate", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().setDate(1)).toISOString().split("T")[0];
      
      const { data: calls, error } = await supabase
        .from("calls")
        .select("id, attendance_status")
        .eq("user_id", user?.id)
        .gte("data_call", startOfMonth);
      
      if (error) throw error;
      
      const totalCalls = calls?.length || 0;
      const showCalls = calls?.filter((c: any) => c.attendance_status === 'show').length || 0;
      const showRate = totalCalls > 0 ? (showCalls / totalCalls) * 100 : 0;
      
      return { totalCalls, showCalls, showRate };
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo de volta, {profile?.nome || "Vendedor"}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" data-tour="dashboard-stats">
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
        {/* Show Rate KPI */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-amber-500/30 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <UserCheck className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Taxa de Comparecimento</p>
              <p className="text-2xl font-bold">{(showRateData?.showRate || 0).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {showRateData?.showCalls || 0} de {showRateData?.totalCalls || 0} calls
              </p>
            </div>
          </CardContent>
        </Card>
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
