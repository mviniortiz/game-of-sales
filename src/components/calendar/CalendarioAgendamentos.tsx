import { useState, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, RefreshCw } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Define attendance status type for type safety
type AttendanceStatus = 'show' | 'no_show' | 'pending';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    id: string;
    cliente_nome: string;
    data_agendamento: string;
    status?: string;
    attendance_status?: AttendanceStatus;
    observacoes?: string;
    user_id?: string;
    google_event_id?: string;
    profiles?: { nome: string };
  };
}

export const CalendarioAgendamentos = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("week");

  useEffect(() => {
    fetchAgendamentos();
  }, [user]);

  const fetchAgendamentos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          id,
          cliente_nome,
          data_agendamento,
          status,
          observacoes,
          user_id,
          google_event_id,
          profiles!inner(nome)
        `)
        .order("data_agendamento", { ascending: true });

      if (error) throw error;

      const calendarEvents: CalendarEvent[] = (data || []).map((ag) => ({
        id: ag.id,
        title: `${ag.cliente_nome} - ${ag.profiles?.nome || 'Vendedor'}`,
        start: new Date(ag.data_agendamento),
        end: new Date(
          new Date(ag.data_agendamento).getTime() + 60 * 60 * 1000
        ),
        resource: {
          ...ag,
          // Map status to attendance_status for color coding
          attendance_status: mapStatusToAttendance(ag.status),
        },
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Error fetching agendamentos:", error);
      toast.error("Erro ao buscar agendamentos");
    } finally {
      setLoading(false);
    }
  };

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

  const syncWithGoogle = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke(
        "google-calendar-sync",
        {
          body: {
            action: "sync_all",
            userId: user.id,
          },
        }
      );

      if (response.error) throw response.error;

      toast.success("Eventos sincronizados com sucesso!");
      fetchAgendamentos();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Erro ao sincronizar eventos");
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    // Defensive: safely access attendance_status with fallback to 'pending'
    const attendanceStatus = event.resource?.attendance_status || 'pending';
    const status = event.resource?.status;
    
    // Color coding based on attendance status:
    // - show (realizado): Green - Client attended
    // - no_show (nao_compareceu): Red - Client didn't show up
    // - pending (agendado/future): Gray - Waiting/Scheduled
    const attendanceColors: Record<AttendanceStatus, { border: string; bg: string }> = {
      show: { border: "#10B981", bg: "rgba(16, 185, 129, 0.15)" },        // Green for show
      no_show: { border: "#EF4444", bg: "rgba(239, 68, 68, 0.15)" },      // Red for no_show
      pending: { border: "#6B7280", bg: "rgba(107, 114, 128, 0.15)" },    // Gray for pending
    };

    // Get colors based on attendance status, default to pending (gray)
    const colors = attendanceColors[attendanceStatus] || attendanceColors.pending;

    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        borderRadius: "8px",
        color: "hsl(var(--foreground))",
        border: "1px solid hsl(var(--border) / 0.2)",
        backdropFilter: "blur(8px)",
        padding: "8px 12px",
        fontWeight: "500",
      },
    };
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendário de Agendamentos
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={syncWithGoogle}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px]">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={view}
            onView={setView}
            views={["month", "week", "day", "agenda"]}
            eventPropGetter={eventStyleGetter}
            messages={{
              next: "Próximo",
              previous: "Anterior",
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
              agenda: "Agenda",
              date: "Data",
              time: "Hora",
              event: "Evento",
              noEventsInRange: "Nenhum agendamento neste período",
              showMore: (total) => `+ ${total} mais`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
