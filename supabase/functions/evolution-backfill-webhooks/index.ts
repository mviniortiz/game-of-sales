import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// One-off backfill: configura webhook em todas instâncias Evolution existentes.
// Autenticada pelo próprio EVOLUTION_WEBHOOK_SECRET (nenhum JWT necessário).
// Ideal rodar uma única vez após provisionar EVOLUTION_WEBHOOK_SECRET.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET") || "";

const WEBHOOK_RECEIVER_URL = `${SUPABASE_URL}/functions/v1/evolution-message-webhook`;

async function evolutionRequest(path: string, init: RequestInit = {}) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) throw new Error("Evolution API not configured");
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    ...init,
    headers: {
      apikey: EVOLUTION_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let parsed: any;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) throw new Error(parsed?.message || parsed?.error || `HTTP ${res.status}`);
  return parsed;
}

serve(async (req) => {
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") || req.headers.get("x-webhook-secret") || "";
  if (!EVOLUTION_WEBHOOK_SECRET || provided !== EVOLUTION_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const receiverUrl = `${WEBHOOK_RECEIVER_URL}?secret=${EVOLUTION_WEBHOOK_SECRET}`;
  const mode = url.searchParams.get("mode") || "set";

  let all: any[] = [];
  try {
    const res = await evolutionRequest("/instance/fetchInstances", { method: "GET" });
    all = Array.isArray(res) ? res : [];
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `list instances failed: ${err.message}` }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  const results: Array<{ instanceName: string; ok: boolean; error?: string; current?: any }> = [];
  for (const inst of all) {
    const name = inst.instance?.instanceName || inst.instanceName || inst.name;
    if (!name || !String(name).startsWith("wa_")) continue;

    if (mode === "inspect") {
      try {
        const cur = await evolutionRequest(`/webhook/find/${name}`, { method: "GET" });
        results.push({ instanceName: name, ok: true, current: cur });
      } catch (err: any) {
        results.push({ instanceName: name, ok: false, error: err?.message || String(err) });
      }
      continue;
    }

    try {
      await evolutionRequest(`/webhook/set/${name}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: receiverUrl,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT"],
          },
        }),
      });
      results.push({ instanceName: name, ok: true });
    } catch (err: any) {
      results.push({ instanceName: name, ok: false, error: err?.message || String(err) });
    }
  }

  const okCount = results.filter(r => r.ok).length;
  return new Response(JSON.stringify({
    total: results.length,
    configured: okCount,
    failed: results.length - okCount,
    results,
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
