// Editor de funil (criar ou editar): nome e etapas. Arrasta pela alça para
// reordenar; o nome da etapa edita direto no campo; cor e ícone ficam num
// botão só. Etapa com negócio não sai (mostra quantos tem), e o funil precisa
// de pelo menos 2 etapas.
import { useEffect, useState } from "react";
import { AnimatePresence, Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { Archive, DotsSixVertical, Plus, Star, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_COLORS, AVAILABLE_ICONS, type StageConfig, type StageKind } from "@/lib/pipelineStyles";
import "./funilEditor.css";

const TIPOS: Record<StageKind, string> = { open: "Em aberto", won: "Ganho", lost: "Perdido" };
const EASE = [0.22, 1, 0.36, 1] as const;
// Sparkles e Zap ficam fora da escolha (regra visual do Vyzon). Etapa antiga
// que já usa um deles continua mostrando o ícone, só não dá para escolher de novo.
const ICONES_ESCOLHA = AVAILABLE_ICONS.filter((i) => i.id !== "sparkles" && i.id !== "zap");

interface PipelineEditorProps {
  open: boolean;
  onClose: () => void;
  /** "edit" mostra nome do funil + ações (padrão/arquivar); "create" é um funil novo. */
  mode?: "edit" | "create";
  name?: string;
  stages: StageConfig[];
  onSubmit: (data: { name: string; stages: StageConfig[] }) => void;
  /** stage_id -> nº de deals; bloqueia exclusão de etapa com negócios. */
  stageDealCounts?: Record<string, number>;
  busy?: boolean;
  isDefault?: boolean;
  canArchive?: boolean;
  onSetDefault?: () => void;
  onArchive?: () => void;
}

const Etapa = ({
  stage,
  index,
  dealCount,
  onUpdate,
  onDelete,
  canDelete,
  autoFocus,
}: {
  stage: StageConfig;
  index: number;
  dealCount: number;
  onUpdate: (field: keyof StageConfig, value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  autoFocus: boolean;
}) => {
  const drag = useDragControls();
  const reduce = useReducedMotion();
  const [aparencia, setAparencia] = useState(false);
  const Icone = AVAILABLE_ICONS.find((i) => i.id === stage.iconId)?.icon ?? AVAILABLE_ICONS[0].icon;
  const cor = AVAILABLE_COLORS.find((c) => c.id === stage.colorId) ?? AVAILABLE_COLORS[0];
  const motivo = dealCount > 0 ? `Tem ${dealCount} ${dealCount === 1 ? "negócio" : "negócios"} aqui. Mova antes de remover.` : "O funil precisa de pelo menos 2 etapas.";

  return (
    <Reorder.Item
      value={stage}
      id={stage.id}
      dragListener={false}
      dragControls={drag}
      className="vf-etapa"
      data-tipo={stage.kind}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: EASE }}
      whileDrag={reduce ? undefined : { scale: 1.015, boxShadow: "0 12px 32px -12px rgba(15,23,48,0.28)", zIndex: 5 }}
    >
      <button
        type="button"
        className="vf-alca"
        aria-label={`Arrastar a etapa ${stage.title || index + 1}`}
        onPointerDown={(e) => drag.start(e)}
      >
        <DotsSixVertical size={18} weight="bold" aria-hidden />
      </button>

      <Popover open={aparencia} onOpenChange={setAparencia}>
        <PopoverTrigger asChild>
          <button type="button" className="vf-aparencia" aria-label={`Cor e ícone da etapa ${stage.title || index + 1}`}>
            <span className={`vf-aparencia__cor ${cor.dotColor}`} aria-hidden />
            <Icone className="h-4 w-4" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="vf-pop w-[244px] p-3">
          <p className="vf-pop__rotulo">Cor</p>
          <div className="vf-pop__grade">
            {AVAILABLE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                aria-pressed={stage.colorId === c.id}
                className="vf-pop__op"
                onClick={() => onUpdate("colorId", c.id)}
              >
                <span className={`h-4 w-4 rounded-full ${c.dotColor}`} />
              </button>
            ))}
          </div>
          <p className="vf-pop__rotulo mt-3">Ícone</p>
          <div className="vf-pop__grade">
            {ICONES_ESCOLHA.map((i) => {
              const I = i.icon;
              return (
                <button
                  key={i.id}
                  type="button"
                  title={i.label}
                  aria-label={i.label}
                  aria-pressed={stage.iconId === i.id}
                  className="vf-pop__op"
                  onClick={() => {
                    onUpdate("iconId", i.id);
                    setAparencia(false);
                  }}
                >
                  <I className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <input
        className="vf-nome"
        value={stage.title}
        placeholder="Nome da etapa"
        aria-label={`Nome da etapa ${index + 1}`}
        autoFocus={autoFocus}
        onChange={(e) => onUpdate("title", e.target.value)}
      />

      {dealCount > 0 && (
        <span className="vf-conta" title={`${dealCount} ${dealCount === 1 ? "negócio" : "negócios"} nesta etapa`}>
          {dealCount}
        </span>
      )}

      <Select value={stage.kind} onValueChange={(v) => onUpdate("kind", v)}>
        <SelectTrigger className="vf-tipo" aria-label="Tipo da etapa">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(TIPOS) as StageKind[]).map((k) => (
            <SelectItem key={k} value={k}>
              {TIPOS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        className="vp-icone vp-icone--chico vp-icone--perigo"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Remover a etapa ${stage.title || index + 1}`}
        title={canDelete ? "Remover etapa" : motivo}
      >
        <Trash size={16} aria-hidden />
      </button>
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
  const [nova, setNova] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStages(initialStages);
      setName(initialName);
      setNova(null);
    }
  }, [open, initialStages, initialName]);

  const atualizar = (index: number, field: keyof StageConfig, value: string) =>
    setStages((s) => s.map((st, i) => (i === index ? { ...st, [field]: value } : st)));

  const remover = (index: number) => {
    if (stages.length <= 2) {
      toast.error("O funil precisa de pelo menos 2 etapas.");
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const adicionar = () => {
    const id = `stage_${stages.length}_${Math.round(performance.now())}`;
    // A nova entra antes de Ganho/Perdido, que costumam fechar o funil.
    const fim = stages.findIndex((s) => s.kind !== "open");
    const at = fim === -1 ? stages.length : fim;
    const next = [...stages];
    next.splice(at, 0, { id, title: "", iconId: "target", colorId: "gray", kind: "open" });
    setStages(next);
    setNova(id);
  };

  const salvar = () => {
    if (!name.trim()) return toast.error("Dê um nome ao funil.");
    if (stages.some((s) => !s.title.trim())) return toast.error("Toda etapa precisa de um nome.");
    if (!stages.some((s) => s.kind === "won")) {
      toast.warning("Sem uma etapa do tipo Ganho, as vendas deste funil não entram nos resultados.");
    }
    onSubmit({ name: name.trim(), stages });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="vf flex max-h-[88vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[620px]">
        <DialogHeader className="vf-cab">
          <DialogTitle className="vf-titulo">{mode === "create" ? "Novo funil" : "Editar funil"}</DialogTitle>
          <DialogDescription className="vf-sub">Arraste pela alça para mudar a ordem. Cada etapa tem um tipo: em aberto, ganho ou perdido.</DialogDescription>
        </DialogHeader>

        <div className="vf-corpo">
          <label className="vp-campo">
            <span className="vp-rotulo">Nome do funil</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vendas residenciais" />
          </label>

          <p className="vp-rotulo mb-2">
            Etapas <span className="font-normal text-[var(--vyz-text-muted)]">{stages.length}</span>
          </p>
          <Reorder.Group axis="y" values={stages} onReorder={setStages} className="vf-lista">
            <AnimatePresence initial={false}>
              {stages.map((stage, index) => (
                <Etapa
                  key={stage.id}
                  stage={stage}
                  index={index}
                  dealCount={stageDealCounts[stage.id] ?? 0}
                  onUpdate={(field, value) => atualizar(index, field, value)}
                  onDelete={() => remover(index)}
                  canDelete={stages.length > 2 && (stageDealCounts[stage.id] ?? 0) === 0}
                  autoFocus={stage.id === nova}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <button type="button" onClick={adicionar} className="vf-nova">
            <Plus size={15} weight="bold" aria-hidden />
            Adicionar etapa
          </button>
        </div>

        <div className="vf-rodape">
          {mode === "edit" && (
            <div className="mr-auto flex items-center gap-1">
              {isDefault ? (
                <span className="vf-padrao">
                  <Star size={13} weight="fill" aria-hidden />
                  Funil padrão
                </span>
              ) : (
                onSetDefault && (
                  <button type="button" onClick={onSetDefault} className="vp-botao vp-botao--quieto vp-botao--chico">
                    <Star size={14} aria-hidden />
                    Tornar padrão
                  </button>
                )
              )}
              {onArchive && canArchive && (
                <button type="button" onClick={onArchive} className="vp-botao vp-botao--quieto vp-botao--chico">
                  <Archive size={14} aria-hidden />
                  Arquivar
                </button>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="vp-botao vp-botao--quieto ml-auto">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={busy} className="vp-botao disabled:opacity-60">
            {busy ? "Salvando…" : mode === "create" ? "Criar funil" : "Salvar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Backward compat
export { PipelineEditor as PipelineConfigModal };
