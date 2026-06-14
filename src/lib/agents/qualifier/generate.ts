// VYZON.AGENTS.2 — Gerador determinístico do Agente Qualificador.
//
// Função PURA: QualifierInput → QualifierSuggestion. Sem efeito colateral,
// sem rede, sem escrita. Mesma filosofia de src/lib/eva/scenarios.ts.
//
// Heurística sobre o texto da conversa (regex/keywords) para o MVP. O contrato
// é estável: um edge function (Claude) pode substituir esta função sem mudar
// nenhum consumidor (useQualifierSuggestion, EvaPanel, DealCommandCenter).
//
// Regras duras (do spec): nunca afirma o que não está na conversa; toda saída
// é proposta (isPreview/needsConfirmation imutáveis); não infla score fora do
// ICP; objeção de preço logo de cara → handoff humano, sem prometer/descontar.

import type {
  DetectedField,
  OutboundDraft,
  QualifierInput,
  QualifierSuggestion,
  QualifyScore,
  SuggestedTag,
} from "./types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Concatena só as mensagens do lead (fonte de verdade para detecção). */
function leadText(input: QualifierInput): string {
  return norm(
    input.conversation.messages
      .filter((m) => m.role === "lead")
      .map((m) => m.text)
      .join("  \n")
  );
}

// ── Detectores de campo (heurística sobre o texto do lead) ──────────────────

const MONEY_RE =
  /(?:r\$\s?)?(\d{1,3}(?:[.\s]?\d{3})+|\d{3,})(?:\s?(?:mil|k|reais|\/m[eê]s|por m[eê]s))?/i;

const URGENCY_WORDS = [
  "urgente",
  "essa semana",
  "esta semana",
  "hoje",
  "amanha",
  "o quanto antes",
  "pra ja",
  "para ja",
  "imediato",
  "rapido",
];

const DECISOR_WORDS = ["sou o dono", "sou dono", "sou socio", "sou o ceo", "decido eu", "sou eu quem decide", "responsavel"];

const SERVICE_MAP: { key: string; words: string[] }[] = [
  { key: "Tráfego pago", words: ["trafego", "anuncio", "anuncios", "meta ads", "google ads", "facebook ads", "gestao de trafego"] },
  { key: "Social media", words: ["social media", "instagram", "conteudo", "posts", "gestao de redes"] },
  { key: "Site / Landing", words: ["site", "landing", "pagina", "loja virtual", "ecommerce"] },
  { key: "Lançamento", words: ["lancamento", "lançamento", "captacao", "lead", "evento online"] },
  { key: "Branding", words: ["branding", "marca", "identidade visual", "logo"] },
];

const PRICE_QUESTION_WORDS = ["quanto custa", "qual o valor", "qual valor", "qual o preco", "qual preco", "quanto fica", "tabela de preco"];

function detectFields(text: string, blueprintFields: string[]): DetectedField[] {
  const out: DetectedField[] = [];
  const wants = (k: string) =>
    blueprintFields.length === 0 ||
    blueprintFields.some((f) => norm(f).includes(k));

  // Orçamento
  if (wants("orcamento") || wants("budget") || wants("investimento")) {
    const m = text.match(MONEY_RE);
    if (m && /invest|orcament|budget|por m[eê]s|\/m[eê]s|mil|reais|r\$/i.test(m[0])) {
      out.push({
        key: "orcamento",
        label: "Orçamento",
        value: m[0].trim(),
        confidence: 0.6,
        source: "conversation",
        needsConfirmation: true,
      });
    }
  }

  // Serviço desejado
  if (wants("servico") || wants("service") || wants("nicho") || wants("segmento")) {
    for (const s of SERVICE_MAP) {
      if (s.words.some((w) => text.includes(w))) {
        out.push({
          key: "servico",
          label: "Serviço desejado",
          value: s.key,
          confidence: 0.7,
          source: "conversation",
          needsConfirmation: true,
        });
        break;
      }
    }
  }

  // Urgência
  if (wants("urgencia") || wants("prazo")) {
    if (URGENCY_WORDS.some((w) => text.includes(w))) {
      out.push({
        key: "urgencia",
        label: "Urgência",
        value: "Alta",
        confidence: 0.65,
        source: "conversation",
        needsConfirmation: true,
      });
    }
  }

  // Decisor
  if (wants("decisor") || wants("decision")) {
    if (DECISOR_WORDS.some((w) => text.includes(w))) {
      out.push({
        key: "decisor",
        label: "Decisor",
        value: "Lead é o decisor",
        confidence: 0.7,
        source: "conversation",
        needsConfirmation: true,
      });
    }
  }

  return out;
}

