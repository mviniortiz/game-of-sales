import { useState, useEffect } from "react";
import { Reorder, useDragControls, AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Settings2,
  GripVertical,
  Trash2,
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
  Plus,
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

// Available colors for stages with solid colors for dots
const AVAILABLE_COLORS = [
  { id: "gray", textColor: "text-gray-500 dark:text-gray-400", dotColor: "bg-gray-500", label: "Cinza" },
  { id: "blue", textColor: "text-blue-500 dark:text-blue-400", dotColor: "bg-blue-500", label: "Azul" },
  { id: "indigo", textColor: "text-emerald-500 dark:text-emerald-400", dotColor: "bg-emerald-500", label: "Verde" },
  { id: "purple", textColor: "text-emerald-500 dark:text-emerald-400", dotColor: "bg-emerald-500", label: "Verde Escuro" },
  { id: "amber", textColor: "text-amber-500 dark:text-amber-400", dotColor: "bg-amber-500", label: "Âmbar" },
  { id: "emerald", textColor: "text-emerald-500 dark:text-emerald-400", dotColor: "bg-emerald-500", label: "Verde" },
  { id: "rose", textColor: "text-rose-500 dark:text-rose-400", dotColor: "bg-rose-500", label: "Rosa" },
  { id: "cyan", textColor: "text-cyan-500 dark:text-cyan-400", dotColor: "bg-cyan-500", label: "Ciano" },
];

export interface StageConfig {
  id: string;
  title: string;
  iconId: string;
  colorId: string;
}

interface PipelineEditorProps {
  open: boolean;
  onClose: () => void;
  stages: StageConfig[];
  onSave: (stages: StageConfig[]) => void;
}

// Individual Stage Row Component
const StageRow = ({
  stage,
  index,
  onUpdate,
  onDelete,
  canDelete,
}: {
  stage: StageConfig;
  index: number;
  onUpdate: (field: keyof StageConfig, value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) => {
  const dragControls = useDragControls();
  const [isEditing, setIsEditing] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const IconComponent = AVAILABLE_ICONS.find(i => i.id === stage.iconId)?.icon || Target;
  const colorConfig = AVAILABLE_COLORS.find(c => c.id === stage.colorId) || AVAILABLE_COLORS[0];

  return (
    <Reorder.Item
      value={stage}
      id={stage.id}
      dragControls={dragControls}
      dragListener={false}
      className="relative"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        duration: 0.2,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        zIndex: 50,
      }}
    >
      <div className="flex items-center gap-3 px-3 py-3 h-16
        bg-card
        border border-border
        rounded-xl
        hover:border-emerald-500
        transition-colors duration-150
        group
      ">
        {/* Drag Handle */}
        <button
          onPointerDown={(e) => dragControls.start(e)}
          className="p-1 rounded cursor-grab active:cursor-grabbing touch-none
            text-muted-foreground
            hover:text-foreground
            hover:bg-muted
            transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Stage Number - Connected by line */}
        <div className="relative flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center
            bg-muted
            text-foreground
            text-xs font-bold
          ">
            {index + 1}
          </div>
          {/* Connecting line (hidden on last item via CSS) */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 
            bg-border
            group-last:hidden"
          />
        </div>

        {/* Stage Name Input */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              autoFocus
              value={stage.title}
              onChange={(e) => onUpdate("title", e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              className="h-8 bg-transparent border-0 border-b-2 border-emerald-500 rounded-none
                text-foreground font-medium
                focus:ring-0 focus:border-emerald-500
                px-0"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-left w-full px-2 py-1 -ml-2 rounded-md
                text-foreground font-medium
                hover:bg-muted
                transition-colors truncate"
            >
              {stage.title || "Sem nome"}
            </button>
          )}
        </div>

        {/* Icon Selector Popover */}
        <Popover open={iconOpen} onOpenChange={setIconOpen}>
          <PopoverTrigger asChild>
            <button
              className={`p-2 rounded-lg transition-colors
                ${colorConfig.textColor}
                bg-muted
                hover:bg-secondary`}
            >
              <IconComponent className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-card border-border" align="center">
            <div className="grid grid-cols-5 gap-1">
              {AVAILABLE_ICONS.map((iconOption) => {
                const Icon = iconOption.icon;
                return (
                  <button
                    key={iconOption.id}
                    onClick={() => {
                      onUpdate("iconId", iconOption.id);
                      setIconOpen(false);
                    }}
                    className={`p-2 rounded-lg transition-all
                      ${stage.iconId === iconOption.id
                        ? "bg-emerald-500/20 ring-2 ring-emerald-500"
                        : "hover:bg-muted"
                      }`}
                    title={iconOption.label}
                  >
                    <Icon className={`h-4 w-4 ${stage.iconId === iconOption.id
                      ? "text-emerald-500"
                      : "text-muted-foreground"}`}
                    />
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Color Selector Popover */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <button
              className="p-2 rounded-lg transition-colors
                bg-muted
                hover:bg-secondary"
            >
              <div className={`w-4 h-4 rounded-full ${colorConfig.dotColor} ring-2 ring-background`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-card border-border" align="center">
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_COLORS.map((colorOption) => (
                <button
                  key={colorOption.id}
                  onClick={() => {
                    onUpdate("colorId", colorOption.id);
                    setColorOpen(false);
                  }}
                  className={`p-1.5 rounded-lg transition-all
                    ${stage.colorId === colorOption.id
                      ? "bg-muted ring-2 ring-emerald-500"
                      : "hover:bg-muted"
                    }`}
                  title={colorOption.label}
                >
                  <div className={`w-5 h-5 rounded-full ${colorOption.dotColor}`} />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          disabled={!canDelete}
          className={`p-2 rounded-lg transition-all
            ${canDelete
              ? "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
              : "text-muted cursor-not-allowed"
            }`}
          title={canDelete ? "Remover estágio" : "Mínimo de 2 estágios"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
};

// Main Pipeline Editor Component
export const PipelineEditor = ({
  open,
  onClose,
  stages: initialStages,
  onSave
}: PipelineEditorProps) => {
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

  const handleDeleteStage = (index: number) => {
    if (stages.length <= 2) {
      toast.error("O pipeline precisa de pelo menos 2 estágios");
      return;
    }
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
  };

  const handleAddStage = () => {
    const newId = `stage_${Date.now()}`;
    const newStage: StageConfig = {
      id: newId,
      title: "",
      iconId: "target",
      colorId: "gray",
    };
    setStages([...stages, newStage]);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0
        bg-background
        border-border
        shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">

        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Settings2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-lg font-semibold">Editar Pipeline</span>
              <p className="text-[12px] text-muted-foreground font-normal mt-0.5">
                Arraste para reordenar, clique para editar
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure os estágios do seu pipeline de vendas
          </DialogDescription>
        </DialogHeader>

        {/* Stage List with Journey Line */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 scrollbar-thin relative">
          {/* Vertical Journey Line */}
          <div className="absolute left-[72px] top-8 bottom-8 w-0.5 bg-border rounded-full" />

          <Reorder.Group
            axis="y"
            values={stages}
            onReorder={setStages}
            className="space-y-2 relative"
          >
            <AnimatePresence initial={false}>
              {stages.map((stage, index) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  index={index}
                  onUpdate={(field, value) => handleUpdateStage(index, field, value)}
                  onDelete={() => handleDeleteStage(index)}
                  canDelete={stages.length > 2}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {/* Add Stage Button */}
          <motion.button
            onClick={handleAddStage}
            className="w-full mt-3 py-3 px-4 rounded-xl border-2 border-dashed 
              border-border
              text-muted-foreground
              hover:border-emerald-500
              hover:text-emerald-500
              hover:bg-emerald-500/5
              transition-all flex items-center justify-center gap-2 font-medium"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="h-4 w-4" />
            Adicionar Estágio
          </motion.button>
        </div>

        {/* Footer */}
        <div className="p-5 pt-4 border-t border-border flex justify-between items-center bg-card">
          <p className="text-[12px] text-muted-foreground">
            {stages.length} estágios
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border
                hover:bg-muted
                text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/25"
            >
              Salvar Pipeline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Export for backward compatibility
export { PipelineEditor as PipelineConfigModal };
