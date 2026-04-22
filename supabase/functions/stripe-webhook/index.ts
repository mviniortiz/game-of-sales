// Supabase Edge Function: Stripe Webhook Receiver
// Recebe eventos Stripe (payment_intent, charge, invoice, subscription) e cria deals/vendas.
// Auth: Validação HMAC SHA-256 via header Stripe-Signature contra Webhook Signing Secret (whsec_...).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface StripeEvent {
    id: string;
    type: string;
    livemode: boolean;
    api_version?: string;
    created: number;
    data: { object: any };
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

// Stripe signature verification — replica da lib oficial, sem deps pesadas.
// Formato do header: "t=<timestamp>,v1=<signature>[,v1=<signature>...]"
async function verifyStripeSignature(
    payload: string,
    header: string,
    secret: string,
    toleranceSeconds = 300,
): Promise<boolean> {
    try {
        const parts = header.split(",").reduce<Record<string, string[]>>((acc, part) => {
            const [k, v] = part.split("=");
            if (!k || !v) return acc;
            if (!acc[k]) acc[k] = [];
            acc[k].push(v);
            return acc;
        }, {});

        const timestamp = parts.t?.[0];
        const signatures = parts.v1 || [];
        if (!timestamp || signatures.length === 0) return false;

        const ts = parseInt(timestamp, 10);
        if (!ts || Number.isNaN(ts)) return false;
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - ts) > toleranceSeconds) {
            console.warn(`[Stripe] Signature outside tolerance: ts=${ts}, now=${now}`);
            return false;
        }

        const signedPayload = `${timestamp}.${payload}`;
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
        const expected = Array.from(new Uint8Array(sigBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        // Timing-safe compare
        for (const sig of signatures) {
            if (sig.length === expected.length) {
                let mismatch = 0;
                for (let i = 0; i < expected.length; i++) {
                    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
                }
                if (mismatch === 0) return true;
            }
        }
        return false;
    } catch (err) {
        console.error("[Stripe] verify error:", err);
        return false;
    }
}

