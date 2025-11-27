import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Deal } from "@/pages/CRM";
import { memo, useCallback, useRef } from "react";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  formatCurrency: (value: number) => string;
  onClick?: () => void;
}

export const DealCard = memo(({ deal, isDragging = false, formatCurrency, onClick }: DealCardProps) => {
  const navigate = useNavigate();
  const clickStartTime = useRef<number>(0);
  
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
  
  const isRotting = daysSinceUpdate > 7;
  const isWarning = daysSinceUpdate > 3 && daysSinceUpdate <= 7;

  // Track mouse down time to distinguish click from drag
  const handleMouseDown = useCallback(() => {
    clickStartTime.current = Date.now();
  }, []);

  // Handle card click (navigate to deal details)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if we're dragging
    if (isBeingDragged) return;
    
    // Only navigate if it was a quick click (< 200ms)
    const clickDuration = Date.now() - clickStartTime.current;
    if (clickDuration < 200) {
      e.stopPropagation();
      navigate(`/deals/${deal.id}`);
    }
  }, [isBeingDragged, deal.id, navigate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        bg-slate-800/60 backdrop-blur-sm
        border 
        ${isRotting 
          ? "border-rose-500/40 shadow-rose-500/10" 
          : isWarning 
            ? "border-amber-500/30" 
            : "border-white/[0.06]"
        }
        rounded-xl p-4
        cursor-grab active:cursor-grabbing
        transition-colors duration-100
        ${isBeingDragged 
          ? "scale-105 rotate-1 shadow-2xl shadow-indigo-500/30 border-indigo-500 z-50 !opacity-100" 
          : "hover:border-indigo-500/40 hover:bg-slate-800/80"
        }
        ${isSortableDragging ? "opacity-30" : "opacity-100"}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {/* Rotting indicator */}
      {isRotting && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 ring-1 ring-rose-500/40">
          <AlertTriangle className="h-3 w-3 text-rose-400" />
          <span className="text-[10px] font-bold text-rose-400">{daysSinceUpdate}d</span>
        </div>
      )}

      {/* Warning indicator */}
      {isWarning && !isRotting && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 ring-1 ring-amber-500/40">
          <Clock className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400">{daysSinceUpdate}d</span>
        </div>
      )}

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Content */}
      <div className="relative">
        {/* Title */}
        <h4 className="font-semibold text-white text-[13px] leading-snug mb-1 line-clamp-2 pr-6">
          {deal.title}
        </h4>

        {/* Customer Name */}
        <p className="text-[12px] text-slate-400 mb-3 flex items-center gap-1.5">
          <User className="h-3 w-3 text-slate-500" />
          <span className="truncate">{deal.customer_name}</span>
        </p>

        {/* Footer: Value + Avatar */}
        <div className="flex items-center justify-between">
          {/* Value - Always Emerald for money */}
          <span className="text-base font-bold text-emerald-400 tabular-nums">
            {formatCurrency(deal.value)}
          </span>

          {/* Right side: Probability + Avatar */}
          <div className="flex items-center gap-2">
            {/* Probability indicator */}
            {deal.probability > 0 && (
              <div className={`
                flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold
                ${deal.probability >= 70 
                  ? "bg-emerald-500/15 text-emerald-400" 
                  : deal.probability >= 40 
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-slate-500/15 text-slate-400"
                }
              `}>
                {deal.probability}%
              </div>
            )}

            {/* Owner Avatar */}
            <Avatar className="h-6 w-6 ring-2 ring-slate-700/50">
              <AvatarImage src={deal.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                {getInitials(deal.profiles?.nome || "")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Date - subtle bottom */}
        <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-medium">
            Criado em {format(new Date(deal.created_at), "dd MMM", { locale: ptBR })}
          </p>
          {deal.expected_close_date && (
            <p className="text-[10px] text-slate-500 font-medium">
              Prev: {format(new Date(deal.expected_close_date), "dd/MM", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

// Display name for debugging
DealCard.displayName = "DealCard";
