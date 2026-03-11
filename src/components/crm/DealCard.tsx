import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock, AlertTriangle, Phone, Calendar, CheckCircle2, Flame, Trash2, Copy,
  Pencil, MessageSquare, ArrowRight, ChevronLeft, ChevronRight
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
}

// Rotting status
const getRottingStatus = (days: number) => {
  if (days > 7) return { border: "border-l-rose-500", dot: "bg-rose-500", label: `${days}d`, severity: "high" as const };
  if (days > 3) return { border: "border-l-amber-500", dot: "bg-amber-500", label: `${days}d`, severity: "mid" as const };
  return { border: "border-l-emerald-500/60", dot: "bg-emerald-500", label: "", severity: "ok" as const };
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

// XP bar color
const getXPColor = (p: number) =>
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

export const DealCard = memo(({ deal, isDragging = false, formatCurrency, onDelete, selectionMode = false, isSelected = false, onToggleSelect, stageNeighbors, onSwipeMove }: DealCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
    transition: { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
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

  const daysSince = deal.updated_at
    ? differenceInDays(new Date(), new Date(deal.updated_at)) : 0;

  const rotting = getRottingStatus(daysSince);
  const xpColor = getXPColor(deal.probability);

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
            // Get max position in same stage
            const { data: maxPosData } = await supabase
              .from("deals")
              .select("position")
              .eq("stage", deal.stage)
              .eq("user_id", user?.id ?? "")
              .order("position", { ascending: false })
              .limit(1);
            const newPosition = (maxPosData?.[0]?.position ?? 0) + 1;

            const { error } = await supabase.from("deals").insert({
              title: `Cópia - ${deal.title}`,
              value: deal.value,
              customer_name: deal.customer_name,
              customer_email: deal.customer_email ?? null,
              customer_phone: deal.customer_phone ?? null,
              stage: deal.stage,
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
    "w-full bg-slate-800 border border-emerald-500/60 rounded px-1.5 py-0.5 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors";

  return (
    <div className="relative">
      {/* Swipe background indicators (mobile only) */}
      {isMobile && swipe.isSwiping && clampedOffset !== 0 && (
        <>
          {clampedOffset > 0 && stageNeighbors?.next && (
            <div className={`absolute inset-0 rounded-xl flex items-center justify-end pr-4 transition-colors ${swipe.pastThreshold ? "bg-emerald-500/20" : "bg-emerald-500/10"}`}>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="text-xs font-semibold">{stageNeighbors.next.title}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          )}
          {clampedOffset < 0 && stageNeighbors?.prev && (
            <div className={`absolute inset-0 rounded-xl flex items-center justify-start pl-4 transition-colors ${swipe.pastThreshold ? "bg-blue-500/20" : "bg-blue-500/10"}`}>
              <div className="flex items-center gap-1.5 text-blue-400">
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
        bg-slate-800 border border-slate-700/80
        border-l-4 ${rotting.border}
        rounded-xl p-3.5
        ${selectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
        transition-all duration-200 will-change-transform
        ${rotting.severity === "high" ? "rotting-pulse !border-l-rose-500" : ""}
        ${rotting.severity === "mid" ? "!border-l-amber-500" : ""}
        ${isBeingDragged
          ? "scale-[1.02] rotate-[0.6deg] shadow-2xl shadow-black/45 border-emerald-500/60 z-50 !opacity-100"
          : "hover:border-slate-600 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
        }
        ${isSortableDragging ? "opacity-40" : "opacity-100"}
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
                : "bg-slate-700/50 border-slate-500 hover:border-emerald-400"
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

      {/* ── Hot Deal glow strip ───────────────────────────── */}
      {deal.is_hot && (
        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 rounded-xl ring-1 ring-orange-500/40" />
          <div
            className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
            style={{ background: "linear-gradient(90deg, transparent, #f97316, transparent)" }}
          />
        </div>
      )}

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
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-slate-700 shadow-xl shadow-black/40 ring-1 ring-slate-600 z-[9999] whitespace-nowrap"
              onMouseEnter={showActions}
              onMouseLeave={hideActionsSoon}
              onClick={e => e.stopPropagation()}
            >
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "phone"); }}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors group/b"
                title="Ligar"
              >
                <Phone className="h-3.5 w-3.5 text-slate-400 group-hover/b:text-emerald-400" />
              </button>
              <div className="w-px h-4 bg-slate-600" />
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "calendar"); }}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors group/b"
                title="Agendar"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover/b:text-emerald-400" />
              </button>
              <div className="w-px h-4 bg-slate-600" />
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "check"); }}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors group/b"
                title="Marcar como Ganho"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 group-hover/b:text-emerald-400" />
              </button>
              <div className="w-px h-4 bg-slate-600" />
              <button
                onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "duplicate"); }}
                className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-colors group/b"
                title="Duplicar negociação"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400 group-hover/b:text-blue-400" />
              </button>
              {onDelete && (
                <>
                  <div className="w-px h-4 bg-slate-600" />
                  <button
                    onPointerDown={e => { e.stopPropagation(); handleQuickAction(e as any, "delete"); }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors group/b"
                    title="Excluir negociação"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-400 group-hover/b:text-rose-400" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="relative">
        {/* ── Row 1: Title + badges + avatar ─────────────── */}
        <div className="flex items-start justify-between gap-2 mb-2">
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
              className="font-semibold text-white text-[13px] leading-snug line-clamp-2 flex-1 group/title inline-flex items-start gap-1 cursor-text rounded hover:bg-slate-700/40 transition-colors px-0.5 -mx-0.5"
              onClick={e => startEditing("title", e)}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <span className="flex-1">{deal.title}</span>
              <Pencil className="h-2.5 w-2.5 text-slate-500 opacity-0 group-hover/title:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
            </h4>
          ) : (
            <h4 className="font-semibold text-white text-[13px] leading-snug line-clamp-2 flex-1">
              {deal.title}
            </h4>
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Hot badge */}
            {deal.is_hot && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/20">
                <Flame className="h-3 w-3 text-orange-400" />
                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">Hot</span>
              </div>
            )}

            {/* Rotting badge */}
            {daysSince > 7 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/20 rotting-pulse">
                <AlertTriangle className="h-3 w-3 text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400">{daysSince}d</span>
              </div>
            )}
            {daysSince > 3 && daysSince <= 7 && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/20">
                <Clock className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400">{daysSince}d</span>
              </div>
            )}
            {deal.assignee_outside_company && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/20">
                <AlertTriangle className="h-3 w-3 text-rose-400" />
                <span className="text-[9px] font-bold text-rose-300">Org</span>
              </div>
            )}

            {/* Avatar */}
            <Avatar className={`h-6 w-6 ring-1 ${deal.assignee_outside_company ? "ring-rose-500/40" : "ring-emerald-500/30"}`}>
              <AvatarImage src={deal.profiles?.avatar_url || undefined} />
              <AvatarFallback className={`text-[9px] font-bold ${deal.assignee_outside_company ? "bg-rose-500/10 text-rose-300" : "bg-slate-700 text-slate-300"}`}>
                {deal.assignee_outside_company ? "!" : getInitials(deal.profiles?.nome || "")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* ── Customer name ────────────────────────────────── */}
        {canInlineEdit && editingField === "customer_name" ? (
          <div className="mb-3">
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
              className={`${inlineInputClass} text-[11px] text-slate-300`}
              autoFocus
            />
          </div>
        ) : canInlineEdit ? (
          <p
            className="text-[11px] text-slate-400 mb-3 truncate group/cname inline-flex items-center gap-1 cursor-text rounded hover:bg-slate-700/40 transition-colors px-0.5 -mx-0.5 max-w-full"
            onClick={e => startEditing("customer_name", e)}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          >
            <span className="truncate">{deal.customer_name}</span>
            <Pencil className="h-2 w-2 text-slate-500 opacity-0 group-hover/cname:opacity-100 transition-opacity flex-shrink-0" />
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 mb-3 truncate">
            {deal.customer_name}
          </p>
        )}
        {deal.assignee_outside_company && (
          <p className="text-[10px] text-rose-300/90 mb-3 -mt-2 truncate">
            Responsável de outra organização
          </p>
        )}

        {/* ── Rotting warning text ──────────────────────────── */}
        {daysSince > 3 && (
          <div className={`flex items-center gap-1.5 mb-2.5 -mt-1 px-2 py-1 rounded-md ${
            daysSince > 7
              ? "bg-rose-500/10 border border-rose-500/20"
              : "bg-amber-500/10 border border-amber-500/20"
          }`}>
            <AlertTriangle className={`h-3 w-3 flex-shrink-0 ${daysSince > 7 ? "text-rose-400" : "text-amber-400"}`} />
            <span className={`text-[10px] font-semibold ${daysSince > 7 ? "text-rose-300" : "text-amber-300"}`}>
              {daysSince} dias sem atualização
            </span>
          </div>
        )}

        {/* ── Value + probability badge ────────────────────── */}
        <div className="flex items-center justify-between mb-2.5">
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
              className={`${inlineInputClass} text-[15px] font-bold text-emerald-400 tabular-nums w-36`}
              autoFocus
            />
          ) : canInlineEdit ? (
            <span
              className="text-[15px] font-bold text-emerald-400 tabular-nums group/value inline-flex items-center gap-1 cursor-text rounded hover:bg-slate-700/40 transition-colors px-0.5 -mx-0.5"
              onClick={e => startEditing("value", e)}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              {formatCurrency(deal.value)}
              <Pencil className="h-2.5 w-2.5 text-slate-500 opacity-0 group-hover/value:opacity-100 transition-opacity flex-shrink-0" />
            </span>
          ) : (
            <span className="text-[15px] font-bold text-emerald-400 tabular-nums">
              {formatCurrency(deal.value)}
            </span>
          )}

          {deal.probability > 0 && (
            <span className={`
              px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums
              ${deal.probability >= 70
                ? "bg-emerald-500/15 text-emerald-300"
                : deal.probability >= 40
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-slate-700 text-slate-400"
              }
            `}>
              {deal.probability}%
            </span>
          )}
        </div>

        {/* ── XP / probability bar ─────────────────────────── */}
        <div className="relative h-1 w-full bg-slate-700 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${deal.probability}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${xpColor} rounded-full`}
          />
        </div>

        {/* ── Footer: created date + close date ────────────── */}
        <div className="flex items-center justify-between border-t border-slate-700/60 pt-2">
          <span className="text-[10px] text-slate-500 font-medium">
            {format(new Date(deal.created_at), "dd MMM", { locale: ptBR })}
          </span>

          {deal.expected_close_date && (
            <span className={`flex items-center gap-1 text-[10px] font-medium ${isOverdue ? "text-rose-400" : "text-slate-500"}`}>
              <Clock className="h-2.5 w-2.5" />
              {format(parseISO(deal.expected_close_date), "dd/MM", { locale: ptBR })}
              {isOverdue && <span className="font-bold"> !</span>}
            </span>
          )}
        </div>

        {/* ── Activity preview ──────────────────────────────── */}
        <div className="flex items-center gap-1.5 border-t border-slate-700/40 pt-1.5 mt-1.5">
          {deal.lastActivity ? (
            <>
              {deal.lastActivity.type === "note" && <MessageSquare className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />}
              {deal.lastActivity.type === "call" && <Phone className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />}
              {deal.lastActivity.type === "stage_change" && <ArrowRight className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />}
              {deal.lastActivity.type === "update" && <Clock className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />}
              <span className="text-[11px] text-slate-500 truncate flex-1 leading-none">
                {deal.lastActivity.text}
              </span>
              <span className="text-[10px] text-slate-600 flex-shrink-0 whitespace-nowrap">
                {formatDistanceToNow(new Date(deal.lastActivity.date), { addSuffix: true, locale: ptBR })}
              </span>
            </>
          ) : (
            <>
              <Clock className="h-2.5 w-2.5 text-slate-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600 truncate flex-1 leading-none">
                {deal.updated_at
                  ? `Atualizado ${formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true, locale: ptBR })}`
                  : "Sem atividade"
                }
              </span>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
});

DealCard.displayName = "DealCard";
