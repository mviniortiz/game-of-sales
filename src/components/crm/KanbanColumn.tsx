import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard, StageNeighbors } from "./DealCard";
import type { Deal } from "@/pages/CRM";
import type { Stage } from "@/lib/pipelineStyles";
import type { PipelineDealContext } from "@/hooks/usePipelineContextData";
import type { Tag } from "@/types/tags";
// F5P.4e — Phosphor duotone padronizado (consistente com sidebar e header).
import { Tray as TrayPh, ArrowRight as ArrowRightPh } from "@phosphor-icons/react";

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
  /** F5P.2 — contexto enriquecido por deal */
  contextByDeal?: Map<string, PipelineDealContext>;
  /** F6T.2 — tags transversais (F6T.1) por deal */
  tagsByDeal?: Map<string, Tag[]>;
  /** LP-PIPE.2 — maior valor de coluna do board (pra barra de proporção "onde está o dinheiro") */
  maxColumnValue?: number;
}

// Micro funnel arrow between columns — LP-PIPE.1: tons duais light-first
const FunnelConnector = ({ rate }: { rate: number }) => {
  const color =
    rate >= 50 ? "text-emerald-600 dark:text-emerald-400" :
      rate >= 25 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  const bg =
    rate >= 50 ? "bg-emerald-500/10 ring-emerald-500/20" :
      rate >= 25 ? "bg-amber-500/10 ring-amber-500/20" : "bg-muted/60 ring-border";

  return (
    <div className="flex flex-col items-center justify-start pt-[52px] flex-shrink-0 w-5 z-10">
      <div className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-full ${bg} ring-1`}>
        <ArrowRightPh size={12} weight="bold" className={color} />
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
  contextByDeal,
  tagsByDeal,
  maxColumnValue = 0,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const Icon = stage.icon;

  // LP-PIPE.2 — proporção do valor desta coluna vs a maior coluna do board.
  // Barra hairline dá a sensação de "onde está o dinheiro" sem números extras.
  const valueRatio = maxColumnValue > 0
    ? Math.max(0.04, Math.min(1, total.value / maxColumnValue))
    : 0;

  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  const conversionRate = useMemo(() => {
    if (!showConversionRate || !previousStageCount || previousStageCount === 0) return null;
    const rate = Math.round((total.count / previousStageCount) * 100);
    // F5P.4c — pipelines com poucos deals geram ratios >100% que não fazem
    // sentido como "conversão". Esconde quando estágio atual >= anterior.
    if (rate > 100) return null;
    return rate;
  }, [showConversionRate, total.count, previousStageCount]);

  // Map stage color text-* → bg-* for stage dot e accent bar superior
  const dotBg = stage.color.replace("text-", "bg-").replace("-400", "-500");
  // Stage accent bar: gradient sutil da cor do stage (F5P.4e)
  const accentBg = stage.color.replace("text-", "bg-").replace("-400", "-500");

  return (
    <div className="flex items-stretch gap-0 h-full">
      {/* Funnel connector BEFORE this column (left side) - hidden on mobile for snap-scroll */}
      {showConversionRate && conversionRate !== null && (
        <div className="hidden sm:flex">
          <FunnelConnector rate={conversionRate} />
        </div>
      )}

      {/* F5P.4c — 3 níveis tonais: board (claro) → coluna (slate-100) →
          card (branco). Inverte estratégia anterior pra dar contraste real
          em light mode. Em dark o card-secondary já cria diferença. */}
      <div
        ref={setNodeRef}
        className={`
          relative flex flex-col w-[85vw] sm:w-[280px] flex-shrink-0 h-full rounded-2xl
          border transition-colors duration-150 snap-center overflow-hidden
          ${isOver
            ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-500/[0.05]"
            : "border-slate-200/70 bg-slate-100/70 dark:border-border/40 dark:bg-card/40"
          }
        `}
      >
        {/* F5P.4e — Accent bar superior PERMANENTE com cor do stage (assina visualmente
            cada coluna). Anima pra emerald quando isOver. */}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] ${isOver ? "" : accentBg} transition-colors duration-150`}
          style={isOver ? { background: "linear-gradient(90deg, #00E37A, #34d399, #00E37A)" } : undefined}
        />

        {/* F5P.4e — Column Header com bg distinto (white em light / card em dark)
            cria grouping visual com cards e separação clara do "track" da coluna */}
        <div className="px-3.5 pt-4 pb-3 bg-white/60 dark:bg-card/30 border-b border-border/40">
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className={`h-4 w-4 ${stage.color} flex-shrink-0`} strokeWidth={2.2} />
            <span className="font-semibold text-foreground text-[13px] tracking-tight truncate flex-1">
              {stage.title}
            </span>
            {/* Count badge sólido com cor do stage (bg + ring via currentColor) */}
            <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-md text-[10.5px] font-bold tabular-nums bg-muted/60 dark:bg-card/60 ${stage.color}`} style={{ boxShadow: "inset 0 0 0 1px currentColor" }}>
              {total.count}
            </span>
          </div>
          {total.count > 0 ? (
            <div className="pl-6 flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-muted-foreground">Total</span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-emerald-300 tabular-nums tracking-tight">
                  {formatCurrency(total.value)}
                </span>
              </div>
              {/* LP-PIPE.2 — barra de proporção (valor da coluna vs maior coluna) */}
              {valueRatio > 0 && (
                <div
                  className="h-[3px] w-full rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden"
                  role="presentation"
                >
                  <div
                    className={`h-full rounded-full ${dotBg} transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}
                    style={{ width: `${valueRatio * 100}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="pl-6 text-[11px] text-muted-foreground/70">
              vazio
            </div>
          )}
        </div>

        {/* ── Cards Track ──────────────────────────────────── */}
        <div className="flex-1 p-2.5 overflow-hidden max-h-[calc(100vh-240px)]">
          <ScrollArea className="h-full max-h-[calc(100vh-260px)] pr-1">
            <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 pt-1 pb-2">
                {deals.length === 0 ? (
                  // F5P.4 — empty state mais discreto, menor altura
                  <div className={`
                    flex flex-col items-center justify-center py-8 px-3 rounded-xl border border-dashed
                    transition-colors duration-150
                    ${isOver ? "border-emerald-400/50 bg-emerald-500/[0.04]" : "border-border/30"}
                  `}>
                    <TrayPh size={14} weight="duotone" className={`mb-1.5 ${isOver ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}`} />
                    <p className={`text-[10.5px] text-center leading-relaxed ${isOver ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"}`}>
                      {isOver
                        ? "Solte aqui"
                        : "Quando a conversa avançar, a EVA traz o card pra cá."}
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
                      context={contextByDeal?.get(deal.id)}
                      tags={tagsByDeal?.get(deal.id)}
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
