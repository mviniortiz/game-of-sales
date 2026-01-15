import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { XCircle, Loader2 } from "lucide-react";

const LOSS_REASONS = [
  { id: "price", label: "Preço muito alto", emoji: "💰" },
  { id: "competitor", label: "Escolheu concorrente", emoji: "🏃" },
  { id: "timing", label: "Timing inadequado", emoji: "⏰" },
  { id: "budget", label: "Sem orçamento", emoji: "📉" },
  { id: "no_response", label: "Sem resposta", emoji: "📵" },
  { id: "not_qualified", label: "Não qualificado", emoji: "❌" },
  { id: "other", label: "Outro motivo", emoji: "📝" },
];

interface LostDealModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => Promise<void>;
  dealTitle: string;
}

export const LostDealModal = ({ open, onClose, onConfirm, dealTitle }: LostDealModalProps) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) return;

    setIsLoading(true);
    try {
      const reasonLabel = LOSS_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
      const fullReason = notes ? `${reasonLabel}: ${notes}` : reasonLabel;
      await onConfirm(fullReason, notes);
      setSelectedReason("");
      setNotes("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-slate-900/98 backdrop-blur-xl border-slate-800/80 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-800/60">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="p-2.5 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20">
              <XCircle className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <span className="text-lg font-semibold">Marcar como Perdida</span>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 truncate max-w-[300px]">
                {dealTitle}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Selecione o motivo da perda do deal
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label className="text-[13px] text-slate-300 font-medium mb-3 block">
              Qual o motivo da perda?
            </Label>

            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="space-y-2"
            >
              {LOSS_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                    border ${selectedReason === reason.id
                      ? "border-rose-500/50 bg-rose-500/10"
                      : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50"
                    }
                  `}
                >
                  <RadioGroupItem value={reason.id} className="border-slate-600" />
                  <span className="text-lg">{reason.emoji}</span>
                  <span className="text-sm text-slate-300">{reason.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-[13px] text-slate-300 font-medium mb-2 block">
                Descreva o motivo
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explique o motivo da perda..."
                className="min-h-[80px] bg-slate-950 border-slate-700/50 focus:border-rose-500 resize-none"
              />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800/60 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason || isLoading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Confirmar Perda"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

