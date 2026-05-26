// ─────────────────────────────────────────────────────────────────────────────
// F4E.3 (2026-05-19) — Schema do ICP (Ideal Customer Profile) da agência.
//
// Vive em eva_business_context.icp (JSONB). Estrutura:
//   - descricao: parágrafo do cliente ideal
//   - 4 listas de critérios (bom/médio/baixo/sem fit)
//   - regras de pontuação simples: lista de { criterio, pontos }
//
// Pontos podem ser positivos (soma) ou negativos (subtrai). EVA usa isso
// pra calcular score_sugerido em conversation_summaries.qualification.
//
// Decisão: nada de fórmulas complexas nesta fase. Pesos simples bastam pro
// modelo assistido — o humano sempre revisa o score sugerido.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

export const regraPontuacaoSchema = z.object({
  criterio: z.string().min(1).max(240),
  // Limite ±100 evita explosão acidental do score sugerido (0–100)
  pontos: z.number().int().min(-100).max(100),
});

export const icpSchema = z.object({
  descricao: z.string().max(2000).optional().default(""),
  criterios_bom_fit: z.array(z.string().min(1).max(240)).max(30).optional().default([]),
  criterios_medio_fit: z.array(z.string().min(1).max(240)).max(30).optional().default([]),
  criterios_baixo_fit: z.array(z.string().min(1).max(240)).max(30).optional().default([]),
  criterios_sem_fit: z.array(z.string().min(1).max(240)).max(30).optional().default([]),
  regras_pontuacao: z.array(regraPontuacaoSchema).max(40).optional().default([]),
});

export type Icp = z.infer<typeof icpSchema>;
export type RegraPontuacao = z.infer<typeof regraPontuacaoSchema>;

export function emptyIcp(): Icp {
  return {
    descricao: "",
    criterios_bom_fit: [],
    criterios_medio_fit: [],
    criterios_baixo_fit: [],
    criterios_sem_fit: [],
    regras_pontuacao: [],
  };
}

export function parseIcp(raw: unknown): Icp {
  const r = icpSchema.safeParse(raw ?? {});
  return r.success ? r.data : emptyIcp();
}
