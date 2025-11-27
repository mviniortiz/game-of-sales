import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

interface Seller {
  id: string;
  nome: string;
  avatar_url?: string | null;
  is_super_admin?: boolean;
}

interface UseVisibleSellersOptions {
  includeAvatars?: boolean;
  enabled?: boolean;
}

/**
 * Hook to fetch sellers based on permission hierarchy:
 * 
 * 1. Super Admin (God Mode): 
 *    - Sees all sellers from all companies
 *    - NEVER sees other Super Admins
 * 
 * 2. Admin (Company): 
 *    - Sees only sellers from their own company
 *    - NEVER sees Super Admins
 * 
 * 3. Seller: 
 *    - Only sees themselves (or nothing if used for filters)
 */
export function useVisibleSellers(options: UseVisibleSellersOptions = {}) {
  const { includeAvatars = false, enabled = true } = options;
  const { user, isAdmin, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();

  // Determine which company to filter by
  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  // Can this user see other sellers?
  const canSeeOthers = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ["visible-sellers", effectiveCompanyId, isSuperAdmin, includeAvatars],
    queryFn: async (): Promise<Seller[]> => {
      const selectFields = includeAvatars 
        ? "id, nome, avatar_url, is_super_admin" 
        : "id, nome, is_super_admin";

      let query = supabase
        .from("profiles")
        .select(selectFields)
        .eq("is_super_admin", false) // CRITICAL: Never show Super Admins
        .order("nome");

      // Apply company filter based on role
      if (isSuperAdmin) {
        // Super Admin: Filter by selected company if any
        if (activeCompanyId) {
          query = query.eq("company_id", activeCompanyId);
        }
        // If no company selected, show all non-super-admin sellers
      } else if (companyId) {
        // Company Admin: Only see their company's sellers
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching visible sellers:", error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && canSeeOthers,
  });
}

/**
 * Hook to check if current user can see a specific user's data
 */
export function useCanViewUser(targetUserId: string | undefined) {
  const { user, isAdmin, isSuperAdmin, companyId } = useAuth();

  return useQuery({
    queryKey: ["can-view-user", targetUserId, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!targetUserId || !user) return false;

      // Users can always see themselves
      if (targetUserId === user.id) return true;

      // Check if target is a Super Admin (protected)
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("is_super_admin, company_id")
        .eq("id", targetUserId)
        .single();

      if (!targetProfile) return false;

      // Super Admins' data is protected from everyone
      if (targetProfile.is_super_admin) return false;

      // Super Admin can see anyone (except other Super Admins - checked above)
      if (isSuperAdmin) return true;

      // Company Admin can only see users from their company
      if (isAdmin && companyId) {
        return targetProfile.company_id === companyId;
      }

      // Regular sellers can't see others
      return false;
    },
    enabled: !!targetUserId && !!user,
  });
}

