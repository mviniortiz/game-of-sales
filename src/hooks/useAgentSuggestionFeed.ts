// EVA.CANVAS.3 — Feed do "dia da EVA": lê agent_suggestions (auditoria do
// "a EVA sugere, seu time aprova") e resolve o nome do contato da conversa.
// conversation_id não tem FK (PostgREST não aninha) → 2 lookups encadeados.
// queryKey compartilhada com useAgentSuggestionLog → o feed atualiza sozinho
// quando o Inbox registra/resolve uma sugestão.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AgentSuggestionStatus } from "@/hooks/useAgentSuggestionLog";

export interface AgentFeedItem {
    id: string;
    kind: string;
    status: AgentSuggestionStatus;
    createdAt: string;
    resolvedAt: string | null;
    conversationId: string | null;
    dealId: string | null;
    /** Nome do contato da conversa (quando resolvível). */
    contactName: string | null;
    /** Leitura/próximo passo sugerido pela EVA (nunca a mensagem crua do lead). */
    nextAction: string | null;
    /** Título do card criado no pipeline, se a sugestão virou deal. */
    dealTitle: string | null;
    trigger: string | null;
}

interface SuggestionRow {
    id: string;
    kind: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
    conversation_id: string | null;
    deal_id: string | null;
    suggestion: Record<string, unknown> | null;
    input_summary: Record<string, unknown> | null;
    applied_payload: Record<string, unknown> | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function useAgentSuggestionFeed(limit = 40) {
    const { companyId } = useAuth();

    const query = useQuery({
        queryKey: ["agent-suggestions", companyId],
        enabled: !!companyId,
        staleTime: 60 * 1000,
        queryFn: async (): Promise<AgentFeedItem[]> => {
            const { data, error } = await supabase
                .from("agent_suggestions")
                .select("id, kind, status, created_at, resolved_at, conversation_id, deal_id, suggestion, input_summary, applied_payload")
                .eq("company_id", companyId!)
                .order("created_at", { ascending: false })
                .limit(limit);
            if (error) throw error;
            const rows = (data ?? []) as unknown as SuggestionRow[];

            // conversa → contato → nome (sem FK, resolvemos na mão)
            const convIds = [...new Set(rows.map((r) => r.conversation_id).filter(Boolean))] as string[];
            const nameByConv = new Map<string, string>();
            if (convIds.length > 0) {
                const { data: convs } = await supabase
                    .from("channel_conversations")
                    .select("id, contact_id")
                    .in("id", convIds);
                const contactIds = [...new Set((convs ?? []).map((c) => c.contact_id).filter(Boolean))];
                if (contactIds.length > 0) {
                    const { data: contacts } = await supabase
                        .from("channel_contacts")
                        .select("id, name")
                        .in("id", contactIds);
                    const nameByContact = new Map((contacts ?? []).map((c) => [c.id, c.name]));
                    for (const c of convs ?? []) {
                        const n = nameByContact.get(c.contact_id);
                        if (n) nameByConv.set(c.id, n);
                    }
                }
            }

            return rows.map((r) => ({
                id: r.id,
                kind: r.kind,
                status: r.status as AgentSuggestionStatus,
                createdAt: r.created_at,
                resolvedAt: r.resolved_at,
                conversationId: r.conversation_id,
                dealId: r.deal_id,
                contactName: r.conversation_id ? nameByConv.get(r.conversation_id) ?? null : null,
                nextAction: str(r.suggestion?.proxima_acao),
                dealTitle: str(r.applied_payload?.title),
                trigger: str(r.input_summary?.trigger),
            }));
        },
    });

    return {
        items: query.data ?? [],
        loading: query.isLoading,
        pendingCount: (query.data ?? []).filter((i) => i.status === "pending").length,
    };
}
