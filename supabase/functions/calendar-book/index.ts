// calendar-book
// Cria evento no GCal do super_admin com convidado (lead) + Meet link.
// Atualiza demo_requests com scheduled_at, google_event_id, google_meet_link.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGoogleToken(refreshToken: string, userId: string, supabase: any): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("refresh failed: " + JSON.stringify(data));
  await supabase
    .from("profiles")
    .update({
      google_access_token: data.access_token,
      google_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", userId);
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { demo_request_id, start_iso, end_iso } = body;

    if (!demo_request_id || !start_iso || !end_iso) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Valida demo_request
    const { data: demoReq, error: drErr } = await supabase
      .from("demo_requests")
      .select("id, name, email, company, phone, biggest_pain, improvement_goal, team_size, uses_spreadsheets")
      .eq("id", demo_request_id)
      .single();

    if (drErr || !demoReq) {
      console.error("[calendar-book] demo_request not found", drErr);
      return new Response(JSON.stringify({ error: "demo_request_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Super_admin + tokens
    const { data: admin, error: adminErr } = await supabase
      .from("profiles")
      .select("id, email, google_access_token, google_refresh_token, google_token_expires_at, google_calendar_id")
      .eq("is_super_admin", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (adminErr || !admin) {
      console.error("[calendar-book] super_admin not found", adminErr);
      return new Response(JSON.stringify({ error: "admin_not_found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!admin.google_access_token) {
      // Sem GCal conectado — marca como agendado mas sem evento
      await supabase
        .from("demo_requests")
        .update({ scheduled_at: start_iso, status: "scheduled" })
        .eq("id", demo_request_id);
      return new Response(
        JSON.stringify({ ok: true, gcal_connected: false, meet_link: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh se expirado
    let accessToken = admin.google_access_token;
    const expired = admin.google_token_expires_at && new Date(admin.google_token_expires_at) < new Date();
    if (expired && admin.google_refresh_token) {
      accessToken = await refreshGoogleToken(admin.google_refresh_token, admin.id, supabase);
    }

    // Monta descrição com contexto do lead
    const lines: string[] = [];
    lines.push(`📋 Demo Vyzon — Lead: ${demoReq.name || "—"}`);
    lines.push("");
    lines.push(`• Email: ${demoReq.email}`);
    if (demoReq.phone) lines.push(`• WhatsApp: ${demoReq.phone}`);
    if (demoReq.company) lines.push(`• Empresa: ${demoReq.company}`);
    if (demoReq.team_size) lines.push(`• Time: ${demoReq.team_size} vendedores`);
    if (demoReq.uses_spreadsheets === true) lines.push("• Usa planilhas hoje");
    if (demoReq.biggest_pain) lines.push(`• Maior dor: ${demoReq.biggest_pain}`);
    if (demoReq.improvement_goal) lines.push(`• Quer melhorar: ${demoReq.improvement_goal}`);
    lines.push("");
    lines.push(`Lead ID: ${demoReq.id}`);

    const event = {
      summary: `Demo Vyzon · ${demoReq.name || demoReq.email}${demoReq.company ? ` (${demoReq.company})` : ""}`,
      description: lines.join("\n"),
      start: { dateTime: start_iso, timeZone: "America/Sao_Paulo" },
      end: { dateTime: end_iso, timeZone: "America/Sao_Paulo" },
      attendees: [
        { email: demoReq.email, displayName: demoReq.name || undefined, responseStatus: "needsAction" },
      ],
      conferenceData: {
        createRequest: {
          requestId: `vyzon-${demo_request_id}-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const calId = admin.google_calendar_id || "primary";
    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const gcalData = await gcalRes.json();
    if (!gcalRes.ok) {
      console.error("[calendar-book] gcal insert failed", gcalData);
      return new Response(JSON.stringify({ error: "gcal_insert_failed", detail: gcalData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meetLink: string | null =
      gcalData.hangoutLink ||
      gcalData.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ||
      null;

    // Atualiza demo_request
    await supabase
      .from("demo_requests")
      .update({
        scheduled_at: start_iso,
        google_event_id: gcalData.id,
        google_meet_link: meetLink,
        status: "scheduled",
      })
      .eq("id", demo_request_id);

    return new Response(
      JSON.stringify({
        ok: true,
        gcal_connected: true,
        meet_link: meetLink,
        event_id: gcalData.id,
        html_link: gcalData.htmlLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[calendar-book] error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
