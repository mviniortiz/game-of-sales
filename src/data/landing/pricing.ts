// Planos da landing — espelha a fonte única src/config/plans.ts (2026-08-21):
// Essential R$ 197 (até 3 usuários) + Pro R$ 497 (até 10 usuários).
// O piso free existe só internamente; nunca aparece aqui.
// Ligações e e-mail são ADICIONAIS: entram na lista abaixo, sem preço
// inventado (Claims Policy: preço de adicional é decisão do Markus).
// Cada feature listada aqui é verificada no código; nada de promessa vazia.
export type Plan = {
    name: string;
    /** null = sem preço público. */
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
        name: "Essential",
        price: "197",
        priceNumber: 197,
        tagline: "Pra agência que quer parar de perder lead no WhatsApp.",
        features: [
            "Até 3 usuários",
            "WhatsApp conectado",
            "Inbox Comercial completo",
            "Pipeline com agendamentos",
            "EVA lê as conversas e sugere respostas (25 análises/dia por usuário)",
            "Qualificação automática dos leads",
            "Relatórios essenciais",
        ],
        popular: false,
        extraInfo: null,
        ctaLabel: "Começar no Essential",
    },
    {
        name: "Pro",
        price: "497",
        priceNumber: 497,
        tagline: "Pra agência que recebe leads todos os dias e quer o operacional resolvido.",
        features: [
            "Até 10 usuários",
            "Tudo do Essential",
            "EVA completa: intenção, fit, urgência e objeções (50/dia por usuário)",
            "Follow-up supervisionado com rascunho pronto na hora certa",
            "Pipeline que se atualiza sozinho conforme a conversa anda",
            "Ranking e metas do time",
            "Relatórios completos",
            "Integrações Hotmart, Kiwify e Mercado Pago",
        ],
        popular: true,
        extraInfo: "14 dias grátis pra testar, sem cartão",
        ctaLabel: "Testar o Pro grátis",
    },
] as const;

// Adicionais: fora de qualquer plano, nem do Pro. Preço sob consulta
// (definir é decisão do Markus); backend ainda não cobra adicional.
export const ADDONS: readonly { name: string; desc: string }[] = [
    {
        name: "Ligações",
        desc: "Faça e receba ligações com gravação, transcrição e resumo automático no deal.",
    },
    {
        name: "E-mail",
        desc: "Sequências de e-mail conectadas ao pipeline e ao histórico da conversa.",
    },
];
