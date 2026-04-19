// Supabase Edge Function: Monetizze Webhook Receiver

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-monetizze-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MonetizzeEvent =
    | "venda_realizada"
    | "venda_reembolsada"
    | "venda_cancelada"
    | "venda_chargeback"
    | "boleto_gerado";

interface MonetizzePayload {
    tipo_evento: MonetizzeEvent;
    venda: {
        codigo: string;
        status: string;
        valor: number;
        formaPagamento?: string;
    };
    comprador: {
        nome: string;
        email: string;
        telefone?: string;
    };
    produto: {
        codigo?: string;
        nome: string;
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

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let parsedPayload: MonetizzePayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        const receivedToken = req.headers.get("x-monetizze-token");
        if (!receivedToken) {
            return new Response(JSON.stringify({ error: "Unauthorized - missing token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload: MonetizzePayload = await req.json();
        parsedPayload = payload;

        console.log(`[Monetizze Webhook] Event: ${payload.tipo_evento}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const txId = payload.venda?.codigo || "unknown";
        const eventKey = `${txId}:${payload.tipo_evento}`;
        parsedEventKey = eventKey;

        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "monetizze")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            await supabase.from("webhook_logs").insert({
                platform: "monetizze",
                event_type: payload.tipo_evento,
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

        const idempotency = await claimWebhookEvent(supabase, "monetizze", eventKey, {
            event: payload.tipo_evento,
            codigo: txId,
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
            platform: "monetizze",
            event_type: payload.tipo_evento,
            payload: payload,
            status: "processing",
        });

        let dealId: string | null = null;

        switch (payload.tipo_evento) {
            case "venda_realizada": {
                const { data: deal, error: dealError } = await supabase
                    .from("deals")
                    .insert({
                        title: `${payload.produto.nome} - ${payload.comprador.nome}`,
                        customer_name: payload.comprador.nome,
                        customer_email: payload.comprador.email,
                        customer_phone: payload.comprador.telefone || null,
                        value: payload.venda.valor,
                        stage: "closed_won",
                        probability: 100,
                        notes: `Venda via Monetizze\nCódigo: ${txId}\nProduto: ${payload.produto.nome}\nPagamento: ${payload.venda.formaPagamento || "-"}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "monetizze",
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
                    cliente_nome: payload.comprador.nome,
                    produto_nome: payload.produto.nome,
                    valor: payload.venda.valor,
                    plataforma: "Monetizze",
                    forma_pagamento: payload.venda.formaPagamento || "Desconhecido",
                    status: "Aprovado",
                    observacoes: `Sincronizado via webhook Monetizze (deal ${dealId})\nCódigo: ${txId}`,
                    data_venda: dataVenda,
                });
                break;
            }

            case "boleto_gerado": {
                // Create pending deal for boleto (em_negociacao)
                const { data: deal } = await supabase
                    .from("deals")
                    .insert({
                        title: `[Boleto] ${payload.produto.nome} - ${payload.comprador.nome}`,
                        customer_name: payload.comprador.nome,
                        customer_email: payload.comprador.email,
                        customer_phone: payload.comprador.telefone || null,
                        value: payload.venda.valor,
                        stage: "em_negociacao",
                        probability: 50,
                        notes: `Boleto gerado via Monetizze\nCódigo: ${txId}\nProduto: ${payload.produto.nome}`,
                        user_id: userId,
                        company_id: companyId,
                        source: "monetizze",
                        external_id: txId,
                    })
                    .select()
                    .single();
                dealId = deal?.id;
                break;
            }

            case "venda_reembolsada":
            case "venda_cancelada":
            case "venda_chargeback": {
                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", txId)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    const lossReason = payload.tipo_evento === "venda_reembolsada"
                        ? "Reembolso solicitado"
                        : payload.tipo_evento === "venda_chargeback"
                            ? "Chargeback"
                            : "Venda cancelada";

                    await supabase
                        .from("deals")
                        .update({
                            stage: "closed_lost",
                            probability: 0,
                            loss_reason: `${lossReason} (Monetizze)`,
                            notes: `Status atualizado via webhook Monetizze\nEvento: ${payload.tipo_evento}`,
                        })
                        .eq("id", existingDeal.id);
                    dealId = existingDeal.id;
                }
                break;
            }

            default:
                console.log(`[Monetizze Webhook] Unhandled: ${payload.tipo_evento}`);
        }

        await markWebhookEventStatus(supabase, "monetizze", eventKey, "processed", {
            processed_deal_id: dealId,
            event: payload.tipo_evento,
        });

        return new Response(
            JSON.stringify({ success: true, event: payload.tipo_evento, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Monetizze Webhook] Error:", error);
        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "monetizze", parsedEventKey, "failed", { error: errorMessage });
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
