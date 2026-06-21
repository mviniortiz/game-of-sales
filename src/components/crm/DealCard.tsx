import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock, Phone, Calendar, CheckCircle2, Flame, Trash2, Copy,
  Pencil, MessageSquare, ArrowRight, ChevronLeft, ChevronRight, GripVertical,
  Building2, AlertTriangle
} from "lucide-react";
import { format, differenceInDays, isPast, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Deal } from "@/pages/CRM";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSwipeToMove } from "@/hooks/useSwipeToMove";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTagsForDeal } from "@/hooks/useDealTags";
import { DealTagBadge } from "./DealTagBadge";
import type { PipelineDealContext } from "@/hooks/usePipelineContextData";
// F6T.2 — tags transversais (sistema F6T.1) substituem visualmente o deal_tags legado
import type { Tag } from "@/types/tags";
import { getTagColorClass, isHexColor } from "@/lib/tags";

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

// F5P.3 — Rotting status (visual mais sutil: borda âmbar discreta, sem rose
// gritante. Severidade fica diferenciada por tonalidade, não por pulse).
const getRottingStatus = (days: number) => {
  if (days > 7) return { border: "border-l-amber-500/70", dot: "bg-amber-500", label: `${days}d`, severity: "high" as const };
  if (days > 3) return { border: "border-l-amber-400/50", dot: "bg-amber-400", label: `${days}d`, severity: "mid" as const };
  return { border: "border-l-transparent", dot: "bg-emerald-500", label: "", severity: "ok" as const };
};

