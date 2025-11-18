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
      <Card className="p-4 hover:shadow-md transition-shadow cursor-move">
        <div className="flex items-start gap-3">
          <div {...listeners} className="mt-1 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{agendamento.cliente_nome}</h3>
              <Badge variant="secondary" className={getStatusColor(agendamento.status)}>
                {getStatusLabel(agendamento.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(agendamento.data_agendamento), "HH:mm", { locale: ptBR })}</span>
            </div>
            {agendamento.observacoes && (
              <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
                {agendamento.observacoes}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function DayView({ date, agendamentos, onAgendamentoUpdate }: DayViewProps) {
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
                <SortableAgendamento key={agendamento.id} agendamento={agendamento} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