async function fetchCustomer(secretKey: string, customerId: string) {
    try {
        const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
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

    let parsedEventKey: string | null = null;

    try {
        const sigHeader = req.headers.get("stripe-signature");
        if (!sigHeader) {
            return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Stripe exige validação do raw body — ler como texto antes de parse.
        const rawBody = await req.text();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Estratégia: buscar TODAS as configs Stripe ativas e tentar verificar signature
        // contra o secret de cada uma até achar a empresa. Necessário porque o Stripe
        // não manda "de qual conta é" no header.
        const { data: configs, error: configErr } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "stripe")
            .eq("is_active", true);

        if (configErr || !configs || configs.length === 0) {
            return new Response(JSON.stringify({ error: "No Stripe config registered" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let matchedConfig: any = null;
        for (const cfg of configs) {
            // Convenção: hottok = webhook signing secret (whsec_...)
            // additional_config.secret_key = chave restrita da API (sk_...), opcional
            const signingSecret = cfg.hottok;
            if (!signingSecret) continue;
            const valid = await verifyStripeSignature(rawBody, sigHeader, signingSecret);
            if (valid) {
                matchedConfig = cfg;
                break;
            }
        }

        if (!matchedConfig) {
            await supabase.from("webhook_logs").insert({
                platform: "stripe",
                event_type: "signature_failed",
                payload: { raw: rawBody.slice(0, 500) },
                status: "error",
                error_message: "No config matched Stripe signature",
            });
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const event: StripeEvent = JSON.parse(rawBody);
        console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

        const companyId = matchedConfig.company_id;
        let userId = matchedConfig.user_id;
        const secretKey: string | null =
            (matchedConfig.additional_config && matchedConfig.additional_config.secret_key) || null;

        if (!userId) {
            const { data: owner } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", companyId)
                .limit(1)
                .single();
            userId = owner?.id;
        }

        const eventKey = event.id;
        parsedEventKey = eventKey;

        const idempotency = await claimWebhookEvent(supabase, "stripe", eventKey, {
            event_type: event.type,
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
            platform: "stripe",
            event_type: event.type,
            payload: event,
            status: "processing",
        });

        const obj = event.data.object;
        let dealId: string | null = null;

        // Helper pra extrair identidade do cliente
        const getCustomerInfo = async () => {
            // Tentar do próprio objeto primeiro
            let name = obj.customer_details?.name || obj.billing_details?.name || "";
            let email = obj.customer_details?.email || obj.billing_details?.email || obj.receipt_email || "";
            let phone = obj.customer_details?.phone || obj.billing_details?.phone || null;

            // Se tiver só customer_id e secret_key disponível, buscar via API
            const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
            if ((!name || !email) && customerId && secretKey) {
                const cust = await fetchCustomer(secretKey, customerId);
                if (cust) {
                    name = name || cust.name || cust.email || "";
                    email = email || cust.email || "";
                    phone = phone || cust.phone;
                }
            }
            return {
                name: name || "Cliente Stripe",
                email,
                phone,
            };
        };

        const amountToReais = (amountCents?: number, currency?: string) => {
            const cents = amountCents || 0;
            // Stripe envia em centavos pra USD/BRL/EUR. Para moedas zero-decimal (JPY etc.)
            // o amount já vem em unidades inteiras — fora do escopo aqui (99% dos clientes BR usam BRL).
            const zeroDecimal = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
            if (currency && zeroDecimal.has(currency.toLowerCase())) return cents;
            return cents / 100;
        };

        switch (event.type) {
            // Pagamentos únicos (Payment Intents / Charges)
            case "payment_intent.succeeded":
            case "charge.succeeded": {
                const customer = await getCustomerInfo();
                const amount = amountToReais(obj.amount_received ?? obj.amount, obj.currency);
                const description = obj.description || obj.statement_descriptor || "Venda Stripe";
                const externalId = obj.id;
                const paymentMethod = obj.payment_method_types?.[0] || obj.payment_method_details?.type || "card";

                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${description} - ${customer.name}`,
                        customer_name: customer.name,
                        customer_email: customer.email,
                        customer_phone: customer.phone,
                        value: amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Pagamento Stripe aprovado\nID: ${externalId}\nMétodo: ${paymentMethod}\nCurrency: ${obj.currency?.toUpperCase() || "-"}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "stripe",
                        external_id: externalId,
                    })
                    .select()
                    .single();

                if (dealError) throw dealError;
                dealId = deal?.id || null;

                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
                await supabase.from("vendas").insert({
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: customer.name,
                    produto_nome: description,
                    valor: amount,
                    plataforma: "Stripe",
                    forma_pagamento: paymentMethod,
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Stripe (${externalId})`,
                    data_venda: dataVenda,
                });
                break;
            }

            // Invoice/assinatura paga
            case "invoice.paid":
            case "invoice.payment_succeeded": {
                const customer = await getCustomerInfo();
                const amount = amountToReais(obj.amount_paid ?? obj.amount_due, obj.currency);
                const description = obj.lines?.data?.[0]?.description || `Assinatura Stripe`;
                const externalId = obj.id;

                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${description} - ${customer.name}`,
                        customer_name: customer.name,
                        customer_email: customer.email,
                        customer_phone: customer.phone,
                        value: amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Fatura Stripe paga\nID: ${externalId}\nSubscription: ${obj.subscription || "-"}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "stripe",
                        external_id: externalId,
                    })
                    .select()
                    .single();
                if (dealError) throw dealError;
                dealId = deal?.id || null;

                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
                await supabase.from("vendas").insert({
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: customer.name,
                    produto_nome: description,
                    valor: amount,
                    plataforma: "Stripe",
                    forma_pagamento: "subscription",
                    status: "Aprovado",
                    observacoes: `Fatura Stripe paga (${externalId})`,
                    data_venda: dataVenda,
                });
                break;
            }

            // Checkout Session concluído
            case "checkout.session.completed": {
                if (obj.payment_status !== "paid") break;
                const customer = await getCustomerInfo();
                const amount = amountToReais(obj.amount_total, obj.currency);
                const description = obj.metadata?.product_name || "Checkout Stripe";
                const externalId = obj.id;

                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${description} - ${customer.name}`,
                        customer_name: customer.name,
                        customer_email: customer.email,
                        customer_phone: customer.phone,
                        value: amount,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Checkout Stripe concluído\nSession: ${externalId}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "stripe",
                        external_id: externalId,
                    })
                    .select()
                    .single();
                if (dealError) throw dealError;
                dealId = deal?.id || null;

                const hoje = new Date();
                const dataVenda = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
                await supabase.from("vendas").insert({
                    user_id: userId,
                    company_id: companyId,
                    cliente_nome: customer.name,
                    produto_nome: description,
                    valor: amount,
                    plataforma: "Stripe",
                    forma_pagamento: obj.payment_method_types?.[0] || "card",
                    status: "Aprovado",
                    observacoes: `Checkout Stripe (${externalId})`,
                    data_venda: dataVenda,
                });
                break;
            }

            // Reembolsos / chargebacks
            case "charge.refunded":
            case "charge.refund.updated":
            case "payment_intent.canceled":
            case "payment_intent.payment_failed":
            case "invoice.payment_failed":
            case "invoice.voided":
            case "customer.subscription.deleted":
            case "charge.dispute.created":
            case "charge.dispute.closed": {
                const externalId = obj.id || obj.payment_intent || obj.charge || "";
                if (!externalId) break;

                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("company_id", companyId)
                    .or(`external_id.eq.${externalId},external_id.eq.${obj.payment_intent || ""},external_id.eq.${obj.charge || ""}`)
                    .maybeSingle();

                if (existingDeal) {
                    const lossReason =
                        event.type.includes("refund") ? "Reembolso (Stripe)" :
                        event.type.includes("dispute") ? "Disputa/Chargeback (Stripe)" :
                        event.type.includes("canceled") || event.type.includes("deleted") ? "Cancelamento (Stripe)" :
                        "Falha de pagamento (Stripe)";

                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: lossReason,
                            notes: `Atualizado via webhook Stripe\nEvento: ${event.type}`,
                        })
                        .eq("id", existingDeal.id);
                    dealId = existingDeal.id;
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled: ${event.type}`);
        }

        await markWebhookEventStatus(supabase, "stripe", eventKey, "processed", {
            event_type: event.type,
            processed_deal_id: dealId,
        });

        return new Response(
            JSON.stringify({ success: true, event_id: event.id, event_type: event.type, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Stripe Webhook] Error:", error);
        try {
            if (parsedEventKey) {
                const supabase = createClient(
                    Deno.env.get("SUPABASE_URL")!,
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                );
                const msg = error instanceof Error ? error.message : "Unknown error";
                await markWebhookEventStatus(supabase, "stripe", parsedEventKey, "failed", { error: msg });
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
