// Se a EVA já conhece a empresa efetiva: existe linha em eva_business_context.
// Orçamentos usa para levar a conta nova à configuração por conversa.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export const EVA_SETUP_PATH = "/configurar-eva";

export function setupDismissKey(companyId: string) {
    return `vyz:eva-setup-depois:${companyId}`;
}

export function useEvaSetup() {
    const { companyId: authCompanyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const companyId = activeCompanyId || authCompanyId || null;

    const q = useQuery({
        queryKey: ["eva-setup", companyId],
        enabled: !!companyId,
        staleTime: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("eva_business_context")
                .select("version")
                .eq("company_id", companyId!)
                .maybeSingle();
            if (error) throw error;
            return { configured: !!data, version: (data?.version as number | null) ?? null };
        },
    });

    return { companyId, configured: q.data?.configured ?? null, version: q.data?.version ?? null, loading: q.isLoading };
}
