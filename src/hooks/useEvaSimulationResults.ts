// EVA.STUDIO.8B — useEvaSimulationResults
// Persiste avaliações de simulação por empresa (tabela eva_simulation_results,
// singleton de blueprint). Só leitura + upsert (admin via RLS, sem service_role).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SimResultValue = "approved" | "needs_adjustment" | "rejected";
export interface SimResult {
    result: SimResultValue;
    feedback: string | null;
    isCritical: boolean;
    evaluatedAt: string | null;
    evaluatedByName: string | null;
}
export interface SaveSimArgs {
    scenarioId: string;
    scenarioTitle: string;
    isCritical: boolean;
    result: SimResultValue;
    feedback?: string | null;
}

export function useEvaSimulationResults() {
    const { companyId, user } = useAuth();
    const qc = useQueryClient();

    const bpId = useQuery({
        queryKey: ["eva-blueprint-id", companyId],
        enabled: !!companyId,
        staleTime: 60_000,
        queryFn: async (): Promise<string | null> => {
            const { data } = await supabase.from("eva_blueprints" as any).select("id").eq("company_id", companyId).maybeSingle();
            return (data as any)?.id ?? null;
        },
    });

    const query = useQuery({
        queryKey: ["eva-sim-results", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<Record<string, SimResult>> => {
            const { data, error } = await supabase
                .from("eva_simulation_results" as any)
                .select("scenario_id, result, feedback, is_critical, evaluated_at, evaluated_by")
                .eq("company_id", companyId);
            if (error || !data) return {};
            const rows = data as any[];
            const ids = Array.from(new Set(rows.map((r) => r.evaluated_by).filter(Boolean)));
            let names: Record<string, string> = {};
            if (ids.length) {
                const { data: profs } = await supabase.from("profiles" as any).select("id, nome").in("id", ids);
                names = Object.fromEntries(((profs ?? []) as any[]).map((p) => [p.id, p.nome]));
            }
            const map: Record<string, SimResult> = {};
            for (const r of rows) {
                map[r.scenario_id] = {
                    result: r.result,
                    feedback: r.feedback ?? null,
                    isCritical: !!r.is_critical,
                    evaluatedAt: r.evaluated_at ?? null,
                    evaluatedByName: r.evaluated_by ? names[r.evaluated_by] ?? null : null,
                };
            }
            return map;
        },
    });

    const save = useMutation({
        mutationFn: async ({ scenarioId, scenarioTitle, isCritical, result, feedback }: SaveSimArgs) => {
            if (!companyId) throw new Error("Empresa não identificada");
            const { error } = await supabase.from("eva_simulation_results" as any).upsert({
                company_id: companyId,
                blueprint_id: bpId.data ?? null,
                scenario_id: scenarioId,
                scenario_title: scenarioTitle,
                result,
                feedback: feedback?.trim() || null,
                is_critical: isCritical,
                evaluated_by: user?.id ?? null,
                evaluated_at: new Date().toISOString(),
            }, { onConflict: "company_id,scenario_id" });
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["eva-sim-results", companyId] }),
    });

    return {
        results: query.data ?? {},
        loading: query.isLoading,
        saving: save.isPending,
        save: (args: SaveSimArgs) => save.mutateAsync(args),
    };
}
