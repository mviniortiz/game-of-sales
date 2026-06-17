// LP.7 (v2) — dados da demo guiada da EVA (constante tipada, sem backend).
// História imersiva: lead no WhatsApp → EVA lê contexto → sugere (humano aprova)
// → ação → Central de Comando → Pipeline → Metas/Ranking → Agentes especialistas.
// Sem claims falsas; números são ilustrativos de UI de demo.

export type SceneKind =
    | "conversation"
    | "analysis"
    | "suggestion"
    | "nextstep"
    | "command"
    | "pipeline"
    | "performance"
    | "agent";

export interface DemoScene {
    id: number;
    title: string;
    short: string; // rótulo curto pra timeline
    narration: string;
    kind: SceneKind;
}

export const LEAD_MESSAGE = "Oi, queria entender melhor os planos para minha agência.";

export const DEMO_SCENES: DemoScene[] = [
    { id: 1, kind: "conversation", title: "Conversa recebida", short: "WhatsApp", narration: "Um lead chega pelo WhatsApp perguntando sobre planos para a agência." },
    { id: 2, kind: "analysis", title: "Contexto entendido", short: "Contexto", narration: "A EVA entende o contexto antes de sugerir qualquer resposta." },
    { id: 3, kind: "suggestion", title: "Sugestão para aprovação", short: "Sugestão", narration: "A EVA sugere o próximo passo, mas seu time continua no controle." },
    { id: 4, kind: "nextstep", title: "Próximo passo", short: "Ação", narration: "A conversa vira uma ação clara para o time seguir." },
    { id: 5, kind: "command", title: "Central de Comando", short: "Central", narration: "Tudo que precisa da sua atenção fica numa central só." },
    { id: 6, kind: "pipeline", title: "Pipeline", short: "Pipeline", narration: "Cada conversa vira uma oportunidade no funil." },
    { id: 7, kind: "performance", title: "Metas e ranking", short: "Metas", narration: "Acompanhe as metas e o ritmo do time em tempo real." },
    { id: 8, kind: "agent", title: "Agente especialista", short: "Agentes", narration: "E você cria agentes especialistas para cada etapa comercial." },
];

export const DEMO_SUMMARY = {
    title: "Sua demo terminou.",
    text: "Nesta experiência, a EVA acompanhou uma conversa, entendeu o contexto e sugeriu uma resposta para o time aprovar, e ainda mostrou a Central de Comando, o pipeline, metas e ranking, e como agentes especialistas apoiam cada etapa da operação comercial.",
};
