// Catálogo dos agentes especialistas da EVA. Fonte única do que muda por agente:
// cor (orb + acento do chat), perguntas de abertura, campos que a entrevista
// monta e o "foco" que orienta o LLM. A edge `eva-studio-chat` espelha o foco/
// campos no servidor (Deno não importa daqui). Qualificação é o agente vivo no
// runtime do Inbox; os demais já têm chat de criação próprio.

export type SpecialistKey = "qualificacao" | "followup" | "propostas" | "reativacao";

export type OrbVariant = "blue" | "aqua" | "violet" | "warm";

export interface SpecialistField {
    key: string;
    label: string;
}

export interface Specialist {
    key: SpecialistKey;
    label: string;
    /** Verbo curto do que o agente faz (subtítulo). */
    role: string;
    /** Cor do orb mesh. */
    orb: OrbVariant;
    /** Acento do chat (botões, bolha do gestor, barra) — identidade do agente. */
    accent: string;
    /** Descrição no card da galeria. */
    desc: string;
    /** Primeira fala da EVA naquele chat. */
    opening: string;
    /** Os 4 campos que a conversa monta. */
    fields: SpecialistField[];
    /** true = card visível na galeria mas "Em breve" (não configurável/ativável).
     *  Só o Qualificador tem runtime real no Inbox hoje; os outros ainda não
     *  fazem nada na ponta, então não deixamos configurar agente morto. */
    comingSoon?: boolean;
}

export const SPECIALISTS: Record<SpecialistKey, Specialist> = {
    qualificacao: {
        key: "qualificacao",
        label: "Qualificação",
        role: "Agente de qualificação",
        orb: "blue",
        accent: "#2563EB",
        desc: "Lê cada lead novo, qualifica e te avisa quem está pronto pra avançar.",
        opening:
            "Oi! Eu monto a sua EVA de qualificação só conversando, sem formulário nenhum. Me conta com as suas palavras: o que a sua agência vende?",
        fields: [
            { key: "vende", label: "O que vende" },
            { key: "icp", label: "Cliente ideal" },
            { key: "qualifica", label: "Como qualifica o lead" },
            { key: "redline", label: "Linha vermelha" },
        ],
    },
    followup: {
        key: "followup",
        label: "Follow-up",
        role: "Agente de follow-up",
        orb: "aqua",
        accent: "#0E9DA8",
        desc: "Retoma quem ficou no vácuo e lembra o time do próximo toque, na hora certa.",
        opening:
            "Vamos montar a sua EVA de follow-up. Pra começar: quando um lead esfria ou some, em quanto tempo você gosta de retomar?",
        fields: [
            { key: "cadencia", label: "Quando retomar" },
            { key: "gatilho", label: "O que dispara o follow-up" },
            { key: "tom", label: "Tom da retomada" },
            { key: "parar", label: "Quando parar de insistir" },
        ],
        comingSoon: true,
    },
    propostas: {
        key: "propostas",
        label: "Propostas",
        role: "Agente de propostas",
        orb: "violet",
        accent: "#7C3AED",
        desc: "Monta o rascunho da proposta a partir da conversa e do que já foi combinado.",
        opening:
            "Bora montar a sua EVA de propostas. Me conta: o que costuma entrar numa proposta sua?",
        fields: [
            { key: "escopo", label: "O que entra na proposta" },
            { key: "preco", label: "Como você precifica" },
            { key: "provas", label: "Diferenciais e provas" },
            { key: "redline", label: "O que nunca prometer" },
        ],
        comingSoon: true,
    },
    reativacao: {
        key: "reativacao",
        label: "Reativação",
        role: "Agente de reativação",
        orb: "warm",
        accent: "#E0703A",
        desc: "Encontra clientes parados e sugere uma abordagem pra trazer de volta.",
        opening:
            "Vamos montar a sua EVA de reativação. Primeiro: que tipo de cliente parado vale a pena reabordar?",
        fields: [
            { key: "alvo", label: "Quem reativar" },
            { key: "oferta", label: "Oferta de retorno" },
            { key: "tom", label: "Tom da reabordagem" },
            { key: "redline", label: "Linha vermelha" },
        ],
        comingSoon: true,
    },
};

export const SPECIALIST_ORDER: SpecialistKey[] = ["qualificacao", "followup", "propostas", "reativacao"];

export function getSpecialist(key: string | null | undefined): Specialist {
    return SPECIALISTS[(key as SpecialistKey)] ?? SPECIALISTS.qualificacao;
}
