// O que o dono faz hoje com a prospecção do número atual (bloco do Início).
// Lê a RPC get_prospeccao_hoje (auth.uid(), desde a troca de número). Só leitura:
// a decisão continua no grupo da prospecção no WhatsApp.
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { quoteRpc } from "@/hooks/useQuoteBoard";
import type { ProspeccaoHoje } from "@/lib/prospeccaoPasso";

export type { ProspeccaoHoje, ProspectItem, ProximoPasso } from "@/lib/prospeccaoPasso";
export { ordenarItens, proximoPasso } from "@/lib/prospeccaoPasso";

export function useProspeccaoHoje() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ["inicio", "prospeccao-hoje", user?.id],
        enabled: !!user?.id,
        staleTime: 60_000,
        refetchInterval: 120_000,
        queryFn: async (): Promise<ProspeccaoHoje> => {
            const { data, error } = await quoteRpc<ProspeccaoHoje>("get_prospeccao_hoje", {});
            if (error) throw new Error(error.message);
            return data ?? { ativo: false };
        },
    });
}
