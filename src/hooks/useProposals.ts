// CRUD de propostas comerciais (PROP.1) vinculadas a um deal.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ProposalItem, ProposalSection } from "@/components/crm/ProposalPDFGenerator";

export type ProposalStatus = "rascunho" | "enviada" | "aceita" | "recusada";

export interface Proposal {
  id: string;
  company_id: string;
  deal_id: string | null;
  title: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  items: ProposalItem[];
  discount_percent: number;
  validity_days: number;
  conditions: string | null;
  intro: string | null;
  about: string | null;
  brand_color: string | null;
  sections: ProposalSection[] | null;
  total: number;
  status: ProposalStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProposalInput {
  deal_id: string;
  title: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  items: ProposalItem[];
  discount_percent?: number;
  validity_days?: number;
  conditions?: string | null;
  intro?: string | null;
  about?: string | null;
  brand_color?: string | null;
  sections?: ProposalSection[] | null;
  total: number;
  status?: ProposalStatus;
}

export function useProposals(dealId: string | null | undefined) {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["proposals", dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<Proposal[]> => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Proposal[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["proposals", dealId] });

  const createProposal = useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          company_id: companyId,
          deal_id: input.deal_id,
          title: input.title,
          customer_name: input.customer_name ?? null,
          customer_email: input.customer_email ?? null,
          customer_phone: input.customer_phone ?? null,
          items: input.items as unknown as object,
          discount_percent: input.discount_percent ?? 0,
          validity_days: input.validity_days ?? 30,
          conditions: input.conditions ?? null,
          intro: input.intro ?? null,
          about: input.about ?? null,
          brand_color: input.brand_color ?? "#1556C0",
          sections: (input.sections ?? null) as unknown as object,
          total: input.total,
          status: input.status ?? "rascunho",
          created_by: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Proposal;
    },
    onSuccess: invalidate,
  });

  const updateProposalStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const { error } = await supabase.from("proposals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    proposals: query.data ?? [],
    loading: query.isLoading,
    createProposal,
    updateProposalStatus,
    deleteProposal,
  };
}
