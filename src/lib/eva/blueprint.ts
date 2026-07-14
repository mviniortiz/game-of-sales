// EVA.STUDIO.4 — Geração determinística do blueprint inicial a partir do
// contexto REAL da empresa (sem IA/edge function). Heurística pura.
//
// Regra: blueprint salvo sempre vence. Sem salvo → deriva do contexto real
// (eva_business_context, tags, stages de deals, eva_knowledge_gaps). Sem contexto
// suficiente → fallback demo, sinalizado. Nunca cria tags/pipeline reais.

// VYZON.AGENTS.3.1: + "seeded" (Padrão de Agência pronto para sugerir; segurança = aprovação humana por sugestão).
export type BlueprintStatus = "seeded" | "draft" | "in_review" | "ready_to_test" | "prepared" | "published_preview" | "partially_applied" | "approved_assisted";
export type BlueprintOrigin = "saved" | "context" | "demo" | "seeded";

export interface Blueprint {
    agent: string;
    segment: string;
    goal: string;
    pipeline: string[];
    fields: string[];
    tags: string[];
    rules: string[];
    gaps: string[];
    scenarios: unknown[];
    status: BlueprintStatus;
    applied?: { tags_applied: number; gaps_applied: number; rules_applied: number } | null;
}

type SegmentKey = "real_estate" | "agency" | "generic";

interface Preset {
    agent: string;
    label: string;
    pipeline: string[];
    fields: string[];
    tags: string[];
    rules: string[];
    gaps: string[];
}

const PRESETS: Record<SegmentKey, Preset> = {
    real_estate: {
        agent: "Qualificador imobiliário",
        label: "incorporadora",
        pipeline: ["Novo lead", "Qualificação", "Visita", "Proposta", "Reserva", "Fechado"],
        fields: ["Empreendimento", "Tipo de imóvel", "Orçamento", "Entrada", "Financiamento", "FGTS", "Prazo de compra"],
        tags: ["Financiamento", "Visita", "Investidor", "Moradia", "Alto padrão", "Objeção preço"],
        rules: [
            "Marcar “Lead quente” quando houver interesse claro, orçamento e intenção de visita.",
            "Recomendar visita quando orçamento e empreendimento estiverem definidos.",
            "Sugerir handoff humano em objeção de preço ou financiamento complexo.",
        ],
        gaps: ["Política de reserva", "Lista de empreendimentos disponíveis", "Condições de financiamento", "Regras de desconto"],
    },
    agency: {
        agent: "Qualificador comercial",
        label: "agência",
        pipeline: ["Novo lead", "Diagnóstico", "Proposta", "Negociação", "Fechado"],
        fields: ["Serviço de interesse", "Verba", "Urgência", "Canal", "Decisor"],
        tags: ["Lead quente", "Diagnóstico", "Proposta pendente", "Objeção preço", "Sem fit"],
        rules: [
            "Marcar “Lead quente” quando houver verba, urgência e decisor identificado.",
            "Pedir diagnóstico antes de enviar proposta.",
            "Sugerir handoff humano em objeção de preço ou pedido fora do escopo.",
        ],
        gaps: ["Tabela de serviços e preços", "Casos de sucesso", "Política de desconto", "Critérios de fit"],
    },
    generic: {
        agent: "Qualificador comercial",
        label: "",
        pipeline: ["Novo lead", "Qualificação", "Proposta", "Negociação", "Fechado"],
        fields: ["Interesse", "Orçamento", "Urgência", "Decisor"],
        tags: ["Lead quente", "Objeção preço", "Sem fit"],
        rules: [
            "Marcar “Lead quente” quando houver orçamento, urgência e decisor.",
            "Qualificar o lead antes de enviar proposta.",
            "Sugerir handoff humano em objeção de preço.",
        ],
        gaps: ["Tabela de preços", "Critérios de qualificação", "Política de desconto"],
    },
};

