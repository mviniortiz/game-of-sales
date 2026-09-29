// useQuoteBoard — placar de orçamentos da empresa (RPC get_quote_board).
// O estado de cada orçamento (nunca respondeu, respondeu e sumiu, esperando
// você...) vem calculado do banco (view quote_tracking_live). Usado pela tela
// Orçamentos e pela fila "Agora" do Início.
//
// preview (só em dev, ?preview=): "vazio" | "erro" | qualquer outro = exemplo cheio.
// A RPC ainda não está nos tipos gerados, daí o cast local.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export type QuoteState = "no_reply" | "went_quiet" | "your_turn" | "talking" | "won" | "lost" | "expired" | "closed";
export type QuoteOutcome = "won" | "lost" | null;
export type DraftStatus = "pending" | "accepted" | "adjusted" | "rejected" | "expired" | "sent";

export type QuoteItem = {
  id: string;
  deal_id: string | null;
  conversation_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  amount: number | null;
  detected_by: "pdf" | "text";
  sent_at: string;
  state: QuoteState;
  /** Dias no estado atual (desde o orçamento, a última fala do cliente ou o desfecho). */
  days: number;
  outcome: QuoteOutcome;
  recovered: boolean;
  followup_sent_at: string | null;
  draft_status: DraftStatus | null;
  draft_at: string | null;
};

export type QuoteBoard = {
  totals: {
    parked_amount: number;
    parked_count: number;
    no_reply_count: number;
    went_quiet_count: number;
    your_turn_amount: number;
    your_turn_count: number;
    talking_count: number;
    recovered_amount: number;
    recovered_count: number;
    won_amount: number;
    won_count: number;
    lost_count: number;
    expired_count: number;
    total_count: number;
  };
  items: QuoteItem[];
};

type RpcResult<T> = { data: T | null; error: { message: string; code?: string } | null };
type RpcFn = <T>(fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult<T>>;
export const quoteRpc = supabase.rpc.bind(supabase) as unknown as RpcFn;

export const EMPTY_QUOTE_BOARD: QuoteBoard = {
  totals: {
    parked_amount: 0, parked_count: 0, no_reply_count: 0, went_quiet_count: 0,
    your_turn_amount: 0, your_turn_count: 0, talking_count: 0,
    recovered_amount: 0, recovered_count: 0, won_amount: 0, won_count: 0,
    lost_count: 0, expired_count: 0, total_count: 0,
  },
  items: [],
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const sampleItem = (p: Partial<QuoteItem> & Pick<QuoteItem, "id" | "state" | "days">): QuoteItem => ({
  deal_id: `d-${p.id}`, conversation_id: `c-${p.id}`, contact_name: null, contact_phone: null, amount: null,
  detected_by: "pdf", sent_at: daysAgo(p.days), outcome: null, recovered: false, followup_sent_at: null,
  draft_status: null, draft_at: null, ...p,
});
const SAMPLE_QUOTE_BOARD: QuoteBoard = {
  totals: {
    parked_amount: 115_300, parked_count: 5, no_reply_count: 3, went_quiet_count: 2,
    your_turn_amount: 18_400, your_turn_count: 1, talking_count: 1,
    recovered_amount: 23_900, recovered_count: 1, won_amount: 35_500, won_count: 2,
    lost_count: 1, expired_count: 1, total_count: 11,
  },
  items: [
    sampleItem({ id: "p1", state: "your_turn", days: 1, contact_name: "Marcos Vieira", amount: 18_400, sent_at: daysAgo(6) }),
    sampleItem({ id: "p2", state: "went_quiet", days: 8, contact_name: "Padaria Trigo Bom", amount: 61_200, sent_at: daysAgo(12), draft_status: "pending", draft_at: daysAgo(0) }),
    sampleItem({ id: "p3", state: "no_reply", days: 5, contact_name: "Carlos Menezes", amount: 23_900, draft_status: "sent", draft_at: daysAgo(3), followup_sent_at: daysAgo(3) }),
    sampleItem({ id: "p4", state: "went_quiet", days: 4, contact_name: "Juliana Rocha", amount: 14_300, sent_at: daysAgo(9) }),
    sampleItem({ id: "p5", state: "no_reply", days: 22, contact_name: "Ana Paula Ribeiro", amount: 15_900, draft_status: "rejected", draft_at: daysAgo(19) }),
    sampleItem({ id: "p6", state: "no_reply", days: 1, contact_name: null, contact_phone: "5521988887777", amount: null, detected_by: "text" }),
    sampleItem({ id: "p7", state: "talking", days: 1, contact_name: "Condomínio Vila Verde", amount: 142_000, sent_at: daysAgo(4) }),
    sampleItem({ id: "p8", state: "won", days: 2, contact_name: "Rafael Nunes", amount: 23_900, recovered: true, outcome: "won", followup_sent_at: daysAgo(9), sent_at: daysAgo(16) }),
    sampleItem({ id: "p9", state: "won", days: 6, contact_name: "Mercado Bom Preço", amount: 11_600, outcome: "won", sent_at: daysAgo(14) }),
    sampleItem({ id: "p10", state: "lost", days: 3, contact_name: "Pedro Almeida", amount: 9_800, outcome: "lost", sent_at: daysAgo(11) }),
    sampleItem({ id: "p11", state: "expired", days: 31, contact_name: "Studio Forma", amount: 12_300, sent_at: daysAgo(31) }),
  ],
};

export function useQuoteBoard(days: number, preview: string | null = null) {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;
  const queryKey = ["quote-board", effectiveCompanyId, days, preview] as const;

  const query = useQuery({
    queryKey,
    enabled: !!preview || !!effectiveCompanyId,
    retry: false,
    queryFn: async (): Promise<QuoteBoard> => {
      if (import.meta.env.DEV && preview) {
        if (preview === "erro") throw Object.assign(new Error("preview"), { code: "PGRST202" });
        return preview === "vazio" ? EMPTY_QUOTE_BOARD : structuredClone(SAMPLE_QUOTE_BOARD);
      }
      const { data, error } = await quoteRpc<QuoteBoard>("get_quote_board", {
        p_company_id: effectiveCompanyId,
        p_days: days,
      });
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      return {
        totals: { ...EMPTY_QUOTE_BOARD.totals, ...(data?.totals ?? {}) },
        items: data?.items ?? [],
      };
    },
  });

  return { query, queryKey };
}
