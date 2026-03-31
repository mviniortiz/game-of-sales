import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useReminderMutations } from "@/hooks/useReminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AddReminderFormProps {
  dealId: string;
  dealTitle: string;
  onClose?: () => void;
}

function getNextMonday9am(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const d = new Date(now);
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(9, 0, 0, 0);
  return d;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const PRESETS = [
  {
    label: "Amanha 9h",
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Em 2 dias",
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Próxima segunda",
    getDate: getNextMonday9am,
  },
  {
    label: "Em 1 semana",
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

export function AddReminderForm({ dealId, dealTitle, onClose }: AddReminderFormProps) {
  const { user, companyId, isSuperAdmin } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  const { createReminder } = useReminderMutations(user?.id, effectiveCompanyId);

  const [title, setTitle] = useState(`Follow-up: ${dealTitle}`);
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState("");

  const handlePreset = (getDate: () => Date) => {
    setRemindAt(toLocalDatetimeString(getDate()));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Informe um título para o lembrete");
      return;
    }
    if (!remindAt) {
      toast.error("Selecione uma data/hora para o lembrete");
      return;
    }

    try {
      await createReminder.mutateAsync({
        dealId,
        title: title.trim(),
        description: description.trim() || undefined,
        remindAt: new Date(remindAt).toISOString(),
      });
      toast.success("Lembrete agendado!");
      onClose?.();
    } catch {
      toast.error("Erro ao criar lembrete");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <CalendarClock className="h-4 w-4 text-primary" />
        Agendar Lembrete
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Follow-up com cliente"
            className="h-8 text-xs mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Data e Hora</Label>
          <Input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className="h-8 text-xs mt-1"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => handlePreset(p.getDate)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div>
          <Label className="text-xs">Descrição (opcional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas sobre o follow-up..."
            className="text-xs mt-1 min-h-[60px] resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onClose && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
            Cancelar
          </Button>
        )}
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={createReminder.isPending}
        >
          {createReminder.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Salvar
        </Button>
      </div>
    </div>
  );
}
