// EVA.STUDIO.8A — useEvaMemory
// Lê o que a EVA "sabe": playbooks (com origem), lacunas abertas e contagens.
// Só leitura, scoped por company (RLS). Sem schema novo.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RuleOrigin = "EVA Studio" | "Contexto" | "Sistema";
export interface MemoryRule { text: string; origin: RuleOrigin }

export interface EvaMemory {
    rules: MemoryRule[];
    gaps: string[];
    playbooksCount: number;
    evaStudioCount: number;
    gapsOpenCount: number;
    updatedAt: string | null;
}

function mapOrigin(source: unknown): RuleOrigin {
    if (source === "eva_studio") return "EVA Studio";
    if (source === "system" || source === "auto_learned") return "Sistema";
    return "Contexto";
}

export function useEvaMemory() {
    const { companyId } = useAuth();
    const query = useQuery({
        queryKey: ["eva-memory", companyId],
        enabled: !!companyId,
        staleTime: 60_000,
        queryFn: async (): Promise<EvaMemory> => {
            const [ctxRes, gapsRes] = await Promise.all([
                supabase.from("eva_business_context" as any).select("playbooks, updated_at").eq("company_id", companyId).maybeSingle(),
                supabase.from("eva_knowledge_gaps" as any).select("gap_description").eq("company_id", companyId).eq("status", "open").limit(30),
            ]);
            const pbs = Array.isArray((ctxRes.data as any)?.playbooks) ? (ctxRes.data as any).playbooks : [];
            const rules: MemoryRule[] = pbs
                .map((p: any) => ({
                    text: (typeof p?.content === "string" && p.content) || (typeof p?.title === "string" && p.title) || "",
                    origin: mapOrigin(p?.source),
                }))
                .filter((r: MemoryRule) => !!r.text);
            const gaps = ((gapsRes.data ?? []) as { gap_description?: string }[]).map((g) => g.gap_description).filter((x): x is string => !!x);
            return {
                rules,
                gaps,
                playbooksCount: rules.length,
                evaStudioCount: rules.filter((r) => r.origin === "EVA Studio").length,
                gapsOpenCount: gaps.length,
                updatedAt: (ctxRes.data as any)?.updated_at ?? null,
            };
        },
    });
    return { memory: query.data ?? null, loading: query.isLoading };
}
