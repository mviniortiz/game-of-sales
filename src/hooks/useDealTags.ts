import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DealTag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DealTagAssignment {
  deal_id: string;
  tag_id: string;
  created_at: string;
}

const TABLE_TAGS = "deal_tags";
const TABLE_ASSIGNMENTS = "deal_tag_assignments";

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

// ── Fetch tags assigned to a specific deal ──────────────────
export function useTagsForDeal(dealId: string | undefined) {
  return useQuery<DealTag[]>({
    queryKey: ["deal-tag-assignments", dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE_ASSIGNMENTS)
        .select("tag_id, deal_tags(*)")
        .eq("deal_id", dealId);
      if (error) throw error;
      return (data ?? []).map((row: any) => row.deal_tags).filter(Boolean) as DealTag[];
    },
    enabled: !!dealId,
  });
}

// ── Tag mutations ───────────────────────────────────────────
export function useDealTagMutations(companyId: string | null) {
  const qc = useQueryClient();

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE_TAGS)
        .insert({ company_id: companyId, name, color })
        .select()
        .single();
      if (error) throw error;
      return data as DealTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-tags", companyId] });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await (supabase as any)
        .from(TABLE_TAGS)
        .delete()
        .eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-tags", companyId] });
      // Also invalidate all deal-tag assignments since removing a tag removes assignments
      qc.invalidateQueries({ queryKey: ["deal-tag-assignments"] });
    },
  });

  const assignTag = useMutation({
    mutationFn: async ({ dealId, tagId }: { dealId: string; tagId: string }) => {
      const { error } = await (supabase as any)
        .from(TABLE_ASSIGNMENTS)
        .insert({ deal_id: dealId, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["deal-tag-assignments", vars.dealId] });
    },
  });

  const removeTag = useMutation({
    mutationFn: async ({ dealId, tagId }: { dealId: string; tagId: string }) => {
      const { error } = await (supabase as any)
        .from(TABLE_ASSIGNMENTS)
        .delete()
        .eq("deal_id", dealId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["deal-tag-assignments", vars.dealId] });
    },
  });

  return { createTag, deleteTag, assignTag, removeTag };
}
