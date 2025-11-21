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

interface Agendamento {
  id: string;
  cliente_nome: string;
  data_agendamento: string;
  observacoes: string;
  status: string;
  user_id: string;
}

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
      const googleEventId = (agendamento as any).google_event_id;
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
      const googleEventId = (agendamento as any).google_event_id;
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

  const getStatusBadge = (status: string) => {
    const variants = {
      agendado: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Agendado" },
      realizado: { color: "bg-green-500/10 text-green-400 border-green-500/20", label: "Realizado" },
      cancelado: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Cancelado" },
    };
    
    const variant = variants[status as keyof typeof variants] || variants.agendado;
    
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
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                {isEditing ? "Editar Agendamento" : "Detalhes do Agendamento"}
              </DialogTitle>
              {!isEditing && getStatusBadge(agendamento.status)}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!isEditing ? (
              // View Mode
              <>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Cliente</Label>
                      <p className="text-lg font-semibold">{agendamento.cliente_nome}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Data</Label>
                        <p className="font-semibold">
                          {format(new Date(agendamento.data_agendamento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Horário</Label>
                        <p className="font-semibold">
                          {format(new Date(agendamento.data_agendamento), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {agendamento.observacoes && (
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Observações</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{agendamento.observacoes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_nome">Cliente *</Label>
                  <Input
                    id="cliente_nome"
                    value={editedData.cliente_nome}
                    onChange={(e) => setEditedData({ ...editedData, cliente_nome: e.target.value })}
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data *</Label>
                    <Input
                      id="data"
                      type="date"
                      value={editedData.data_agendamento}
                      onChange={(e) => setEditedData({ ...editedData, data_agendamento: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hora">Horário *</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={editedData.hora_agendamento}
                      onChange={(e) => setEditedData({ ...editedData, hora_agendamento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={editedData.status} onValueChange={(value) => setEditedData({ ...editedData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={editedData.observacoes}
                    onChange={(e) => setEditedData({ ...editedData, observacoes: e.target.value })}
                    placeholder="Adicione observações sobre o agendamento"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
                <Button onClick={handleEdit} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                  <Save className="h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </>
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
