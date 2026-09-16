// eva-quote-followup (QUOTE.1, 2026-09-16) — "orçamento que some".
// Cron a cada 30 min (eva-quote-followup-every-30m). Lê quote_tracking, que a
// evolution-message-webhook preenche quando a empresa manda um orçamento:
//   - lead respondeu depois do orçamento → 'replied' (quem marca é a trigger
//     trg_quote_tracking_mark_replied no insert da mensagem; aqui é só rede de
//     segurança pra resposta que não passou por channel_messages)
//   - 2 dias sem resposta → rascunho de retomada em agent_suggestions
//     (kind='followup'), levado pro WhatsApp do dono → 'followup_suggested'
//   - 7 dias sem ação → 'closed'
// Só rascunha. O envio pro lead depende do dono aprovar no WhatsApp.
//
// Invocação:
//   1. Automática via pg_cron (production)
//   2. Manual POST { company_id? } com service_role bearer pra debug

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPendingSuggestions } from "../_shared/whatsappApproval.ts";
import { buildQuotePrompt, callLLM, daysBetween } from "../_shared/followupDraft.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Mesmo segredo do eva-stale-deal-followup (vault eva_cron_secret).
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const NO_REPLY_DAYS = 2;
const CLOSE_AFTER_DAYS = 7;
const MAX_QUOTES_PER_RUN = 40;
const CLOSED_STAGES = ["closed_won", "closed_lost", "Ganho", "Perdido", "ganho", "perdido", "won", "lost"];

