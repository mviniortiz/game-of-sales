// ─────────────────────────────────────────────────────────────────────────────
// F4E.2 (2026-05-19) — Schema do contexto comercial da agência.
//
// Vive em eva_business_context.agency (JSONB). Validação acontece no frontend
// antes do upsert e (no futuro) também na edge function de insight.
//
// Decisão (F4E): JSONB-first, shape ainda evoluindo. Todos campos opcionais
// porque o cliente preenche em etapas — ninguém preenche tudo de cara.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

// Limites generosos pra evitar dump de PDF inteiro num campo só.
const TEXTO_CURTO = 240;
const TEXTO_MEDIO = 600;
const TEXTO_LONGO = 2000;

export const horarioAtendimentoSchema = z.object({
  dias: z.string().max(TEXTO_CURTO).optional().default(""),
  inicio: z.string().max(16).optional().default(""),
  fim: z.string().max(16).optional().default(""),
  fuso: z.string().max(64).optional().default(""),
});

export const agencyContextSchema = z.object({
  descricao: z.string().max(TEXTO_LONGO).optional().default(""),
  publico_alvo: z.string().max(TEXTO_LONGO).optional().default(""),
  ticket_medio: z.string().max(TEXTO_CURTO).optional().default(""),
  tom_de_voz: z.string().max(TEXTO_MEDIO).optional().default(""),
  palavras_proibidas: z.array(z.string().min(1).max(80)).max(50).optional().default([]),
  horario_atendimento: horarioAtendimentoSchema.optional().default({
    dias: "",
    inicio: "",
    fim: "",
    fuso: "",
  }),
  regras_handoff: z.string().max(TEXTO_LONGO).optional().default(""),
  promessas_proibidas: z.array(z.string().min(1).max(160)).max(30).optional().default([]),
  observacoes: z.string().max(TEXTO_LONGO).optional().default(""),
});

export type AgencyContext = z.infer<typeof agencyContextSchema>;

export const emptyAgencyContext = (): AgencyContext => ({
  descricao: "",
  publico_alvo: "",
  ticket_medio: "",
  tom_de_voz: "",
  palavras_proibidas: [],
  horario_atendimento: { dias: "", inicio: "", fim: "", fuso: "" },
  regras_handoff: "",
  promessas_proibidas: [],
  observacoes: "",
});

// Helper: lê um JSONB unknown e devolve shape garantido. Campos extras são
// descartados; faltantes ganham default. Falha silenciosamente em malformado
// (volta empty) — UI mostra estado limpo em vez de quebrar.
export function parseAgencyContext(raw: unknown): AgencyContext {
  const result = agencyContextSchema.safeParse(raw ?? {});
  return result.success ? result.data : emptyAgencyContext();
}
