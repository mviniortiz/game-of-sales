import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock, Phone, Calendar, CheckCircle2, Flame, Trash2, Copy,
  Pencil, MessageSquare, ArrowRight, ChevronLeft, ChevronRight, GripVertical,
  Building2, AlertTriangle, MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, isPast, parseISO, formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Deal } from "@/pages/CRM";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSwipeToMove } from "@/hooks/useSwipeToMove";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { proximaAcaoLabel } from "@/lib/eva/qualificationSchema";
import type { QuoteItem } from "@/hooks/useQuoteBoard";
import { ago, evaLine, stateLine } from "@/lib/quoteText";
import type { PipelineDealContext } from "@/hooks/usePipelineContextData";
// F6T.2 — tags transversais (sistema F6T.1) substituem visualmente o deal_tags legado
import type { Tag } from "@/types/tags";
import { getTagColorClass, isHexColor } from "@/lib/tags";
import { EvaBot } from "@/components/eva/EvaBot";

export interface StageNeighbors {
  prev: { id: string; title: string; color: string } | null;
  next: { id: string; title: string; color: string } | null;
}

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  formatCurrency: (value: number) => string;
  onClick?: () => void;
  onDelete?: (deal: Deal) => void;
  /** Move o card para a etapa de ganho do funil (mesmo caminho do arraste). */
  onMarkWon?: (deal: Deal) => void;
  /** Orçamento aberto deste card no placar (quote_tracking), quando houver. */
  quote?: QuoteItem | null;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (dealId: string) => void;
  stageNeighbors?: StageNeighbors;
  onSwipeMove?: (deal: Deal, targetStageId: string) => void;
  /** F5P.2 — contexto comercial enriquecido (conversa + EVA) */
  context?: PipelineDealContext;
  /** F6T.2 — tags transversais (sistema F6T.1) carregadas batched no nível superior */
  tags?: Tag[];
}

// LP-PIPE.2 "Fio da Conversa" — a leitura da EVA é texto curto, NÃO o conteúdo
// da mensagem. Deriva da temperatura quando não há proxima_acao explícita.
// REGRA DE PRIVACIDADE: nunca exibir trecho de mensagem do cliente — só a
// interpretação que a EVA já produziu (temperature/proximaAcao/isStale).
const EVA_DERIVED_READ: Record<string, string> = {
  quente: "Pronto pra avançar",
  morno: "Aquecendo",
  frio: "Esfriando",
  unknown: "Aguardando leitura",
};

