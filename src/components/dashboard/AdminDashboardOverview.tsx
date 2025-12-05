import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminVendasView } from "@/components/admin/AdminVendasView";
import { startOfMonth, endOfMonth } from "date-fns";
import { useVisibleSellers } from "@/hooks/useVisibleSellers";
import { useTenant } from "@/contexts/TenantContext";

export const AdminDashboardOverview = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState("todas");
  const [selectedProduto, setSelectedProduto] = useState("todos");
  const { activeCompanyId } = useTenant();

  // Buscar lista de vendedores (respeitando permissões - exclui Super Admins)
  const { data: vendedores = [] } = useVisibleSellers({ includeAvatars: false });

  // Buscar lista de produtos filtrados pela empresa ativa
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-list", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, company_id")
        .eq("ativo", true)
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
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
        activeCompanyId={activeCompanyId}
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
