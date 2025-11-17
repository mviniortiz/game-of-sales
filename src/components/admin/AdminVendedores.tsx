import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const AdminVendedores = () => {
  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["admin-vendedores"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          vendas:vendas(id, valor)
        `);

      if (error) throw error;

      return profiles?.map((profile) => {
        const vendasMes = profile.vendas?.filter((v: any) => {
          const dataVenda = new Date(v.data_venda || v.created_at);
          return dataVenda >= startOfMonth;
        }) || [];

        const faturamentoMes = vendasMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);

        return {
          ...profile,
          totalVendasMes: vendasMes.length,
          faturamentoMes,
        };
      }) || [];
    },
  });

  if (isLoading) {
    return <div>Carregando vendedores...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Todos os Vendedores</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Vendas (Mês)</TableHead>
              <TableHead>Faturamento (Mês)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendedores?.map((vendedor) => (
              <TableRow key={vendedor.id}>
                <TableCell className="font-medium">{vendedor.nome}</TableCell>
                <TableCell>{vendedor.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{vendedor.nivel}</Badge>
                </TableCell>
                <TableCell>{vendedor.pontos.toLocaleString("pt-BR")}</TableCell>
                <TableCell>{vendedor.totalVendasMes}</TableCell>
                <TableCell>
                  R$ {vendedor.faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
