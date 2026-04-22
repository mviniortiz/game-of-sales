// Supabase Edge Function: Pagar.me Webhook Receiver (API v5)
// Recebe eventos de order/charge/subscription da Pagar.me e cria deals/vendas.
// Auth: Basic Auth com usuário/senha configurados no postback URL da Pagar.me.
// Docs: https://docs.pagar.me/docs/postbacks-recebendo-notificacoes-de-alteracoes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pagarme-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PagarmeEvent {
    id?: string;
    type?: string; // order.paid, charge.paid, subscription.created, etc
    created_at?: string;
    data?: any;
    account?: { id?: string; name?: string };
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

function decodeBasicAuth(header: string): { user: string; pass: string } | null {
    try {
        const [scheme, value] = header.split(" ");
        if (scheme?.toLowerCase() !== "basic" || !value) return null;
        const decoded = atob(value);
        const colonIdx = decoded.indexOf(":");
        if (colonIdx < 0) return null;
        return { user: decoded.slice(0, colonIdx), pass: decoded.slice(colonIdx + 1) };
    } catch {
        return null;
    }
}

// Extrai dados do cliente do payload Pagar.me v5
function extractCustomer(obj: any): { name: string; email: string; phone: string | null } {
    const c = obj?.customer || obj?.charges?.[0]?.customer || obj?.invoice?.customer || {};
    const phone = c?.phones?.mobile_phone
        ? `${c.phones.mobile_phone.country_code || ""}${c.phones.mobile_phone.area_code || ""}${c.phones.mobile_phone.number || ""}`
        : c?.phones?.home_phone
            ? `${c.phones.home_phone.country_code || ""}${c.phones.home_phone.area_code || ""}${c.phones.home_phone.number || ""}`
            : null;
    return {
        name: c?.name || "Cliente Pagar.me",
        email: c?.email || "",
        phone: phone && phone.length > 3 ? phone : null,
    };
}

