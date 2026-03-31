// Supabase Edge Function: Handle outbound WebRTC calls from browser
// This is the TwiML App Voice URL — Twilio calls this when the browser SDK makes a call
// It receives the parameters we pass from the browser and generates TwiML to dial the customer

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const TWILIO_WEBHOOK_SECRET = Deno.env.get("TWILIO_WEBHOOK_SECRET");

function xmlEscape(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

serve(async (req) => {
    try {
        // Twilio sends POST with form-encoded body
        const formData = await req.formData().catch(() => null);
        const params: Record<string, string> = {};

        if (formData) {
            for (const [key, value] of formData.entries()) {
                params[key] = String(value);
            }
        }

        // Also check URL params (for GET requests or query string)
        const url = new URL(req.url);
        for (const [key, value] of url.searchParams.entries()) {
            if (!params[key]) params[key] = value;
        }

        const callId = params.callId || params.call_id || "";
        const customerPhone = params.customerPhone || params.To || "";
        const conferenceName = params.conference || `deal-call-${callId}`;

        console.log(`[twilio-voice-webrtc-handler] callId=${callId}, customerPhone=${customerPhone}, conference=${conferenceName}`);

        if (!customerPhone) {
            // No customer to dial — just put the caller in the conference
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="pt-BR">Nenhum numero de destino informado.</Say>
    <Hangup/>
</Response>`;
            return new Response(twiml, {
                status: 200,
                headers: { "Content-Type": "text/xml; charset=utf-8" },
            });
        }

        // Build recording webhook URL
        const recordingWebhookUrl = new URL(`${SUPABASE_URL}/functions/v1/twilio-voice-recording-webhook`);
        if (callId) recordingWebhookUrl.searchParams.set("call_id", callId);
        if (TWILIO_WEBHOOK_SECRET) recordingWebhookUrl.searchParams.set("secret", TWILIO_WEBHOOK_SECRET);
        const recordingWebhook = recordingWebhookUrl.toString();

        // Build status callback for the customer leg
        const statusUrl = new URL(`${SUPABASE_URL}/functions/v1/twilio-voice-status-webhook`);
        if (callId) statusUrl.searchParams.set("call_id", callId);
        statusUrl.searchParams.set("leg", "customer");
        if (TWILIO_WEBHOOK_SECRET) statusUrl.searchParams.set("secret", TWILIO_WEBHOOK_SECRET);

        // Sanitize conference name
        const safeConference = conferenceName.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || `deal-call-${callId}`;

        // The TwiML:
        // 1. Put the browser user (seller) into a conference with recording
        // 2. Simultaneously dial the customer into the same conference
        const callerIdEscaped = xmlEscape(TWILIO_PHONE_NUMBER || customerPhone);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${callerIdEscaped}" record="record-from-answer-dual" recordingStatusCallback="${xmlEscape(recordingWebhook)}" recordingStatusCallbackMethod="POST">
        <Number statusCallback="${xmlEscape(statusUrl.toString())}" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST">${xmlEscape(customerPhone)}</Number>
    </Dial>
</Response>`;

        // Update call record status if we have a callId
        if (callId) {
            try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                await (supabase as any)
                    .from("deal_calls")
                    .update({
                        status: "dialing",
                        metadata: {
                            source: "webrtc",
                            conference_name: safeConference,
                            webrtc_handler_ts: new Date().toISOString(),
                        },
                    })
                    .eq("id", callId);
            } catch (err) {
                console.warn("[twilio-voice-webrtc-handler] failed to update call record:", err);
            }
        }

        return new Response(twiml, {
            status: 200,
            headers: { "Content-Type": "text/xml; charset=utf-8" },
        });
    } catch (error) {
        console.error("[twilio-voice-webrtc-handler] error:", error);
        const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="pt-BR">Erro ao conectar a chamada.</Say><Hangup/></Response>`;
        return new Response(fallback, {
            status: 200,
            headers: { "Content-Type": "text/xml; charset=utf-8" },
        });
    }
});
