// useOnboardingProgress — a conta está ativada quando tem WhatsApp conectado.
// Marco DERIVADO do dado real (nunca um checkbox manual que mente), escopado
// por company_id via RLS.
//
// Eram quatro marcos (WhatsApp, contexto da EVA, primeira conversa, primeira
// oportunidade). Os três últimos são consequência do primeiro e a EVA cuida
// deles sozinha, então medi-los aqui só produzia um progresso falso de 1/4.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

const CONNECTED_STATUSES = new Set(["active", "connected"]);

export interface OnboardingState {
    /** canal de WhatsApp conectado: a conta está no ar */
    connected: boolean;
    loading: boolean;
    refetch: () => void;
}

async function fetchConnected(companyId: string): Promise<boolean> {
    const { data } = await supabase
        .from("channel_connections")
        .select("status")
        .eq("company_id", companyId);
    return (data ?? []).some((c) => CONNECTED_STATUSES.has((c.status ?? "").toLowerCase()));
}

export function useOnboardingProgress(): OnboardingState {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const query = useQuery({
        queryKey: ["onboarding-connected", effectiveCompanyId],
        enabled: !!effectiveCompanyId,
        staleTime: 30_000,
        queryFn: () => fetchConnected(effectiveCompanyId!),
    });

    return {
        connected: query.data ?? false,
        loading: query.isLoading,
        refetch: query.refetch,
    };
}
