// VYZON.AGENTS.3.1 — Pacote Agência (Padrão de Agência) para o agente Qualificador.
//
// É o blueprint padrão com que uma agência "nasce": no estado `seeded`, a EVA já
// pode SUGERIR (campos/tags/perguntas) desde o dia 1, sem o dono configurar nada.
//
// A segurança NÃO está aqui: ela está na aprovação humana POR SUGESTÃO (1 toque).
// Este pacote não envia nada, não grava em deal/conversa, não cria tag/pipeline.
// É só o ponto de partida revisável — o dono ajusta e salva quando quiser deixar
// "do seu jeito" (status approved_assisted = selo de afinado).
import type { Blueprint } from "@/lib/eva/blueprint";

// Perguntas básicas de qualificação que a EVA recomenda ao vendedor.
// Não são enviadas automaticamente — viram "Copiar pro WhatsApp" no fluxo.
export const AGENCY_QUESTIONS: string[] = [
    "Que serviço você procura (tráfego, social media, site, lançamento)?",
    "Já investe em marketing hoje? Qual a verba aproximada?",
    "Quem decide a contratação?",
    "Qual o prazo para começar?",
    "Como você chegou até a gente?",
];

export const AGENCY_PACK: Blueprint = {
    agent: "Qualificador",
    segment: "Agência",
    goal: "Qualificar leads de agência pela conversa e sugerir o próximo passo, sem você perder o controle.",
    // Pipeline enxuto de agência (sugestão; não cria estágios reais).
    pipeline: ["Novo lead", "Diagnóstico", "Proposta", "Negociação", "Fechado"],
    // Campos que o Qualificador busca detectar na conversa.
    fields: ["Serviço de interesse", "Orçamento", "Decisor", "Prazo", "Origem do lead"],
    // Tags sugeridas (kebab-case; aplicadas só após confirmação humana).
    tags: ["lead-quente", "lead-morno", "lead-frio", "fora-do-icp", "precisa-followup", "indicacao"],
    // Regras de tom + linhas vermelhas.
    rules: [
        "Falar como pessoa do comercial da agência: direto e claro, sem emojis e sem jargão técnico.",
        "Marcar lead-quente só quando houver serviço claro, orçamento compatível e decisor identificado.",
        "Nunca enviar mensagem, proposta ou preço sem aprovação humana.",
        "Nunca prometer resultado (faturamento, número de leads, ROI).",
        "Em pedido de preço logo de cara ou objeção forte, sugerir handoff para um humano.",
        "Lead fora do ICP: não tratar como quente; sugerir resposta educada ou descarte.",
    ],
    // Lacunas típicas de uma agência (o que costuma faltar para qualificar bem).
    gaps: ["Tabela de serviços e preços", "Critérios de ICP (quem é o cliente ideal)", "Casos de sucesso", "Política de desconto"],
    scenarios: [],
    status: "seeded",
    applied: null,
};
