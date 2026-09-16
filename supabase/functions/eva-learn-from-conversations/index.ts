// ─────────────────────────────────────────────────────────────────────────────
// LEARN.1 (2026-08-24) — A EVA aprende o negócio lendo as conversas.
//
// Medido em 24/08/2026: 3 de 30 empresas tinham eva_business_context
// preenchido. O formulário existe desde sempre e quase ninguém preenche, porque
// escrever o próprio posicionamento é trabalho chato e adiável. Mas a resposta
// já está nas conversas: o que a agência vende, para quem, como ela escreve e
// que objeções ouve aparecem toda hora no WhatsApp dela.
//
// Esta edge lê os resumos de conversa e as mensagens que a própria agência
// enviou, e propõe o contexto. Não grava em eva_business_context: entra na fila
// eva_context_suggestions com status 'pending', que já tem UI de aprovar. A
// regra continua sendo a EVA sugere, o humano aprova.
//
// Toda sugestão carrega 'evidence': a frase da conversa que originou aquilo.
// Sem evidência é achismo, e achismo sobre o negócio do outro é pior que nada.
//
// Body: { company_id?, limit?, dry_run? }
// ─────────────────────────────────────────────────────────────────────────────

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");

const MODEL = "gpt-5.4-mini";
const MAX_COMPLETION_TOKENS = 3000;

/** Abaixo disso não dá para inferir negócio nenhum: seriam palpites com cara de
 *  conclusão. Melhor devolver "ainda não sei" do que inventar. */
const MIN_RESUMOS = 3;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `Você é a Eva, analista comercial do Vyzon. Vai ler conversas reais de uma empresa brasileira com os leads dela e deduzir o contexto do negócio.

REGRAS DURAS:
1. Só afirme o que as conversas mostram. Nunca complete com conhecimento geral sobre o setor.
2. Toda conclusão precisa de "evidence": um trecho curto e literal da conversa que sustenta aquilo. Sem trecho, não proponha o item.
3. Se as conversas não deixarem algo claro, devolva o campo vazio. Campo vazio é resposta correta.
4. Escreva em pt-BR, direto, sem corporativês, sem emoji, sem travessão.
5. Em "tone", descreva como ESSA empresa escreve (tratamento, tamanho de mensagem, formalidade), não como deveria escrever.

Responda SOMENTE com um objeto JSON neste formato:
{
  "agency": { "positioning": "o que a empresa faz, uma frase", "description": "parágrafo curto", "evidence": "trecho literal" },
  "icp": { "name": "rótulo do cliente ideal", "description": "quem é, pelo que aparece nas conversas", "evidence": "trecho literal" },
  "services": [ { "name": "nome do serviço ou produto", "description": "o que é", "evidence": "trecho literal" } ],
  "objections": [ { "objection": "a objeção como o lead fala", "response": "como a empresa respondeu, se apareceu", "evidence": "trecho literal" } ],
  "tone": { "name": "Tom que a empresa usa", "rules": ["regra observada", "outra regra"], "evidence": "trecho literal" }
}`;

type Peca = { tipo: string; titulo: string; conteudo: Record<string, unknown>; confianca: number };

/** Achata a resposta do modelo nas linhas que a fila de sugestão entende. Cada
 *  tipo tem o shape que a UI de aprovação já sabe aplicar. */
