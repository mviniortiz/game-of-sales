import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ReportAgent } from "@/components/admin/ReportAgent";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { usePlan } from "@/hooks/usePlan";
import { Lock, Sparkles, ArrowRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "radix-ui";

interface EvaSidechatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EvaPaywallInline = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <EvaAvatar size={40} thinking={false} />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Conheça a Eva
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Sua analista de vendas com IA. Pergunte sobre faturamento, metas, ranking, produtos — ela responde com seus dados reais.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Disponível nos planos Plus e Pro</span>
        </div>

        <button
          onClick={() => {
            onClose();
            navigate("/upgrade?plan=plus");
          }}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Fazer upgrade
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const EvaSidechat = ({ open, onOpenChange }: EvaSidechatProps) => {
  const { needsUpgrade } = usePlan();
  const navigate = useNavigate();
  const blocked = needsUpgrade("eva");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "p-0 gap-0 flex flex-col",
          "w-full sm:max-w-[440px] md:max-w-[480px]",
          "bg-background border-l border-border",
          "[&>button]:hidden",
        )}
      >
        <VisuallyHidden.Root>
          <SheetTitle>Eva — analista com IA</SheetTitle>
        </VisuallyHidden.Root>

        {/* Action bar fina no topo — só com botões de ação, sem título duplicado */}
        <div className="flex items-center justify-end gap-1 px-3 h-10 shrink-0">
          <button
            onClick={() => {
              onOpenChange(false);
              navigate("/agente");
            }}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Abrir em tela cheia"
            aria-label="Abrir em tela cheia"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Fechar Eva"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {blocked ? (
          <EvaPaywallInline onClose={() => onOpenChange(false)} />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
            <ReportAgent />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
