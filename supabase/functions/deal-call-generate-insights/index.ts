import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  callId?: string;
};

async function consumeRateLimit(
  supabaseAdminClient: any,
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  try {
    const { data, error } = await supabaseAdminClient.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("consume_rate_limit")) {
        return { enabled: false, allowed: true };
      }
      throw error;
    }
    const row = Array.isArray(data) ?data[0] : data;
    return { enabled: true, allowed: row?.allowed !== false, resetAt: row?.reset_at ?? null };
  } catch (error) {
    console.warn("[deal-call-generate-insights] rate limit unavailable:", error);
    return { enabled: false, allowed: true };
  }
}

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
    nextSteps.length > 0 ?`Próximo passo: ${nextSteps[0]}.` : "",
    "Se fizer sentido, alinhamos os detalhes para avançar ainda essa semana.",
  ].filter(Boolean).join(" ");

  return {
    summary,
    objections,
    nextSteps,
    actionItems,
    suggestedMessage,
    suggestedStage,
    sentiment: null,
  };
}

interface DealContext {
  title?: string;
  stage?: string;
  value?: number;
  customer_name?: string;
}

interface LLMInsights {
  summary: string;
  objections: string[];
  nextSteps: string[];
  actionItems: string[];
  suggestedMessage: string;
  suggestedStage: string | null;
  sentiment: string | null;
}

