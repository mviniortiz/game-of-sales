import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Phone, Users, Filter } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CalendarViewSelector } from "@/components/calendar/CalendarViewSelector";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { AgendamentoDetailsModal } from "@/components/calendar/AgendamentoDetailsModal";

type ViewType = "day" | "week" | "month";

// Define attendance status type for type safety
type AttendanceStatus = 'show' | 'no_show' | 'pending';

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
  user_id: string;
  google_event_id?: string;
  attendance_status?: AttendanceStatus;
  seller_name?: string; // Added for team view
}

// Helper function to map status to attendance status
const mapStatusToAttendance = (status?: string): AttendanceStatus => {
  if (!status) return 'pending';

  switch (status) {
    case 'realizado':
      return 'show';
    case 'nao_compareceu':
      return 'no_show';
    case 'agendado':
    case 'cancelado':
    default:
      return 'pending';
  }
};

// Helper function to get status colors with defensive fallback
const getStatusColors = (status?: string) => {
  const attendanceStatus = mapStatusToAttendance(status);

  const colorMap: Record<AttendanceStatus, { bg: string; border: string; text: string }> = {
    show: { bg: "bg-green-500/10", border: "border-green-500", text: "text-green-400" },
    no_show: { bg: "bg-red-500/10", border: "border-red-500", text: "text-red-400" },
    pending: { bg: "bg-gray-500/10", border: "border-gray-500", text: "text-gray-400" },
  };

  return colorMap[attendanceStatus] || colorMap.pending;
};

