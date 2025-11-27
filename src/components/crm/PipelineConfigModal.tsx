import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings2, 
  GripVertical,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Star,
  XCircle,
  LucideIcon
} from "lucide-react";
import { toast } from "sonner";

// Available icons for stages
const AVAILABLE_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "target", icon: Target, label: "Alvo" },
  { id: "users", icon: Users, label: "Usuários" },
  { id: "dollar", icon: DollarSign, label: "Dinheiro" },
  { id: "trending", icon: TrendingUp, label: "Crescimento" },
  { id: "check", icon: CheckCircle, label: "Concluído" },
  { id: "alert", icon: AlertCircle, label: "Alerta" },
  { id: "sparkles", icon: Sparkles, label: "Destaque" },
  { id: "zap", icon: Zap, label: "Rápido" },
  { id: "star", icon: Star, label: "Estrela" },
  { id: "x", icon: XCircle, label: "Cancelado" },
];

// Available colors for stages
const AVAILABLE_COLORS = [
  { id: "gray", color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", label: "Cinza" },
  { id: "blue", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Azul" },
  { id: "indigo", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", label: "Índigo" },
  { id: "purple", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", label: "Roxo" },
  { id: "amber", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Âmbar" },
  { id: "emerald", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Verde" },
  { id: "rose", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Rosa" },
  { id: "cyan", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", label: "Ciano" },
];

export interface StageConfig {
  id: string;
  title: string;
  iconId: string;
  colorId: string;
}

interface PipelineConfigModalProps {
  open: boolean;
  onClose: () => void;
  stages: StageConfig[];
  onSave: (stages: StageConfig[]) => void;
}

export const PipelineConfigModal = ({ 
  open, 
  onClose, 
  stages: initialStages,
  onSave 
}: PipelineConfigModalProps) => {
  const [stages, setStages] = useState<StageConfig[]>(initialStages);

  // Reset stages when modal opens
  useEffect(() => {
    if (open) {
      setStages(initialStages);
    }
  }, [open, initialStages]);

  const handleUpdateStage = (index: number, field: keyof StageConfig, value: string) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const handleSave = () => {
    // Validate all stages have titles
    const emptyStage = stages.find(s => !s.title.trim());
    if (emptyStage) {
      toast.error("Todos os estágios precisam ter um nome");
      return;
    }

    onSave(stages);
    toast.success("Pipeline atualizado com sucesso!");
    onClose();
  };

  const getIconComponent = (iconId: string) => {
    const iconConfig = AVAILABLE_ICONS.find(i => i.id === iconId);
    return iconConfig?.icon || Target;
  };

  const getColorConfig = (colorId: string) => {
    return AVAILABLE_COLORS.find(c => c.id === colorId) || AVAILABLE_COLORS[0];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900/98 backdrop-blur-xl border-slate-800/80 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-slate-800/60">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Settings2 className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-lg font-semibold">Personalizar Pipeline</span>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                Customize os nomes, ícones e cores dos estágios
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure a aparência visual dos estágios do seu pipeline de vendas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
          {stages.map((stage, index) => {
            const IconComponent = getIconComponent(stage.iconId);
            const colorConfig = getColorConfig(stage.colorId);

            return (
              <div
                key={stage.id}
                className="group relative bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-indigo-500/30 transition-all"
              >
                {/* Stage number indicator */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {index + 1}
                </div>

                <div className="flex items-start gap-4">
                  {/* Stage Preview */}
                  <div className={`p-2.5 rounded-xl ${colorConfig.bg} ring-1 ring-white/5 flex-shrink-0`}>
                    <IconComponent className={`h-5 w-5 ${colorConfig.color}`} />
                  </div>

                  {/* Stage Config */}
                  <div className="flex-1 space-y-3">
                    {/* Title Input */}
                    <div>
                      <Label className="text-[11px] text-slate-500 uppercase tracking-wider">Nome do Estágio</Label>
                      <Input
                        value={stage.title}
                        onChange={(e) => handleUpdateStage(index, "title", e.target.value)}
                        placeholder="Ex: Qualificação"
                        className="h-9 mt-1 bg-slate-950 border-slate-700/50 focus:border-indigo-500 text-sm"
                      />
                    </div>

                    {/* Icon & Color Selectors */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Icon Selector */}
                      <div>
                        <Label className="text-[11px] text-slate-500 uppercase tracking-wider">Ícone</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {AVAILABLE_ICONS.map((iconOption) => {
                            const Icon = iconOption.icon;
                            return (
                              <button
                                key={iconOption.id}
                                type="button"
                                onClick={() => handleUpdateStage(index, "iconId", iconOption.id)}
                                className={`
                                  p-1.5 rounded-lg transition-all
                                  ${stage.iconId === iconOption.id 
                                    ? "bg-indigo-500/20 ring-1 ring-indigo-500/50" 
                                    : "bg-slate-800 hover:bg-slate-700"
                                  }
                                `}
                                title={iconOption.label}
                              >
                                <Icon className={`h-4 w-4 ${stage.iconId === iconOption.id ? "text-indigo-400" : "text-slate-400"}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Color Selector */}
                      <div>
                        <Label className="text-[11px] text-slate-500 uppercase tracking-wider">Cor</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {AVAILABLE_COLORS.map((colorOption) => (
                            <button
                              key={colorOption.id}
                              type="button"
                              onClick={() => handleUpdateStage(index, "colorId", colorOption.id)}
                              className={`
                                w-6 h-6 rounded-full transition-all
                                ${colorOption.bg.replace('/10', '')}
                                ${stage.colorId === colorOption.id 
                                  ? "ring-2 ring-offset-2 ring-offset-slate-800 ring-white/50 scale-110" 
                                  : "hover:scale-110"
                                }
                              `}
                              title={colorOption.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/60 flex justify-between items-center">
          <p className="text-[12px] text-slate-500">
            {stages.length} estágios no pipeline
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25"
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
