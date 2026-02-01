// Trial status hook for managing 7-day reverse trial
import { useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { differenceInDays, parseISO } from 'date-fns';

export interface TrialInfo {
    daysRemaining: number;
    isTrialActive: boolean;
    isExpired: boolean;
    planName: string;
    subscriptionStatus: 'active' | 'trialing' | 'expired' | 'cancelled';
    trialEndsAt: Date | null;
}

export const useTrial = (): TrialInfo => {
    const { companies, activeCompanyId, currentPlan, isSuperAdmin } = useTenant();

    return useMemo(() => {
        // Super admins never have trial restrictions
        if (isSuperAdmin) {
            return {
                daysRemaining: 999,
                isTrialActive: false,
                isExpired: false,
                planName: 'Pro (Admin)',
                subscriptionStatus: 'active' as const,
                trialEndsAt: null,
            };
        }

        const activeCompany = companies.find(c => c.id === activeCompanyId);

        if (!activeCompany) {
            return {
                daysRemaining: 0,
                isTrialActive: false,
                isExpired: false,
                planName: 'Starter',
                subscriptionStatus: 'active' as const,
                trialEndsAt: null,
            };
        }

        const subscriptionStatus = activeCompany.subscription_status || 'active';
        const trialEndsAt = activeCompany.trial_ends_at
            ? parseISO(activeCompany.trial_ends_at)
            : null;

        // Calculate days remaining
        const daysRemaining = trialEndsAt
            ? differenceInDays(trialEndsAt, new Date())
            : 0;

        // Check trial status
        const isTrialActive = subscriptionStatus === 'trialing' && daysRemaining >= 0;
        const isExpired = subscriptionStatus === 'trialing' && daysRemaining < 0;

        // Determine plan display name
        let planName: string;
        if (isTrialActive) {
            planName = 'Pro (Trial)';
        } else if (currentPlan === 'pro') {
            planName = 'Pro';
        } else if (currentPlan === 'plus') {
            planName = 'Plus';
        } else {
            planName = 'Starter';
        }

        return {
            daysRemaining: Math.max(0, daysRemaining),
            isTrialActive,
            isExpired,
            planName,
            subscriptionStatus,
            trialEndsAt,
        };
    }, [companies, activeCompanyId, currentPlan, isSuperAdmin]);
};
