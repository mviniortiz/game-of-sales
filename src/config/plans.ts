/**
 * Vyzon — Fonte ÚNICA de planos (2026-07-16).
 *
 * Estrutura: Free (validação sem relógio) + Pro R$ 397 (até 5 usuários) +
 * Escala (sob contato). Cadastro novo entra em trial do Pro por 14 dias e,
 * ao expirar, DEGRADA para o Free (não bloqueia mais — UpgradeLock aposentado).
 *
 * Toda superfície (landing, PlanPicker, Faturamento, TenantContext, edges)
 * deriva daqui ou espelha estes números. As edges que espelham:
 *   - supabase/functions/admin-create-seller (PLAN_MAX_USERS)
 *   - supabase/functions/whatsapp-copilot (EVA_DAILY_LIMIT)
 */

export type PlanId = "free" | "pro" | "escala";

export interface Plan {
    id: PlanId;
    name: string;
    description: string;
    /** null = sem preço público (Escala: "Fale com a gente"). */
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
    highlight?: boolean;
    badge?: string;
}

export const PLANS: Record<PlanId, Plan> = {
    free: {
        id: "free",
        name: "Free",
        description: "Para organizar a operação e testar no dia a dia",
        monthlyPrice: 0,
        annualDiscount: 0,
        features: [
            "1 usuário",
            "WhatsApp conectado",
            "Inbox Comercial completo",
            "Pipeline com agendamentos",
            "EVA sugerindo respostas (10 análises/dia)",
            "10 produtos cadastrados",
        ],
        limits: {
            users: 1,
            products: 10,
            evaDailyPerUser: 10,
            whatsappNumbers: 1,
        },
        badge: "Grátis",
    },
    pro: {
        id: "pro",
        name: "Pro",
        description: "Para agências que recebem leads todos os dias",
        monthlyPrice: 397,
        annualDiscount: 10,
        features: [
            "Até 5 usuários",
            "Tudo do Free",
            "EVA com análise de intenção, fit, urgência e objeções (50/dia por usuário)",
            "Ligações com transcrição e resumo no deal",
            "Ranking e metas do time",
            "Relatórios completos",
            "Integrações Hotmart, Kiwify e Mercado Pago",
        ],
        limits: {
            users: 5,
            products: Infinity,
            evaDailyPerUser: 50,
            whatsappNumbers: 1,
        },
        badge: "Popular",
        highlight: true,
    },
    escala: {
        id: "escala",
        name: "Escala",
        description: "Para operações comerciais maiores",
        monthlyPrice: null,
        annualDiscount: 0,
        features: [
            "Mais de 5 usuários",
            "Tudo do Pro",
            "Implantação acompanhada",
            "Suporte direto com o time",
        ],
        limits: {
            users: Infinity,
            products: Infinity,
            evaDailyPerUser: 50,
            whatsappNumbers: 1,
        },
    },
};

/**
 * Normaliza valores legados de companies.plan para o modelo atual.
 * Legado: basic/starter (antigo tier de entrada) → free; plus → pro;
 * enterprise → escala. Valor desconhecido cai no free (nunca dá acesso a mais).
 */
export function normalizePlanId(raw: string | null | undefined): PlanId {
    const value = (raw || "").toLowerCase();
    if (value === "pro") return "pro";
    if (value === "plus") return "pro";
    if (value === "escala" || value === "enterprise") return "escala";
    return "free";
}

/**
 * Plano EFETIVO de uma empresa: trial ativo experimenta o Pro completo;
 * trial expirado degrada para o plano normalizado (free para cadastros novos).
 * Espelhada nas edges admin-create-seller e whatsapp-copilot.
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

// Plan order for comparisons
export const PLAN_ORDER: PlanId[] = ["free", "pro", "escala"];

// Get next plan upgrade
export const getNextPlan = (currentPlan: string): Plan | null => {
    const currentIndex = PLAN_ORDER.indexOf(normalizePlanId(currentPlan));
    if (currentIndex === -1 || currentIndex === PLAN_ORDER.length - 1) return null;
    return PLANS[PLAN_ORDER[currentIndex + 1]];
};
