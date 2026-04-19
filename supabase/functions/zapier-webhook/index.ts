// Supabase Edge Function: Zapier (Generic) Webhook Receiver
// Payload schema customizável — normaliza campos comuns do Zapier

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zapier-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Zapier envia payload totalmente customizável. O convention abaixo é o "schema sugerido".
interface ZapierPayload {
    event?: string; // ex: "lead_created", "deal_won", "cancellation"
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    product_name?: string;
    amount?: number;
    payment_method?: string;
    external_id?: string;
    stage?: string; // opcional — se vier, sobrescreve default
    notes?: string;
    source_app?: string; // nome do app de origem: "typeform", "mailchimp", etc
    [k: string]: unknown;
}

async function claimWebhookEvent(supabase: any, provider: string, eventKey: string, metadata: Record<string, unknown>) {
    try {
        const { data, error } = await supabase.rpc("claim_webhook_event", {
            p_provider: provider,
            p_event_key: eventKey,
            p_metadata: metadata,
        });
        if (error) {
            const msg = String(error.message || "").toLowerCase();
            if (msg.includes("claim_webhook_event")) return { enabled: false, claimed: true };
            throw error;
        }
        return { enabled: true, claimed: data === true };
    } catch {
        return { enabled: false, claimed: true };
    }
}

async function markWebhookEventStatus(supabase: any, provider: string, eventKey: string, status: string, metadata: Record<string, unknown> = {}) {
    try {
        await supabase.rpc("mark_webhook_event_status", {
            p_provider: provider,
            p_event_key: eventKey,
            p_status: status,
            p_metadata_patch: metadata,
        });
    } catch {
        // ignore
    }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let parsedPayload: ZapierPayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        const receivedToken = req.headers.get("x-zapier-token");
        if (!receivedToken) {
            return new Response(JSON.stringify({ error: "Unauthorized - missing token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload: ZapierPayload = await req.json();
        parsedPayload = payload;

        const eventName = payload.event || "zapier_event";
        console.log(`[Zapier Webhook] Event: ${eventName}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const txId = payload.external_id || `zap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const eventKey = `${txId}:${eventName}`;
        parsedEventKey = eventKey;

        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "zapier")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            await supabase.from("webhook_logs").insert({
                platform: "zapier",
                event_type: eventName,
                payload: payload,
                status: "error",
                error_message: "Invalid token",
            });
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const companyId = config.company_id;
        let userId = config.user_id;

        const idempotency = await claimWebhookEvent(supabase, "zapier", eventKey, {
            event: eventName,
            external_id: txId,
            source_app: payload.source_app,
            company_id: companyId,
        });
        if (!idempotency.claimed) {
            return new Response(JSON.stringify({ success: true, duplicate: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!userId) {
            const { data: companyUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", companyId)
                .limit(1)
                .single();
            userId = companyUser?.id;
        }

        await supabase.from("webhook_logs").insert({
            company_id: companyId,
            platform: "zapier",
            event_type: eventName,
            payload: payload,
            status: "processing",
        });

        const customerName = payload.customer_name || "Lead via Zapier";
        const customerEmail = payload.customer_email || "";
        const productName = payload.product_name || payload.source_app || "Zapier";
        const amount = typeof payload.amount === "number" ? payload.amount : 0;

        const stageMap: Record<string, { stage: string; probability: number }> = {
            deal_won: { stage: "closed_won", probability: 100 },
            sale_approved: { stage: "closed_won", probability: 100 },
            deal_lost: { stage: "closed_lost", probability: 0 },
            cancellation: { stage: "closed_lost", probability: 0 },
            refund: { stage: "closed_lost", probability: 0 },
        };

        const resolved = payload.stage
            ? { stage: payload.stage, probability: 50 }
            : stageMap[eventName] || { stage: "novo_lead", probability: 25 };

        const { data: deal, error: dealError } = await supabase
            .from("deals")
            .insert({
                title: `${productName} - ${customerName}`,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: payload.customer_phone || null,
                value: amount,
                stage: resolved.stage,
                probability: resolved.probability,
                notes: `Origem Zapier${payload.source_app ? ` · ${payload.source_app}` : ""}\nEvento: ${eventName}\nID externo: ${txId}${payload.notes ? `\n\n${payload.notes}` : ""}`,
                user_id: userId,
                company_id: companyId,
                source: payload.source_app ? `zapier:${payload.source_app}` : "zapier",
                external_id: txId,
            })
            .select()
            .single();

        if (dealError) throw dealError;
        const dealId = deal?.id;

        if (resolved.stage === "closed_won" && amount > 0) {
            const hoje = new Date();
            const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
            await supabase.from("vendas").insert({
                user_id: userId,
                company_id: companyId,
                cliente_nome: customerName,
                produto_nome: productName,
                valor: amount,
                plataforma: payload.source_app ? `Zapier (${payload.source_app})` : "Zapier",
                forma_pagamento: payload.payment_method || "Desconhecido",
                status: "Aprovado",
                observacoes: `Sincronizado via Zapier (deal ${dealId})\nEvento: ${eventName}\nID: ${txId}`,
                data_venda: dataVenda,
            });
        }

        await markWebhookEventStatus(supabase, "zapier", eventKey, "processed", {
            processed_deal_id: dealId,
            event: eventName,
        });

        return new Response(
            JSON.stringify({ success: true, event: eventName, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Zapier Webhook] Error:", error);
        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "zapier", parsedEventKey, "failed", { error: errorMessage });
            }
        } catch {
            // ignore
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
