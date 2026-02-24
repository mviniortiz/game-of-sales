import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Plus, Users, Target, Trophy,
  TrendingUp, RefreshCw, CalendarDays
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  addDays, subDays, addWeeks, subWeeks, isToday as dateFnsIsToday,
  parseISO, startOfDay, endOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CalendarTimelineView } from "@/components/calendar/CalendarTimelineView";
import { AgendamentoDetailsModal } from "@/components/calendar/AgendamentoDetailsModal";

type ViewType = "day" | "week" | "month";
type AttendanceStatus = "show" | "no_show" | "pending";

export interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
  user_id: string;
  google_event_id?: string;
  attendance_status?: AttendanceStatus;
  seller_name?: string;
}

const mapStatus = (status?: string): AttendanceStatus => {
  if (status === "realizado") return "show";
  if (status === "nao_compareceu") return "no_show";
  return "pending";
};

// Status colors
export const STATUS_COLORS: Record<AttendanceStatus, { bg: string; border: string; text: string; dot: string }> = {
  show: { bg: "bg-emerald-500/15", border: "border-emerald-500", text: "text-emerald-300", dot: "bg-emerald-500" },
  no_show: { bg: "bg-rose-500/15", border: "border-rose-500", text: "text-rose-300", dot: "bg-rose-500" },
  pending: { bg: "bg-slate-500/15", border: "border-slate-500", text: "text-slate-400", dot: "bg-slate-500" },
};

