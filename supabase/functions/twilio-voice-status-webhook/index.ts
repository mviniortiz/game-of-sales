import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function mapTwilioStatusToCallStatus(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "queued":
      return "queued";
    case "initiated":
    case "ringing":
      return "dialing";
    case "in-progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "busy":
    case "failed":
    case "no-answer":
    case "canceled":
      return "failed";
    default:
      return null;
  }
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id");
    const leg = (url.searchParams.get("leg") || "unknown").toLowerCase();

    if (!callId) {
      return new Response("missing call_id", { status: 400 });
    }

    const text = await req.text();
    const params = new URLSearchParams(text);

    const twilioCallSid = params.get("CallSid");
    const twilioStatus = params.get("CallStatus");
    const duration = params.get("CallDuration");
    const to = params.get("To");
    const from = params.get("From");

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existing } = await (db as any)
      .from("deal_calls")
      .select("id, status, metadata, started_at, ended_at")
      .eq("id", callId)
      .single();

    if (!existing) {
      return new Response("ok", { status: 200 });
    }

    const currentMeta = (existing.metadata || {}) as Record<string, any>;
    const twilioMeta = (currentMeta.twilio || {}) as Record<string, any>;
    const legs = (twilioMeta.legs || {}) as Record<string, any>;
    legs[leg] = {
      ...(legs[leg] || {}),
      call_sid: twilioCallSid,
      status: twilioStatus,
      to,
      from,
      updated_at: new Date().toISOString(),
      duration_seconds: duration ? Number(duration) : undefined,
    };

    let nextStatus = mapTwilioStatusToCallStatus(twilioStatus) || existing.status;
    const patch: Record<string, any> = {
      status: nextStatus,
      metadata: {
        ...currentMeta,
        twilio: {
          ...twilioMeta,
          legs,
          last_status_event: {
            leg,
            twilio_status: twilioStatus,
            at: new Date().toISOString(),
          },
        },
      },
    };

    if (twilioStatus === "in-progress" && !existing.started_at) {
      patch.started_at = new Date().toISOString();
    }

    if (twilioStatus === "completed") {
      patch.ended_at = new Date().toISOString();
      if (duration) patch.duration_seconds = Number(duration);
      // If seller leg completes but customer leg is still running, keep in-progress.
      if (leg === "seller") {
        const customerStatus = legs.customer?.status?.toLowerCase?.();
        if (customerStatus && customerStatus !== "completed") {
          patch.status = "in_progress";
        }
      }
    }

    if (["busy", "failed", "no-answer", "canceled"].includes((twilioStatus || "").toLowerCase())) {
      patch.last_error = `Twilio ${leg} leg: ${twilioStatus}`;
    }

    await (db as any)
      .from("deal_calls")
      .update(patch)
      .eq("id", callId);

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[twilio-voice-status-webhook] error:", error);
    return new Response("ok", { status: 200 });
  }
});
