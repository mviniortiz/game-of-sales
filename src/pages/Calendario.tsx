import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
}

export default function Calendario() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewAgendamento, setShowNewAgendamento] = useState(false);

  useEffect(() => {
    loadAgendamentos();
  }, [currentDate, user]);

  const loadAgendamentos = async () => {
    if (!user) return;

    setLoading(true);
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("user_id", user.id)
      .gte("data_agendamento", start.toISOString())
      .lte("data_agendamento", end.toISOString())
      .order("data_agendamento");

    if (error) {
      toast.error("Erro ao carregar agendamentos");
      console.error(error);
    } else {
      setAgendamentos(data || []);
    }

    setLoading(false);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAgendamentosForDay = (day: Date) => {
    return agendamentos.filter((ag) =>
      isSameDay(new Date(ag.data_agendamento), day)
    );
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

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                  className={`min-h-[120px] border-b border-r p-2 transition-colors hover:bg-muted/50 ${
                    !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
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

                  <div className="space-y-1">
                    {dayAgendamentos.slice(0, 3).map((ag) => (
                      <div
                        key={ag.id}
                        className={`text-xs p-1.5 rounded ${getEventColor(
                          ag.status
                        )} text-white truncate cursor-pointer hover:opacity-80`}
                        title={`${ag.cliente_nome} - ${format(
                          new Date(ag.data_agendamento),
                          "HH:mm"
                        )}`}
                      >
                        {format(new Date(ag.data_agendamento), "HH:mm")} -{" "}
                        {ag.cliente_nome}
                      </div>
                    ))}
                    {dayAgendamentos.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-1">
                        +{dayAgendamentos.length - 3} mais
                      </div>
                    )}
                  </div>
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
    </AppLayout>
  );
}
