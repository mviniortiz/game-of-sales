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

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Procura um valor no payload por uma lista de aliases (case-insensitive),
 *  cobrindo também o encapsulamento field_data do Meta Lead Ads. Espelha a
 *  lógica do pick_field do banco — usado só pra montar o lead_key. */
function pickField(payload: Record<string, unknown>, aliases: string[]): string {
  // Achata field_data: [{name, values:[...]}] do Meta Lead Ads
  let flat: Record<string, unknown> = payload;
  const fd = payload["field_data"];
  if (Array.isArray(fd)) {
    flat = {};
    for (const item of fd as Array<Record<string, unknown>>) {
      const name = String(item?.name ?? "").toLowerCase();
      const values = item?.values as unknown[] | undefined;
      if (name) flat[name] = Array.isArray(values) ? String(values[0] ?? "") : "";
    }
  }
  for (const alias of aliases) {
    const candidates = [flat[alias], flat[alias.toLowerCase()], payload[alias], payload[alias.toLowerCase()]];
    for (const c of candidates) {
      if (c != null && String(c).trim() !== "") return String(c).trim();
    }
  }
  return "";
}

/** Chave de idempotência determinística por lead.
 *  - Se o payload traz um id de evento estável (Meta leadgen_id/id, ou um
 *    row id/idempotency_key do Google Sheets/Zapier), usa ELE direto.
 *  - Senão, deriva um hash de (slug + email/phone/name) dentro de uma janela
 *    de tempo, pra que retries da mesma planilha/Meta não criem deal novo,
 *    mas leads genuinamente diferentes (ou o mesmo contato muito depois)
 *    passem. NÃO usa Date.now() bruto. */
async function computeLeadKey(slug: string, payload: Record<string, unknown>): Promise<string> {
  const explicit = pickField(payload, [
    "leadgen_id", "lead_id", "leadId", "idempotency_key", "idempotencyKey",
    "event_id", "eventId", "row_id", "rowId", "id",
  ]);
  if (explicit) return `id:${explicit}`;

  const email = pickField(payload, ["email", "e-mail", "e_mail", "customer_email"]).toLowerCase();
  const phone = pickField(payload, ["phone", "phone_number", "telefone", "whatsapp", "customer_phone"]).replace(/\D/g, "");
  const name = pickField(payload, ["full_name", "name", "nome", "customer_name", "lead_name"]).toLowerCase();

  // Janela de 10 min: protege contra rajada de retries (planilha/Meta reenviam
  // em segundos/minutos) sem bloquear pra sempre o mesmo contato.
  const windowSec = 600;
  const windowBucket = Math.floor(Date.now() / 1000 / windowSec);
  const fingerprint = [slug, email, phone, name, String(windowBucket)].join("|");
  return `h:${(await sha256Hex(fingerprint)).slice(0, 40)}`;
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

  // Chave de idempotência determinística (id estável OU hash por janela).
  const leadKey = await computeLeadKey(slug, payload as Record<string, unknown>);

  try {
    const { data, error } = await supabase.rpc("ingest_lead_webhook", {
      p_slug: slug,
      p_secret: secret,
      p_payload: payload,
      p_lead_key: leadKey,
    });

    if (error) {
      console.error("ingest_lead_webhook error", error);
      return json({ ok: false, error: "rpc_error" }, 500);
    }

    const result = data as { ok: boolean; error?: string; deal_id?: string; duplicate?: boolean };
    // Duplicado (mesmo lead_key já visto) → 200, sem criar deal novo.
    if (result?.ok && result?.duplicate) {
      return json(result, 200);
    }
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
