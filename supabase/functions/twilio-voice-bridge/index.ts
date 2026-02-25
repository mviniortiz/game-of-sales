import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id") || "";
    const leg = (url.searchParams.get("leg") || "customer").toLowerCase();
    const conferenceRaw = url.searchParams.get("conference") || `deal-call-${callId}`;

    // Keep a safe conference name to avoid malformed XML / Twilio errors.
    const conference = conferenceRaw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || `deal-call-${callId}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const recordingWebhook = `${supabaseUrl}/functions/v1/twilio-voice-recording-webhook?call_id=${encodeURIComponent(callId)}`;
    const shouldRecord = leg === "seller";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      startConferenceOnEnter="true"
      endConferenceOnExit="true"
      beep="false"
      ${shouldRecord ? `record="record-from-start" recordingStatusCallback="${xmlEscape(recordingWebhook)}" recordingStatusCallbackMethod="POST"` : ""}
    >${xmlEscape(conference)}</Conference>
  </Dial>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[twilio-voice-bridge] error:", error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`;
    return new Response(fallback, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  }
});
