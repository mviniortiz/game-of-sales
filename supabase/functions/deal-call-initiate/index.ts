import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InitiateBody = {
  dealId?: string;
  sellerPhone?: string | null;
  customerPhone?: string | null;
  mode?: "demo" | "twilio";
};

const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

function buildDemoTranscript(customerName: string, dealTitle: string) {
  return [
    "Vendedor: Olá, tudo bem? Estou entrando em contato sobre sua negociação.",
    `Cliente: Oi, tudo! Sim, sobre ${dealTitle || "a proposta"}, eu queria entender melhor o valor.`,
    "Vendedor: Perfeito. Posso te explicar o que está incluso e como funciona a implementação.",
    "Cliente: Meu ponto principal é prazo e se vocês oferecem suporte após a entrega.",
    "Vendedor: Sim, temos suporte e consigo te enviar uma proposta ajustada ainda hoje.",
    `Cliente: Ótimo, ${customerName || "eu"} vou analisar com o sócio e te respondo.`,
    "Vendedor: Combinado, vou te mandar a proposta e retornamos amanhã para fechar os próximos passos.",
  ].join("\n");
}

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  // If already contains country code (common E.164 without +)
  if (digits.length >= 12) return `+${digits}`;

  // BR local/mobile patterns
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return phone.startsWith("+") ? phone : `+${digits}`;
}

