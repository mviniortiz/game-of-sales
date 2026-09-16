// eva-stale-deal-followup
// Cron-triggered edge function (a cada 6h via pg_cron).
// Escaneia deals parados em todos os tenants, gera sugestões de follow-up
// com Claude Haiku (_shared/followupDraft.ts) e grava em agent_suggestions
// kind='followup' (UNIFY.1, 2026-08-24: antes escrevia em eva_deal_suggestions,
// uma fila paralela que não passava pela aprovação por WhatsApp).
//
// Invocação:
//   1. Automática via pg_cron (production)
//   2. Manual POST { company_id?, force? } pra debug

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPendingSuggestions } from "../_shared/whatsappApproval.ts";
import {
    buildPrompt,
    buildSlaContext,
    callLLM,
    daysBetween,
    type FollowupDeal,
} from "../_shared/followupDraft.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Shared secret entre pg_cron e esta função. Sem isso, qualquer um na internet
// poderia invocar a função drenando créditos LLM. Configurado via:
//   npx supabase secrets set EVA_CRON_SECRET=<random>
//   + mesmo valor armazenado em vault.secrets name='eva_cron_secret' pro cron ler.
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Configs
const STALE_DAYS_DEFAULT = 3;        // deal sem update há 3+ dias
const MAX_DEALS_PER_RUN = 40;        // cap por execução pra não explodir
const SKIP_STAGES = ["Ganho", "Perdido", "ganho", "perdido", "won", "lost"];

type Deal = FollowupDeal;

async function fetchStaleDeals(filterCompanyId?: string): Promise<Deal[]> {
    const cutoff = new Date(Date.now() - STALE_DAYS_DEFAULT * 86400000).toISOString();

    let query = supabase
        .from("deals")
        .select(
            "id, company_id, title, value, customer_name, customer_email, customer_phone, account_name, additional_contacts, stage, sdr_id, closer_id, handoff_at, sla_breach_at, updated_at, notes, lead_source"
        )
        .lt("updated_at", cutoff)
        .not("stage", "in", `(${SKIP_STAGES.map((s) => `"${s}"`).join(",")})`)
        .order("updated_at", { ascending: true })
        .limit(MAX_DEALS_PER_RUN);

    if (filterCompanyId) {
        query = query.eq("company_id", filterCompanyId);
    }

    const { data, error } = await query;
    if (error) {
        console.error("[eva-stale] fetchStaleDeals error:", error);
        return [];
    }
    return (data || []) as Deal[];
}

// UNIFY.1: a fila é agent_suggestions. Antes esta checagem olhava
// eva_deal_suggestions, onde nada era resolvido: as 59 linhas ficaram 'pending'
// para sempre e este dedup travou a geração de qualquer follow-up novo desde
// 10/07/2026. Agora rascunho pendente expira em 48h, então o dedup destrava
// sozinho.
async function hasPendingSuggestion(dealId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from("agent_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", dealId)
        .eq("status", "pending")
        .in("kind", ["followup", "outbound_message", "objection", "proposal"]);
    if (error) return false;
    return (count ?? 0) > 0;
}

async function enrichDealContext(deal: Deal): Promise<Deal> {
    // Última nota e última atividade pra enriquecer prompt
    try {
        const [{ data: note }, { data: activity }] = await Promise.all([
            supabase
                .from("deal_notes")
                .select("content")
                .eq("deal_id", deal.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from("deal_activities")
                .select("description")
                .eq("deal_id", deal.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);
        deal.last_note_content = note?.content ?? null;
        deal.last_activity_description = activity?.description ?? null;
    } catch (e) {
        console.error("[eva-stale] enrich error", e);
    }
    return deal;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    // Autenticação: exige x-cron-secret header válido OU Authorization Bearer
    // com service_role_key (pra invocação manual em debug).
    const providedCronSecret = req.headers.get("x-cron-secret");
    const providedAuth = req.headers.get("authorization") || "";
    const providedBearer = providedAuth.toLowerCase().startsWith("bearer ")
        ? providedAuth.slice(7).trim()
        : "";

    const cronSecretValid = EVA_CRON_SECRET && providedCronSecret === EVA_CRON_SECRET;
    const serviceRoleValid = providedBearer && providedBearer === SERVICE_ROLE_KEY;

    if (!cronSecretValid && !serviceRoleValid) {
        return new Response(
            JSON.stringify({ error: "unauthorized — requires x-cron-secret header or service_role bearer" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    let filterCompanyId: string | undefined;
    let force = false;

    try {
        if (req.method === "POST") {
            const body = await req.json().catch(() => ({}));
            filterCompanyId = body.company_id;
            force = Boolean(body.force);
        }

        const stale = await fetchStaleDeals(filterCompanyId);
        console.log(`[eva-stale] found ${stale.length} stale deals`);

        let processed = 0;
        let skippedExisting = 0;
        let failedLLM = 0;
        const errors: string[] = [];

        for (const deal of stale) {
            // Skip se já tem sugestão pending (a não ser que force=true)
            if (!force && (await hasPendingSuggestion(deal.id))) {
                skippedExisting++;
                continue;
            }

            const enriched = await enrichDealContext(deal);
            const prompt = buildPrompt(enriched);
            const result = await callLLM(prompt);

            if (!result) {
                failedLLM++;
                continue;
            }

            const daysStale = daysBetween(deal.updated_at);
            const slaContext = buildSlaContext(deal);

            // UNIFY.1: mesmo shape do que o eva-agent-loop grava, para o
            // rascunho entrar na fila única e ir pro WhatsApp do dono.
            const { error: insertErr } = await supabase.from("agent_suggestions").insert({
                company_id: deal.company_id,
                agent_key: "eva",
                kind: "followup",
                deal_id: deal.id,
                input_summary: {
                    channel: "whatsapp",
                    trigger: "stale_deal",
                    stage: deal.stage,
                    reason: `Deal parado há ${daysStale} dia(s) no estágio ${deal.stage}`,
                    days_stale: daysStale,
                    sla_context: slaContext,
                },
                suggestion: {
                    channel: "whatsapp",
                    message_text: result.message_draft,
                    suggestion_text: result.suggestion_text,
                    contact_name: deal.customer_name ?? deal.account_name ?? null,
                    contact_phone: deal.customer_phone ?? null,
                    contact_email: deal.customer_email ?? null,
                },
                status: "pending",
            });

            if (insertErr) {
                console.error("[eva-stale] insert error", insertErr, deal.id);
                errors.push(`deal ${deal.id}: ${insertErr.message}`);
                continue;
            }

            processed++;
        }

        // UNIFY.1 — leva os rascunhos novos pro WhatsApp do dono. Uma chamada
        // no fim, não uma por deal: o gargalo é a Evolution, não o banco.
        let notified = 0;
        if (processed > 0) {
            try {
                const notify = await notifyPendingSuggestions(supabase, {
                    companyId: filterCompanyId ?? null,
                    limit: processed,
                });
                notified = notify.notified;
            } catch (notifyErr) {
                console.error("[eva-stale] notificacao falhou:", (notifyErr as Error)?.message);
            }
        }

        return new Response(
            JSON.stringify({
                ok: true,
                scanned: stale.length,
                processed,
                notified,
                skipped_existing: skippedExisting,
                failed_llm: failedLLM,
                errors,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[eva-stale] fatal", msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
