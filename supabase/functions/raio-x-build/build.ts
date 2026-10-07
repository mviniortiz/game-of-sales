// Miolo do raio-x-build, separado pra rodar também em script local (só leitura).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { analyzeConversation, rankItems, summarize, type RxItem, type RxMessage } from "../_shared/raioX.ts";
import { buildQuietQuotePrompt, buildQuotePrompt, callLLM } from "../_shared/followupDraft.ts";

const WINDOW_DAYS = 90;
const DRAFTS = 5;
const PAGE = 1000;

type Row = {
    conversation_id: string;
    contact_id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    body: string | null;
    media_ref: RxMessage["media_ref"];
    message_timestamp: string;
};

const COLS = "conversation_id, contact_id, direction, message_type, body, media_ref, message_timestamp";

export async function buildRaioX(admin: SupabaseClient, companyId: string, opts: { drafts?: boolean } = {}) {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

    // 1. Candidatas: mensagens da empresa que podem ser proposta (PDF ou valor em reais).
    const candidates: Row[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await admin
            .from("channel_messages")
            .select(COLS)
            .eq("company_id", companyId)
            .eq("direction", "outbound")
            .gte("message_timestamp", since)
            .or("message_type.eq.document,body.ilike.%r$%,body.ilike.%reais%")
            .order("message_timestamp", { ascending: true })
            .range(from, from + PAGE - 1);
        if (error) throw new Error(`leitura falhou: ${error.message}`);
        candidates.push(...(data as Row[]));
        if (!data || data.length < PAGE) break;
    }

    const quickHits = new Map<string, Row[]>();
    for (const r of candidates) {
        const one = analyzeConversation([toRx(r)]);
        if (one) quickHits.set(r.conversation_id, [...(quickHits.get(r.conversation_id) ?? []), r]);
    }

    // 2. Sem grupo: o Raio-X é de cliente, não do grupo da obra.
    const contactIds = [...new Set(candidates.filter((r) => quickHits.has(r.conversation_id)).map((r) => r.contact_id))];
    const contacts = new Map<string, { name: string | null; is_group: boolean }>();
    for (let i = 0; i < contactIds.length; i += 200) {
        const { data } = await admin.from("channel_contacts").select("id, name, is_group").in("id", contactIds.slice(i, i + 200));
        for (const c of data ?? []) contacts.set(c.id, { name: c.name, is_group: c.is_group });
    }
    const contactOf = new Map<string, string>();
    for (const r of candidates) contactOf.set(r.conversation_id, r.contact_id);
    const convIds = [...quickHits.keys()].filter((id) => !contacts.get(contactOf.get(id) ?? "")?.is_group);

    // 3. Conversa inteira (na janela) de cada uma, pra saber quem falou por último.
    const byConv = new Map<string, RxMessage[]>();
    for (let i = 0; i < convIds.length; i += 50) {
        const chunk = convIds.slice(i, i + 50);
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await admin
                .from("channel_messages")
                .select(COLS)
                .in("conversation_id", chunk)
                .gte("message_timestamp", since)
                .order("message_timestamp", { ascending: true })
                .range(from, from + PAGE - 1);
            if (error) throw new Error(`leitura falhou: ${error.message}`);
            for (const r of (data ?? []) as Row[]) byConv.set(r.conversation_id, [...(byConv.get(r.conversation_id) ?? []), toRx(r)]);
            if (!data || data.length < PAGE) break;
        }
    }

    const items: RxItem[] = [];
    for (const [, msgs] of byConv) {
        const item = analyzeConversation(msgs);
        if (item) items.push(item);
    }
    const ranked = rankItems(items);

    // 4. Retomada pronta pras maiores paradas. Fica só no relatório.
    const drafts = new Map<string, { reading: string; draft: string }>();
    const toDraft = ranked.filter((i) => i.status !== "talking").slice(0, DRAFTS);
    if (opts.drafts !== false) await Promise.all(toDraft.map(async (item) => {
        const name = contacts.get(contactOf.get(item.conversation_id) ?? "")?.name ?? null;
        const prompt = item.status === "no_reply"
            ? buildQuotePrompt({ contactName: name, daysSinceQuote: Math.max(1, item.days_since_quote), amount: item.amount, detectedBy: item.detected_by })
            : buildQuietQuotePrompt({
                contactName: name,
                daysSinceClient: Math.max(1, item.days_silent),
                amount: item.amount,
                recent: (byConv.get(item.conversation_id) ?? [])
                    .filter((m) => m.body)
                    .slice(-8)
                    .map((m) => ({ from: m.direction === "inbound" ? "cliente" as const : "empresa" as const, text: m.body!.slice(0, 400) })),
            });
        const out = await callLLM(prompt);
        if (out?.message_draft) drafts.set(item.conversation_id, { reading: out.suggestion_text, draft: out.message_draft });
    }));

    const reportItems = ranked.map((i) => {
        const name = contacts.get(contactOf.get(i.conversation_id) ?? "")?.name ?? null;
        return {
            first_name: name ? name.trim().split(/\s+/)[0] : null,
            status: i.status,
            days_since_quote: i.days_since_quote,
            days_silent: i.days_silent,
            amount: i.amount,
            kwp: i.kwp,
            detected_by: i.detected_by,
            reading: drafts.get(i.conversation_id)?.reading ?? null,
            draft: drafts.get(i.conversation_id)?.draft ?? null,
        };
    });

    const summary = { ...summarize(items), messages_read: [...byConv.values()].reduce((a, m) => a + m.length, 0), window_days: WINDOW_DAYS };
    return { summary, items: reportItems };
}

function toRx(r: Row): RxMessage {
    return {
        conversation_id: r.conversation_id,
        direction: r.direction,
        message_type: r.message_type,
        body: r.body,
        media_ref: r.media_ref,
        ts: r.message_timestamp,
    };
}
