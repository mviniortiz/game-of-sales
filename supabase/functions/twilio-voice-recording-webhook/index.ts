import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id");
    if (!callId) {
      return new Response("missing call_id", { status: 400 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const recordingUrl = params.get("RecordingUrl");
    const recordingSid = params.get("RecordingSid");
    const recordingStatus = params.get("RecordingStatus");
    const recordingDuration = params.get("RecordingDuration");
    const conferenceSid = params.get("ConferenceSid");

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existing } = await (db as any)
      .from("deal_calls")
      .select("id, deal_id, company_id, user_id, metadata")
      .eq("id", callId)
      .single();

    if (!existing) {
      return new Response("ok", { status: 200 });
    }

    const currentMeta = (existing.metadata || {}) as Record<string, any>;
    const twilioMeta = (currentMeta.twilio || {}) as Record<string, any>;
    const urlWithExt = recordingUrl && !recordingUrl.endsWith(".mp3")
      ? `${recordingUrl}.mp3`
      : recordingUrl;

    await (db as any)
      .from("deal_calls")
      .update({
        recording_url: urlWithExt,
        status: "completed",
        transcript_status: "pending",
        duration_seconds: recordingDuration ? Number(recordingDuration) : undefined,
        ended_at: new Date().toISOString(),
        metadata: {
          ...currentMeta,
          twilio: {
            ...twilioMeta,
            recording: {
              sid: recordingSid,
              status: recordingStatus,
              url: urlWithExt,
              conference_sid: conferenceSid,
              duration_seconds: recordingDuration ? Number(recordingDuration) : undefined,
              updated_at: new Date().toISOString(),
            },
          },
        },
      })
      .eq("id", callId);

    try {
      await (db as any).from("deal_activities").insert({
        deal_id: existing.deal_id,
        company_id: existing.company_id,
        user_id: existing.user_id,
        activity_type: "call",
        description: "Gravação da ligação disponível",
        new_value: recordingDuration ? `Duração: ${recordingDuration}s` : "Gravação pronta",
      });
    } catch (e) {
      console.warn("[twilio-voice-recording-webhook] deal_activities insert warning:", e);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[twilio-voice-recording-webhook] error:", error);
    return new Response("ok", { status: 200 });
  }
});
