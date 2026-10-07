// Planos da landing — espelha a fonte única src/config/plans.ts (2026-08-21):
// Essential R$ 197 (até 3 usuários) + Pro R$ 497 (até 10 usuários).
// O piso free existe só internamente; nunca aparece aqui.
// Ligações e e-mail são ADICIONAIS: entram na lista abaixo, sem preço
// inventado (Claims Policy: preço de adicional é decisão do Markus).
// As listas de recursos vêm direto de plans.ts, para não divergirem.
import { PLANS as PLAN_CONFIG } from "@/config/plans";

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
        features: PLAN_CONFIG.essential.features,
        popular: false,
        extraInfo: null,
        ctaLabel: "Começar no Essential",
    },
    {
        name: "Pro",
        price: "497",
        priceNumber: 497,
        tagline: "Pra agência com mais gente e mais conversa por dia.",
        features: PLAN_CONFIG.pro.features,
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
