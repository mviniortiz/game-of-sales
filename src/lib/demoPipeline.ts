// Override de NOMES das etapas do pipeline para a conta de demonstração de
// incorporadora (DEMO.2 — "Incorporadora Aurora"). Afeta SOMENTE essa company;
// os IDs persistidos no banco (lead/qualification/proposal/negotiation/
// closed_won/closed_lost) continuam os mesmos. É só relabeling de UI.
//
// Para reverter: remover este arquivo e os usos de stageLabelFor.
export const DEMO_INCORPORADORA_COMPANY_ID = "d1e00000-0000-4000-8000-000000000001";

const INCORPORADORA_STAGE_LABELS: Record<string, string> = {
    lead: "Novo lead",
    qualification: "Qualificação",
    proposal: "Visita agendada",
    negotiation: "Proposta enviada",
    closed_won: "Vendido",
    closed_lost: "Perdido",
};

/**
 * Retorna o label da etapa para a company. Na demo de incorporadora usa o
 * vocabulário imobiliário; em qualquer outra company devolve o fallback.
 */
export function stageLabelFor(
    companyId: string | null | undefined,
    stageId: string,
    fallback: string,
): string {
    if (companyId === DEMO_INCORPORADORA_COMPANY_ID) {
        return INCORPORADORA_STAGE_LABELS[stageId] ?? fallback;
    }
    return fallback;
}
