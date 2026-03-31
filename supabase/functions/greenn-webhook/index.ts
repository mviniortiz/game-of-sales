// Supabase Edge Function: Greenn Webhook Receiver
// Receives webhook events from Greenn and creates deals in the CRM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for preflight requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-greenn-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Greenn event types we handle
type GreennEvent =
    | "purchase_approved"
    | "purchase_refunded"
    | "purchase_canceled"
    | "purchase_chargeback";

// Greenn webhook payload structure
interface GreennPayload {
    id: string;
    event: GreennEvent;
    data: {
        transaction_id: string;
        status: string;
        customer: {
            name: string;
            email: string;
            phone: string;
        };
        product: {
            name: string;
            id: string;
        };
        amount: number;
        payment_method: string;
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
        console.warn("[Greenn Webhook] persistent idempotency unavailable:", error);
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
        console.warn("[Greenn Webhook] mark status warning:", error);
    }
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let parsedPayload: GreennPayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        // Get the token header for validation
        const receivedToken = req.headers.get("x-greenn-token");

        if (!receivedToken) {
            console.error("[Greenn Webhook] Missing x-greenn-token header");
            return new Response(JSON.stringify({ error: "Unauthorized - missing token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Parse the webhook payload
        const payload: GreennPayload = await req.json();
        parsedPayload = payload;

        console.log(`[Greenn Webhook] Received event: ${payload.event}`);
        console.log(`[Greenn Webhook] Transaction: ${payload.data?.transaction_id}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const eventKey = `${payload.id || payload.data?.transaction_id || "unknown"}:${payload.event || "unknown"}`;
        parsedEventKey = eventKey;

        // Find the company that has this token configured
        // Greenn uses direct token comparison (not HMAC)
        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "greenn")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            console.error("[Greenn Webhook] Invalid or unknown token");

            // Log the failed attempt
            await supabase.from("webhook_logs").insert({
                platform: "greenn",
                event_type: payload.event,
                payload: payload,
                status: "error",
                error_message: "Invalid token - no matching configuration found",
            });

            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const companyId = config.company_id;
        let userId = config.user_id;

        const idempotency = await claimWebhookEvent(supabase, "greenn", eventKey, {
            event: payload.event,
            transaction_id: payload.data?.transaction_id || null,
            company_id: companyId,
        });
        if (!idempotency.claimed) {
            console.log(`[Greenn Webhook] Duplicate event ignored: ${eventKey}`);
            return new Response(JSON.stringify({ success: true, duplicate: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // If user_id is not set in config, get the first user from the company
        if (!userId) {
            const { data: companyUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", companyId)
                .limit(1)
                .single();

            userId = companyUser?.id;
        }

        // Log the webhook event
        const { error: logError } = await supabase.from("webhook_logs").insert({
            company_id: companyId,
            platform: "greenn",
            event_type: payload.event,
            payload: payload,
            status: "processing",
        });

        if (logError) {
            console.error("[Greenn Webhook] Error logging event:", logError);
        }

        // Process the event based on type
        let dealId: string | null = null;

        switch (payload.event) {
            case "purchase_approved": {
                // Create a new deal in "closed_won" stage
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
                        notes: `Venda via Greenn\nTransação: ${payload.data.transaction_id}\nProduto: ${payload.data.product.name}\nPagamento: ${payload.data.payment_method}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "greenn",
                        external_id: payload.data.transaction_id,
                    })
                    .select()
                    .single();

                if (dealError) {
                    console.error("[Greenn Webhook] Error creating deal:", dealError);
                    throw dealError;
                }

                dealId = deal?.id;
                console.log(`[Greenn Webhook] Created deal: ${dealId}`);

                // ALSO create a Venda record for dashboard/metas sync
                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

                const vendaPayload = {
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: payload.data.customer.name,
                    produto_nome: payload.data.product.name,
                    valor: payload.data.amount,
                    plataforma: "Greenn",
                    forma_pagamento: payload.data.payment_method || "Desconhecido",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Greenn (deal ${dealId})\nTransação: ${payload.data.transaction_id}`,
                    data_venda: dataVenda,
                };

                const { error: vendaError } = await supabase
                    .from("vendas")
                    .insert(vendaPayload);

                if (vendaError) {
                    console.error("[Greenn Webhook] Error creating venda:", vendaError);
                    // Don't throw - deal was created successfully, venda is secondary
                } else {
                    console.log(`[Greenn Webhook] Created venda for deal: ${dealId}`);
                }

                break;
            }

            case "purchase_refunded":
            case "purchase_canceled":
            case "purchase_chargeback": {
                // Find existing deal by transaction ID and mark as lost
                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", payload.data.transaction_id)
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
                            loss_reason: `${lossReason} (Greenn)`,
                            notes: `Status atualizado via webhook Greenn\nEvento: ${payload.event}`,
                        })
                        .eq("id", existingDeal.id);

                    dealId = existingDeal.id;
                    console.log(`[Greenn Webhook] Updated deal to lost: ${dealId}`);
                } else {
                    console.log(`[Greenn Webhook] No existing deal found for transaction: ${payload.data.transaction_id}`);
                }
                break;
            }

            default:
                console.log(`[Greenn Webhook] Unhandled event type: ${payload.event}`);
        }

        // Update log with success
        await supabase
            .from("webhook_logs")
            .update({
                status: "success",
                processed_deal_id: dealId,
            })
            .eq("platform", "greenn")
            .eq("payload->data->transaction_id", payload.data.transaction_id)
            .order("created_at", { ascending: false })
            .limit(1);

        await markWebhookEventStatus(supabase, "greenn", eventKey, "processed", {
            processed_deal_id: dealId,
            event: payload.event,
        });

        return new Response(
            JSON.stringify({
                success: true,
                event: payload.event,
                deal_id: dealId,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("[Greenn Webhook] Error:", error);

        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "greenn", parsedEventKey, "failed", { error: errorMessage });
            }
        } catch {
            // ignore secondary errors
        }

        return new Response(
            JSON.stringify({
                error: "Internal server error",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