export default function Calendario() {
  const { user, isAdmin, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
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

  // ==========================================
  // PERMISSION HIERARCHY:
  // ==========================================
  // 1. Super Admin (God Mode): Sees all sellers from all companies, BUT NOT other Super Admins
  // 2. Admin (Company): Sees only sellers from their own company
  // 3. Seller: Sees only their own calendar
  // ==========================================

  // Check if user can see team calendar
  const canSeeTeamCalendar = isAdmin || isSuperAdmin;

  // Check if we're showing team view (all sellers)
  const showingTeam = canSeeTeamCalendar && selectedVendedor === "all";

  // Determine which company to filter by
  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  // Fetch sellers for the filter dropdown (excluding Super Admins for privacy)
  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers-list", effectiveCompanyId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nome, is_super_admin")
        .eq("is_super_admin", false) // NEVER show Super Admins in the list
        .order("nome");

      // Super Admin: If viewing a specific company, filter by it
      // Admin: Always filter by their own company
      if (isSuperAdmin) {
        if (activeCompanyId) {
          query = query.eq("company_id", activeCompanyId);
        }
        // If no company selected, show all non-super-admin sellers
      } else if (companyId) {
        // Regular Admin: Only see their company's sellers
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: canSeeTeamCalendar,
  });

  useEffect(() => {
    loadAgendamentos();
  }, [currentDate, user, view, selectedVendedor, selectedStatus, activeCompanyId]);

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

    // Build query with seller name join and super_admin flag
    let query = supabase
      .from("agendamentos")
      .select("*, profiles!agendamentos_user_id_fkey(nome, is_super_admin, company_id)")
      .gte("data_agendamento", start.toISOString())
      .lte("data_agendamento", end.toISOString())
      .eq("profiles.is_super_admin", false);

    // ==========================================
    // PERMISSION-BASED FILTERING:
    // ==========================================
    if (isSuperAdmin) {
      // Super Admin (God Mode):
      // - Can see all sellers' appointments
      // - CANNOT see other Super Admins' appointments
      // - Can filter by company if one is selected

      if (selectedVendedor !== "all") {
        query = query.eq("user_id", selectedVendedor);
      } else if (activeCompanyId) {
        query = query.eq("profiles.company_id", activeCompanyId);
      }
    } else if (isAdmin) {
      // Company Admin:
      // - Can see only their company's sellers
      // - CANNOT see Super Admins

      if (selectedVendedor !== "all") {
        query = query.eq("user_id", selectedVendedor);
      }
      if (companyId) {
        query = query.eq("profiles.company_id", companyId);
      }
    } else {
      // Regular Seller:
      // - Can ONLY see their own appointments
      query = query.eq("user_id", user.id);
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      query = query.eq("status", selectedStatus as "agendado" | "realizado" | "cancelado");
    }

    query = query.order("data_agendamento");

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar agendamentos");
      console.error(error);
    } else {
      // Map data and apply permission filters
      let filteredData = (data || []).filter((ag: any) => {
        if (ag.profiles?.is_super_admin && ag.user_id !== user.id) return false;
        if (activeCompanyId && ag.profiles?.company_id !== activeCompanyId) return false;
        if (isAdmin && !isSuperAdmin && companyId && ag.profiles?.company_id !== companyId) return false;
        return true;
      });

      const mappedData = filteredData.map((ag: any) => ({
        ...ag,
        seller_name: ag.profiles?.nome || "Desconhecido",
      }));
      setAgendamentos(mappedData);
    }

    setLoading(false);
  };

  // Get seller initials for compact display
  const getSellerInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
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

        {/* Team Filter - Only for Admins */}
        {canSeeTeamCalendar && (
          <Card className="p-4 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-amber-400">
                <Users className="h-5 w-5" />
                <span className="font-semibold">Filtrar Agenda</span>
              </div>

              {/* Filtro de Vendedor */}
              <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                <SelectTrigger className="w-[200px] bg-background border-amber-500/30">
                  <SelectValue placeholder="Selecionar vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Vendedores
                    </div>
                  </SelectItem>
                  {sellers.map((seller: any) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro de Status */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px] bg-background border-amber-500/30">
                  <SelectValue placeholder="Filtrar por status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="agendado">Agendados</SelectItem>
                  <SelectItem value="realizado">Realizados</SelectItem>
                  <SelectItem value="nao_compareceu">Não Compareceu</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>

              {selectedVendedor === "all" && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Visualizando agenda de toda a equipe
                </Badge>
              )}
            </div>
          </Card>
        )}

        {/* Views */}
        {view === "day" && (
          <DayView
            date={currentDate}
            agendamentos={agendamentos}
            onAgendamentoUpdate={handleAgendamentoUpdate}
            onEventClick={handleEventClick}
            showSellerName={canSeeTeamCalendar && selectedVendedor === "all"}
          />
        )}

        {view === "week" && (
          <WeekView
            date={currentDate}
            agendamentos={agendamentos}
            onAgendamentoUpdate={handleAgendamentoUpdate}
            onEventClick={handleEventClick}
            showSellerName={canSeeTeamCalendar && selectedVendedor === "all"}
          />
        )}

        {view === "month" && (
          <>
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
                      className={`group relative min-h-[120px] border-b border-r border-border/10 p-2 transition-all cursor-pointer ${!isCurrentMonth ? "bg-muted/5 text-muted-foreground" : ""
                        } ${isToday ? "bg-primary/5 border-primary/20" : ""} hover:bg-accent/8`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-semibold ${isToday
                              ? "bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center"
                              : ""
                            }`}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {dayAgendamentos.slice(0, 3).map((ag) => {
                          const colors = getStatusColors(ag.status);
                          const isGoogleEvent = !!ag.google_event_id;

                          return (
                            <div
                              key={ag.id}
                              className={`text-xs p-2 rounded-lg ${colors.bg} backdrop-blur-sm border-l-4 ${colors.border} ${colors.text} truncate cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(ag);
                              }}
                              title={`${showingTeam ? `[${ag.seller_name}] ` : ""}${ag.cliente_nome} - ${format(
                                new Date(ag.data_agendamento),
                                "HH:mm"
                              )}${isGoogleEvent ? " (Google Calendar)" : ""}`}
                            >
                              <div className="flex items-center gap-1.5">
                                {isGoogleEvent ? (
                                  <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.46 12c0-1.28-.11-2.53-.32-3.75H12v7.1h5.84c-.25 1.35-1.03 2.49-2.18 3.26v2.72h3.53c2.07-1.9 3.27-4.7 3.27-8.33z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.53-2.72c-.98.66-2.24 1.05-3.75 1.05-2.88 0-5.32-1.95-6.19-4.57H2.19v2.81C4.01 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.81 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.09H2.19C1.46 8.55 1 10.22 1 12s.46 3.45 1.19 4.91l3.62-2.81z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.08.56 4.23 1.64l3.17-3.17C17.45 2.09 14.97 1 12 1 7.7 1 4.01 3.47 2.19 7.09l3.62 2.81C6.68 7.33 9.12 5.38 12 5.38z" fill="#EA4335" />
                                  </svg>
                                ) : (
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span className="font-medium">
                                  {format(new Date(ag.data_agendamento), "HH:mm")}
                                </span>
                                {/* Show seller name when viewing team */}
                                {showingTeam && (
                                  <span className="px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold flex-shrink-0">
                                    {getSellerInitials(ag.seller_name || "")}
                                  </span>
                                )}
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
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500" />
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Compareceu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Não Compareceu</span>
              </div>
              {showingTeam && (
                <>
                  <span className="text-muted-foreground ml-4">|</span>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                      AB
                    </span>
                    <span>= Iniciais do Vendedor</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      <AgendamentoDetailsModal
        agendamento={selectedAgendamento}
        open={showDetailsModal}
        onClose={handleCloseDetailsModal}
        onUpdate={loadAgendamentos}
      />
    </AppLayout>
  );
}
