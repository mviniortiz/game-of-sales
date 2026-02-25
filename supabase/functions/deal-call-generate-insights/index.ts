import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  callId?: string;
};

function extractInsights(transcript: string) {
  const text = transcript || "";
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lc = text.toLowerCase();

  const objectionRules = [
    { key: "preco", label: "Preço", patterns: ["preço", "valor", "caro", "investimento"] },
    { key: "prazo", label: "Prazo", patterns: ["prazo", "tempo", "quando", "deadline"] },
    { key: "suporte", label: "Suporte", patterns: ["suporte", "acompanhamento", "pós-venda"] },
    { key: "decisor", label: "Decisão compartilhada", patterns: ["sócio", "time", "aprovar", "decidir"] },
    { key: "concorrencia", label: "Comparação com concorrente", patterns: ["concorr", "outra empresa", "comparando"] },
  ];

  const objections = objectionRules
    .filter((rule) => rule.patterns.some((pattern) => lc.includes(pattern)))
    .map((rule) => rule.label);

  const nextSteps: string[] = [];
  if (lc.includes("proposta")) nextSteps.push("Enviar proposta personalizada");
  if (lc.includes("amanhã") || lc.includes("retorno")) nextSteps.push("Agendar follow-up para amanhã");
  if (lc.includes("sócio") || lc.includes("decidir")) nextSteps.push("Confirmar decisor e prazo de resposta");
  if (nextSteps.length === 0) nextSteps.push("Registrar próximo contato e confirmar necessidade principal");

  const actionItems = [
    "Registrar resumo da call no deal",
    ...nextSteps,
  ];

  const summary = lines.slice(0, 4).join(" ").slice(0, 500);

  let suggestedStage: string | null = null;
  if (lc.includes("proposta")) suggestedStage = "proposal";
  else if (lc.includes("negoci")) suggestedStage = "negotiation";
  else if (lc.includes("entender") || lc.includes("necessidade")) suggestedStage = "qualification";

  const suggestedMessage = [
    "Olá! Conforme nossa conversa, vou te enviar o material combinado.",
    nextSteps.length > 0 ? `Próximo passo: ${nextSteps[0]}.` : "",
    "Se fizer sentido, alinhamos os detalhes para avançar ainda essa semana.",
  ].filter(Boolean).join(" ");

  return {
    summary,
    objections,
    nextSteps,
    actionItems,
    suggestedMessage,
    suggestedStage,
  };
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

    const body = (await req.json()) as Body;
    if (!body.callId) {
      return new Response(JSON.stringify({ error: "callId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: call, error: callError } = await (userSupabase as any)
      .from("deal_calls")
      .select("*")
      .eq("id", body.callId)
      .single();

    if (callError || !call) {
      return new Response(JSON.stringify({ error: "Call not found or forbidden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!call.transcript_text) {
      return new Response(JSON.stringify({ error: "Call has no transcript yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = extractInsights(call.transcript_text);

    const payload = {
      call_id: call.id,
      deal_id: call.deal_id,
      company_id: call.company_id,
      user_id: user.id,
      status: "completed",
      model: "heuristic-mvp-v1",
      summary: parsed.summary,
      objections: parsed.objections,
      next_steps: parsed.nextSteps,
      action_items: parsed.actionItems,
      suggested_message: parsed.suggestedMessage,
      suggested_stage: parsed.suggestedStage,
      raw_output: parsed,
    };

    const { data: insight, error: insightError } = await (adminSupabase as any)
      .from("deal_call_insights")
      .upsert(payload, { onConflict: "call_id" })
      .select("*")
      .single();

    if (insightError) {
      console.error("[deal-call-generate-insights] upsert error:", insightError);
      return new Response(JSON.stringify({ error: insightError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await (adminSupabase as any).from("deal_activities").insert({
        deal_id: call.deal_id,
        company_id: call.company_id,
        user_id: user.id,
        activity_type: "call",
        description: "Insights da ligação gerados",
        new_value: "Resumo + objeções + próximos passos",
      });
    } catch (e) {
      console.warn("[deal-call-generate-insights] deal_activities insert warning:", e);
    }

    return new Response(JSON.stringify({ success: true, insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[deal-call-generate-insights] error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
