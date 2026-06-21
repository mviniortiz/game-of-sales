// Supabase Edge Function: Clicksign Webhook Receiver
//
// Recebe eventos de assinatura de contrato da Clicksign. Quando um
// documento é finalizado (todos assinaram), localiza o deal pelo
// document key (em external_id) e marca como ganho (closed_won),
// anotando o contrato no histórico.
//
// Schema, eventos e segurança FIÉIS à doc oficial:
//   https://developers.clicksign.com/docs/introducao-a-webhooks
//   https://developers.clicksign.com/docs/seguranca-de-webhooks
//   https://developers.clicksign.com/docs/exemplo-documento
//   (lib de referência: github.com/NexoosBR/clicksign-webhooks)
//
// Doc — segurança (HMAC):
//   Header: Content-Hmac: sha256=<hex>
//   Algoritmo: HMAC-SHA256 do corpo bruto da requisição usando o
//   Secret gerado ao criar o webhook (não formatar o JSON antes).
//   Fail-CLOSED: sem header/secret ou assinatura inválida → 401.
//
// Doc — payload (top-level):
//   {
//     "event": { "name": "auto_close", "data": {...}, "occurred_at": "..." },
//     "document": {
//       "key": "db4a2cf7-...", "account_key": "...", "filename": "...",
//       "status": "closed", "finished_at": "...", "deadline_at": "...",
//       "signers": [...], "downloads": { "signed_file_url": "..." }
//     }
//   }
//
// Doc — eventos: upload, add_signer, remove_signer, sign, close,
//   auto_close, deadline, cancel, refusal, document_closed, ...
//   Conclusão de assinatura = "auto_close" / "close" / "document_closed"
//   (status do documento vira "closed").
//
// verify_jwt = false (público). Roda com service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-hmac",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ClicksignDocument {
  key?: string;
  account_key?: string;
  filename?: string;
  status?: string;
  finished_at?: string;
  deadline_at?: string;
  signers?: Array<Record<string, unknown>>;
  downloads?: {
    original_file_url?: string;
    signed_file_url?: string;
    ziped_file_url?: string;
  };
  [k: string]: unknown;
}

interface ClicksignPayload {
  event?: {
    name?: string;
    data?: Record<string, unknown>;
    occurred_at?: string;
  };
  document?: ClicksignDocument;
  [k: string]: unknown;
}

