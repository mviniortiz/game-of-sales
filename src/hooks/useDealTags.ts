import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealTag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

const TABLE_TAGS = "deal_tags";

// ── Fetch all tags for a company ────────────────────────────
export function useDealTags(companyId: string | null) {
  return useQuery<DealTag[]>({
    queryKey: ["deal-tags", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE_TAGS)
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}
