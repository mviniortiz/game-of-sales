// Supabase Edge Function: RD Station Webhook Receiver
// Receives webhook events from RD Station Marketing AND RD Station CRM
// Marketing events use: event_type, contacts[], conversion_identifier
// CRM events use: event_name, document { deal_stage, amount_total, status, user, ... }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rdstation-auth, x-rd-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface RDStationContact {
    uuid?: string;
    email?: string;
    name?: string;
    personal_phone?: string;
    company_name?: string;
    job_title?: string;
    city?: string;
    state?: string;
    tags?: string[];
}

// RD Station CRM document structure (as sent by the API)
interface RDCrmDocument {
    id?: string;
    name?: string;
    amount_monthly?: number;
    amount_unique?: number;
    amount_total?: number;
    prediction_date?: string;
    rating?: number;
    status?: string; // "ongoing", "won", "lost"
    win?: boolean;
    closed_at?: string;
    user?: {
        id?: string;
        name?: string;
        email?: string;
    };
    deal_stage?: {
        id?: string;
        name?: string;
        nickname?: string;
        order?: number;
    };
    deal_pipeline?: {
        id?: string;
        name?: string;
    };
    deal_source?: Record<string, unknown>;
    campaign?: Record<string, unknown>;
    deal_lost_reason?: Record<string, unknown>;
    deal_custom_fields?: unknown[];
    deal_products?: unknown[];
    contacts?: Array<{
        _id?: string;
        name?: string;
        title?: string;
        emails?: Array<{ email?: string }>;
        phones?: Array<{ phone?: string }>;
    }>;
}

