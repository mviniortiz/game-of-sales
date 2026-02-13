import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { DndContext, DragEndEvent, closestCenter, DragOverlay } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// Define attendance status type for type safety
type AttendanceStatus = 'show' | 'no_show' | 'pending';

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
  google_event_id?: string;
  attendance_status?: AttendanceStatus;
  seller_name?: string;
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

interface WeekViewProps {
  date: Date;
  agendamentos: Agendamento[];
  onAgendamentoUpdate: (id: string, newDate: Date) => void;
  onEventClick?: (agendamento: Agendamento) => void;
  showSellerName?: boolean;
}

function SortableAgendamento({ 
  agendamento, 
  onEventClick,
  showSellerName = false 
}: { 
  agendamento: Agendamento; 
  onEventClick?: (agendamento: Agendamento) => void;
  showSellerName?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agendamento.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status?: string) => {
    // Defensive: map status to attendance status with fallback
    const attendanceStatus = mapStatusToAttendance(status);
    
    const colorMap: Record<AttendanceStatus, { bg: string; text: string }> = {
      show: { bg: "bg-green-500/10 border-l-4 border-green-500", text: "text-green-400" },
      no_show: { bg: "bg-red-500/10 border-l-4 border-red-500", text: "text-red-400" },
      pending: { bg: "bg-gray-500/10 border-l-4 border-gray-500", text: "text-gray-400" },
    };
    
    return colorMap[attendanceStatus] || colorMap.pending;
  };

  const isGoogleEvent = !!agendamento.google_event_id;

  // Get seller initials
  const getSellerInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`p-3 mb-2 cursor-pointer backdrop-blur-sm bg-card/60 hover:bg-card/80 hover:shadow-lg hover:scale-[1.02] transition-all ${getStatusColor(
          agendamento.status
        ).bg}`}
        onClick={() => onEventClick?.(agendamento)}
      >
        <div className="flex items-start gap-2">
          <GripVertical className={`h-4 w-4 flex-shrink-0 mt-0.5 ${getStatusColor(agendamento.status).text}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {showSellerName && agendamento.seller_name && (
                <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex-shrink-0">
                  {getSellerInitials(agendamento.seller_name)}
                </span>
              )}
              <p className={`font-medium text-sm truncate ${getStatusColor(agendamento.status).text}`}>
                {agendamento.cliente_nome}
              </p>
              {isGoogleEvent && (
                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <title>Sincronizado com Google Calendar</title>
                  <path d="M22.46 12c0-1.28-.11-2.53-.32-3.75H12v7.1h5.84c-.25 1.35-1.03 2.49-2.18 3.26v2.72h3.53c2.07-1.9 3.27-4.7 3.27-8.33z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.53-2.72c-.98.66-2.24 1.05-3.75 1.05-2.88 0-5.32-1.95-6.19-4.57H2.19v2.81C4.01 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.81 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.09H2.19C1.46 8.55 1 10.22 1 12s.46 3.45 1.19 4.91l3.62-2.81z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.08.56 4.23 1.64l3.17-3.17C17.45 2.09 14.97 1 12 1 7.7 1 4.01 3.47 2.19 7.09l3.62 2.81C6.68 7.33 9.12 5.38 12 5.38z" fill="#EA4335"/>
                </svg>
              )}
            </div>
            <div className={`flex items-center gap-1 text-xs ${getStatusColor(agendamento.status).text}`}>
              <Clock className="h-3 w-3" />
              <span>{format(new Date(agendamento.data_agendamento), "HH:mm")}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function WeekView({ date, agendamentos, onAgendamentoUpdate, onEventClick, showSellerName = false }: WeekViewProps) {
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
                    <SortableAgendamento 
                      key={agendamento.id} 
                      agendamento={agendamento} 
                      onEventClick={onEventClick}
                      showSellerName={showSellerName}
                    />
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
