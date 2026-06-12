// VYZON.AGENTS.2 (híbrido) — Configuração de auto-criação de oportunidade.
//
// Lê do blueprint da empresa se a EVA pode criar o card no pipeline sozinha
// (auto_create_opportunity) e se está liberada para operar (status
// approved_assisted). Leve: só os 2 campos, cacheado. O gate real vive no
// EvaPanel, que combina isto com o sinal deve_criar_oportunidade da análise.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useHybridAutoCreate() {
  const { companyId } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["hybrid-auto-create", companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("eva_blueprints" as never)
        .select("status, auto_create_opportunity")
        .eq("company_id", companyId)
        .maybeSingle();
      const row = (data ?? null) as { status?: string; auto_create_opportunity?: boolean } | null;
      return {
        approved: row?.status === "approved_assisted",
        autoCreate: row?.auto_create_opportunity === true,
      };
    },
  });

  // Liga/desliga o modo híbrido. Atualiza a linha existente do blueprint da
  // empresa (o agente já foi criado). Admin-only é garantido pela RLS de update
  // de eva_blueprints (has_role admin).
  const setAutoCreate = useMutation({
    mutationFn: async (value: boolean): Promise<void> => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { error } = await supabase
        .from("eva_blueprints" as never)
        .update({ auto_create_opportunity: value } as never)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hybrid-auto-create", companyId] }),
  });

  return {
    approved: query.data?.approved ?? false,
    autoCreate: query.data?.autoCreate ?? false,
    ready: query.isSuccess,
    setAutoCreate: (value: boolean) => setAutoCreate.mutateAsync(value),
    saving: setAutoCreate.isPending,
  };
}
