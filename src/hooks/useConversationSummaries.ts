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
    // Campos do `qualification` que justificam a etiqueta-motivo (ver buildReason).
    objecao: string | null;
    scoreJustificativa: string | null;
    proximaAcao: string | null;
}

/** Normaliza pro formato dos chats do Evolution ("+5511…" → "5511…"). */
export function normalizePhone(phone?: string | null): string {
    return (phone ?? "").replace(/\D/g, "");
}

// Próximas-ações que viram etiqueta curta de valor (o resto cai pra justificativa).
const PROXIMA_ACAO_LABEL: Record<string, string> = {
    criar_oportunidade: "pronto pra avançar",
    marcar_demo: "quer agendar",
    qualificar: "falta qualificar",
};

/**
 * Deriva a etiqueta-motivo da lista priorizada a partir dos campos que a EVA já
 * grava — sem campo novo, sem migration. Do mais específico ao mais genérico:
 * objeção detectada → ação de valor → justificativa do score → próxima ação →
 * sentimento. Retorna undefined quando não há nada honesto a dizer.
 */
export function buildReason(s: ConversationSignal): string | undefined {
    const clip = (t: string) => (t.length > 56 ? `${t.slice(0, 55)}…` : t);
    if (s.objecao && s.objecao.trim()) return clip(`objeção: ${s.objecao.trim()}`);
    if (s.proximaAcao && PROXIMA_ACAO_LABEL[s.proximaAcao]) return PROXIMA_ACAO_LABEL[s.proximaAcao];
    if (s.scoreJustificativa && s.scoreJustificativa.trim()) return clip(s.scoreJustificativa.trim());
    if (s.nextAction && s.nextAction.trim()) return clip(s.nextAction.trim());
    if (s.sentiment && s.sentiment.trim()) return clip(s.sentiment.trim());
    return undefined;
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
                    objecao: typeof qual.objecao === "string" ? qual.objecao : null,
                    scoreJustificativa: typeof qual.score_justificativa === "string" ? qual.score_justificativa : null,
                    proximaAcao: typeof qual.proxima_acao === "string" ? qual.proxima_acao : null,
                };
            }
            return byPhone;
        },
    });
    return { signalsByPhone: query.data ?? {}, loading: query.isLoading };
}
