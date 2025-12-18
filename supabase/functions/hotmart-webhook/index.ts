// Supabase Edge Function: Hotmart Webhook Receiver
// Receives webhook events from Hotmart and creates deals in the CRM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for preflight requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hotmart-hottok",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Hotmart event types we handle
type HotmartEvent =
    | "PURCHASE_APPROVED"
    | "PURCHASE_COMPLETE"
    | "PURCHASE_CANCELED"
    | "PURCHASE_REFUNDED"
    | "PURCHASE_BILLET_PRINTED"
    | "PURCHASE_DELAYED"
    | "PURCHASE_CHARGEBACK";

// Hotmart webhook payload structure (simplified)
interface HotmartPayload {
    event: HotmartEvent;
    version: string;
    id: string;
    creation_date: number;
    data: {
        buyer: {
            name: string;
            email: string;
            checkout_phone?: string;
        };
        purchase: {
            transaction: string;
            order_date: number;
            approved_date?: number;
            status: string;
            price: {
                value: number;
                currency_code: string;
            };
            payment: {
                type: string;
                installments_number?: number;
            };
        };
        product: {
            id: number;
            name: string;
            ucode: string;
        };
        producer?: {
            name: string;
        };
        commissions?: Array<{
            value: number;
            source: string;
        }>;
    };
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

    try {
        // Get the HOTTOK from header for validation
        const receivedHottok = req.headers.get("x-hotmart-hottok");

        // Parse the webhook payload
        const payload: HotmartPayload = await req.json();

        console.log(`[Hotmart Webhook] Received event: ${payload.event}`);
        console.log(`[Hotmart Webhook] Transaction: ${payload.data?.purchase?.transaction}`);

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find the company that has this HOTTOK configured
        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "hotmart")
            .eq("hottok", receivedHottok)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            console.error("[Hotmart Webhook] Invalid or unknown HOTTOK");

            // Log the failed attempt
            await supabase.from("webhook_logs").insert({
                platform: "hotmart",
                event_type: payload.event,
                payload: payload,
                status: "error",
                error_message: "Invalid HOTTOK - no matching configuration found",
            });

            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const companyId = config.company_id;
        let userId = config.user_id;

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
            platform: "hotmart",
            event_type: payload.event,
            payload: payload,
            status: "processing",
        });

        if (logError) {
            console.error("[Hotmart Webhook] Error logging event:", logError);
        }

        // Process the event based on type
        let dealId: string | null = null;

        switch (payload.event) {
            case "PURCHASE_APPROVED":
            case "PURCHASE_COMPLETE": {
                // Create a new deal in "closed_won" stage
                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${payload.data.product.name} - ${payload.data.buyer.name}`,
                        customer_name: payload.data.buyer.name,
                        customer_email: payload.data.buyer.email,
                        customer_phone: payload.data.buyer.checkout_phone || null,
                        value: payload.data.purchase.price.value,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Venda via Hotmart\nTransação: ${payload.data.purchase.transaction}\nProduto: ${payload.data.product.name}\nPagamento: ${payload.data.purchase.payment.type}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "hotmart",
                        external_id: payload.data.purchase.transaction,
                    })
                    .select()
                    .single();

                if (dealError) {
                    console.error("[Hotmart Webhook] Error creating deal:", dealError);
                    throw dealError;
                }

                dealId = deal?.id;
                console.log(`[Hotmart Webhook] Created deal: ${dealId}`);

                // ALSO create a Venda record for dashboard/metas sync
                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

                const vendaPayload = {
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: payload.data.buyer.name,
                    produto_nome: payload.data.product.name,
                    valor: payload.data.purchase.price.value,
                    plataforma: "Hotmart",
                    forma_pagamento: payload.data.purchase.payment.type || "Desconhecido",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Hotmart (deal ${dealId})\nTransação: ${payload.data.purchase.transaction}`,
                    data_venda: dataVenda,
                };

                const { error: vendaError } = await supabase
                    .from("vendas")
                    .insert(vendaPayload);

                if (vendaError) {
                    console.error("[Hotmart Webhook] Error creating venda:", vendaError);
                    // Don't throw - deal was created successfully, venda is secondary
                } else {
                    console.log(`[Hotmart Webhook] Created venda for deal: ${dealId}`);
                }

                break;
            }

            case "PURCHASE_REFUNDED":
            case "PURCHASE_CANCELED":
            case "PURCHASE_CHARGEBACK": {
                // Find existing deal by transaction ID and mark as lost
                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", payload.data.purchase.transaction)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    const lossReason = payload.event === "PURCHASE_REFUNDED"
                        ? "Reembolso solicitado"
                        : payload.event === "PURCHASE_CHARGEBACK"
                            ? "Chargeback"
                            : "Compra cancelada";

                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: `${lossReason} (Hotmart)`,
                            notes: `Status atualizado via webhook Hotmart\nEvento: ${payload.event}`,
                        })
                        .eq("id", existingDeal.id);

                    dealId = existingDeal.id;
                    console.log(`[Hotmart Webhook] Updated deal to lost: ${dealId}`);
                } else {
                    console.log(`[Hotmart Webhook] No existing deal found for transaction: ${payload.data.purchase.transaction}`);
                }
                break;
            }

            default:
                console.log(`[Hotmart Webhook] Unhandled event type: ${payload.event}`);
        }

        // Update log with success
        await supabase
            .from("webhook_logs")
            .update({
                status: "success",
                processed_deal_id: dealId,
            })
            .eq("platform", "hotmart")
            .eq("payload->data->purchase->transaction", payload.data.purchase.transaction)
            .order("created_at", { ascending: false })
            .limit(1);

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
        console.error("[Hotmart Webhook] Error:", error);

        return new Response(
            JSON.stringify({
                error: "Internal server error",
                message: error.message,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
