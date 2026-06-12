// VYZON.AGENTS.2 — Contratos do Agente Qualificador.
//
// Princípio: assistido (híbrido). A geração é uma função PURA input→suggestion,
// sem efeito colateral. No MVP o gerador é determinístico/heurístico; o mesmo
// contrato permite trocá-lo por um edge function (Claude) sem mudar consumidores.
//
// Modelo híbrido: o diagnóstico pode gerar/atualizar um card no pipeline
// automaticamente (kind=qualification). Mensagens de saída NUNCA são geradas
// aqui sem aprovação — vão para a fila aprovar-e-enviar (kind=outbound_message).

export type AgentKey = "qualifier" | "followup" | "objection" | "proposal" | "manager";

export type LeadSource =
  | "whatsapp"
  | "instagram"
  | "form"
  | "indicacao"
  | "trafego"
  | "other";

export interface ConversationMessage {
  role: "lead" | "agent" | "internal";
  text: string;
  at?: string;
}

export interface QualifierInput {
  companyId: string;
  agentKey: "qualifier";
  source: LeadSource;
  conversation: {
    conversationId?: string;
    dealId?: string;
    messages: ConversationMessage[];
  };
  context: {
    /** Nicho/segmento da agência (do blueprint) */
    segment?: string;
    /** Campos já preenchidos no deal */
    knownFields: Record<string, string>;
    /** Tags já aplicadas */
    existingTags: string[];
    /** Campos que o agente busca (eva_blueprints.detected_fields) */
    blueprintFields: string[];
    /** Tags candidatas (suggested_tags) */
    blueprintTags: string[];
    /** Regras aplicadas (source=eva_studio) — tom/limites/linhas vermelhas */
    rules: string[];
  };
}

export type QualifyScore = "green" | "yellow" | "red";

export interface DetectedField {
  key: string;
  label: string;
  value: string;
  /** 0..1 (heurística no MVP) */
  confidence: number;
  /** SEMPRE "conversation" no MVP — nunca fonte externa */
  source: "conversation";
  /** sempre true: humano confirma antes de gravar */
  needsConfirmation: true;
}

export interface SuggestedTag {
  name: string;
  reason: string;
}

export interface QualifierSuggestion {
  agentKey: "qualifier";
  /** green=qualificado, yellow=falta 1-2, red=fora/sem critério */
  score: QualifyScore;
  scoreReasons: string[];
  detectedFields: DetectedField[];
  /** campos do blueprint ainda não detectados */
  missingFields: string[];
  suggestedTags: SuggestedTag[];
  /** perguntas para o vendedor fazer (nunca enviadas automaticamente) */
  recommendedQuestions: string[];
  nextAction: string;
  handoff: { required: boolean; reason?: string };
  /** resumo em 1 linha do diagnóstico */
  rationale: string;
  /** marca de prévia/sugestão (nunca ação aplicada) */
  isPreview: true;
}

/** Persistido em agent_suggestions.suggestion quando kind=qualification. */
export type QualificationPayload = QualifierSuggestion;

/**
 * Rascunho de mensagem de saída. SEMPRE aprovar-e-enviar: nasce com
 * status='pending' e só vira 'sent' após aprovação humana explícita.
 */
export interface OutboundDraft {
  channel: LeadSource;
  to?: string;
  body: string;
  /** por que esta abordagem (transparência) */
  rationale: string;
  /** imutável: marca que precisa de aprovação humana antes de enviar */
  requiresApproval: true;
}
