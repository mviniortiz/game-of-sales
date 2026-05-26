// ─────────────────────────────────────────────────────────────────────────────
// F5P.1 (2026-05-21) — useDealContextData
//
// Leitura agregada do contexto comercial associado a um deal:
//   - channel_conversations vinculada (deal_id = $dealId)
//   - channel_contacts da conversa
//   - últimas 5 channel_messages
//   - conversation_summaries por phone (com variantes)
//   - eva_knowledge_gaps relevantes
//
// NÃO chama IA. NÃO chama edge functions. NÃO escreve nada.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    parseQualification,
    type Qualification,
} from "@/lib/eva/qualificationSchema";

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export interface DealConversationContext {
    id: string;
    deal_id: string | null;
    status: string;
    unread_count: number;
    last_message_at: string | null;
    last_inbound_at: string | null;
    last_outbound_at: string | null;
}

export interface DealContact {
    id: string;
    name: string | null;
    phone_e164: string | null;
    external_contact_id: string;
}

export interface DealMessageLine {
    id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    body: string | null;
    media_caption: string | null;
    message_timestamp: string;
}

export interface DealSummary {
    chat_phone: string;
    analyzed_at: string | null;
    summary_text: string | null;
    rawQualification: Record<string, unknown> | null;
}

export interface DealKnowledgeGap {
    id: string;
    gap_description: string | null;
    occurrence_count: number | null;
    detected_at: string | null;
}

