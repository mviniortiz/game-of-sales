import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard, StageNeighbors } from "./DealCard";
import type { Deal, Stage } from "@/pages/CRM";
import { Inbox, ArrowRight } from "lucide-react";

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  total: { count: number; value: number };
  formatCurrency: (value: number) => string;
  onDeleteDeal?: (deal: Deal) => void;
  previousStageCount?: number; // for funnel conversion rate
  showConversionRate?: boolean;
  isLast?: boolean;
  selectionMode?: boolean;
  selectedDeals?: Set<string>;
  onToggleSelect?: (dealId: string) => void;
  stageNeighbors?: StageNeighbors;
  onSwipeMove?: (deal: Deal, targetStageId: string) => void;
}

// Micro funnel arrow between columns
const FunnelConnector = ({ rate }: { rate: number }) => {
  const color =
    rate >= 50 ? "text-emerald-400" :
      rate >= 25 ? "text-amber-400" : "text-muted-foreground";
  const bg =
    rate >= 50 ? "bg-emerald-500/10 ring-emerald-500/20" :
      rate >= 25 ? "bg-amber-500/10 ring-amber-500/20" : "bg-muted/60 ring-border";

  return (
    <div className="flex flex-col items-center justify-start pt-[52px] flex-shrink-0 w-5 z-10">
      <div className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-full ${bg} ring-1`}>
        <ArrowRight className={`h-3 w-3 ${color}`} />
        <span className={`text-[9px] font-bold tabular-nums ${color} [writing-mode:vertical-lr] rotate-180`}>
          {rate}%
        </span>
      </div>
    </div>
  );
};

export const KanbanColumn = memo(({
  stage,
  deals,
  total,
  formatCurrency,
  onDeleteDeal,
  previousStageCount,
  showConversionRate = false,
  isLast = false,
  selectionMode = false,
  selectedDeals,
  onToggleSelect,
  stageNeighbors,
  onSwipeMove,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const Icon = stage.icon;

  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  const conversionRate = useMemo(() => {
    if (!showConversionRate || !previousStageCount || previousStageCount === 0) return null;
    return Math.round((total.count / previousStageCount) * 100);
  }, [showConversionRate, total.count, previousStageCount]);

  // Map stage color text-* → bg-* for stage dot
  const dotBg = stage.color.replace("text-", "bg-").replace("-400", "-500");

  return (
    <div className="flex items-stretch gap-0 h-full">
      {/* Funnel connector BEFORE this column (left side) - hidden on mobile for snap-scroll */}
      {showConversionRate && conversionRate !== null && (
        <div className="hidden sm:flex">
          <FunnelConnector rate={conversionRate} />
        </div>
      )}

      {/* ── Main Column (droppable shell inteiro — cobre header + track) ─ */}
      <div
        ref={setNodeRef}
        className={`
          relative flex flex-col w-[85vw] sm:w-[280px] flex-shrink-0 h-full rounded-xl
          border transition-colors duration-150 snap-center overflow-hidden
          ${isOver
            ? "border-emerald-400/70 bg-emerald-500/[0.05]"
            : "border-border/60 bg-card/30"
          }
        `}
      >
        {/* Top accent bar quando isOver (GPU-friendly: scale-x) */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] origin-left transition-transform duration-200 ${isOver ? "scale-x-100" : "scale-x-0"}`}
          style={{ background: "linear-gradient(90deg, transparent, #00E37A, transparent)" }}
        />
        {/* ── Column Header ────────────────────────────────── */}
        <div className="px-3.5 pt-3.5 pb-3">
          {/* Row 1: stage dot + title + count */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${dotBg} flex-shrink-0`} />
            <Icon className={`h-3.5 w-3.5 ${stage.color} flex-shrink-0`} strokeWidth={2.2} />
            <span className="font-semibold text-foreground text-[13px] tracking-tight truncate flex-1">
              {stage.title}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium tabular-nums flex-shrink-0">
              {total.count}
            </span>
          </div>

          {/* Row 2: Value total */}
          {total.count > 0 && (
            <div className="text-[12px] font-semibold text-emerald-400 tabular-nums tracking-tight pl-4">
              {formatCurrency(total.value)}
            </div>
          )}
        </div>

        {/* Subtle divider */}
        <div className="h-px bg-border/40 mx-3" />

        {/* ── Cards Track ──────────────────────────────────── */}
        <div className="flex-1 p-2.5 overflow-hidden max-h-[calc(100vh-240px)]">
          <ScrollArea className="h-full max-h-[calc(100vh-260px)] pr-1">
            <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 pt-1 pb-2">
                {deals.length === 0 ? (
                  <div className={`
                    flex flex-col items-center justify-center h-40 rounded-lg border border-dashed
                    transition-colors duration-150
                    ${isOver ? "border-emerald-400/60 bg-emerald-500/[0.04]" : "border-border/40"}
                  `}>
                    <Inbox className={`h-4 w-4 mb-1.5 ${isOver ? "text-emerald-400" : "text-muted-foreground/60"}`} strokeWidth={1.5} />
                    <p className={`text-[10.5px] font-medium ${isOver ? "text-emerald-400" : "text-muted-foreground/60"}`}>
                      {isOver ? "Solte aqui" : "Arraste um card"}
                    </p>
                  </div>
                ) : (
                  deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      formatCurrency={formatCurrency}
                      onDelete={onDeleteDeal}
                      selectionMode={selectionMode}
                      isSelected={selectedDeals?.has(deal.id) ?? false}
                      onToggleSelect={onToggleSelect}
                      stageNeighbors={stageNeighbors}
                      onSwipeMove={onSwipeMove}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
});

KanbanColumn.displayName = "KanbanColumn";
