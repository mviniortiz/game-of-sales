// Convenience hook for plan-related operations
import { useTenant } from '@/contexts/TenantContext';
import { FEATURE_NAMES, getMinimumPlanForFeature, PLANS_INFO, PlanFeatures, PlanType } from '@/config/planConfig';

export const usePlan = () => {
    const {
        currentPlan,
        planFeatures,
        planInfo,
        hasFeature,
        getUserLimit,
        getProductLimit,
        isSuperAdmin
    } = useTenant();

    // Get feature display name
    const getFeatureName = (feature: keyof typeof FEATURE_NAMES) => {
        return FEATURE_NAMES[feature];
    };

    // Get minimum plan required for a feature
    const getRequiredPlan = (feature: keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>) => {
        return getMinimumPlanForFeature(feature);
    };

    // Get required plan info (label, color) for a feature
    const getRequiredPlanInfo = (feature: keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>) => {
        const requiredPlan = getMinimumPlanForFeature(feature);
        return PLANS_INFO[requiredPlan];
    };

    // Check if upgrade is needed for a feature
    const needsUpgrade = (feature: keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>) => {
        if (isSuperAdmin) return false;
        return !hasFeature(feature);
    };

    return {
        currentPlan,
        planFeatures,
        planInfo,
        hasFeature,
        getUserLimit,
        getProductLimit,
        getFeatureName,
        getRequiredPlan,
        getRequiredPlanInfo,
        needsUpgrade,
        isSuperAdmin
    };
};
