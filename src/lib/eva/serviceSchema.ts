// ─────────────────────────────────────────────────────────────────────────────
// F4E.3 (2026-05-19) — Schema dos serviços da agência.
//
// Vive em eva_business_context.services (JSONB array). Cada serviço tem:
//   - nome, descricao, preço min/max
//   - modelo de cobrança (mensal/único/comissão/personalizado)
//   - perguntas obrigatórias (a EVA vai sugerir essas perguntas pro lead)
//   - objeções comuns + resposta sugerida (pareadas)
//   - critérios de bom fit / baixo fit
//
// Preço é NULLABLE intencional: cliente nem sempre quer expor preço. Quando
// não cadastrado, EVA retorna null e sugere "cadastrar preço pra responder".
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

export const MODELOS_COBRANCA = [
  { value: "mensal", label: "Mensal" },
  { value: "unico", label: "Pagamento único" },
  { value: "comissao", label: "Comissão" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export const modeloCobrancaSchema = z.enum(["mensal", "unico", "comissao", "personalizado", ""]);

export const objecaoSchema = z.object({
  objecao: z.string().min(1).max(240),
  resposta_sugerida: z.string().max(1200).optional().default(""),
});

export const serviceSchema = z.object({
  id: z.string().min(1),
  nome: z.string().max(120).optional().default(""),
  descricao: z.string().max(1200).optional().default(""),
  preco_min: z.number().nullable().optional().default(null),
  preco_max: z.number().nullable().optional().default(null),
  modelo_cobranca: modeloCobrancaSchema.optional().default(""),
  perguntas_obrigatorias: z.array(z.string().min(1).max(240)).max(20).optional().default([]),
  objecoes: z.array(objecaoSchema).max(20).optional().default([]),
  criterios_bom_fit: z.array(z.string().min(1).max(240)).max(20).optional().default([]),
  criterios_baixo_fit: z.array(z.string().min(1).max(240)).max(20).optional().default([]),
});

export const servicesArraySchema = z.array(serviceSchema).max(50);

export type Service = z.infer<typeof serviceSchema>;
export type Objecao = z.infer<typeof objecaoSchema>;
export type ModeloCobranca = z.infer<typeof modeloCobrancaSchema>;

export function emptyService(id: string): Service {
  return {
    id,
    nome: "",
    descricao: "",
    preco_min: null,
    preco_max: null,
    modelo_cobranca: "",
    perguntas_obrigatorias: [],
    objecoes: [],
    criterios_bom_fit: [],
    criterios_baixo_fit: [],
  };
}

export function parseServices(raw: unknown): Service[] {
  if (!Array.isArray(raw)) return [];
  // Filtra entradas malformadas em vez de zerar tudo
  const out: Service[] = [];
  for (const item of raw) {
    const r = serviceSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

// id leve sem dependência de crypto-uuid: timestamp + random base36.
// Só usado como chave de array — não precisa de unicidade global criptográfica.
export function newServiceId(): string {
  return `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