// ── Mini Month Calendar ──────────────────────────────────────────────────────
const MiniCalendar = ({
  date,
  onDateSelect,
  agendamentos,
}: {
  date: Date;
  onDateSelect: (d: Date) => void;
  agendamentos: Agendamento[];
}) => {
  const [miniDate, setMiniDate] = useState(date);

  // Sync when parent changes
  useEffect(() => { setMiniDate(date); }, [date]);

  const monthStart = startOfMonth(miniDate);
  const monthEnd = endOfMonth(miniDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

  const hasEvent = (d: Date) =>
    agendamentos.some(ag => isSameDay(parseISO(ag.data_agendamento), d));

  return (
    <div className="select-none">
      {/* Mini month nav */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={() => setMiniDate(subMonths(miniDate, 1))}
          className="p-1 rounded-md hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-slate-300 capitalize">
          {format(miniDate, "MMMM yyyy", { locale: ptBR })}
        </span>
        <button
          onClick={() => setMiniDate(addMonths(miniDate, 1))}
          className="p-1 rounded-md hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Week labels */}
      <div className="grid grid-cols-7 mb-1">
        {weekLabels.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-600">{l}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, miniDate);
          const isSelected = isSameDay(day, date);
          const isNow = dateFnsIsToday(day);
          const hasAg = hasEvent(day);

          return (
            <button
              key={i}
              onClick={() => { onDateSelect(day); setMiniDate(day); }}
              className={`
                relative h-7 w-7 mx-auto flex items-center justify-center rounded-full
                text-[11px] font-medium transition-all duration-100
                ${!inMonth ? "text-slate-700" : "text-slate-400 hover:text-white hover:bg-slate-700/60"}
                ${isSelected ? "!bg-emerald-500 !text-white shadow-md shadow-emerald-500/30" : ""}
                ${isNow && !isSelected ? "!text-emerald-400 font-bold" : ""}
              `}
            >
              {format(day, "d")}
              {hasAg && inMonth && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Upcoming Events List ──────────────────────────────────────────────────────
const UpcomingEvents = ({
  agendamentos,
  onEventClick,
}: {
  agendamentos: Agendamento[];
  onEventClick: (ag: Agendamento) => void;
}) => {
  const now = new Date();
  const upcoming = agendamentos
    .filter(ag => new Date(ag.data_agendamento) >= startOfDay(now))
    .sort((a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime())
    .slice(0, 8);

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-6">
        <CalendarDays className="h-8 w-8 text-slate-700 mx-auto mb-2" />
        <p className="text-xs text-slate-600">Sem próximos eventos</p>
      </div>
    );
  }

  let lastDateLabel = "";

  return (
    <div className="space-y-0.5">
      {upcoming.map((ag) => {
        const agDate = new Date(ag.data_agendamento);
        const dateLabel = dateFnsIsToday(agDate)
          ? "Hoje"
          : format(agDate, "EEE, d 'de' MMM", { locale: ptBR });
        const showLabel = dateLabel !== lastDateLabel;
        lastDateLabel = dateLabel;
        const st = mapStatus(ag.status);
        const colors = STATUS_COLORS[st];

        return (
          <div key={ag.id}>
            {showLabel && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pt-3 pb-1 px-1">
                {dateLabel}
              </p>
            )}
            <button
              onClick={() => onEventClick(ag)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left group"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-300 truncate group-hover:text-white">
                  {ag.cliente_nome}
                </p>
                {ag.seller_name && (
                  <p className="text-[10px] text-slate-600 truncate">{ag.seller_name}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-600 flex-shrink-0 tabular-nums">
                {format(agDate, "HH:mm")}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ── Mini Goal Widget ──────────────────────────────────────────────────────────
const MiniGoalWidget = ({ userId, companyId }: { userId?: string; companyId?: string }) => {
  const mesRef = format(new Date(), "yyyy-MM-01");

  // Buscar meta individual do mês
  const { data: metaData } = useQuery({
    queryKey: ["mini-meta-calendario", userId, companyId, mesRef],
    queryFn: async () => {
      if (!userId || !companyId) return null;

      // Meta individual
      const { data: meta } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("user_id", userId)
        .eq("mes_referencia", mesRef)
        .eq("company_id", companyId)
        .maybeSingle();

      if (!meta) return null;

      // Vendas do mês
      const start = `${format(startOfMonth(new Date()), "yyyy-MM-dd")}`;
      const end = `${format(endOfMonth(new Date()), "yyyy-MM-dd")}`;

      const { data: vendas } = await supabase
        .from("vendas")
        .select("valor")
        .eq("user_id", userId)
        .eq("status", "Aprovado")
        .gte("data_venda", start)
        .lte("data_venda", end);

      const realizado = (vendas || []).reduce((acc, v) => acc + Number(v.valor), 0);
      const metaVal = Number(meta.valor_meta) || 0;
      const pct = metaVal > 0 ? Math.min(100, (realizado / metaVal) * 100) : 0;

      return { realizado, meta: metaVal, pct };
    },
    enabled: !!userId && !!companyId,
    refetchInterval: 30000,
  });

  if (!metaData) return null;

  const { pct, realizado, meta } = metaData;
  const color = pct >= 100 ? "from-emerald-500 to-emerald-400" :
    pct >= 50 ? "from-cyan-500 to-cyan-400" :
      "from-slate-600 to-slate-500";
  const textColor = pct >= 100 ? "text-emerald-400" :
    pct >= 50 ? "text-cyan-400" : "text-slate-400";

  const fmt = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k` :
      `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {pct >= 100
            ? <Trophy className="h-3.5 w-3.5 text-emerald-400" />
            : <Target className="h-3.5 w-3.5 text-slate-500" />
          }
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Minha Meta
          </span>
        </div>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>
          {pct.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-1.5">
        <motion.div
          className={`h-full bg-gradient-to-r ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-600">
        <span className={textColor}>{fmt(realizado)}</span>
        <span>{fmt(meta)}</span>
      </div>
    </div>
  );
};

// ── Month Grid View ───────────────────────────────────────────────────────────
const MonthGridView = ({
  date,
  agendamentos,
  onEventClick,
  onDayClick,
  showTeam,
}: {
  date: Date;
  agendamentos: Agendamento[];
  onEventClick: (ag: Agendamento) => void;
  onDayClick: (d: Date) => void;
  showTeam: boolean;
}) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const headerDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getAgForDay = (d: Date) =>
    agendamentos
      .filter(ag => isSameDay(parseISO(ag.data_agendamento), d))
      .sort((a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime());

  const getInitials = (name: string) => {
    if (!name) return "?";
    const p = name.trim().split(" ");
    return p.length === 1 ? p[0].substring(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-700/50">
        {headerDays.map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-slate-700/30">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, date);
          const isNow = dateFnsIsToday(day);
          const dayAgs = getAgForDay(day);
          const visible = dayAgs.slice(0, 3);
          const overflow = dayAgs.length - 3;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`
                group relative min-h-[110px] p-2 cursor-pointer border-b border-slate-700/30
                transition-colors hover:bg-slate-800/60
                ${!inMonth ? "bg-slate-950/40" : ""}
                ${isNow ? "bg-emerald-500/5" : ""}
              `}
            >
              {/* Day number */}
              <div className="flex justify-between items-start mb-1">
                <span className={`
                  text-[13px] font-semibold w-7 h-7 flex items-center justify-center rounded-full
                  ${isNow ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40" : ""}
                  ${!inMonth ? "text-slate-700" : !isNow ? "text-slate-400" : ""}
                `}>
                  {format(day, "d")}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {visible.map(ag => {
                  const st = mapStatus(ag.status);
                  const c = STATUS_COLORS[st];
                  return (
                    <button
                      key={ag.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ag); }}
                      className={`
                        w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-left
                        ${c.bg} border-l-2 ${c.border}
                        hover:brightness-125 transition-all
                      `}
                    >
                      <span className={`text-[10px] font-semibold tabular-nums ${c.text} flex-shrink-0`}>
                        {format(parseISO(ag.data_agendamento), "HH:mm")}
                      </span>
                      {showTeam && ag.seller_name && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded flex-shrink-0">
                          {getInitials(ag.seller_name)}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium truncate ${c.text}`}>
                        {ag.cliente_nome}
                      </span>
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <p className="text-[10px] text-slate-600 pl-1.5 font-medium">+{overflow} mais</p>
                )}
              </div>

              {/* Hover + button for empty days */}
              {dayAgs.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <Plus className="h-6 w-6 text-slate-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── View Selector ─────────────────────────────────────────────────────────────
const ViewSelector = ({ view, onChange }: { view: ViewType; onChange: (v: ViewType) => void }) => {
  const views: { id: ViewType; label: string }[] = [
    { id: "day", label: "Dia" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mês" },
  ];
  return (
    <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700/60">
      {views.map(v => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all duration-150 ${view === v.id
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-300"
            }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Calendario() {
  const { user, isAdmin, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>("week");
  const [selectedVendedor, setSelectedVendedor] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewAgendamento, setShowNewAgendamento] = useState(false);
  const [googleSynced, setGoogleSynced] = useState(false);

  const canSeeTeam = isAdmin || isSuperAdmin;
  const showingTeam = canSeeTeam && selectedVendedor === "all";
  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  // Sellers list for filter
  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers-list-cal", effectiveCompanyId, isSuperAdmin],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, nome").eq("is_super_admin", false).order("nome");
      if (isSuperAdmin && activeCompanyId) q = q.eq("company_id", activeCompanyId);
      else if (companyId) q = q.eq("company_id", companyId);
      const { data } = await q;
      return data || [];
    },
    enabled: canSeeTeam,
  });

  // Auto-sync Google Calendar
  useEffect(() => {
    const syncGoogle = async () => {
      if (!user || googleSynced) return;
      try {
        const { data: profile } = await supabase.from("profiles").select("google_access_token").eq("id", user.id).single();
        if (profile?.google_access_token) {
          const res = await supabase.functions.invoke("google-calendar-sync", { body: { action: "sync_all", userId: user.id } });
          if (res.data?.inserted > 0) loadAgendamentos();
        }
      } catch { /* silent */ } finally {
        setGoogleSynced(true);
      }
    };
    syncGoogle();
  }, [user, googleSynced]);

  const loadAgendamentos = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let start: Date, end: Date;
    // Load a wider range in month view
    if (view === "day") {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    } else if (view === "week") {
      start = startOfWeek(currentDate, { locale: ptBR });
      end = endOfWeek(currentDate, { locale: ptBR });
    } else {
      start = startOfWeek(startOfMonth(currentDate), { locale: ptBR });
      end = endOfWeek(endOfMonth(currentDate), { locale: ptBR });
    }

    let q = supabase
      .from("agendamentos")
      .select("*, profiles!agendamentos_user_id_fkey(nome, is_super_admin, company_id)")
      .gte("data_agendamento", start.toISOString())
      .lte("data_agendamento", end.toISOString());

    if (isSuperAdmin) {
      if (selectedVendedor !== "all") q = q.eq("user_id", selectedVendedor);
      else if (activeCompanyId) q = q.eq("profiles.company_id", activeCompanyId);
    } else if (isAdmin) {
      if (selectedVendedor !== "all") q = q.eq("user_id", selectedVendedor);
      if (companyId) q = q.eq("profiles.company_id", companyId);
    } else {
      q = q.eq("user_id", user.id);
    }

    if (selectedStatus !== "all") q = q.eq("status", selectedStatus as any);
    q = q.order("data_agendamento");

    const { data, error } = await q;
    if (error) { toast.error("Erro ao carregar agendamentos"); }
    else {
      const filtered = (data || []).filter((ag: any) => {
        if (ag.user_id === user.id) return true;
        if (ag.profiles?.is_super_admin) return false;
        if (activeCompanyId && ag.profiles?.company_id !== activeCompanyId) return false;
        if (isAdmin && !isSuperAdmin && companyId && ag.profiles?.company_id !== companyId) return false;
        return true;
      });
      setAgendamentos(filtered.map((ag: any) => ({ ...ag, seller_name: ag.profiles?.nome || "" })));
    }
    setLoading(false);
  }, [user, view, currentDate, selectedVendedor, selectedStatus, activeCompanyId, isSuperAdmin, isAdmin, companyId]);

  useEffect(() => { loadAgendamentos(); }, [loadAgendamentos]);

  const navigate = (dir: "prev" | "next" | "today") => {
    if (dir === "today") { setCurrentDate(new Date()); return; }
    const delta = dir === "prev" ? -1 : 1;
    if (view === "day") setCurrentDate(addDays(currentDate, delta));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, delta));
    else setCurrentDate(addMonths(currentDate, delta));
  };

  const getTitle = () => {
    if (view === "day") return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { locale: ptBR });
      const we = endOfWeek(currentDate, { locale: ptBR });
      return `${format(ws, "d MMM", { locale: ptBR })} – ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: ptBR });
  };

  const handleEventClick = (ag: Agendamento) => { setSelectedAgendamento(ag); setShowDetailsModal(true); };
  const handleAgendamentoUpdate = async (id: string, newDate: Date) => {
    try {
      const { error } = await supabase.from("agendamentos").update({ data_agendamento: newDate.toISOString() }).eq("id", id);
      if (error) throw error;
      toast.success("Agendamento atualizado!");
      loadAgendamentos();
    } catch { toast.error("Erro ao atualizar agendamento"); }
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-950 text-white overflow-hidden">

        {/* ── TOP BAR ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex-shrink-0">
          {/* Nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("prev")}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("today")}
              className="px-3 py-1.5 text-[12px] font-semibold rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => navigate("next")}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <h1 className="text-[15px] font-bold text-white capitalize flex-1 truncate">
            {getTitle()}
          </h1>

          {/* Team filter (admins only) */}
          {canSeeTeam && (
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="w-[160px] h-8 bg-slate-800 border-slate-700 text-slate-300 text-[12px]">
                <Users className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white focus:bg-slate-700 text-[12px]">Todos vendedores</SelectItem>
                {sellers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id} className="text-white focus:bg-slate-700 text-[12px]">{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Status filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] h-8 bg-slate-800 border-slate-700 text-slate-300 text-[12px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white focus:bg-slate-700 text-[12px]">Todos</SelectItem>
              <SelectItem value="agendado" className="text-white focus:bg-slate-700 text-[12px]">Pendentes</SelectItem>
              <SelectItem value="realizado" className="text-white focus:bg-slate-700 text-[12px]">Compareceu</SelectItem>
              <SelectItem value="nao_compareceu" className="text-white focus:bg-slate-700 text-[12px]">Não compareceu</SelectItem>
              <SelectItem value="cancelado" className="text-white focus:bg-slate-700 text-[12px]">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          {/* View selector */}
          <ViewSelector view={view} onChange={setView} />

          {/* New appointment */}
          <Dialog open={showNewAgendamento} onOpenChange={setShowNewAgendamento}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-3 text-[12px] font-semibold shadow-md shadow-emerald-500/20"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Novo Agendamento</DialogTitle>
              </DialogHeader>
              <AgendamentoForm onSuccess={() => { setShowNewAgendamento(false); loadAgendamentos(); }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* ── BODY: SIDEBAR + MAIN ───────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── SIDEBAR ─────────────────────────────────────────────── */}
          <aside className="w-[240px] flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-y-auto p-3">
            {/* Mini calendar */}
            <MiniCalendar
              date={currentDate}
              onDateSelect={(d) => { setCurrentDate(d); setView("day"); }}
              agendamentos={agendamentos}
            />

            {/* Divider */}
            <div className="my-3 border-t border-slate-800" />

            {/* Upcoming */}
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 px-1">
              Próximos eventos
            </p>
            <UpcomingEvents agendamentos={agendamentos} onEventClick={handleEventClick} />

            {/* Divider */}
            <div className="flex-1" />

            {/* Mini goal widget */}
            <MiniGoalWidget userId={user?.id} companyId={effectiveCompanyId || undefined} />
          </aside>

          {/* ── MAIN CALENDAR AREA ──────────────────────────────────── */}
          <main className="flex-1 overflow-hidden bg-slate-950 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-20">
                <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}-${currentDate.toISOString().slice(0, 10)}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="h-full"
              >
                {view === "month" ? (
                  <MonthGridView
                    date={currentDate}
                    agendamentos={agendamentos}
                    onEventClick={handleEventClick}
                    onDayClick={(d) => { setCurrentDate(d); setView("day"); }}
                    showTeam={showingTeam}
                  />
                ) : (
                  <CalendarTimelineView
                    date={currentDate}
                    view={view}
                    agendamentos={agendamentos}
                    onEventClick={handleEventClick}
                    onAgendamentoUpdate={handleAgendamentoUpdate}
                    showSellerName={showingTeam}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AgendamentoDetailsModal
        agendamento={selectedAgendamento}
        open={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedAgendamento(null); }}
        onUpdate={loadAgendamentos}
      />
    </>
  );
}
