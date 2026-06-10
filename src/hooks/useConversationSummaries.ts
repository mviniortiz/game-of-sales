// EVA.INBOX.SIGNALS (2026-06-09) — leitura dos sinais REAIS da EVA por conversa.
// A edge whatsapp-copilot persiste cada análise em conversation_summaries
// (user_id + chat_phone, com `qualification` estruturado). Este hook entrega o
// último sinal por telefone pra lista priorizada do Inbox — substitui o
// placeholder de signals do preview. Só leitura, scoped por company via RLS.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConversationSignal {
    phone: string;
    temperature: "quente" | "morno" | "frio" | null;
    nextAction: string | null;
    sentiment: string | null;
    score: number | null;
    confianca: number | null;
    analyzedAt: string | null;
}

/** Normaliza pro formato dos chats do Evolution ("+5511…" → "5511…"). */
export function normalizePhone(phone?: string | null): string {
    return (phone ?? "").replace(/\D/g, "");
}

export function useConversationSummaries() {
    const { companyId } = useAuth();
    const query = useQuery({
        queryKey: ["conversation-summaries", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<Record<string, ConversationSignal>> => {
            const { data, error } = await supabase
                .from("conversation_summaries")
                .select("chat_phone, temperature, next_action, sentiment, qualification, analyzed_at")
                .eq("company_id", companyId)
                .order("analyzed_at", { ascending: false })
                .limit(300);
            if (error || !data) return {};
            const byPhone: Record<string, ConversationSignal> = {};
            for (const row of data as Array<Record<string, unknown>>) {
                const phone = normalizePhone(row.chat_phone as string);
                if (!phone || byPhone[phone]) continue; // mais recente vence (já ordenado)
                const qual = (row.qualification ?? {}) as Record<string, unknown>;
                const temp = (qual.temperatura ?? row.temperature) as string | null;
                byPhone[phone] = {
                    phone,
                    temperature: temp === "quente" || temp === "morno" || temp === "frio" ? temp : null,
                    nextAction: (row.next_action as string) ?? null,
                    sentiment: (row.sentiment as string) ?? null,
                    score: typeof qual.score_sugerido === "number" ? qual.score_sugerido : null,
                    confianca: typeof qual.confianca === "number" ? qual.confianca : null,
                    analyzedAt: (row.analyzed_at as string) ?? null,
                };
            }
            return byPhone;
        },
    });
    return { signalsByPhone: query.data ?? {}, loading: query.isLoading };
}
