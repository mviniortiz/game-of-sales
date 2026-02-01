import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import {
  Calendar,
  Phone,
  TrendingUp,
  DollarSign,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  CalendarPlus,
  Clock,
  ChevronDown
} from "lucide-react";
import { CallsFilters } from "@/components/calls/CallsFilters";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CallForm } from "@/components/calls/CallForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Compact KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  highlight?: boolean;
  highlightColor?: "emerald" | "indigo" | "cyan" | "amber";
}

// Static Tailwind classes map to ensure proper CSS generation
const highlightColorClasses = {
  emerald: {
    ring: "ring-2 ring-emerald-500/50",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/20",
  },
  indigo: {
    ring: "ring-2 ring-indigo-500/50",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-500/20",
  },
  cyan: {
    ring: "ring-2 ring-cyan-500/50",
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/20",
  },
  amber: {
    ring: "ring-2 ring-amber-500/50",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/20",
  },
};

const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  highlight = false,
  highlightColor = "emerald"
}: KPICardProps) => {
  const isPositive = trend && trend > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClasses = highlightColorClasses[highlightColor];

  return (
    <Card className={`border bg-card shadow-sm hover:shadow-md transition-all duration-300 ${highlight ? colorClasses.ring : 'border-border'}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {title}
            </p>
            <p className={`text-3xl font-bold tabular-nums tracking-tight ${highlight ? colorClasses.text : 'text-foreground'}`}>
              {value}
            </p>

            {/* Trend or Subtitle */}
            <div className="flex items-center gap-2 mt-2">
              {trend !== undefined && (
                <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              {(trendLabel || subtitle) && (
                <span className="text-xs text-muted-foreground">
                  {trendLabel || subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Icon */}
          <div className={`p-3 rounded-xl ${highlight ? colorClasses.bg : 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
            <Icon className={`h-6 w-6 ${highlight ? colorClasses.text : 'text-indigo-600 dark:text-indigo-400'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Vertical Funnel Component
interface FunnelProps {
  agendamentos: number;
  compareceram: number;
  vendas: number;
}

const VerticalFunnel = ({ agendamentos, compareceram, vendas }: FunnelProps) => {
  const showRate = agendamentos > 0 ? (compareceram / agendamentos) * 100 : 0;
  const conversionRate = compareceram > 0 ? (vendas / compareceram) * 100 : 0;

  const steps = [
    {
      label: "Agendados",
      value: agendamentos,
      percentage: 100,
      width: "100%",
      color: "bg-indigo-500",
      textColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      label: "Compareceram",
      value: compareceram,
      percentage: showRate,
      width: `${Math.max(showRate, 20)}%`,
      color: "bg-cyan-500",
      textColor: "text-cyan-600 dark:text-cyan-400"
    },
    {
      label: "Vendas",
      value: vendas,
      percentage: conversionRate,
      width: `${Math.max(conversionRate, 15)}%`,
      color: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400"
    },
  ];

  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Funil de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.label} className="relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Step bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div
                    className={`h-12 ${step.color} rounded-lg flex items-center justify-center transition-all duration-500 mx-auto`}
                    style={{ width: step.width }}
                  >
                    <span className="text-white font-bold text-lg">{step.value}</span>
                  </div>
                </div>
              </div>

              {/* Label and percentage */}
              <div className="flex items-center justify-between mt-1 px-1">
                <span className="text-xs text-muted-foreground">{step.label}</span>
                {index > 0 && (
                  <span className={`text-xs font-semibold ${step.textColor}`}>
                    {step.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20">
            <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400 tabular-nums">{showRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Show Rate</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Conversão</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Stacked Bar Chart Component
interface StackedChartData {
  data: string;
  sale: number;
  followup: number;
  lost: number;
  noshow: number;
}

const OutcomeStackedChart = ({ data }: { data: StackedChartData[] }) => {
  return (
    <Card className="border border-border bg-card shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Volume por Resultado
        </CardTitle>
        <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
            <XAxis
              dataKey="data"
              stroke="rgba(100,116,139,0.6)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(100,116,139,0.6)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={25}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(226,232,240,0.8)",
                borderRadius: "10px",
                boxShadow: "0 12px 30px rgba(15,23,42,0.16)"
              }}
              labelStyle={{ color: "#475569" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px' }}
            />
            <Bar dataKey="sale" stackId="a" fill="#10B981" name="Venda" radius={[0, 0, 0, 0]} />
            <Bar dataKey="followup" stackId="a" fill="#3B82F6" name="Follow-up" />
            <Bar dataKey="lost" stackId="a" fill="#EF4444" name="Perdido" />
            <Bar dataKey="noshow" stackId="a" fill="#9CA3AF" name="No-Show" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Recent Calls History Table
interface CallHistory {
  id: string;
  dataHora: string;
  vendedor: string;
  vendedorAvatar?: string;
  cliente: string;
  status: 'venda' | 'perdido' | 'noshow' | 'followup' | 'agendado';
  duracao?: string;
}

const CallHistoryTable = ({ data }: { data: CallHistory[] }) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      venda: { label: "Venda", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
      perdido: { label: "Perdido", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" },
      noshow: { label: "No-Show", className: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
      followup: { label: "Follow-up", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
      agendado: { label: "Agendado", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
    };
    const config = statusConfig[status] || statusConfig.agendado;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Histórico Recente
        </CardTitle>
        <p className="text-xs text-muted-foreground">Últimas 10 calls registradas</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium text-xs">Data/Hora</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs">Vendedor</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs text-right">Duração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma call registrada
                </TableCell>
              </TableRow>
            ) : (
              data.map((call) => (
                <TableRow key={call.id} className="border-border hover:bg-muted/40 dark:hover:bg-white/5">
                  <TableCell className="text-sm text-foreground py-3">{call.dataHora}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={call.vendedorAvatar} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs">
                          {getInitials(call.vendedor)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{call.vendedor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground py-3">{call.cliente}</TableCell>
                  <TableCell className="py-3">{getStatusBadge(call.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground py-3 text-right">
                    {call.duracao || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Main Calls Page Component
const Calls = () => {
  const { user, isAdmin } = useAuth();
  const { needsUpgrade } = usePlan();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useTenant();

  // Sheet states - hooks must be called unconditionally
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [showAgendamentoSheet, setShowAgendamentoSheet] = useState(false);

  // Filter states
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");
  const [selectedResultado, setSelectedResultado] = useState("todos");

  // Success handler - closes sheets and refetches
  const handleCallSuccess = () => {
    setShowCallSheet(false);
    setShowAgendamentoSheet(false);
    queryClient.invalidateQueries({ queryKey: ["metricas-calls"] });
    queryClient.invalidateQueries({ queryKey: ["calls-stacked-chart"] });
    queryClient.invalidateQueries({ queryKey: ["calls-history"] });
    queryClient.invalidateQueries({ queryKey: ["vendas"] });
  };

  // Vendedores query
  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores", activeCompanyId],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, nome").eq("is_super_admin", false);
      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);
      const { data } = await query;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Metrics query
  const { data: metricas } = useQuery({
    queryKey: ["metricas-calls", dateRange, selectedVendedor, activeCompanyId],
    queryFn: async () => {
      let callsQuery = supabase
        .from("calls")
        .select("id, resultado, attendance_status, profiles!inner(is_super_admin)")
        .gte("data_call", dateRange.from?.toISOString().split("T")[0] || '')
        .lte("data_call", dateRange.to?.toISOString().split("T")[0] || '')
        .eq("profiles.is_super_admin", false);

      if (selectedVendedor !== "todos") {
        callsQuery = callsQuery.eq("user_id", selectedVendedor);
      }
      if (activeCompanyId) {
        callsQuery = callsQuery.eq("company_id", activeCompanyId);
      }

      const { data: callsData } = await callsQuery;

      let agendamentosQuery = supabase
        .from("agendamentos")
        .select("id, profiles!inner(company_id, is_super_admin)")
        .gte("data_agendamento", dateRange.from?.toISOString().split("T")[0] || '')
        .lte("data_agendamento", dateRange.to?.toISOString().split("T")[0] || '')
        .eq("profiles.is_super_admin", false);

      if (selectedVendedor !== "todos") {
        agendamentosQuery = agendamentosQuery.eq("user_id", selectedVendedor);
      }
      if (activeCompanyId) {
        agendamentosQuery = agendamentosQuery.eq("profiles.company_id", activeCompanyId);
      }

      const { data: agendamentosData } = await agendamentosQuery;

      // Get revenue from vendas
      const { data: vendasData } = await supabase
        .from("vendas")
        .select("valor")
        .gte("data_venda", dateRange.from?.toISOString().split("T")[0] || '')
        .lte("data_venda", dateRange.to?.toISOString().split("T")[0] || '');

      const agendamentos = agendamentosData?.length || 0;
      const callsRealizadas = callsData?.length || 0;
      const noShows = callsData?.filter((c: any) => c.attendance_status === 'noshow').length || 0;
      const compareceram = callsRealizadas - noShows;
      const vendas = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
      const totalRevenue = vendasData?.reduce((acc: number, v: any) => acc + (v.valor || 0), 0) || 0;

      const showRate = callsRealizadas > 0 ? (compareceram / callsRealizadas) * 100 : 0;
      const taxaConversao = callsRealizadas > 0 ? (vendas / callsRealizadas) * 100 : 0;

      return {
        agendamentos,
        callsRealizadas,
        compareceram,
        vendas,
        showRate,
        taxaConversao,
        totalRevenue,
      };
    },
    enabled: !!user,
  });

  // Stacked chart data query
  const { data: stackedChartData = [] } = useQuery({
    queryKey: ["calls-stacked-chart", dateRange, activeCompanyId],
    queryFn: async () => {
      const data: StackedChartData[] = [];
      const hoje = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(hoje);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dataFormatada = format(date, "dd/MM");

        let callsQuery = supabase
          .from("calls")
          .select("id, resultado, attendance_status, profiles!inner(is_super_admin)")
          .eq("data_call", dateStr)
          .eq("profiles.is_super_admin", false);

        if (activeCompanyId) {
          callsQuery = callsQuery.eq("company_id", activeCompanyId);
        }

        const { data: callsData } = await callsQuery;

        const sale = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
        const followup = callsData?.filter((c: any) => c.resultado === "follow_up").length || 0;
        const lost = callsData?.filter((c: any) => c.resultado === "perdido").length || 0;
        const noshow = callsData?.filter((c: any) => c.attendance_status === "noshow").length || 0;

        data.push({ data: dataFormatada, sale, followup, lost, noshow });
      }

      return data;
    },
    enabled: !!user,
  });

  // Call history query
  const { data: callHistory = [] } = useQuery({
    queryKey: ["calls-history", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("id, data_call, cliente_nome, resultado, attendance_status, duracao_minutos, profiles!inner(nome, avatar_url, is_super_admin)")
        .eq("profiles.is_super_admin", false)
        .order("data_call", { ascending: false })
        .limit(10);

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      const { data } = await query;

      return (data || []).map((call: any) => {
        const status: CallHistory['status'] = call.attendance_status === 'noshow'
          ? 'noshow'
          : call.resultado === 'venda'
            ? 'venda'
            : call.resultado === 'follow_up'
              ? 'followup'
              : call.resultado === 'perdido'
                ? 'perdido'
                : 'agendado';

        return {
          id: call.id,
          dataHora: format(new Date(call.data_call), "dd/MM HH:mm", { locale: ptBR }),
          vendedor: call.profiles?.nome || "Desconhecido",
          vendedorAvatar: call.profiles?.avatar_url,
          cliente: call.cliente_nome || "Cliente",
          status,
          duracao: call.duracao_minutos ? `${call.duracao_minutos}min` : undefined,
        };
      });
    },
    enabled: !!user,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  // Feature gate check - must be after all hooks
  if (needsUpgrade('calls')) {
    return <UpgradePrompt feature="calls" />;
  }

  return (
    <div className="space-y-6 px-1">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance de Calls</h1>
          <p className="text-sm text-muted-foreground">
            Analytics e métricas • {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Sheet open={showAgendamentoSheet} onOpenChange={setShowAgendamentoSheet}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarPlus className="h-4 w-4" />
                Novo Agendamento
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Novo Agendamento</SheetTitle>
                <SheetDescription>
                  Agende uma nova call com um prospect ou cliente.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <AgendamentoForm onSuccess={handleCallSuccess} />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={showCallSheet} onOpenChange={setShowCallSheet}>
            <SheetTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Phone className="h-4 w-4" />
                Registrar Resultado
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Registrar Resultado</SheetTitle>
                <SheetDescription>
                  Registre o resultado de uma call realizada.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <CallForm onSuccess={handleCallSuccess} />
              </div>
            </SheetContent>
          </Sheet>
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
        isAdmin={isAdmin}
      />

      {/* KPI Cards - Row 1: 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Calls Realizadas"
          value={metricas?.callsRealizadas || 0}
          icon={Phone}
          subtitle="no período"
        />
        <KPICard
          title="Show Rate"
          value={`${(metricas?.showRate || 0).toFixed(0)}%`}
          icon={UserCheck}
          highlight={(metricas?.showRate || 0) > 70}
          highlightColor="emerald"
          subtitle="compareceram"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${(metricas?.taxaConversao || 0).toFixed(0)}%`}
          icon={TrendingUp}
          trend={(metricas?.taxaConversao || 0) - 25}
          trendLabel="vs média"
        />
        <KPICard
          title="Receita Gerada"
          value={formatCurrency(metricas?.totalRevenue || 0)}
          icon={DollarSign}
          subtitle="em vendas"
        />
      </div>

      {/* Analytics Grid - Row 2: 2/3 + 1/3 split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <OutcomeStackedChart data={stackedChartData} />
        </div>
        <div className="lg:col-span-1">
          <VerticalFunnel
            agendamentos={metricas?.agendamentos || 0}
            compareceram={metricas?.compareceram || 0}
            vendas={metricas?.vendas || 0}
          />
        </div>
      </div>

      {/* History Table - Row 3 */}
      <CallHistoryTable data={callHistory} />
    </div>
  );
};

export default Calls;
