// lead-webhook
// POST /functions/v1/lead-webhook/:slug
//   header: x-webhook-secret OU query ?secret=
//   body:   JSON com dados do lead (Meta Lead Ads, Zapier, Make, custom)
//
// Público (verify_jwt=false). Roda com service_role pra invocar
// ingest_lead_webhook que valida secret e cria o deal.
//
// Também aceita GET /?hub.challenge=... pra verificação do webhook
// da Meta (Facebook Graph subscription). O hub.verify_token esperado
// é o mesmo secret do webhook.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractSlug(url: URL): string {
  // Aceita /functions/v1/lead-webhook/:slug ou ?slug=
  const qs = url.searchParams.get("slug");
  if (qs) return qs.trim();
  const parts = url.pathname.split("/").filter(Boolean);
  // último segmento não-vazio depois de "lead-webhook"
  const idx = parts.findIndex((p) => p === "lead-webhook");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = extractSlug(url);

  if (!slug) return json({ ok: false, error: "missing_slug" }, 400);

  // ═══ Meta Graph verification (GET com hub.challenge) ═══
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");

    if (mode === "subscribe" && challenge && verifyToken) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const { data, error } = await supabase
        .from("lead_webhooks")
        .select("secret, enabled")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data || !data.enabled || data.secret !== verifyToken) {
        return new Response("forbidden", { status: 403 });
      }
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return json({ ok: true, message: "lead webhook alive" });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // ═══ POST: ingesta ═══
  const secretHeader = req.headers.get("x-webhook-secret") ?? "";
  const secretQuery = url.searchParams.get("secret") ?? "";
  const secret = (secretHeader || secretQuery).trim();

  if (!secret) return json({ ok: false, error: "missing_secret" }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase.rpc("ingest_lead_webhook", {
      p_slug: slug,
      p_secret: secret,
      p_payload: payload,
    });

    if (error) {
      console.error("ingest_lead_webhook error", error);
      return json({ ok: false, error: "rpc_error" }, 500);
    }

    const result = data as { ok: boolean; error?: string; deal_id?: string };
    if (!result?.ok) {
      const status =
        result?.error === "not_found" || result?.error === "invalid_secret"
          ? 401
          : result?.error === "disabled"
          ? 403
          : 422;
      return json(result ?? { ok: false, error: "unknown" }, status);
    }
    return json(result, 200);
  } catch (err) {
    console.error("lead-webhook fatal", err);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
