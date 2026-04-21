// upload-ads-conversion
// Server-side Google Ads Offline Conversion Upload.
// Recebe { lead_id }, lê gclid + attribution do demo_requests, autentica
// Google Ads API v21 via refresh_token e sobe ClickConversion.
// Imune a adblocker/DNT/gtag timing que bloqueiam o pixel client-side.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GADS_CLIENT_ID = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
const GADS_CLIENT_SECRET = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET");
const GADS_REFRESH_TOKEN = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN");
const GADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
const GADS_CUSTOMER_ID = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID") || "3014873882";
const GADS_LOGIN_CUSTOMER_ID = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID") || "1530563827";
const GADS_CONVERSION_ACTION_ID = Deno.env.get("GOOGLE_ADS_CONVERSION_ACTION_ID") || "7577986942";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sha256Hex(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return `+${digits}`;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GADS_CLIENT_ID!,
      client_secret: GADS_CLIENT_SECRET!,
      refresh_token: GADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`oauth failed ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

// Google Ads quer ISO 8601 com timezone offset explícito (+HH:MM ou -HH:MM).
// "YYYY-MM-DD HH:MM:SS+00:00" também funciona.
function formatConversionDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const Y = d.getUTCFullYear();
  const M = pad(d.getUTCMonth() + 1);
  const D = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const m = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${Y}-${M}-${D} ${h}:${m}:${s}+00:00`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: fetchErr } = await supabase
      .from("demo_requests")
      .select("id, email, phone, gclid, created_at, ads_conversion_uploaded_at")
      .eq("id", lead_id)
      .single();

    if (fetchErr || !lead) {
      return new Response(JSON.stringify({ error: "lead not found", detail: fetchErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lead.ads_conversion_uploaded_at) {
      return new Response(JSON.stringify({ ok: true, skipped: "already uploaded" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lead.gclid) {
      return new Response(JSON.stringify({ ok: true, skipped: "no gclid — lead didn't come from google ads" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_REFRESH_TOKEN || !GADS_DEVELOPER_TOKEN) {
      return new Response(JSON.stringify({ error: "Google Ads secrets not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();

    const userIdentifiers: Array<{ hashedEmail?: string; hashedPhoneNumber?: string }> = [];
    if (lead.email) {
      userIdentifiers.push({ hashedEmail: await sha256Hex(lead.email) });
    }
    if (lead.phone) {
      userIdentifiers.push({ hashedPhoneNumber: await sha256Hex(normalizePhone(lead.phone)) });
    }

    const conversion: Record<string, unknown> = {
      conversionAction: `customers/${GADS_CUSTOMER_ID}/conversionActions/${GADS_CONVERSION_ACTION_ID}`,
      conversionDateTime: formatConversionDateTime(lead.created_at),
      conversionValue: 50,
      currencyCode: "BRL",
      gclid: lead.gclid,
      orderId: lead.id,
    };
    if (userIdentifiers.length) conversion.userIdentifiers = userIdentifiers;

    const body = JSON.stringify({
      conversions: [conversion],
      partialFailure: true,
      validateOnly: false,
    });

    const url = `https://googleads.googleapis.com/v21/customers/${GADS_CUSTOMER_ID}:uploadClickConversions`;
    const adsRes = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GADS_DEVELOPER_TOKEN,
        "login-customer-id": GADS_LOGIN_CUSTOMER_ID,
        "Content-Type": "application/json",
      },
      body,
    });

    const adsJson = await adsRes.json();

    if (!adsRes.ok) {
      await supabase
        .from("demo_requests")
        .update({ ads_conversion_error: JSON.stringify(adsJson).slice(0, 500) })
        .eq("id", lead_id);
      return new Response(JSON.stringify({ error: "google ads rejected", detail: adsJson }), {
        status: adsRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partialErr = adsJson.partialFailureError;
    if (partialErr && partialErr.details?.length) {
      await supabase
        .from("demo_requests")
        .update({ ads_conversion_error: JSON.stringify(partialErr).slice(0, 500) })
        .eq("id", lead_id);
      return new Response(JSON.stringify({ ok: false, partial_error: partialErr }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("demo_requests")
      .update({ ads_conversion_uploaded_at: new Date().toISOString(), ads_conversion_error: null })
      .eq("id", lead_id);

    return new Response(JSON.stringify({ ok: true, result: adsJson.results?.[0] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[upload-ads-conversion] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
