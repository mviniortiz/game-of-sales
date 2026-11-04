// Se a empresa efetiva é uma das primeiras integradoras (fundadora) e quantas
// vagas restam. Fonte: RPC minha_vaga_fundadora. Falha vira null: a tela segue
// com o caminho de sempre (/upgrade), nunca promete vaga sem ter lido.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { lerVaga, type VagaFundadora } from "@/lib/fundadora";

export async function buscarVagaFundadora(companyId: string | null): Promise<VagaFundadora | null> {
    // RPC nova, fora dos tipos gerados. O parâmetro só vale para o super admin.
    const { data, error } = await supabase.rpc("minha_vaga_fundadora" as never, { p_company: companyId } as never);
    if (error) return null;
    return lerVaga(data);
}

export function useVagaFundadora(enabled = true) {
    const { user, companyId: authCompanyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const companyId = activeCompanyId || authCompanyId || null;
    return useQuery({
        queryKey: ["vaga-fundadora", companyId],
        enabled: enabled && !!user && !!companyId,
        staleTime: 60_000,
        queryFn: () => buscarVagaFundadora(companyId),
    });
}
