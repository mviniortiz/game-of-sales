import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DealCard, StageNeighbors } from "./DealCard";
import type { Deal } from "@/pages/CRM";
import type { Stage } from "@/lib/pipelineStyles";
import type { PipelineDealContext } from "@/hooks/usePipelineContextData";
import type { QuoteItem } from "@/hooks/useQuoteBoard";
import type { Tag } from "@/types/tags";
// F5P.4e — Phosphor duotone padronizado (consistente com sidebar e header).
import { Tray as TrayPh, ArrowRight as ArrowRightPh } from "@phosphor-icons/react";

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  total: { count: number; value: number };
  formatCurrency: (value: number) => string;
  onDeleteDeal?: (deal: Deal) => void;
  onMarkWon?: (deal: Deal) => void;
  quoteByDeal?: Map<string, QuoteItem>;
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
  showAssignee?: boolean;
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
  onMarkWon,
  quoteByDeal,
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
  showAssignee = true,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  // LP-PIPE.2 — proporção do valor desta coluna vs a maior coluna do board.
  // Barra hairline dá a sensação de "onde está o dinheiro" sem números extras.
  const valueRatio = maxColumnValue > 0
    ? Math.max(0.04, Math.min(1, total.value / maxColumnValue))
    : 0;

  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  const conversionRate = useMemo(() => {
    // Com menos de 5 na etapa anterior a razão é ruído: 1 de 1 virava "100%".
    if (!showConversionRate || !previousStageCount || previousStageCount < 5) return null;
    const rate = Math.round((total.count / previousStageCount) * 100);
    // F5P.4c — pipelines com poucos deals geram ratios >100% que não fazem
    // sentido como "conversão". Esconde quando estágio atual >= anterior.
    if (rate > 100) return null;
    return rate;
  }, [showConversionRate, total.count, previousStageCount]);

  // Cor da etapa (text-* → bg-*) para o ponto do cabeçalho e a barra de valor.
  const dotBg = stage.color.replace("text-", "bg-").replace("-400", "-500");

  return (
    <div className="flex items-stretch gap-0 h-full snap-start">
      {/* Funnel connector BEFORE this column (left side) - hidden on mobile for snap-scroll */}
      {showConversionRate && conversionRate !== null && (
        <div className="hidden sm:flex">
          <FunnelConnector rate={conversionRate} />
        </div>
      )}

      {/* A coluna é só um trilho quase invisível no fundo do app: quem tem peso
          visual são os cards brancos, não as caixas das etapas. */}
      <div
        ref={setNodeRef}
        className={`
          relative flex flex-col w-[88vw] max-w-[380px] sm:w-[256px] 2xl:w-[280px] sm:max-w-none flex-shrink-0 h-full rounded-2xl
          border transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden
          ${isOver
            ? "border-[var(--vyz-accent-border-strong)] bg-[var(--vyz-accent-soft-4)]"
            : "border-transparent bg-[rgba(15,23,42,0.03)] dark:bg-card/40"
          }
        `}
      >
        {/* Uma linha: etapa, quantidade e valor. Embaixo, a barra de quanto
            dinheiro está nesta etapa comparada à maior. */}
        <div className="px-3.5 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotBg}`} aria-hidden />
            <span className="font-semibold text-foreground text-[13px] tracking-tight truncate">
              {stage.title}
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-[var(--vyz-text-muted)]">
              {total.count}
            </span>
            {total.value > 0 && (
              <span className="ml-auto text-[13px] font-bold text-[var(--vyz-text-primary)] tabular-nums tracking-tight">
                {formatCurrency(total.value)}
              </span>
            )}
          </div>
          {/* LP-PIPE.2 — barra de proporção (valor da coluna vs maior coluna).
              O trilho aparece mesmo vazio para os cabeçalhos terem a mesma altura. */}
          <div
            className="mt-2 h-[3px] w-full rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden"
            role="presentation"
          >
            {total.count > 0 && valueRatio > 0 && (
              <div
                className={`h-full rounded-full ${dotBg} transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`}
                style={{ width: `${valueRatio * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* ── Cards Track ──────────────────────────────────────
            Altura vem da cadeia flex (coluna h-full ← board ← .vz-page-full);
            sem cap em 100vh, que no Safari iOS cortava os últimos cards. */}
        <div className="flex-1 p-2.5 overflow-hidden">
          {/* O Radix embrulha o conteúdo em display:table, que cresce com texto
              sem quebra e empurra o card para fora da coluna. Bloco mantém a largura. */}
          <ScrollArea className="h-full pr-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
            <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 pt-1 pb-2">
                {deals.length === 0 ? (
                  // F5P.4 — empty state mais discreto, menor altura
                  <div className={`
                    flex flex-col items-center justify-center py-8 px-3 rounded-xl border border-dashed
                    transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isOver ? "border-[var(--vyz-accent-border-strong)] bg-[var(--vyz-accent-soft-6)]" : "border-border/30"}
                  `}>
                    <TrayPh size={14} weight="duotone" className={`mb-1.5 ${isOver ? "text-[var(--vyz-accent)]" : "text-muted-foreground/50"}`} />
                    <p className={`text-[10.5px] text-center leading-relaxed ${isOver ? "text-[var(--vyz-accent)] font-medium" : "text-muted-foreground/60"}`}>
                      {isOver
                        ? "Solte aqui"
                        : "Arraste um card pra cá. A EVA também move quando a conversa avança."}
                    </p>
                  </div>
                ) : (
                  deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      formatCurrency={formatCurrency}
                      onDelete={onDeleteDeal}
                      onMarkWon={onMarkWon}
                      quote={quoteByDeal?.get(deal.id)}
                      selectionMode={selectionMode}
                      isSelected={selectedDeals?.has(deal.id) ?? false}
                      onToggleSelect={onToggleSelect}
                      stageNeighbors={stageNeighbors}
                      onSwipeMove={onSwipeMove}
                      context={contextByDeal?.get(deal.id)}
                      tags={tagsByDeal?.get(deal.id)}
                      showAssignee={showAssignee}
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