// Eventos que indicam contrato FINALIZADO/assinado por todos.
const COMPLETION_EVENTS = new Set(["auto_close", "close", "document_closed"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Comparação em tempo constante (timing-safe) — padrão do projeto.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// HMAC-SHA256(key = secret, msg = rawBody) em hex.
function computeHmac(rawBody: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(rawBody);
  return hmac.digest("hex");
}

// O header vem como "sha256=<hex>". Normaliza pra comparar só o hex.
function parseSignatureHeader(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const v = headerValue.trim();
  const eq = v.indexOf("=");
  // Aceita "sha256=<hex>" (formato da doc) ou hex puro (defensivo).
  if (eq >= 0 && v.slice(0, eq).toLowerCase().includes("sha")) {
    return v.slice(eq + 1).trim().toLowerCase();
  }
  return v.toLowerCase();
}

async function claimWebhookEvent(
  supabase: any,
  provider: string,
  eventKey: string,
  metadata: Record<string, unknown>,
) {
  try {
    const { data, error } = await supabase.rpc("claim_webhook_event", {
      p_provider: provider,
      p_event_key: eventKey,
      p_metadata: metadata,
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("claim_webhook_event")) return { enabled: false, claimed: true };
      throw error;
    }
    return { enabled: true, claimed: data === true };
  } catch (error) {
    console.warn("[Clicksign Webhook] idempotency unavailable:", error);
    return { enabled: false, claimed: true };
  }
}

async function markWebhookEventStatus(
  supabase: any,
  provider: string,
  eventKey: string,
  status: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.rpc("mark_webhook_event_status", {
      p_provider: provider,
      p_event_key: eventKey,
      p_status: status,
      p_metadata_patch: metadata,
    });
  } catch (error) {
    console.warn("[Clicksign Webhook] mark status warning:", error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let parsedEventKey: string | null = null;
  let supabaseForCatch: any = null;

  try {
    // ─── Header HMAC (fail-CLOSED) ────────────────────────────────────
    const sigHeader = req.headers.get("content-hmac");
    const receivedHmac = parseSignatureHeader(sigHeader);
    if (!receivedHmac) {
      console.error("[Clicksign Webhook] Missing Content-Hmac header");
      return json({ error: "Unauthorized - missing signature" }, 401);
    }

    // Corpo BRUTO — necessário pro HMAC (não reparsear/reformatar).
    const rawBody = await req.text();
    const payload: ClicksignPayload = JSON.parse(rawBody);

    const eventName = payload.event?.name || "unknown";
    const docKey = payload.document?.key || "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    supabaseForCatch = supabase;

    // ─── Encontra a empresa cujo secret valida o HMAC (timing-safe) ───
    const { data: configs, error: configError } = await supabase
      .from("integration_configs")
      .select("*")
      .eq("platform", "clicksign")
      .eq("is_active", true);

    if (configError || !configs || configs.length === 0) {
      console.error("[Clicksign Webhook] No active clicksign configuration found");
      await supabase.from("webhook_logs").insert({
        platform: "clicksign",
        event_type: eventName,
        payload,
        status: "error",
        error_message: "No active clicksign configuration found",
      });
      return json({ error: "Unauthorized" }, 401);
    }

    let matchedConfig: any = null;
    for (const config of configs) {
      const secret = config.hottok;
      if (!secret) continue;
      const computed = computeHmac(rawBody, String(secret));
      if (timingSafeEqualHex(computed, receivedHmac)) {
        matchedConfig = config;
        break;
      }
    }

    if (!matchedConfig) {
      console.error("[Clicksign Webhook] Invalid HMAC - no matching configuration");
      await supabase.from("webhook_logs").insert({
        platform: "clicksign",
        event_type: eventName,
        payload,
        status: "error",
        error_message: "Invalid HMAC - no matching clicksign configuration",
      });
      return json({ error: "Unauthorized" }, 401);
    }

    const companyId = matchedConfig.company_id;

    // ─── Idempotência por document key + evento ───────────────────────
    const eventKey = `${docKey}:${eventName}`;
    parsedEventKey = eventKey;

    const idempotency = await claimWebhookEvent(supabase, "clicksign", eventKey, {
      event: eventName,
      document_key: docKey,
      company_id: companyId,
    });
    if (!idempotency.claimed) {
      console.log(`[Clicksign Webhook] Duplicate event ignored: ${eventKey}`);
      return json({ success: true, duplicate: true }, 200);
    }

    await supabase.from("webhook_logs").insert({
      company_id: companyId,
      platform: "clicksign",
      event_type: eventName,
      payload,
      status: "processing",
    });

    // ─── Só agimos no fechamento do contrato ──────────────────────────
    const isCompleted =
      COMPLETION_EVENTS.has(eventName) ||
      (payload.document?.status || "").toLowerCase() === "closed";

    let dealId: string | null = null;

    if (isCompleted && docKey && docKey !== "unknown") {
      // O deal foi associado ao documento via external_id = document key.
      // (Ao criar o documento na Clicksign, o CRM grava deal.external_id
      //  com a key, ou via source_data.clicksign_document_key.)
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("id, notes, stage")
        .eq("external_id", docKey)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingDeal) {
        const signedUrl = payload.document?.downloads?.signed_file_url || "";
        const filename = payload.document?.filename || "";
        const finishedAt = payload.document?.finished_at || "";
        const note =
          `\n\n[${new Date().toLocaleString("pt-BR")}] Contrato assinado (Clicksign)` +
          (filename ? ` · ${filename}` : "") +
          (finishedAt ? ` · finalizado ${finishedAt}` : "") +
          (signedUrl ? ` · ${signedUrl}` : "");

        await supabase
          .from("deals")
          .update({
            stage: "closed_won",
            probability: 100,
            notes: (existingDeal.notes || "") + note,
          })
          .eq("id", existingDeal.id);

        dealId = existingDeal.id;
        console.log(`[Clicksign Webhook] Deal ${dealId} marked closed_won (doc ${docKey})`);
      } else {
        console.log(`[Clicksign Webhook] No deal found for document key: ${docKey}`);
      }
    } else {
      console.log(`[Clicksign Webhook] Event '${eventName}' acknowledged (no deal action)`);
    }

    await markWebhookEventStatus(supabase, "clicksign", eventKey, "processed", {
      event: eventName,
      document_key: docKey,
      deal_id: dealId,
    });

    return json({ success: true, event: eventName, deal_id: dealId }, 200);
  } catch (error) {
    console.error("[Clicksign Webhook] Error:", error);
    try {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (supabaseForCatch && parsedEventKey) {
        await markWebhookEventStatus(
          supabaseForCatch,
          "clicksign",
          parsedEventKey,
          "failed",
          { error: errorMessage },
        );
      }
    } catch {
      // ignore secondary errors
    }
    return json({ error: "Internal server error" }, 500);
  }
});
