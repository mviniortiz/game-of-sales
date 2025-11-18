import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { DndContext, DragEndEvent, closestCenter, DragOverlay } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
}

interface WeekViewProps {
  date: Date;
  agendamentos: Agendamento[];
  onAgendamentoUpdate: (id: string, newDate: Date) => void;
}

function SortableAgendamento({ agendamento }: { agendamento: Agendamento }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agendamento.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    const colors = {
      agendado: "bg-blue-500",
      confirmado: "bg-green-500",
      cancelado: "bg-red-500",
      concluido: "bg-gray-500",
    };
    return colors[status as keyof typeof colors] || "bg-primary";
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`p-2 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${getStatusColor(
          agendamento.status
        )} text-white`}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{agendamento.cliente_nome}</p>
            <div className="flex items-center gap-1 text-xs opacity-90">
              <Clock className="h-3 w-3" />
              <span>{format(new Date(agendamento.data_agendamento), "HH:mm")}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function WeekView({ date, agendamentos, onAgendamentoUpdate }: WeekViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const weekStart = startOfWeek(date, { locale: ptBR });
  const weekEnd = endOfWeek(date, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAgendamentosForDay = (day: Date) => {
    return agendamentos
      .filter((ag) => isSameDay(new Date(ag.data_agendamento), day))
      .sort((a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime());
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Se soltar sobre um dia diferente
    const targetDayStr = over.id as string;
    if (targetDayStr.startsWith("day-")) {
      const dayIndex = parseInt(targetDayStr.split("-")[1]);
      const targetDay = weekDays[dayIndex];

      // Encontrar o agendamento
      const agendamento = agendamentos.find((ag) => ag.id === active.id);
      if (!agendamento) return;

      // Criar nova data mantendo o horário original
      const originalDate = new Date(agendamento.data_agendamento);
      const newDate = new Date(targetDay);
      newDate.setHours(originalDate.getHours());
      newDate.setMinutes(originalDate.getMinutes());

      onAgendamentoUpdate(active.id as string, newDate);
    }
  };

  const activeAgendamento = activeId ? agendamentos.find((ag) => ag.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {format(weekStart, "d", { locale: ptBR })} - {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
        </h2>
        <Badge variant="outline" className="text-sm">
          {agendamentos.length} agendamentos
        </Badge>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayAgendamentos = getAgendamentosForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={index}
                id={`day-${index}`}
                className={`min-h-[300px] border rounded-lg p-3 ${
                  isToday ? "bg-primary/5 border-primary" : "bg-card"
                }`}
              >
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isToday ? "text-primary" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </p>
                </div>

                <div>
                  {dayAgendamentos.map((agendamento) => (
                    <SortableAgendamento key={agendamento.id} agendamento={agendamento} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeAgendamento ? (
            <Card className="p-2 bg-primary text-primary-foreground shadow-lg">
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{activeAgendamento.cliente_nome}</p>
                  <p className="text-xs">
                    {format(new Date(activeAgendamento.data_agendamento), "HH:mm")}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
