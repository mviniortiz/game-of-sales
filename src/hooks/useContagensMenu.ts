// Os números da sidebar e das abas do celular: o que pede o dono, sem chutar.
// Hoje conta os rascunhos que esperam o 1 no WhatsApp; Orçamentos, os parados do
// placar; Conversas, quem espera resposta.
import { useEvaDiary } from "@/hooks/useEvaDiary";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { OPEN_QUOTE_STATES } from "@/lib/quoteText";

export function useContagensMenu() {
    const diary = useEvaDiary();
    const { query } = useQuoteBoard(30, null);
    const items = query.data?.items ?? [];

    return {
        hoje: diary.rascunhos.length,
        orcamentos: query.data?.totals.parked_count ?? 0,
        conversas: items.filter((q) => q.state === "your_turn").length,
        acompanhando: items.filter((q) => OPEN_QUOTE_STATES.includes(q.state)).length,
    };
}
