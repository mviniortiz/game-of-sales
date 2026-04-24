// eva-stale-deal-followup
// Cron-triggered edge function (a cada 6h via pg_cron).
// Escaneia deals parados em todos os tenants, gera sugestões de follow-up
// com Claude Haiku e insere em eva_deal_suggestions.
//
// Invocação:
//   1. Automática via pg_cron (production)
//   2. Manual POST { company_id?, force? } pra debug

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

type Deal = {
    id: string;
    company_id: string;
    title: string;
    value: number | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    account_name: string | null;
    additional_contacts: Array<{ name?: string; email?: string; phone?: string; role?: string }>;
    stage: string;
    sdr_id: string | null;
    closer_id: string | null;
    handoff_at: string | null;
    sla_breach_at: string | null;
    updated_at: string;
    notes: string | null;
    lead_source: string | null;
    last_note_content?: string | null;
    last_activity_description?: string | null;
};

function daysBetween(from: string, to: Date = new Date()): number {
    return Math.floor((to.getTime() - new Date(from).getTime()) / 86400000);
}

function buildSlaContext(deal: Deal): string | null {
    if (!deal.sla_breach_at) return null;
    const now = Date.now();
    const breach = new Date(deal.sla_breach_at).getTime();
    const hoursRemaining = (breach - now) / 3600000;
    if (hoursRemaining < 0) {
        return `SLA VENCIDO há ${Math.abs(Math.round(hoursRemaining))}h`;
    }
    if (hoursRemaining < 12) {
        return `SLA vencendo em ${Math.round(hoursRemaining)}h (urgente)`;
    }
    if (hoursRemaining < 48) {
        return `SLA vencendo em ${Math.round(hoursRemaining)}h`;
    }
    return null;
}

function buildPrompt(deal: Deal): { system: string; user: string } {
    const daysStale = daysBetween(deal.updated_at);
    const sla = buildSlaContext(deal);
    const valueBRL = deal.value
        ? `R$ ${Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : "valor não definido";

    const stakeholders = (deal.additional_contacts || [])
        .filter((c) => c?.name || c?.email)
        .map((c) => `${c.name ?? "?"}${c.role ? ` (${c.role})` : ""}`)
        .join(", ");

    const contactName = deal.customer_name || deal.account_name || "cliente";
    const firstName = contactName.split(" ")[0];

    const system = `Você é Eva, SDR/assistente comercial brasileira do CRM Vyzon. Sua missão: gerar uma sugestão de follow-up no WhatsApp para um deal parado. Tom brasileiro de vender: direto, curto, humano, zero corporativês. Máximo 3 parágrafos curtos. Sempre em pt-BR.

REGRAS:
- Nunca inventar informação que não está no contexto
- Chamar pelo primeiro nome do contato
- Começar com contexto leve ("passando pra retomar", "fiquei pensando no nosso papo")
- Fechar com UMA pergunta ou CTA claro
- Se SLA vencido, tom de urgência discreta (não apavorar)
- Sem emojis
- Sem "tudo bem?" ou "espero que esteja bem" (clichê)`;

    const user = `DEAL PARADO PRECISANDO FOLLOW-UP:

Título: ${deal.title}
Conta/Empresa: ${deal.account_name || "—"}
Contato principal: ${contactName}
Valor: ${valueBRL}
Estágio atual: ${deal.stage}
Origem: ${deal.lead_source || "—"}
${stakeholders ? `Stakeholders: ${stakeholders}` : ""}
${sla ? `⚠️ ${sla}` : ""}

Dias sem atualização: ${daysStale}
Último update: ${deal.updated_at}
${deal.notes ? `Notas do deal: ${deal.notes.slice(0, 400)}` : ""}
${deal.last_note_content ? `Última nota: ${deal.last_note_content.slice(0, 300)}` : ""}
${deal.last_activity_description ? `Última atividade: ${deal.last_activity_description.slice(0, 200)}` : ""}

Gere JSON com esta estrutura exata:
{
  "suggestion_text": "Uma linha resumindo por que esse follow-up agora (20-30 palavras)",
  "message_draft": "Mensagem de WhatsApp pronta pro ${firstName}, tom brasileiro de vender, 2-3 parágrafos curtos, termina com CTA claro"
}

Retorne APENAS o JSON, nada fora dele.`;

    return { system, user };
}

// Provider dispatch: Claude Haiku se tiver ANTHROPIC_API_KEY, senão OpenAI gpt-4o-mini
async function callLLM(prompt: { system: string; user: string }): Promise<{ suggestion_text: string; message_draft: string } | null> {
    if (ANTHROPIC_API_KEY) {
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-haiku-4-5-20251001",
                    max_tokens: 800,
                    system: prompt.system,
                    messages: [{ role: "user", content: prompt.user }],
                }),
            });
            if (!res.ok) {
                console.error("[eva-stale] anthropic error", res.status, await res.text());
                return null;
            }
            const data = await res.json();
            const text = data?.content?.[0]?.text ?? "";
            return extractJson(text);
        } catch (e) {
            console.error("[eva-stale] anthropic threw", e);
            return null;
        }
    }
    if (OPENAI_API_KEY) {
        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: prompt.system },
                        { role: "user", content: prompt.user },
                    ],
                    response_format: { type: "json_object" },
                    max_completion_tokens: 800,
                }),
            });
            if (!res.ok) {
                console.error("[eva-stale] openai error", res.status, await res.text());
                return null;
            }
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content ?? "";
            return extractJson(text);
        } catch (e) {
            console.error("[eva-stale] openai threw", e);
            return null;
        }
    }
    console.error("[eva-stale] no LLM key configured");
    return null;
}

function extractJson(text: string): { suggestion_text: string; message_draft: string } | null {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        const raw = match ? match[0] : text;
        const parsed = JSON.parse(raw);
        if (typeof parsed.suggestion_text === "string" && typeof parsed.message_draft === "string") {
            return {
                suggestion_text: parsed.suggestion_text.trim(),
                message_draft: parsed.message_draft.trim(),
            };
        }
    } catch {}
    return null;
}

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

async function hasPendingSuggestion(dealId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from("eva_deal_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", dealId)
        .eq("status", "pending");
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

            const { error: insertErr } = await supabase.from("eva_deal_suggestions").insert({
                deal_id: deal.id,
                company_id: deal.company_id,
                suggestion_text: result.suggestion_text,
                message_draft: result.message_draft,
                reason: `Deal parado há ${daysStale} dia(s) no estágio ${deal.stage}`,
                days_stale: daysStale,
                sla_context: slaContext,
                status: "pending",
            });

            if (insertErr) {
                console.error("[eva-stale] insert error", insertErr, deal.id);
                errors.push(`deal ${deal.id}: ${insertErr.message}`);
                continue;
            }

            processed++;
        }

        return new Response(
            JSON.stringify({
                ok: true,
                scanned: stale.length,
                processed,
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
