// Supabase Edge Function: Mercado Pago Sales Webhook
// Recebe notificações de pagamentos dos clientes e cria deals/vendas no CRM.
// Distinto do `mercadopago-webhook` (que trata assinatura do Vyzon).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-mp-access-token, x-signature, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MPNotification {
    id?: string | number;
    type?: string;
    action?: string;
    date_created?: string;
    user_id?: string | number;
    api_version?: string;
    data?: { id?: string };
    live_mode?: boolean;
    resource?: string;
    topic?: string;
}

interface MPPayment {
    id: number;
    status: string;
    status_detail?: string;
    transaction_amount: number;
    transaction_amount_refunded?: number;
    net_amount?: number;
    currency_id?: string;
    description?: string;
    payment_method_id?: string;
    payment_type_id?: string;
    external_reference?: string;
    date_approved?: string;
    date_created?: string;
    payer?: {
        id?: number;
        email?: string;
        first_name?: string;
        last_name?: string;
        phone?: { area_code?: string; number?: string };
        identification?: { type?: string; number?: string };
    };
    additional_info?: {
        items?: Array<{ id?: string; title?: string; quantity?: number; unit_price?: number }>;
    };
}

async function claimWebhookEvent(
    supabase: any,
    provider: string,
    eventKey: string,
    metadata: Record<string, unknown>,
) {
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

async function markWebhookEventStatus(
    supabase: any,
    provider: string,
    eventKey: string,
    status: string,
    metadata: Record<string, unknown> = {},
) {
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

async function fetchPayment(accessToken: string, paymentId: string): Promise<MPPayment | null> {
    try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return null;
        return (await res.json()) as MPPayment;
    } catch {
        return null;
    }
}

function formatCustomerName(payment: MPPayment): string {
    const first = payment.payer?.first_name?.trim();
    const last = payment.payer?.last_name?.trim();
    const full = [first, last].filter(Boolean).join(" ");
    return full || payment.payer?.email || "Cliente Mercado Pago";
}

function formatPhone(payer?: MPPayment["payer"]): string | null {
    const ac = payer?.phone?.area_code?.trim();
    const num = payer?.phone?.number?.trim();
    if (!ac && !num) return null;
    return [ac, num].filter(Boolean).join("");
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let parsedEventKey: string | null = null;
    let parsedPayload: MPNotification | null = null;

    try {
        const receivedToken = req.headers.get("x-mp-access-token");
        if (!receivedToken) {
            return new Response(JSON.stringify({ error: "Unauthorized - missing x-mp-access-token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload: MPNotification = await req.json();
        parsedPayload = payload;
        console.log(`[MP Sales Webhook] type=${payload.type} action=${payload.action}`);

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "mercadopago")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            await supabase.from("webhook_logs").insert({
                platform: "mercadopago",
                event_type: payload.action || payload.type || "unknown",
                payload,
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

        if (!userId) {
            const { data: owner } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", companyId)
                .limit(1)
                .single();
            userId = owner?.id;
        }

        const eventType = payload.type || payload.topic || "unknown";
        if (eventType !== "payment") {
            return new Response(JSON.stringify({ success: true, ignored: true, reason: "non-payment event" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const paymentId = String(payload.data?.id || "");
        if (!paymentId) {
            return new Response(JSON.stringify({ success: true, ignored: true, reason: "missing payment id" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const action = payload.action || "payment.updated";
        const eventKey = `${paymentId}:${action}`;
        parsedEventKey = eventKey;

        const idempotency = await claimWebhookEvent(supabase, "mercadopago", eventKey, {
            action,
            payment_id: paymentId,
            company_id: companyId,
        });
        if (!idempotency.claimed) {
            return new Response(JSON.stringify({ success: true, duplicate: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        await supabase.from("webhook_logs").insert({
            company_id: companyId,
            platform: "mercadopago",
            event_type: action,
            payload,
            status: "processing",
        });

        const payment = await fetchPayment(receivedToken, paymentId);
        if (!payment) {
            await markWebhookEventStatus(supabase, "mercadopago", eventKey, "failed", {
                error: "Failed to fetch payment from MP API",
            });
            return new Response(JSON.stringify({ error: "Payment not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const customerName = formatCustomerName(payment);
        const customerEmail = payment.payer?.email || "";
        const customerPhone = formatPhone(payment.payer);
        const amount = payment.transaction_amount || 0;
        const productTitle =
            payment.additional_info?.items?.[0]?.title ||
            payment.description ||
            "Venda Mercado Pago";

        const { data: existingDeal } = await supabase
            .from("deals")
            .select("id, stage")
            .eq("external_id", paymentId)
            .eq("company_id", companyId)
            .maybeSingle();

        let dealId: string | null = existingDeal?.id || null;

        const isApproved = payment.status === "approved";
        const isRefunded = payment.status === "refunded" || (payment.transaction_amount_refunded ?? 0) > 0;
        const isRejected = payment.status === "rejected" || payment.status === "cancelled";
        const isPending = payment.status === "pending" || payment.status === "in_process" || payment.status === "authorized";

        if (isRefunded || isRejected) {
            const lossReason = isRefunded
                ? `Reembolso (MP: ${payment.status_detail || payment.status})`
                : `Pagamento ${payment.status} (MP: ${payment.status_detail || ""})`;

            if (existingDeal) {
                await supabase
                    .from("deals")
                    .update({
                        stage: "closed_lost",
                        probability: 0,
                        loss_reason: lossReason,
                        notes: `Status atualizado via webhook Mercado Pago\nEvento: ${action}\nStatus: ${payment.status}`,
                    })
                    .eq("id", existingDeal.id);
            } else {
                const { data: deal } = await supabase
                    .from("deals")
                    .insert({
                        title: `${productTitle} - ${customerName}`,
                        customer_name: customerName,
                        customer_email: customerEmail,
                        customer_phone: customerPhone,
                        value: amount,
                        stage: "closed_lost",
                        probability: 0,
                        loss_reason: lossReason,
                        notes: `Pagamento ${payment.status} via Mercado Pago\nID: ${paymentId}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "mercadopago",
                        external_id: paymentId,
                    })
                    .select()
                    .single();
                dealId = deal?.id || null;
            }
        } else if (isApproved) {
            if (existingDeal && existingDeal.stage !== "closed_won") {
                await supabase
                    .from("deals")
                    .update({
                        stage: "closed_won",
                        probability: 100,
                        notes: `Pagamento aprovado via webhook Mercado Pago\nID: ${paymentId}`,
                    })
                    .eq("id", existingDeal.id);
            } else if (!existingDeal) {
                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${productTitle} - ${customerName}`,
                        customer_name: customerName,
                        customer_email: customerEmail,
                        customer_phone: customerPhone,
                        value: amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Pagamento aprovado via Mercado Pago\nID: ${paymentId}\nMétodo: ${payment.payment_method_id || "-"} (${payment.payment_type_id || "-"})`,
                        user_id: userId,
                        company_id: companyId,
                        source: "mercadopago",
                        external_id: paymentId,
                    })
                    .select()
                    .single();
                if (dealError) throw dealError;
                dealId = deal?.id || null;
            }

            // Venda (idempotente por deal_id via plataforma+observacoes)
            const dataVenda = (payment.date_approved || payment.date_created || new Date().toISOString()).slice(0, 10);
            const { data: existingVenda } = await supabase
                .from("vendas")
                .select("id")
                .eq("company_id", companyId)
                .eq("plataforma", "Mercado Pago")
                .ilike("observacoes", `%${paymentId}%`)
                .maybeSingle();

            if (!existingVenda) {
                await supabase.from("vendas").insert({
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: customerName,
                    produto_nome: productTitle,
                    valor: amount,
                    plataforma: "Mercado Pago",
                    forma_pagamento: payment.payment_method_id || payment.payment_type_id || "Mercado Pago",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Mercado Pago (payment ${paymentId})`,
                    data_venda: dataVenda,
                });
            }
        } else if (isPending && !existingDeal) {
            const { data: deal } = await supabase
                .from("deals")
                .insert({
                    title: `[Pendente] ${productTitle} - ${customerName}`,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    value: amount,
                    stage: "em_negociacao",
                    probability: 50,
                    notes: `Pagamento pendente via Mercado Pago\nID: ${paymentId}\nStatus: ${payment.status}`,
                    user_id: userId,
                    company_id: companyId,
                    source: "mercadopago",
                    external_id: paymentId,
                })
                .select()
                .single();
            dealId = deal?.id || null;
        }

        await markWebhookEventStatus(supabase, "mercadopago", eventKey, "processed", {
            processed_deal_id: dealId,
            payment_status: payment.status,
            action,
        });

        return new Response(
            JSON.stringify({ success: true, payment_id: paymentId, deal_id: dealId, status: payment.status }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[MP Sales Webhook] Error:", error);
        try {
            if (parsedEventKey && parsedPayload) {
                const supabase = createClient(
                    Deno.env.get("SUPABASE_URL")!,
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                );
                const msg = error instanceof Error ? error.message : "Unknown error";
                await markWebhookEventStatus(supabase, "mercadopago", parsedEventKey, "failed", { error: msg });
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
