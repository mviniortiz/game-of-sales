import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard } from "./DealCard";
import type { Deal, Stage } from "@/pages/CRM";
import { Inbox, TrendingUp, ChevronRight } from "lucide-react";

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  total: { count: number; value: number };
  formatCurrency: (value: number) => string;
  previousStageCount?: number; // For conversion rate calculation
  showConversionRate?: boolean;
}

export const KanbanColumn = memo(({
  stage,
  deals,
  total,
  formatCurrency,
  previousStageCount,
  showConversionRate = false
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const Icon = stage.icon;

  // Memoize deal IDs to prevent unnecessary re-renders
  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  // Calculate conversion rate from previous stage
  const conversionRate = useMemo(() => {
    if (!previousStageCount || previousStageCount === 0) return null;
    return Math.round((total.count / previousStageCount) * 100);
  }, [total.count, previousStageCount]);

  return (
    <div className="flex items-start gap-1">
      {/* Conversion Rate Connector */}
      {showConversionRate && conversionRate !== null && (
        <div className="flex flex-col items-center justify-center h-16 -mr-1 z-10">
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
            <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            <span className={`text-[10px] font-bold tabular-nums
              ${conversionRate >= 50
                ? "text-emerald-600 dark:text-emerald-400"
                : conversionRate >= 25
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
              }
            `}>
              {conversionRate}%
            </span>
          </div>
        </div>
      )}

      {/* Main Column */}
      <div
        className={`
          flex flex-col w-[300px] flex-shrink-0 h-full
          rounded-xl
          bg-slate-50 dark:bg-slate-900/50
          border border-slate-200/50 dark:border-slate-700/50
          transition-all duration-150
          ${isOver
            ? "ring-2 ring-indigo-500/50 dark:ring-indigo-400/50 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 scale-[1.01]"
            : ""
          }
        `}
      >
        {/* Column Header - Premium Style */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${stage.bgColor} ring-1 ring-slate-200 dark:ring-slate-700/50`}>
                <Icon className={`h-4 w-4 ${stage.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">
                  {stage.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {total.count} {total.count === 1 ? 'deal' : 'deals'}
                </p>
              </div>
            </div>

            {/* Stage indicator badge */}
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider
              ${stage.bgColor} ${stage.color}
            `}>
              <TrendingUp className="h-3 w-3" />
              {total.count}
            </div>
          </div>

          {/* Value Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
              Pipeline Value
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-500/20">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(total.value)}
              </span>
            </span>
          </div>
        </div>

        {/* Column Track - Deeper background for visual hierarchy */}
        <div
          ref={setNodeRef}
          className={`
            flex-1 
            bg-slate-100 dark:bg-slate-800/50
            p-3
            overflow-hidden
            max-h-[calc(100vh-280px)]
            transition-colors duration-100
            ${isOver ? "bg-indigo-50 dark:bg-indigo-500/10" : ""}
          `}
        >
          <ScrollArea className="h-full max-h-[calc(100vh-300px)] pr-1">
            <SortableContext
              items={dealIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 pt-4">
                {deals.length === 0 ? (
                  /* Minimal Empty State */
                  <div className={`
                    flex flex-col items-center justify-center h-32 
                    transition-all duration-150
                    ${isOver ? "opacity-100 scale-105" : "opacity-50"}
                  `}>
                    <div className={`
                      p-3 rounded-xl mb-2
                      ${isOver
                        ? "bg-indigo-100 dark:bg-indigo-500/20"
                        : "bg-slate-200 dark:bg-slate-700"
                      }
                    `}>
                      <Inbox className={`h-6 w-6 ${isOver ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                    </div>
                    <p className={`text-[11px] font-medium ${isOver ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-500"}`}>
                      {isOver ? "Solte aqui" : "Sem deals"}
                    </p>
                  </div>
                ) : (
                  deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      formatCurrency={formatCurrency}
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
