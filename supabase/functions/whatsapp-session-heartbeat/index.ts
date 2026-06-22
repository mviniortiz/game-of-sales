import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// whatsapp-session-heartbeat (2026-06-11)
//
// Problema que resolve: channel_connections.status só SOBE pra "active" (escrito
// pelo evolution-message-webhook a cada mensagem) e NUNCA é rebaixado quando a
// sessão Baileys cai. Resultado: conexões mortas há dias continuam "active", a
// UI mostra "WhatsApp conectado", e o vendedor não entende por que nada chega.
//
// Estratégia: verifica o connectionState REAL de cada conexão conhecida (chamada
// leve, uma por instância, em lotes) e reconcilia o status no banco. Evita o
// /instance/fetchInstances (lista tudo de uma vez) porque na VM grátis lenta ele
// estoura o timeout — connectionState individual é leve e tolera lentidão.
//
// Princípio de segurança: falha de rede / timeout numa conexão NÃO rebaixa o
// status dela. Um servidor que não responde não significa que a sessão caiu —
// só que não conseguimos verificar agora. Mantemos o último estado conhecido.
//
// Disparado pelo pg_cron a cada ~5min. Aceita anon Bearer (verify_jwt), escreve
// com service_role.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/+$/, "");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const PER_CALL_TIMEOUT_MS = 8000;
const BATCH_SIZE = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ResolvedStatus = "active" | "pending" | "disconnected";

/** Mapeia o estado bruto do Evolution pro enum de channel_connections.status. */
function mapState(rawState: string | null | undefined): ResolvedStatus {
  const s = String(rawState || "").toLowerCase();
  if (s === "open") return "active";
  if (["connecting", "qr", "qrcode", "pairing", "close_pending"].includes(s)) return "pending";
  return "disconnected"; // close, closed, unknown…
}

/** Estado real de UMA instância. null = não consegui verificar (não mexer). */
async function checkConnectionState(instanceName: string): Promise<ResolvedStatus | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PER_CALL_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY!, "Content-Type": "application/json" },
        signal: controller.signal,
      },
    );
    const text = await res.text();
    if (!res.ok) {
      // 404 / "does not exist" = instância não existe mais no servidor → disconnected.
      const low = text.toLowerCase();
      if (res.status === 404 || low.includes("not exist") || low.includes("not found")) {
        return "disconnected";
      }
      // Outro erro HTTP (5xx, etc): não sei o estado real → não mexer.
      return null;
    }
    let parsed: any = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch { return null; }
    const state = parsed?.instance?.state || parsed?.state;
    if (!state) return null;
    return mapState(state);
  } catch {
    // Timeout / rede: não consegui verificar → não mexer.
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── WATCHDOG da sessão ZUMBI (2026-06-22) ──────────────────────────────────────
// Sintoma: connectionState diz "open" e o webhook RECEBE, mas o socket de envio
// fica preso (sendText/getBase64 estouram timeout). Detecção: um sendText pra um
// número INVÁLIDO ("000000") — se o socket responde (mesmo com erro "não existe"),
// está vivo; se ESTOURA o timeout, está zumbi. Cura: /instance/restart (preserva
// o pareamento, sem QR). Roda só nas instâncias realmente "open".
const PROBE_TIMEOUT_MS = 6000;
const RESTART_TIMEOUT_MS = 15000;

async function isSendSocketStuck(instanceName: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ number: "000000", text: "ping" }),
      signal: controller.signal,
    });
    return false; // respondeu (qualquer status HTTP) → socket vivo
  } catch (err) {
    return (err as Error)?.name === "AbortError"; // timeout → zumbi
  } finally {
    clearTimeout(timeoutId);
  }
}

async function restartInstance(instanceName: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESTART_TIMEOUT_MS);
  try {
    const r = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY!, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return json(500, { error: "Evolution API não configurada no servidor" });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Conexões Evolution conhecidas (pula seeds de demo — sem instância real).
  const { data: conns, error: connErr } = await admin
    .from("channel_connections")
    .select("id, external_id, status")
    .eq("provider", "evolution");
  if (connErr) {
    return json(500, { error: `select connections failed: ${connErr.message}` });
  }
  const targets = (conns || []).filter(
    (c) => c.external_id && !String(c.external_id).startsWith("wa_demo"),
  );

  // Verifica em lotes (connectionState leve, uma por instância).
  const buckets: Record<ResolvedStatus, string[]> = { active: [], pending: [], disconnected: [] };
  const transitions: Array<{ external_id: string; from: string; to: string }> = [];
  const activeInstances: string[] = []; // realmente "open" → candidatas ao teste de zumbi
  let unreachable = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (c) => ({ conn: c, real: await checkConnectionState(c.external_id) })),
    );
    for (const { conn, real } of results) {
      if (real === null) { unreachable++; continue; } // não verificável → mantém
      if (real === "active") activeInstances.push(conn.external_id);
      if (real !== conn.status) {
        buckets[real].push(conn.external_id);
        transitions.push({ external_id: conn.external_id, from: String(conn.status), to: real });
      }
    }
  }

  // Aplica em lote, por status (só as que mudaram E foram verificadas).
  let updated = 0;
  for (const status of ["active", "pending", "disconnected"] as const) {
    const ids = buckets[status];
    if (ids.length === 0) continue;
    const patch: Record<string, unknown> = { status };
    if (status === "active") patch.last_seen_at = new Date().toISOString();
    const { error: upErr } = await admin
      .from("channel_connections")
      .update(patch)
      .eq("provider", "evolution")
      .in("external_id", ids);
    if (upErr) console.error(`[heartbeat] update ${status} failed:`, upErr.message);
    else updated += ids.length;
  }

  // ── WATCHDOG: testa o socket de envio das instâncias "open" e reinicia as zumbis ──
  const restarted: string[] = [];
  const stuckButRestartFailed: string[] = [];
  for (let i = 0; i < activeInstances.length; i += BATCH_SIZE) {
    const batch = activeInstances.slice(i, i + BATCH_SIZE);
    const probes = await Promise.all(
      batch.map(async (name) => ({ name, stuck: await isSendSocketStuck(name) })),
    );
    for (const { name, stuck } of probes) {
      if (!stuck) continue;
      const ok = await restartInstance(name);
      if (ok) restarted.push(name);
      else stuckButRestartFailed.push(name);
    }
  }

  console.log(
    `[heartbeat] checked=${targets.length} unreachable=${unreachable} ` +
      `updated=${updated} transitions=${JSON.stringify(transitions)} ` +
      `probed=${activeInstances.length} restarted=${JSON.stringify(restarted)} ` +
      `restart_failed=${JSON.stringify(stuckButRestartFailed)}`,
  );

  return json(200, {
    success: true,
    checked: targets.length,
    unreachable,
    updated,
    transitions,
    probed: activeInstances.length,
    restarted,
    restart_failed: stuckButRestartFailed,
  });
});
