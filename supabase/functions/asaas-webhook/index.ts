// Supabase Edge Function: Asaas Webhook Receiver

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AsaasEvent =
    | "PAYMENT_CREATED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_RECEIVED"
    | "PAYMENT_OVERDUE"
    | "PAYMENT_DELETED"
    | "PAYMENT_REFUNDED"
    | "PAYMENT_CHARGEBACK_REQUESTED";

interface AsaasPayload {
    id: string;
    event: AsaasEvent;
    dateCreated?: string;
    payment: {
        id: string;
        customer: string;
        value: number;
        netValue?: number;
        billingType?: string;
        status: string;
        description?: string;
        externalReference?: string;
        invoiceUrl?: string;
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

async function fetchCustomerInfo(token: string, customerId: string) {
    try {
        const res = await fetch(`https://api.asaas.com/v3/customers/${customerId}`, {
            headers: { access_token: token },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
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

    let parsedPayload: AsaasPayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        const receivedToken = req.headers.get("asaas-access-token");
        if (!receivedToken) {
            return new Response(JSON.stringify({ error: "Unauthorized - missing token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload: AsaasPayload = await req.json();
        parsedPayload = payload;

        console.log(`[Asaas Webhook] Event: ${payload.event}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const txId = payload.payment?.id || payload.id || "unknown";
        const eventKey = `${txId}:${payload.event}`;
        parsedEventKey = eventKey;

        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "asaas")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            await supabase.from("webhook_logs").insert({
                platform: "asaas",
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

        const idempotency = await claimWebhookEvent(supabase, "asaas", eventKey, {
            event: payload.event,
            payment_id: txId,
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
            platform: "asaas",
            event_type: payload.event,
            payload: payload,
            status: "processing",
        });

        let dealId: string | null = null;
        const customer = await fetchCustomerInfo(receivedToken, payload.payment.customer);
        const customerName = customer?.name || "Cliente Asaas";
        const customerEmail = customer?.email || "";
        const customerPhone = customer?.mobilePhone || customer?.phone || null;

        switch (payload.event) {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED": {
                const amount = payload.payment.value || 0;
                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${payload.payment.description || "Cobrança Asaas"} - ${customerName}`,
                        customer_name: customerName,
                        customer_email: customerEmail,
                        customer_phone: customerPhone,
                        value: amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Pagamento via Asaas\nCobrança: ${txId}\nTipo: ${payload.payment.billingType || "-"}\nNet: R$ ${payload.payment.netValue ?? amount}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "asaas",
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
                    cliente_nome: customerName,
                    produto_nome: payload.payment.description || "Cobrança Asaas",
                    valor: amount,
                    plataforma: "Asaas",
                    forma_pagamento: payload.payment.billingType || "Desconhecido",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Asaas (deal ${dealId})\nCobrança: ${txId}`,
                    data_venda: dataVenda,
                });
                break;
            }

            case "PAYMENT_CREATED": {
                const { data: deal } = await supabase
                    .from("deals")
                    .insert({
                        title: `[Aguardando] ${payload.payment.description || "Cobrança"} - ${customerName}`,
                        customer_name: customerName,
                        customer_email: customerEmail,
                        customer_phone: customerPhone,
                        value: payload.payment.value,
                        stage: "em_negociacao",
                        probability: 50,
                        notes: `Cobrança gerada via Asaas\nCobrança: ${txId}\nTipo: ${payload.payment.billingType || "-"}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "asaas",
                        external_id: txId,
                    })
                    .select()
                    .single();
                dealId = deal?.id;
                break;
            }

            case "PAYMENT_REFUNDED":
            case "PAYMENT_DELETED":
            case "PAYMENT_CHARGEBACK_REQUESTED":
            case "PAYMENT_OVERDUE": {
                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", txId)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    const lossReason = payload.event === "PAYMENT_REFUNDED"
                        ? "Reembolso solicitado"
                        : payload.event === "PAYMENT_CHARGEBACK_REQUESTED"
                            ? "Chargeback"
                            : payload.event === "PAYMENT_OVERDUE"
                                ? "Cobrança vencida"
                                : "Cobrança deletada";

                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: `${lossReason} (Asaas)`,
                            notes: `Status atualizado via webhook Asaas\nEvento: ${payload.event}`,
                        })
                        .eq("id", existingDeal.id);
                    dealId = existingDeal.id;
                }
                break;
            }

            default:
                console.log(`[Asaas Webhook] Unhandled: ${payload.event}`);
        }

        await markWebhookEventStatus(supabase, "asaas", eventKey, "processed", {
            processed_deal_id: dealId,
            event: payload.event,
        });

        return new Response(
            JSON.stringify({ success: true, event: payload.event, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Asaas Webhook] Error:", error);
        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "asaas", parsedEventKey, "failed", { error: errorMessage });
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
