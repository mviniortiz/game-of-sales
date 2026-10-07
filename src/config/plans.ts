/**
 * Vyzon — Fonte ÚNICA de planos (2026-08-21).
 *
 * Estrutura comercial: Essential R$ 197 (até 3 usuários) +
 * Pro R$ 497 (até 10 usuários). O id "free" NÃO é mais plano comercial:
 * é piso interno silencioso pra degradação de trial expirado e contas
 * legadas (nunca aparece na landing nem no checkout).
 *
 * Ligações e e-mail são ADICIONAIS (decisão 2026-08-21): nenhum plano os
 * inclui. Enquanto não existe cobrança de adicional no checkout, o gate de
 * ligações no backend (deal-call-initiate) continua exigindo plano pago.
 *
 * Toda superfície (landing, PlanPicker, Faturamento, TenantContext, edges)
 * deriva daqui ou espelha estes números. As edges que espelham:
 *   - supabase/functions/admin-create-seller (PLAN_MAX_USERS)
 *   - supabase/functions/whatsapp-copilot (limites diários da EVA)
 *   - supabase/functions/deal-call-initiate / deal-call-generate-insights
 */

export type PlanId = "free" | "essential" | "pro";

export interface Plan {
    id: PlanId;
    name: string;
    description: string;
    /** null = sem preço público. */
    monthlyPrice: number | null;
    annualDiscount: number; // percentual, só para planos pagos
    features: string[];
    limits: {
        /** Total de perfis na empresa (vendedores + admins). */
        users: number;
        products: number;
        /** Análises da EVA por usuário por dia. */
        evaDailyPerUser: number;
        whatsappNumbers: number;
    };
    /** false = piso interno; fora de landing, picker e checkout. */
    visible?: boolean;
    highlight?: boolean;
    badge?: string;
}

export const PLANS: Record<PlanId, Plan> = {
    // Piso interno silencioso (degradação de trial expirado / contas legadas).
    // Não comercializado: manter limites mínimos intactos.
    free: {
        id: "free",
        name: "Free",
        description: "Piso interno de degradação",
        monthlyPrice: 0,
        annualDiscount: 0,
        features: [],
        limits: {
            users: 1,
            products: 10,
            evaDailyPerUser: 10,
            whatsappNumbers: 1,
        },
        visible: false,
    },
    essential: {
        id: "essential",
        name: "Essential",
        description: "Pra quem quer parar de perder proposta no WhatsApp",
        monthlyPrice: 197,
        annualDiscount: 10,
        // Só o que existe no produto e o que muda entre os planos de verdade:
        // usuários, análises da EVA (whatsapp-copilot) e execuções do agente
        // por dia (eva-agent-loop PLAN_RUN_LIMIT). O resto é igual nos dois.
        features: [
            "Até 3 usuários",
            "1 WhatsApp da empresa conectado",
            "Placar de propostas: quanto está parado e há quantos dias",
            "Valor da proposta lido direto do PDF",
            "EVA escreve a retomada e você aprova pelo WhatsApp",
            "25 leituras da EVA por pessoa por dia",
            "20 tarefas do agente da EVA por dia",
        ],
        limits: {
            users: 3,
            products: 100,
            evaDailyPerUser: 25,
            whatsappNumbers: 1,
        },
        visible: true,
    },
    pro: {
        id: "pro",
        name: "Pro",
        description: "Pra equipes com mais gente e mais conversa por dia",
        monthlyPrice: 497,
        annualDiscount: 10,
        features: [
            "Até 10 usuários",
            "Tudo do Essential",
            "50 leituras da EVA por pessoa por dia",
            "60 tarefas do agente da EVA por dia",
        ],
        limits: {
            users: 10,
            products: Infinity,
            evaDailyPerUser: 50,
            whatsappNumbers: 1,
        },
        visible: true,
        badge: "Recomendado",
        highlight: true,
    },
};

/**
 * Normaliza valores legados de companies.plan pro modelo atual.
 * plus → pro; escala/enterprise → pro (grandfathered); essencial (com s) →
 * essential; desconhecido cai no piso free (nunca dá acesso a mais).
 */
export function normalizePlanId(raw: string | null | undefined): PlanId {
    const value = (raw || "").toLowerCase();
    if (value === "pro") return "pro";
    if (value === "plus") return "pro";
    if (value === "essential" || value === "essencial") return "essential";
    if (value === "escala" || value === "enterprise") return "pro";
    return "free";
}

/**
 * Plano EFETIVO de uma empresa: trial ativo experimenta o Pro completo;
 * trial expirado degrada pro piso free. Espelhada nas edges
 * admin-create-seller e whatsapp-copilot.
 */
export function resolveEffectivePlan(
    rawPlan: string | null | undefined,
    subscriptionStatus: string | null | undefined,
    trialEndsAt: string | null | undefined,
): PlanId {
    if (subscriptionStatus === "trialing" && trialEndsAt) {
        const ends = new Date(trialEndsAt).getTime();
        if (!Number.isNaN(ends) && ends >= Date.now()) return "pro";
        return "free";
    }
    if (subscriptionStatus === "active") return normalizePlanId(rawPlan);
    if (subscriptionStatus === "trialing") return "free"; // trialing sem data = expirado
    // expired/cancelled/desconhecido: degrada
    return "free";
}

// Get annual price with discount
export const getAnnualPrice = (plan: Plan): number => {
    if (!plan.monthlyPrice) return 0;
    const yearlyTotal = plan.monthlyPrice * 12;
    const discount = yearlyTotal * (plan.annualDiscount / 100);
    return yearlyTotal - discount;
};

// Get monthly equivalent when paying annually
export const getAnnualMonthlyEquivalent = (plan: Plan): number => {
    return getAnnualPrice(plan) / 12;
};

// Format currency
export const formatPrice = (value: number | null): string => {
    if (value === null) return "Sob medida";
    if (value === 0) return "Grátis";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
};

// Billing cycle configuration for Mercado Pago subscriptions
export type BillingCycle = "monthly" | "annual";

export interface BillingConfig {
    frequency: number;
    frequencyType: "months";
    transactionAmount: number;
    label: string;
}

export const getBillingConfig = (planId: string, cycle: BillingCycle): BillingConfig | null => {
    const plan = PLANS[planId as PlanId];
    if (!plan || !plan.monthlyPrice) return null;

    if (cycle === "monthly") {
        return {
            frequency: 1,
            frequencyType: "months",
            transactionAmount: plan.monthlyPrice,
            label: "Mensal",
        };
    }

    // Annual: 10% discount, charged monthly at discounted rate
    // (MP has a per-transaction limit, so we charge monthly instead of lump-sum)
    const annualMonthly = getAnnualMonthlyEquivalent(plan);
    return {
        frequency: 1,
        frequencyType: "months",
        transactionAmount: parseFloat(annualMonthly.toFixed(2)),
        label: "Anual",
    };
};

// Plan order for comparisons (free = piso interno, sempre primeiro)
export const PLAN_ORDER: PlanId[] = ["free", "essential", "pro"];

// Get next plan upgrade
export const getNextPlan = (currentPlan: string): Plan | null => {
    const currentIndex = PLAN_ORDER.indexOf(normalizePlanId(currentPlan));
    if (currentIndex === -1 || currentIndex === PLAN_ORDER.length - 1) return null;
    return PLANS[PLAN_ORDER[currentIndex + 1]];
};
