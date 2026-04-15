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

// Cache: se o hash das mensagens bater e análise for < CACHE_TTL_MINUTES,
// serve do cache (não consome rate limit, não chama GPT).
const CACHE_TTL_MINUTES = 60;

async function hashMessages(messages: Array<{ text: string; sender: string }>): Promise<string> {
    const last = messages.slice(-30);
    const input = last.map((m) => `${m.sender}:${m.text}`).join("\n");
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

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
  "nextAction": "proxima acao recomendada (ex: 'Enviar proposta', 'Agendar call', 'Fazer follow-up em 2 dias')",
  "learnings": [
    {
      "type": "tone_sample" | "objection_pattern" | "preference" | "fact" | "learning",
      "content": "texto curto e especifico do aprendizado",
      "confidence": 0.0-1.0,
      "about": "seller" | "lead" | "company"
    }
  ]
}

SOBRE "learnings" (aprendizados para memoria da Eva):
- Extraia 0-3 aprendizados por conversa, APENAS se forem realmente uteis para futuras interacoes
- tone_sample: como o VENDEDOR fala/aborda (ex: "Usa tom informal e bem-humorado com leads")
- objection_pattern: objecao recorrente vista (ex: "Leads questionam preco antes de ver o valor do produto")
- preference: preferencia do vendedor ou lead (ex: "Lead prefere audio a texto longo")
- fact: fato util (ex: "Empresa do lead tem 50 funcionarios")
- learning: padrao geral (ex: "Fechamentos sao mais rapidos quando proposta vem com video")
- Se nao houver nada relevante para aprender, retorne array vazio []
- confidence: 0.6+ para observacoes claras, 0.8+ para padroes repetidos

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

        const body = await req.json();
        const { messages, contactName, contactPhone } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return json(400, { error: "messages array is required" });
        }

        // ─── CACHE CHECK (Fase 5 — economia) ────────────────────────────────
        // Computa hash das últimas 30 mensagens. Se encontrarmos análise
        // recente (< 1h) com mesmo hash, servimos do cache sem consumir GPT
        // nem rate limit. Falha silenciosa se tabela não existir ainda.
        const messagesHash = await hashMessages(messages);
        if (contactPhone) {
            try {
                const cutoff = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString();
                const { data: cached } = await adminSupabase
                    .from("conversation_summaries")
                    .select("cached_analysis, analyzed_at")
                    .eq("user_id", user.id)
                    .eq("chat_phone", contactPhone)
                    .eq("messages_hash", messagesHash)
                    .gte("analyzed_at", cutoff)
                    .maybeSingle();

                if (cached?.cached_analysis) {
                    console.log("[whatsapp-copilot] cache HIT for", contactPhone);
                    // Rate limit check (não consome, só lê) pra saber quanto sobra
                    const peek = await consumeRateLimit(
                        adminSupabase,
                        `whatsapp-copilot:user:${user.id}:peek`,
                        DAILY_LIMIT_PER_USER,
                        WINDOW_SECONDS,
                    );
                    return json(200, {
                        success: true,
                        analysis: cached.cached_analysis,
                        model: "cached",
                        cached: true,
                        cachedAt: cached.analyzed_at,
                        remaining: peek.remaining,
                        dailyLimit: DAILY_LIMIT_PER_USER,
                    });
                }
            } catch (cacheErr) {
                console.warn("[whatsapp-copilot] cache lookup failed:", cacheErr);
            }
        }

        // Rate limit: 10 requests per user per day (só se cache não bateu)
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

        // Build conversation context for GPT
        const conversationText = messages
            .slice(-30) // Last 30 messages for context
            .map((msg: any) => {
                const sender = msg.sender === "me" ? "[Vendedor]" : "[Lead]";
                return `${sender}: ${msg.text}`;
            })
            .join("\n");

        // ─── Eva Memory — Fase 4 (memória aplicada) ─────────────────────────
        // Busca memórias relevantes do vendedor + empresa para personalizar a análise
        let memoryContext = "";
        try {
            const { data: profileForMemory } = await adminSupabase
                .from("profiles")
                .select("company_id, nome")
                .eq("id", user.id)
                .single();

            if (profileForMemory?.company_id) {
                const { data: memories } = await adminSupabase
                    .from("eva_memory")
                    .select("id, type, content, confidence, user_id")
                    .eq("company_id", profileForMemory.company_id)
                    .or(`user_id.eq.${user.id},user_id.is.null`)
                    .gte("confidence", 0.5)
                    .order("last_used_at", { ascending: false, nullsFirst: false })
                    .limit(15);

                if (memories && memories.length > 0) {
                    const sellerMems = memories.filter((m: any) => m.user_id === user.id);
                    const companyMems = memories.filter((m: any) => m.user_id === null);

                    const formatMem = (m: any) => `- [${m.type}] ${m.content} (conf: ${m.confidence})`;

                    const parts: string[] = [];
                    if (sellerMems.length > 0) {
                        parts.push(`Sobre este vendedor (${profileForMemory.nome || "voce"}):\n${sellerMems.map(formatMem).join("\n")}`);
                    }
                    if (companyMems.length > 0) {
                        parts.push(`Sobre a empresa:\n${companyMems.map(formatMem).join("\n")}`);
                    }

                    if (parts.length > 0) {
                        memoryContext = `\n\nMEMORIA DA EVA (use para personalizar tom e abordagem):\n${parts.join("\n\n")}`;
                    }

                    // Marca memórias como usadas (incrementa usage_count + last_used_at)
                    const memIds = memories.map((m: any) => m.id).filter(Boolean);
                    if (memIds.length > 0) {
                        adminSupabase.rpc("eva_touch_memories", { p_ids: memIds }).then(
                            () => {},
                            () => {}, // silently ignore if RPC doesn't exist yet
                        );
                    }
                }
            }
        } catch (memErr) {
            console.warn("[whatsapp-copilot] memory fetch failed:", memErr);
        }

        const userPrompt = `Contato: ${contactName || "Desconhecido"}${contactPhone ? ` (${contactPhone})` : ""}

Conversa recente:
${conversationText}${memoryContext}

Analise a conversa e retorne o JSON com sua analise e sugestoes. ${memoryContext ? "IMPORTANTE: adapte o tom do draft conforme o estilo do vendedor descrito na memoria." : ""}`;

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

        // ─── Persist conversation summary (Eva Unified — Fase 1) ────────────
        // Best-effort: não falha a requisição se o upsert quebrar (tabela pode
        // não existir ainda em ambientes sem migration aplicada).
        console.log("[eva-persist] starting persistence for user:", user.id, "phone:", contactPhone);
        try {
            const { data: profile, error: profileErr } = await adminSupabase
                .from("profiles")
                .select("company_id")
                .eq("id", user.id)
                .single();

            if (profileErr) console.error("[eva-persist] profile fetch error:", profileErr);
            console.log("[eva-persist] profile.company_id:", profile?.company_id, "contactPhone:", contactPhone);

            if (!profile?.company_id) console.error("[eva-persist] SKIPPED — profile sem company_id");
            if (!contactPhone) console.error("[eva-persist] SKIPPED — contactPhone vazio");

            if (profile?.company_id && contactPhone) {
                // Resumo conciso pro gestor: 1-2 frases
                const summaryText = [
                    analysis.sentiment,
                    analysis.nextAction ? `Próximo: ${analysis.nextAction}` : null,
                    analysis.objections?.length
                        ? `Objeções: ${analysis.objections.slice(0, 2).join("; ")}`
                        : null,
                ]
                    .filter(Boolean)
                    .join(". ");

                const { error: upsertError } = await adminSupabase
                    .from("conversation_summaries")
                    .upsert(
                        {
                            company_id: profile.company_id,
                            user_id: user.id,
                            chat_phone: contactPhone,
                            chat_name: contactName || null,
                            summary: summaryText || analysis.sentiment || "Conversa analisada",
                            temperature: analysis.temperature || null,
                            sentiment: analysis.sentiment || null,
                            stage_suggestion: analysis.stage || null,
                            next_action: analysis.nextAction || null,
                            strategy: Array.isArray(analysis.strategy) ? analysis.strategy : [],
                            objections: Array.isArray(analysis.objections) ? analysis.objections : [],
                            message_count: messages.length,
                            last_message_at: new Date().toISOString(),
                            last_draft: analysis.draft || null,
                            messages_hash: messagesHash,
                            cached_analysis: analysis,
                            analyzed_at: new Date().toISOString(),
                        },
                        { onConflict: "user_id,chat_phone" },
                    );

                if (upsertError) {
                    console.error("[eva-persist] SUMMARY UPSERT FAILED:", JSON.stringify(upsertError));
                } else {
                    console.log("[eva-persist] ✅ summary upserted for", contactPhone);
                }

                // ─── Eva Memory — Fase 3 (auto-learning com dedup) ──────────
                if (Array.isArray(analysis.learnings) && analysis.learnings.length > 0) {
                    const validTypes = ["fact", "preference", "tone_sample", "objection_pattern", "learning"];
                    const validLearnings = analysis.learnings
                        .filter((l: any) =>
                            l && typeof l.content === "string" && l.content.trim().length > 0 &&
                            validTypes.includes(l.type)
                        )
                        .slice(0, 3);

                    // Usa RPC com dedup em vez de INSERT direto — se já existir
                    // memória similar, reforça confidence em vez de duplicar.
                    for (const l of validLearnings) {
                        const { error: memError } = await adminSupabase.rpc(
                            "eva_smart_insert_memory",
                            {
                                p_company_id: profile.company_id,
                                p_user_id: l.about === "company" ? null : user.id,
                                p_type: l.type,
                                p_content: l.content.trim().slice(0, 500),
                                p_source: "whatsapp",
                                p_confidence: typeof l.confidence === "number"
                                    ? Math.max(0, Math.min(1, l.confidence))
                                    : 0.6,
                                p_metadata: {
                                    chat_phone: contactPhone,
                                    chat_name: contactName || null,
                                    about: l.about || "unknown",
                                },
                            },
                        );
                        if (memError) {
                            console.warn("[whatsapp-copilot] eva_smart_insert_memory failed:", memError.message);
                        }
                    }
                }
            }
        } catch (summaryError) {
            console.error("[eva-persist] persistence THREW:", summaryError);
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
