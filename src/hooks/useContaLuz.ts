// CONTA.1: última conta de luz que a Lume leu nesta conversa, e as ações do
// dono (confirmar, corrigir, descartar). Tabela conta_luz_leituras.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CamposConta, ContaLuz } from "@/lib/contaLuz";

// Tabela nova, ainda fora dos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const COLS = "id, consumo_kwh, valor_reais, distribuidora, cidade, uf, classe, mes_referencia, fonte, status, created_at";

export function useContaLuz(conversationId: string | null | undefined) {
    const qc = useQueryClient();
    const key = ["conta-luz", conversationId];

    const query = useQuery({
        queryKey: key,
        enabled: !!conversationId,
        staleTime: 15_000,
        // A foto chega com o painel aberto: confere de novo a cada 20 s.
        refetchInterval: 20_000,
        queryFn: async (): Promise<ContaLuz | null> => {
            const { data, error } = await db
                .from("conta_luz_leituras")
                .select(COLS)
                .eq("conversation_id", conversationId)
                .neq("status", "descartada")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            // Tabela ainda não aplicada no banco: o painel segue sem a linha.
            if (error) return null;
            if (!data) return null;
            const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
            return { ...data, consumo_kwh: num(data.consumo_kwh), valor_reais: num(data.valor_reais) } as ContaLuz;
        },
    });

    const revisar = useMutation({
        mutationFn: async (p: { id: string; status: "confirmada" | "corrigida" | "descartada"; campos?: CamposConta }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await db
                .from("conta_luz_leituras")
                .update({ status: p.status, ...(p.campos ?? {}), revisado_por: user?.id ?? null, revisado_em: new Date().toISOString() })
                .eq("id", p.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: (_d, p) => {
            toast.success(p.status === "descartada" ? "Leitura descartada" : p.status === "corrigida" ? "Conta corrigida" : "Conta confirmada");
            qc.invalidateQueries({ queryKey: key });
        },
        onError: (e: Error) => toast.error(e.message || "Não consegui salvar"),
    });

    return { conta: query.data ?? null, revisar };
}
