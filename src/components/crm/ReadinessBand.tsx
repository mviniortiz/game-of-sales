// ─────────────────────────────────────────────────────────────────────────────
// LP-PIPE.2 — "Precisa de você agora"
//
// Faixa editorial no topo do board: até 5 oportunidades onde a EVA marcou
// prontidão. Proxy v1: temperature === 'quente' OU (proximaAcao && !isStale).
//
// REGRA DE PRIVACIDADE: exibe só a LEITURA da EVA (estado + próxima ação),
// nunca o conteúdo das mensagens. Accent roxo só aqui (a EVA é a camada).
// ─────────────────────────────────────────────────────────────────────────────
import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Deal } from "@/pages/CRM";
import type { PipelineDealContext } from "@/hooks/usePipelineContextData";

const DERIVED_READ: Record<string, string> = {
  quente: "Pronto pra avançar",
  morno: "Aquecendo",
  frio: "Esfriando",
  unknown: "Aguardando leitura",
};

interface ReadinessBandProps {
  deals: Deal[];
  contextByDeal: Map<string, PipelineDealContext>;
  formatCurrency: (value: number) => string;
}

export const ReadinessBand = memo(({ deals, contextByDeal, formatCurrency }: ReadinessBandProps) => {
  const navigate = useNavigate();

  const ready = useMemo(() => {
    const out: { deal: Deal; ctx: PipelineDealContext }[] = [];
    for (const deal of deals) {
      const ctx = contextByDeal.get(deal.id);
      if (!ctx || !ctx.conversationId) continue;
      const isReady =
        ctx.temperature === "quente" || (!!ctx.proximaAcao && !ctx.isStale);
      if (isReady) out.push({ deal, ctx });
    }
    // Quentes primeiro, depois maior valor — leva o olho pro dinheiro pronto.
    out.sort((a, b) => {
      const ta = a.ctx.temperature === "quente" ? 1 : 0;
      const tb = b.ctx.temperature === "quente" ? 1 : 0;
      if (ta !== tb) return tb - ta;
      return (b.deal.value || 0) - (a.deal.value || 0);
    });
    return out.slice(0, 5);
  }, [deals, contextByDeal]);

  if (ready.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 pt-3 sm:pt-4">
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.035] dark:bg-violet-500/[0.05] px-3.5 sm:px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: "var(--lp-eva, #6d28d9)" }}
          />
          <span className="text-[11.5px] font-semibold tracking-tight text-violet-700 dark:text-violet-300">
            Precisa de você agora
          </span>
          <span className="text-[10.5px] text-violet-600/70 dark:text-violet-300/60 tabular-nums">
            {ready.length}
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5">
          {ready.map(({ deal, ctx }) => {
            const readText = ctx.proximaAcao || DERIVED_READ[ctx.temperature] || DERIVED_READ.unknown;
            const since = ctx.lastMessageAt
              ? formatDistanceToNow(new Date(ctx.lastMessageAt), { addSuffix: false, locale: ptBR })
              : null;
            return (
              <div
                key={deal.id}
                className="group/rb flex-shrink-0 w-[220px] rounded-xl border border-slate-200/80 dark:border-border/50 bg-white dark:bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 dark:hover:border-border hover:shadow-[0_6px_16px_-8px_rgba(15,23,42,0.16)] transition-[border-color,box-shadow] duration-200"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-slate-900 dark:text-foreground tracking-tight leading-snug truncate text-left flex-1 min-w-0 hover:underline decoration-slate-300 underline-offset-2"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    title={deal.title}
                  >
                    {deal.title}
                  </button>
                  <span className="text-[12px] font-bold text-slate-900 dark:text-foreground tabular-nums tracking-tight flex-shrink-0">
                    {formatCurrency(deal.value)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-2 min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md border border-violet-500/25 bg-violet-500/[0.06] text-[10px] text-violet-700 dark:text-violet-300/90"
                    title={readText}
                  >
                    <span className="font-semibold uppercase tracking-wide text-[8.5px] opacity-80 flex-shrink-0">
                      EVA
                    </span>
                    <span className="truncate font-medium">{readText}</span>
                  </span>
                  {since && (
                    <span className="text-[9.5px] text-slate-400 dark:text-muted-foreground/70 tabular-nums flex-shrink-0 whitespace-nowrap">
                      há {since}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="group/openconv inline-flex items-center gap-1.5 px-2 py-1 -ml-0.5 rounded-full text-[10.5px] font-medium text-sky-600 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 ring-1 ring-sky-500/15 hover:ring-sky-500/25 transition-colors"
                  onClick={() => navigate(`/inbox?conversationId=${ctx.conversationId}`)}
                >
                  <MessageSquare className="h-2.5 w-2.5" />
                  Abrir conversa
                  <ArrowRight className="h-2.5 w-2.5 -ml-0.5 translate-x-0 group-hover/openconv:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ReadinessBand.displayName = "ReadinessBand";
