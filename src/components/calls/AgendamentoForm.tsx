import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendamentoFormProps {
  onSuccess: () => void;
}

export const AgendamentoForm = ({ onSuccess }: AgendamentoFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const initialDate = (() => {
    const base = new Date();
    base.setSeconds(0, 0);
    // alinhar aos múltiplos de 5 min para bater com opções do select
    const roundedMinutes = Math.floor(base.getMinutes() / 5) * 5;
    base.setMinutes(roundedMinutes);
    return base;
  })();
  const [formData, setFormData] = useState({
    cliente_nome: "",
    data_agendamento: format(initialDate, "yyyy-MM-dd'T'HH:mm"),
    observacoes: "",
  });
  const [dateTime, setDateTime] = useState<Date>(initialDate);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const updateDateTime = (nextDate: Date) => {
    setDateTime(nextDate);
    setFormData((prev) => ({
      ...prev,
      data_agendamento: format(nextDate, "yyyy-MM-dd'T'HH:mm"),
    }));
  };

  const handleCalendarSelect = (selected?: Date) => {
    if (!selected) return;
    const updated = new Date(selected);
    updated.setHours(dateTime.getHours(), dateTime.getMinutes(), 0, 0);
    updateDateTime(updated);
  };

  const handleHourChange = (value: string) => {
    const hour = Number(value);
    const updated = new Date(dateTime);
    updated.setHours(hour);
    updateDateTime(updated);
  };

  const handleMinuteChange = (value: string) => {
    const minute = Number(value);
    const updated = new Date(dateTime);
    updated.setMinutes(minute);
    updateDateTime(updated);
  };

  const setNow = () => {
    const now = new Date();
    updateDateTime(now);
  };

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
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          Novo Agendamento
        </CardTitle>
        <p className="text-xs text-muted-foreground">Agendar nova call com cliente</p>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cliente_nome" className="text-xs text-muted-foreground">Nome do Cliente *</Label>
            <Input
              id="cliente_nome"
              required
              value={formData.cliente_nome}
              onChange={(e) =>
                setFormData({ ...formData, cliente_nome: e.target.value })
              }
              placeholder="Nome completo"
              className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground placeholder:text-muted-foreground focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="data_agendamento" className="text-xs text-muted-foreground">Data e Hora *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground hover:bg-muted"
                >
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {dateTime ? (
                    <span className="text-sm">
                      {format(dateTime, "dd/MM/yyyy '•' HH:mm")}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Selecione data e hora</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[440px] p-4 bg-card border-border shadow-lg" align="start">
                <div className="space-y-4">
                  <CalendarPicker
                    mode="single"
                    selected={dateTime}
                    onSelect={handleCalendarSelect}
                    className="rounded-lg border border-border bg-card px-3 py-2"
                    locale={ptBR}
                    initialFocus
                  />
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Hora
                      </Label>
                      <Select value={String(dateTime.getHours())} onValueChange={handleHourChange}>
                        <SelectTrigger className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-48">
                          {hours.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {String(h).padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Minutos</Label>
                      <Select value={String(dateTime.getMinutes())} onValueChange={handleMinuteChange}>
                        <SelectTrigger className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-48">
                          {minutes.map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {String(m).padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={setNow}
                    >
                      Agora
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 border-primary/60 text-primary hover:bg-primary/10"
                      onClick={() => updateDateTime(dateTime)}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes" className="text-xs text-muted-foreground">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Informações adicionais..."
              rows={2}
              className="bg-white dark:bg-secondary border-gray-300 dark:border-border text-foreground placeholder:text-muted-foreground resize-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/25 hover:scale-[1.01] transition-transform" 
            disabled={loading}
          >
            {loading ? "Agendando..." : "Agendar Call"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
