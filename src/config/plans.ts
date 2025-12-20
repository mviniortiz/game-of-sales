/**
 * Game Sales - Plan Configuration
 * Centralized plan definitions for the entire application
 */

export interface Plan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    annualDiscount: number; // percentage
    features: string[];
    limits: {
        sellers: number;
        admins: number;
        extraSellerPrice: number;
    };
    highlight?: boolean;
    badge?: string;
}

export const PLANS: Record<string, Plan> = {
    starter: {
        id: "starter",
        name: "Starter",
        description: "Para validar sua operação",
        monthlyPrice: 147,
        annualDiscount: 10,
        features: [
            "Dashboard em tempo real",
            "Metas individuais",
            "Registro de vendas",
            "Performance de calls",
        ],
        limits: {
            sellers: 1,
            admins: 1,
            extraSellerPrice: 0,
        },
        badge: "Básico",
    },
    plus: {
        id: "plus",
        name: "Plus",
        description: "O mais popular",
        monthlyPrice: 397,
        annualDiscount: 10,
        features: [
            "Tudo do Starter",
            "Pipeline de vendas",
            "Ranking gamificado",
            "Relatórios completos",
            "Metas consolidadas",
        ],
        limits: {
            sellers: 3,
            admins: 1,
            extraSellerPrice: 49.97,
        },
        badge: "Popular",
        highlight: true,
    },
    pro: {
        id: "pro",
        name: "Pro",
        description: "Escala total",
        monthlyPrice: 797,
        annualDiscount: 10,
        features: [
            "Tudo do Plus",
            "CRM completo",
            "Integrações (Hotmart, Stripe)",
            "Multi-empresa",
            "API Access",
            "Suporte prioritário",
        ],
        limits: {
            sellers: 8,
            admins: 3,
            extraSellerPrice: 48.99,
        },
        badge: "Recomendado",
    },
};

// Get annual price with discount
export const getAnnualPrice = (plan: Plan): number => {
    if (plan.monthlyPrice === 0) return 0;
    const yearlyTotal = plan.monthlyPrice * 12;
    const discount = yearlyTotal * (plan.annualDiscount / 100);
    return yearlyTotal - discount;
};

// Get monthly equivalent when paying annually
export const getAnnualMonthlyEquivalent = (plan: Plan): number => {
    return getAnnualPrice(plan) / 12;
};

// Format currency
export const formatPrice = (value: number): string => {
    if (value === 0) return "Grátis";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
};

// Features allowed per plan (for access control)
export const PLAN_FEATURES = {
    starter: [
        "dashboard",
        "metas",
        "vendas",
        "nova-venda",
        "calls",
        "profile",
    ],
    plus: [
        "dashboard",
        "metas",
        "vendas",
        "nova-venda",
        "calls",
        "profile",
        "ranking",
        "relatorios",
        "pipeline", // basic pipeline
        "calendario",
    ],
    pro: [
        "dashboard",
        "metas",
        "vendas",
        "nova-venda",
        "calls",
        "profile",
        "ranking",
        "relatorios",
        "pipeline",
        "calendario",
        "crm",
        "integracoes",
        "admin",
    ],
};

// Check if a feature is available for a plan
export const canAccessFeature = (plan: string, feature: string): boolean => {
    const planFeatures = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES];
    if (!planFeatures) return false;
    return planFeatures.includes(feature);
};

// Plan order for comparisons
export const PLAN_ORDER = ["starter", "plus", "pro"];

// Get next plan upgrade
export const getNextPlan = (currentPlan: string): Plan | null => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    if (currentIndex === -1 || currentIndex === PLAN_ORDER.length - 1) return null;
    return PLANS[PLAN_ORDER[currentIndex + 1]];
};
