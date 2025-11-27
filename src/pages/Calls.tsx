import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Calendar, 
  Phone, 
  TrendingUp, 
  Target, 
  UserCheck,
  DollarSign,
  Users,
  ArrowRight,
  Trophy
} from "lucide-react";
import { CallsFilters } from "@/components/calls/CallsFilters";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CallForm } from "@/components/calls/CallForm";
import { ProximosAgendamentos } from "@/components/calls/ProximosAgendamentos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Glassmorphism KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  glowColor: string;
  delay?: number;
}

const KPICard = ({ title, value, subtitle, icon: Icon, iconColor, glowColor, delay = 0 }: KPICardProps) => (
  <div 
    className="animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <div className={`relative p-4 rounded-2xl ${iconColor}`}>
            <div className={`absolute inset-0 rounded-2xl ${glowColor} blur-xl opacity-50`} />
            <Icon className="relative h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Connected Step Funnel Component
interface FunnelProps {
  agendamentos: number;
  compareceram: number;
  vendas: number;
}

const ConversionFunnel = ({ agendamentos, compareceram, vendas }: FunnelProps) => {
  const showRate = agendamentos > 0 ? (compareceram / agendamentos) * 100 : 0;
  const conversionRate = compareceram > 0 ? (vendas / compareceram) * 100 : 0;
  
  const steps = [
    { 
      label: "Agendados", 
      value: agendamentos, 
      percentage: 100,
      color: "from-indigo-600 to-indigo-500",
      bgColor: "bg-indigo-500/10",
      textColor: "text-indigo-400"
    },
    { 
      label: "Compareceram", 
      value: compareceram, 
      percentage: showRate,
      color: "from-violet-600 to-purple-500",
      bgColor: "bg-violet-500/10",
      textColor: "text-violet-400"
    },
    { 
      label: "Vendas", 
      value: vendas, 
      percentage: conversionRate,
      color: "from-emerald-600 to-emerald-500",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-400"
    },
  ];

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
          </div>
          Funil de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-8 pb-6">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center flex-1">
              {/* Step */}
              <div className="flex-1">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-white">{step.value}</p>
                  <p className="text-sm text-slate-400 mt-1">{step.label}</p>
                </div>
                
                {/* Progress Bar */}
                <div className="h-4 bg-slate-800/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.max(step.percentage, 5)}%` }}
                  />
                </div>
                
                {index > 0 && (
                  <p className={`text-center mt-2 text-sm font-semibold ${step.textColor}`}>
                    {step.percentage.toFixed(1)}%
                  </p>
                )}
              </div>
              
              {/* Arrow Connector */}
              {index < steps.length - 1 && (
                <div className="px-3 flex-shrink-0">
                  <ArrowRight className="h-6 w-6 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <p className="text-2xl font-bold text-violet-400">{showRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">Taxa de Comparecimento</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-400">{conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">Taxa de Conversão</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Sellers League Table Component
interface SellerData {
  vendedor: string;
  avatarUrl?: string;
  calls: number;
  taxaComparecimento: number;
  taxaConversao: number;
  totalVendido: number;
}

const SellersLeagueTable = ({ data, maxCalls }: { data: SellerData[], maxCalls: number }) => {
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getEfficiencyColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-400";
    if (rate >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const sortedData = [...data].sort((a, b) => b.totalVendido - a.totalVendido);

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          League Table - Vendedores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400 font-semibold">#</TableHead>
              <TableHead className="text-slate-400 font-semibold">Vendedor</TableHead>
              <TableHead className="text-slate-400 font-semibold">Volume</TableHead>
              <TableHead className="text-slate-400 font-semibold text-center">Eficiência</TableHead>
              <TableHead className="text-slate-400 font-semibold text-center">Conversão</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((seller, index) => (
              <TableRow 
                key={seller.vendedor} 
                className="border-white/5 hover:bg-white/5 transition-colors"
              >
                <TableCell className="font-bold text-slate-500">
                  {index === 0 && <span className="text-amber-400">🥇</span>}
                  {index === 1 && <span className="text-slate-300">🥈</span>}
                  {index === 2 && <span className="text-amber-600">🥉</span>}
                  {index > 2 && <span>{index + 1}</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-indigo-500/30">
                      <AvatarImage src={seller.avatarUrl} />
                      <AvatarFallback className="bg-indigo-500/20 text-indigo-300 font-semibold text-sm">
                        {getInitials(seller.vendedor)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white">{seller.vendedor}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <span className="text-sm text-slate-300">{seller.calls} calls</span>
                    <div className="h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                        style={{ width: `${maxCalls > 0 ? (seller.calls / maxCalls) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-semibold ${getEfficiencyColor(seller.taxaComparecimento)}`}>
                    {seller.taxaComparecimento.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-bold text-lg text-white">
                    {seller.taxaConversao.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-emerald-400">
                    R$ {seller.totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Analytics Composed Chart Component
interface ChartData {
  data: string;
  calls: number;
  taxaConversao: number;
}

const AnalyticsChart = ({ data }: { data: ChartData[] }) => {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-3 text-white">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
          </div>
          Volume vs Conversão
          <span className="text-sm font-normal text-slate-500 ml-2">
            (Últimos 7 dias)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="data" 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{ 
                value: 'Calls', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#64748b', fontSize: 12 }
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickFormatter={(value) => `${value}%`}
              label={{ 
                value: 'Conversão %', 
                angle: 90, 
                position: 'insideRight',
                style: { fill: '#64748b', fontSize: 12 }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
              labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}
              itemStyle={{ color: '#94a3b8' }}
              formatter={(value: number, name: string) => {
                if (name === 'taxaConversao') return [`${value.toFixed(1)}%`, 'Taxa de Conversão'];
                return [value, 'Volume de Calls'];
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => {
                if (value === 'calls') return <span className="text-slate-300">Volume de Calls</span>;
                return <span className="text-slate-300">Taxa de Conversão</span>;
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="calls" 
              fill="url(#colorCalls)"
              radius={[6, 6, 0, 0]}
              name="calls"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="taxaConversao" 
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
              name="taxaConversao"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Main Calls Page Component
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
      // Real data query
      let agendamentosQuery = supabase
        .from("agendamentos")
        .select("id")
        .gte("data_agendamento", dateRange.from?.toISOString().split("T")[0] || '')
        .lte("data_agendamento", dateRange.to?.toISOString().split("T")[0] || '');

      if (selectedVendedor !== "todos") {
        agendamentosQuery = agendamentosQuery.eq("user_id", selectedVendedor);
      }

      const { data: agendamentosData } = await agendamentosQuery;

      let callsQuery = supabase
        .from("calls")
        .select("id, resultado, attendance_status")
        .gte("data_call", dateRange.from?.toISOString().split("T")[0] || '')
        .lte("data_call", dateRange.to?.toISOString().split("T")[0] || '');

      if (selectedVendedor !== "todos") {
        callsQuery = callsQuery.eq("user_id", selectedVendedor);
      }

      const { data: callsData } = await callsQuery;

      const agendamentos = agendamentosData?.length || 0;
      const callsRealizadas = callsData?.length || 0;
      const compareceram = callsData?.filter((c: any) => c.attendance_status === 'show').length || callsRealizadas;
      const vendas = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
      
      // Get total revenue from vendas table
      const { data: vendasData } = await supabase
        .from("vendas")
        .select("valor")
        .gte("data_venda", dateRange.from?.toISOString().split("T")[0] || '')
        .lte("data_venda", dateRange.to?.toISOString().split("T")[0] || '');
      
      const totalRevenue = vendasData?.reduce((acc: number, v: any) => acc + (v.valor || 0), 0) || 0;

      const taxaComparecimento = agendamentos > 0 ? (compareceram / agendamentos) * 100 : 0;
      const taxaConversao = compareceram > 0 ? (vendas / compareceram) * 100 : 0;

      return {
        agendamentos,
        callsRealizadas,
        compareceram,
        vendas,
        taxaComparecimento,
        taxaConversao,
        totalRevenue,
      };
    },
    enabled: !!user,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["calls-chart-data", dateRange],
    queryFn: async () => {
      const data: ChartData[] = [];
      const hoje = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(hoje);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dataFormatada = date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        });

        const { data: callsData } = await supabase
          .from("calls")
          .select("id, resultado")
          .eq("data_call", dateStr);

        const calls = callsData?.length || 0;
        const vendas = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
        const taxaConversao = calls > 0 ? (vendas / calls) * 100 : 0;

        data.push({ data: dataFormatada, calls, taxaConversao });
      }
      
      return data;
    },
    enabled: !!user,
  });

  const { data: sellersData = [] } = useQuery({
    queryKey: ["sellers-league", dateRange],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, nome, avatar_url");
      if (!profiles) return [];

      const results = await Promise.all(
        profiles.map(async (profile: any) => {
          const { data: callsData } = await supabase
            .from("calls")
            .select("id, resultado, attendance_status")
            .eq("user_id", profile.id)
            .gte("data_call", dateRange.from?.toISOString().split("T")[0] || '')
            .lte("data_call", dateRange.to?.toISOString().split("T")[0] || '');

          const { data: agendamentosData } = await supabase
            .from("agendamentos")
            .select("id")
            .eq("user_id", profile.id)
            .gte("data_agendamento", dateRange.from?.toISOString().split("T")[0] || '')
            .lte("data_agendamento", dateRange.to?.toISOString().split("T")[0] || '');

          const { data: vendasData } = await supabase
            .from("vendas")
            .select("valor")
            .eq("user_id", profile.id)
            .gte("data_venda", dateRange.from?.toISOString().split("T")[0] || '')
            .lte("data_venda", dateRange.to?.toISOString().split("T")[0] || '');

          const agendamentos = agendamentosData?.length || 0;
          const calls = callsData?.length || 0;
          const compareceram = callsData?.filter((c: any) => c.attendance_status === 'show').length || calls;
          const vendas = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
          const totalVendido = vendasData?.reduce((acc: number, v: any) => acc + (v.valor || 0), 0) || 0;

          const taxaComparecimento = agendamentos > 0 ? (compareceram / agendamentos) * 100 : 0;
          const taxaConversao = calls > 0 ? (vendas / calls) * 100 : 0;

          return {
            vendedor: profile.nome,
            avatarUrl: profile.avatar_url,
            calls,
            taxaComparecimento,
            taxaConversao,
            totalVendido,
          };
        })
      );

      return results.filter(r => r.calls > 0);
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

  const maxCalls = Math.max(...sellersData.map(s => s.calls), 1);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Performance de Calls
        </h1>
        <p className="text-slate-400 text-lg">
          Dashboard de métricas e conversão da equipe de vendas
        </p>
      </div>

      {/* Filters */}
      <CallsFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedVendedor={selectedVendedor}
        setSelectedVendedor={setSelectedVendedor}
        selectedResultado={selectedResultado}
        setSelectedResultado={setSelectedResultado}
        vendedores={vendedores}
      />

      {/* KPI Cards - The Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Agendamentos"
          value={metricas?.agendamentos || 0}
          icon={Calendar}
          iconColor="bg-blue-600"
          glowColor="bg-blue-500"
          delay={0}
        />
        <KPICard
          title="Calls Realizadas"
          value={metricas?.callsRealizadas || 0}
          icon={Phone}
          iconColor="bg-indigo-600"
          glowColor="bg-indigo-500"
          delay={100}
        />
        <KPICard
          title="Vendas Fechadas"
          value={metricas?.vendas || 0}
          icon={Target}
          iconColor="bg-emerald-600"
          glowColor="bg-emerald-500"
          delay={200}
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${(metricas?.taxaConversao || 0).toFixed(1)}%`}
          icon={TrendingUp}
          iconColor="bg-purple-600"
          glowColor="bg-purple-500"
          delay={300}
        />
        <KPICard
          title="Show Rate"
          value={`${(metricas?.taxaComparecimento || 0).toFixed(1)}%`}
          subtitle="Taxa de Comparecimento"
          icon={UserCheck}
          iconColor="bg-amber-600"
          glowColor="bg-amber-500"
          delay={400}
        />
      </div>

      {/* Funnel & Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnel
          agendamentos={metricas?.agendamentos || 0}
          compareceram={metricas?.compareceram || metricas?.callsRealizadas || 0}
          vendas={metricas?.vendas || 0}
        />
        <AnalyticsChart data={chartData} />
      </div>

      {/* Forms Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgendamentoForm onSuccess={refetchMetricas} />
        <CallForm onSuccess={refetchMetricas} />
      </div>

      {/* League Table */}
      {isAdmin && sellersData.length > 0 && (
        <SellersLeagueTable data={sellersData} maxCalls={maxCalls} />
      )}

      {/* Upcoming Appointments */}
      <ProximosAgendamentos
        agendamentos={proximosAgendamentos}
        onRegistrarClick={(id) => console.log("Registrar call:", id)}
      />
    </div>
  );
};

export default Calls;
