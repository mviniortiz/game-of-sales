import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Phone } from "lucide-react";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminVendasView } from "@/components/admin/AdminVendasView";
import { AdminPerformanceView } from "@/components/admin/AdminPerformanceView";
import { startOfMonth, endOfMonth } from "date-fns";

export const AdminDashboardOverview = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");

  // Buscar lista de vendedores
  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome");
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
      />

      {/* Tabs para alternar entre Vendas e Performance */}
      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="vendas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Performance de Calls
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-6">
          <AdminVendasView
            dateRange={dateRange}
            selectedVendedor={selectedVendedor}
          />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <AdminPerformanceView
            dateRange={dateRange}
            selectedVendedor={selectedVendedor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
