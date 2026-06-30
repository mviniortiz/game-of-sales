// ─────────────────────────────────────────────────────────────────────────────
// F4E.4.1 (2026-05-20) — Shape padronizado de qualification
//
// Esta é a versão Deno/edge-friendly (TypeScript puro, sem dep externa).
// O equivalente no frontend está em src/lib/eva/qualificationSchema.ts (Zod).
//
// IMPORTANTE: Quando mudar o shape, atualizar AMBOS os arquivos.
// ─────────────────────────────────────────────────────────────────────────────

export type IntencaoTipo =
    | "preco"
    | "demo"
    | "duvida"
    | "suporte"
    | "compra"
    | "outro";

export type Temperatura = "frio" | "morno" | "quente";

export type FitSugerido = "baixo" | "medio" | "bom" | "excelente";

export type Urgencia = "baixa" | "media" | "alta" | "indefinida";

export type Orcamento =
    | "informado"
    | "nao_informado"
    | "baixo"
    | "adequado"
    | "alto";

export type ProximaAcao =
    | "responder"
    | "qualificar"
    | "criar_oportunidade"
    | "marcar_demo"
    | "handoff_humano"
    | "aguardar";

export type KnowledgeGapType =
    | "agency_context"
    | "service"
    | "pricing"
    | "icp"
    | "handoff_rule"
    | "tone"
    | "other";

export type FixTarget = "agency" | "services" | "icp" | "playbooks";

export interface KnowledgeGap {
    type: KnowledgeGapType;
    description: string;
    suggested_fix: string;
    fix_target: FixTarget;
}

export interface Qualification {
    servico_interesse: string | null;
    intencao: IntencaoTipo | null;
    temperatura: Temperatura | null;
    fit_sugerido: FitSugerido | null;
    score_sugerido: number | null;
    score_justificativa: string | null;
    urgencia: Urgencia | null;
    orcamento: Orcamento | null;
    /** Valor estimado da oportunidade (R$), ANCORADO no preço do serviço
     *  cadastrado que casa com servico_interesse. null se não houver base. */
    valor_estimado: number | null;
    objecao: string | null;
    info_coletada: string[];
    info_faltante: string[];
    proxima_acao: ProximaAcao | null;
    resposta_sugerida: string | null;
    deve_criar_oportunidade: boolean;
    deve_fazer_handoff: boolean;
    confianca: number;
    knowledge_gaps: KnowledgeGap[];
}

// ─── Enums permitidos ─────────────────────────────────────────────────────

const INTENCAO_VALUES: IntencaoTipo[] = [
    "preco", "demo", "duvida", "suporte", "compra", "outro",
];
const TEMPERATURA_VALUES: Temperatura[] = ["frio", "morno", "quente"];
const FIT_VALUES: FitSugerido[] = ["baixo", "medio", "bom", "excelente"];
const URGENCIA_VALUES: Urgencia[] = ["baixa", "media", "alta", "indefinida"];
const ORCAMENTO_VALUES: Orcamento[] = [
    "informado", "nao_informado", "baixo", "adequado", "alto",
];
const PROXIMA_ACAO_VALUES: ProximaAcao[] = [
    "responder", "qualificar", "criar_oportunidade",
    "marcar_demo", "handoff_humano", "aguardar",
];
const GAP_TYPE_VALUES: KnowledgeGapType[] = [
    "agency_context", "service", "pricing", "icp",
    "handoff_rule", "tone", "other",
];
const FIX_TARGET_VALUES: FixTarget[] = [
    "agency", "services", "icp", "playbooks",
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function pickEnum<T extends string>(
    raw: unknown,
    allowed: readonly T[],
): T | null {
    if (typeof raw !== "string") return null;
    return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function cleanString(raw: unknown, maxLen: number): string | null {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLen);
}

function cleanStringArray(raw: unknown, maxItems: number, maxLen: number): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
        const s = cleanString(item, maxLen);
        if (s) out.push(s);
        if (out.length >= maxItems) break;
    }
    return out;
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

function normalizeKnowledgeGap(raw: unknown): KnowledgeGap | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const type = pickEnum(r.type, GAP_TYPE_VALUES);
    const description = cleanString(r.description, 280);
    const suggested_fix = cleanString(r.suggested_fix, 280);
    const fix_target = pickEnum(r.fix_target, FIX_TARGET_VALUES);
    if (!type || !description || !suggested_fix || !fix_target) return null;
    return { type, description, suggested_fix, fix_target };
}

// ─── Normalização principal ───────────────────────────────────────────────

/**
 * Recebe um objeto livre (do GPT) e devolve um shape estrito de Qualification.
 * Nunca lança — campos inválidos/ausentes viram null/[]/false. Strings são
 * capadas em comprimento pra evitar payload gigante.
 */
export function normalizeQualification(raw: unknown): Qualification {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

    // score 0..100
    let score: number | null = null;
    if (typeof r.score_sugerido === "number" && Number.isFinite(r.score_sugerido)) {
        score = Math.round(clamp(r.score_sugerido, 0, 100));
    }

    // valor estimado (R$) — número não-negativo (ancorado no preço do serviço)
    let valor_estimado: number | null = null;
    if (typeof r.valor_estimado === "number" && Number.isFinite(r.valor_estimado) && r.valor_estimado >= 0) {
        valor_estimado = Math.round(r.valor_estimado);
    }

    // confianca 0..1
    let confianca = 0.5;
    if (typeof r.confianca === "number" && Number.isFinite(r.confianca)) {
        confianca = clamp(r.confianca, 0, 1);
    }

    const gapsRaw = Array.isArray(r.knowledge_gaps) ? r.knowledge_gaps : [];
    const knowledge_gaps: KnowledgeGap[] = [];
    for (const g of gapsRaw) {
        const norm = normalizeKnowledgeGap(g);
        if (norm) knowledge_gaps.push(norm);
        if (knowledge_gaps.length >= 5) break; // cap defensivo
    }

    return {
        servico_interesse: cleanString(r.servico_interesse, 200),
        intencao: pickEnum(r.intencao, INTENCAO_VALUES),
        temperatura: pickEnum(r.temperatura, TEMPERATURA_VALUES),
        fit_sugerido: pickEnum(r.fit_sugerido, FIT_VALUES),
        score_sugerido: score,
        score_justificativa: cleanString(r.score_justificativa, 280),
        urgencia: pickEnum(r.urgencia, URGENCIA_VALUES),
        orcamento: pickEnum(r.orcamento, ORCAMENTO_VALUES),
        valor_estimado,
        objecao: cleanString(r.objecao, 240),
        info_coletada: cleanStringArray(r.info_coletada, 10, 200),
        info_faltante: cleanStringArray(r.info_faltante, 10, 200),
        proxima_acao: pickEnum(r.proxima_acao, PROXIMA_ACAO_VALUES),
        resposta_sugerida: cleanString(r.resposta_sugerida, 1200),
        deve_criar_oportunidade: r.deve_criar_oportunidade === true,
        deve_fazer_handoff: r.deve_fazer_handoff === true,
        confianca,
        knowledge_gaps,
    };
}

export function emptyQualification(): Qualification {
    return {
        servico_interesse: null,
        intencao: null,
        temperatura: null,
        fit_sugerido: null,
        score_sugerido: null,
        score_justificativa: null,
        urgencia: null,
        orcamento: null,
        valor_estimado: null,
        objecao: null,
        info_coletada: [],
        info_faltante: [],
        proxima_acao: null,
        resposta_sugerida: null,
        deve_criar_oportunidade: false,
        deve_fazer_handoff: false,
        confianca: 0,
        knowledge_gaps: [],
    };
}
