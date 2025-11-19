import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
}

interface DayViewProps {
  date: Date;
  agendamentos: Agendamento[];
  onAgendamentoUpdate: (id: string, newDate: Date) => void;
  onEventClick?: (agendamento: Agendamento) => void;
}

function SortableAgendamento({ agendamento, onEventClick }: { agendamento: Agendamento; onEventClick?: (agendamento: Agendamento) => void }) {
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
      agendado: { bg: "bg-blue-500/10 border-l-4 border-blue-500", text: "text-blue-400" },
      confirmado: { bg: "bg-green-500/10 border-l-4 border-green-500", text: "text-green-400" },
      cancelado: { bg: "bg-red-500/10 border-l-4 border-red-500", text: "text-red-400" },
      concluido: { bg: "bg-gray-500/10 border-l-4 border-gray-500", text: "text-gray-400" },
      realizado: { bg: "bg-green-500/10 border-l-4 border-green-500", text: "text-green-400" },
    };
    return colors[status as keyof typeof colors] || { bg: "bg-primary/10 border-l-4 border-primary", text: "text-primary" };
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      agendado: "Agendado",
      confirmado: "Confirmado",
      cancelado: "Cancelado",
      concluido: "Concluído",
    };
    return labels[status as keyof typeof labels] || status;
  };

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
              <h3 className={`font-semibold text-lg ${getStatusColor(agendamento.status).text}`}>{agendamento.cliente_nome}</h3>
              <Badge variant="secondary" className={getStatusColor(agendamento.status).text}>
                {getStatusLabel(agendamento.status)}
              </Badge>
            </div>
            <div className={`flex items-center gap-2 text-sm ${getStatusColor(agendamento.status).text}`}>
              <Clock className="h-4 w-4" />
              <span>{format(new Date(agendamento.data_agendamento), "HH:mm", { locale: ptBR })}</span>
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

export function DayView({ date, agendamentos, onAgendamentoUpdate, onEventClick }: DayViewProps) {
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
                <SortableAgendamento key={agendamento.id} agendamento={agendamento} onEventClick={onEventClick} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
