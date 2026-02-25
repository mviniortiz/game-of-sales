import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, FileText, Edit, Trash2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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

interface AgendamentoDetailsModalProps {
  agendamento: Agendamento | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const AgendamentoDetailsModal = ({
  agendamento,
  open,
  onClose,
  onUpdate,
}: AgendamentoDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editedData, setEditedData] = useState({
    cliente_nome: "",
    data_agendamento: "",
    hora_agendamento: "",
    observacoes: "",
    status: "",
  });

  const handleEdit = () => {
    if (!agendamento) return;

    const dataObj = new Date(agendamento.data_agendamento);
    setEditedData({
      cliente_nome: agendamento.cliente_nome,
      data_agendamento: format(dataObj, "yyyy-MM-dd"),
      hora_agendamento: format(dataObj, "HH:mm"),
      observacoes: agendamento.observacoes || "",
      status: agendamento.status,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!agendamento) return;

    setLoading(true);
    try {
      const dateTime = new Date(`${editedData.data_agendamento}T${editedData.hora_agendamento}`);

      const { error } = await supabase
        .from("agendamentos")
        .update({
          cliente_nome: editedData.cliente_nome,
          data_agendamento: dateTime.toISOString(),
          observacoes: editedData.observacoes,
          status: editedData.status as "agendado" | "realizado" | "cancelado",
        })
        .eq("id", agendamento.id);

      if (error) throw error;

      // Se tem google_event_id, sincronizar com Google Calendar
      const googleEventId = agendamento.google_event_id;
      if (googleEventId) {
        try {
          await supabase.functions.invoke("google-calendar-sync", {
            body: {
              action: "update_event",
              userId: agendamento.user_id,
              agendamentoData: {
                id: agendamento.id,
                google_event_id: googleEventId,
                cliente_nome: editedData.cliente_nome,
                data_agendamento: dateTime.toISOString(),
                observacoes: editedData.observacoes,
              },
            },
          });
        } catch (syncError) {
          console.error("Erro ao sincronizar com Google:", syncError);
        }
      }

      toast.success("Agendamento atualizado com sucesso!");
      setIsEditing(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agendamento) return;

    setLoading(true);
    try {
      // Se tem google_event_id, deletar do Google Calendar primeiro
      const googleEventId = agendamento.google_event_id;
      if (googleEventId) {
        try {
          await supabase.functions.invoke("google-calendar-sync", {
            body: {
              action: "delete_event",
              userId: agendamento.user_id,
              agendamentoData: {
                google_event_id: googleEventId,
              },
            },
          });
        } catch (syncError) {
          console.error("Erro ao deletar do Google:", syncError);
        }
      }

      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", agendamento.id);

      if (error) throw error;

      toast.success("Agendamento excluído com sucesso!");
      setShowDeleteDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error deleting agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    // Defensive: map to attendance-based colors and labels
    const attendanceStatus = mapStatusToAttendance(status);

    const variants: Record<AttendanceStatus, { color: string; label: string }> = {
      show: { color: "bg-green-500/10 text-green-400 border-green-500/20", label: "Compareceu" },
      no_show: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Não Compareceu" },
      pending: { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "Pendente" },
    };

    const variant = variants[attendanceStatus] || variants.pending;

    return (
      <Badge className={`${variant.color} border`}>
        {variant.label}
      </Badge>
    );
  };

  if (!agendamento) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px] bg-[#121214] border-white/[0.05] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-white">
                {isEditing ? "Editar Agendamento" : "Detalhes do Agendamento"}
              </DialogTitle>
              {!isEditing && getStatusBadge(agendamento.status)}
            </div>
          </DialogHeader>

          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {!isEditing ? (
              // View Mode
              <div className="space-y-3">
                {/* Cliente Card */}
                <div className="flex items-start gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-400 mb-0.5">Cliente</p>
                    <p className="text-base font-semibold text-slate-100 truncate">
                      {agendamento.cliente_nome}
                    </p>
                  </div>
                </div>

                {/* Data e Hora Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-400 mb-0.5">Data</p>
                      <p className="font-semibold text-slate-100">
                        {format(new Date(agendamento.data_agendamento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-slate-400 mb-0.5">Horário</p>
                      <p className="font-semibold text-slate-100">
                        {format(new Date(agendamento.data_agendamento), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Observações Card */}
                {agendamento.observacoes && (
                  <div className="flex items-start gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-slate-400 mb-1">Observações</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {agendamento.observacoes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="cliente_nome" className="text-slate-300">Cliente <span className="text-destructive">*</span></Label>
                  <Input
                    id="cliente_nome"
                    value={editedData.cliente_nome}
                    onChange={(e) => setEditedData({ ...editedData, cliente_nome: e.target.value })}
                    placeholder="Nome do cliente"
                    className="bg-white/[0.03] border-white/10 text-white focus-visible:ring-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Data <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.05] hover:text-white",
                            !editedData.data_agendamento && "text-slate-400"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {editedData.data_agendamento
                            ? format(new Date(editedData.data_agendamento + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : <span>Selecione a data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#1C1C20] border-white/10" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={editedData.data_agendamento ? new Date(editedData.data_agendamento + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setEditedData({ ...editedData, data_agendamento: format(date, "yyyy-MM-dd") });
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora" className="text-slate-300">Horário <span className="text-destructive">*</span></Label>
                    <Input
                      id="hora"
                      type="time"
                      value={editedData.hora_agendamento}
                      onChange={(e) => setEditedData({ ...editedData, hora_agendamento: e.target.value })}
                      className="bg-white/[0.03] border-white/10 text-white focus-visible:ring-primary/50 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-300">Status <span className="text-destructive">*</span></Label>
                  <Select value={editedData.status} onValueChange={(value) => setEditedData({ ...editedData, status: value })}>
                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-white focus:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C20] border-white/10">
                      <SelectItem value="agendado">Pendente</SelectItem>
                      <SelectItem value="realizado">Compareceu</SelectItem>
                      <SelectItem value="nao_compareceu">Não Compareceu</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes" className="text-slate-300">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={editedData.observacoes}
                    onChange={(e) => setEditedData({ ...editedData, observacoes: e.target.value })}
                    placeholder="Adicione observações sobre o agendamento"
                    rows={4}
                    className="bg-white/[0.03] border-white/10 text-white focus-visible:ring-primary/50 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-black/20 border-t border-white/[0.05] gap-2 sm:justify-between">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-colors bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
                <div className="flex gap-2">
                  <Button onClick={onClose} variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">
                    Fechar
                  </Button>
                  <Button onClick={handleEdit} className="gap-2 shadow-lg shadow-primary/20">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-end w-full gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="gap-2 shadow-lg shadow-primary/20">
                  <Save className="h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar Agendamento"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
