// eva-quote-followup (QUOTE.1, 2026-09-16; regras QUOTE.3, 2026-09-29) — "orçamento que some".
// Cron a cada 30 min (eva-quote-followup-every-30m). O estado de cada orçamento
// vem da view quote_tracking_live (quem falou por último na conversa), e a fila
// da rodada vem da quote_followup_candidates:
//   - no_reply: cliente nunca respondeu; uma retomada, 2 dias depois da última
//     mensagem da empresa → 'followup_suggested'
//   - went_quiet: cliente respondeu e parou há 3+ dias; uma retomada por
//     silêncio, escrita a partir das últimas mensagens (last_draft_at)
//   - 30 dias sem o cliente escrever → 'closed' (expired), via quote_tracking_expire
// Só rascunha. O envio pro lead depende do dono aprovar no WhatsApp.
//
// Invocação:
//   1. Automática via pg_cron (production)
//   2. Manual POST { company_id? } com service_role bearer pra debug

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPendingSuggestions } from "../_shared/whatsappApproval.ts";
import { buildQuietQuotePrompt, buildQuotePrompt, callLLM, daysBetween } from "../_shared/followupDraft.ts";

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

const EXPIRE_AFTER_DAYS = 30;
const MAX_QUOTES_PER_RUN = 40;
const RECENT_MESSAGES = 8;
const CLOSED_STAGES = ["closed_won", "closed_lost", "Ganho", "Perdido", "ganho", "perdido", "won", "lost"];

type Candidate = {
    id: string;
    company_id: string;
    conversation_id: string;
    contact_id: string | null;
    deal_id: string | null;
    amount: number | null;
    detected_by: "pdf" | "text";
    sent_at: string;
    state: "no_reply" | "went_quiet";
    client_at: string | null;
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

async function setQuote(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from("quote_tracking").update(patch).eq("id", id);
    if (error) console.error("[eva-quote] update falhou", id, error.message);
}

async function recentMessages(conversationId: string) {
    const { data } = await supabase
        .from("channel_messages")
        .select("direction, body, message_type")
        .eq("conversation_id", conversationId)
        .neq("message_type", "reaction")
        .order("message_timestamp", { ascending: false })
        .limit(RECENT_MESSAGES);
    return ((data || []) as Array<{ direction: string; body: string | null; message_type: string }>)
        .reverse()
        .map((m) => ({
            from: (m.direction === "inbound" ? "cliente" : "empresa") as "cliente" | "empresa",
            text: (m.body?.trim() || `[${m.message_type}]`).slice(0, 400),
        }));
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

        const { data: expired, error: expireErr } = await supabase.rpc("quote_tracking_expire", { p_days: EXPIRE_AFTER_DAYS });
        if (expireErr) console.error("[eva-quote] vencimento falhou", expireErr.message);

        let query = supabase.rpc("quote_followup_candidates", { p_limit: 500 });
        if (filterCompanyId) query = query.eq("company_id", filterCompanyId);
        const { data: quotes, error } = await query.limit(MAX_QUOTES_PER_RUN);
        if (error) throw new Error(`leitura da fila de retomada falhou: ${error.message}`);

        let suggestedNoReply = 0;
        let suggestedQuiet = 0;
        let notified = 0;
        let closedDealDone = 0;
        let skippedPending = 0;
        let skippedNoDeal = 0;
        let failedLLM = 0;
        const errors: string[] = [];

        for (const q of (quotes || []) as Candidate[]) {
            const { data: conv } = await supabase
                .from("channel_conversations")
                .select("deal_id, contact_id")
                .eq("id", q.conversation_id)
                .maybeSingle();

            // Card criado à mão depois do orçamento também serve.
            const dealId = q.deal_id || conv?.deal_id || null;
            if (!dealId) {
                skippedNoDeal++;
                continue;
            }
            if (!q.deal_id) await setQuote(q.id, { deal_id: dealId });

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
                await setQuote(q.id, { status: "closed", closed_reason: "deal_closed" });
                closedDealDone++;
                continue;
            }

            const contactId = q.contact_id || conv?.contact_id;
            const { data: contact } = contactId
                ? await supabase.from("channel_contacts").select("name, phone_e164").eq("id", contactId).maybeSingle()
                : { data: null };

            const contactName = contact?.name || deal.customer_name || deal.account_name || null;
            const contactPhone = contact?.phone_e164 || deal.customer_phone || null;
            const quiet = q.state === "went_quiet" && !!q.client_at;
            const days = daysBetween(quiet ? q.client_at! : q.sent_at);
            const plural = days === 1 ? "dia" : "dias";

            const draft = await callLLM(
                quiet
                    ? buildQuietQuotePrompt({
                        contactName,
                        daysSinceClient: days,
                        amount: q.amount,
                        dealTitle: deal.title,
                        recent: await recentMessages(q.conversation_id),
                    })
                    : buildQuotePrompt({
                        contactName,
                        daysSinceQuote: days,
                        amount: q.amount,
                        detectedBy: q.detected_by,
                        dealTitle: deal.title,
                        stage: deal.stage,
                    }),
            );
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
                        trigger: quiet ? "quote_went_quiet" : "quote_no_reply",
                        quote_id: q.id,
                        days,
                        reason: quiet
                            ? `Respondeu ao orçamento e está há ${days} ${plural} sem falar`
                            : `Orçamento enviado há ${days} ${plural} sem resposta`,
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

            const draftedAt = new Date().toISOString();
            await setQuote(
                q.id,
                quiet
                    ? { suggestion_id: inserted.id, last_draft_at: draftedAt }
                    : { status: "followup_suggested", suggestion_id: inserted.id, last_draft_at: draftedAt },
            );
            if (quiet) suggestedQuiet++;
            else suggestedNoReply++;

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
            expired: expired ?? 0,
            scanned: quotes?.length ?? 0,
            suggested_no_reply: suggestedNoReply,
            suggested_went_quiet: suggestedQuiet,
            notified,
            closed_deal_done: closedDealDone,
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
