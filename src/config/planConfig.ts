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

// Free tem tudo que o produto entrega hoje, exceto ligações (custo real de
// telefonia). A EVA existe em todos os planos — a diferença é o limite
// diário, aplicado no backend (whatsapp-copilot), não por flag.
export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
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
    pro: {
        metas: true,
        gamification: true,
        calls: true,
        reports: true,
        integrations: true,
        eva: true,
        maxUsers: PLANS.pro.limits.users,
        maxProducts: PLANS.pro.limits.products,
    },
    escala: {
        metas: true,
        gamification: true,
        calls: true,
        reports: true,
        integrations: true,
        eva: true,
        maxUsers: PLANS.escala.limits.users,
        maxProducts: PLANS.escala.limits.products,
    },
};

export const PLANS_INFO: Record<PlanType, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-gray-500" },
    pro: { label: "Pro", color: "bg-blue-500" },
    escala: { label: "Escala", color: "bg-emerald-600" },
};

// Feature display names for upgrade prompts
export const FEATURE_NAMES: Record<keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>, string> = {
    metas: 'Metas & Objetivos',
    gamification: 'Gamificação',
    calls: 'Ligações na Plataforma',
    reports: 'Relatórios Avançados',
    integrations: 'Integrações (Hotmart, etc)',
    eva: 'Eva — Analista de Vendas com IA'
};

// Get the minimum plan required for a feature
export const getMinimumPlanForFeature = (feature: keyof PlanFeatures): PlanType => {
    for (const plan of PLAN_ORDER) {
        if (PLAN_FEATURES[plan][feature]) {
            return plan;
        }
    }
    return 'escala';
};
