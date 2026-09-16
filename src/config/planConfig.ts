// Plan-Based Feature Restrictions Configuration
// Camada de compatibilidade sobre a fonte única em src/config/plans.ts —
// os limites numéricos vêm de lá; aqui ficam só as flags de feature e labels.

import { PLANS, PLAN_ORDER, type PlanId } from "@/config/plans";

export type PlanType = PlanId;

export type PlanFeatures = {
    metas: boolean;
    gamification: boolean;
    calls: boolean;
    reports: boolean;
    integrations: boolean;
    eva: boolean;
    maxUsers: number;
    maxProducts: number;
};

// Ligações são ADICIONAL (decisão 2026-08-21): nenhum plano inclui. Enquanto
// não existe cobrança de adicional, o backend (deal-call-initiate) continua
// exigindo plano pago; a UI reflete "não incluso" até o adicional existir.
export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
    // piso interno: o mínimo pra conta não travar
    free: {
        metas: true,
        gamification: true,
        calls: false,
        reports: true,
        integrations: true,
        eva: true,
        maxUsers: PLANS.free.limits.users,
        maxProducts: PLANS.free.limits.products,
    },
    essential: {
        metas: true,
        gamification: true,
        calls: false,
        reports: true,
        integrations: true,
        eva: true,
        maxUsers: PLANS.essential.limits.users,
        maxProducts: PLANS.essential.limits.products,
    },
    pro: {
        metas: true,
        gamification: true,
        calls: false,
        reports: true,
        integrations: true,
        eva: true,
        maxUsers: PLANS.pro.limits.users,
        maxProducts: PLANS.pro.limits.products,
    },
};

export const PLANS_INFO: Record<PlanType, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-gray-500" },
    essential: { label: "Essential", color: "bg-teal-500" },
    pro: { label: "Pro", color: "bg-blue-500" },
};

// Feature display names for upgrade prompts
export const FEATURE_NAMES: Record<keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>, string> = {
    metas: 'Metas & Objetivos',
    gamification: 'Gamificação',
    calls: 'Ligações na Plataforma (adicional)',
    reports: 'Relatórios Avançados',
    integrations: 'Integrações (Hotmart, etc)',
    eva: 'Eva — Analista de Vendas com IA'
};

// Get the minimum plan required for a feature (nenhum plano tem ligações:
// cai no fallback 'pro' e o prompt explica que é adicional).
export const getMinimumPlanForFeature = (feature: keyof PlanFeatures): PlanType => {
    for (const plan of PLAN_ORDER) {
        if (PLAN_FEATURES[plan][feature]) {
            return plan;
        }
    }
    return 'pro';
};