// Combined payload supporting both Marketing and CRM webhook formats
interface RDStationPayload {
    // Marketing format
    event_type?: string;
    event_uuid?: string;
    contacts?: RDStationContact[];
    email?: string;
    name?: string;
    personal_phone?: string;
    company_name?: string;
    job_title?: string;
    city?: string;
    state?: string;
    tags?: string[];
    uuid?: string;
    conversion_identifier?: string;
    traffic_source?: string;
    // CRM format
    event_name?: string;
    event_timestamp?: string;
    transaction_uuid?: string;
    document?: RDCrmDocument;
    // Legacy flat deal fields (fallback)
    deal?: {
        deal_id?: string;
        deal_stage?: string;
        deal_value?: number;
        deal_name?: string;
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEventName(payload: RDStationPayload): string {
    return payload.event_type || payload.event_name || "unknown";
}

function extractContact(payload: RDStationPayload): RDStationContact {
    // 1. CRM format: contacts inside document
    const doc = payload.document;
    if (doc?.contacts && doc.contacts.length > 0) {
        const c = doc.contacts[0];
        return {
            uuid: c._id,
            name: c.name,
            email: c.emails?.[0]?.email,
            personal_phone: c.phones?.[0]?.phone,
            company_name: undefined,
            job_title: c.title,
        };
    }
    // 2. Marketing format: contacts[] array
    if (payload.contacts && payload.contacts.length > 0) {
        return payload.contacts[0];
    }
    // 3. Flat fields at root level
    return {
        uuid: payload.uuid,
        email: payload.email,
        name: payload.name,
        personal_phone: payload.personal_phone,
        company_name: payload.company_name,
        job_title: payload.job_title,
        city: payload.city,
        state: payload.state,
        tags: payload.tags,
    };
}

/**
 * Extract deal data from CRM document or legacy flat format.
 */
function extractDealData(payload: RDStationPayload) {
    const doc = payload.document;
    if (doc) {
        return {
            dealId: doc.id || payload.transaction_uuid,
            dealName: doc.name,
            dealValue: doc.amount_total ?? doc.amount_unique ?? 0,
            dealStageName: doc.deal_stage?.name || null,
            dealStageNickname: doc.deal_stage?.nickname || null,
            dealStatus: doc.status || null, // "ongoing", "won", "lost"
            isWon: doc.status === "won" || doc.win === true,
            isLost: doc.status === "lost" || (doc.deal_lost_reason && Object.keys(doc.deal_lost_reason).length > 0),
        };
    }
    // Legacy flat format fallback
    const deal = payload.deal;
    return {
        dealId: deal?.deal_id || payload.event_uuid,
        dealName: deal?.deal_name,
        dealValue: deal?.deal_value ?? 0,
        dealStageName: deal?.deal_stage || null,
        dealStageNickname: null,
        dealStatus: null,
        isWon: false,
        isLost: false,
    };
}

function formatDateToday(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
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
        console.warn("[RDStation Webhook] persistent idempotency unavailable:", error);
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
        console.warn("[RDStation Webhook] mark status warning:", error);
    }
}

/**
 * Creates an approved sale (venda) for a won deal.
 */
async function createApprovedVenda(
    supabase: any,
    opts: { userId: string; companyId: string; dealId: string | null; contactName: string; dealName: string; value: number }
) {
    const observacoes = opts.dealId
        ? `Sincronizado automaticamente do CRM (deal ${opts.dealId})`
        : `Sincronizado via webhook RD Station`;

    // Check idempotency - don't create duplicate venda for the same deal
    if (opts.dealId) {
        const { data: existing } = await supabase
            .from("vendas")
            .select("id")
            .eq("observacoes", observacoes)
            .eq("user_id", opts.userId)
            .limit(1);

        if (existing && existing.length > 0) {
            console.log(`[RDStation Webhook] Venda already exists for deal ${opts.dealId}`);
            return;
        }
    }

    const vendaPayload = {
        user_id: opts.userId,
        company_id: opts.companyId,
        cliente_nome: opts.contactName || "Cliente RD Station",
        produto_nome: opts.dealName || "Negociacao RD Station",
        valor: opts.value,
        plataforma: "RD Station",
        forma_pagamento: "Desconhecido",
        status: "Aprovado",
        observacoes,
        data_venda: formatDateToday(),
    };

    const { error } = await supabase.from("vendas").insert(vendaPayload);
    if (error) {
        console.error("[RDStation Webhook] Error creating venda:", error);
    } else {
        console.log(`[RDStation Webhook] Created approved venda for deal: ${opts.dealId}`);
    }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let parsedEventName: string | null = null;
    let parsedEventKey: string | null = null;

    try {
        const payload: RDStationPayload = await req.json();
        const eventName = getEventName(payload);
        parsedEventName = eventName;

        console.log(`[RDStation Webhook] Received event: ${eventName}`, JSON.stringify(payload).slice(0, 500));

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // ── Auth: find matching config ──────────────────────────────
        const { data: configs, error: configError } = await supabase
            .from("integration_configs")
            .select("*")
            .eq("platform", "rdstation")
            .eq("is_active", true);

        if (configError || !configs || configs.length === 0) {
            console.error("[RDStation Webhook] No active RD Station configurations found");
            await supabase.from("webhook_logs").insert({
                platform: "rdstation",
                event_type: eventName,
                payload,
                status: "error",
                error_message: "No active RD Station configuration found",
            });
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let matchedConfig: any = null;
        for (const config of configs) {
            const authHeaderName = config.webhook_url || "x-rdstation-auth";
            const receivedToken = req.headers.get(authHeaderName);
            if (receivedToken && config.hottok && receivedToken === config.hottok) {
                matchedConfig = config;
                break;
            }
        }

        if (!matchedConfig) {
            console.error("[RDStation Webhook] Invalid auth token - no matching configuration");
            await supabase.from("webhook_logs").insert({
                platform: "rdstation",
                event_type: eventName,
                payload,
                status: "error",
                error_message: "Invalid auth token - no matching RD Station configuration found",
            });
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const companyId = matchedConfig.company_id;
        let userId = matchedConfig.user_id;

        // Extract data from payload
        const contact = extractContact(payload);
        const dealData = extractDealData(payload);
        const contactUuid = contact.uuid || dealData.dealId || payload.transaction_uuid || payload.event_uuid || "unknown";

        const eventKey = `${contactUuid}:${eventName}`;
        parsedEventKey = eventKey;

        const idempotency = await claimWebhookEvent(supabase, "rdstation", eventKey, {
            event: eventName,
            contact_uuid: contactUuid,
            company_id: companyId,
        });
        if (!idempotency.claimed) {
            console.log(`[RDStation Webhook] Duplicate event ignored: ${eventKey}`);
            return new Response(JSON.stringify({ success: true, duplicate: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Fallback user_id
        if (!userId) {
            const { data: companyUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("company_id", companyId)
                .limit(1)
                .single();
            userId = companyUser?.id;
        }

        // Log the event
        await supabase.from("webhook_logs").insert({
            company_id: companyId,
            platform: "rdstation",
            event_type: eventName,
            payload,
            status: "processing",
        });

        // ── Process events ──────────────────────────────────────────
        let dealId: string | null = null;

        switch (eventName) {
            // ── Marketing: Lead Conversion ───────────────────────────
            case "WEBHOOK.CONVERTED": {
                const conversionName = payload.conversion_identifier || "Conversao RD Station";
                const dealTitle = contact.company_name
                    ? `${conversionName} - ${contact.company_name}`
                    : `${conversionName} - ${contact.name || contact.email || "Lead"}`;

                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", contactUuid)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    dealId = existingDeal.id;
                    console.log(`[RDStation Webhook] Deal already exists for contact ${contactUuid}: ${dealId}`);
                } else {
                    const locationParts = [contact.city, contact.state].filter(Boolean);
                    const locationNote = locationParts.length > 0 ? `\nLocalidade: ${locationParts.join(", ")}` : "";
                    const tagsNote = contact.tags && contact.tags.length > 0 ? `\nTags: ${contact.tags.join(", ")}` : "";
                    const trafficNote = payload.traffic_source ? `\nOrigem: ${payload.traffic_source}` : "";

                    const { data: deal, error: dealError } = await supabase
                        .from("deals")
                        .insert({
                            title: dealTitle,
                            customer_name: contact.name || null,
                            customer_email: contact.email || null,
                            customer_phone: contact.personal_phone || null,
                            value: 0,
                            stage: "lead",
                            probability: 10,
                            notes: `Lead via RD Station\nConversao: ${conversionName}${trafficNote}${locationNote}${tagsNote}\nEmpresa: ${contact.company_name || "N/A"}\nCargo: ${contact.job_title || "N/A"}`,
                            user_id: userId,
                            company_id: companyId,
                            source: "rdstation",
                            external_id: contactUuid,
                        })
                        .select()
                        .single();

                    if (dealError) throw dealError;
                    dealId = deal?.id;
                    console.log(`[RDStation Webhook] Created deal (lead): ${dealId}`);
                }
                break;
            }

            // ── Marketing: Marked as Opportunity ─────────────────────
            case "WEBHOOK.MARKED_OPPORTUNITY": {
                const dealTitle = contact.company_name
                    ? `Oportunidade - ${contact.company_name}`
                    : `Oportunidade - ${contact.name || contact.email || "Lead"}`;

                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("external_id", contactUuid)
                    .eq("company_id", companyId)
                    .single();

                if (existingDeal) {
                    await supabase
                        .from("deals")
                        .update({ stage: "qualification", probability: 30 })
                        .eq("id", existingDeal.id);
                    dealId = existingDeal.id;
                } else {
                    const locationParts = [contact.city, contact.state].filter(Boolean);
                    const locationNote = locationParts.length > 0 ? `\nLocalidade: ${locationParts.join(", ")}` : "";
                    const tagsNote = contact.tags && contact.tags.length > 0 ? `\nTags: ${contact.tags.join(", ")}` : "";

                    const { data: deal, error: dealError } = await supabase
                        .from("deals")
                        .insert({
                            title: dealTitle,
                            customer_name: contact.name || null,
                            customer_email: contact.email || null,
                            customer_phone: contact.personal_phone || null,
                            value: 0,
                            stage: "qualification",
                            probability: 30,
                            notes: `Oportunidade via RD Station${locationNote}${tagsNote}\nEmpresa: ${contact.company_name || "N/A"}\nCargo: ${contact.job_title || "N/A"}`,
                            user_id: userId,
                            company_id: companyId,
                            source: "rdstation",
                            external_id: contactUuid,
                        })
                        .select()
                        .single();

                    if (dealError) throw dealError;
                    dealId = deal?.id;
                }
                break;
            }

            // ── CRM: Deal Created ────────────────────────────────────
            case "crm_deal_created": {
                const externalId = dealData.dealId || contactUuid;
                const dealTitle = dealData.dealName
                    ? `${dealData.dealName} - ${contact.name || "Deal"}`
                    : `Deal RD CRM - ${contact.name || contact.email || "Lead"}`;

                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id, stage")
                    .eq("external_id", externalId)
                    .eq("company_id", companyId)
                    .single();

                // Map deal status to local stage
                let localStage = "lead";
                let probability = 20;
                if (dealData.isWon) {
                    localStage = "closed_won";
                    probability = 100;
                } else if (dealData.isLost) {
                    localStage = "closed_lost";
                    probability = 0;
                }

                if (existingDeal) {
                    await supabase
                        .from("deals")
                        .update({
                            title: dealTitle,
                            customer_name: contact.name || undefined,
                            customer_email: contact.email || undefined,
                            customer_phone: contact.personal_phone || undefined,
                            value: dealData.dealValue,
                            stage: localStage,
                            probability,
                            notes: `Deal criado no RD CRM\nStage RD: ${dealData.dealStageName || "N/A"}\nStatus: ${dealData.dealStatus || "N/A"}`,
                        })
                        .eq("id", existingDeal.id);
                    dealId = existingDeal.id;
                } else {
                    const { data: deal, error: dealError } = await supabase
                        .from("deals")
                        .insert({
                            title: dealTitle,
                            customer_name: contact.name || null,
                            customer_email: contact.email || null,
                            customer_phone: contact.personal_phone || null,
                            value: dealData.dealValue,
                            stage: localStage,
                            probability,
                            notes: `Deal criado no RD CRM\nStage RD: ${dealData.dealStageName || "N/A"}\nStatus: ${dealData.dealStatus || "N/A"}`,
                            user_id: userId,
                            company_id: companyId,
                            source: "rdstation",
                            external_id: externalId,
                        })
                        .select()
                        .single();

                    if (dealError) throw dealError;
                    dealId = deal?.id;
                }

                // If deal is already won on creation, create approved venda
                if (dealData.isWon) {
                    await createApprovedVenda(supabase, {
                        userId,
                        companyId,
                        dealId,
                        contactName: contact.name || contact.email || "Cliente RD Station",
                        dealName: dealData.dealName || "Negociacao RD Station",
                        value: dealData.dealValue,
                    });
                }

                console.log(`[RDStation Webhook] Processed crm_deal_created: ${dealId} (status: ${dealData.dealStatus})`);
                break;
            }

            // ── CRM: Deal Updated ────────────────────────────────────
            case "crm_deal_updated": {
                const externalId = dealData.dealId || contactUuid;

                const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id, stage")
                    .eq("external_id", externalId)
                    .eq("company_id", companyId)
                    .single();

                // Map deal status to local stage
                let localStage: string | undefined = undefined;
                let probability: number | undefined = undefined;
                if (dealData.isWon) {
                    localStage = "closed_won";
                    probability = 100;
                } else if (dealData.isLost) {
                    localStage = "closed_lost";
                    probability = 0;
                }

                const dealTitle = dealData.dealName
                    ? `${dealData.dealName} - ${contact.name || "Deal"}`
                    : undefined;

                if (existingDeal) {
                    const updateFields: Record<string, any> = {
                        notes: `Deal atualizado no RD CRM\nStage RD: ${dealData.dealStageName || "N/A"}\nStatus: ${dealData.dealStatus || "N/A"}`,
                    };

                    if (dealData.dealValue !== undefined && dealData.dealValue > 0) {
                        updateFields.value = dealData.dealValue;
                    }
                    if (dealTitle) updateFields.title = dealTitle;
                    if (localStage) {
                        updateFields.stage = localStage;
                        updateFields.probability = probability;
                    }
                    if (contact.name) updateFields.customer_name = contact.name;
                    if (contact.email) updateFields.customer_email = contact.email;
                    if (contact.personal_phone) updateFields.customer_phone = contact.personal_phone;

                    await supabase
                        .from("deals")
                        .update(updateFields)
                        .eq("id", existingDeal.id);

                    dealId = existingDeal.id;

                    // Deal was updated to WON → create approved venda
                    if (dealData.isWon && existingDeal.stage !== "closed_won") {
                        await createApprovedVenda(supabase, {
                            userId,
                            companyId,
                            dealId,
                            contactName: contact.name || contact.email || "Cliente RD Station",
                            dealName: dealData.dealName || "Negociacao RD Station",
                            value: dealData.dealValue,
                        });
                    }

                    console.log(`[RDStation Webhook] Updated deal: ${dealId} (status: ${dealData.dealStatus})`);
                } else {
                    // Deal not found locally - create it
                    const newTitle = dealTitle || `Deal RD CRM - ${contact.name || contact.email || "Lead"}`;

                    const { data: deal, error: dealError } = await supabase
                        .from("deals")
                        .insert({
                            title: newTitle,
                            customer_name: contact.name || null,
                            customer_email: contact.email || null,
                            customer_phone: contact.personal_phone || null,
                            value: dealData.dealValue,
                            stage: localStage || "lead",
                            probability: probability ?? 20,
                            notes: `Deal do RD CRM (criado localmente)\nStage RD: ${dealData.dealStageName || "N/A"}\nStatus: ${dealData.dealStatus || "N/A"}`,
                            user_id: userId,
                            company_id: companyId,
                            source: "rdstation",
                            external_id: externalId,
                        })
                        .select()
                        .single();

                    if (dealError) throw dealError;
                    dealId = deal?.id;

                    // If already won, create approved venda
                    if (dealData.isWon) {
                        await createApprovedVenda(supabase, {
                            userId,
                            companyId,
                            dealId,
                            contactName: contact.name || contact.email || "Cliente RD Station",
                            dealName: dealData.dealName || "Negociacao RD Station",
                            value: dealData.dealValue,
                        });
                    }

                    console.log(`[RDStation Webhook] Created deal from update event: ${dealId} (status: ${dealData.dealStatus})`);
                }
                break;
            }

            default:
                console.log(`[RDStation Webhook] Unhandled event type: ${eventName}`);
        }

        // Update log with success
        await supabase
            .from("webhook_logs")
            .update({ status: "success", processed_deal_id: dealId })
            .eq("platform", "rdstation")
            .eq("company_id", companyId)
            .eq("event_type", eventName)
            .order("created_at", { ascending: false })
            .limit(1);

        await markWebhookEventStatus(supabase, "rdstation", eventKey, "processed", {
            processed_deal_id: dealId,
            event: eventName,
        });

        return new Response(
            JSON.stringify({ success: true, event: eventName, deal_id: dealId }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("[RDStation Webhook] Error:", error);

        try {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (parsedEventKey) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                await markWebhookEventStatus(supabase, "rdstation", parsedEventKey, "failed", { error: errorMessage });
            }
        } catch {
            // ignore secondary errors
        }

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