function pecasDaResposta(parsed: Record<string, any>): Peca[] {
    const pecas: Peca[] = [];
    const temEvidencia = (o: any) => typeof o?.evidence === "string" && o.evidence.trim().length > 0;

    if (parsed.agency?.positioning && temEvidencia(parsed.agency)) {
        pecas.push({
            tipo: "agency",
            titulo: String(parsed.agency.positioning).slice(0, 120),
            conteudo: {
                positioning: parsed.agency.positioning,
                description: parsed.agency.description ?? null,
                evidence: parsed.agency.evidence,
                source: "conversas",
            },
            confianca: 0.6,
        });
    }

    if (parsed.icp?.name && temEvidencia(parsed.icp)) {
        pecas.push({
            tipo: "icp",
            titulo: String(parsed.icp.name).slice(0, 120),
            conteudo: {
                name: parsed.icp.name,
                description: parsed.icp.description ?? null,
                evidence: parsed.icp.evidence,
                source: "conversas",
            },
            confianca: 0.6,
        });
    }

    for (const s of (Array.isArray(parsed.services) ? parsed.services : []).slice(0, 6)) {
        if (!s?.name || !temEvidencia(s)) continue;
        pecas.push({
            tipo: "service",
            titulo: String(s.name).slice(0, 120),
            conteudo: {
                name: s.name,
                description: s.description ?? null,
                evidence: s.evidence,
                source: "conversas",
            },
            confianca: 0.65,
        });
    }

    for (const o of (Array.isArray(parsed.objections) ? parsed.objections : []).slice(0, 6)) {
        if (!o?.objection || !temEvidencia(o)) continue;
        pecas.push({
            tipo: "objection",
            titulo: String(o.objection).slice(0, 120),
            conteudo: {
                objection: o.objection,
                response: o.response ?? null,
                evidence: o.evidence,
                source: "conversas",
            },
            confianca: 0.7,
        });
    }

    if (parsed.tone?.name && Array.isArray(parsed.tone?.rules) && parsed.tone.rules.length > 0 && temEvidencia(parsed.tone)) {
        pecas.push({
            tipo: "tone",
            titulo: String(parsed.tone.name).slice(0, 120),
            conteudo: {
                name: parsed.tone.name,
                rules: parsed.tone.rules.slice(0, 6),
                evidence: parsed.tone.evidence,
                source: "conversas",
            },
            confianca: 0.55,
        });
    }

    return pecas;
}

