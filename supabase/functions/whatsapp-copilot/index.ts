// Supabase Edge Function: WhatsApp Sales Copilot
// Analyzes conversation context and provides AI-powered sales assistance

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Daily limit per user (resets every 24h)
const DAILY_LIMIT_PER_USER = 10;
const WINDOW_SECONDS = 86400; // 24 hours

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

const SYSTEM_PROMPT = `Voce e o Copiloto de Vendas do Vyzon, um assistente de IA integrado ao WhatsApp do vendedor.

Seu papel: analisar a conversa em tempo real e ajudar o vendedor a fechar mais negocios.

CONTEXTO: Voce esta lendo mensagens de WhatsApp entre um vendedor e um lead/cliente. As mensagens marcadas com [Vendedor] sao do usuario e [Lead] sao do cliente.

VOCE DEVE RETORNAR UM JSON VALIDO com esta estrutura exata:
{
  "sentiment": "string curta descrevendo o sentimento/momento do lead (ex: 'Interessado mas com objecao de preco', 'Pronto para fechar', 'Frio - precisa de reengajamento')",
  "temperature": "quente" | "morno" | "frio",
  "stage": "string curta do estagio no funil (ex: 'Prospeccao', 'Qualificacao', 'Proposta', 'Negociacao', 'Fechamento')",
  "strategy": ["array de 2-3 dicas taticas curtas e diretas para o vendedor usar AGORA"],
  "draft": "mensagem pronta para o vendedor copiar e enviar ao lead. Deve ser natural, em portugues brasileiro coloquial de WhatsApp, sem parecer robótica. Use emojis com moderacao.",
  "objections": ["array de objecoes detectadas na conversa, ou vazio se nenhuma"],
  "nextAction": "proxima acao recomendada (ex: 'Enviar proposta', 'Agendar call', 'Fazer follow-up em 2 dias')"
}

REGRAS:
- Sempre responda em portugues brasileiro
- Seja direto e pratico - o vendedor esta no meio de uma conversa
- A mensagem draft deve ser pronta pra colar no WhatsApp (tom informal mas profissional)
- Se detectar objecao, foque a estrategia em contorna-la
- Se o lead estiver quente, foque em avancar para o fechamento
- Se estiver frio, sugira reengajamento com valor
- Nunca sugira desconto como primeira opcao
- Foque em valor, ROI e urgencia
- Adapte o tom ao contexto da conversa
- SEMPRE retorne JSON valido, sem markdown, sem code blocks`;

async function consumeRateLimit(
    adminClient: any,
    bucket: string,
    limit: number,
    windowSeconds: number,
) {
    try {
        const { data, error } = await adminClient.rpc("consume_rate_limit", {
            p_bucket: bucket,
            p_limit: limit,
            p_window_seconds: windowSeconds,
        });
        if (error) {
            const msg = String(error.message || "").toLowerCase();
            // If the function doesn't exist yet, allow the request
            if (msg.includes("consume_rate_limit")) {
                return { enabled: false, allowed: true, remaining: limit };
            }
            throw error;
        }
        const row = Array.isArray(data) ? data[0] : data;
        return {
            enabled: true,
            allowed: row?.allowed !== false,
            remaining: Math.max(0, limit - (row?.current_count || 0)),
            resetAt: row?.reset_at ?? null,
        };
    } catch (error) {
        console.warn("[whatsapp-copilot] rate limit unavailable:", error);
        return { enabled: false, allowed: true, remaining: limit };
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        if (!OPENAI_API_KEY) {
            return json(500, {
                error: "OPENAI_API_KEY nao configurada",
                code: "OPENAI_NOT_CONFIGURED",
            });
        }

        // Auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return json(401, { error: "Unauthorized" });

        const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: { user }, error: userError } = await userSupabase.auth.getUser();
        if (userError || !user) return json(401, { error: "Unauthorized" });

        // Rate limit: 10 requests per user per day
        const rateLimit = await consumeRateLimit(
            adminSupabase,
            `whatsapp-copilot:user:${user.id}`,
            DAILY_LIMIT_PER_USER,
            WINDOW_SECONDS,
        );

        if (!rateLimit.allowed) {
            return json(429, {
                error: `Limite diario de ${DAILY_LIMIT_PER_USER} analises atingido. Tente novamente amanha.`,
                code: "RATE_LIMITED",
                remaining: 0,
                resetAt: rateLimit.resetAt,
            });
        }

        const body = await req.json();
        const { messages, contactName, contactPhone } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return json(400, { error: "messages array is required" });
        }

        // Build conversation context for GPT
        const conversationText = messages
            .slice(-30) // Last 30 messages for context
            .map((msg: any) => {
                const sender = msg.sender === "me" ? "[Vendedor]" : "[Lead]";
                return `${sender}: ${msg.text}`;
            })
            .join("\n");

        const userPrompt = `Contato: ${contactName || "Desconhecido"}${contactPhone ? ` (${contactPhone})` : ""}

Conversa recente:
${conversationText}

Analise a conversa e retorne o JSON com sua analise e sugestoes.`;

        // Call GPT-4o-mini
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.4,
                max_tokens: 800,
                response_format: { type: "json_object" },
            }),
        });

        if (!openaiResponse.ok) {
            const errBody = await openaiResponse.text();
            console.error("[whatsapp-copilot] OpenAI error:", errBody);
            return json(502, { error: "Erro ao consultar IA", code: "OPENAI_ERROR" });
        }

        const completion = await openaiResponse.json();
        const content = completion.choices?.[0]?.message?.content;

        if (!content) {
            return json(502, { error: "Resposta vazia da IA" });
        }

        // Parse the JSON response
        let analysis;
        try {
            const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            analysis = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("[whatsapp-copilot] Failed to parse GPT response:", content);
            return json(502, { error: "Resposta invalida da IA", raw: content });
        }

        return json(200, {
            success: true,
            analysis,
            model: "gpt-4o-mini",
            tokens: completion.usage?.total_tokens || null,
            remaining: rateLimit.remaining > 0 ? rateLimit.remaining - 1 : 0,
            dailyLimit: DAILY_LIMIT_PER_USER,
        });
    } catch (error) {
        console.error("[whatsapp-copilot] error:", error);
        return json(500, { error: "Internal server error" });
    }
});
