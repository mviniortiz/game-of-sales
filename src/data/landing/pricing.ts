// Planos da landing — espelha a fonte única src/config/plans.ts (2026-07-16):
// Free (sem relógio) + Pro R$ 397 (até 5 usuários) + Escala (sob contato).
// Cada feature listada aqui é verificada no código; nada de promessa vazia.
export type Plan = {
    name: string;
    /** null = sem preço público (Escala). */
    price: string | null;
    priceNumber: number | null;
    tagline: string;
    features: readonly string[];
    popular: boolean;
    extraInfo: string | null;
    ctaLabel: string;
};

export const PLANS: readonly Plan[] = [
    {
        name: "Free",
        price: "0",
        priceNumber: 0,
        tagline: "Para organizar seu comercial e testar a EVA no dia a dia.",
        features: [
            "1 usuário",
            "WhatsApp conectado",
            "Inbox Comercial completo",
            "Pipeline com agendamentos",
            "EVA sugerindo respostas (10 análises/dia)",
            "Suporte humano no WhatsApp",
        ],
        popular: false,
        extraInfo: null,
        ctaLabel: "Começar grátis",
    },
    {
        name: "Pro",
        price: "397",
        priceNumber: 397,
        tagline: "Para agências que recebem leads todos os dias.",
        features: [
            "Até 5 usuários",
            "Tudo do Free",
            "EVA completa: intenção, fit, urgência e objeções (50/dia por usuário)",
            "Ligações com transcrição e resumo no deal",
            "Ranking e metas do time",
            "Relatórios completos",
            "Integrações Hotmart, Kiwify e Mercado Pago",
        ],
        popular: true,
        extraInfo: "14 dias grátis pra testar, sem cartão",
        ctaLabel: "Agendar demo do Pro",
    },
    {
        name: "Escala",
        price: null,
        priceNumber: null,
        tagline: "Para operações com mais de 5 pessoas no comercial.",
        features: [
            "Mais de 5 usuários",
            "Tudo do Pro",
            "Implantação acompanhada",
            "Suporte direto com o time",
        ],
        popular: false,
        extraInfo: null,
        ctaLabel: "Falar com a gente",
    },
] as const;
