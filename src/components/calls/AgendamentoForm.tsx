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
    <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          Novo Agendamento
        </CardTitle>
        <p className="text-xs text-slate-500">Agendar nova call com cliente</p>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cliente_nome" className="text-xs text-slate-400">Nome do Cliente *</Label>
            <Input
              id="cliente_nome"
              required
              value={formData.cliente_nome}
              onChange={(e) =>
                setFormData({ ...formData, cliente_nome: e.target.value })
              }
              placeholder="Nome completo"
              className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="data_agendamento" className="text-xs text-slate-400">Data e Hora *</Label>
            <Input
              id="data_agendamento"
              type="datetime-local"
              required
              value={formData.data_agendamento}
              onChange={(e) =>
                setFormData({ ...formData, data_agendamento: e.target.value })
              }
              className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes" className="text-xs text-slate-400">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Informações adicionais..."
              rows={2}
              className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 resize-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-medium" 
            disabled={loading}
          >
            {loading ? "Agendando..." : "Agendar Call"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
