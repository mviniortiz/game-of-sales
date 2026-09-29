// useWhatsappConnection — o WhatsApp da empresa está ligado? Lido do banco,
// escopado por company_id via RLS.
//
// A linha de channel_connections fica 'active' mesmo com a sessão da Evolution
// caída (caso real: conta 'active' sem receber nada desde 28/06). Por isso o
// hook também diz se a conexão é da Evolution, para quem usa combinar com o
// check ao vivo (useEvolutionSender), e traz quando chegou a última conversa.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

const CONNECTED_STATUSES = new Set(["active", "connected"]);

export interface WhatsappConnection {
    /** Alguma conexão marcada como ativa no banco. */
    connected: boolean;
    /** A conexão ativa é da Evolution: só aí o check ao vivo do useEvolutionSender vale. */
    viaEvolution: boolean;
    /** Última mensagem recebida de cliente, em qualquer conversa. */
    lastInboundAt: string | null;
    loading: boolean;
}

async function fetchConnection(companyId: string) {
    const [conns, last] = await Promise.all([
        supabase.from("channel_connections").select("status, provider").eq("company_id", companyId),
        supabase
            .from("channel_conversations")
            .select("last_inbound_at")
            .eq("company_id", companyId)
            .not("last_inbound_at", "is", null)
            .order("last_inbound_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);
    const active = (conns.data ?? []).filter((c) => CONNECTED_STATUSES.has((c.status ?? "").toLowerCase()));
    return {
        connected: active.length > 0,
        viaEvolution: active.some((c) => (c.provider ?? "").toLowerCase() === "evolution"),
        lastInboundAt: (last.data?.last_inbound_at as string | null | undefined) ?? null,
    };
}

export function useWhatsappConnection(): WhatsappConnection {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const query = useQuery({
        queryKey: ["whatsapp-connection", effectiveCompanyId],
        enabled: !!effectiveCompanyId,
        staleTime: 30_000,
        queryFn: () => fetchConnection(effectiveCompanyId!),
    });

    return {
        connected: query.data?.connected ?? false,
        viaEvolution: query.data?.viaEvolution ?? false,
        lastInboundAt: query.data?.lastInboundAt ?? null,
        loading: query.isLoading,
    };
}
