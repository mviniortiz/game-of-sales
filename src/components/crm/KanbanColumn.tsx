import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard } from "./DealCard";
import type { Deal, Stage } from "@/pages/CRM";
import { Inbox } from "lucide-react";

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  total: { count: number; value: number };
  formatCurrency: (value: number) => string;
}

export const KanbanColumn = memo(({ stage, deals, total, formatCurrency }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const Icon = stage.icon;
  
  // Memoize deal IDs to prevent unnecessary re-renders
  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  return (
    <div 
      className={`
        flex flex-col w-[300px] flex-shrink-0 h-full
        rounded-xl overflow-hidden
        transition-shadow duration-150
        ${isOver ? "ring-2 ring-indigo-500/50 ring-offset-1 ring-offset-slate-950" : ""}
      `}
    >
      {/* Column Header - Premium Style */}
      <div className="bg-slate-900 border-b border-indigo-500/20 p-4">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${stage.bgColor} ring-1 ring-white/5`}>
              <Icon className={`h-4 w-4 ${stage.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm tracking-tight">
                {stage.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {total.count} {total.count === 1 ? 'deal' : 'deals'}
              </p>
            </div>
          </div>
        </div>

        {/* Value Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Pipeline</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <span className="text-sm font-bold text-emerald-400 tabular-nums">
              {formatCurrency(total.value)}
            </span>
          </span>
        </div>
      </div>

      {/* Column Track */}
      <div 
        ref={setNodeRef}
        className={`
          flex-1 
          bg-slate-900/30
          p-3
          transition-colors duration-100
          ${isOver ? "bg-indigo-500/5" : ""}
        `}
      >
        <ScrollArea className="h-full pr-1">
          <SortableContext 
            items={dealIds} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {deals.length === 0 ? (
                /* Minimal Empty State */
                <div className={`
                  flex flex-col items-center justify-center h-32 
                  transition-opacity duration-100
                  ${isOver ? "opacity-70" : "opacity-40"}
                `}>
                  <Inbox className="h-6 w-6 text-slate-500 mb-2" />
                  <p className="text-[11px] text-slate-500 font-medium">
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
  );
});

KanbanColumn.displayName = "KanbanColumn";
