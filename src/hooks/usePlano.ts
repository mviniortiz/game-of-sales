// Conta paga ou não. Sem teste grátis desde 08/10/2026: paga é assinatura ativa
// (o Markus marca "Pago" em AdminCompanyDetail). Super admin vê tudo.
import { useTenant } from "@/contexts/TenantContext";

export function usePlano() {
    const { companies, activeCompanyId, isSuperAdmin, loading } = useTenant();
    const empresa = companies.find((c) => c.id === activeCompanyId);
    return {
        pago: isSuperAdmin || empresa?.subscription_status === "active",
        carregando: loading || (!isSuperAdmin && !empresa),
    };
}

/** Telas liberadas sem assinatura: o placar, a assinatura, conta e ajuda. */
const ROTAS_GRATIS = ["/orcamentos", "/upgrade", "/configuracoes", "/profile", "/docs"];

export function rotaGratis(pathname: string) {
    return ROTAS_GRATIS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
