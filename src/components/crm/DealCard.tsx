import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock, AlertTriangle, Phone, Calendar, CheckCircle2, Flame
} from "lucide-react";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Deal } from "@/pages/CRM";
import { memo, useCallback, useRef, useState } from "react";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  formatCurrency: (value: number) => string;
  onClick?: () => void;
}

// Rotting status
const getRottingStatus = (days: number) => {
  if (days > 7) return { border: "border-l-rose-500", dot: "bg-rose-500", label: `${days}d`, severity: "high" as const };
  if (days > 3) return { border: "border-l-amber-500", dot: "bg-amber-500", label: `${days}d`, severity: "mid" as const };
  return { border: "border-l-emerald-500/60", dot: "bg-emerald-500", label: "", severity: "ok" as const };
};

// XP bar color
const getXPColor = (p: number) =>
  p >= 70 ? "from-emerald-500 to-emerald-400" :
    p >= 40 ? "from-amber-500 to-amber-400" :
      "from-slate-600 to-slate-500";

export const DealCard = memo(({ deal, isDragging = false, formatCurrency }: DealCardProps) => {
  const navigate = useNavigate();
  const clickStartTime = useRef<number>(0);
  const [actionsVisible, setActionsVisible] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: deal.id,
    transition: { duration: 150, easing: "ease-out" },
  });

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

  const handleMouseDown = useCallback(() => { clickStartTime.current = Date.now(); }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isBeingDragged) return;
    const dur = Date.now() - clickStartTime.current;
    if (dur < 200) {
      e.stopPropagation();
      navigate(`/deals/${deal.id}`);
    }
  }, [isBeingDragged, deal.id, navigate]);

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
    }
  }, [deal, navigate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        bg-slate-800 border border-slate-700/80
        border-l-4 ${rotting.border}
        rounded-xl p-3.5
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isBeingDragged
          ? "scale-[1.03] rotate-[0.8deg] shadow-2xl shadow-black/50 border-emerald-500/60 z-50 !opacity-100"
          : "hover:border-slate-600 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
        }
        ${isSortableDragging ? "opacity-40" : "opacity-100"}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => setActionsVisible(false)}
      {...attributes}
      {...listeners}
    >
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
      <AnimatePresence>
        {actionsVisible && !isBeingDragged && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute -top-[34px] left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-slate-700 shadow-xl shadow-black/40 ring-1 ring-slate-600 z-50 whitespace-nowrap"
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
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* ── Row 1: Title + badges + avatar ─────────────── */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-white text-[13px] leading-snug line-clamp-2 flex-1">
            {deal.title}
          </h4>

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
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/20">
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

            {/* Avatar */}
            <Avatar className="h-6 w-6 ring-1 ring-emerald-500/30">
              <AvatarImage src={deal.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-slate-700 text-slate-300 text-[9px] font-bold">
                {getInitials(deal.profiles?.nome || "")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* ── Customer name ────────────────────────────────── */}
        <p className="text-[11px] text-slate-400 mb-3 truncate">
          {deal.customer_name}
        </p>

        {/* ── Value + probability badge ────────────────────── */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[15px] font-bold text-emerald-400 tabular-nums">
            {formatCurrency(deal.value)}
          </span>

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
      </div>
    </div>
  );
});

DealCard.displayName = "DealCard";
