import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Reminder {
  id: string;
  deal_id: string;
  user_id: string;
  company_id: string;
  title: string;
  description: string | null;
  remind_at: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  deal_title?: string;
}

const TABLE = "follow_up_reminders";

// ── Fetch all pending reminders for the user ────────────────
export function useReminders(userId: string | undefined, companyId: string | null) {
  return useQuery<Reminder[]>({
    queryKey: ["reminders", userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*, deals(title)")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("completed", false)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        deal_title: r.deals?.title ?? null,
      }));
    },
    enabled: !!userId && !!companyId,
    refetchInterval: 60_000, // re-check every 60s
  });
}

// ── Fetch reminders due in next 24 hours ────────────────────
export function useUpcomingReminders(userId: string | undefined, companyId: string | null) {
  return useQuery<Reminder[]>({
    queryKey: ["reminders-upcoming", userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return [];
      const now = new Date().toISOString();
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*, deals(title)")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("completed", false)
        .lte("remind_at", in24h)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        deal_title: r.deals?.title ?? null,
      }));
    },
    enabled: !!userId && !!companyId,
    refetchInterval: 60_000,
  });
}

// ── Fetch reminders for a specific deal ─────────────────────
export function useDealReminders(dealId: string | undefined) {
  return useQuery<Reminder[]>({
    queryKey: ["reminders-deal", dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("deal_id", dealId)
        .eq("completed", false)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealId,
  });
}

// ── Mutations ───────────────────────────────────────────────
export function useReminderMutations(userId: string | undefined, companyId: string | null) {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["reminders"] });
    qc.invalidateQueries({ queryKey: ["reminders-upcoming"] });
    qc.invalidateQueries({ queryKey: ["reminders-deal"] });
  };

  const createReminder = useMutation({
    mutationFn: async (data: {
      dealId: string;
      title: string;
      description?: string;
      remindAt: string; // ISO string
    }) => {
      if (!userId || !companyId) throw new Error("User/company required");
      const { error } = await (supabase as any).from(TABLE).insert({
        deal_id: data.dealId,
        user_id: userId,
        company_id: companyId,
        title: data.title,
        description: data.description || null,
        remind_at: data.remindAt,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  return { createReminder, completeReminder, deleteReminder };
}
