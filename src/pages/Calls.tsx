import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import {
  Calendar as CalendarIcon,
  Phone,
  TrendingUp,
  DollarSign,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  CalendarPlus,
  Clock,
  Sparkles,
  Flame,
  Target,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { CallsFilters } from "@/components/calls/CallsFilters";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CallForm } from "@/components/calls/CallForm";
import { Button } from "@/components/ui/button";
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

// ── KPI Card ──────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  accent?: string;
}

const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendLabel, accent = "text-emerald-400" }: KPICardProps) => {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-xl border border-border bg-card/50 hover:bg-card hover:border-border/80 transition-colors p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
          {title}
        </p>
        <Icon className={`h-3.5 w-3.5 ${accent} flex-shrink-0`} />
      </div>

      <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none mb-2">
        {value}
      </p>

      <div className="flex items-center gap-1.5 min-h-[16px]">
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
            isPositive ? "text-emerald-400" : "text-rose-400"
          }`}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {(trendLabel || subtitle) && (
          <span className="text-[11px] text-muted-foreground truncate">
            {trendLabel || subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Insight Card (derived from data) ──────────────────────────
type InsightAccent = "amber" | "rose" | "blue" | "emerald";

const ACCENT_CLASSES: Record<InsightAccent, { bg: string; ring: string; icon: string; cta: string }> = {
  amber:   { bg: "bg-amber-500/10",   ring: "ring-amber-500/20",   icon: "text-amber-400",   cta: "text-amber-400 hover:text-amber-300" },
  rose:    { bg: "bg-rose-500/10",    ring: "ring-rose-500/20",    icon: "text-rose-400",    cta: "text-rose-400 hover:text-rose-300" },
  blue:    { bg: "bg-blue-500/10",    ring: "ring-blue-500/20",    icon: "text-blue-400",    cta: "text-blue-400 hover:text-blue-300" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", icon: "text-emerald-400", cta: "text-emerald-400 hover:text-emerald-300" },
};

interface InsightCardProps {
  icon: React.ElementType;
  accent: InsightAccent;
  label: string;
  headline: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}

const InsightCard = ({ icon: Icon, accent, label, headline, body, cta }: InsightCardProps) => {
  const c = ACCENT_CLASSES[accent];
  return (
    <div className="group rounded-xl border border-border bg-card/40 hover:bg-card hover:border-border/80 transition-colors p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${c.bg} ring-1 ${c.ring} flex-shrink-0`}>
          <Icon className={`h-3.5 w-3.5 ${c.icon}`} />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight tracking-tight">{headline}</p>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">{body}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className={`flex items-center gap-1 text-[11px] font-medium ${c.cta} transition-colors mt-1 self-start`}
        >
          {cta.label}
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};

// ── Funnel (clean dark) ───────────────────────────────────────
interface FunnelProps {
  agendamentos: number;
  compareceram: number;
  vendas: number;
}

