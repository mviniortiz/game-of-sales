// Supabase Edge Function: Grupo OLX / ZAP / VivaReal — Lead Webhook Receiver
//
// Recebe leads de portais imobiliários do Grupo OLX (ZAP Imóveis,
// VivaReal, antigo Grupo Zap). Cada lead vira um deal em stage 'lead'
// com lead_source = portal de origem (zap/vivareal/olx).
//
// Schema do payload e segurança são FIÉIS à doc oficial:
//   https://developers.grupozap.com/webhooks/integration_leads.html
//   https://developers.grupozap.com/webhooks/security.html
//   (repo de referência: github.com/grupozap/crm-lead-integration)
//
// Doc — modelo de entrega:
//   - Um POST por lead. Resposta 2xx = recebido com sucesso.
//   - 3xx/4xx/5xx → reprocessamento: 3 tentativas, armazenado até 14 dias.
//
// Doc — segurança (Basic Auth):
//   Header: Authorization: Basic base64("vivareal:<SECRET_KEY>")
//   A SECRET_KEY é provida por CRM. Validamos comparando o trecho
//   após o ':' contra o secret configurado (integration_configs.hottok,
//   platform = 'grupozap'). Fail-CLOSED: sem header ou secret → 401.
//
// Doc — campos do payload de lead:
//   leadOrigin        String  "Grupo OLX" (origem; pode trazer Zap/VivaReal)
//   timestamp         String  ISO de criação do lead
//   originLeadId      String  id único do lead no Grupo Zap (idempotência)
//   originListingId   String  id do anúncio/imóvel no Grupo Zap
//   clientListingId   String  id do anúncio no CRM (associação ao empreendimento)
//   name              String  nome do consumidor
//   email             String  email do consumidor
//   ddd               String  DDD do telefone
//   phone             String  telefone sem DDD
//   phoneNumber       String  [deprecado] telefone completo
//   message           String  mensagem do consumidor
//   temperature       String  "Baixa" | "Média" | "Alta"
//   transactionType   String  "RENT" | "SELL"
//   extraData.leadType String CLICK_SCHEDULE | CLICK_WHATSAPP | CONTACT_CHAT |
//                             CONTACT_FORM | PHONE_VIEW | VISIT_REQUEST
//
// verify_jwt = false (público). Roda com service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GrupoZapLead {
  leadOrigin?: string;
  timestamp?: string;
  originLeadId?: string;
  originListingId?: string;
  clientListingId?: string;
  name?: string;
  email?: string;
  ddd?: string;
  phone?: string;
  phoneNumber?: string;
  message?: string;
  temperature?: string;
  transactionType?: string;
  extraData?: Record<string, unknown>;
  [k: string]: unknown;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Comparação em tempo constante (timing-safe) — padrão do projeto.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Extrai o secret do header Basic Auth: Basic base64("usuario:secret").
