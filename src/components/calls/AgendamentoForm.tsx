import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AgendamentoFormProps {
  onSuccess: () => void;
}

export const AgendamentoForm = ({ onSuccess }: AgendamentoFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nome: "",
    data_agendamento: "",
    observacoes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Criar agendamento local
      const { data: newAgendamento, error } = await supabase
        .from("agendamentos")
        .insert({
          user_id: user.id,
          cliente_nome: formData.cliente_nome,
          data_agendamento: formData.data_agendamento,
          observacoes: formData.observacoes || null,
          status: "agendado",
        })
        .select()
        .single();

      if (error) throw error;

      // Verificar se usuário tem Google Calendar conectado
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_access_token")
        .eq("id", user.id)
        .single();

      // Se tiver Google Calendar, sincronizar automaticamente
      if (profile?.google_access_token && newAgendamento) {
        try {
          const response = await supabase.functions.invoke("google-calendar-sync", {
            body: {
              action: "create_event",
              userId: user.id,
              agendamentoData: {
                id: newAgendamento.id,
                cliente_nome: newAgendamento.cliente_nome,
                data_agendamento: newAgendamento.data_agendamento,
                observacoes: newAgendamento.observacoes,
              },
            },
          });

          if (!response.error && response.data?.eventId) {
            // Atualizar agendamento com google_event_id
            await supabase
              .from("agendamentos")
              .update({
                google_event_id: response.data.eventId,
                synced_with_google: true,
                last_synced_at: new Date().toISOString(),
              })
              .eq("id", newAgendamento.id);

            toast.success("Agendamento criado e sincronizado com Google Calendar!");
          } else {
            toast.success("Agendamento criado!");
          }
        } catch (syncError) {
          console.error("Erro ao sincronizar com Google:", syncError);
          toast.success("Agendamento criado (sem sincronizar com Google)");
        }
      } else {
        toast.success("Agendamento criado com sucesso!");
      }

      setFormData({ cliente_nome: "", data_agendamento: "", observacoes: "" });
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao criar agendamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Novo Agendamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
            <Input
              id="cliente_nome"
              required
              value={formData.cliente_nome}
              onChange={(e) =>
                setFormData({ ...formData, cliente_nome: e.target.value })
              }
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_agendamento">Data e Hora *</Label>
            <Input
              id="data_agendamento"
              type="datetime-local"
              required
              value={formData.data_agendamento}
              onChange={(e) =>
                setFormData({ ...formData, data_agendamento: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Agendando..." : "Agendar Call"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
