// Plan-Based Feature Restrictions Configuration

export type PlanType = 'starter' | 'plus' | 'pro';

export type PlanFeatures = {
    metas: boolean;
    gamification: boolean;
    calls: boolean;
    reports: boolean;
    integrations: boolean;
    maxUsers: number;
    maxProducts: number;
};

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
    starter: {
        metas: false,
        gamification: false,
        calls: false,
        reports: false,
        integrations: false,
        maxUsers: 2,
        maxProducts: 3
    },
    plus: {
        metas: true,
        gamification: false,
        calls: true,
        reports: false,
        integrations: false,
        maxUsers: 10,
        maxProducts: 10
    },
    pro: {
        metas: true,
        gamification: true,
        calls: true,
        reports: true,
        integrations: true,
        maxUsers: Infinity,
        maxProducts: Infinity
    },
};

export const PLANS_INFO: Record<PlanType, { label: string; color: string }> = {
    starter: { label: 'Starter', color: 'bg-gray-500' },
    plus: { label: 'Plus', color: 'bg-blue-500' },
    pro: { label: 'Pro', color: 'bg-emerald-600' },
};

// Feature display names for upgrade prompts
export const FEATURE_NAMES: Record<keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>, string> = {
    metas: 'Metas & Objetivos',
    gamification: 'Gamificação',
    calls: 'Performance de Calls',
    reports: 'Relatórios Avançados',
    integrations: 'Integrações (Hotmart, etc)'
};

// Get the minimum plan required for a feature
export const getMinimumPlanForFeature = (feature: keyof PlanFeatures): PlanType => {
    const planOrder: PlanType[] = ['starter', 'plus', 'pro'];
    for (const plan of planOrder) {
        if (PLAN_FEATURES[plan][feature]) {
            return plan;
        }
    }
    return 'pro';
};
