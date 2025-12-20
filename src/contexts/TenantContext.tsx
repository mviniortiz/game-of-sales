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

  useEffect(() => {
    if (!user) {
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
          .eq('id', user.id)
          .single();

        if (profileData) {
          setIsSuperAdmin(profileData.is_super_admin || false);

          // If super admin, load all companies
          if (profileData.is_super_admin) {
            const { data: companiesData } = await supabase
              .from('companies')
              .select('*')
              .order('name');

            if (companiesData) {
              setCompanies(companiesData);
              // Prefer stored selection if valid; otherwise fallback to first
              const validStored = companiesData.find(c => c.id === storedCompanyId)?.id;
              setActiveCompanyId(validStored || profileData.company_id || companiesData[0]?.id || null);
              if (validStored) {
                localStorage.setItem('activeCompanyId', validStored);
              }
            }
          } else {
            // Regular user, load only their company
            const { data: companyData } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profileData.company_id)
              .single();

            if (companyData) {
              setCompanies([companyData]);
              setActiveCompanyId(profileData.company_id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading tenant data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [user]);

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

  return (
    <TenantContext.Provider
      value={{
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
      }}
    >
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
