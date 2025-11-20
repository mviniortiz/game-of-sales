import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Calendar, Phone, TrendingUp, Target, CheckCircle } from "lucide-react";
import { CallsFilters } from "@/components/calls/CallsFilters";
import { CallsFunnel } from "@/components/calls/CallsFunnel";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CallForm } from "@/components/calls/CallForm";
import { PerformanceTable } from "@/components/calls/PerformanceTable";
import { ProximosAgendamentos } from "@/components/calls/ProximosAgendamentos";
import { CallsEvolutionChart } from "@/components/calls/CallsEvolutionChart";

const Calls = () => {
  const { user, isAdmin } = useAuth();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");
  const [selectedResultado, setSelectedResultado] = useState("todos");

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: metricas, refetch: refetchMetricas } = useQuery({
    queryKey: ["metricas-calls", dateRange, selectedVendedor],
    queryFn: async () => {
      // Mock data para visualização
      const useMockData = true;
      
      if (useMockData) {
        return {
          agendamentos: 100,
          callsRealizadas: 80,
          vendas: 20,
          taxaComparecimento: 80,
          taxaConversao: 25,
        };
      }

      let query = supabase
        .from("agendamentos")
        .select("id, data_agendamento, user_id")
        .gte("data_agendamento", dateRange.from?.toISOString().split("T")[0])
        .lte("data_agendamento", dateRange.to?.toISOString().split("T")[0]);

      if (selectedVendedor !== "todos") {
        query = query.eq("user_id", selectedVendedor);
      }

      const { data: agendamentosData } = await query;

      let callsQuery = supabase
        .from("calls")
        .select("id, user_id, resultado")
        .gte("data_call", dateRange.from?.toISOString().split("T")[0])
        .lte("data_call", dateRange.to?.toISOString().split("T")[0]);

      if (selectedVendedor !== "todos") {
        callsQuery = callsQuery.eq("user_id", selectedVendedor);
      }

      if (selectedResultado !== "todos") {
        callsQuery = callsQuery.eq("resultado", selectedResultado as any);
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
    enabled: !!user,
  });

  const { data: evolutionData = [] } = useQuery({
    queryKey: ["calls-evolution", dateRange],
    queryFn: async () => {
      // Mock data para visualização (últimos 7 dias)
      const mockData = [];
      const hoje = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(data.getDate() - i);
        const dataFormatada = data.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        
        // Dados com variação realista
        const agendamentos = Math.floor(Math.random() * 8) + 10; // 10-18
        const calls = Math.floor(agendamentos * (0.7 + Math.random() * 0.2)); // 70-90% dos agendamentos
        
        mockData.push({ 
          data: dataFormatada, 
          agendamentos, 
          calls 
        });
      }
      
      return mockData;
    },
    enabled: !!user,
  });

  const { data: performanceData = [] } = useQuery({
    queryKey: ["performance-vendedores", dateRange],
    queryFn: async () => {
      // Mock data para visualização
      const useMockData = true;
      
      if (useMockData) {
        return [
          {
            vendedor: "João Silva",
            agendamentos: 28,
            calls: 24,
            taxaComparecimento: 85.7,
            vendas: 8,
            taxaConversao: 33.3,
            status: "excelente" as const,
          },
          {
            vendedor: "Maria Santos",
            agendamentos: 22,
            calls: 19,
            taxaComparecimento: 86.4,
            vendas: 5,
            taxaConversao: 26.3,
            status: "bom" as const,
          },
          {
            vendedor: "Pedro Costa",
            agendamentos: 25,
            calls: 20,
            taxaComparecimento: 80.0,
            vendas: 4,
            taxaConversao: 20.0,
            status: "bom" as const,
          },
          {
            vendedor: "Ana Lima",
            agendamentos: 15,
            calls: 10,
            taxaComparecimento: 66.7,
            vendas: 2,
            taxaConversao: 20.0,
            status: "precisa_melhorar" as const,
          },
          {
            vendedor: "Carlos Souza",
            agendamentos: 10,
            calls: 7,
            taxaComparecimento: 70.0,
            vendas: 1,
            taxaConversao: 14.3,
            status: "precisa_melhorar" as const,
          },
        ];
      }

      const { data: profiles } = await supabase.from("profiles").select("id, nome, avatar_url");

      if (!profiles) return [];

      const results = await Promise.all(
        profiles.map(async (profile) => {
          const { data: agendamentos } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("user_id", profile.id)
            .gte("data_agendamento", dateRange.from?.toISOString().split("T")[0])
            .lte("data_agendamento", dateRange.to?.toISOString().split("T")[0]);

          const { data: calls } = await supabase
            .from("calls")
            .select("id, resultado")
            .eq("user_id", profile.id)
            .gte("data_call", dateRange.from?.toISOString().split("T")[0])
            .lte("data_call", dateRange.to?.toISOString().split("T")[0]);

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
    enabled: isAdmin,
  });

  const { data: proximosAgendamentos = [] } = useQuery({
    queryKey: ["proximos-agendamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agendamentos")
        .select("id, cliente_nome, data_agendamento, user_id, profiles(nome)")
        .eq("status", "agendado")
        .gte("data_agendamento", new Date().toISOString())
        .order("data_agendamento", { ascending: true })
        .limit(10);

      return (
        data?.map((a: any) => ({
          id: a.id,
          cliente_nome: a.cliente_nome,
          data_agendamento: a.data_agendamento,
          vendedor: a.profiles?.nome || "Desconhecido",
        })) || []
      );
    },
  });


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Performance de Calls</h1>
        <p className="text-muted-foreground">
          Acompanhe suas métricas de agendamentos e conversão
        </p>
      </div>

      <CallsFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedVendedor={selectedVendedor}
        setSelectedVendedor={setSelectedVendedor}
        selectedResultado={selectedResultado}
        setSelectedResultado={setSelectedResultado}
        vendedores={vendedores}
      />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallsFunnel
          agendamentos={metricas?.agendamentos || 0}
          callsRealizadas={metricas?.callsRealizadas || 0}
          vendas={metricas?.vendas || 0}
          taxaComparecimento={metricas?.taxaComparecimento || 0}
          taxaConversao={metricas?.taxaConversao || 0}
        />
        <CallsEvolutionChart data={evolutionData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgendamentoForm onSuccess={refetchMetricas} />
        <CallForm onSuccess={refetchMetricas} />
      </div>

      {isAdmin && <PerformanceTable data={performanceData} />}

      <ProximosAgendamentos
        agendamentos={proximosAgendamentos}
        onRegistrarClick={(id) => console.log("Registrar call:", id)}
      />
    </div>
  );
};

export default Calls;