type QuoteRow = {
    id: string;
    company_id: string;
    conversation_id: string;
    contact_id: string | null;
    deal_id: string | null;
    amount: number | null;
    detected_by: "pdf" | "text";
    sent_at: string;
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

async function hasPendingSuggestion(dealId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from("agent_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", dealId)
        .eq("status", "pending")
        .in("kind", ["followup", "outbound_message", "objection", "proposal"]);
    if (error) return true; // na dúvida não rascunha: duplicar pro dono é pior que esperar 30 min
    return (count ?? 0) > 0;
}

async function setStatus(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from("quote_tracking").update(patch).eq("id", id);
    if (error) console.error("[eva-quote] update falhou", id, error.message);
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const providedCronSecret = req.headers.get("x-cron-secret");
    const providedAuth = req.headers.get("authorization") || "";
    const providedBearer = providedAuth.toLowerCase().startsWith("bearer ")
        ? providedAuth.slice(7).trim()
        : "";

    const cronSecretValid = EVA_CRON_SECRET && providedCronSecret === EVA_CRON_SECRET;
    const serviceRoleValid = providedBearer && providedBearer === SERVICE_ROLE_KEY;

    if (!cronSecretValid && !serviceRoleValid) {
        return json(401, { error: "unauthorized — requires x-cron-secret header or service_role bearer" });
    }

    try {
        let filterCompanyId: string | undefined;
        if (req.method === "POST") {
            const body = await req.json().catch(() => ({}));
            filterCompanyId = body.company_id;
        }

        const now = Date.now();
        const noReplyCutoff = new Date(now - NO_REPLY_DAYS * 86400000).toISOString();
        const closeCutoff = new Date(now - CLOSE_AFTER_DAYS * 86400000).toISOString();

        // 1) Velho demais pra retomar: fecha sem rascunhar.
        let closeQuery = supabase
            .from("quote_tracking")
            .update({ status: "closed" })
            .eq("status", "open")
            .lt("sent_at", closeCutoff);
        if (filterCompanyId) closeQuery = closeQuery.eq("company_id", filterCompanyId);
        const { data: closedRows, error: closeErr } = await closeQuery.select("id");
        if (closeErr) console.error("[eva-quote] fechamento falhou", closeErr.message);

        // 2) Janela de retomada: entre 2 e 7 dias.
        let query = supabase
            .from("quote_tracking")
            .select("id, company_id, conversation_id, contact_id, deal_id, amount, detected_by, sent_at")
            .eq("status", "open")
            .lt("sent_at", noReplyCutoff)
            .gte("sent_at", closeCutoff)
            .order("sent_at", { ascending: true })
            .limit(MAX_QUOTES_PER_RUN);
        if (filterCompanyId) query = query.eq("company_id", filterCompanyId);

        const { data: quotes, error } = await query;
        if (error) throw new Error(`leitura de quote_tracking falhou: ${error.message}`);

        let replied = 0;
        let suggested = 0;
        let notified = 0;
        let closedDealDone = 0;
        let skippedPending = 0;
        let skippedNoDeal = 0;
        let failedLLM = 0;
        const errors: string[] = [];

        for (const q of (quotes || []) as QuoteRow[]) {
            const { data: conv } = await supabase
                .from("channel_conversations")
                .select("deal_id, contact_id, last_inbound_at")
                .eq("id", q.conversation_id)
                .maybeSingle();

            // Rede de segurança: a trigger de channel_messages já marca 'replied'.
            if (conv?.last_inbound_at && new Date(conv.last_inbound_at) > new Date(q.sent_at)) {
                await setStatus(q.id, { status: "replied", replied_at: conv.last_inbound_at });
                replied++;
                continue;
            }

            // Card criado à mão depois do orçamento também serve.
            const dealId = q.deal_id || conv?.deal_id || null;
            if (!dealId) {
                skippedNoDeal++;
                continue;
            }
            if (!q.deal_id) await setStatus(q.id, { deal_id: dealId });

            if (await hasPendingSuggestion(dealId)) {
                skippedPending++;
                continue;
            }

            const { data: deal } = await supabase
                .from("deals")
                .select("id, title, stage, customer_name, account_name, customer_phone")
                .eq("id", dealId)
                .maybeSingle();
            if (!deal) {
                skippedNoDeal++;
                continue;
            }
            if (CLOSED_STAGES.includes(deal.stage)) {
                await setStatus(q.id, { status: "closed" });
                closedDealDone++;
                continue;
            }

            const contactId = q.contact_id || conv?.contact_id;
            const { data: contact } = contactId
                ? await supabase.from("channel_contacts").select("name, phone_e164").eq("id", contactId).maybeSingle()
                : { data: null };

            const contactName = contact?.name || deal.customer_name || deal.account_name || null;
            const contactPhone = contact?.phone_e164 || deal.customer_phone || null;
            const days = daysBetween(q.sent_at);

            const draft = await callLLM(buildQuotePrompt({
                contactName,
                daysSinceQuote: days,
                amount: q.amount,
                detectedBy: q.detected_by,
                dealTitle: deal.title,
                stage: deal.stage,
            }));
            if (!draft) {
                failedLLM++;
                continue;
            }

            const { data: inserted, error: insertErr } = await supabase
                .from("agent_suggestions")
                .insert({
                    company_id: q.company_id,
                    agent_key: "eva",
                    kind: "followup",
                    deal_id: dealId,
                    conversation_id: q.conversation_id,
                    input_summary: {
                        channel: "whatsapp",
                        trigger: "quote_no_reply",
                        quote_id: q.id,
                        days,
                        reason: `Orçamento enviado há ${days} dia(s) sem resposta`,
                    },
                    suggestion: {
                        channel: "whatsapp",
                        message_text: draft.message_draft,
                        suggestion_text: draft.suggestion_text,
                        contact_name: contactName,
                        contact_phone: contactPhone,
                    },
                    status: "pending",
                })
                .select("id")
                .single();

            if (insertErr || !inserted) {
                console.error("[eva-quote] insert error", insertErr, q.id);
                errors.push(`quote ${q.id}: ${insertErr?.message ?? "sem id"}`);
                continue;
            }

            await setStatus(q.id, { status: "followup_suggested", suggestion_id: inserted.id });
            suggested++;

            try {
                const notify = await notifyPendingSuggestions(supabase, {
                    companyId: q.company_id,
                    suggestionId: inserted.id,
                });
                notified += notify.notified;
            } catch (notifyErr) {
                // O cron eva-approval-notify pega o que ficou pra trás.
                console.error("[eva-quote] notificacao falhou:", (notifyErr as Error)?.message);
            }
        }

        return json(200, {
            ok: true,
            scanned: quotes?.length ?? 0,
            closed_stale: closedRows?.length ?? 0,
            closed_deal_done: closedDealDone,
            replied,
            suggested,
            notified,
            skipped_pending: skippedPending,
            skipped_no_deal: skippedNoDeal,
            failed_llm: failedLLM,
            errors,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[eva-quote] fatal", msg);
        return json(500, { error: msg });
    }
});
