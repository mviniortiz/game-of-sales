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
    <div className="space-y-6 min-h-screen">
      {/* Header - Sales Command Center Style */}
      <div className="relative">
        {/* Subtle gradient accent */}
        <div className="absolute -top-4 -left-4 w-64 h-64 bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              Visão Geral
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider ring-1 ring-indigo-500/20">
                Live
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              <span className="text-foreground/80 font-medium">Sales Command Center</span> • Dashboard consolidado de toda a equipe
            </p>
          </div>
        </div>
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