// Estado do orçamento em linguagem de dono. Âmbar = parado; azul = a vez é sua.
export function quoteStatus(q: QuoteItem): { text: string; tone: string; dot: string } | null {
  switch (q.state) {
    case "no_reply":
      return { text: `Sem resposta ao orçamento · ${ago(q.days)}`, tone: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" };
    case "went_quiet":
      return { text: `Cliente sumiu · ${ago(q.days)}`, tone: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" };
    case "your_turn":
      return { text: `Cliente esperando você · ${ago(q.days)}`, tone: "text-[var(--vyz-accent-text)]", dot: "bg-[var(--vyz-accent)]" };
    case "talking":
      return { text: "Em conversa sobre o orçamento", tone: "text-[var(--vyz-text-muted)]", dot: "bg-emerald-500" };
    default:
      return null;
  }
}

// O Pipeline troca kanban por lista e liga o swipe abaixo de 640px (breakpoint
// sm do CRM.tsx); o cartão precisa usar o mesmo corte, senão entre 640 e 767px
// o arraste fica desligado num board que é de computador.
const BELOW_SM = "(max-width: 639px)";
function useBelowSm() {
  const [below, setBelow] = useState(() => typeof window !== "undefined" && window.matchMedia(BELOW_SM).matches);
  useEffect(() => {
    const mq = window.matchMedia(BELOW_SM);
    const onChange = () => setBelow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return below;
}

// Format BRL as user types (same as NewDealModal)
const formatBRL = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseBRL = (formatted: string) =>
  parseFloat(formatted.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

type EditableField = "title" | "customer_name" | "value";

export const DealCard = memo(({ deal, isDragging = false, formatCurrency, onDelete, onMarkWon, quote = null, selectionMode = false, isSelected = false, onToggleSelect, stageNeighbors, onSwipeMove, context, tags = [] }: DealCardProps) => {
  const navigate = useNavigate();
  const isMobile = useBelowSm();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const swipeRef = useRef<HTMLDivElement | null>(null);

  // Inline edit state
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: deal.id,
    transition: { duration: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    disabled: isMobile,
  });

  // Swipe gesture (mobile only)
  const handleSwipeComplete = useCallback((direction: "left" | "right") => {
    if (!onSwipeMove || !stageNeighbors) return;
    const target = direction === "left" ? stageNeighbors.prev : stageNeighbors.next;
    if (target) onSwipeMove(deal, target.id);
  }, [deal, stageNeighbors, onSwipeMove]);

  const swipe = useSwipeToMove({
    onSwipeComplete: handleSwipeComplete,
    enabled: isMobile && !selectionMode && !!stageNeighbors,
    elementRef: swipeRef,
  });

  // Clamp swipe offset: can't swipe left without prev or right without next
  const clampedOffset = (() => {
    if (!swipe.isSwiping) return 0;
    let dx = swipe.offsetX;
    if (dx < 0 && !stageNeighbors?.prev) dx = 0;
    if (dx > 0 && !stageNeighbors?.next) dx = 0;
    return dx;
  })();

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    swipeRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? "none" : transition,
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isBeingDragged = isDragging || isSortableDragging;

  // LP-PIPE.2 — "ao vivo": última mensagem nas últimas 24h (sinal verde discreto).
  const isLive = (() => {
    const ts = context?.lastMessageAt;
    if (!ts) return false;
    const diff = Date.now() - new Date(ts).getTime();
    return diff >= 0 && diff < 24 * 60 * 60 * 1000;
  })();

  const daysSince = deal.updated_at
    ? differenceInDays(new Date(), new Date(deal.updated_at)) : 0;


  // "Sem movimento" só quando não há orçamento dizendo algo melhor sobre o card.
  const showNoMovement =
    !(quote && quoteStatus(quote)) && daysSince > 3 && deal.stage !== "closed_won" && deal.stage !== "closed_lost";

  // Is close date overdue?
  const isOverdue = deal.expected_close_date
    ? isPast(parseISO(deal.expected_close_date)) : false;

  // Whether inline editing is allowed (disabled in selection mode)
  const canInlineEdit = !selectionMode;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    pressStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isBeingDragged) return;
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelect?.(deal.id);
      return;
    }
    if (editingField) return; // Don't navigate while editing
    // Mesmo limiar do PointerSensor do CRM (6px): abaixo disso foi clique, não arraste.
    const start = pressStart.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 6) return;
    e.stopPropagation();
    navigate(`/deals/${deal.id}`);
  }, [isBeingDragged, deal.id, navigate, selectionMode, onToggleSelect, editingField]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    if (selectionMode) onToggleSelect?.(deal.id);
    else navigate(`/deals/${deal.id}`);
  }, [deal.id, navigate, selectionMode, onToggleSelect]);

  const handleQuickAction = useCallback((action: "phone" | "calendar" | "won" | "delete" | "duplicate") => {
    switch (action) {
      case "phone":
        if (deal.customer_phone) window.open(`tel:${deal.customer_phone}`, "_self");
        else toast.info("Este card não tem telefone cadastrado.");
        break;
      case "calendar":
        navigate(`/calendario?deal=${deal.id}`);
        break;
      case "won":
        onMarkWon?.(deal);
        break;
      case "delete":
        onDelete?.(deal);
        break;
      case "duplicate":
        (async () => {
          try {
            // Get max position in same stage (mesmo funil/estágio)
            let posQuery = supabase
              .from("deals")
              .select("position")
              .eq("user_id", user?.id ?? "")
              .order("position", { ascending: false })
              .limit(1);
            posQuery = deal.stage_id
              ? posQuery.eq("stage_id", deal.stage_id)
              : posQuery.eq("stage", deal.stage);
            const { data: maxPosData } = await posQuery;
            const newPosition = (maxPosData?.[0]?.position ?? 0) + 1;

            const { error } = await supabase.from("deals").insert({
              title: `Cópia - ${deal.title}`,
              value: deal.value,
              customer_name: deal.customer_name,
              customer_email: deal.customer_email ?? null,
              customer_phone: deal.customer_phone ?? null,
              stage: deal.stage,
              stage_id: deal.stage_id ?? null,
              pipeline_id: deal.pipeline_id ?? null,
              is_active: deal.is_active ?? true,
              product_id: deal.product_id ?? null,
              notes: deal.notes ?? null,
              expected_close_date: deal.expected_close_date ?? null,
              probability: deal.probability,
              is_hot: deal.is_hot ?? false,
              company_id: deal.company_id ?? null,
              user_id: user?.id ?? "",
              position: newPosition,
            });

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["deals"] });
            toast.success("Negociação duplicada!");
          } catch (err) {
            console.error("Failed to duplicate deal:", err);
            toast.error("Erro ao duplicar negociação");
          }
        })();
        break;
    }
  }, [deal, navigate, onDelete, onMarkWon, user, queryClient]);

  // ── Inline editing logic ──────────────────────────────────
  const startEditing = useCallback((field: EditableField, e: React.MouseEvent) => {
    if (!canInlineEdit) return;
    e.stopPropagation();
    e.preventDefault();
    if (field === "value") {
      const cents = Math.round(deal.value * 100).toString();
      setEditValue(formatBRL(cents));
    } else if (field === "customer_name") {
      setEditValue(deal.customer_name || "");
    } else if (field === "title") {
      setEditValue(deal.title || "");
    }
    setEditingField(field);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [deal.value, deal.customer_name, deal.title, canInlineEdit]);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
    setEditValue("");
  }, []);

  const saveField = useCallback(async () => {
    if (!editingField || isSaving) return;

    let updateData: Record<string, unknown> = {};
    if (editingField === "value") {
      const numVal = parseBRL(editValue);
      if (numVal === deal.value) { cancelEditing(); return; }
      if (numVal <= 0) { cancelEditing(); return; }
      updateData = { value: numVal };
    } else if (editingField === "customer_name") {
      const trimmed = editValue.trim();
      if (trimmed === deal.customer_name) { cancelEditing(); return; }
      if (!trimmed) { cancelEditing(); return; }
      updateData = { customer_name: trimmed };
    } else if (editingField === "title") {
      const trimmed = editValue.trim();
      if (trimmed === deal.title) { cancelEditing(); return; }
      if (!trimmed) { cancelEditing(); return; }
      updateData = { title: trimmed };
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("deals")
      .update(updateData)
      .eq("id", deal.id);

    setIsSaving(false);

    if (error) {
      toast.error("Erro ao salvar alteração");
      console.error("Inline edit error:", error);
    } else {
      toast.success("Alteração salva");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    }
    cancelEditing();
  }, [editingField, editValue, deal, isSaving, cancelEditing, queryClient]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      saveField();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  }, [saveField, cancelEditing]);

  const handleValueInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(formatBRL(e.target.value));
  }, []);

  const handleTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  // Shared inline input classes
  const inlineInputClass =
    "w-full bg-[var(--vyz-surface-1)] border border-[var(--vyz-accent)] rounded px-1.5 py-0.5 text-foreground outline-none shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-colors";

  return (
    <div className="relative" data-demo-deal={deal.id}>
      {/* Swipe background indicators (mobile only) */}
      {isMobile && swipe.isSwiping && clampedOffset !== 0 && (
        <>
          {clampedOffset > 0 && stageNeighbors?.next && (
            <div className={`absolute inset-0 rounded-xl flex items-center justify-end pr-4 transition-colors ${swipe.pastThreshold ? "bg-emerald-500/20" : "bg-emerald-500/10"}`}>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="text-xs font-semibold">{stageNeighbors.next.title}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          )}
          {clampedOffset < 0 && stageNeighbors?.prev && (
            <div className={`absolute inset-0 rounded-xl flex items-center justify-start pl-4 transition-colors ${swipe.pastThreshold ? "bg-blue-500/20" : "bg-blue-500/10"}`}>
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-semibold">{stageNeighbors.prev.title}</span>
              </div>
            </div>
          )}
        </>
      )}
    <div
      ref={setRefs}
      style={{
        ...style,
        ...(isMobile && clampedOffset !== 0
          ? { transform: `translateX(${clampedOffset}px)`, transition: swipe.isSwiping ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }
          : {}),
      }}
      className={`
        vz-deal-card group relative
        bg-white border border-slate-200/80
        dark:bg-card dark:border-border/50
        rounded-xl p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_8px_-4px_rgba(15,23,42,0.05)]
        ${selectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
        transition-[border-color,background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform
        motion-reduce:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-1
        ${isBeingDragged
          ? "scale-[1.025] -translate-y-0.5 shadow-[0_12px_32px_-6px_rgba(15,23,42,0.25)] border-[var(--vyz-accent)] ring-1 ring-[var(--vyz-accent-border)] z-50 !opacity-100 motion-reduce:scale-100 motion-reduce:translate-y-0"
          : "hover:border-slate-300 dark:hover:border-border hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.18)] motion-reduce:hover:translate-y-0"
        }
        ${isSortableDragging ? "opacity-30" : "opacity-100"}
        ${isSelected ? "!border-[var(--vyz-accent)] ring-2 ring-[var(--vyz-accent-border-strong)]" : ""}
      `}
      role="button"
      tabIndex={0}
      aria-label={selectionMode ? `${isSelected ? "Desmarcar" : "Selecionar"} ${deal.title}` : `Abrir ${deal.title}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...(selectionMode || isMobile ? {} : { ...attributes, ...listeners })}
    >
      {/* ── Selection checkbox ─────────────────────────────── */}
      {selectionMode && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-150
              ${isSelected
                ? "bg-[var(--vyz-accent)] border-[var(--vyz-accent)]"
                : "bg-[var(--vyz-surface-1)] border-[var(--vyz-border-strong)]"
              }
            `}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* F5P.4b — Hot deal ring agressivo REMOVIDO.
          O Flame icon ao lado do título (Row 1) basta como sinal de hot. */}



      <div className="relative">
        {/* Drag handle (hover only, desktop) */}
        {!selectionMode && !isMobile && (
          <GripVertical className="absolute -left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}

        {/* ── Row 1: Título + valor (LP-PIPE.2 layout editorial) ─── */}
        <div className="flex items-start justify-between gap-2.5 mb-1">
          {/* Esquerda: ponto "ao vivo" + título */}
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            {isLive && (
              <span
                className="mt-[5px] h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--lp-live, #008a52)" }}
                title="Conversa ativa nas últimas 24h"
                aria-label="Conversa ativa"
              />
            )}
            {canInlineEdit && editingField === "title" ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={handleTextInputChange}
                onKeyDown={handleEditKeyDown}
                onBlur={saveField}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                disabled={isSaving}
                className={`${inlineInputClass} text-[13px] font-semibold leading-snug flex-1`}
                autoFocus
              />
            ) : canInlineEdit ? (
              <h4
                className="font-semibold text-slate-900 dark:text-foreground text-[13.5px] leading-snug line-clamp-2 flex-1 group/title inline-flex items-start gap-1 cursor-text rounded hover:bg-muted/40 transition-colors px-0.5 -mx-0.5 tracking-tight"
                onClick={e => startEditing("title", e)}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              >
                <span className="flex-1">{deal.title}</span>
                <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
              </h4>
            ) : (
              <h4 className="font-semibold text-slate-900 dark:text-foreground text-[13.5px] leading-snug line-clamp-2 flex-1 tracking-tight">
                {deal.title}
              </h4>
            )}
          </div>

          {/* Direita: valor em mono/tabular (hero discreto, alinhado ao título) */}
          <div className="flex-shrink-0">
            {canInlineEdit && editingField === "value" ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={handleValueInputChange}
                onKeyDown={handleEditKeyDown}
                onBlur={saveField}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                disabled={isSaving}
                className={`${inlineInputClass} text-[14px] font-bold tabular-nums w-28 text-right`}
                autoFocus
              />
            ) : canInlineEdit ? (
              <button
                className="text-[14px] font-bold text-slate-900 dark:text-foreground tabular-nums tracking-tight leading-snug group/value inline-flex items-center gap-1 cursor-text rounded hover:bg-muted/40 transition-colors px-0.5 -mx-0.5"
                onClick={e => startEditing("value", e)}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              >
                {deal.value ? formatCurrency(deal.value) : <span className="text-[12px] font-medium text-[var(--vyz-text-soft)]">Sem valor</span>}
                <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/value:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ) : (
              <span className="text-[14px] font-bold text-slate-900 dark:text-foreground tabular-nums tracking-tight leading-snug">
                {deal.value ? formatCurrency(deal.value) : <span className="text-[12px] font-medium text-[var(--vyz-text-soft)]">Sem valor</span>}
              </span>
            )}
          </div>

          {/* Ações do card: dentro dele, por teclado e toque, sem cobrir o vizinho. */}
          {!selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Ações de ${deal.title}`}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                className={`-mr-1.5 -mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[var(--vyz-text-muted)] transition-[opacity,background-color,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--vyz-surface-3)] hover:text-[var(--vyz-text-primary)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] data-[state=open]:bg-[var(--vyz-surface-3)] data-[state=open]:opacity-100 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              >
                {onMarkWon && (
                  <DropdownMenuItem onSelect={() => handleQuickAction("won")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                    Fechou
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => handleQuickAction("calendar")}>
                  <Calendar className="mr-2 h-4 w-4" aria-hidden />
                  Agendar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleQuickAction("phone")}>
                  <Phone className="mr-2 h-4 w-4" aria-hidden />
                  Ligar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleQuickAction("duplicate")}>
                  <Copy className="mr-2 h-4 w-4" aria-hidden />
                  Duplicar
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => handleQuickAction("delete")}
                      className="text-red-700 focus:bg-red-50 focus:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Row 1.5: Account (empresa B2B) ─────────────── */}
        {deal.account_name && (
          <div className="flex items-center gap-1.5 mb-1.5 min-h-[14px]">
            <Building2 className="h-3 w-3 text-[var(--vyz-text-muted)] flex-shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold text-[var(--vyz-text-strong)] truncate max-w-[70%]">
              {deal.account_name}
            </span>
            {!!deal.additional_contacts?.length && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-md text-[9px] font-semibold bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)] border border-[var(--vyz-border-subtle)]">
                +{deal.additional_contacts.length} contato{deal.additional_contacts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── Row 2: Cliente (hairline de respiro) + responsável/hot ─── */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5 min-h-[16px]">
          {canInlineEdit && editingField === "customer_name" ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={handleTextInputChange}
              onKeyDown={handleEditKeyDown}
              onBlur={saveField}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              disabled={isSaving}
              className={`${inlineInputClass} text-[11px] flex-1`}
              autoFocus
            />
          ) : canInlineEdit ? (
            <button
              className="text-[11px] text-slate-500 dark:text-muted-foreground/80 truncate group/cname inline-flex items-center gap-1 cursor-text rounded hover:bg-muted/40 transition-colors px-0.5 -mx-0.5 min-w-0"
              onClick={e => startEditing("customer_name", e)}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <span className="truncate">{deal.customer_name}</span>
              <Pencil className="h-2 w-2 text-muted-foreground opacity-0 group-hover/cname:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-muted-foreground/80 truncate min-w-0">
              {deal.customer_name}
            </span>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            {deal.is_hot && (
              <Flame className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
            )}
            <Avatar className={`h-5 w-5 ring-1 ${deal.assignee_outside_company ? "ring-rose-500/40" : "ring-border"}`}>
              <AvatarImage src={deal.profiles?.avatar_url || undefined} />
              <AvatarFallback className={`text-[9px] font-semibold ${deal.assignee_outside_company ? "bg-rose-500/10 text-rose-600 dark:text-rose-300" : "bg-muted text-muted-foreground"}`}>
                {deal.assignee_outside_company ? "!" : getInitials(deal.profiles?.nome || "")}
              </AvatarFallback>
            </Avatar>
          </div>

        </div>

        {/* ── LP-PIPE.2 "Fio da Conversa": a leitura da EVA ──────
            Mostra SÓ a interpretação da EVA (estado + próxima ação), nunca o
            conteúdo das mensagens. Accent roxo fino = a camada da EVA. */}
        {context && (() => {
          const hasConv = !!context.conversationId;

          // Sem conversa vinculada, a etiqueta não tem o que dizer: exibia o
          // selo "EVA" seguido de "Sem conversa vinculada", e sem nenhuma ação
          // ao lado. Eram 6 dos 8 cards do pipeline anunciando ausência.
          // Melhor o card não ter a linha do que ter uma linha vazia de sentido.
          if (!hasConv) return null;

          // Texto da leitura: retomada do orçamento > stale > proxima_acao > temperatura.
          // Trunca elegante via line-clamp no JSX.
          // O que a EVA já fez pelo orçamento vale mais que qualquer leitura.
          let readText: string;
          const quoteEva = quote ? evaLine(quote) : null;
          if (quoteEva) {
            readText = quoteEva;
          } else if (context.isStale) {
            readText = "Conversa andou desde a última leitura";
          } else if (context.proximaAcao && context.proximaAcao !== "criar_oportunidade") {
            // "Criar oportunidade" não se aplica aqui: o card já é a oportunidade.
            readText = proximaAcaoLabel(context.proximaAcao);
          } else {
            readText = EVA_DERIVED_READ[context.temperature] || EVA_DERIVED_READ.unknown;
          }

          const tone = context.isStale && !quoteEva ? "amber" : "eva";

          const since = context.lastMessageAt
            ? formatDistanceToNowStrict(new Date(context.lastMessageAt), { addSuffix: true, locale: ptBR })
            : null;

          const toneClass =
            tone === "amber"
              ? "border-amber-400/40 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300/90"
              : "border-[var(--vyz-border-subtle)] bg-[var(--vyz-surface-2)] text-[var(--vyz-text-strong)]";

          return (
            <div className="mb-2.5 flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
              {/* Leitura da EVA: superfície neutra, o roxo fica só no rótulo. */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 min-w-0 max-w-full pl-1 pr-2 py-1 rounded-md border text-[10.5px] leading-snug ${toneClass}`}
                  title={readText}
                >
                  <EvaBot size={16} still state={tone === "amber" ? "alert" : quoteEva ? "talking" : "idle"} label="EVA" className="self-center" />
                  <span className="line-clamp-2 font-medium">{readText}</span>
                </span>
              </div>

              {/* F5P.4f — "Abrir conversa" mini-pill (preserva navegação /inbox) */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button
                  type="button"
                  className="group/openconv inline-flex items-center gap-1.5 self-start px-2 py-1 -ml-0.5 rounded-full text-[10.5px] font-medium text-[var(--vyz-accent)] bg-[var(--vyz-accent-soft-8)] hover:bg-[var(--vyz-accent-soft-12)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/inbox?conversationId=${context.conversationId}`);
                  }}
                >
                  <MessageSquare className="h-2.5 w-2.5" aria-hidden />
                  Abrir conversa
                  <ArrowRight className="h-2.5 w-2.5 -ml-0.5 translate-x-0 group-hover/openconv:translate-x-0.5 transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" aria-hidden />
                </button>
                {since && (
                  <span className="text-[10px] text-[var(--vyz-text-soft)] tabular-nums">
                    {since}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── F6T.2 — Tags F6T.1 (até 2 chips + N, pra não poluir o card) ── */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {tags.slice(0, 2).map((tag) => {
              const useHex = isHexColor(tag.color);
              return (
                <span
                  key={tag.id}
                  title={tag.description ?? tag.name}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${useHex ? "" : getTagColorClass(tag.color)}`}
                  style={
                    useHex
                      ? {
                          backgroundColor: `${tag.color}1a`,
                          color: tag.color as string,
                          boxShadow: `inset 0 0 0 1px ${tag.color}55`,
                        }
                      : undefined
                  }
                >
                  {tag.name}
                </span>
              );
            })}
            {tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* ── Prazo de resposta (handoff ativo, sla_breach_at) ── */}
        {deal.sla_breach_at && (
          (() => {
            const breach = new Date(deal.sla_breach_at as string).getTime();
            const now = Date.now();
            const hoursLeft = (breach - now) / 3600000;
            const expired = hoursLeft < 0;
            const urgent = hoursLeft < 12 && !expired;
            if (expired) {
              return (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-[10.5px] font-semibold text-red-700 dark:text-red-300">
                    Resposta atrasada há {Math.abs(Math.round(hoursLeft))}h
                  </span>
                </div>
              );
            }
            if (urgent) {
              return (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
                    Responder em até {Math.round(hoursLeft)}h
                  </span>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* LP-PIPE.2 — value hero movido pra Row 1 (alinhado ao título). */}

        {/* ── F5P.4f — Meta row humanizado: linguagem comercial em vez de tags técnicas. */}
        {/* Quebra em vez de espremer. Sem o wrap, com "Aguardando 74 dias" e
            "Venceu 10 mai" na frente, o texto de tempo era comprimido até 15px de
            largura (medido) e aparecia como um toco cortado na borda do card. O
            piso de 86px garante que ele desce de linha antes de ficar ilegível. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-muted-foreground pt-1 mt-0.5 border-t border-slate-100 dark:border-border/30">
          {/* Aguardando (era "Parado há X dias") — só em deals abertos */}
          {quote && quoteStatus(quote) ? (
            <span
              className={`inline-flex items-center gap-1 tabular-nums whitespace-nowrap flex-shrink-0 font-medium ${quoteStatus(quote)!.tone}`}
              title={stateLine(quote)}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${quoteStatus(quote)!.dot}`} aria-hidden />
              {quoteStatus(quote)!.text}
            </span>
          ) : showNoMovement && (
            <span
              className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap flex-shrink-0 text-amber-600 dark:text-amber-400/90"
              title="Dias desde a última alteração no card"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
              Sem movimento há {daysSince} {daysSince === 1 ? "dia" : "dias"}
            </span>
          )}

          {/* Previsão de fechamento (prefixo "Prev." pra contextualizar a data) */}
          {deal.expected_close_date && (
            <span className={`inline-flex items-center gap-1 tabular-nums whitespace-nowrap flex-shrink-0 ${isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}`}>
              <Calendar className="h-2.5 w-2.5" strokeWidth={2.2} />
              {isOverdue ? "Venceu" : "Prev."} {format(parseISO(deal.expected_close_date), "dd MMM", { locale: ptBR })}
            </span>
          )}

          {/* Última atividade — addSuffix: true ("há X") para soar humano. Com
              orçamento aberto, a situação dele já diz o tempo que importa. */}
          {!(quote && quoteStatus(quote)) && (
          <span className="flex items-center gap-1 truncate flex-1 min-w-[86px] justify-end">
            {deal.lastActivity ? (
              <>
                {deal.lastActivity.type === "note" && <MessageSquare className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={2.2} />}
                {deal.lastActivity.type === "call" && <Phone className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={2.2} />}
                {deal.lastActivity.type === "stage_change" && <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={2.2} />}
                {deal.lastActivity.type === "update" && <Clock className="h-2.5 w-2.5 flex-shrink-0" strokeWidth={2.2} />}
                <span className="truncate">
                  {formatDistanceToNow(new Date(deal.lastActivity.date), { addSuffix: true, locale: ptBR })}
                </span>
              </>
            ) : deal.updated_at && !showNoMovement ? (
              <span className="truncate">
                Atualizado {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true, locale: ptBR })}
              </span>
            ) : showNoMovement ? null : (
              <span className="truncate italic">Sem atividade</span>
            )}
          </span>
          )}
        </div>

        {deal.assignee_outside_company && (
          <div className="mt-2 pt-2 border-t border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-300/90 truncate">
            Responsável de outra organização
          </div>
        )}
      </div>
    </div>
    </div>
  );
});

DealCard.displayName = "DealCard";