// Por doc, o formato decodificado é "vivareal:<SECRET_KEY>" — pegamos o
// trecho após o PRIMEIRO ':' (o secret pode, em tese, conter ':').
function extractBasicSecret(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  let decoded: string;
  try {
    decoded = atob(m[1].trim());
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  const secret = decoded.slice(idx + 1).trim();
  return secret || null;
}

// Mapeia o portal de origem para um lead_source curto e estável.
function mapLeadSource(leadOrigin: string | undefined): string {
  const s = (leadOrigin || "").toLowerCase();
  if (s.includes("vivareal") || s.includes("viva real")) return "vivareal";
  if (s.includes("zap")) return "zap";
  if (s.includes("olx")) return "olx";
  // Default: a marca guarda-chuva atual é "Grupo OLX".
  return "grupozap";
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
    console.warn("[GrupoZap Webhook] idempotency unavailable:", error);
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
    console.warn("[GrupoZap Webhook] mark status warning:", error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let parsedPayload: GrupoZapLead | null = null;
  let parsedEventKey: string | null = null;
  let supabaseForCatch: any = null;

  try {
    // ─── Auth fail-CLOSED ─────────────────────────────────────────────
    const incomingSecret = extractBasicSecret(req.headers.get("authorization"));
    if (!incomingSecret) {
      console.error("[GrupoZap Webhook] Missing/invalid Authorization Basic header");
      return json({ error: "Unauthorized - missing credentials" }, 401);
    }

    const payload: GrupoZapLead = await req.json();
    parsedPayload = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    supabaseForCatch = supabase;

    // ─── Encontra a empresa cujo secret bate (timing-safe) ────────────
    const { data: configs, error: configError } = await supabase
      .from("integration_configs")
      .select("*")
      .eq("platform", "grupozap")
      .eq("is_active", true);

    if (configError || !configs || configs.length === 0) {
      console.error("[GrupoZap Webhook] No active grupozap configuration found");
      await supabase.from("webhook_logs").insert({
        platform: "grupozap",
        event_type: "lead",
        payload,
        status: "error",
        error_message: "No active grupozap configuration found",
      });
      return json({ error: "Unauthorized" }, 401);
    }

    let matchedConfig: any = null;
    for (const config of configs) {
      const secret = config.hottok;
      if (secret && timingSafeEqualStr(incomingSecret, String(secret))) {
        matchedConfig = config;
        break;
      }
    }

    if (!matchedConfig) {
      console.error("[GrupoZap Webhook] Invalid secret - no matching configuration");
      await supabase.from("webhook_logs").insert({
        platform: "grupozap",
        event_type: "lead",
        payload,
        status: "error",
        error_message: "Invalid secret - no matching grupozap configuration",
      });
      return json({ error: "Unauthorized" }, 401);
    }

    const companyId = matchedConfig.company_id;
    let userId = matchedConfig.user_id;

    // ─── Idempotência pelo id do lead no Grupo Zap ────────────────────
    // originLeadId é o id estável do lead. Fallback: hash dos contatos.
    const leadId =
      payload.originLeadId ||
      payload.clientListingId ||
      `${payload.email || ""}|${payload.phone || ""}|${payload.timestamp || ""}`;
    const eventKey = `lead:${leadId}`;
    parsedEventKey = eventKey;

    const idempotency = await claimWebhookEvent(supabase, "grupozap", eventKey, {
      origin: payload.leadOrigin || null,
      origin_lead_id: payload.originLeadId || null,
      company_id: companyId,
    });
    if (!idempotency.claimed) {
      console.log(`[GrupoZap Webhook] Duplicate lead ignored: ${eventKey}`);
      return json({ success: true, duplicate: true }, 200);
    }

    // ─── Owner ────────────────────────────────────────────────────────
    if (!userId) {
      const { data: companyUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", companyId)
        .order("role", { ascending: true })
        .limit(1)
        .maybeSingle();
      userId = companyUser?.id;
    }

    if (!userId) {
      await markWebhookEventStatus(supabase, "grupozap", eventKey, "ignored", {
        reason: "no_owner_available",
      });
      await supabase.from("webhook_logs").insert({
        company_id: companyId,
        platform: "grupozap",
        event_type: "lead",
        payload,
        status: "error",
        error_message: "no_owner_available",
      });
      return json({ error: "no_owner_available" }, 422);
    }

    await supabase.from("webhook_logs").insert({
      company_id: companyId,
      platform: "grupozap",
      event_type: "lead",
      payload,
      status: "processing",
    });

    // ─── Monta dados de contato ───────────────────────────────────────
    const fullPhone =
      payload.phoneNumber ||
      ([payload.ddd, payload.phone].filter(Boolean).join("") || null);
    const leadSource = mapLeadSource(payload.leadOrigin);
    const transaction = payload.transactionType === "RENT"
      ? "Locação"
      : payload.transactionType === "SELL"
      ? "Venda"
      : "";
    const channel = String((payload.extraData as any)?.leadType || "");

    const customerName =
      (payload.name && payload.name.trim()) ||
      payload.email ||
      fullPhone ||
      "Lead Grupo OLX";

    const notesParts = [
      `Lead via ${payload.leadOrigin || "Grupo OLX"}`,
      transaction ? `Transação: ${transaction}` : "",
      payload.originListingId ? `Anúncio (origem): ${payload.originListingId}` : "",
      payload.clientListingId ? `Anúncio (CRM): ${payload.clientListingId}` : "",
      payload.temperature ? `Temperatura: ${payload.temperature}` : "",
      channel ? `Canal: ${channel}` : "",
      payload.message ? `Mensagem: ${payload.message}` : "",
    ].filter(Boolean);

    // ─── Cria o deal em stage 'lead' ──────────────────────────────────
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: customerName,
        customer_name: customerName,
        customer_email: payload.email || null,
        customer_phone: fullPhone,
        stage: "lead",
        user_id: userId,
        company_id: companyId,
        source: "grupozap",
        external_id: payload.originLeadId || null,
        lead_source: leadSource,
        source_data: payload,
        notes: notesParts.join("\n"),
      })
      .select("id")
      .single();

    if (dealError) {
      console.error("[GrupoZap Webhook] Error creating deal:", dealError);
      throw dealError;
    }

    const dealId = deal?.id ?? null;
    console.log(`[GrupoZap Webhook] Created lead deal: ${dealId} (source=${leadSource})`);

    await markWebhookEventStatus(supabase, "grupozap", eventKey, "processed", {
      deal_id: dealId,
      lead_source: leadSource,
    });

    return json({ success: true, deal_id: dealId, lead_source: leadSource }, 200);
  } catch (error) {
    console.error("[GrupoZap Webhook] Error:", error);
    try {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (supabaseForCatch && parsedEventKey) {
        await markWebhookEventStatus(
          supabaseForCatch,
          "grupozap",
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
