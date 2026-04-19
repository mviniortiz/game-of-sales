// Supabase Edge Function: Cakto Webhook Receiver
// Receives webhook events from Cakto and creates deals in the CRM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cakto-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CaktoEvent =
    | "purchase_approved"
    | "purchase_refunded"
    | "purchase_canceled"
    | "purchase_chargeback";

interface CaktoPayload {
    event: CaktoEvent;
    data: {
        transaction_id?: string;
        order_id?: string;
        customer: { name: string; email: string; phone?: string };
        product: { id?: string; name: string };
        amount: number;
        payment_method?: string;
    };
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
    } catch (error) {
        console.warn("[Cakto Webhook] idempotency unavailable:", error);
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
    } catch (error) {
        console.warn("[Cakto Webhook] mark status warning:", error);
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

    let parsedPayload: CaktoPayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        const receivedToken = req.headers.get("x-cakto-token");
        if (!receivedToken) {
            return new Response(JSON.stringify({ error: "Unauthorized - missing token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload: CaktoPayload = await req.json();
        parsedPayload = payload;

        console.log(`[Cakto Webhook] Received event: ${payload.event}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const txId = payload.data?.transaction_id || payload.data?.order_id || "unknown";
        const eventKey = `${txId}:${payload.event}`;
        parsedEventKey = eventKey;

        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "cakto")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            await supabase.from("webhook_logs").insert({
                platform: "cakto",
                event_type: payload.event,
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

        const idempotency = await claimWebhookEvent(supabase, "cakto", eventKey, {
            event: payload.event,
            transaction_id: txId,
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
            platform: "cakto",
            event_type: payload.event,
            payload: payload,
            status: "processing",
        });

        let dealId: string | null = null;

        switch (payload.event) {
            case "purchase_approved": {
                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${payload.data.product.name} - ${payload.data.customer.name}`,
                        customer_name: payload.data.customer.name,
                        customer_email: payload.data.customer.email,
                        customer_phone: payload.data.customer.phone || null,
                        value: payload.data.amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Venda via Cakto\nTransação: ${txId}\nProduto: ${payload.data.product.name}\nPagamento: ${payload.data.payment_method || "-"}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "cakto",
                        external_id: txId,
                    })
                    .select()
                    .single();

                if (dealError) throw dealError;
                dealId = deal?.id;

                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
                await supabase.from("vendas").insert({
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: payload.data.customer.name,
                    produto_nome: payload.data.product.name,
                    valor: payload.data.amount,
                    plataforma: "Cakto",
                    forma_pagamento: payload.data.payment_method || "Desconhecido",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Cakto (deal ${dealId})\nTransação: ${txId}`,
                    data_venda: dataVenda,
                });
                break;
            }

            case "purchase_refunded":
            case "purchase_canceled":
            case "purchase_chargeback": {
                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", txId)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    const lossReason = payload.event === "purchase_refunded"
                        ? "Reembolso solicitado"
                        : payload.event === "purchase_chargeback"
                            ? "Chargeback"
                            : "Compra cancelada";

                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: `${lossReason} (Cakto)`,
                            notes: `Status atualizado via webhook Cakto\nEvento: ${payload.event}`,
                        })
                        .eq("id", existingDeal.id);

                    dealId = existingDeal.id;
                }
                break;
            }

            default:
                console.log(`[Cakto Webhook] Unhandled event: ${payload.event}`);
        }

        await markWebhookEventStatus(supabase, "cakto", eventKey, "processed", {
            processed_deal_id: dealId,
            event: payload.event,
        });

        return new Response(
            JSON.stringify({ success: true, event: payload.event, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Cakto Webhook] Error:", error);
        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "cakto", parsedEventKey, "failed", { error: errorMessage });
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
