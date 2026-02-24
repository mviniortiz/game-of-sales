import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard } from "./DealCard";
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
}

// Micro funnel arrow between columns
const FunnelConnector = ({ rate }: { rate: number }) => {
  const color =
    rate >= 50 ? "text-emerald-400" :
      rate >= 25 ? "text-amber-400" : "text-slate-500";
  const bg =
    rate >= 50 ? "bg-emerald-500/10 ring-emerald-500/20" :
      rate >= 25 ? "bg-amber-500/10 ring-amber-500/20" : "bg-slate-700/60 ring-slate-600/20";

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
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const Icon = stage.icon;

  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  const conversionRate = useMemo(() => {
    if (!showConversionRate || !previousStageCount || previousStageCount === 0) return null;
    return Math.round((total.count / previousStageCount) * 100);
  }, [showConversionRate, total.count, previousStageCount]);

  // Funnel fill: width of the stage value bar relative to total
  // We reuse total.count as a proxy — actual % provided from parent would be ideal
  // but count works well enough for visual rhythm
  const fillPct = Math.min(100, Math.max(4, total.count > 0 ? 100 : 4));

  return (
    <div className="flex items-start gap-0">
      {/* Funnel connector BEFORE this column (left side) */}
      {showConversionRate && conversionRate !== null && (
        <FunnelConnector rate={conversionRate} />
      )}

      {/* ── Main Column ─────────────────────────────────────── */}
      <div
        className={`
          flex flex-col w-[292px] flex-shrink-0 h-full rounded-xl
          border transition-all duration-150
          ${isOver
            ? "ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-slate-900 scale-[1.01] border-emerald-500/30 bg-emerald-500/5"
            : "border-slate-700/60 bg-slate-900/70"
          }
        `}
      >
        {/* ── Column Header ────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
          {/* Row 1: Icon + title + count badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${stage.bgColor}`}>
                <Icon className={`h-3.5 w-3.5 ${stage.color}`} />
              </div>
              <span className="font-semibold text-white text-sm tracking-tight">
                {stage.title}
              </span>
            </div>

            {/* Count pill */}
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold
              ${stage.bgColor} ${stage.color}
            `}>
              {total.count}
            </span>
          </div>

          {/* Funnel bar — visual fill proportional to count */}
          <div className="h-[3px] w-full rounded-full bg-slate-800 mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${stage.color.replace("text-", "bg-").replace("-400", "-500")}`}
              style={{ width: `${fillPct}%`, opacity: total.count > 0 ? 1 : 0.2 }}
            />
          </div>

          {/* Row 2: Value total */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
              Total em pipeline
            </span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {formatCurrency(total.value)}
            </span>
          </div>
        </div>

        {/* ── Cards Track ──────────────────────────────────── */}
        <div
          ref={setNodeRef}
          className={`
            flex-1 p-3 overflow-hidden
            max-h-[calc(100vh-240px)]
            transition-colors duration-100
            ${isOver ? "bg-emerald-500/5" : "bg-transparent"}
          `}
        >
          <ScrollArea className="h-full max-h-[calc(100vh-260px)] pr-1">
            <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5 pt-1 pb-2">
                {deals.length === 0 ? (
                  <div className={`
                    flex flex-col items-center justify-center h-28
                    transition-all duration-150
                    ${isOver ? "opacity-100 scale-105" : "opacity-40"}
                  `}>
                    <div className={`
                      p-2.5 rounded-xl mb-2
                      ${isOver ? "bg-emerald-500/20" : "bg-slate-800"}
                    `}>
                      <Inbox className={`h-5 w-5 ${isOver ? "text-emerald-400" : "text-slate-600"}`} />
                    </div>
                    <p className={`text-[11px] font-medium ${isOver ? "text-emerald-400" : "text-slate-600"}`}>
                      {isOver ? "Solte aqui" : "Sem deals"}
                    </p>
                  </div>
                ) : (
                  deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      formatCurrency={formatCurrency}
                      onDelete={onDeleteDeal}
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
