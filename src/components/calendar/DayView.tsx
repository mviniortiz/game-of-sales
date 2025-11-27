import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical, User } from "lucide-react";
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

interface DayViewProps {
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

  const getStatusLabel = (status?: string) => {
    // Defensive: map to attendance-based labels
    const attendanceStatus = mapStatusToAttendance(status);
    
    const labels: Record<AttendanceStatus, string> = {
      show: "Compareceu",
      no_show: "Não Compareceu",
      pending: "Pendente",
    };
    
    return labels[attendanceStatus] || "Pendente";
  };

  const isGoogleEvent = !!agendamento.google_event_id;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card 
        className={`p-4 backdrop-blur-sm bg-card/60 hover:bg-card/80 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer ${getStatusColor(agendamento.status).bg}`}
        onClick={() => onEventClick?.(agendamento)}
      >
        <div className="flex items-start gap-3">
          <div {...listeners} className="mt-1 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-lg ${getStatusColor(agendamento.status).text}`}>
                  {showSellerName && agendamento.seller_name && (
                    <span className="text-indigo-400">[{agendamento.seller_name}] </span>
                  )}
                  {agendamento.cliente_nome}
                </h3>
                {isGoogleEvent && (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <title>Sincronizado com Google Calendar</title>
                    <path d="M22.46 12c0-1.28-.11-2.53-.32-3.75H12v7.1h5.84c-.25 1.35-1.03 2.49-2.18 3.26v2.72h3.53c2.07-1.9 3.27-4.7 3.27-8.33z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.53-2.72c-.98.66-2.24 1.05-3.75 1.05-2.88 0-5.32-1.95-6.19-4.57H2.19v2.81C4.01 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.81 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.09H2.19C1.46 8.55 1 10.22 1 12s.46 3.45 1.19 4.91l3.62-2.81z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.08.56 4.23 1.64l3.17-3.17C17.45 2.09 14.97 1 12 1 7.7 1 4.01 3.47 2.19 7.09l3.62 2.81C6.68 7.33 9.12 5.38 12 5.38z" fill="#EA4335"/>
                  </svg>
                )}
              </div>
              <Badge variant="secondary" className={getStatusColor(agendamento.status).text}>
                {getStatusLabel(agendamento.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 text-sm ${getStatusColor(agendamento.status).text}`}>
                <Clock className="h-4 w-4" />
                <span>{format(new Date(agendamento.data_agendamento), "HH:mm", { locale: ptBR })}</span>
              </div>
              {showSellerName && agendamento.seller_name && (
                <div className="flex items-center gap-1 text-sm text-indigo-400">
                  <User className="h-3 w-3" />
                  <span>{agendamento.seller_name}</span>
                </div>
              )}
            </div>
            {agendamento.observacoes && (
              <p className={`text-sm border-l-2 pl-3 ${getStatusColor(agendamento.status).text}`}>
                {agendamento.observacoes}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function DayView({ date, agendamentos, onAgendamentoUpdate, onEventClick, showSellerName = false }: DayViewProps) {
  const sortedAgendamentos = [...agendamentos].sort(
    (a, b) => new Date(a.data_agendamento).getTime() - new Date(b.data_agendamento).getTime()
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Encontrar índices dos agendamentos
    const oldIndex = sortedAgendamentos.findIndex((ag) => ag.id === active.id);
    const newIndex = sortedAgendamentos.findIndex((ag) => ag.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Calcular novo horário baseado na posição
    const targetAgendamento = sortedAgendamentos[newIndex];
    const newDate = new Date(targetAgendamento.data_agendamento);

    onAgendamentoUpdate(active.id as string, newDate);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>
        <Badge variant="outline" className="text-sm">
          {sortedAgendamentos.length} agendamentos
        </Badge>
      </div>

      {sortedAgendamentos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
        </Card>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedAgendamentos.map((ag) => ag.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedAgendamentos.map((agendamento) => (
                <SortableAgendamento 
                  key={agendamento.id} 
                  agendamento={agendamento} 
                  onEventClick={onEventClick}
                  showSellerName={showSellerName}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
