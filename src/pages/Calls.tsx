import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Calendar, 
  Phone, 
  TrendingUp, 
  Target, 
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Trophy,
  BarChart3
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Compact KPI Card Component - Matching Dashboard exactly
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  iconColor?: string;
  iconBg?: string;
}

const KPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendLabel,
  iconColor = "text-primary",
  iconBg = "bg-primary/10"
}: KPICardProps) => {
  const isPositive = trend && trend > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon with glow */}
          <div className={`relative p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform`}>
            <div className={`absolute inset-0 ${iconBg} rounded-xl blur-lg opacity-50`} />
            <Icon className={`h-6 w-6 ${iconColor} relative z-10`} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {value}
            </p>
            
            {/* Trend or Subtitle */}
            <div className="flex items-center gap-2 mt-1">
              {trend !== undefined && (
                <span className={`flex items-center text-xs font-medium ${
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              {(trendLabel || subtitle) && (
                <span className="text-xs text-slate-500">
                  {trendLabel || subtitle}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Conversion Funnel Component - Matching Dashboard style
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
      textColor: "text-indigo-400"
    },
    { 
      label: "Compareceram", 
      value: compareceram, 
      percentage: showRate,
      color: "from-cyan-600 to-cyan-500",
      textColor: "text-cyan-400"
    },
    { 
      label: "Vendas", 
      value: vendas, 
      percentage: conversionRate,
      color: "from-emerald-600 to-emerald-500",
      textColor: "text-emerald-400"
    },
  ];

  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          Funil de Conversão
        </CardTitle>
        <p className="text-xs text-slate-500">Fluxo de vendas do período</p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center flex-1">
              {/* Step */}
              <div className="flex-1">
                <div className="text-center mb-3">
                  <p className="text-2xl font-bold text-white tabular-nums">{step.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{step.label}</p>
                </div>
                
                {/* Progress Bar */}
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.max(step.percentage, 5)}%` }}
                  />
                </div>
                
                {index > 0 && (
                  <p className={`text-center mt-2 text-xs font-semibold ${step.textColor}`}>
                    {step.percentage.toFixed(1)}%
                  </p>
                )}
              </div>
              
              {/* Arrow Connector */}
              {index < steps.length - 1 && (
                <div className="px-2 flex-shrink-0">
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xl font-bold text-cyan-400 tabular-nums">{showRate.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Taxa de Comparecimento</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Taxa de Conversão</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Sellers League Table Component - Compact style
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
    if (rate >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const sortedData = [...data].sort((a, b) => b.totalVendido - a.totalVendido);

  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          League Table - Vendedores
        </CardTitle>
        <p className="text-xs text-slate-500">Ranking por receita no período</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-500 font-medium text-xs w-10">#</TableHead>
              <TableHead className="text-slate-500 font-medium text-xs">Vendedor</TableHead>
              <TableHead className="text-slate-500 font-medium text-xs">Volume</TableHead>
              <TableHead className="text-slate-500 font-medium text-xs text-center">Show</TableHead>
              <TableHead className="text-slate-500 font-medium text-xs text-center">Conv.</TableHead>
              <TableHead className="text-slate-500 font-medium text-xs text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((seller, index) => (
              <TableRow 
                key={seller.vendedor} 
                className="border-white/5 hover:bg-white/5 transition-colors"
              >
                <TableCell className="font-medium text-slate-500 text-sm py-3">
                  {index === 0 && <span className="text-amber-400">🥇</span>}
                  {index === 1 && <span className="text-slate-300">🥈</span>}
                  {index === 2 && <span className="text-amber-600">🥉</span>}
                  {index > 2 && <span>{index + 1}</span>}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 ring-2 ring-indigo-500/30">
                      <AvatarImage src={seller.avatarUrl} />
                      <AvatarFallback className="bg-indigo-500/20 text-indigo-300 font-semibold text-xs">
                        {getInitials(seller.vendedor)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white text-sm">{seller.vendedor}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400">{seller.calls} calls</span>
                    <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                        style={{ width: `${maxCalls > 0 ? (seller.calls / maxCalls) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center py-3">
                  <span className={`font-medium text-sm ${getEfficiencyColor(seller.taxaComparecimento)}`}>
                    {seller.taxaComparecimento.toFixed(0)}%
                  </span>
                </TableCell>
                <TableCell className="text-center py-3">
                  <span className="font-bold text-white text-sm">
                    {seller.taxaConversao.toFixed(0)}%
                  </span>
                </TableCell>
                <TableCell className="text-right py-3">
                  <span className="font-bold text-emerald-400 text-sm">
                    {formatCurrency(seller.totalVendido)}
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

// Analytics Chart Component - Matching Dashboard AreaChart style
interface ChartData {
  data: string;
  calls: number;
  taxaConversao: number;
}

const AnalyticsChart = ({ data }: { data: ChartData[] }) => {
  return (
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          Volume de Calls
        </CardTitle>
        <p className="text-xs text-slate-500">Últimos 7 dias</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCallsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="data" 
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number, name: string) => {
                if (name === 'calls') return [value, 'Calls'];
                return [`${value.toFixed(1)}%`, 'Conversão'];
              }}
            />
            <Area
              type="monotone"
              dataKey="calls"
              stroke="#4F46E5"
              strokeWidth={3}
              fill="url(#colorCallsArea)"
              dot={{ r: 0 }}
              activeDot={{ r: 6, fill: "#4F46E5", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Main Calls Page Component
const Calls = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");
  const [selectedResultado, setSelectedResultado] = useState("todos");

  // Comprehensive refetch function for when a call/sale is registered
  const handleCallSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["metricas-calls"] });
    queryClient.invalidateQueries({ queryKey: ["vendas"] });
    queryClient.invalidateQueries({ queryKey: ["vendas-evolution"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats-vendas"] });
    queryClient.invalidateQueries({ queryKey: ["admin-top-vendedores"] });
    queryClient.invalidateQueries({ queryKey: ["metas-consolidadas"] });
    queryClient.invalidateQueries({ queryKey: ["metas-individuais"] });
    queryClient.invalidateQueries({ queryKey: ["metas-progresso"] });
    queryClient.invalidateQueries({ queryKey: ["vendedores-metas"] });
    queryClient.invalidateQueries({ queryKey: ["seller-ranking"] });
    queryClient.invalidateQueries({ queryKey: ["calls-performance"] });
    queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
  };

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: metricas } = useQuery({
    queryKey: ["metricas-calls", dateRange, selectedVendedor],
    queryFn: async () => {
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
        const dataFormatada = format(date, "dd/MM");

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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Performance de Calls</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Métricas e conversão • {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
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

      {/* KPI Cards - Row 1: 5 columns matching Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPICard
          title="Agendamentos"
          value={metricas?.agendamentos || 0}
          icon={Calendar}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <KPICard
          title="Calls Realizadas"
          value={metricas?.callsRealizadas || 0}
          icon={Phone}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <KPICard
          title="Vendas Fechadas"
          value={metricas?.vendas || 0}
          icon={Target}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${(metricas?.taxaConversao || 0).toFixed(0)}%`}
          icon={TrendingUp}
          trend={(metricas?.taxaConversao || 0) - 25}
          trendLabel="vs média"
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <KPICard
          title="Show Rate"
          value={`${(metricas?.taxaComparecimento || 0).toFixed(0)}%`}
          subtitle="Taxa de Comparecimento"
          icon={UserCheck}
          trend={(metricas?.taxaComparecimento || 0) - 75}
          trendLabel="vs média"
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Row 2: Funnel & Chart - 50/50 split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnel
          agendamentos={metricas?.agendamentos || 0}
          compareceram={metricas?.compareceram || metricas?.callsRealizadas || 0}
          vendas={metricas?.vendas || 0}
        />
        <AnalyticsChart data={chartData} />
      </div>

      {/* Row 3: Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgendamentoForm onSuccess={handleCallSuccess} />
        <CallForm onSuccess={handleCallSuccess} />
      </div>

      {/* Row 4: League Table */}
      {isAdmin && sellersData.length > 0 && (
        <SellersLeagueTable data={sellersData} maxCalls={maxCalls} />
      )}

      {/* Row 5: Upcoming Appointments */}
      <ProximosAgendamentos
        agendamentos={proximosAgendamentos}
        onRegistrarClick={(id) => console.log("Registrar call:", id)}
      />
    </div>
  );
};

export default Calls;
