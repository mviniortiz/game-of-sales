import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Phone, Video } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CalendarViewSelector } from "@/components/calendar/CalendarViewSelector";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import { AgendamentoDetailsModal } from "@/components/calendar/AgendamentoDetailsModal";
import { SkeletonCard } from "@/components/ui/skeleton-card";

type ViewType = "day" | "week" | "month";

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
  user_id: string;
}

export default function Calendario() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewAgendamento, setShowNewAgendamento] = useState(false);
  const [view, setView] = useState<ViewType>("month");
  const [selectedVendedor, setSelectedVendedor] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadAgendamentos();
  }, [currentDate, user, view, selectedVendedor, selectedStatus]);

  const handleAgendamentoUpdate = async (id: string, newDate: Date) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ data_agendamento: newDate.toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Agendamento atualizado!");
      loadAgendamentos();
    } catch (error) {
      console.error("Error updating agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
    }
  };

  const handlePrevious = () => {
    if (view === "day") {
      setCurrentDate(subDays(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => setCurrentDate(new Date());

  const getTitle = () => {
    if (view === "day") {
      return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate, { locale: ptBR });
      const weekEnd = endOfWeek(currentDate, { locale: ptBR });
      return `${format(weekStart, "d MMM", { locale: ptBR })} - ${format(weekEnd, "d MMM yyyy", { locale: ptBR })}`;
    } else {
      return format(currentDate, "MMMM yyyy", { locale: ptBR });
    }
  };

  // Month view helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getAgendamentosForDay = (day: Date) => {
    return agendamentos.filter((ag) =>
      isSameDay(new Date(ag.data_agendamento), day)
    );
  };

  const handleEventClick = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedAgendamento(null);
  };

  const getEventColor = (status: string) => {
    const colors = {
      agendado: "bg-blue-500",
      confirmado: "bg-green-500",
      cancelado: "bg-red-500",
      concluido: "bg-gray-500",
    };
    return colors[status as keyof typeof colors] || "bg-primary";
  };

  const loadAgendamentos = async () => {
    if (!user) return;

    setLoading(true);
    
    let start: Date;
    let end: Date;

    if (view === "day") {
      start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      start = startOfWeek(currentDate, { locale: ptBR });
      end = endOfWeek(currentDate, { locale: ptBR });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    let query = supabase
      .from("agendamentos")
      .select("*")
      .gte("data_agendamento", start.toISOString())
      .lte("data_agendamento", end.toISOString());

    // Apply filters
    if (selectedVendedor !== "all") {
      query = query.eq("user_id", selectedVendedor);
    }

    if (selectedStatus !== "all") {
      query = query.eq("status", selectedStatus as "agendado" | "realizado" | "cancelado");
    }

    query = query.order("data_agendamento");

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar agendamentos");
      console.error(error);
    } else {
      setAgendamentos(data || []);
    }

    setLoading(false);
  };

  return (
    <AppLayout>
      {loading ? (
        <div className="container py-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-96 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <SkeletonCard />
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="container py-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold capitalize">{getTitle()}</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CalendarViewSelector view={view} onViewChange={setView} />
            
            <Dialog open={showNewAgendamento} onOpenChange={setShowNewAgendamento}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>
                <AgendamentoForm
                  onSuccess={() => {
                    setShowNewAgendamento(false);
                    loadAgendamentos();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        {view === "month" && (
          <CalendarFilters
            selectedVendedor={selectedVendedor}
            selectedStatus={selectedStatus}
            onVendedorChange={setSelectedVendedor}
            onStatusChange={setSelectedStatus}
          />
        )}

        {/* Views */}
        {view === "day" && (
          <DayView
            date={currentDate}
            agendamentos={agendamentos}
            onAgendamentoUpdate={handleAgendamentoUpdate}
            onEventClick={handleEventClick}
          />
        )}

        {view === "week" && (
          <WeekView
            date={currentDate}
            agendamentos={agendamentos}
            onAgendamentoUpdate={handleAgendamentoUpdate}
            onEventClick={handleEventClick}
          />
        )}

        {view === "month" && (
          <div>
            {/* Calendar Grid */}
            <Card className="overflow-hidden">
              <div className="grid grid-cols-7 bg-muted/50 border-b">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="p-4 text-center text-sm font-semibold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayAgendamentos = getAgendamentosForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={index}
                      className={`group relative min-h-[120px] border-b border-r border-border/10 p-2 transition-all cursor-pointer ${
                        !isCurrentMonth ? "bg-muted/5 text-muted-foreground" : ""
                      } ${isToday ? "bg-primary/5 border-primary/20" : ""} hover:bg-accent/8`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-semibold ${
                            isToday
                              ? "bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center"
                              : ""
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {dayAgendamentos.slice(0, 3).map((ag) => {
                          const statusColors = {
                            agendado: { bg: "bg-blue-500/10", border: "border-blue-500", text: "text-blue-400" },
                            realizado: { bg: "bg-green-500/10", border: "border-green-500", text: "text-green-400" },
                            cancelado: { bg: "bg-red-500/10", border: "border-red-500", text: "text-red-400" },
                            concluido: { bg: "bg-gray-500/10", border: "border-gray-500", text: "text-gray-400" },
                          };
                          
                          const colors = statusColors[ag.status as keyof typeof statusColors] || statusColors.agendado;
                          
                          return (
                            <div
                              key={ag.id}
                              className={`text-xs p-2 rounded-lg ${colors.bg} backdrop-blur-sm border-l-4 ${colors.border} ${colors.text} truncate cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(ag);
                              }}
                              title={`${ag.cliente_nome} - ${format(
                                new Date(ag.data_agendamento),
                                "HH:mm"
                              )}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3" />
                                <span className="font-medium">
                                  {format(new Date(ag.data_agendamento), "HH:mm")}
                                </span>
                                <span className="truncate">{ag.cliente_nome}</span>
                              </div>
                            </div>
                          );
                        })}
                        {dayAgendamentos.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-2 font-medium">
                            +{dayAgendamentos.length - 3} mais
                          </div>
                        )}
                      </div>
                      
                      {/* Plus icon on hover for empty days */}
                      {dayAgendamentos.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Plus className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Cancelado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500" />
                <span>Concluído</span>
              </div>
            </div>
          </div>
        )}
        </div>
      )}
      
      <AgendamentoDetailsModal
        agendamento={selectedAgendamento}
        open={showDetailsModal}
        onClose={handleCloseDetailsModal}
        onUpdate={loadAgendamentos}
      />
    </AppLayout>
  );
}
