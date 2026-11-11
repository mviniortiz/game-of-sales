import { logLandingEvent } from "@/lib/landingFunnel";

// Clique medido no funil das landings de proposta. Só o lugar do clique: nada
// do que a pessoa digita no gerador entra aqui.
export function eventoProposta(slug: string, placement: string, extra: Record<string, string> = {}) {
    logLandingEvent("proposta", slug, "cta_click", { placement, ...extra });
}
