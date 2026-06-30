// ─────────────────────────────────────────────────────────────────────────────
// F4E.4.1 (2026-05-20) — Shape Zod de qualification (frontend)
//
// Espelha o shape em supabase/functions/_shared/evaQualification.ts.
// Usado pelo EvaPanel + hooks da F4E.4.3+. Quando atualizar, sincronizar
// com o arquivo do edge function (TS puro lá pra evitar dep externa).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

export const intencaoEnum = z.enum([
  "preco",
  "demo",
  "duvida",
  "suporte",
  "compra",
  "outro",
]);

export const temperaturaEnum = z.enum(["frio", "morno", "quente"]);
export const fitSugeridoEnum = z.enum(["baixo", "medio", "bom", "excelente"]);
export const urgenciaEnum = z.enum(["baixa", "media", "alta", "indefinida"]);
export const orcamentoEnum = z.enum([
  "informado",
  "nao_informado",
  "baixo",
  "adequado",
  "alto",
]);
export const proximaAcaoEnum = z.enum([
  "responder",
  "qualificar",
  "criar_oportunidade",
  "marcar_demo",
  "handoff_humano",
  "aguardar",
]);

export const knowledgeGapTypeEnum = z.enum([
  "agency_context",
  "service",
  "pricing",
  "icp",
  "handoff_rule",
  "tone",
  "other",
]);

export const fixTargetEnum = z.enum([
  "agency",
  "services",
  "icp",
  "playbooks",
]);

export const knowledgeGapSchema = z.object({
  type: knowledgeGapTypeEnum,
  description: z.string().min(1).max(280),
  suggested_fix: z.string().min(1).max(280),
  fix_target: fixTargetEnum,
});

export const qualificationSchema = z.object({
  servico_interesse: z.string().max(200).nullable().default(null),
  intencao: intencaoEnum.nullable().default(null),
  temperatura: temperaturaEnum.nullable().default(null),
  fit_sugerido: fitSugeridoEnum.nullable().default(null),
  score_sugerido: z.number().int().min(0).max(100).nullable().default(null),
  score_justificativa: z.string().max(280).nullable().default(null),
  urgencia: urgenciaEnum.nullable().default(null),
  orcamento: orcamentoEnum.nullable().default(null),
  // Valor estimado (R$) ancorado no preço do serviço cadastrado. null sem base.
  valor_estimado: z.number().nonnegative().nullable().default(null),
  objecao: z.string().max(240).nullable().default(null),
  info_coletada: z.array(z.string().max(200)).max(10).default([]),
  info_faltante: z.array(z.string().max(200)).max(10).default([]),
  proxima_acao: proximaAcaoEnum.nullable().default(null),
  resposta_sugerida: z.string().max(1200).nullable().default(null),
  deve_criar_oportunidade: z.boolean().default(false),
  deve_fazer_handoff: z.boolean().default(false),
  confianca: z.number().min(0).max(1).default(0),
  knowledge_gaps: z.array(knowledgeGapSchema).max(5).default([]),
});

export type Qualification = z.infer<typeof qualificationSchema>;
export type KnowledgeGap = z.infer<typeof knowledgeGapSchema>;
export type Temperatura = z.infer<typeof temperaturaEnum>;
export type FitSugerido = z.infer<typeof fitSugeridoEnum>;
export type Urgencia = z.infer<typeof urgenciaEnum>;

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

/** Parse defensivo: campos inválidos viram default; nunca lança. */
export function parseQualification(raw: unknown): Qualification {
  const r = qualificationSchema.safeParse(raw ?? {});
  return r.success ? r.data : emptyQualification();
}
