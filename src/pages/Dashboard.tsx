import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, ShoppingCart, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useAuth();

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

  return (
    <div className="space-y-6">
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
        <StatCard
          title="Nível Atual"
          value={profile?.nivel || "Bronze"}
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Suas Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {vendas && vendas.length > 0 ? (
              <div className="space-y-4">
                {vendas.slice(0, 5).map((venda) => (
                  <div key={venda.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{venda.cliente_nome}</p>
                      <p className="text-sm text-muted-foreground">{venda.produto_nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {Number(venda.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">{new Date(venda.data_venda).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma venda registrada este mês</p>
                <p className="text-sm mt-2">Comece registrando sua primeira venda!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Seu Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Nível: {profile?.nivel || "Bronze"}</span>
                  <span className="text-sm text-muted-foreground">{profile?.pontos || 0} pontos</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${Math.min(((profile?.pontos || 0) % 2000) / 20, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {2000 - ((profile?.pontos || 0) % 2000)} pontos para o próximo nível
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Conquistas Recentes</h4>
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Continue vendendo para desbloquear conquistas!</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
