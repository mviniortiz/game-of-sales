// Se a EVA já conhece a empresa efetiva: existe linha em eva_business_context.
// Orçamentos usa para levar a conta nova ao Raio-X (sem assinatura) ou à
// configuração por conversa (assinante).
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
            const [ctx, empresa] = await Promise.all([
                supabase.from("eva_business_context").select("version").eq("company_id", companyId!).maybeSingle(),
                // quote_seed_at ainda fora dos tipos gerados.
                supabase.from("companies").select("quote_seed_at" as "id").eq("id", companyId!).maybeSingle(),
            ]);
            if (ctx.error) throw ctx.error;
            const seed = (empresa.data as { quote_seed_at?: string | null } | null)?.quote_seed_at ?? null;
            return { configured: !!ctx.data, version: (ctx.data?.version as number | null) ?? null, fezRaioX: !!seed };
        },
    });

    return {
        companyId,
        configured: q.data?.configured ?? null,
        version: q.data?.version ?? null,
        /** O histórico já foi lido uma vez (Raio-X automático ou primeiros passos). */
        fezRaioX: q.data?.fezRaioX ?? null,
        loading: q.isLoading,
    };
}
