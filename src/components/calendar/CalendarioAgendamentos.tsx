import { useState, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, RefreshCw, Plus } from "lucide-react";
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
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
          *,
          profiles!inner(nome)
        `)
        .order("data_agendamento", { ascending: true });

      if (error) throw error;

      const calendarEvents: CalendarEvent[] = (data || []).map((ag) => ({
        id: ag.id,
        title: `${ag.cliente_nome} - ${ag.profiles.nome}`,
        start: new Date(ag.data_agendamento),
        end: new Date(
          new Date(ag.data_agendamento).getTime() + 60 * 60 * 1000
        ),
        resource: ag,
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Error fetching agendamentos:", error);
      toast.error("Erro ao buscar agendamentos");
    } finally {
      setLoading(false);
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
    const status = event.resource.status;
    let backgroundColor = "hsl(var(--primary))";

    if (status === "realizado") {
      backgroundColor = "#10B981";
    } else if (status === "cancelado") {
      backgroundColor = "#EF4444";
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
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
