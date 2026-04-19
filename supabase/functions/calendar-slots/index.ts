// calendar-slots
// Retorna slots disponíveis nos próximos N dias úteis do super_admin.
// Horário: 9h-18h BRT, 30min slots, seg-sex, exclui conflitos via freeBusy.

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

const WORK_START_HOUR_BRT = 9;  // 9h BRT
const WORK_END_HOUR_BRT = 18;   // 18h BRT (último slot começa 17:30)
const SLOT_DURATION_MIN = 30;
const DAYS_AHEAD = 14;
const TZ_OFFSET_HOURS = -3; // BRT = UTC-3 (ignora horário de verão que BR não usa mais)

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

// Gera slots candidatos (antes de filtrar por busy)
// Retorna array de { startIso, endIso } em UTC
function buildCandidateSlots(nowUtc: Date): Array<{ startIso: string; endIso: string }> {
  const slots: Array<{ startIso: string; endIso: string }> = [];
  const minLeadTimeMin = 60; // slot precisa ser pelo menos 1h a partir de agora
  const earliest = new Date(nowUtc.getTime() + minLeadTimeMin * 60000);

  for (let d = 0; d < DAYS_AHEAD; d++) {
    // Data base em BRT — criamos com offset manual
    const dayBrt = new Date(nowUtc.getTime() + d * 24 * 60 * 60 * 1000);
    // Extraímos ano/mês/dia em BRT
    const brt = new Date(dayBrt.getTime() + TZ_OFFSET_HOURS * 60 * 60 * 1000);
    const year = brt.getUTCFullYear();
    const month = brt.getUTCMonth();
    const date = brt.getUTCDate();
    const weekday = brt.getUTCDay(); // 0=dom, 6=sáb

    if (weekday === 0 || weekday === 6) continue;

    for (let hour = WORK_START_HOUR_BRT; hour < WORK_END_HOUR_BRT; hour++) {
      for (let min = 0; min < 60; min += SLOT_DURATION_MIN) {
        // Slot em BRT: year-month-date hour:min
        // Convertendo pra UTC: somar +3h (BRT é UTC-3)
        const startUtc = new Date(Date.UTC(year, month, date, hour - TZ_OFFSET_HOURS, min));
        const endUtc = new Date(startUtc.getTime() + SLOT_DURATION_MIN * 60000);
        if (startUtc < earliest) continue;
        slots.push({ startIso: startUtc.toISOString(), endIso: endUtc.toISOString() });
      }
    }
  }
  return slots;
}

async function getFreeBusy(accessToken: string, calendarId: string, fromIso: string, toIso: string) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: fromIso,
      timeMax: toIso,
      items: [{ id: calendarId || "primary" }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("freeBusy failed: " + JSON.stringify(data));
  const calKey = Object.keys(data.calendars || {})[0];
  const busy: Array<{ start: string; end: string }> = data.calendars?.[calKey]?.busy || [];
  return busy;
}

function filterByBusy(
  slots: Array<{ startIso: string; endIso: string }>,
  busy: Array<{ start: string; end: string }>
): Array<{ startIso: string; endIso: string }> {
  if (busy.length === 0) return slots;
  return slots.filter((s) => {
    const sStart = new Date(s.startIso).getTime();
    const sEnd = new Date(s.endIso).getTime();
    for (const b of busy) {
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      if (sStart < bEnd && sEnd > bStart) return false;
    }
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Pegar super_admin + tokens
    const { data: admin, error: adminErr } = await supabase
      .from("profiles")
      .select("id, google_access_token, google_refresh_token, google_token_expires_at, google_calendar_id")
      .eq("is_super_admin", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (adminErr || !admin) {
      console.error("[calendar-slots] super_admin not found", adminErr);
      return new Response(JSON.stringify({ error: "admin_not_found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowUtc = new Date();
    const candidates = buildCandidateSlots(nowUtc);

    // Se admin não conectou GCal, retorna slots brutos (sem filtrar conflitos)
    if (!admin.google_access_token) {
      console.warn("[calendar-slots] admin sem google_access_token — retornando slots sem filtro");
      return new Response(
        JSON.stringify({ slots: candidates, gcal_connected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh token se expirado
    let accessToken = admin.google_access_token;
    const expired = admin.google_token_expires_at && new Date(admin.google_token_expires_at) < nowUtc;
    if (expired && admin.google_refresh_token) {
      try {
        accessToken = await refreshGoogleToken(admin.google_refresh_token, admin.id, supabase);
      } catch (e) {
        console.error("[calendar-slots] refresh error", e);
        // Em caso de falha, retorna slots brutos
        return new Response(
          JSON.stringify({ slots: candidates, gcal_connected: false, refresh_error: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Busy da janela toda
    const fromIso = candidates[0]?.startIso || nowUtc.toISOString();
    const toIso = candidates[candidates.length - 1]?.endIso ||
      new Date(nowUtc.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000).toISOString();

    const busy = await getFreeBusy(accessToken, admin.google_calendar_id || "primary", fromIso, toIso);
    const available = filterByBusy(candidates, busy);

    return new Response(
      JSON.stringify({ slots: available, gcal_connected: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[calendar-slots] error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