function centsToReais(cents?: number): number {
    return (cents || 0) / 100;
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
    let parsedEvent: PagarmeEvent | null = null;

    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const creds = decodeBasicAuth(authHeader);
        if (!creds) {
            return new Response(JSON.stringify({ error: "Invalid Basic Auth" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const event: PagarmeEvent = await req.json();
        parsedEvent = event;

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Convenção: no `integration_configs.hottok` guardamos "user:pass" (concatenado)
        // ou só `pass` quando user="pagarme-webhook".
        const tokenString = `${creds.user}:${creds.pass}`;
        const { data: config, error: configErr } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "pagarme")
            .eq("hottok", tokenString)
            .eq("is_active", true)
            .single();

        if (configErr || !config) {
            // Fallback: tentar só com a senha (caso user seja fixo)
            const { data: fallbackConfig } = await supabase
                .from("integration_configs")
                .select("*")
                .eq("platform", "pagarme")
                .eq("hottok", creds.pass)
                .eq("is_active", true)
                .maybeSingle();

            if (!fallbackConfig) {
                await supabase.from("webhook_logs").insert({
                    platform: "pagarme",
                    event_type: event.type || "unknown",
                    payload: event,
                    status: "error",
                    error_message: "Invalid Basic Auth credentials",
                });
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        const matchedConfig = config || (await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "pagarme")
            .eq("hottok", creds.pass)
            .eq("is_active", true)
            .single()).data;

        const companyId = matchedConfig.company_id;
        let userId = matchedConfig.user_id;

        if (!userId) {
            const { data: owner } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", companyId)
                .limit(1)
                .single();
            userId = owner?.id;
        }

        const eventType = event.type || "unknown";
        const obj = event.data || {};
        const externalId = obj.id || obj.code || event.id || "";
        const eventKey = `${externalId}:${eventType}`;
        parsedEventKey = eventKey;

        console.log(`[Pagar.me Webhook] Event: ${eventType} (${externalId})`);

        const idempotency = await claimWebhookEvent(supabase, "pagarme", eventKey, {
            event_type: eventType,
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
            platform: "pagarme",
            event_type: eventType,
            payload: event,
            status: "processing",
        });

        const customer = extractCustomer(obj);
        let dealId: string | null = null;

        // Identifica o valor conforme tipo do payload
        const amount =
            centsToReais(obj.amount) ||
            centsToReais(obj.charges?.[0]?.amount) ||
            centsToReais(obj.total) ||
            0;

        const productName =
            obj.items?.[0]?.description ||
            obj.items?.[0]?.name ||
            obj.plan?.name ||
            obj.code ||
            "Venda Pagar.me";

        const paymentMethod =
            obj.charges?.[0]?.last_transaction?.transaction_type ||
            obj.charges?.[0]?.payment_method ||
            obj.payment_method ||
            "pagarme";

        switch (eventType) {
            // Pagamentos aprovados
            case "order.paid":
            case "charge.paid":
            case "invoice.paid": {
                const { data: deal, error: dealErr } = await supabase
                    .from("deals")
                    .insert({
                        title: `${productName} - ${customer.name}`,
                        customer_name: customer.name,
                        customer_email: customer.email,
                        customer_phone: customer.phone,
                        value: amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Pagamento Pagar.me aprovado\nID: ${externalId}\nMétodo: ${paymentMethod}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "pagarme",
                        external_id: externalId,
                    })
                    .select()
                    .single();
                if (dealErr) throw dealErr;
                dealId = deal?.id || null;

                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
                await supabase.from("vendas").insert({
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: customer.name,
                    produto_nome: productName,
                    valor: amount,
                    plataforma: "Pagar.me",
                    forma_pagamento: paymentMethod,
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Pagar.me (${externalId})`,
                    data_venda: dataVenda,
                });
                break;
            }

            // Pedido criado / pendente
            case "order.created":
            case "charge.created":
            case "charge.pending": {
                const { data: existing } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", externalId)
                    .eq("company_id", companyId)
                    .maybeSingle();
                if (existing) {
                    dealId = existing.id;
                    break;
                }
                const { data: deal } = await supabase
                    .from("deals")
                    .insert({
                        title: `[Pendente] ${productName} - ${customer.name}`,
                        customer_name: customer.name,
                        customer_email: customer.email,
                        customer_phone: customer.phone,
                        value: amount,
                        stage: "em_negociacao",
                        probability: 50,
                        notes: `Pedido Pagar.me criado\nID: ${externalId}\nAguardando pagamento`,
                        user_id: userId,
                        company_id: companyId,
                        source: "pagarme",
                        external_id: externalId,
                    })
                    .select()
                    .single();
                dealId = deal?.id || null;
                break;
            }

            // Falhas / reembolsos / cancelamentos
            case "charge.refunded":
            case "charge.partial_canceled":
            case "charge.canceled":
            case "order.canceled":
            case "charge.payment_failed":
            case "order.payment_failed":
            case "invoice.canceled":
            case "subscription.canceled":
            case "charge.chargeback":
            case "chargeback.created":
            case "chargeback.accepted": {
                const { data: existing } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", externalId)
                    .eq("company_id", companyId)
                    .maybeSingle();

                const reasonMap: Record<string, string> = {
                    "charge.refunded": "Reembolso",
                    "charge.partial_canceled": "Cancelamento parcial",
                    "charge.canceled": "Cobrança cancelada",
                    "order.canceled": "Pedido cancelado",
                    "charge.payment_failed": "Falha no pagamento",
                    "order.payment_failed": "Falha no pagamento",
                    "invoice.canceled": "Fatura cancelada",
                    "subscription.canceled": "Assinatura cancelada",
                    "charge.chargeback": "Chargeback",
                    "chargeback.created": "Chargeback",
                    "chargeback.accepted": "Chargeback aceito",
                };
                const lossReason = `${reasonMap[eventType] || "Cancelamento"} (Pagar.me)`;

                if (existing) {
                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: lossReason,
                            notes: `Atualizado via webhook Pagar.me\nEvento: ${eventType}`,
                        })
                        .eq("id", existing.id);
                    dealId = existing.id;
                }
                break;
            }

            default:
                console.log(`[Pagar.me Webhook] Unhandled: ${eventType}`);
        }

        await markWebhookEventStatus(supabase, "pagarme", eventKey, "processed", {
            event_type: eventType,
            processed_deal_id: dealId,
        });

        return new Response(
            JSON.stringify({ success: true, event_type: eventType, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Pagar.me Webhook] Error:", error);
        try {
            if (parsedEventKey && parsedEvent) {
                const supabase = createClient(
                    Deno.env.get("SUPABASE_URL")!,
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                );
                const msg = error instanceof Error ? error.message : "Unknown error";
                await markWebhookEventStatus(supabase, "pagarme", parsedEventKey, "failed", { error: msg });
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
