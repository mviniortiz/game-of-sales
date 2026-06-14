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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, GripVertical, Trash2, Plus, Star, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  AVAILABLE_ICONS,
  AVAILABLE_COLORS,
  type StageConfig,
  type StageKind,
} from "@/lib/pipelineStyles";

const KIND_LABELS: Record<StageKind, string> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

interface PipelineEditorProps {
  open: boolean;
  onClose: () => void;
  /** "edit" mostra nome do funil + ações (padrão/arquivar); "create" é um funil novo. */
  mode?: "edit" | "create";
  name?: string;
  stages: StageConfig[];
  onSubmit: (data: { name: string; stages: StageConfig[] }) => void;
  /** stage_id -> nº de deals; bloqueia exclusão de estágio com negócios. */
  stageDealCounts?: Record<string, number>;
  busy?: boolean;
  isDefault?: boolean;
  canArchive?: boolean;
  onSetDefault?: () => void;
  onArchive?: () => void;
}

// Linha de um estágio (nome, kind, ícone, cor, remover)
const StageRow = ({
  stage,
  index,
  dealCount,
  onUpdate,
  onDelete,
  canDelete,
}: {
  stage: StageConfig;
  index: number;
  dealCount: number;
  onUpdate: (field: keyof StageConfig, value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) => {
  const dragControls = useDragControls();
  const [isEditing, setIsEditing] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const IconComponent = AVAILABLE_ICONS.find((i) => i.id === stage.iconId)?.icon || AVAILABLE_ICONS[0].icon;
  const colorConfig = AVAILABLE_COLORS.find((c) => c.id === stage.colorId) || AVAILABLE_COLORS[0];

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
      transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
      whileDrag={{ scale: 1.02, boxShadow: "0 10px 40px rgba(0,0,0,0.15)", zIndex: 50 }}
    >
      <div className="flex items-center gap-2 px-3 py-3 bg-card border border-border rounded-xl hover:border-emerald-500 transition-colors duration-150 group">
        {/* Drag Handle */}
        <button
          onPointerDown={(e) => dragControls.start(e)}
          className="p-1 rounded cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Number */}
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-foreground text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              autoFocus
              value={stage.title}
              onChange={(e) => onUpdate("title", e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              className="h-8 bg-transparent border-0 border-b-2 border-emerald-500 rounded-none text-foreground font-medium focus:ring-0 focus:border-emerald-500 px-0"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-left w-full px-2 py-1 -ml-2 rounded-md text-foreground font-medium hover:bg-muted transition-colors truncate"
            >
              {stage.title || "Sem nome"}
            </button>
          )}
        </div>

        {/* Kind (Aberto / Ganho / Perdido) */}
        <Select value={stage.kind} onValueChange={(v) => onUpdate("kind", v)}>
          <SelectTrigger className="h-8 w-[92px] text-[12px] flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">{KIND_LABELS.open}</SelectItem>
            <SelectItem value="won">{KIND_LABELS.won}</SelectItem>
            <SelectItem value="lost">{KIND_LABELS.lost}</SelectItem>
          </SelectContent>
        </Select>

        {/* Icon */}
        <Popover open={iconOpen} onOpenChange={setIconOpen}>
          <PopoverTrigger asChild>
            <button className="p-2 rounded-lg transition-colors bg-muted hover:bg-secondary flex-shrink-0">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
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
                    className={`p-2 rounded-lg transition-all ${
                      stage.iconId === iconOption.id ? "bg-emerald-500/20 ring-2 ring-emerald-500" : "hover:bg-muted"
                    }`}
                    title={iconOption.label}
                  >
                    <Icon className={`h-4 w-4 ${stage.iconId === iconOption.id ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Color */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <button className="p-2 rounded-lg transition-colors bg-muted hover:bg-secondary flex-shrink-0">
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
                  className={`p-1.5 rounded-lg transition-all ${
                    stage.colorId === colorOption.id ? "bg-muted ring-2 ring-emerald-500" : "hover:bg-muted"
                  }`}
                  title={colorOption.label}
                >
                  <div className={`w-5 h-5 rounded-full ${colorOption.dotColor}`} />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <button
          onClick={onDelete}
          disabled={!canDelete}
          className={`p-2 rounded-lg transition-all flex-shrink-0 ${
            canDelete
              ? "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
              : "text-muted cursor-not-allowed"
          }`}
          title={
            !canDelete && dealCount > 0
              ? `Mova os ${dealCount} negócios antes de remover`
              : !canDelete
                ? "Mínimo de 2 estágios"
                : "Remover estágio"
          }
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
};

export const PipelineEditor = ({
  open,
  onClose,
  mode = "edit",
  name: initialName = "",
  stages: initialStages,
  onSubmit,
  stageDealCounts = {},
  busy = false,
  isDefault = false,
  canArchive = false,
  onSetDefault,
  onArchive,
}: PipelineEditorProps) => {
  const [stages, setStages] = useState<StageConfig[]>(initialStages);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setStages(initialStages);
      setName(initialName);
    }
  }, [open, initialStages, initialName]);

  const handleUpdateStage = (index: number, field: keyof StageConfig, value: string) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const handleDeleteStage = (index: number) => {
    if (stages.length <= 2) {
      toast.error("O funil precisa de pelo menos 2 estágios");
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleAddStage = () => {
    setStages([
      ...stages,
      { id: `stage_${stages.length}_${Math.round(performance.now())}`, title: "", iconId: "target", colorId: "gray", kind: "open" },
    ]);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao funil");
      return;
    }
    if (stages.some((s) => !s.title.trim())) {
      toast.error("Todos os estágios precisam ter um nome");
      return;
    }
    if (!stages.some((s) => s.kind === "won")) {
      toast.warning("Sem um estágio 'Ganho', as vendas não serão sincronizadas a partir deste funil.");
    }
    onSubmit({ name: name.trim(), stages });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] p-0 gap-0 bg-background border-border shadow-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Settings2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <span className="text-lg font-semibold">{mode === "create" ? "Novo funil" : "Editar funil"}</span>
              <p className="text-[12px] text-muted-foreground font-normal mt-0.5">
                Arraste para reordenar; defina o tipo de cada estágio
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Configure o nome e os estágios do funil</DialogDescription>
        </DialogHeader>

        {/* Nome do funil */}
        <div className="px-5 pt-4">
          <label className="text-[12px] font-medium text-muted-foreground">Nome do funil</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Distribuição B2B"
            className="mt-1 h-9"
          />
        </div>

        {/* Lista de estágios */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 scrollbar-thin relative">
          <Reorder.Group axis="y" values={stages} onReorder={setStages} className="space-y-2 relative">
            <AnimatePresence initial={false}>
              {stages.map((stage, index) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  index={index}
                  dealCount={stageDealCounts[stage.id] ?? 0}
                  onUpdate={(field, value) => handleUpdateStage(index, field, value)}
                  onDelete={() => handleDeleteStage(index)}
                  canDelete={stages.length > 2 && (stageDealCounts[stage.id] ?? 0) === 0}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <motion.button
            onClick={handleAddStage}
            className="w-full mt-3 py-3 px-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 font-medium"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="h-4 w-4" />
            Adicionar Estágio
          </motion.button>
        </div>

        {/* Footer */}
        <div className="p-5 pt-4 border-t border-border flex items-center gap-3 bg-card">
          {mode === "edit" && (
            <div className="flex items-center gap-1.5 mr-auto">
              {onSetDefault && !isDefault && (
                <Button type="button" variant="ghost" size="sm" onClick={onSetDefault} className="text-muted-foreground hover:text-foreground">
                  <Star className="h-4 w-4 mr-1.5" />
                  Tornar padrão
                </Button>
              )}
              {isDefault && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
                  <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                  Funil padrão
                </span>
              )}
              {onArchive && canArchive && (
                <Button type="button" variant="ghost" size="sm" onClick={onArchive} className="text-muted-foreground hover:text-rose-500">
                  <Archive className="h-4 w-4 mr-1.5" />
                  Arquivar
                </Button>
              )}
            </div>
          )}
          <span className="text-[12px] text-muted-foreground ml-auto mr-2">{stages.length} estágios</span>
          <Button type="button" variant="outline" onClick={onClose} className="border-border hover:bg-muted text-foreground">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/25">
            {busy ? "Salvando..." : mode === "create" ? "Criar funil" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Backward compat
export { PipelineEditor as PipelineConfigModal };