// Fallback demo (familiar — incorporadora) quando NÃO há contexto real.
export const DEMO_BLUEPRINT: Blueprint = {
    agent: PRESETS.real_estate.agent,
    segment: "Incorporadora",
    goal: "Qualificar leads de incorporadora e sugerir próximo passo",
    pipeline: [...PRESETS.real_estate.pipeline.slice(0, 5)],
    fields: ["Empreendimento", "Orçamento", "FGTS", "Visita", "Financiamento", "Prazo de compra"],
    tags: ["Lead quente", "Financiamento", "Visita", "Alto padrão", "Objeção preço"],
    rules: PRESETS.real_estate.rules,
    gaps: PRESETS.real_estate.gaps,
    scenarios: [],
    status: "in_review",
};

import { AGENCY_PACK } from "@/lib/agents/qualifier/agencyPack";

export interface EvaContextRow {
    agency?: Record<string, unknown> | null;
    services?: unknown;
    icp?: Record<string, unknown> | null;
    playbooks?: unknown;
}

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const nonEmptyObj = (v: unknown): boolean => !!v && typeof v === "object" && Object.keys(v as object).length > 0;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function detectSegment(ctx: EvaContextRow | null): SegmentKey {
    if (!ctx) return "generic";
    // JSON.stringify(array) nunca retorna undefined/null; o "?? ''" era inalcançável.
    const hay = JSON.stringify([ctx.agency, ctx.services, ctx.icp, ctx.playbooks]).toLowerCase();
    if (/incorporadora|imobili|im[oó]vel|empreendimento|apartamento|construtora|loteamento|metro quadrado/.test(hay)) return "real_estate";
    if (/ag[eê]ncia|marketing|tr[aá]fego|social ?media|publicidade|criativos|an[uú]ncios|assessoria de marketing/.test(hay)) return "agency";
    return "generic";
}

function deriveRules(ctx: EvaContextRow | null, seg: SegmentKey): string[] {
    const rules: string[] = [];
    const agency = (ctx?.agency ?? {}) as Record<string, unknown>;
    const handoff = str(agency.handoff) || str(agency.handoff_rule) || str(agency.handoff_rules);
    if (handoff) rules.push(`Fazer handoff humano quando: ${handoff}`.slice(0, 180));

    for (const p of arr(ctx?.playbooks)) {
        if (rules.length >= 4) break;
        const kind = str(p?.kind);
        const title = str(p?.title);
        const content = str(p?.content);
        const body = title || content;
        if (!body) continue;
        if (kind === "forbidden_promise") rules.push(`Nunca prometer: ${body}`.slice(0, 180));
        else if (kind === "objection") rules.push(`Objeção “${title || "comum"}”: ${content || "seguir o playbook"}`.slice(0, 180));
        else if (kind === "playbook" || kind === "faq") rules.push(body.slice(0, 180));
    }

    if (!rules.length) return [...PRESETS[seg].rules];
    return rules.slice(0, 5);
}

export interface BuildInput {
    context: EvaContextRow | null;
    companyTags: string[];
    dealStages: string[]; // já em labels PT
    openGaps: string[];
}

export function buildSuggestion(input: BuildInput): { bp: Blueprint; origin: "context" | "demo" | "seeded" } {
    const { context, companyTags, dealStages, openGaps } = input;

    const hasCtx = !!context && (nonEmptyObj(context.agency) || arr(context.services).length > 0 || nonEmptyObj(context.icp) || arr(context.playbooks).length > 0);
    const hasReal = hasCtx || companyTags.length > 0 || dealStages.length > 0 || openGaps.length > 0;

    // Sem contexto real → nasce com o Padrão de Agência no estado seeded (já sugere).
    if (!hasReal) return { bp: { ...AGENCY_PACK, scenarios: [] }, origin: "seeded" };

    const seg = detectSegment(context);
    const preset = PRESETS[seg];
    const label = preset.label;

    const bp: Blueprint = {
        agent: preset.agent,
        segment: label ? label.charAt(0).toUpperCase() + label.slice(1) : "Comercial",
        goal: `Qualificar leads${label ? ` de ${label}` : ""} e sugerir o próximo passo ideal`,
        pipeline: dealStages.length >= 2 ? dealStages : [...preset.pipeline],
        fields: [...preset.fields],
        tags: companyTags.length >= 2 ? companyTags.slice(0, 8) : [...preset.tags],
        rules: deriveRules(context, seg),
        gaps: openGaps.length ? openGaps.slice(0, 6) : [...preset.gaps],
        scenarios: [],
        status: "in_review",
    };
    return { bp, origin: "context" };
}
