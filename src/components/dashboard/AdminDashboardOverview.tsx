import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminVendasView } from "@/components/admin/AdminVendasView";
import { startOfMonth, endOfMonth } from "date-fns";

export const AdminDashboardOverview = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState("todas");
  const [selectedProduto, setSelectedProduto] = useState("todos");

  // Buscar lista de vendedores
  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome");
      return data || [];
    },
  });

  // Buscar lista de produtos
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-list"],
    queryFn: async () => {
      const { data } = await supabase.from("produtos").select("id, nome").eq("ativo", true);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Visão Geral - Admin</h1>
        <p className="text-muted-foreground">Dashboard consolidado de toda a equipe</p>
      </div>

      {/* Filtros Globais */}
      <AdminFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedVendedor={selectedVendedor}
        setSelectedVendedor={setSelectedVendedor}
        vendedores={vendedores}
        selectedFormaPagamento={selectedFormaPagamento}
        setSelectedFormaPagamento={setSelectedFormaPagamento}
        selectedProduto={selectedProduto}
        setSelectedProduto={setSelectedProduto}
        produtos={produtos}
      />

      {/* Visualização de Vendas */}
      <AdminVendasView
        dateRange={dateRange}
        selectedVendedor={selectedVendedor}
        selectedFormaPagamento={selectedFormaPagamento}
        selectedProduto={selectedProduto}
        vendedores={vendedores}
        produtos={produtos}
      />
    </div>
  );
};
