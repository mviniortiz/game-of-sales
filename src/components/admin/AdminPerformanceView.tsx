import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Phone, TrendingUp, Users, Target, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { CallsFunnel } from "@/components/calls/CallsFunnel";
import { PerformanceTable } from "@/components/calls/PerformanceTable";
import { CallsEvolutionChart } from "@/components/calls/CallsEvolutionChart";
import { eachDayOfInterval } from "date-fns";

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

  // Evolução diária de agendamentos e calls
  const { data: evolutionChartData = [] } = useQuery({
    queryKey: ["admin-evolution-chart", inicioMes, fimMes, selectedVendedor],
    queryFn: async () => {
      const start = dateRange.from || new Date();
      const end = dateRange.to || new Date();
      const days = eachDayOfInterval({ start, end });

      let agendamentosQuery = supabase
        .from("agendamentos")
        .select("data_agendamento")
        .gte("data_agendamento", inicioMes)
        .lte("data_agendamento", fimMes);

      if (selectedVendedor !== "todos") {
        agendamentosQuery = agendamentosQuery.eq("user_id", selectedVendedor);
      }

      let callsQuery = supabase
        .from("calls")
        .select("data_call")
        .gte("data_call", inicioMes)
        .lte("data_call", fimMes);

      if (selectedVendedor !== "todos") {
        callsQuery = callsQuery.eq("user_id", selectedVendedor);
      }

      const { data: agendamentosData } = await agendamentosQuery;
      const { data: callsData } = await callsQuery;

      return days.map((day) => {
        const dateStr = day.toISOString().split('T')[0];
        const agendamentos = agendamentosData?.filter((a) =>
          a.data_agendamento.startsWith(dateStr)
        ).length || 0;
        const calls = callsData?.filter((c) =>
          c.data_call.startsWith(dateStr)
        ).length || 0;

        return {
          data: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          agendamentos,
          calls,
        };
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
          <StatCard
            title="Agendamentos"
            value={metricas?.agendamentos.toString() || "0"}
            icon={Calendar}
            iconClassName="bg-blue-500/10 text-blue-500"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <StatCard
            title="Calls Realizadas"
            value={metricas?.callsRealizadas.toString() || "0"}
            icon={Phone}
            iconClassName="bg-cyan-500/10 text-cyan-500"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <StatCard
            title="Vendas"
            value={metricas?.vendas.toString() || "0"}
            icon={Target}
            iconClassName="bg-green-500/10 text-green-500"
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <StatCard
            title="Taxa de Conversão"
            value={`${metricas?.taxaConversao.toFixed(1) || "0.0"}%`}
            icon={CheckCircle}
            iconClassName="bg-purple-500/10 text-purple-500"
          />
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallsFunnel
          agendamentos={metricas?.agendamentos || 0}
          callsRealizadas={metricas?.callsRealizadas || 0}
          vendas={metricas?.vendas || 0}
          taxaComparecimento={metricas?.taxaComparecimento || 0}
          taxaConversao={metricas?.taxaConversao || 0}
        />
        
        <CallsEvolutionChart data={evolutionChartData} />
      </div>

      {/* Tabela de performance */}
      <PerformanceTable data={performanceData} />
    </div>
  );
};