async function createTwilioCall(params: {
  to: string;
  from: string;
  twimlUrl: string;
  statusCallback: string;
}) {
  const body = new URLSearchParams({
    To: params.to,
    From: params.from,
    Url: params.twimlUrl,
    Method: "POST",
    StatusCallback: params.statusCallback,
    StatusCallbackMethod: "POST",
    StatusCallbackEvent: "initiated ringing answered completed",
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(parsed?.message || `Twilio call create failed (${response.status})`);
  }

  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const body = (await req.json()) as InitiateBody;
    const dealId = body.dealId;
    const mode = body.mode || "demo";

    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch via user client to honor RLS access.
    const { data: deal, error: dealError } = await userSupabase
      .from("deals")
      .select("id, title, customer_name, customer_phone, company_id")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found or forbidden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await (adminSupabase as any)
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.is_super_admin === true;
    if (!isSuperAdmin) {
      const { data: company } = await (adminSupabase as any)
        .from("companies")
        .select("plan")
        .eq("id", (deal as any).company_id)
        .single();

      const companyPlan = String(company?.plan || "starter").toLowerCase();
      if (!["plus", "pro"].includes(companyPlan)) {
        return new Response(JSON.stringify({
          error: "Ligações disponíveis apenas nos planos Plus e Pro",
          code: "PLAN_UPGRADE_REQUIRED",
          required_plan: "plus",
          current_plan: companyPlan,
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const sellerPhoneRaw = body.sellerPhone || null;
    const customerPhoneRaw = body.customerPhone || (deal as any).customer_phone || null;
    const sellerPhone = normalizePhone(sellerPhoneRaw);
    const customerPhone = normalizePhone(customerPhoneRaw);

    if (!customerPhone && mode !== "demo") {
      return new Response(JSON.stringify({ error: "Customer phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "twilio" && !sellerPhone) {
      return new Response(JSON.stringify({ error: "Seller phone is required for Twilio click-to-call" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MVP: fully functional demo path (persists call + transcript inside deal context)
    if (mode === "demo") {
      const transcript = buildDemoTranscript((deal as any).customer_name, (deal as any).title);
      const preview = transcript.split("\n").slice(0, 2).join(" ");
      const duration = 187;
      const now = new Date();
      const startedAt = new Date(now.getTime() - duration * 1000).toISOString();
      const endedAt = now.toISOString();

      const { data: callRow, error: callError } = await (adminSupabase as any)
        .from("deal_calls")
        .insert({
          deal_id: deal.id,
          company_id: (deal as any).company_id,
          user_id: user.id,
          provider: "demo",
          status: "demo",
          seller_phone: sellerPhone,
          customer_phone: customerPhone,
          to_number: customerPhone,
          direction: "outbound",
          started_at: startedAt,
          ended_at: endedAt,
          duration_seconds: duration,
          transcript_status: "completed",
          transcript_language: "pt-BR",
          transcript_preview: preview,
          transcript_text: transcript,
          metadata: {
            source: "deal-call-initiate",
            mode: "demo",
          },
        })
        .select("*")
        .single();

      if (callError) {
        console.error("[deal-call-initiate] failed to insert demo call:", callError);
        return new Response(JSON.stringify({ error: callError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Best-effort logging in deal timeline (if tables/policies allow)
      try {
        await (adminSupabase as any).from("deal_activities").insert({
          deal_id: deal.id,
          company_id: (deal as any).company_id,
          user_id: user.id,
          activity_type: "call",
          description: "Ligação (demo) registrada com transcrição",
          new_value: `Duração: ${duration}s`,
        });
      } catch (e) {
        console.warn("[deal-call-initiate] deal_activities insert warning:", e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "demo",
          message: "Chamada demo criada com transcrição",
          call: callRow,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: queuedCall, error: queuedError } = await (adminSupabase as any)
      .from("deal_calls")
      .insert({
        deal_id: deal.id,
        company_id: (deal as any).company_id,
        user_id: user.id,
        provider: "twilio",
        status: "queued",
        seller_phone: sellerPhone,
        customer_phone: customerPhone,
        to_number: customerPhone,
        direction: "outbound",
        transcript_status: "pending",
        metadata: {
          source: "deal-call-initiate",
          mode: "twilio",
        },
      })
      .select("*")
      .single();

    if (queuedError) {
      return new Response(JSON.stringify({ error: queuedError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({
          success: false,
          mode: "twilio",
          requiresSetup: true,
          message: "Twilio não configurado (faltam envs). Use modo demo para validar o fluxo.",
          call: queuedCall,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const conferenceName = `deal-call-${queuedCall.id}`;
    const bridgeBase = `${FUNCTIONS_BASE_URL}/twilio-voice-bridge`;
    const statusBase = `${FUNCTIONS_BASE_URL}/twilio-voice-status-webhook`;

    const sellerTwimlUrl = `${bridgeBase}?call_id=${encodeURIComponent(queuedCall.id)}&leg=seller&conference=${encodeURIComponent(conferenceName)}`;
    const customerTwimlUrl = `${bridgeBase}?call_id=${encodeURIComponent(queuedCall.id)}&leg=customer&conference=${encodeURIComponent(conferenceName)}`;
    const sellerStatusCallback = `${statusBase}?call_id=${encodeURIComponent(queuedCall.id)}&leg=seller`;
    const customerStatusCallback = `${statusBase}?call_id=${encodeURIComponent(queuedCall.id)}&leg=customer`;

    try {
      // Start both legs. Customer may wait briefly in conference until seller joins.
      const sellerLeg = await createTwilioCall({
        to: sellerPhone!,
        from: TWILIO_PHONE_NUMBER,
        twimlUrl: sellerTwimlUrl,
        statusCallback: sellerStatusCallback,
      });

      const customerLeg = await createTwilioCall({
        to: customerPhone!,
        from: TWILIO_PHONE_NUMBER,
        twimlUrl: customerTwimlUrl,
        statusCallback: customerStatusCallback,
      });

      const { data: updatedCall } = await (adminSupabase as any)
        .from("deal_calls")
        .update({
          provider_call_id: customerLeg.sid,
          status: "dialing",
          metadata: {
            ...(queuedCall.metadata || {}),
            twilio: {
              conference_name: conferenceName,
              seller_call_sid: sellerLeg.sid,
              customer_call_sid: customerLeg.sid,
            },
          },
        })
        .eq("id", queuedCall.id)
        .select("*")
        .single();

      try {
        await (adminSupabase as any).from("deal_activities").insert({
          deal_id: deal.id,
          company_id: (deal as any).company_id,
          user_id: user.id,
          activity_type: "call",
          description: "Ligação iniciada via Twilio",
          new_value: `Cliente: ${customerPhone}`,
        });
      } catch (e) {
        console.warn("[deal-call-initiate] deal_activities insert warning:", e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "twilio",
          message: "Ligação iniciada via Twilio",
          call: updatedCall || queuedCall,
          twilio: {
            sellerCallSid: sellerLeg.sid,
            customerCallSid: customerLeg.sid,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (twilioError) {
      const message = twilioError instanceof Error ? twilioError.message : "Twilio error";
      await (adminSupabase as any)
        .from("deal_calls")
        .update({
          status: "failed",
          transcript_status: "not_requested",
          last_error: message,
          metadata: {
            ...(queuedCall.metadata || {}),
            twilio_error: message,
          },
        })
        .eq("id", queuedCall.id);

      return new Response(
        JSON.stringify({
          error: message,
          call: queuedCall,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("[deal-call-initiate] error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