export interface DealContextData {
    conversation: DealConversationContext | null;
    contact: DealContact | null;
    lastMessages: DealMessageLine[];
    summary: DealSummary | null;
    qualification: Qualification | null;
    /** Indica se há mensagens novas depois do analyzed_at salvo. */
    isStaleByMessages: boolean;
    /** Knowledge gaps abertos da company que mencionam este chat_phone */
    relatedGaps: DealKnowledgeGap[];
    /** Deep link Inbox quando há conversa vinculada. */
    openConversationHref: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function phoneVariants(phone: string): string[] {
    const digits = phone.replace(/[^\d]/g, "");
    if (!digits) return [];
    return Array.from(new Set([phone, digits, `+${digits}`]));
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDealContextData(dealId: string | undefined, companyId?: string | null) {
    const query = useQuery({
        queryKey: ["deal-context", dealId, companyId],
        enabled: !!dealId,
        staleTime: 30_000,
        queryFn: async (): Promise<DealContextData> => {
            // 1) channel_conversations por deal_id
            const { data: convs, error: e1 } = await supabase
                .from("channel_conversations")
                .select(`
                    id, deal_id, status, unread_count,
                    last_message_at, last_inbound_at, last_outbound_at,
                    channel_contacts:contact_id (
                        id, name, phone_e164, external_contact_id
                    )
                `)
                .eq("deal_id", dealId!)
                .order("last_message_at", { ascending: false, nullsFirst: false })
                .limit(1);
            if (e1) throw e1;

            const convRow = (convs?.[0] as unknown as {
                id: string;
                deal_id: string | null;
                status: string;
                unread_count: number | null;
                last_message_at: string | null;
                last_inbound_at: string | null;
                last_outbound_at: string | null;
                channel_contacts: {
                    id: string;
                    name: string | null;
                    phone_e164: string | null;
                    external_contact_id: string;
                } | null;
            } | undefined) ?? null;

            const conversation: DealConversationContext | null = convRow
                ? {
                      id: convRow.id,
                      deal_id: convRow.deal_id,
                      status: convRow.status,
                      unread_count: convRow.unread_count ?? 0,
                      last_message_at: convRow.last_message_at,
                      last_inbound_at: convRow.last_inbound_at,
                      last_outbound_at: convRow.last_outbound_at,
                  }
                : null;
            const contact: DealContact | null = convRow?.channel_contacts ?? null;

            // 2) últimas 5 mensagens da conversa
            let lastMessages: DealMessageLine[] = [];
            if (conversation?.id) {
                const { data: msgs, error: e2 } = await supabase
                    .from("channel_messages")
                    .select("id, direction, message_type, body, media_ref, message_timestamp")
                    .eq("conversation_id", conversation.id)
                    .order("message_timestamp", { ascending: false })
                    .limit(5);
                if (e2) throw e2;
                lastMessages = ((msgs ?? []) as Array<{
                    id: string;
                    direction: "inbound" | "outbound";
                    message_type: string;
                    body: string | null;
                    media_ref: Record<string, unknown> | null;
                    message_timestamp: string;
                }>).map((m) => ({
                    id: m.id,
                    direction: m.direction,
                    message_type: m.message_type,
                    body: m.body,
                    media_caption: (m.media_ref?.["caption"] as string | undefined) || null,
                    message_timestamp: m.message_timestamp,
                })).reverse(); // ASC cronológico pra render
            }

            // 3) conversation_summaries por phone
            let summary: DealSummary | null = null;
            let qualification: Qualification | null = null;
            const phoneHint = contact?.phone_e164 || contact?.external_contact_id || null;
            if (phoneHint) {
                const variants = phoneVariants(phoneHint);
                if (variants.length > 0) {
                    const { data: sumRows, error: e3 } = await supabase
                        .from("conversation_summaries")
                        .select("chat_phone, analyzed_at, summary, qualification")
                        .in("chat_phone", variants)
                        .order("analyzed_at", { ascending: false })
                        .limit(1);
                    if (e3 && import.meta.env.DEV) {
                        console.warn("[useDealContextData] summary lookup failed:", e3.message);
                    }
                    const sRow = (sumRows?.[0] as {
                        chat_phone: string;
                        analyzed_at: string | null;
                        summary: string | null;
                        qualification: Record<string, unknown> | null;
                    } | undefined) ?? null;
                    if (sRow) {
                        summary = {
                            chat_phone: sRow.chat_phone,
                            analyzed_at: sRow.analyzed_at,
                            summary_text: sRow.summary,
                            rawQualification: sRow.qualification,
                        };
                        if (sRow.qualification) {
                            qualification = parseQualification(sRow.qualification);
                        }
                    }
                }
            }

            // 4) stale by messages
            const isStaleByMessages =
                !!summary?.analyzed_at &&
                !!conversation?.last_message_at &&
                conversation.last_message_at > summary.analyzed_at;

            // 5) related gaps (filtro best-effort por source_chat_phone)
            let relatedGaps: DealKnowledgeGap[] = [];
            if (companyId && phoneHint) {
                const variants = phoneVariants(phoneHint);
                const { data: gapRows } = await supabase
                    .from("eva_knowledge_gaps")
                    .select("id, gap_description, occurrence_count, detected_at, source_chat_phone, status")
                    .eq("company_id", companyId)
                    .eq("status", "open")
                    .in("source_chat_phone", variants)
                    .order("occurrence_count", { ascending: false })
                    .limit(5);
                relatedGaps = ((gapRows ?? []) as Array<{
                    id: string;
                    gap_description: string | null;
                    occurrence_count: number | null;
                    detected_at: string | null;
                }>);
            }

            return {
                conversation,
                contact,
                lastMessages,
                summary,
                qualification,
                isStaleByMessages,
                relatedGaps,
                openConversationHref: conversation
                    ? `/inbox?conversationId=${conversation.id}`
                    : null,
            };
        },
    });

    return useMemo(
        () => ({
            loading: query.isLoading,
            error: query.error instanceof Error ? query.error.message : null,
            conversation: query.data?.conversation ?? null,
            contact: query.data?.contact ?? null,
            lastMessages: query.data?.lastMessages ?? [],
            summary: query.data?.summary ?? null,
            qualification: query.data?.qualification ?? null,
            isStaleByMessages: query.data?.isStaleByMessages ?? false,
            relatedGaps: query.data?.relatedGaps ?? [],
            openConversationHref: query.data?.openConversationHref ?? null,
            refetch: query.refetch,
        }),
        [query],
    );
}
