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
      
      // Agregar por produto
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
      
      // Agregar por plataforma
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
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {vendasPorProduto && vendasPorProduto.length > 0 ? (
              <div className="space-y-4">
                {vendasPorProduto.map((item: any, index: number) => {
                  const maxTotal = vendasPorProduto[0]?.total || 1;
                  const percentage = (item.total / maxTotal) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.produto}</span>
                        <span className="text-muted-foreground">
                          {item.quantidade}x · R$ {Number(item.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma venda registrada este mês</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Vendas por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            {vendasPorPlataforma && vendasPorPlataforma.length > 0 ? (
              <div className="space-y-4">
                {vendasPorPlataforma.map((item: any, index: number) => {
                  const cores = {
                    'Celetus': 'bg-[hsl(var(--primary))]',
                    'Cakto': 'bg-blue-500',
                    'Greenn': 'bg-green-500',
                    'Pix/Boleto': 'bg-gray-400'
                  };
                  const cor = cores[item.plataforma as keyof typeof cores] || 'bg-primary';
                  const totalGeral = vendasPorPlataforma.reduce((acc: number, p: any) => acc + p.total, 0);
                  const percentage = totalGeral > 0 ? ((item.total / totalGeral) * 100).toFixed(1) : "0";
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${cor}`} />
                        <div>
                          <p className="font-medium">{item.plataforma}</p>
                          <p className="text-xs text-muted-foreground">{item.quantidade} vendas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">R$ {Number(item.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma venda registrada este mês</p>
              </div>
            )}
          </CardContent>
        </Card>
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