// CSS keyframes for pulsing rotting badge (injected once)
if (typeof document !== "undefined" && !document.getElementById("rotting-pulse-style")) {
  const style = document.createElement("style");
  style.id = "rotting-pulse-style";
  style.textContent = `
    @keyframes rotting-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.4); }
      50% { opacity: 0.85; box-shadow: 0 0 8px 2px rgba(244, 63, 94, 0.25); }
    }
    .rotting-pulse {
      animation: rotting-pulse 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// Probability bar color
const getProbabilityColor = (p: number) =>
  p >= 70 ? "from-emerald-500 to-emerald-400" :
    p >= 40 ? "from-amber-500 to-amber-400" :
      "from-slate-600 to-slate-500";

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

export const DealCard = memo(({ deal, isDragging = false, formatCurrency, onDelete, selectionMode = false, isSelected = false, onToggleSelect, stageNeighbors, onSwipeMove, context, tags = [] }: DealCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: dealTags = [] } = useTagsForDeal(deal.id);
  const clickStartTime = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const hideActionsTimerRef = useRef<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [actionsPlacement, setActionsPlacement] = useState<"above" | "below" | "inside">("above");
  const [actionsCoords, setActionsCoords] = useState<{ top: number; left: number } | null>(null);

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

  const rotting = getRottingStatus(daysSince);
  const probabilityColor = getProbabilityColor(deal.probability);

  // Is close date overdue?
  const isOverdue = deal.expected_close_date
    ? isPast(parseISO(deal.expected_close_date)) : false;

  // Whether inline editing is allowed (disabled in selection mode)
  const canInlineEdit = !selectionMode;

  const handleMouseDown = useCallback(() => { clickStartTime.current = Date.now(); }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isBeingDragged) return;
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelect?.(deal.id);
      return;
    }
    if (editingField) return; // Don't navigate while editing
    const dur = Date.now() - clickStartTime.current;
    if (dur < 200) {
      e.stopPropagation();
      navigate(`/deals/${deal.id}`);
    }
  }, [isBeingDragged, deal.id, navigate, selectionMode, onToggleSelect, editingField]);

  const handleQuickAction = useCallback((e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    e.preventDefault();
    switch (action) {
      case "phone":
        if (deal.customer_phone) window.open(`tel:${deal.customer_phone}`, "_self");
        break;
      case "calendar":
        navigate(`/calendario?deal=${deal.id}`);
        break;
      case "check":
        navigate(`/deals/${deal.id}?action=win`);
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
  }, [deal, navigate, onDelete, user, queryClient]);

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

  // ── Actions placement logic ───────────────────────────────
  const updateActionsPlacement = useCallback(() => {
    const node = cardRef.current;
    if (!node) return;

    const viewport =
      (node.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null) ??
      node.parentElement;

    if (!viewport) return;

    const cardRect = node.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const menuHeight = 40;
    const menuWidth = onDelete ? 210 : 164;
    const gap = 8;

    const topSpace = cardRect.top - viewportRect.top;
    const bottomSpace = viewportRect.bottom - cardRect.bottom;

    if (topSpace >= menuHeight + gap) {
      setActionsPlacement("above");
      setActionsCoords({
        top: cardRect.top - menuHeight - 6,
        left: Math.max(8, Math.min(cardRect.left + cardRect.width / 2 - menuWidth / 2, window.innerWidth - menuWidth - 8)),
      });
      return;
    }

    if (bottomSpace >= menuHeight + gap) {
      setActionsPlacement("below");
      setActionsCoords({
        top: cardRect.bottom + 6,
        left: Math.max(8, Math.min(cardRect.left + cardRect.width / 2 - menuWidth / 2, window.innerWidth - menuWidth - 8)),
      });
      return;
    }

    setActionsPlacement("inside");
    setActionsCoords({
      top: cardRect.top + 8,
      left: Math.max(8, Math.min(cardRect.right - menuWidth - 8, window.innerWidth - menuWidth - 8)),
    });
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideActionsTimerRef.current !== null) {
      window.clearTimeout(hideActionsTimerRef.current);
      hideActionsTimerRef.current = null;
    }
  }, []);

  const showActions = useCallback(() => {
    clearHideTimer();
    updateActionsPlacement();
    setActionsVisible(true);
  }, [clearHideTimer, updateActionsPlacement]);

  const hideActionsSoon = useCallback(() => {
    clearHideTimer();
    hideActionsTimerRef.current = window.setTimeout(() => {
      setActionsVisible(false);
      hideActionsTimerRef.current = null;
    }, 120);
  }, [clearHideTimer]);

  useEffect(() => {
    if (!actionsVisible) return;

    updateActionsPlacement();

    const handleReposition = () => updateActionsPlacement();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [actionsVisible, updateActionsPlacement]);

  const actionsMotion =
    actionsPlacement === "above"
      ? { initial: { opacity: 0, y: 6, scale: 0.92 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6, scale: 0.92 } }
      : actionsPlacement === "below"
        ? { initial: { opacity: 0, y: -6, scale: 0.92 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.92 } }
        : { initial: { opacity: 0, y: -4, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.95 } };

  // Shared inline input classes
  const inlineInputClass =
    "w-full bg-muted border border-emerald-500/60 rounded px-1.5 py-0.5 text-foreground outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors";

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
        group relative
        bg-white border border-slate-200/80
        dark:bg-card dark:border-border/50
        rounded-xl p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_2px_8px_-4px_rgba(15,23,42,0.05)]
        ${selectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
        transition-[border-color,background-color,transform,box-shadow] duration-200 will-change-transform
        ${isBeingDragged
          ? "scale-[1.025] -translate-y-0.5 shadow-[0_12px_32px_-6px_rgba(15,23,42,0.25)] border-emerald-500/70 ring-1 ring-emerald-500/30 z-50 !opacity-100"
          : "hover:border-slate-300 dark:hover:border-border hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.18)]"
        }
        ${isSortableDragging ? "opacity-30" : "opacity-100"}
        ${isSelected ? "!border-emerald-500 ring-2 ring-emerald-500/40" : ""}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={showActions}
      onMouseLeave={hideActionsSoon}
      {...(selectionMode || isMobile ? {} : { ...attributes, ...listeners })}
    >
      {/* ── Selection checkbox ─────────────────────────────── */}
      {selectionMode && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150
              ${isSelected
                ? "bg-emerald-500 border-emerald-500"
                : "bg-muted/50 border-muted-foreground hover:border-emerald-400"
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

      {/* ── Hover quick-action bar ────────────────────────── */}
      {typeof document !== "undefined" && !selectionMode && createPortal(
        <AnimatePresence>
          {actionsVisible && !isBeingDragged && actionsCoords && (
            <motion.div
              initial={actionsMotion.initial}
              animate={actionsMotion.animate}
              exit={actionsMotion.exit}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: actionsCoords.top,
                left: actionsCoords.left,
              }}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-white dark:bg-secondary shadow-lg shadow-slate-900/15 dark:shadow-black/40 ring-1 ring-slate-200 dark:ring-border z-[9999] whitespace-nowrap"
              onMouseEnter={showActions}
              onMouseLeave={hideActionsSoon}
              onClick={e => e.stopPropagation()}
            >
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "phone"); }}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors group/b"
                title="Ligar"
                aria-label="Ligar"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground group-hover/b:text-emerald-600 dark:group-hover/b:text-emerald-400" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "calendar"); }}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors group/b"
                title="Agendar"
                aria-label="Agendar"
              >
                <Calendar className="h-3.5 w-3.5 text-muted-foreground group-hover/b:text-emerald-600 dark:group-hover/b:text-emerald-400" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "check"); }}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors group/b"
                title="Marcar como Ganho"
                aria-label="Marcar como Ganho"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground group-hover/b:text-emerald-600 dark:group-hover/b:text-emerald-400" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "duplicate"); }}
                className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors group/b"
                title="Duplicar negociação"
                aria-label="Copiar"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover/b:text-blue-600 dark:group-hover/b:text-blue-400" />
              </button>
              {onDelete && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <button
                    onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "delete"); }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors group/b"
                    title="Excluir negociação"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover/b:text-rose-600 dark:group-hover/b:text-rose-400" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
                {formatCurrency(deal.value)}
                <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/value:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ) : (
              <span className="text-[14px] font-bold text-slate-900 dark:text-foreground tabular-nums tracking-tight leading-snug">
                {formatCurrency(deal.value)}
              </span>
            )}
          </div>
        </div>

        {/* ── Row 1.5: Account (empresa B2B) ─────────────── */}
        {(deal as any).account_name && (
          <div className="flex items-center gap-1.5 mb-1.5 min-h-[14px]">
            <Building2 className="h-3 w-3 text-emerald-600/80 dark:text-emerald-400/70 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300/90 truncate max-w-[70%]">
              {(deal as any).account_name}
            </span>
            {Array.isArray((deal as any).additional_contacts) && (deal as any).additional_contacts.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300/80 border border-emerald-500/20">
                +{(deal as any).additional_contacts.length} stakeholder{(deal as any).additional_contacts.length > 1 ? "s" : ""}
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

          {/* F6T.2 — dealTags legado (sistema deal_tags) escondido do card pra
              evitar mistura visual com tags F6T.1. Dados continuam vivos no DB;
              renderização principal agora usa props.tags (vide bloco abaixo). */}
        </div>

        {/* ── LP-PIPE.2 "Fio da Conversa": a leitura da EVA ──────
            Mostra SÓ a interpretação da EVA (estado + próxima ação), nunca o
            conteúdo das mensagens. Accent roxo fino = a camada da EVA. */}
        {context && (() => {
          const hasConv = !!context.conversationId;

          // Texto da leitura: stale > proxima_acao > derivado da temperatura.
          // Trunca elegante via line-clamp no JSX.
          let readText: string;
          if (context.isStale) {
            readText = "EVA desatualizada";
          } else if (context.proximaAcao) {
            readText = context.proximaAcao;
          } else {
            readText = EVA_DERIVED_READ[context.temperature] || EVA_DERIVED_READ.unknown;
          }

          // Tom: âmbar quando stale, neutro discreto quando sem conversa,
          // roxo da EVA no caso normal.
          const tone = context.isStale
            ? "amber"
            : hasConv
              ? "eva"
              : "neutral";

          const since = context.lastMessageAt
            ? formatDistanceToNow(new Date(context.lastMessageAt), { addSuffix: false, locale: ptBR })
            : null;

          const toneClass =
            tone === "amber"
              ? "border-amber-400/40 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300/90"
              : tone === "eva"
                ? "border-violet-500/25 bg-violet-500/[0.06] text-violet-700 dark:text-violet-300/90"
                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-border/50 dark:bg-card/40 dark:text-muted-foreground";

          return (
            <div className="mb-2.5 flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
              {/* Etiqueta da leitura — accent roxo fino, prefixo "EVA" */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 min-w-0 max-w-full px-2 py-1 rounded-md border text-[10.5px] leading-tight ${toneClass}`}
                  title={hasConv ? readText : "Sem conversa vinculada"}
                >
                  <span className="font-semibold uppercase tracking-wide text-[9px] opacity-80 flex-shrink-0">
                    EVA
                  </span>
                  <span className="truncate font-medium">
                    {hasConv ? readText : "Sem conversa vinculada"}
                  </span>
                </span>
                {hasConv && since && (
                  <span className="text-[10px] text-slate-400 dark:text-muted-foreground/70 tabular-nums flex-shrink-0 whitespace-nowrap">
                    há {since}
                  </span>
                )}
              </div>

              {/* F5P.4f — "Abrir conversa" mini-pill (preserva navegação /inbox) */}
              {context.conversationId && (
                <button
                  type="button"
                  className="group/openconv inline-flex items-center gap-1.5 self-start px-2 py-1 -ml-0.5 rounded-full text-[10.5px] font-medium text-sky-600 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 ring-1 ring-sky-500/15 hover:ring-sky-500/25 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/inbox?conversationId=${context.conversationId}`);
                  }}
                >
                  <MessageSquare className="h-2.5 w-2.5" />
                  Abrir conversa
                  <ArrowRight className="h-2.5 w-2.5 -ml-0.5 translate-x-0 group-hover/openconv:translate-x-0.5 transition-transform" />
                </button>
              )}
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

        {/* ── SLA badge (handoff ativo) ─────────────────────── */}
        {(deal as any).sla_breach_at && (
          (() => {
            const breach = new Date((deal as any).sla_breach_at).getTime();
            const now = Date.now();
            const hoursLeft = (breach - now) / 3600000;
            const expired = hoursLeft < 0;
            const urgent = hoursLeft < 12 && !expired;
            if (expired) {
              return (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">
                    SLA vencido há {Math.abs(Math.round(hoursLeft))}h
                  </span>
                </div>
              );
            }
            if (urgent) {
              return (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    SLA em {Math.round(hoursLeft)}h
                  </span>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* LP-PIPE.2 — value hero movido pra Row 1 (alinhado ao título). */}

        {/* ── F5P.4f — Meta row humanizado: linguagem comercial em vez de tags técnicas. */}
        <div className="flex items-center gap-2.5 text-[10.5px] text-muted-foreground pt-0.5 mt-0.5 border-t border-slate-100 dark:border-border/30">
          {/* Aguardando (era "Parado há X dias") — só em deals abertos */}
          {daysSince > 3 && deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
            <span className="inline-flex items-center gap-1 tabular-nums text-amber-600 dark:text-amber-400/90">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Aguardando {daysSince} {daysSince === 1 ? "dia" : "dias"}
            </span>
          )}

          {/* Previsão de fechamento (prefixo "Prev." pra contextualizar a data) */}
          {deal.expected_close_date && (
            <span className={`inline-flex items-center gap-1 tabular-nums flex-shrink-0 ${isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}`}>
              <Calendar className="h-2.5 w-2.5" strokeWidth={2.2} />
              {isOverdue ? "Venceu" : "Prev."} {format(parseISO(deal.expected_close_date), "dd MMM", { locale: ptBR })}
            </span>
          )}

          {/* Última atividade — addSuffix: true ("há X") para soar humano */}
          <span className="flex items-center gap-1 truncate flex-1 min-w-0 justify-end">
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
            ) : deal.updated_at ? (
              <span className="truncate">
                Atualizado {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true, locale: ptBR })}
              </span>
            ) : (
              <span className="truncate italic">Sem atividade</span>
            )}
          </span>
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
