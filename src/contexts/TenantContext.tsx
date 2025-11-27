import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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
  refreshKey: number; // Used to trigger refetch in components
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
        // Check if user is super admin
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_super_admin, company_id')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setIsSuperAdmin(profileData.is_super_admin || false);
          setActiveCompanyId(profileData.company_id);

          // If super admin, load all companies
          if (profileData.is_super_admin) {
            const { data: companiesData } = await supabase
              .from('companies')
              .select('*')
              .order('name');
            
            if (companiesData) {
              setCompanies(companiesData);
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

  return (
    <TenantContext.Provider
      value={{
        activeCompanyId,
        companies,
        switchCompany,
        isSuperAdmin,
        loading,
        refreshKey,
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
