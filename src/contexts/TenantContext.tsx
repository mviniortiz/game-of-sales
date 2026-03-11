import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { PLAN_FEATURES, PlanType, PlanFeatures, PLANS_INFO } from '@/config/planConfig';

interface Company {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
  trial_ends_at: string | null;
  subscription_status: 'active' | 'trialing' | 'expired' | 'cancelled';
}

interface TenantContextType {
  activeCompanyId: string | null;
  companies: Company[];
  switchCompany: (companyId: string) => void;
  isSuperAdmin: boolean;
  loading: boolean;
  refreshKey: number;
  // Plan-related fields
  currentPlan: PlanType;
  planFeatures: PlanFeatures;
  planInfo: { label: string; color: string };
  hasFeature: (feature: keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>) => boolean;
  getUserLimit: () => number;
  getProductLimit: () => number;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadTenantData = async () => {
      try {
        const storedCompanyId = localStorage.getItem('activeCompanyId');

        // Check if user is super admin
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_super_admin, company_id')
          .eq('id', userId)
          .single();

        if (profileData) {
          const isSuperAdminUser = profileData.is_super_admin === true;
          setIsSuperAdmin(isSuperAdminUser);

          if (isSuperAdminUser) {
            // Super admin can see all companies
            const { data: allCompanies, error: companiesError } = await supabase
              .from('companies')
              .select('id, name, plan, logo_url')
              .order('name');

            if (companiesError) {
              console.warn('[TenantContext] Super admin - error loading companies:', companiesError);
            }

            if (allCompanies && allCompanies.length > 0) {
              // Map with safe defaults for fields that may not exist yet
              const typedCompanies: Company[] = allCompanies.map((c: any) => ({
                id: c.id,
                name: c.name,
                plan: c.plan || 'starter',
                logo_url: c.logo_url || null,
                trial_ends_at: c.trial_ends_at || null,
                subscription_status: c.subscription_status || 'active',
              }));
              setCompanies(typedCompanies);
              // Use stored company or allocated company or first one
              const targetCompany = storedCompanyId && typedCompanies.find(c => c.id === storedCompanyId)
                ? storedCompanyId
                : (profileData.company_id && typedCompanies.find(c => c.id === profileData.company_id)
                  ? profileData.company_id
                  : typedCompanies[0]?.id || null);
              setActiveCompanyId(targetCompany);
              // Ensure local storage is updated to the newly selected profile 
              if (targetCompany) localStorage.setItem('activeCompanyId', targetCompany);
              console.log('[TenantContext] Super admin - activeCompanyId set to:', targetCompany, 'from', typedCompanies.length, 'companies');
            } else {
              // Fallback: Use super admin's own company_id if they have one
              console.warn('[TenantContext] Super admin - no companies found from query, falling back to own company_id');
              if (profileData.company_id) {
                const { data: ownCompany } = await supabase
                  .from('companies')
                  .select('id, name, plan, logo_url')
                  .eq('id', profileData.company_id)
                  .single();

                if (ownCompany) {
                  const typedOwn: Company = {
                    id: ownCompany.id,
                    name: ownCompany.name,
                    plan: (ownCompany as any).plan || 'starter',
                    logo_url: ownCompany.logo_url || null,
                    trial_ends_at: (ownCompany as any).trial_ends_at || null,
                    subscription_status: (ownCompany as any).subscription_status || 'active',
                  };
                  setCompanies([typedOwn]);
                  setActiveCompanyId(profileData.company_id);
                  console.log('[TenantContext] Super admin - using own company_id:', profileData.company_id);
                } else {
                  console.error('[TenantContext] Super admin - could not load own company either');
                }
              } else {
                console.error('[TenantContext] Super admin - no company_id in profile and no companies accessible');
              }
            }
          } else {
            // Regular users load only their own company
            const { data: companyData } = await supabase
              .from('companies')
              .select('id, name, plan, logo_url')
              .eq('id', profileData.company_id)
              .single();

            if (companyData) {
              const typedCompany: Company = {
                id: companyData.id,
                name: companyData.name,
                plan: (companyData as any).plan || 'starter',
                logo_url: companyData.logo_url || null,
                trial_ends_at: (companyData as any).trial_ends_at || null,
                subscription_status: (companyData as any).subscription_status || 'active',
              };
              setCompanies([typedCompany]);
              setActiveCompanyId(profileData.company_id);
              if (profileData.company_id) {
                localStorage.setItem('activeCompanyId', profileData.company_id);
              }
              console.log('[TenantContext] Regular user - activeCompanyId set to:', profileData.company_id);
            } else {
              console.warn('[TenantContext] Regular user - no company data found for company_id:', profileData.company_id);
            }
          }
        } else {
          console.warn('[TenantContext] No profile data found for user:', userId);
        }
      } catch (error) {
        console.error('Error loading tenant data:', error);
      } finally {
        setLoading(false);
        console.log('[TenantContext] Loading complete');
      }
    };

    loadTenantData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const switchCompany = useCallback((companyId: string) => {
    setActiveCompanyId(companyId);
    // Store in localStorage for persistence
    localStorage.setItem('activeCompanyId', companyId);
    // Increment refresh key to trigger data refetch
    setRefreshKey(prev => prev + 1);
    // Invalidate all queries to refetch with new company context
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Compute plan-related values
  const activeCompany = useMemo(() =>
    companies.find(c => c.id === activeCompanyId),
    [companies, activeCompanyId]
  );

  const currentPlan: PlanType = useMemo(() => {
    const plan = activeCompany?.plan?.toLowerCase() as PlanType;
    return plan && PLAN_FEATURES[plan] ? plan : 'starter';
  }, [activeCompany]);

  const planFeatures = useMemo(() => PLAN_FEATURES[currentPlan], [currentPlan]);
  const planInfo = useMemo(() => PLANS_INFO[currentPlan], [currentPlan]);

  const hasFeature = useCallback((feature: keyof Omit<PlanFeatures, 'maxUsers' | 'maxProducts'>) => {
    // Super admins bypass all restrictions
    if (isSuperAdmin) return true;
    return planFeatures[feature] ?? false;
  }, [planFeatures, isSuperAdmin]);

  const getUserLimit = useCallback(() => planFeatures.maxUsers, [planFeatures]);
  const getProductLimit = useCallback(() => planFeatures.maxProducts, [planFeatures]);

  const contextValue = useMemo(() => ({
    activeCompanyId,
    companies,
    switchCompany,
    isSuperAdmin,
    loading,
    refreshKey,
    currentPlan,
    planFeatures,
    planInfo,
    hasFeature,
    getUserLimit,
    getProductLimit,
  }), [activeCompanyId, companies, switchCompany, isSuperAdmin, loading, refreshKey, currentPlan, planFeatures, planInfo, hasFeature, getUserLimit, getProductLimit]);

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
