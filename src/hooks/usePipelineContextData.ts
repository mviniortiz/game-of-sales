// ─────────────────────────────────────────────────────────────────────────────
// F5P.2 (2026-05-22) — usePipelineContextData
//
// Enriquece os cards do /pipeline com contexto comercial:
//   - conversation (channel_conversations.deal_id IN dealIds)
//   - contact (channel_contacts via JOIN)
//   - summary + qualification (conversation_summaries por phone)
//
// 3 queries batched (1 por tabela) — evita N+1.
// Read-only, sem chamada de IA, sem chamada de edge function.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    parseQualification,
    type Qualification,
} from "@/lib/eva/qualificationSchema";
import {
    getQualificationTemperature,
    getQualificationScore,
} from "@/hooks/useCommandCenterData";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type EvaTemperature = "quente" | "morno" | "frio" | "unknown";

export interface PipelineDealContext {
    conversationId: string | null;
    contactName: string | null;
    contactPhone: string | null;
    lastMessageAt: string | null;
    /** Análise persistida (conversation_summaries.analyzed_at) */
    analyzedAt: string | null;
    qualification: Qualification | null;
    temperature: EvaTemperature;
    proximaAcao: string | null;
    /** EVA stale por mensagens novas (last_message_at > analyzed_at) */
    isStale: boolean;
    /** True quando há análise persistida útil */
    hasAnalysis: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function phoneVariants(phone: string): string[] {
    const digits = phone.replace(/[^\d]/g, "");
    if (!digits) return [];
    return Array.from(new Set([phone, digits, `+${digits}`]));
}

function classifyTemperature(qual: Qualification): EvaTemperature {
    const t = (getQualificationTemperature(qual) || "").toLowerCase();
    if (t === "quente" || t === "hot" || t === "alta") return "quente";
    if (t === "morno" || t === "warm")  return "morno";
    if (t === "frio"  || t === "cold")  return "frio";
    const score = getQualificationScore(qual);
    if (typeof score === "number") {
        if (score >= 75) return "quente";
        if (score >= 50) return "morno";
        if (score >  0) return "frio";
    }
    return "unknown";
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePipelineContextData(dealIds: string[]) {
    // Estabiliza queryKey baseado em ordem dos ids
    const idsKey = useMemo(() => [...dealIds].sort().join("|"), [dealIds]);

    const query = useQuery({
        queryKey: ["pipeline-context", idsKey],
        enabled: dealIds.length > 0,
        staleTime: 30_000,
        queryFn: async (): Promise<Map<string, PipelineDealContext>> => {
            const map = new Map<string, PipelineDealContext>();
            if (dealIds.length === 0) return map;

            // 1) Conversations + contacts vinculados aos deals
            const { data: convs, error: e1 } = await supabase
                .from("channel_conversations")
                .select(`
                    id, deal_id, last_message_at,
                    channel_contacts:contact_id (
                        name, phone_e164, external_contact_id
                    )
                `)
                .in("deal_id", dealIds)
                .order("last_message_at", { ascending: false, nullsFirst: false });
            if (e1) throw e1;

            type ConvRow = {
                id: string;
                deal_id: string | null;
                last_message_at: string | null;
                channel_contacts: {
                    name: string | null;
                    phone_e164: string | null;
                    external_contact_id: string;
                } | null;
            };
            const convRows = (convs ?? []) as unknown as ConvRow[];

            // Pra cada deal, mantém só a conversa mais recente (já vem ordenada)
            const convByDeal = new Map<string, ConvRow>();
            for (const c of convRows) {
                if (!c.deal_id) continue;
                if (!convByDeal.has(c.deal_id)) convByDeal.set(c.deal_id, c);
            }

            // 2) Coleta phones únicos pra buscar summaries em 1 query
            const allPhones = new Set<string>();
            for (const c of convByDeal.values()) {
                const p = c.channel_contacts?.phone_e164 || c.channel_contacts?.external_contact_id;
                if (!p) continue;
                for (const v of phoneVariants(p)) allPhones.add(v);
            }

            // 3) Summaries por phone (1 batch query)
            interface SummaryRow {
                chat_phone: string;
                analyzed_at: string | null;
                qualification: Record<string, unknown> | null;
            }
            let summaryByPhoneDigits = new Map<string, SummaryRow>();
            if (allPhones.size > 0) {
                const { data: sumRows, error: e2 } = await supabase
                    .from("conversation_summaries")
                    .select("chat_phone, analyzed_at, qualification")
                    .in("chat_phone", Array.from(allPhones))
                    .not("qualification", "is", null)
                    .order("analyzed_at", { ascending: false });
                if (e2 && import.meta.env.DEV) {
                    console.warn("[usePipelineContextData] summaries lookup failed:", e2.message);
                }
                const all = (sumRows ?? []) as SummaryRow[];
                // Index por dígitos normalizados (mais recente vence)
                for (const s of all) {
                    const digits = (s.chat_phone || "").replace(/[^\d]/g, "");
                    if (digits && !summaryByPhoneDigits.has(digits)) {
                        summaryByPhoneDigits.set(digits, s);
                    }
                }
            }

            // 4) Monta resultado por deal
            for (const dealId of dealIds) {
                const conv = convByDeal.get(dealId);
                if (!conv) {
                    map.set(dealId, {
                        conversationId: null,
                        contactName: null,
                        contactPhone: null,
                        lastMessageAt: null,
                        analyzedAt: null,
                        qualification: null,
                        temperature: "unknown",
                        proximaAcao: null,
                        isStale: false,
                        hasAnalysis: false,
                    });
                    continue;
                }
                const phoneRaw = conv.channel_contacts?.phone_e164 || conv.channel_contacts?.external_contact_id || null;
                const digits = phoneRaw ? phoneRaw.replace(/[^\d]/g, "") : "";
                const summary = digits ? summaryByPhoneDigits.get(digits) ?? null : null;

                let qualification: Qualification | null = null;
                let temperature: EvaTemperature = "unknown";
                let proximaAcao: string | null = null;
                if (summary?.qualification) {
                    qualification = parseQualification(summary.qualification);
                    temperature = classifyTemperature(qualification);
                    const acao = qualification?.proxima_acao;
                    if (typeof acao === "string" && acao.trim()) proximaAcao = acao.trim();
                }

                const hasAnalysis = !!summary && (!!summary.qualification || !!summary.analyzed_at);
                const isStale =
                    hasAnalysis &&
                    !!summary?.analyzed_at &&
                    !!conv.last_message_at &&
                    conv.last_message_at > summary.analyzed_at;

                map.set(dealId, {
                    conversationId: conv.id,
                    contactName: conv.channel_contacts?.name ?? null,
                    contactPhone: phoneRaw,
                    lastMessageAt: conv.last_message_at,
                    analyzedAt: summary?.analyzed_at ?? null,
                    qualification,
                    temperature,
                    proximaAcao,
                    isStale,
                    hasAnalysis,
                });
            }

            return map;
        },
    });

    return useMemo(
        () => ({
            loading: query.isLoading,
            error: query.error instanceof Error ? query.error.message : null,
            contextByDeal: query.data ?? new Map<string, PipelineDealContext>(),
            getContext: (dealId: string): PipelineDealContext | null =>
                query.data?.get(dealId) ?? null,
            refetch: query.refetch,
        }),
        [query],
    );
}
