// EVA.STUDIO.8A — Cenários determinísticos de simulação (demo, sem IA real).
// Usados na aba Simulações para testar como a EVA responderia ANTES do uso.
export interface Scenario {
    key: string;
    label: string;
    critical?: boolean;
    leadMessage: string;
    reply: string;
    identifies: string;
    fields: string[];
    tags: string[];
    intent: string;
    urgency: "Baixa" | "Média" | "Alta";
    nextAction: string;
}

export const SCENARIOS: Scenario[] = [
    {
        key: "preco",
        label: "Lead pede preço",
        leadMessage: "Oi, quanto custa o apartamento de 2 quartos?",
        reply: "Posso te mostrar as condições e o que está incluso. Quer que eu chame um especialista para detalhar os valores?",
        identifies: "Interesse com sensibilidade a preço",
        fields: ["Empreendimento", "Orçamento"],
        tags: ["Objeção preço"],
        intent: "Preço",
        urgency: "Média",
        nextAction: "Handoff humano (valores)",
    },
    {
        key: "fgts",
        label: "Lead quer usar FGTS",
        leadMessage: "Consigo usar meu FGTS na entrada?",
        reply: "Dá pra usar o FGTS sim. Me confirma se você já tem 3 anos de carteira e qual valor pretende usar?",
        identifies: "Intenção de compra com financiamento via FGTS",
        fields: ["FGTS", "Financiamento"],
        tags: ["Financiamento"],
        intent: "Financiamento",
        urgency: "Média",
        nextAction: "Coletar dados de financiamento",
    },
    {
        key: "visita",
        label: "Lead quer agendar visita",
        leadMessage: "Posso visitar o decorado esse fim de semana?",
        reply: "Perfeito! Tenho horários nesta semana. Você prefere durante a semana ou no fim de semana?",
        identifies: "Alta intenção, pronto para visita",
        fields: ["Empreendimento", "Visita"],
        tags: ["Lead quente", "Visita"],
        intent: "Agendamento",
        urgency: "Alta",
        nextAction: "Recomendar visita e agendar",
    },
    {
        key: "conjuge",
        label: "Lead vai falar com o cônjuge",
        leadMessage: "Gostei, mas preciso conversar com minha esposa antes.",
        reply: "Claro, é uma decisão importante. Posso te enviar um resumo para mostrarem juntos e retomo em 2 dias?",
        identifies: "Decisão compartilhada, follow-up necessário",
        fields: ["Prazo de compra"],
        tags: ["Visita"],
        intent: "Dúvida",
        urgency: "Média",
        nextAction: "Agendar follow-up",
    },
    {
        key: "sem_orcamento",
        label: "Lead sem orçamento definido",
        leadMessage: "Ainda não sei quanto posso investir.",
        reply: "Para te indicar a melhor opção, qual faixa de investimento você considera confortável?",
        identifies: "Topo de funil, qualificação incompleta",
        fields: [],
        tags: [],
        intent: "Dúvida",
        urgency: "Baixa",
        nextAction: "Qualificar orçamento",
    },
    {
        key: "objecao_preco",
        label: "Lead com objeção de preço",
        critical: true,
        leadMessage: "Achei caro, o concorrente tá bem mais barato.",
        reply: "Entendo. Posso te mostrar o que está incluso e as condições. Vou chamar um especialista para alinhar valores com você.",
        identifies: "Objeção de preço explícita",
        fields: ["Orçamento"],
        tags: ["Objeção preço"],
        intent: "Objeção",
        urgency: "Alta",
        nextAction: "Handoff humano (objeção de preço)",
    },
    {
        key: "fora_icp",
        label: "Lead fora do ICP",
        critical: true,
        leadMessage: "Vocês alugam kitnet por temporada?",
        reply: "Obrigada pelo contato! Esse não é o nosso foco, então não quero te fazer perder tempo. Posso indicar quem atende melhor esse caso.",
        identifies: "Fora do perfil ideal de cliente",
        fields: [],
        tags: ["Sem fit"],
        intent: "Outro",
        urgency: "Baixa",
        nextAction: "Encerrar com cordialidade / handoff",
    },
];
