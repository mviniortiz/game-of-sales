// EVA.STUDIO.7 — useEvaStudioRules
// Lê as regras aplicadas pelo EVA Studio (eva_business_context.playbooks com
// source='eva_studio'). Somente leitura — orienta a sugestão visual da EVA,
// não dispara nenhuma ação. Scoped por company (RLS).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useEvaStudioRules() {
    const { companyId } = useAuth();
    const query = useQuery({
        queryKey: ["eva-studio-rules", companyId],
        enabled: !!companyId,
        staleTime: 60_000,
        queryFn: async (): Promise<string[]> => {
            const { data, error } = await supabase
                .from("eva_business_context" as any)
                .select("playbooks")
                .eq("company_id", companyId)
                .maybeSingle();
            if (error || !data) return [];
            const pbs = Array.isArray((data as any).playbooks) ? (data as any).playbooks : [];
            return pbs
                .filter((p: any) => p?.source === "eva_studio" && (p?.kind === "playbook" || !p?.kind))
                .map((p: any) => (typeof p?.content === "string" && p.content) || (typeof p?.title === "string" && p.title) || "")
                .filter((s: string): s is string => !!s);
        },
    });
    return { rules: (query.data ?? []) as string[], loading: query.isLoading };
}
