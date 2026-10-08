// Grava no placar as propostas que já estavam no histórico do WhatsApp
// (quote-seed-history). Mesma análise do Raio-X: conversa inteira, na ordem,
// só a última proposta de cada conversa dos últimos 30 dias, com card no
// estágio Proposta. Proposta mais nova substitui a aberta da mesma conversa;
// a mesma mensagem nunca grava duas vezes (unique de channel_message_id).
import { buildRaioX } from "../raio-x-build/build.ts";
import { RECENT_DAYS } from "./raioX.ts";
import { linkQuoteToDeal } from "./quoteTracking.ts";

export type SeedResult = {
    quotes: number;
    stuck: number;
    stuck_value: number;
    stuck_without_value: number;
    your_turn: number;
    messages_read: number;
    seeded: number;
    top: { first_name: string | null; amount: number | null; status: string; days_silent: number }[];
};

// deno-lint-ignore no-explicit-any
export async function seedQuotesFromHistory(admin: any, companyId: string, ownerId: string | null): Promise<SeedResult> {
    const built = await buildRaioX(admin, companyId, { drafts: false });
    const recentes = built.quotes.filter((q) => q.days_since_quote <= RECENT_DAYS && q.message_id);

    const convIds = recentes.map((q) => q.conversation_id);
    const abertos = new Map<string, { id: string; sent_at: string }>();
    for (let i = 0; i < convIds.length; i += 200) {
        const { data } = await admin
            .from("quote_tracking")
            .select("id, conversation_id, sent_at")
            .eq("company_id", companyId)
            .in("conversation_id", convIds.slice(i, i + 200))
            .is("outcome", null)
            .neq("status", "closed");
        for (const r of (data ?? []) as Array<{ id: string; conversation_id: string; sent_at: string }>) {
            const atual = abertos.get(r.conversation_id);
            if (!atual || Date.parse(r.sent_at) > Date.parse(atual.sent_at)) abertos.set(r.conversation_id, { id: r.id, sent_at: r.sent_at });
        }
    }

    let gravadas = 0;
    for (const q of recentes) {
        const aberto = abertos.get(q.conversation_id);
        if (aberto && Date.parse(aberto.sent_at) >= Date.parse(q.quote_at)) continue;
        const { data: tracked, error } = await admin
            .from("quote_tracking")
            .upsert(
                {
                    company_id: companyId,
                    conversation_id: q.conversation_id,
                    contact_id: q.contact_id,
                    channel_message_id: q.message_id,
                    amount: q.amount,
                    detected_by: q.detected_by,
                    sent_at: q.quote_at,
                },
                { onConflict: "channel_message_id", ignoreDuplicates: true },
            )
            .select("id");
        if (error) {
            console.warn("[quote-seed] rastreio falhou:", error.message);
            continue;
        }
        const quoteId = (tracked as Array<{ id: string }> | null)?.[0]?.id;
        if (!quoteId) continue;
        if (aberto) await admin.from("quote_tracking").update({ status: "closed", closed_reason: "replaced" }).eq("id", aberto.id);
        await linkQuoteToDeal(admin, {
            quoteId,
            companyId,
            userId: ownerId,
            conversationId: q.conversation_id,
            contactId: q.contact_id,
            chatPhone: null,
            amount: q.amount,
        });
        gravadas++;
    }

    const paradas = recentes.filter((q) => q.status !== "talking");
    console.log(`[quote-seed] empresa=${companyId} propostas=${recentes.length} paradas=${paradas.length} gravadas=${gravadas}`);
    return {
        quotes: recentes.length,
        stuck: paradas.length,
        stuck_value: paradas.reduce((s, q) => s + (q.amount ?? 0), 0),
        stuck_without_value: paradas.filter((q) => q.amount === null).length,
        your_turn: recentes.filter((q) => q.status === "your_turn").length,
        messages_read: built.summary.messages_read,
        seeded: gravadas,
        top: paradas.slice(0, 3).map((q) => ({
            first_name: q.name ? q.name.trim().split(/\s+/)[0] : null,
            amount: q.amount,
            status: q.status,
            days_silent: q.days_silent,
        })),
    };
}