async function chamarLLM(prompt: string): Promise<Record<string, any> | null> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt },
            ],
            // gpt-5.x usa max_completion_tokens, não max_tokens.
            max_completion_tokens: MAX_COMPLETION_TOKENS,
            response_format: { type: "json_object" },
        }),
    });

    if (!res.ok) {
        const detalhe = await res.text();
        throw new Error(`openai ${res.status}: ${detalhe.slice(0, 200)}`);
    }
    const data = await res.json();
    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) return null;
    try {
        return JSON.parse(texto);
    } catch {
        return null;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    try {
        if (!OPENAI_API_KEY) return json(500, { error: "OPENAI_API_KEY nao configurada" });

        const body = await req.json().catch(() => ({} as Record<string, unknown>));

        const authHeader = req.headers.get("Authorization") ?? "";
        const cronSecret = req.headers.get("x-cron-secret");
        const isService = authHeader === `Bearer ${SERVICE_ROLE_KEY}`
            || Boolean(EVA_CRON_SECRET && cronSecret && cronSecret === EVA_CRON_SECRET);

        let companyId: string | null = null;
        if (isService) {
            companyId = (body.company_id as string) ?? null;
            if (!companyId) return json(400, { error: "service call requer company_id" });
        } else {
            if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
            const userClient = createClient(SUPABASE_URL, ANON_KEY, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: userData, error: userErr } = await userClient.auth.getUser();
            if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
            const { data: perfil } = await supabase
                .from("profiles")
                .select("company_id")
                .eq("id", userData.user.id)
                .maybeSingle();
            companyId = perfil?.company_id ?? null;
            if (!companyId) return json(403, { error: "sem empresa vinculada" });
        }

        const limite = Math.min(Math.max(Number(body.limit) || 25, 5), 60);

        // Matéria-prima: a leitura que a EVA já fez de cada conversa, mais o que
        // a própria empresa escreveu (é de onde sai o tom de voz).
        const [resumosRes, enviadasRes] = await Promise.all([
            supabase
                .from("conversation_summaries")
                .select("chat_name, summary, objections, next_action, temperature, stage_suggestion, last_message_at")
                .eq("company_id", companyId)
                .order("last_message_at", { ascending: false, nullsFirst: false })
                .limit(limite),
            supabase
                .from("channel_messages")
                .select("body, created_at")
                .eq("company_id", companyId)
                .eq("direction", "outbound")
                .not("body", "is", null)
                .order("created_at", { ascending: false })
                .limit(40),
        ]);

        const resumos = (resumosRes.data ?? []) as any[];
        const enviadas = (enviadasRes.data ?? []) as any[];

        if (resumos.length < MIN_RESUMOS) {
            return json(200, {
                ok: true,
                learned: 0,
                skipped: "material insuficiente",
                resumos: resumos.length,
                minimo: MIN_RESUMOS,
            });
        }

        const blocoResumos = resumos
            .map((r, i) => {
                const partes = [`[conversa ${i + 1}] ${r.summary ?? ""}`.trim()];
                if (r.objections?.length) partes.push(`objeções: ${r.objections.join("; ")}`);
                if (r.next_action) partes.push(`próximo passo: ${r.next_action}`);
                return partes.join(" | ").slice(0, 500);
            })
            .join("\n");

        const blocoEnviadas = enviadas
            .map((m) => String(m.body ?? "").replace(/\s+/g, " ").trim().slice(0, 240))
            .filter((t) => t.length > 12)
            .slice(0, 30)
            .map((t, i) => `[enviada ${i + 1}] ${t}`)
            .join("\n");

        const prompt = [
            `LEITURAS DE CONVERSA (${resumos.length}):`,
            blocoResumos,
            "",
            `MENSAGENS QUE A PRÓPRIA EMPRESA ENVIOU (${Math.min(enviadas.length, 30)}), use para o tom de voz:`,
            blocoEnviadas || "(nenhuma mensagem enviada registrada)",
        ].join("\n");

        const parsed = await chamarLLM(prompt);
        if (!parsed) return json(200, { ok: true, learned: 0, skipped: "modelo nao devolveu json" });

        const pecas = pecasDaResposta(parsed);
        if (body.dry_run) {
            return json(200, { ok: true, dry_run: true, base: { resumos: resumos.length, enviadas: enviadas.length }, pecas });
        }

        // Não repropor o que já está na fila ou já foi decidido: a mesma conversa
        // seria lida de novo no próximo ciclo e viraria fila duplicada.
        const { data: existentes } = await supabase
            .from("eva_context_suggestions")
            .select("suggestion_type, title, status")
            .eq("company_id", companyId)
            .in("status", ["pending", "approved"]);

        const jaTem = new Set(
            (existentes ?? []).map((e: any) => `${e.suggestion_type}::${String(e.title).toLowerCase().trim()}`),
        );

        const novas = pecas.filter((p) => !jaTem.has(`${p.tipo}::${p.titulo.toLowerCase().trim()}`));
        if (novas.length === 0) {
            return json(200, { ok: true, learned: 0, skipped: "nada novo", propostas: pecas.length });
        }

        const { error: insertErr } = await supabase.from("eva_context_suggestions").insert(
            novas.map((p) => ({
                company_id: companyId,
                document_id: null,
                source: "conversations",
                suggestion_type: p.tipo,
                title: p.titulo,
                content: p.conteudo,
                confidence: p.confianca,
                status: "pending",
            })),
        );
        if (insertErr) return json(500, { error: `insert falhou: ${insertErr.message}` });

        return json(200, {
            ok: true,
            learned: novas.length,
            propostas: pecas.length,
            base: { resumos: resumos.length, enviadas: enviadas.length },
            tipos: novas.map((p) => p.tipo),
        });
    } catch (err) {
        const msg = (err as Error)?.message || "erro desconhecido";
        console.error("[eva-learn-from-conversations]", msg);
        return json(500, { error: msg });
    }
});