const VerticalFunnel = ({ agendamentos, compareceram, vendas }: FunnelProps) => {
  const showRate = agendamentos > 0 ? (compareceram / agendamentos) * 100 : 0;
  const conversionRate = compareceram > 0 ? (vendas / compareceram) * 100 : 0;

  const steps = [
    { label: "Agendados", value: agendamentos, width: 100, color: "bg-emerald-500" },
    { label: "Compareceram", value: compareceram, width: Math.max(showRate, 22), color: "bg-cyan-500" },
    { label: "Vendas", value: vendas, width: Math.max(conversionRate * (compareceram / Math.max(agendamentos, 1)), 14), color: "bg-emerald-400" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card/50 h-full flex flex-col">
      <div className="p-4 pb-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Funil de conversão</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Agendados, Compareceram, Vendas</p>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-5">
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{step.label}</span>
                <span className="text-foreground font-semibold tabular-nums">{step.value}</span>
              </div>
              <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className={`h-full ${step.color} rounded-full transition-all duration-500`}
                  style={{ width: `${step.width}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg border border-border bg-background/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Show Rate</p>
            <p className="text-base font-semibold text-cyan-400 tabular-nums">{showRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-background/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Conversão</p>
            <p className="text-base font-semibold text-emerald-400 tabular-nums">{conversionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Stacked bar chart ─────────────────────────────────────────
interface StackedChartData {
  data: string;
  dow?: string;
  sale: number;
  followup: number;
  lost: number;
  noshow: number;
}

const OutcomeStackedChart = ({ data }: { data: StackedChartData[] }) => (
  <div className="rounded-2xl border border-border bg-card/50 h-full">
    <div className="p-4 pb-3 border-b border-border flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Volume por resultado</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Últimos 7 dias</p>
      </div>
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="p-4">
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="data"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={24}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              padding: "8px 12px",
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginBottom: 2 }}
            itemStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", paddingTop: 8 }}
          />
          <Bar dataKey="sale" stackId="a" fill="#10B981" name="Venda" />
          <Bar dataKey="followup" stackId="a" fill="#3B82F6" name="Follow-up" />
          <Bar dataKey="lost" stackId="a" fill="#F43F5E" name="Perdido" />
          <Bar dataKey="noshow" stackId="a" fill="#64748B" name="No-show" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// ── Recent history list ───────────────────────────────────────
interface CallHistory {
  id: string;
  dataHora: string;
  vendedor: string;
  vendedorAvatar?: string;
  cliente: string;
  status: "venda" | "perdido" | "noshow" | "followup" | "agendado";
  duracao?: string;
}

const STATUS_CONFIG: Record<CallHistory["status"], { label: string; dot: string; text: string }> = {
  venda: { label: "Venda", dot: "bg-emerald-500", text: "text-emerald-400" },
  perdido: { label: "Perdido", dot: "bg-rose-500", text: "text-rose-400" },
  noshow: { label: "No-show", dot: "bg-slate-500", text: "text-muted-foreground" },
  followup: { label: "Follow-up", dot: "bg-blue-500", text: "text-blue-400" },
  agendado: { label: "Agendado", dot: "bg-emerald-500", text: "text-emerald-400" },
};

const CallHistoryList = ({ data }: { data: CallHistory[] }) => {
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/50">
      <div className="p-4 pb-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Histórico recente</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Últimas 10 calls registradas</p>
        </div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Phone className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhuma call registrada</p>
          <p className="text-xs mt-1">Registre uma call para ver o histórico aqui</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((call) => {
            const status = STATUS_CONFIG[call.status];
            return (
              <li key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                <Avatar className="h-8 w-8 ring-1 ring-border flex-shrink-0">
                  <AvatarImage src={call.vendedorAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white font-bold text-[11px]">
                    {getInitials(call.vendedor)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{call.cliente}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground truncate">{call.vendedor}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{call.dataHora}</span>
                    {call.duracao && (
                      <>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{call.duracao}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
const Calls = () => {
  const { user, isAdmin } = useAuth();
  const { needsUpgrade } = usePlan();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useTenant();

  const [showCallSheet, setShowCallSheet] = useState(false);
  const [showAgendamentoSheet, setShowAgendamentoSheet] = useState(false);

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [selectedVendedor, setSelectedVendedor] = useState("todos");
  const [selectedResultado, setSelectedResultado] = useState("todos");

  const handleCallSuccess = () => {
    setShowCallSheet(false);
    setShowAgendamentoSheet(false);
    queryClient.invalidateQueries({ queryKey: ["metricas-calls"] });
    queryClient.invalidateQueries({ queryKey: ["calls-stacked-chart"] });
    queryClient.invalidateQueries({ queryKey: ["calls-history"] });
    queryClient.invalidateQueries({ queryKey: ["vendas"] });
  };

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

  const { data: metricas } = useQuery({
    queryKey: ["metricas-calls", dateRange, selectedVendedor, activeCompanyId],
    queryFn: async () => {
      let callsQuery = supabase
        .from("calls")
        .select("id, resultado, attendance_status, profiles!inner(is_super_admin)")
        .gte("data_call", dateRange.from?.toISOString().split("T")[0] || "")
        .lte("data_call", dateRange.to?.toISOString().split("T")[0] || "")
        .eq("profiles.is_super_admin", false);

      if (selectedVendedor !== "todos") callsQuery = callsQuery.eq("user_id", selectedVendedor);
      if (activeCompanyId) callsQuery = callsQuery.eq("company_id", activeCompanyId);

      const { data: callsData } = await callsQuery;

      let agendamentosQuery = supabase
        .from("agendamentos")
        .select("id, profiles!inner(company_id, is_super_admin)")
        .gte("data_agendamento", dateRange.from?.toISOString().split("T")[0] || "")
        .lte("data_agendamento", dateRange.to?.toISOString().split("T")[0] || "")
        .eq("profiles.is_super_admin", false);

      if (selectedVendedor !== "todos") agendamentosQuery = agendamentosQuery.eq("user_id", selectedVendedor);
      if (activeCompanyId) agendamentosQuery = agendamentosQuery.eq("profiles.company_id", activeCompanyId);

      const { data: agendamentosData } = await agendamentosQuery;

      const { data: vendasData } = await supabase
        .from("vendas")
        .select("valor")
        .gte("data_venda", dateRange.from?.toISOString().split("T")[0] || "")
        .lte("data_venda", dateRange.to?.toISOString().split("T")[0] || "");

      const agendamentos = agendamentosData?.length || 0;
      const callsRealizadas = callsData?.length || 0;
      const noShows = callsData?.filter((c: any) => c.attendance_status === "noshow").length || 0;
      const compareceram = callsRealizadas - noShows;
      const vendas = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
      const followUps = callsData?.filter((c: any) => c.resultado === "follow_up").length || 0;
      const totalRevenue = vendasData?.reduce((acc: number, v: any) => acc + (v.valor || 0), 0) || 0;

      const showRate = callsRealizadas > 0 ? (compareceram / callsRealizadas) * 100 : 0;
      const taxaConversao = callsRealizadas > 0 ? (vendas / callsRealizadas) * 100 : 0;

      return { agendamentos, callsRealizadas, compareceram, vendas, followUps, noShows, showRate, taxaConversao, totalRevenue };
    },
    enabled: !!user,
  });

  const { data: stackedChartData = [] } = useQuery({
    queryKey: ["calls-stacked-chart", dateRange, activeCompanyId],
    queryFn: async () => {
      const data: StackedChartData[] = [];
      const hoje = new Date();
      const dowShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(hoje);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dataFormatada = format(date, "dd/MM");
        const dow = dowShort[date.getDay()];

        let callsQuery = supabase
          .from("calls")
          .select("id, resultado, attendance_status, profiles!inner(is_super_admin)")
          .eq("data_call", dateStr)
          .eq("profiles.is_super_admin", false);

        if (activeCompanyId) callsQuery = callsQuery.eq("company_id", activeCompanyId);

        const { data: callsData } = await callsQuery;

        const sale = callsData?.filter((c: any) => c.resultado === "venda").length || 0;
        const followup = callsData?.filter((c: any) => c.resultado === "follow_up").length || 0;
        const lost = callsData?.filter((c: any) => c.resultado === "perdido").length || 0;
        const noshow = callsData?.filter((c: any) => c.attendance_status === "noshow").length || 0;

        data.push({ data: dataFormatada, dow, sale, followup, lost, noshow });
      }

      return data;
    },
    enabled: !!user,
  });

  const { data: callHistory = [] } = useQuery({
    queryKey: ["calls-history", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("id, data_call, cliente_nome, resultado, attendance_status, duracao_minutos, profiles!inner(nome, avatar_url, is_super_admin)")
        .eq("profiles.is_super_admin", false)
        .order("data_call", { ascending: false })
        .limit(10);

      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);

      const { data } = await query;

      return (data || []).map((call: any) => {
        const status: CallHistory["status"] = call.attendance_status === "noshow"
          ? "noshow"
          : call.resultado === "venda"
            ? "venda"
            : call.resultado === "follow_up"
              ? "followup"
              : call.resultado === "perdido"
                ? "perdido"
                : "agendado";

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

  // ── Derived insights from data ─────────────────────────────
  const insights = useMemo(() => {
    const bestDay = stackedChartData.reduce<{ dow: string; sales: number } | null>((best, d) => {
      if (!best || d.sale > best.sales) return { dow: d.dow || d.data, sales: d.sale };
      return best;
    }, null);

    const noShowsWeek = stackedChartData.reduce((acc, d) => acc + d.noshow, 0);
    const followUpsWeek = stackedChartData.reduce((acc, d) => acc + d.followup, 0);

    return { bestDay, noShowsWeek, followUpsWeek };
  }, [stackedChartData]);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  if (needsUpgrade("calls")) return <UpgradePrompt feature="calls" />;

  return (
    <div className="space-y-5 sm:space-y-6 p-1">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Performance de Calls</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Show rate, conversão e receita, {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Sheet open={showAgendamentoSheet} onOpenChange={setShowAgendamentoSheet}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 border-border">
                <CalendarPlus className="h-3.5 w-3.5" />
                Agendamento
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Novo Agendamento</SheetTitle>
                <SheetDescription>Agende uma nova call com um prospect ou cliente.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <AgendamentoForm onSuccess={handleCallSuccess} />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={showCallSheet} onOpenChange={setShowCallSheet}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2 h-9 bg-emerald-500 hover:bg-emerald-400 text-white">
                <Phone className="h-3.5 w-3.5" />
                Registrar resultado
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Registrar Resultado</SheetTitle>
                <SheetDescription>Registre o resultado de uma call realizada.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <CallForm onSuccess={handleCallSuccess} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
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

      {/* ── KPI Row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Calls realizadas"
          value={metricas?.callsRealizadas || 0}
          icon={Phone}
          subtitle="no período"
          accent="text-emerald-400"
        />
        <KPICard
          title="Show rate"
          value={`${(metricas?.showRate || 0).toFixed(0)}%`}
          icon={UserCheck}
          subtitle="compareceram"
          accent="text-cyan-400"
        />
        <KPICard
          title="Conversão"
          value={`${(metricas?.taxaConversao || 0).toFixed(0)}%`}
          icon={TrendingUp}
          trend={(metricas?.taxaConversao || 0) - 25}
          trendLabel="vs média"
          accent="text-amber-400"
        />
        <KPICard
          title="Receita gerada"
          value={formatCurrency(metricas?.totalRevenue || 0)}
          icon={DollarSign}
          subtitle="em vendas"
          accent="text-emerald-400"
        />
      </div>

      {/* ── Insights strip (derived from data) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <InsightCard
          icon={Flame}
          accent="amber"
          label="Melhor dia"
          headline={
            insights.bestDay && insights.bestDay.sales > 0
              ? `${insights.bestDay.dow} concentra suas vendas`
              : "Sem padrão claro ainda"
          }
          body={
            insights.bestDay && insights.bestDay.sales > 0
              ? `${insights.bestDay.sales} venda${insights.bestDay.sales > 1 ? "s" : ""} fechada${insights.bestDay.sales > 1 ? "s" : ""} nesse dia da semana. Concentre agendamentos aí.`
              : "Registre mais calls pra detectar os dias com maior conversão."
          }
        />

        <InsightCard
          icon={RotateCcw}
          accent="rose"
          label="No-shows"
          headline={
            insights.noShowsWeek > 0
              ? `${insights.noShowsWeek} no-show${insights.noShowsWeek > 1 ? "s" : ""} na semana`
              : "Zero no-shows na semana"
          }
          body={
            insights.noShowsWeek > 0
              ? "Leads que não apareceram. Dispare reagendamento via WhatsApp pra recuperar."
              : "Excelente comparecimento. Mantenha a rotina de confirmação prévia."
          }
          cta={insights.noShowsWeek > 0 ? { label: "Ver no-shows", onClick: () => setSelectedResultado("noshow") } : undefined}
        />

        <InsightCard
          icon={Target}
          accent="blue"
          label="Follow-ups"
          headline={
            insights.followUpsWeek > 0
              ? `${insights.followUpsWeek} follow-up${insights.followUpsWeek > 1 ? "s" : ""} em aberto`
              : "Nenhum follow-up pendente"
          }
          body={
            insights.followUpsWeek > 0
              ? "Calls marcadas como follow-up precisam de retorno. Entre em contato antes que esfriem."
              : "Todas as calls foram resolvidas. Foque em novos agendamentos."
          }
          cta={insights.followUpsWeek > 0 ? { label: "Ver follow-ups", onClick: () => setSelectedResultado("reagendar") } : undefined}
        />
      </div>

      {/* ── Analytics Row ──────────────────────────────── */}
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

      {/* ── History ────────────────────────────────────── */}
      <CallHistoryList data={callHistory} />
    </div>
  );
};

export default Calls;