const ICP_NEGATIVE = ["faculdade", "trabalho de escola", "tcc", "pesquisa", "so curiosidade", "estudante", "nao tenho empresa", "pessoa fisica"];

export function qualifierGenerate(input: QualifierInput): QualifierSuggestion {
  const text = leadText(input);
  const rules = input.context.rules.map(norm);

  const detectedFields = detectFields(text, input.context.blueprintFields);
  const detectedKeys = new Set(detectedFields.map((f) => f.key));

  const wantedKeys = (input.context.blueprintFields.length
    ? input.context.blueprintFields
    : ["orcamento", "servico", "urgencia", "decisor", "prazo"]
  ).map((f) => ({ raw: f, n: norm(f) }));

  const missingFields = wantedKeys
    .filter((w) => ![...detectedKeys].some((k) => w.n.includes(k)))
    .map((w) => w.raw);

  // Sinais
  const askedPriceUpfront =
    PRICE_QUESTION_WORDS.some((w) => text.includes(w)) &&
    input.conversation.messages.filter((m) => m.role === "lead").length <= 2;
  const outOfICP = ICP_NEGATIVE.some((w) => text.includes(w));
  const isReferral =
    input.source === "indicacao" || text.includes("indicacao") || text.includes("me indicou") || text.includes("indicado");
  const isUrgent = URGENCY_WORDS.some((w) => text.includes(w));

  // Score
  const scoreReasons: string[] = [];
  let score: QualifyScore;
  if (outOfICP) {
    score = "red";
    scoreReasons.push("Sinais de fora do ICP (não é uma agência/empresa com fit).");
  } else if (detectedFields.length >= 3 && !missingFields.includes("orcamento")) {
    score = "green";
    scoreReasons.push("Campos-chave detectados (serviço, orçamento e mais um sinal).");
    if (isUrgent) scoreReasons.push("Urgência alta declarada.");
  } else if (detectedFields.length >= 1) {
    score = "yellow";
    scoreReasons.push(`Faltam ${missingFields.length} campo(s) para qualificar como quente.`);
  } else {
    score = "yellow";
    scoreReasons.push("Conversa ainda sem campos-chave detectados.");
  }

  // Tags sugeridas
  const suggestedTags: SuggestedTag[] = [];
  const addTag = (name: string, reason: string) => {
    if (input.context.blueprintTags.length === 0 || input.context.blueprintTags.some((t) => norm(t) === norm(name))) {
      if (!input.context.existingTags.some((t) => norm(t) === norm(name))) {
        suggestedTags.push({ name, reason });
      }
    }
  };
  if (score === "green") addTag("lead-quente", "Critérios de qualificação atingidos.");
  if (score === "yellow") addTag("lead-morno", "Falta confirmar 1-2 campos.");
  if (score === "red") addTag("fora-do-icp", "Sinais de que não é o cliente ideal.");
  if (isReferral) addTag("indicacao", "Lead chegou por indicação — priorizar.");
  if (missingFields.some((m) => norm(m).includes("orcamento"))) addTag("sem-orcamento", "Orçamento ainda não informado.");
  if (isUrgent) addTag("precisa-followup", "Urgência declarada — não deixar esfriar.");

  // Perguntas recomendadas (apenas para o vendedor — nunca enviadas sozinhas)
  const recommendedQuestions: string[] = [];
  if (missingFields.some((m) => norm(m).includes("orcamento")))
    recommendedQuestions.push("Já investe em marketing hoje? Qual a faixa de investimento mensal?");
  if (missingFields.some((m) => norm(m).includes("servico") || norm(m).includes("nicho")))
    recommendedQuestions.push("Qual resultado você espera nos próximos 90 dias?");
  if (missingFields.some((m) => norm(m).includes("decisor")))
    recommendedQuestions.push("Quem decide a contratação além de você?");
  if (missingFields.some((m) => norm(m).includes("prazo")))
    recommendedQuestions.push("Qual o prazo ideal para começar?");
  if (recommendedQuestions.length === 0)
    recommendedQuestions.push("Já trabalhou com agência antes? Como foi a experiência?");

  // Handoff (linhas vermelhas)
  let handoff = { required: false } as QualifierSuggestion["handoff"];
  let nextAction: string;
  if (askedPriceUpfront) {
    handoff = { required: true, reason: "Lead perguntou preço logo de início — objeção de preço, levar para o closer (sem prometer/descontar)." };
    nextAction = "Handoff humano: responder à objeção de preço pessoalmente, sem tabela automática.";
    scoreReasons.push("Pediu preço de cara — tratado como objeção, não como qualificação.");
  } else if (score === "green") {
    handoff = { required: true, reason: "Lead quente — passar para o closer assumir." };
    nextAction = "Handoff para o closer + criar/atualizar oportunidade no pipeline.";
  } else if (score === "red") {
    nextAction = "Descartar com educação ou registrar como fora do ICP — não tratar como quente.";
  } else {
    nextAction = `Coletar: ${missingFields.slice(0, 2).join(", ") || "mais contexto"}.`;
  }

  // Respeita regra de tom (ex.: "sem emoji") — sinaliza nas razões, não altera fato
  if (rules.some((r) => r.includes("sem emoji") || r.includes("nao usar emoji"))) {
    scoreReasons.push("Regra de tom da agência: sem emojis nas respostas.");
  }

  const rationale =
    score === "green"
      ? "Lead qualificado — pronto para o closer."
      : score === "red"
      ? "Provável fora do ICP — não priorizar."
      : `Lead em qualificação — faltam ${missingFields.length} sinal(is).`;

  return {
    agentKey: "qualifier",
    score,
    scoreReasons,
    detectedFields,
    missingFields,
    suggestedTags,
    recommendedQuestions,
    nextAction,
    handoff,
    rationale,
    isPreview: true,
  };
}

/**
 * Monta um RASCUNHO de abordagem a partir do diagnóstico. NÃO envia: o retorno
 * é sempre requiresApproval=true e deve entrar em agent_suggestions como
 * kind='outbound_message' status='pending' (fila aprovar-e-enviar).
 */
export function buildOutboundDraft(
  input: QualifierInput,
  suggestion: QualifierSuggestion
): OutboundDraft {
  const firstQuestion = suggestion.recommendedQuestions[0];
  const noEmoji = input.context.rules.some((r) => /sem emoji|nao usar emoji/i.test(norm(r)));
  const greeting = "Oi! Aqui é da equipe.";
  const body =
    suggestion.score === "red"
      ? `${greeting} Obrigado pelo contato! No momento nosso foco são agências e operações comerciais — posso te indicar um caminho melhor pro seu caso?`
      : `${greeting} Que bom seu interesse. ${firstQuestion}`;

  return {
    channel: input.source,
    to: undefined,
    body: noEmoji ? body : body,
    rationale: `Abordagem baseada no diagnóstico (${suggestion.score}). Próxima ação: ${suggestion.nextAction}`,
    requiresApproval: true,
  };
}
