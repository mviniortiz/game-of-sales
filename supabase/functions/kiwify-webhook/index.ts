// Supabase Edge Function: Kiwify Webhook Receiver
// Receives webhook events from Kiwify and creates deals in the CRM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// CORS headers for preflight requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Kiwify event types we handle
type KiwifyEvent =
    | "order_approved"
    | "order_refunded"
    | "order_chargedback"
    | "subscription_created"
    | "subscription_canceled";

// Kiwify webhook payload structure
interface KiwifyPayload {
    order_id: string;
    order_status: KiwifyEvent;
    product: {
        id: string;
        name: string;
    };
    customer: {
        name: string;
        email: string;
        mobile: string;
    };
    payment: {
        total: number;
        method: string;
    };
    created_at: string;
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
        console.warn("[Kiwify Webhook] persistent idempotency unavailable:", error);
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
        console.warn("[Kiwify Webhook] mark status warning:", error);
    }
}

function verifyKiwifySignature(body: string, signature: string, secret: string): boolean {
    try {
        const hmac = createHmac("sha256", secret);
        hmac.update(body);
        const computed = hmac.digest("hex");
        return computed === signature;
    } catch {
        return false;
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

    let parsedPayload: KiwifyPayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        // Get the signature header for validation
        const receivedSignature = req.headers.get("x-kiwify-signature");

        if (!receivedSignature) {
            console.error("[Kiwify Webhook] Missing x-kiwify-signature header");
            return new Response(JSON.stringify({ error: "Unauthorized - missing signature" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Read raw body for signature verification
        const rawBody = await req.text();

        // Parse the webhook payload
        const payload: KiwifyPayload = JSON.parse(rawBody);
        parsedPayload = payload;

        console.log(`[Kiwify Webhook] Received event: ${payload.order_status}`);
        console.log(`[Kiwify Webhook] Order ID: ${payload.order_id}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const eventKey = `${payload.order_id || "unknown"}:${payload.order_status || "unknown"}`;
        parsedEventKey = eventKey;

        // Find the company that has a matching Kiwify secret configured
        // We need to check all active kiwify configs and verify the signature against each
        const { data: configs, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "kiwify")
            .eq("is_active", true);

        if (configError || !configs || configs.length === 0) {
            console.error("[Kiwify Webhook] No active Kiwify configurations found");

            await supabase.from("webhook_logs").insert({
                platform: "kiwify",
                event_type: payload.order_status,
                payload: payload,
                status: "error",
                error_message: "No active Kiwify configuration found",
            });

            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Find the config whose secret matches the HMAC signature
        let matchedConfig: any = null;
        for (const config of configs) {
            const secret = config.hottok; // reusing hottok column for Kiwify secret
            if (secret && verifyKiwifySignature(rawBody, receivedSignature, secret)) {
                matchedConfig = config;
                break;
            }
        }

        if (!matchedConfig) {
            console.error("[Kiwify Webhook] Invalid signature - no matching configuration");

            await supabase.from("webhook_logs").insert({
                platform: "kiwify",
                event_type: payload.order_status,
                payload: payload,
                status: "error",
                error_message: "Invalid signature - no matching Kiwify configuration found",
            });

            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const companyId = matchedConfig.company_id;
        let userId = matchedConfig.user_id;

        const idempotency = await claimWebhookEvent(supabase, "kiwify", eventKey, {
            event: payload.order_status,
            order_id: payload.order_id || null,
            company_id: companyId,
        });
        if (!idempotency.claimed) {
            console.log(`[Kiwify Webhook] Duplicate event ignored: ${eventKey}`);
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
            platform: "kiwify",
            event_type: payload.order_status,
            payload: payload,
            status: "processing",
        });

        if (logError) {
            console.error("[Kiwify Webhook] Error logging event:", logError);
        }

        // Process the event based on type
        let dealId: string | null = null;

        switch (payload.order_status) {
            case "order_approved":
            case "subscription_created": {
                // Create a new deal in "closed_won" stage
                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${payload.product.name} - ${payload.customer.name}`,
                        customer_name: payload.customer.name,
                        customer_email: payload.customer.email,
                        customer_phone: payload.customer.mobile || null,
                        value: payload.payment.total,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Venda via Kiwify\nPedido: ${payload.order_id}\nProduto: ${payload.product.name}\nPagamento: ${payload.payment.method}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "kiwify",
                        external_id: payload.order_id,
                    })
                    .select()
                    .single();

                if (dealError) {
                    console.error("[Kiwify Webhook] Error creating deal:", dealError);
                    throw dealError;
                }

                dealId = deal?.id;
                console.log(`[Kiwify Webhook] Created deal: ${dealId}`);

                // ALSO create a Venda record for dashboard/metas sync
                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

                const vendaPayload = {
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: payload.customer.name,
                    produto_nome: payload.product.name,
                    valor: payload.payment.total,
                    plataforma: "Kiwify",
                    forma_pagamento: payload.payment.method || "Desconhecido",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Kiwify (deal ${dealId})\nPedido: ${payload.order_id}`,
                    data_venda: dataVenda,
                };

                const { error: vendaError } = await supabase
                    .from("vendas")
                    .insert(vendaPayload);

                if (vendaError) {
                    console.error("[Kiwify Webhook] Error creating venda:", vendaError);
                    // Don't throw - deal was created successfully, venda is secondary
                } else {
                    console.log(`[Kiwify Webhook] Created venda for deal: ${dealId}`);
                }

                break;
            }

            case "order_refunded":
            case "order_chargedback":
            case "subscription_canceled": {
                // Find existing deal by order ID and mark as lost
                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", payload.order_id)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    const lossReason = payload.order_status === "order_refunded"
                        ? "Reembolso solicitado"
                        : payload.order_status === "order_chargedback"
                            ? "Chargeback"
                            : "Assinatura cancelada";

                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: `${lossReason} (Kiwify)`,
                            notes: `Status atualizado via webhook Kiwify\nEvento: ${payload.order_status}`,
                        })
                        .eq("id", existingDeal.id);

                    dealId = existingDeal.id;
                    console.log(`[Kiwify Webhook] Updated deal to lost: ${dealId}`);
                } else {
                    console.log(`[Kiwify Webhook] No existing deal found for order: ${payload.order_id}`);
                }
                break;
            }

            default:
                console.log(`[Kiwify Webhook] Unhandled event type: ${payload.order_status}`);
        }

        // Update log with success
        await supabase
            .from("webhook_logs")
            .update({
                status: "success",
                processed_deal_id: dealId,
            })
            .eq("platform", "kiwify")
            .eq("payload->order_id", payload.order_id)
            .order("created_at", { ascending: false })
            .limit(1);

        await markWebhookEventStatus(supabase, "kiwify", eventKey, "processed", {
            processed_deal_id: dealId,
            event: payload.order_status,
        });

        return new Response(
            JSON.stringify({
                success: true,
                event: payload.order_status,
                deal_id: dealId,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("[Kiwify Webhook] Error:", error);

        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "kiwify", parsedEventKey, "failed", { error: errorMessage });
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
