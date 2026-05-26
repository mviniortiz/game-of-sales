// ─────────────────────────────────────────────────────────────────────────────
// F4E.5 (2026-05-21) — generate-eva-context-suggestions
//
// Lê eva_training_documents.raw_text e gera sugestões estruturadas de
// contexto pra EVA. As sugestões ficam em eva_context_suggestions com
// status='pending' — NÃO altera eva_business_context. Aprovação é manual.
//
// MANUAL: só roda quando o user clica "Gerar sugestões" na UI.
// Sem cron, sem trigger, sem chamada automática.
//
// Anti-alucinação:
//   - "Se não estiver explícito no documento, não sugira."
//   - "Preço só se aparecer no texto."
//   - "Promessa proibida apenas se o texto indicar risco."
//   - "Serviços precisam ter evidência textual (citar trecho)."
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const MODEL = "gpt-5.4-nano";
const MAX_DOC_CHARS = 30_000; // hard cap pra não estourar tokens

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

const SYSTEM_PROMPT = `Você é uma extratora estruturada de contexto comercial para um CRM de agências de marketing.

Sua tarefa: ler o texto enviado por um admin de agência e gerar SUGESTÕES de contexto pra EVA usar como base ao analisar conversas de vendas.

Tipos de sugestão (campo "suggestion_type"):
- "agency": fatos da agência (nicho, posicionamento, diferencial, equipe, ano de fundação).
- "service": serviço oferecido (nome, descrição curta, preço se houver, gatilho ideal de venda).
- "icp": perfil de cliente ideal (porte, faturamento, segmento, ticket alvo).
- "playbook": etapas/passos de venda ("ao mencionar preço, fazer X").
- "tone": tom de voz/regras de comunicação (formalidade, gírias proibidas, emojis).
- "forbidden_promise": promessas explicitamente proibidas (ex: "não prometer ROI antes do diagnóstico").
- "faq": pergunta frequente + resposta canônica.
- "objection": objeção comum + resposta sugerida.

Regras estritas:
1. NUNCA invente dados. Se algo não está explícito no texto, NÃO sugira.
2. Preço só aparece se o texto cita preço.
3. Promessas proibidas só se o texto mencionar risco/cuidado.
4. Cada sugestão tem "title" curto (5-12 palavras) e "content" JSONB estruturado.
5. "confidence" 0-1: 0.9+ quando o texto é literal, 0.5-0.8 quando interpretado, abaixo de 0.5 → NÃO incluir.
6. Limite total: até 12 sugestões. Priorize as mais úteis pra qualificação de leads.

Retorne JSON estrito:
{
  "suggestions": [
    {
      "suggestion_type": "service",
      "title": "Gestão de tráfego pago Meta + Google",
      "content": {
        "name": "Tráfego pago Meta + Google",
        "description": "...",
        "evidence": "trecho do texto que sustenta a sugestão"
      },
      "confidence": 0.9
    }
  ]
}`;

interface RawSuggestion {
  suggestion_type: string;
  title: string;
  content: Record<string, unknown>;
  confidence: number;
}

const VALID_TYPES = new Set([
  "agency", "service", "icp", "playbook",
  "tone", "forbidden_promise", "faq", "objection",
]);

function normalizeSuggestions(raw: unknown): RawSuggestion[] {
  if (!raw || typeof raw !== "object") return [];
  const arr = (raw as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(arr)) return [];
  const out: RawSuggestion[] = [];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const t = typeof rec.suggestion_type === "string" ? rec.suggestion_type : null;
    const title = typeof rec.title === "string" ? rec.title.trim() : null;
    const content = (rec.content && typeof rec.content === "object")
      ? rec.content as Record<string, unknown>
      : null;
    const confidence = typeof rec.confidence === "number" ? rec.confidence : 0;
    if (!t || !VALID_TYPES.has(t) || !title || !content) continue;
    if (confidence < 0.5) continue; // hard floor (regra 5)
    out.push({
      suggestion_type: t,
      title: title.slice(0, 140),
      content,
      confidence: Math.min(1, Math.max(0, confidence)),
    });
  }
  return out.slice(0, 12);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // Auth do usuário (não service role) pra RLS funcionar nas verificações
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "missing_auth" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "invalid_auth" });

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { documentId?: string } = {};
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const documentId = body.documentId;
  if (!documentId) return json(400, { error: "missing_documentId" });

  // Lê documento via RLS — garante ownership
  const { data: doc, error: docErr } = await userClient
    .from("eva_training_documents")
    .select("id, company_id, raw_text, status, file_name")
    .eq("id", documentId)
    .maybeSingle();
  if (docErr || !doc) {
    return json(404, { error: "document_not_found" });
  }
  if (!doc.raw_text || doc.raw_text.trim().length < 30) {
    return json(400, { error: "no_raw_text", code: "DOCUMENT_EMPTY" });
  }

  // Marca processing via service-role (bypass RLS pra status do bot)
  await adminClient
    .from("eva_training_documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId);

  try {
    if (!OPENAI_API_KEY) throw new Error("missing_openai_key");

    const text = (doc.raw_text as string).slice(0, MAX_DOC_CHARS);
    const userPrompt = `Texto enviado pela agência ("${doc.file_name}"):\n\n${text}\n\nGere as sugestões em JSON estrito conforme o schema.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[generate-eva-context-suggestions] OpenAI ${resp.status}:`, errBody.slice(0, 300));
      throw new Error(`openai_${resp.status}`);
    }
    const completion = await resp.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty_response");

    let parsed: unknown;
    try {
      const cleaned = String(content).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("invalid_json_response");
    }
    const suggestions = normalizeSuggestions(parsed);

    // Insere sugestões via service-role (UI usa RLS pra ler)
    if (suggestions.length > 0) {
      const rows = suggestions.map((s) => ({
        company_id: doc.company_id,
        document_id: doc.id,
        suggestion_type: s.suggestion_type,
        title: s.title,
        content: s.content,
        confidence: s.confidence,
        status: "pending",
      }));
      const { error: insErr } = await adminClient
        .from("eva_context_suggestions")
        .insert(rows);
      if (insErr) {
        console.error("[generate-eva-context-suggestions] insert error:", insErr);
        throw new Error(`insert_error:${insErr.message?.slice(0, 100)}`);
      }
    }

    await adminClient
      .from("eva_training_documents")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        metadata: { suggestions_generated: suggestions.length, model: MODEL },
      })
      .eq("id", documentId);

    return json(200, {
      ok: true,
      document_id: documentId,
      suggestions_generated: suggestions.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-eva-context-suggestions] failed:", msg);
    await adminClient
      .from("eva_training_documents")
      .update({
        status: "failed",
        error_message: msg.slice(0, 200),
      })
      .eq("id", documentId);
    return json(500, { ok: false, error: msg });
  }
});
