// Estado de verdade do WhatsApp da empresa, para a pílula do topo do app.
// channel_connections.status fica 'active' com a sessão caída; quem sabe é o vigia
// whatsapp-health (a cada 5 min), lido pela RPC whatsapp_status_empresa.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export type EstadoWhatsapp = "conectado" | "conectando" | "desconectado" | "verificando" | "sem_conexao";

export interface WhatsappStatus {
    estado: EstadoWhatsapp;
    /** Desde quando está nesse estado (precisão de 5 minutos, a do vigia). */
    desde: string | null;
    verificadoEm: string | null;
    numero: string | null;
    oficial: boolean;
}

export const whatsappStatusKey = (companyId: string | null | undefined) => ["whatsapp-status", companyId];

export function useWhatsappStatus() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const empresa = activeCompanyId || companyId;
    return useQuery({
        queryKey: whatsappStatusKey(empresa),
        enabled: !!empresa,
        staleTime: 30_000,
        refetchInterval: 60_000,
        queryFn: async (): Promise<WhatsappStatus | null> => {
            const { data, error } = await supabase.rpc("whatsapp_status_empresa" as never, { p_company_id: empresa } as never);
            if (error || !data) return null;
            const d = data as { estado?: string; desde?: string; verificado_em?: string; numero?: string; oficial?: boolean };
            return {
                estado: (d.estado ?? "verificando") as EstadoWhatsapp,
                desde: d.desde ?? null,
                verificadoEm: d.verificado_em ?? null,
                numero: d.numero ?? null,
                oficial: Boolean(d.oficial),
            };
        },
    });
}
