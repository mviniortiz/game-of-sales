// Supabase Edge Function: Notazz Webhook Receiver
// Recebe callbacks de status de NF emitidas pela Notazz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notazz-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotazzStatus =
    | "NF_AUTHORIZED"
    | "NF_REJECTED"
    | "NF_CANCELLED"
    | "NF_PROCESSING"
    | "NF_ERROR";

interface NotazzPayload {
    event?: string;
    status?: string; // "autorizada" | "rejeitada" | "cancelada" | "processando" | "erro"
    documentNumber?: string;
    externalId?: string;
    protocol?: string;
    xmlUrl?: string;
    pdfUrl?: string;
    client?: {
        name?: string;
        email?: string;
        document?: string;
        phone?: string;
    };
    value?: number;
    message?: string;
    [k: string]: unknown;
}

function normalizeStatus(raw: string | undefined): NotazzStatus {
    const s = (raw || "").toLowerCase();
    if (s.includes("autoriz")) return "NF_AUTHORIZED";
    if (s.includes("rejeit")) return "NF_REJECTED";
    if (s.includes("cancel")) return "NF_CANCELLED";
    if (s.includes("process")) return "NF_PROCESSING";
    return "NF_ERROR";
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

    let parsedPayload: NotazzPayload | null = null;
    let parsedEventKey: string | null = null;

    try {
        const receivedToken = req.headers.get("x-notazz-token");
        if (!receivedToken) {
            return new Response(JSON.stringify({ error: "Unauthorized - missing token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload: NotazzPayload = await req.json();
        parsedPayload = payload;

        const normalized = normalizeStatus(payload.status);
        console.log(`[Notazz Webhook] Status: ${payload.status} → ${normalized}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const txId = payload.externalId || payload.documentNumber || payload.protocol || "unknown";
        const eventKey = `${txId}:${normalized}`;
        parsedEventKey = eventKey;

        const { data: config, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "notazz")
            .eq("hottok", receivedToken)
            .eq("is_active", true)
            .single();

        if (configError || !config) {
            await supabase.from("webhook_logs").insert({
                platform: "notazz",
                event_type: normalized,
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

        const idempotency = await claimWebhookEvent(supabase, "notazz", eventKey, {
            event: normalized,
            external_id: txId,
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
            platform: "notazz",
            event_type: normalized,
            payload: payload,
            status: "processing",
        });

        // Anota o status da NF no deal associado (se existir por external_id)
        if (payload.externalId) {
            const { data: existingDeal } = await supabase
                .from("deals")
                .select("id, notes")
                .eq("external_id", payload.externalId)
                .eq("company_id", companyId)
                .maybeSingle();

            if (existingDeal) {
                const statusLabel = normalized === "NF_AUTHORIZED"
                    ? "NF autorizada"
                    : normalized === "NF_REJECTED"
                        ? "NF rejeitada"
                        : normalized === "NF_CANCELLED"
                            ? "NF cancelada"
                            : normalized === "NF_PROCESSING"
                                ? "NF em processamento"
                                : "Erro na emissão";

                const nfNote = `\n\n[${new Date().toLocaleString("pt-BR")}] ${statusLabel}${payload.documentNumber ? ` · Nº ${payload.documentNumber}` : ""}${payload.pdfUrl ? ` · ${payload.pdfUrl}` : ""}${payload.message ? ` · ${payload.message}` : ""}`;
                await supabase
                    .from("deals")
                    .update({ notes: (existingDeal.notes || "") + nfNote })
                    .eq("id", existingDeal.id);
            }
        }

        await markWebhookEventStatus(supabase, "notazz", eventKey, "processed", {
            status: normalized,
            document_number: payload.documentNumber,
            pdf_url: payload.pdfUrl,
        });

        return new Response(
            JSON.stringify({ success: true, status: normalized }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("[Notazz Webhook] Error:", error);
        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedPayload && parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "notazz", parsedEventKey, "failed", { error: errorMessage });
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
