import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  callId?: string;
};

async function consumeRateLimit(
  supabaseAdminClient: any,
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  try {
    const { data, error } = await supabaseAdminClient.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("consume_rate_limit")) {
        return { enabled: false, allowed: true };
      }
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { enabled: true, allowed: row?.allowed !== false, resetAt: row?.reset_at ?? null };
  } catch (error) {
    console.warn("[deal-call-transcribe] rate limit unavailable:", error);
    return { enabled: false, allowed: true };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let callId: string | undefined;

  try {
    // Accept both service-role internal calls and authorized user calls
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

    if (!isServiceRole) {
      // Validate user auth
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: userError,
      } = await userSupabase.auth.getUser();

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = (await req.json()) as Body;
    callId = body.callId;

    if (!callId) {
      return new Response(JSON.stringify({ error: "callId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the call record
    const { data: call, error: callError } = await (adminSupabase as any)
      .from("deal_calls")
      .select("id, deal_id, company_id, user_id, recording_url, transcript_status, metadata")
      .eq("id", callId)
      .single();

    if (callError || !call) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!call.recording_url) {
      return new Response(JSON.stringify({ error: "Call has no recording_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 transcriptions per company per hour
    const rateLimit = await consumeRateLimit(
      adminSupabase,
      `deal-call-transcribe:company:${call.company_id}`,
      30,
      3600,
    );
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: "Limite de transcrições atingido. Tente novamente mais tarde.",
        code: "RATE_LIMITED",
        reset_at: rateLimit.resetAt ?? null,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as transcribing
    await (adminSupabase as any)
      .from("deal_calls")
      .update({ transcript_status: "transcribing" })
      .eq("id", callId);

    // Download the recording audio from Twilio
    console.log(`[deal-call-transcribe] Downloading recording: ${call.recording_url}`);
    let audioResponse: Response;
    try {
      // Twilio recordings may need auth; try with Twilio creds first, fall back to plain fetch
      const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
      const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

      const fetchHeaders: Record<string, string> = {};
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
        fetchHeaders["Authorization"] = `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`;
      }

      audioResponse = await fetch(call.recording_url, { headers: fetchHeaders });

      if (!audioResponse.ok) {
        throw new Error(`Failed to download recording: HTTP ${audioResponse.status}`);
      }
    } catch (downloadError) {
      const errMsg = downloadError instanceof Error ? downloadError.message : "Download failed";
      console.error(`[deal-call-transcribe] Download error:`, downloadError);

      await (adminSupabase as any)
        .from("deal_calls")
        .update({
          transcript_status: "failed",
          metadata: {
            ...(call.metadata || {}),
            transcription_error: errMsg,
            transcription_failed_at: new Date().toISOString(),
          },
        })
        .eq("id", callId);

      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to OpenAI Whisper API
    console.log(`[deal-call-transcribe] Sending to Whisper API...`);
    let transcriptText: string;
    try {
      const audioBlob = await audioResponse.blob();
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.mp3");
      formData.append("model", "whisper-1");
      formData.append("language", "pt");
      formData.append("response_format", "text");

      const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!whisperResponse.ok) {
        const errBody = await whisperResponse.text();
        throw new Error(`Whisper API error (${whisperResponse.status}): ${errBody}`);
      }

      transcriptText = await whisperResponse.text();
      transcriptText = transcriptText.trim();
    } catch (whisperError) {
      const errMsg = whisperError instanceof Error ? whisperError.message : "Whisper transcription failed";
      console.error(`[deal-call-transcribe] Whisper error:`, whisperError);

      await (adminSupabase as any)
        .from("deal_calls")
        .update({
          transcript_status: "failed",
          metadata: {
            ...(call.metadata || {}),
            transcription_error: errMsg,
            transcription_failed_at: new Date().toISOString(),
          },
        })
        .eq("id", callId);

      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transcriptText) {
      await (adminSupabase as any)
        .from("deal_calls")
        .update({
          transcript_status: "failed",
          metadata: {
            ...(call.metadata || {}),
            transcription_error: "Empty transcript returned from Whisper",
            transcription_failed_at: new Date().toISOString(),
          },
        })
        .eq("id", callId);

      return new Response(JSON.stringify({ error: "Empty transcript returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save transcript to deal_calls
    const preview = transcriptText.split("\n").slice(0, 2).join(" ").slice(0, 300);

    await (adminSupabase as any)
      .from("deal_calls")
      .update({
        transcript_text: transcriptText,
        transcript_preview: preview,
        transcript_status: "completed",
        transcript_language: "pt",
        metadata: {
          ...(call.metadata || {}),
          transcription_completed_at: new Date().toISOString(),
          transcription_model: "whisper-1",
          transcription_language: "pt",
        },
      })
      .eq("id", callId);

    console.log(`[deal-call-transcribe] Transcript saved (${transcriptText.length} chars). Triggering insights...`);

    // Fire-and-forget: trigger insight generation
    try {
      const insightsUrl = `${SUPABASE_URL}/functions/v1/deal-call-generate-insights`;
      fetch(insightsUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callId }),
      }).catch((e) => {
        console.warn("[deal-call-transcribe] fire-and-forget insights trigger error:", e);
      });
    } catch (e) {
      console.warn("[deal-call-transcribe] insights trigger error:", e);
    }

    // Log activity
    try {
      await (adminSupabase as any).from("deal_activities").insert({
        deal_id: call.deal_id,
        company_id: call.company_id,
        user_id: call.user_id,
        activity_type: "call",
        description: "Transcrição da ligação concluída",
        new_value: `${transcriptText.length} caracteres transcritos`,
      });
    } catch (e) {
      console.warn("[deal-call-transcribe] deal_activities insert warning:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      callId,
      transcript_length: transcriptText.length,
      transcript_preview: preview,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[deal-call-transcribe] error:", error);

    // Best-effort: mark as failed
    if (callId) {
      try {
        await (adminSupabase as any)
          .from("deal_calls")
          .update({
            transcript_status: "failed",
            metadata: {
              transcription_error: error instanceof Error ? error.message : "Internal error",
              transcription_failed_at: new Date().toISOString(),
            },
          })
          .eq("id", callId);
      } catch (_) {
        // ignore
      }
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
