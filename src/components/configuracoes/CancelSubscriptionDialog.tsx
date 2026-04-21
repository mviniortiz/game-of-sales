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
import { Loader2, AlertTriangle, ArrowLeft, ArrowRight, HeartCrack } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatError } from "@/lib/utils";

const REASONS = [
  { id: "price", label: "Preço alto demais" },
  { id: "missing_features", label: "Faltam funcionalidades" },
  { id: "not_using", label: "Não estou usando" },
  { id: "switching", label: "Vou usar outra ferramenta" },
  { id: "business_closed", label: "Encerrei a operação" },
  { id: "other", label: "Outro motivo" },
];

interface CancelSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  planLabel: string;
  onCancelled: (endsAt: string) => void;
}

export function CancelSubscriptionDialog({
  open,
  onClose,
  companyId,
  planLabel,
  onCancelled,
}: CancelSubscriptionDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1);
    setSelectedReason(null);
    setFreeText("");
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const reasonLabel = REASONS.find((r) => r.id === selectedReason)?.label || "";
      const reasonPayload = [reasonLabel, freeText.trim()].filter(Boolean).join(" — ");

      const { data, error } = await supabase.functions.invoke("mercadopago-cancel-subscription", {
        body: { companyId, reason: reasonPayload || null },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao cancelar");

      toast.success("Assinatura cancelada");
      onCancelled(data.ends_at);
      reset();
      onClose();
    } catch (error) {
      console.error("[CancelSubscriptionDialog]", error);
      toast.error(`Erro ao cancelar: ${formatError(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] p-0 overflow-hidden bg-card border-border">
        {/* ── Step 1: reason ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <HeartCrack className="h-5 w-5 text-rose-400" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-base font-semibold text-foreground">
                    Cancelar assinatura
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Etapa 1 de 2 · Conta pra gente o motivo
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pb-2 space-y-2">
              {REASONS.map((r) => {
                const active = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm transition-all border ${
                      active
                        ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
                        : "bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-colors shrink-0 ${
                          active ? "border-emerald-400 bg-emerald-400" : "border-muted-foreground/40"
                        }`}
                      />
                      <span style={{ fontWeight: active ? 600 : 500 }}>{r.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedReason === "other" && (
              <div className="px-6 pb-2">
                <Textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value.slice(0, 300))}
                  placeholder="Descreve o motivo em uma frase"
                  className="text-sm resize-none bg-background border-border"
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground mt-1 text-right tabular-nums">
                  {freeText.length}/300
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/50 bg-muted/10">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs h-8">
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={
                  !selectedReason || (selectedReason === "other" && !freeText.trim())
                }
                className="h-8 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
              >
                Continuar
                <ArrowRight className="h-3 w-3 ml-1.5" />
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: confirmation ───────────────────────────── */}
        {step === 2 && (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-base font-semibold text-foreground">
                    Confirmar cancelamento
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Etapa 2 de 2 · Essa ação encerra seu plano
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pb-3 space-y-3">
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-2">
                <p className="text-sm text-foreground" style={{ fontWeight: 600 }}>
                  O que vai acontecer
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <li>• Sua assinatura do <strong className="text-foreground">{planLabel}</strong> será cancelada no Mercado Pago</li>
                  <li>• Você mantém acesso até o fim do ciclo pago atual</li>
                  <li>• Após isso, a conta vira plano Free e os limites reduzem</li>
                  <li>• Seus dados ficam preservados — pode reativar a qualquer momento</li>
                </ul>
              </div>

              <div className="text-[11px] text-muted-foreground/70 leading-relaxed">
                Se mudar de ideia, você pode reativar o plano direto por aqui depois — sem precisar configurar nada de novo.
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/50 bg-muted/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="text-xs h-8"
              >
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={submitting}
                className="h-8 text-xs bg-rose-500 hover:bg-rose-600 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Confirmar cancelamento"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