async function generateLLMInsights(
  transcript: string,
  dealContext: DealContext,
): Promise<LLMInsights | null> {
  if (!OPENAI_API_KEY) return null;

  const systemPrompt = `Você é um assistente de vendas especializado em analisar transcrições de ligações comerciais em português brasileiro.
Analise a transcrição e o contexto do deal fornecidos e retorne APENAS um JSON válido (sem markdown, sem code fences) com a seguinte estrutura:
{
  "summary": "Resumo conciso da ligação em 2-4 frases",
  "objections": ["lista de objeções levantadas pelo cliente"],
  "next_steps": ["lista de próximos passos concretos"],
  "action_items": ["lista de ações que o vendedor deve tomar"],
  "suggested_message": "Mensagem de follow-up sugerida para enviar ao cliente",
  "suggested_stage": "lead | qualification | proposal | negotiation | null",
  "sentiment": "positive | neutral | negative | mixed"
}

Regras:
- Se não houver objeções claras, retorne um array vazio para objections
- suggested_stage deve refletir o estágio mais adequado baseado no conteúdo da conversa, ou null se não for possível determinar
- A mensagem sugerida deve ser natural, profissional e personalizada para o contexto
- Todos os campos são obrigatórios
- Retorne APENAS o JSON, sem texto adicional`;

  const dealInfo = [
    dealContext.title ? `Título do deal: ${dealContext.title}` : null,
    dealContext.stage ? `Estágio atual: ${dealContext.stage}` : null,
    dealContext.value ? `Valor: R$ ${dealContext.value.toLocaleString("pt-BR")}` : null,
    dealContext.customer_name ? `Cliente: ${dealContext.customer_name}` : null,
  ].filter(Boolean).join("\n");

  const userMessage = `Contexto do deal:\n${dealInfo}\n\nTranscrição da ligação:\n${transcript}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[deal-call-generate-insights] OpenAI API error (${response.status}):`, errBody);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error("[deal-call-generate-insights] Empty response from OpenAI");
      return null;
    }

    // Strip possible markdown code fences
    const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      summary: parsed.summary || "",
      objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      nextSteps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      actionItems: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      suggestedMessage: parsed.suggested_message || "",
      suggestedStage: parsed.suggested_stage || null,
      sentiment: parsed.sentiment || null,
    };
  } catch (error) {
    console.error("[deal-call-generate-insights] LLM insights error:", error);
    return null;
  }
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

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Support both service-role internal calls and authorized user calls
    const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    let userId: string | null = null;

    if (isServiceRole) {
      // Internal call from transcribe function - skip user auth and plan checks
      // userId will be extracted from the call record
    } else {
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

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
      userId = user.id;
    }

    const body = (await req.json()) as Body;
    if (!body.callId) {
      return new Response(JSON.stringify({ error: "callId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For service-role calls, use admin client; for user calls, use user client for RLS
    let callQuery;
    if (isServiceRole) {
      callQuery = await (adminSupabase as any)
        .from("deal_calls")
        .select("*")
        .eq("id", body.callId)
        .single();
    } else {
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      callQuery = await (userSupabase as any)
        .from("deal_calls")
        .select("*")
        .eq("id", body.callId)
        .single();
    }

    const { data: call, error: callError } = callQuery;

    if (callError || !call) {
      return new Response(JSON.stringify({ error: "Call not found or forbidden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use call's user_id for service-role calls
    if (!userId) {
      userId = call.user_id;
    }

    // Skip plan/addon checks for service-role internal calls
    if (!isServiceRole) {
      const { data: profile } = await (adminSupabase as any)
        .from("profiles")
        .select("is_super_admin")
        .eq("id", userId)
        .single();

      const isSuperAdmin = profile?.is_super_admin === true;
      if (!isSuperAdmin) {
        const { data: company } = await (adminSupabase as any)
          .from("companies")
          .select("plan")
          .eq("id", call.company_id)
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

        const { data: addonRow, error: addonError } = await (adminSupabase as any)
          .from("company_addons")
          .select("calls_enabled")
          .eq("company_id", call.company_id)
          .maybeSingle();

        if (addonError && !String(addonError.message || "").toLowerCase().includes("relation")) {
          console.error("[deal-call-generate-insights] company_addons query error:", addonError);
          return new Response(JSON.stringify({ error: "Erro ao validar add-on de ligações" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (addonRow?.calls_enabled !== true) {
          return new Response(JSON.stringify({
            error: "Add-on de Ligações não está ativo para esta empresa",
            code: "CALLS_ADDON_REQUIRED",
            current_plan: companyPlan,
            addon: "calls",
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!call.transcript_text) {
      return new Response(JSON.stringify({ error: "Call has no transcript yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = await consumeRateLimit(
      adminSupabase,
      `deal-call-insights:user:${userId}:company:${call.company_id}`,
      40,
      3600,
    );
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: "Limite de geracao de insights atingido. Tente novamente mais tarde.",
        code: "RATE_LIMITED",
        reset_at: rateLimit.resetAt ?? null,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try LLM-powered insights first; fall back to heuristics
    let modelUsed = "heuristic-v1";
    let dealContext: DealContext = {};

    // Fetch deal context for LLM
    if (OPENAI_API_KEY) {
      try {
        const { data: deal } = await (adminSupabase as any)
          .from("deals")
          .select("title, stage, value, customer_name")
          .eq("id", call.deal_id)
          .single();

        if (deal) {
          dealContext = {
            title: deal.title,
            stage: deal.stage,
            value: deal.value,
            customer_name: deal.customer_name,
          };
        }
      } catch (e) {
        console.warn("[deal-call-generate-insights] deal context fetch warning:", e);
      }
    }

    const llmResult = await generateLLMInsights(call.transcript_text, dealContext);
    const heuristicResult = extractInsights(call.transcript_text);

    let parsed: typeof heuristicResult;

    if (llmResult) {
      modelUsed = "gpt-4o-mini";
      parsed = llmResult;
      console.log("[deal-call-generate-insights] Using LLM insights (gpt-4o-mini)");
    } else {
      parsed = heuristicResult;
      console.log("[deal-call-generate-insights] Using heuristic fallback");
    }

    const payload = {
      call_id: call.id,
      deal_id: call.deal_id,
      company_id: call.company_id,
      user_id: userId,
      status: "completed",
      model: modelUsed,
      summary: parsed.summary,
      objections: parsed.objections,
      next_steps: parsed.nextSteps,
      action_items: parsed.actionItems,
      suggested_message: parsed.suggestedMessage,
      suggested_stage: parsed.suggestedStage,
      raw_output: {
        ...parsed,
        sentiment: parsed.sentiment ?? null,
      },
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
        user_id: userId,
        activity_type: "call",
        description: `Insights da ligação gerados (${modelUsed})`,
        new_value: "Resumo + objeções + próximos passos",
      });
    } catch (e) {
      console.warn("[deal-call-generate-insights] deal_activities insert warning:", e);
    }

    return new Response(JSON.stringify({ success: true, model: modelUsed, insight }), {
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
