import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Package } from "lucide-react";

export const AdminRelatorios = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: vendas, error } = await supabase
        .from("vendas")
        .select("*, profiles:user_id(nome)")
        .gte("data_venda", startOfMonth.toISOString());

      if (error) throw error;

      const totalVendas = vendas?.length || 0;
      const faturamentoTotal = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) || 0;
      const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;

      // Top 3 vendedores
      const vendedoresMap = new Map();
      vendas?.forEach((venda) => {
        const vendedorNome = venda.profiles?.nome || "Desconhecido";
        const current = vendedoresMap.get(vendedorNome) || { nome: vendedorNome, total: 0, vendas: 0 };
        current.total += Number(venda.valor);
        current.vendas += 1;
        vendedoresMap.set(vendedorNome, current);
      });

      const topVendedores = Array.from(vendedoresMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Top 3 produtos
      const produtosMap = new Map();
      vendas?.forEach((venda) => {
        const produtoNome = venda.produto_nome;
        const current = produtosMap.get(produtoNome) || { nome: produtoNome, total: 0, vendas: 0 };
        current.total += Number(venda.valor);
        current.vendas += 1;
        produtosMap.set(produtoNome, current);
      });

      const topProdutos = Array.from(produtosMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Top plataforma
      const plataformasMap = new Map();
      vendas?.forEach((venda) => {
        const plataforma = venda.plataforma || "Não especificada";
        const current = plataformasMap.get(plataforma) || 0;
        plataformasMap.set(plataforma, current + 1);
      });

      const topPlataforma = Array.from(plataformasMap.entries())
        .sort((a, b) => b[1] - a[1])[0];

      return {
        totalVendas,
        faturamentoTotal,
        ticketMedio,
        topVendedores,
        topProdutos,
        topPlataforma: topPlataforma ? { nome: topPlataforma[0], vendas: topPlataforma[1] } : null,
      };
    },
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Relatórios Gerais</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVendas || 0}</div>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.faturamentoTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.ticketMedio || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Por venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Plataforma</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.topPlataforma?.nome || "-"}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.topPlataforma?.vendas || 0} vendas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 3 Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topVendedores?.map((vendedor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{vendedor.nome}</p>
                      <p className="text-sm text-muted-foreground">{vendedor.vendas} vendas</p>
                    </div>
                  </div>
                  <p className="font-bold">
                    R$ {vendedor.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 3 Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topProdutos?.map((produto, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{produto.nome}</p>
                      <p className="text-sm text-muted-foreground">{produto.vendas} vendas</p>
                    </div>
                  </div>
                  <p className="font-bold">
                    R$ {produto.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
