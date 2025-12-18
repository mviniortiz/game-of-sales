import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Clock, AlertTriangle, Phone, Calendar, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
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

// Get rotting status color for left border
const getRottingColor = (days: number): { border: string; glow: string } => {
  if (days > 7) return {
    border: "border-l-rose-500 dark:border-l-rose-400",
    glow: "shadow-rose-500/20 dark:shadow-rose-400/20"
  };
  if (days > 3) return {
    border: "border-l-amber-500 dark:border-l-amber-400",
    glow: "shadow-amber-500/20 dark:shadow-amber-400/20"
  };
  return {
    border: "border-l-emerald-500 dark:border-l-emerald-400",
    glow: "shadow-emerald-500/20 dark:shadow-emerald-400/20"
  };
};

// Get XP bar color based on probability
const getXPBarColor = (probability: number): string => {
  if (probability >= 70) return "from-emerald-500 to-emerald-400";
  if (probability >= 40) return "from-amber-500 to-amber-400";
  return "from-slate-500 to-slate-400";
};

export const DealCard = memo(({ deal, isDragging = false, formatCurrency, onClick }: DealCardProps) => {
  const navigate = useNavigate();
  const clickStartTime = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: deal.id,
    transition: {
      duration: 150,
      easing: 'ease-out',
    },
  });

  // Optimized transform - no transition during drag for instant feedback
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? 'none' : transition,
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isBeingDragged = isDragging || isSortableDragging;

  // Calculate days since last update (Deal Rotting)
  const daysSinceUpdate = deal.updated_at
    ? differenceInDays(new Date(), new Date(deal.updated_at))
    : 0;

  const rottingColors = getRottingColor(daysSinceUpdate);
  const xpBarColor = getXPBarColor(deal.probability);

  // Track mouse down time to distinguish click from drag
  const handleMouseDown = useCallback(() => {
    clickStartTime.current = Date.now();
  }, []);

  // Handle card click (navigate to deal details)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if we're dragging
    if (isBeingDragged) return;

    // Only navigate if it was a quick click (<200ms)
    const clickDuration = Date.now() - clickStartTime.current;
    if (clickDuration < 200) {
      e.stopPropagation();
      navigate(`/deals/${deal.id}`);
    }
  }, [isBeingDragged, deal.id, navigate]);

  // Quick action handlers
  const handleQuickAction = useCallback((e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    e.preventDefault();

    switch (action) {
      case 'phone':
        if (deal.customer_phone) {
          window.open(`tel:${deal.customer_phone}`, '_self');
        }
        break;
      case 'calendar':
        navigate(`/calendario?deal=${deal.id}`);
        break;
      case 'check':
        // Could trigger a quick win modal
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
        bg-white dark:bg-slate-800 
        border border-slate-200 dark:border-slate-700
        border-l-4 ${rottingColors.border}
        shadow-sm dark:shadow-none
        rounded-xl p-4
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isBeingDragged
          ? `scale-105 rotate-1 shadow-2xl ${rottingColors.glow} border-indigo-500 dark:border-indigo-400 z-50 !opacity-100`
          : "hover:border-indigo-400/50 dark:hover:border-indigo-500/50 hover:shadow-md dark:hover:shadow-indigo-500/5"
        }
        ${isSortableDragging ? "opacity-50" : "opacity-100"}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...attributes}
      {...listeners}
    >
      {/* Hover Action Bar */}
      <AnimatePresence>
        {isHovered && !isBeingDragged && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-lg dark:shadow-black/30 ring-1 ring-slate-200 dark:ring-slate-600 z-50"
          >
            <button
              onClick={(e) => handleQuickAction(e, 'phone')}
              className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors group/btn"
              title="Ligar"
            >
              <Phone className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400" />
            </button>
            <button
              onClick={(e) => handleQuickAction(e, 'calendar')}
              className="p-1.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors group/btn"
              title="Agendar"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400" />
            </button>
            <button
              onClick={(e) => handleQuickAction(e, 'check')}
              className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors group/btn"
              title="Marcar como Ganho"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Header: Title + Avatar + Rotting Indicator */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-slate-900 dark:text-white text-[13px] leading-snug line-clamp-2 flex-1">
            {deal.title}
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Rotting/Warning Badge - Inline */}
            {daysSinceUpdate > 7 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20">
                <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{daysSinceUpdate}d</span>
              </div>
            )}
            {daysSinceUpdate > 3 && daysSinceUpdate <= 7 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20">
                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{daysSinceUpdate}d</span>
              </div>
            )}
            {/* Avatar */}
            <Avatar className="h-7 w-7 ring-2 ring-indigo-100 dark:ring-indigo-500/30">
              <AvatarImage src={deal.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                {getInitials(deal.profiles?.nome || "")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Customer Name */}
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <User className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <span className="truncate">{deal.customer_name}</span>
        </p>

        {/* Value + Badges Row */}
        <div className="flex items-center justify-between mb-3">
          {/* Value - Always Emerald for money */}
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(deal.value)}
          </span>

          {/* Probability Badge */}
          {deal.probability > 0 && (
            <div className={`
              flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold
              ${deal.probability >= 70
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : deal.probability >= 40
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              }
            `}>
              {deal.probability}%
            </div>
          )}
        </div>

        {/* XP Bar (Probability Visualization) */}
        <div className="relative h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${deal.probability}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${xpBarColor} rounded-full`}
          />
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>

        {/* Footer: Date info */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {format(new Date(deal.created_at), "dd MMM", { locale: ptBR })}
          </p>
          {deal.expected_close_date && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(deal.expected_close_date), "dd/MM", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

// Display name for debugging
DealCard.displayName = "DealCard";
