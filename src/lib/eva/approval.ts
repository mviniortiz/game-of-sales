// EVA.STUDIO.8A — Critérios de aprovação do agente (cálculo puro, local/demo).
// "Score de validação" para uso ASSISTIDO (nunca autônomo). Travas de segurança
// independem do score.
import type { Blueprint } from "./blueprint";

export type Verdict = "approved" | "adjust" | "rejected";
export type CriterionStatus = "aprovado" | "pendente" | "bloqueado";
export interface Criterion { label: string; status: CriterionStatus }

export interface ApprovalResult {
    criteria: Criterion[];
    score: number;            // 0..100
    blocked: boolean;
    blockers: string[];
    testedCount: number;
    rejected: number;
    hasHandoff: boolean;
    agentStatus: string;      // Rascunho | Em revisão | Em simulação | Pronto para uso assistido | Bloqueado
    readiness: "ready" | "review" | "blocked";
}

export interface ApprovalInput {
    bp: Blueprint;
    rulesText: string[];
    openGapsCount: number;
    evaluations: Record<string, Verdict>;
    scenarioCount: number;
    /** quantos cenários CRÍTICOS estão reprovados (trava de segurança) */
    criticalRejected?: number;
}

export function computeApproval({ bp, rulesText, openGapsCount, evaluations, criticalRejected }: ApprovalInput): ApprovalResult {
    const text = rulesText.join(" \n ").toLowerCase();
    const hasHandoff = /handoff|humano|especialista|encaminh/.test(text);
    const hasForbidden = /nunca prometer|proibid|não promet|nao promet|sem prometer|não ofere|nao ofere/.test(text);

    const verdicts = Object.values(evaluations);
    const testedCount = verdicts.length;
    const rejected = verdicts.filter((v) => v === "rejected").length;
    const critRejected = criticalRejected ?? rejected;
    const advanced = bp.status !== "draft" && bp.status !== "in_review" && bp.status !== "seeded";
    const rulesApplied = (bp.applied?.rules_applied ?? 0) > 0;

    const criteria: Criterion[] = [
        { label: "Objetivo do agente definido", status: bp.goal.trim() ? "aprovado" : "pendente" },
        { label: "ICP / segmento definido", status: bp.segment.trim() ? "aprovado" : "pendente" },
        { label: "Pipeline sugerido revisado", status: bp.pipeline.length >= 2 && advanced ? "aprovado" : "pendente" },
        { label: "Regras comerciais aplicadas", status: rulesApplied ? "aprovado" : "pendente" },
        { label: "Lacunas críticas revisadas", status: openGapsCount === 0 ? "aprovado" : "pendente" },
        { label: "Respostas proibidas definidas", status: hasForbidden ? "aprovado" : "pendente" },
        { label: "Handoff humano definido", status: hasHandoff ? "aprovado" : "bloqueado" },
        { label: "Pelo menos 5 simulações testadas", status: testedCount >= 5 ? "aprovado" : "pendente" },
        { label: "Nenhum cenário crítico reprovado", status: critRejected > 0 ? "bloqueado" : "aprovado" },
        { label: "Publicação automática desativada", status: "aprovado" },
    ];

    const approved = criteria.filter((c) => c.status === "aprovado").length;
    const score = Math.round((approved / criteria.length) * 100);

    const blockers: string[] = [];
    if (!hasHandoff) blockers.push("Defina o handoff humano nas regras antes de aprovar.");
    if (critRejected > 0) blockers.push("Há cenário crítico reprovado na simulação.");

    const blocked = blockers.length > 0 || score < 50;

    let agentStatus: string;
    let readiness: ApprovalResult["readiness"];
    if (blocked) { agentStatus = "Bloqueado"; readiness = "blocked"; }
    else if (score >= 80) { agentStatus = "Pronto para uso assistido"; readiness = "ready"; }
    else if (testedCount > 0 && testedCount < 5) { agentStatus = "Em simulação"; readiness = "review"; }
    else { agentStatus = "Em revisão"; readiness = "review"; }

    return { criteria, score, blocked, blockers, testedCount, rejected, hasHandoff, agentStatus, readiness };
}
