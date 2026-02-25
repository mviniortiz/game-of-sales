// Follow this Supabase Functions Deno style.
// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno imports  
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore - Deno imports
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
const MERCADOPAGO_WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Store processed event IDs for idempotency
const processedEvents = new Set<string>();

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Process webhook in background
    processWebhook(req.clone()).catch(console.error);

    // Return 200 immediately (best practice - respond fast)
    return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
});

async function processWebhook(req: Request) {
    try {
        const body = await req.text();
        const data = JSON.parse(body);

        // Verificar assinatura obrigatoriamente
        if (!MERCADOPAGO_WEBHOOK_SECRET) {
            console.error("MERCADOPAGO_WEBHOOK_SECRET is not set. Webhook signature validation cannot proceed.");
            return;
        }

        const signature = req.headers.get("x-signature");
        const requestId = req.headers.get("x-request-id");

        if (!verifySignature(body, signature, requestId)) {
            console.error("Invalid webhook signature");
            return;
        }

        // Check idempotency - skip if already processed
        const eventId = data.id?.toString();
        if (!eventId || processedEvents.has(eventId)) {
            console.log("Event already processed or no ID:", eventId);
            return;
        }

        // Mark as processed (before processing to prevent duplicates)
        processedEvents.add(eventId);

        // Handle subscription events
        if (data.type === "subscription_preapproval") {
            await handleSubscriptionEvent(data);
        }

    } catch (error) {
        console.error("Webhook processing error:", error);
    }
}

function verifySignature(body: string, signature: string | null, requestId: string | null): boolean {
    if (!signature || !requestId || !MERCADOPAGO_WEBHOOK_SECRET) {
        return false;
    }

    try {
        // Parse signature header: ts=xxx,v1=xxx
        const parts = signature.split(",");
        const ts = parts.find(p => p.startsWith("ts="))?.split("=")[1];
        const v1 = parts.find(p => p.startsWith("v1="))?.split("=")[1];

        if (!ts || !v1) return false;

        // Create manifest and compute HMAC
        const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
        const hmac = createHmac("sha256", MERCADOPAGO_WEBHOOK_SECRET);
        hmac.update(manifest);
        const computed = hmac.digest("hex");

        return computed === v1;
    } catch {
        return false;
    }
}

async function handleSubscriptionEvent(data: any) {
    const subscriptionId = data.data?.id;
    if (!subscriptionId) return;

    // Re-fetch subscription status from MP API (don't trust webhook payload)
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        headers: {
            "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
        }
    });

    if (!mpResponse.ok) {
        console.error("Failed to fetch subscription from MP");
        return;
    }

    const subscription = await mpResponse.json();

    // Map MP status to our status
    const statusMap: Record<string, string> = {
        "authorized": "trialing",
        "pending": "trialing",
        "paused": "paused",
        "cancelled": "canceled",
        "finished": "canceled"
    };

    // Check if trial is over and subscription is active
    let newStatus = statusMap[subscription.status] || subscription.status;

    // If status is authorized and trial has ended, mark as active
    if (subscription.status === "authorized") {
        const trialEnd = new Date(subscription.auto_recurring?.free_trial?.first_invoice_offset);
        if (trialEnd && new Date() > trialEnd) {
            newStatus = "active";
        }
    }

    // Update company in Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const companyId = subscription.external_reference;
    if (!companyId) {
        console.error("No company ID in external_reference");
        return;
    }

    const { error } = await supabase
        .from("companies")
        .update({
            subscription_status: newStatus,
            mp_subscription_id: subscriptionId
        })
        .eq("id", companyId);

    if (error) {
        console.error("Failed to update company:", error);
    } else {
        console.log(`Updated company ${companyId} to status: ${newStatus}`);
    }
}
