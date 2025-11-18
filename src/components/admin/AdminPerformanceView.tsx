import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Phone, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { CallsFunnel } from "@/components/calls/CallsFunnel";
import { PerformanceTable } from "@/components/calls/PerformanceTable";
import { CalendarioAgendamentos } from "@/components/calendar/CalendarioAgendamentos";

interface AdminPerformanceViewProps {
  dateRange: { from?: Date; to?: Date };
  selectedVendedor: string;
}

export const AdminPerformanceView = ({ dateRange, selectedVendedor }: AdminPerformanceViewProps) => {
  const inicioMes = dateRange.from?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  const fimMes = dateRange.to?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

  // Métricas de calls
  const { data: metricas } = useQuery({
    queryKey: ["admin-metricas-calls", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      let agendamentosQuery = supabase
        .from("agendamentos")
        .select("id, data_agendamento, user_id")
        .gte("data_agendamento", inicioMes)
        .lte("data_agendamento", fimMes);

      if (selectedVendedor !== "todos") {
        agendamentosQuery = agendamentosQuery.eq("user_id", selectedVendedor);
      }

      const { data: agendamentosData } = await agendamentosQuery;

      let callsQuery = supabase
        .from("calls")
        .select("id, user_id, resultado")
        .gte("data_call", inicioMes)
        .lte("data_call", fimMes);

      if (selectedVendedor !== "todos") {
        callsQuery = callsQuery.eq("user_id", selectedVendedor);
      }

      const { data: callsData } = await callsQuery;

      const agendamentos = agendamentosData?.length || 0;
      const callsRealizadas = callsData?.length || 0;
      const vendas = callsData?.filter((c) => c.resultado === "venda").length || 0;
      const taxaComparecimento = agendamentos > 0 ? (callsRealizadas / agendamentos) * 100 : 0;
      const taxaConversao = callsRealizadas > 0 ? (vendas / callsRealizadas) * 100 : 0;

      return {
        agendamentos,
        callsRealizadas,
        vendas,
        taxaComparecimento,
        taxaConversao,
      };
    },
  });

  // Performance por vendedor
  const { data: performanceData = [] } = useQuery({
    queryKey: ["admin-performance-vendedores", inicioMes, fimMes],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, nome");

      if (!profiles) return [];

      const results = await Promise.all(
        profiles.map(async (profile) => {
          const { data: agendamentos } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("user_id", profile.id)
            .gte("data_agendamento", inicioMes)
            .lte("data_agendamento", fimMes);

          const { data: calls } = await supabase
            .from("calls")
            .select("id, resultado")
            .eq("user_id", profile.id)
            .gte("data_call", inicioMes)
            .lte("data_call", fimMes);

          const totalAgendamentos = agendamentos?.length || 0;
          const totalCalls = calls?.length || 0;
          const totalVendas = calls?.filter((c) => c.resultado === "venda").length || 0;
          const taxaComparecimento = totalAgendamentos > 0 ? (totalCalls / totalAgendamentos) * 100 : 0;
          const taxaConversao = totalCalls > 0 ? (totalVendas / totalCalls) * 100 : 0;

          let status: "excelente" | "bom" | "precisa_melhorar" = "precisa_melhorar";
          if (taxaConversao >= 20) status = "excelente";
          else if (taxaConversao >= 15) status = "bom";

          return {
            vendedor: profile.nome,
            agendamentos: totalAgendamentos,
            calls: totalCalls,
            taxaComparecimento,
            vendas: totalVendas,
            taxaConversao,
            status,
          };
        })
      );

      return results.sort((a, b) => b.taxaConversao - a.taxaConversao);
    },
  });

  // Evolução de vendas
  const { data: vendasChartData = [] } = useQuery({
    queryKey: ["admin-vendas-chart", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("data_call, resultado")
        .eq("resultado", "venda")
        .gte("data_call", inicioMes)
        .lte("data_call", fimMes);

      if (selectedVendedor !== "todos") {
        query = query.eq("user_id", selectedVendedor);
      }

      const { data } = await query;

      const vendasPorDia = data?.reduce((acc: any, call) => {
        const date = new Date(call.data_call).toLocaleDateString("pt-BR");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(vendasPorDia || {}).map(([data, vendas]) => ({
        data,
        vendas: vendas as number,
      }));
    },
  });

  const getStatusColor = (taxa: number, tipo: "comparecimento" | "conversao") => {
    if (tipo === "comparecimento") {
      if (taxa >= 75) return "text-green-500";
      if (taxa >= 60) return "text-yellow-500";
      return "text-red-500";
    } else {
      if (taxa >= 20) return "text-green-500";
      if (taxa >= 15) return "text-yellow-500";
      return "text-red-500";
    }
  };

  const getStatusLabel = (taxa: number, tipo: "comparecimento" | "conversao") => {
    if (tipo === "comparecimento") {
      if (taxa >= 75) return "Excelente";
      if (taxa >= 60) return "Bom";
      return "Precisa Melhorar";
    } else {
      if (taxa >= 20) return "Excelente";
      if (taxa >= 15) return "Bom";
      return "Precisa Melhorar";
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
          <StatCard
            title="Agendamentos"
            value={metricas?.agendamentos.toString() || "0"}
            icon={Calendar}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <StatCard
            title="Calls Realizadas"
            value={metricas?.callsRealizadas.toString() || "0"}
            icon={Phone}
          />
        </div>
        <div className="relative animate-fade-in" style={{ animationDelay: "200ms" }}>
          <StatCard
            title="Taxa de Comparecimento"
            value={`${metricas?.taxaComparecimento.toFixed(1) || "0.0"}%`}
            icon={Users}
          />
          <div
            className={`absolute bottom-6 left-6 text-xs font-medium ${getStatusColor(
              metricas?.taxaComparecimento || 0,
              "comparecimento"
            )}`}
          >
            {getStatusLabel(metricas?.taxaComparecimento || 0, "comparecimento")}
          </div>
        </div>
        <div className="relative animate-fade-in" style={{ animationDelay: "300ms" }}>
          <StatCard
            title="Taxa de Conversão"
            value={`${metricas?.taxaConversao.toFixed(1) || "0.0"}%`}
            icon={TrendingUp}
          />
          <div
            className={`absolute bottom-6 left-6 text-xs font-medium ${getStatusColor(
              metricas?.taxaConversao || 0,
              "conversao"
            )}`}
          >
            {getStatusLabel(metricas?.taxaConversao || 0, "conversao")}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallsFunnel
          agendamentos={metricas?.agendamentos || 0}
          callsRealizadas={metricas?.callsRealizadas || 0}
          vendas={metricas?.vendas || 0}
          taxaComparecimento={metricas?.taxaComparecimento || 0}
          taxaConversao={metricas?.taxaConversao || 0}
        />
      </div>

      {/* Calendário */}
      <CalendarioAgendamentos />

      {/* Tabela de performance */}
      <PerformanceTable data={performanceData} />
    </div>
  );
};
