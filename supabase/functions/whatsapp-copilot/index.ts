// ─────────────────────────────────────────────────────────────────────────────
// F4E.4.2 (2026-05-20) — EVA Insight real (whatsapp-copilot estendido)
//
// O que mudou vs versão anterior:
//   - Lê eva_business_context (agency/services/icp/version) por company_id
//     derivado do JWT (nunca do payload do client).
//   - Enriquece SYSTEM_PROMPT com o contexto comercial da agência.
//   - Adiciona `qualification` no JSON de saída, com shape padronizado
//     (ver _shared/evaQualification.ts) — normalizado server-side.
//   - Cache hit considera context_version: se `eva_business_context.version`
//     mudou desde a última análise, ignora cache e reanalisa.
//   - INSERT/dedup em eva_knowledge_gaps quando o modelo retorna lacunas.
//   - Compatibilidade preservada: sentiment/temperature/stage/strategy/draft/
//     objections/nextAction/learnings continuam no response.
//
// Tudo continua ASSISTIDO: nenhuma ação automática (sem envio, sem mover
// pipeline, sem agendar). EVA só sugere, humano aprova.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    normalizeQualification,
    type KnowledgeGap,
    type Qualification,
} from "../_shared/evaQualification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const DAILY_LIMIT_PER_USER = 50;
// EVA.AUTO.1 — auto-qualificação (modo serviço) consome um balde por-empresa,
// separado da cota manual do dono. Teto diário de novos contatos analisados.
const AUTO_DAILY_LIMIT = 200;
const WINDOW_SECONDS = 86400;
const CACHE_TTL_MINUTES = 60;
const MAX_MESSAGES = 30;

async function hashMessages(messages: Array<{ text: string; sender: string }>): Promise<string> {
    const last = messages.slice(-MAX_MESSAGES);
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

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — EVA Comercial assistida
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é a EVA, IA Comercial do Vyzon — um CRM com IA para agências brasileiras que vendem pelo WhatsApp.

Seu papel:
- Analisar a conversa entre vendedor e lead/cliente da agência.
- Sugerir próximos passos comerciais com base no contexto da agência (serviços, ICP, tom, regras).
- Detectar lacunas no contexto cadastrado quando faltar informação para responder bem.

REGRAS DURAS — A EVA É ASSISTIDA:
- NUNCA prometa ação automática.
- NUNCA diga que enviou mensagem, marcou demo, criou oportunidade ou moveu pipeline.
- NUNCA invente preço, serviço, prazo ou política que não esteja no contexto cadastrado.
- Suas saídas são SUGESTÕES — o humano aprova antes de qualquer ação no produto.

REGRAS SOBRE O CONTEXTO DA AGÊNCIA (F4E.5.2):
- Use o bloco "CONTEXTO DA AGÊNCIA" como única fonte de verdade sobre serviços, preços, ICP, playbooks, tom e FAQs.
- Se a seção "Promessas PROIBIDAS" listar algo, NUNCA sugerir essa promessa nem nenhuma variação dela em draft/resposta_sugerida. Se o lead pedir explicitamente, recusar com tato e marcar objecao.
- Use playbooks comerciais como guia de etapas — não invente passos que não estão lá.
- Use tom de voz aprovado pra ajustar o draft. Não fuja de regras tipo "sem emojis" ou "sem gírias".
- Use objeções aprovadas como base pra resposta_sugerida quando reconhecer a objeção do lead.
- Use FAQs aprovadas como referência quando o lead fizer pergunta coberta por uma FAQ.
- Se a conversa pedir algo FORA do ICP cadastrado ou de serviços cadastrados, marque fit_sugerido=baixo e preencha info_faltante. NÃO invente serviço novo.
- Se faltar contexto pra responder bem, registre knowledge_gap em vez de presumir.

NOTAÇÃO DAS MENSAGENS:
- [Vendedor] = o vendedor humano da agência (o usuário do Vyzon).
- [Lead] = o cliente potencial da agência.

VOCÊ DEVE RETORNAR JSON VÁLIDO com esta estrutura:
{
  "sentiment": "string curta sobre o momento do lead",
  "temperature": "quente" | "morno" | "frio",
  "stage": "string curta do estágio do funil",
  "strategy": ["array de 2-3 dicas curtas e diretas"],
  "draft": "mensagem pronta pro vendedor copiar e enviar — natural, PT-BR, WhatsApp",
  "objections": ["array de objeções detectadas, ou []"],
  "nextAction": "próxima ação curta",
  "learnings": [
    {
      "type": "tone_sample" | "objection_pattern" | "preference" | "fact" | "learning",
      "content": "texto curto",
      "confidence": 0.0-1.0,
      "about": "seller" | "lead" | "company"
    }
  ],
  "qualification": {
    "servico_interesse": "nome do serviço cadastrado que o lead parece querer, ou null",
    "intencao": "preco" | "demo" | "duvida" | "suporte" | "compra" | "outro" | null,
    "temperatura": "frio" | "morno" | "quente" | null,
    "fit_sugerido": "baixo" | "medio" | "bom" | "excelente" | null,
    "score_sugerido": 0..100 ou null,
    "score_justificativa": "1 frase curta explicando o score",
    "urgencia": "baixa" | "media" | "alta" | "indefinida" | null,
    "orcamento": "informado" | "nao_informado" | "baixo" | "adequado" | "alto" | null,
    "objecao": "objeção principal em 1 frase, ou null",
    "info_coletada": ["lista do que já se sabe do lead"],
    "info_faltante": ["lista do que ainda precisa perguntar"],
    "proxima_acao": "responder" | "qualificar" | "criar_oportunidade" | "marcar_demo" | "handoff_humano" | "aguardar" | null,
    "resposta_sugerida": "sugestão de mensagem (igual ou diferente do draft) — apenas sugestão",
    "deve_criar_oportunidade": true | false,
    "deve_fazer_handoff": true | false,
    "confianca": 0.0..1.0,
    "knowledge_gaps": [
      {
        "type": "agency_context" | "service" | "pricing" | "icp" | "handoff_rule" | "tone" | "other",
        "description": "o que faltou pra você responder bem",
        "suggested_fix": "o que o admin da agência deveria cadastrar",
        "fix_target": "agency" | "services" | "icp" | "playbooks"
      }
    ]
  }
}

DIRETRIZES PARA qualification:
- Se faltar informação do contexto (ex: preço de um serviço não cadastrado), preencha info_faltante E knowledge_gaps. NÃO chute valor.
- "deve_criar_oportunidade" só true quando há clara intenção de compra E você tem informação suficiente. O humano ainda decide.
- "deve_fazer_handoff" true quando bater nas regras de handoff cadastradas (jurídico, reclamação, pedido grande de desconto, etc).
- Se o contexto da agência estiver vazio/incompleto, adicione knowledge_gap type "agency_context".

RETORNE APENAS JSON VÁLIDO, SEM markdown, SEM code blocks, SEM texto fora do JSON.`;

// ─────────────────────────────────────────────────────────────────────────────
// Rate limit helpers (existentes)
// ─────────────────────────────────────────────────────────────────────────────

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

async function peekRateLimit(
    adminClient: any,
    bucket: string,
    limit: number,
    windowSeconds: number,
) {
    try {
        const nowEpoch = Math.floor(Date.now() / 1000);
        const windowStartEpoch = Math.floor(nowEpoch / windowSeconds) * windowSeconds;
        const windowStart = new Date(windowStartEpoch * 1000).toISOString();
        const resetAt = new Date((windowStartEpoch + windowSeconds) * 1000).toISOString();
        const { data, error } = await adminClient
            .from("api_rate_limit_counters")
            .select("count")
            .eq("bucket", bucket)
            .eq("window_start", windowStart)
            .maybeSingle();
        if (error) {
            console.warn("[whatsapp-copilot] peek rate limit failed:", error);
            return { enabled: false, allowed: true, remaining: limit, resetAt };
        }
        const count = data?.count ?? 0;
        return {
            enabled: true,
            allowed: count < limit,
            remaining: Math.max(0, limit - count),
            resetAt,
        };
    } catch (error) {
        console.warn("[whatsapp-copilot] peek rate limit unavailable:", error);
        return { enabled: false, allowed: true, remaining: limit, resetAt: null };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVA business context — F4E.4.2
// ─────────────────────────────────────────────────────────────────────────────

interface EvaBusinessContext {
    agency: Record<string, unknown>;
    services: unknown[];
    icp: Record<string, unknown>;
    playbooks: unknown[];
    version: number;
    updated_at: string | null;
}

async function fetchEvaBusinessContext(
    adminClient: any,
    companyId: string,
): Promise<EvaBusinessContext | null> {
    try {
        const { data, error } = await adminClient
            .from("eva_business_context")
            .select("agency, services, icp, playbooks, version, updated_at")
            .eq("company_id", companyId)
            .maybeSingle();
        if (error) {
            console.warn("[whatsapp-copilot] eva_business_context fetch error:", error.message);
            return null;
        }
        if (!data) return null;
        return {
            agency: (data.agency ?? {}) as Record<string, unknown>,
            services: Array.isArray(data.services) ? data.services : [],
            icp: (data.icp ?? {}) as Record<string, unknown>,
            playbooks: Array.isArray(data.playbooks) ? data.playbooks : [],
            version: typeof data.version === "number" ? data.version : 1,
            updated_at: data.updated_at ?? null,
        };
    } catch (e) {
        console.warn("[whatsapp-copilot] eva_business_context exception:", e);
        return null;
    }
}

// Monta bloco de contexto pra injetar no userPrompt. Trunca campos longos
// pra evitar prompt explodir. Se contexto vazio/null, retorna string vazia
// (deixa a função sinalizar via knowledge_gap).
function buildContextBlock(ctx: EvaBusinessContext | null): string {
    if (!ctx) return "";

    const lines: string[] = [];
    const a = ctx.agency || {};
    const get = (k: string, max = 400): string | null => {
        const v = (a as Record<string, unknown>)[k];
        if (typeof v !== "string") return null;
        const t = v.trim();
        return t ? t.slice(0, max) : null;
    };

    const agencyParts: string[] = [];
    const desc = get("descricao", 500);
    if (desc) agencyParts.push(`Descrição: ${desc}`);
    const pub = get("publico_alvo", 300);
    if (pub) agencyParts.push(`Público-alvo: ${pub}`);
    const ticket = get("ticket_medio", 120);
    if (ticket) agencyParts.push(`Ticket médio: ${ticket}`);
    const tom = get("tom_de_voz", 300);
    if (tom) agencyParts.push(`Tom de voz: ${tom}`);
    const handoff = get("regras_handoff", 400);
    if (handoff) agencyParts.push(`Regras de handoff: ${handoff}`);
    const obs = get("observacoes", 300);
    if (obs) agencyParts.push(`Observações: ${obs}`);

    const palavrasProib = (a as Record<string, unknown>).palavras_proibidas;
    if (Array.isArray(palavrasProib) && palavrasProib.length > 0) {
        agencyParts.push(`Palavras proibidas: ${palavrasProib.slice(0, 20).join(", ")}`);
    }
    const promessasProib = (a as Record<string, unknown>).promessas_proibidas;
    if (Array.isArray(promessasProib) && promessasProib.length > 0) {
        agencyParts.push(`Promessas proibidas: ${promessasProib.slice(0, 10).join("; ")}`);
    }

    if (agencyParts.length > 0) {
        lines.push("## Agência\n" + agencyParts.join("\n"));
    }

    // Services — só os top 5 pra controlar tamanho do prompt
    if (Array.isArray(ctx.services) && ctx.services.length > 0) {
        const top = ctx.services.slice(0, 5).map((s: any, i: number) => {
            const nome = typeof s?.nome === "string" ? s.nome : `Serviço ${i + 1}`;
            const desc = typeof s?.descricao === "string" ? s.descricao.slice(0, 200) : "";
            const min = typeof s?.preco_min === "number" ? s.preco_min : null;
            const max = typeof s?.preco_max === "number" ? s.preco_max : null;
            const modelo = typeof s?.modelo_cobranca === "string" ? s.modelo_cobranca : "";
            const priceStr = min != null && max != null
                ? `R$ ${min}–${max}`
                : min != null
                ? `a partir de R$ ${min}`
                : max != null
                ? `até R$ ${max}`
                : "preço não cadastrado";
            const parts = [`- ${nome} (${priceStr}${modelo ? ` · ${modelo}` : ""})`];
            if (desc) parts.push(`  ${desc}`);
            const perguntas = Array.isArray(s?.perguntas_obrigatorias)
                ? s.perguntas_obrigatorias.slice(0, 3)
                : [];
            if (perguntas.length > 0) {
                parts.push(`  Perguntas obrigatórias: ${perguntas.join("; ")}`);
            }
            return parts.join("\n");
        });
        lines.push("## Serviços cadastrados\n" + top.join("\n"));
    }

    // ICP — descrição + critérios bom/baixo fit (compressão)
    const icp = ctx.icp || {};
    const icpParts: string[] = [];
    const icpDesc = typeof (icp as Record<string, unknown>).descricao === "string"
        ? ((icp as Record<string, unknown>).descricao as string).slice(0, 400)
        : null;
    if (icpDesc) icpParts.push(`Descrição: ${icpDesc}`);
    const bomFit = (icp as Record<string, unknown>).criterios_bom_fit;
    if (Array.isArray(bomFit) && bomFit.length > 0) {
        icpParts.push(`Bom fit: ${bomFit.slice(0, 8).join("; ")}`);
    }
    const semFit = (icp as Record<string, unknown>).criterios_sem_fit;
    if (Array.isArray(semFit) && semFit.length > 0) {
        icpParts.push(`Sem fit: ${semFit.slice(0, 8).join("; ")}`);
    }
    if (icpParts.length > 0) {
        lines.push("## ICP da agência\n" + icpParts.join("\n"));
    }

    // F4E.5.2 — Playbooks aprovados via Base de Conhecimento
    // Shape esperado das entries (F4E.5 grava assim, F4E.5.3 adiciona priority):
    //   { kind, title, content, source, suggestion_id, applied_at, priority? }
    if (Array.isArray(ctx.playbooks) && ctx.playbooks.length > 0) {
        // F4E.5.3 — ordena por priority high > medium > low (default medium),
        // depois applied_at desc (mais recentes primeiro). Quando o cap de N
        // corta, alta prioridade ganha.
        const prioRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const sorted = [...ctx.playbooks].sort((a: any, b: any) => {
            const pa = prioRank[typeof a?.priority === "string" ? a.priority : "medium"] ?? 1;
            const pb = prioRank[typeof b?.priority === "string" ? b.priority : "medium"] ?? 1;
            if (pa !== pb) return pa - pb;
            const ta = typeof a?.applied_at === "string" ? a.applied_at : "";
            const tb = typeof b?.applied_at === "string" ? b.applied_at : "";
            return tb.localeCompare(ta);
        });

        // Agrupa por kind (com normalização defensiva)
        const groups: Record<string, any[]> = {
            forbidden_promise: [],
            playbook: [],
            tone: [],
            objection: [],
            faq: [],
        };
        for (const entry of sorted) {
            const kind = typeof (entry as any)?.kind === "string" ? (entry as any).kind : "playbook";
            if (kind in groups) groups[kind].push(entry);
        }

        const cleanContent = (c: unknown): string => {
            if (!c) return "";
            if (typeof c === "string") return c.slice(0, 200);
            if (typeof c === "object") {
                // pega os 2-3 campos mais "humanos" se existirem
                const obj = c as Record<string, unknown>;
                const candidates = ["description", "answer", "response", "value", "text", "rule", "name"];
                for (const k of candidates) {
                    const v = obj[k];
                    if (typeof v === "string" && v.trim()) return v.slice(0, 200);
                }
                // fallback: estringifica e trunca
                return JSON.stringify(obj).slice(0, 200);
            }
            return String(c).slice(0, 200);
        };

        const renderGroup = (label: string, items: any[], cap: number): string | null => {
            if (items.length === 0) return null;
            const top = items.slice(0, cap);
            const bullets = top.map((p) => {
                const title = typeof p?.title === "string" ? p.title.slice(0, 120) : "(sem título)";
                const body  = cleanContent(p?.content);
                return body ? `- ${title}: ${body}` : `- ${title}`;
            });
            return `## ${label}\n${bullets.join("\n")}`;
        };

        // ORDEM intencional: forbidden_promise primeiro pra a IA "ver" antes
        // de qualquer playbook/tone que possa empurrar pra promessa.
        const sections: Array<[string, string, number]> = [
            ["forbidden_promise", "Promessas PROIBIDAS (NUNCA sugerir nem prometer)", 8],
            ["objection",         "Objeções comuns e respostas aprovadas",            6],
            ["playbook",          "Playbooks comerciais",                              6],
            ["tone",              "Tom de voz e regras de comunicação",                4],
            ["faq",               "FAQs aprovadas",                                    6],
        ];
        for (const [kind, label, cap] of sections) {
            const section = renderGroup(label, groups[kind], cap);
            if (section) lines.push(section);
        }
    }

    return lines.length > 0 ? `\n\nCONTEXTO DA AGÊNCIA (use isso pra qualificar):\n${lines.join("\n\n")}` : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge gaps INSERT com dedup
// ─────────────────────────────────────────────────────────────────────────────

async function persistKnowledgeGaps(
    adminClient: any,
    companyId: string,
    chatPhone: string | null,
    gaps: KnowledgeGap[],
): Promise<{ inserted: number; reinforced: number }> {
    let inserted = 0;
    let reinforced = 0;
    for (const gap of gaps) {
        try {
            // Dedup: já existe gap aberto da mesma company com mesmo fix_target e
            // descrição semelhante? Comparação simples: fix_target + chat_phone
            // (mesma conversa) + status='open'. Não normalizo descrição.
            const { data: existing } = await adminClient
                .from("eva_knowledge_gaps")
                .select("id, occurrence_count")
                .eq("company_id", companyId)
                .eq("fix_target", gap.fix_target)
                .eq("source_chat_phone", chatPhone || "")
                .eq("status", "open")
                .limit(1)
                .maybeSingle();

            if (existing?.id) {
                // Reforça contador em vez de duplicar
                const { error: updErr } = await adminClient
                    .from("eva_knowledge_gaps")
                    .update({
                        occurrence_count: (existing.occurrence_count || 1) + 1,
                    })
                    .eq("id", existing.id);
                if (!updErr) reinforced += 1;
                continue;
            }

            // Insert novo. NOTA: source_message vai como null pra reduzir risco
            // de PII em logs/queries. F4E.4.5+ pode revisar essa decisão.
            const { error: insErr } = await adminClient
                .from("eva_knowledge_gaps")
                .insert([{
                    company_id: companyId,
                    source_type: "conversation",
                    source_chat_phone: chatPhone || null,
                    source_message: null,
                    gap_description: gap.description,
                    suggested_fix: gap.suggested_fix,
                    fix_target: gap.fix_target,
                    status: "open",
                    occurrence_count: 1,
                }]);
            if (!insErr) inserted += 1;
            else console.warn("[whatsapp-copilot] gap insert failed:", insErr.message);
        } catch (e) {
            console.warn("[whatsapp-copilot] gap dedup/insert exception:", e);
        }
    }
    return { inserted, reinforced };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant validation — confere que o chat_phone pertence ao user
// ─────────────────────────────────────────────────────────────────────────────

async function validateChatOwnership(
    adminClient: any,
    userId: string,
    chatPhone: string,
): Promise<boolean> {
    // Normalização: frontend/conversation_summaries usam "+5511...", mas
    // whatsapp_messages.chat_phone é "5511..." (sem +). Comparar os dois
    // formatos cobre ambas as convenções.
    const withoutPlus = chatPhone.startsWith("+") ? chatPhone.slice(1) : chatPhone;
    const withPlus = chatPhone.startsWith("+") ? chatPhone : `+${chatPhone}`;
    try {
        const { count } = await adminClient
            .from("whatsapp_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .in("chat_phone", [chatPhone, withoutPlus, withPlus])
            .limit(1);
        return (count ?? 0) > 0;
    } catch (e) {
        console.error("[whatsapp-copilot] validateChatOwnership exception (fail-closed):", e);
        // SEGURANÇA: fail-CLOSED. Em erro de DB NÃO presumimos posse — bloqueia a
        // análise (o usuário pode tentar de novo). Antes retornava true (fail-open),
        // o que deixaria analisar uma conversa sem provar posse se o DB falhasse.
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        if (!OPENAI_API_KEY) {
            return json(500, { error: "OPENAI_API_KEY nao configurada", code: "OPENAI_NOT_CONFIGURED" });
        }

        // ─── Auth ────────────────────────────────────────────────────────────
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return json(401, { error: "Unauthorized" });

        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // ─── Body parse ──────────────────────────────────────────────────────
        const body = await req.json();
        const { messages, contactName, contactPhone, force, objective, autoQualify } = body as {
            messages: Array<{ text: string; sender: string }>;
            contactName?: string;
            contactPhone?: string;
            /** F4E.4.5 — quando true, pula a checagem de cache e força nova
             *  análise (consome do rate limit). Default false. */
            force?: boolean;
            /** PROSPECT.1 — objetivo da conversa (ex.: prospecção, marcar demo).
             *  Quando presente, orienta a resposta_sugerida pra esse fim. */
            objective?: string;
            /** EVA.AUTO.1 — auto-qualificação interna (modo serviço). Só vale se a
             *  chamada usar a service_role key. company_id + ownerUserId no payload. */
            autoQualify?: boolean;
        };

        // EVA.AUTO.1 — modo serviço: chamada interna autenticada com a
        // service_role key (não JWT de usuário). Só alcançável por quem tem a key
        // (o webhook). Pula getUser e o tenant guard; persiste sob o dono que
        // ATIVOU o agente (admin enxerga via RLS "Company admins view all").
        const isServiceCall = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
        const serviceMode = isServiceCall && autoQualify === true;

        let user: { id: string };
        let profile: { company_id?: string | null; nome?: string | null; is_super_admin?: boolean } | null;
        let companyId: string | null;

        if (serviceMode) {
            const ownerUserId = (body as { ownerUserId?: string }).ownerUserId ?? null;
            const svcCompanyId = (body as { company_id?: string }).company_id ?? null;
            if (!ownerUserId || !svcCompanyId) {
                return json(400, { error: "service call requires company_id + ownerUserId", code: "SERVICE_BAD_PARAMS" });
            }
            user = { id: ownerUserId };
            companyId = svcCompanyId;
            const { data: prof } = await adminSupabase
                .from("profiles").select("nome").eq("id", ownerUserId).maybeSingle();
            profile = { company_id: svcCompanyId, nome: prof?.nome ?? null };
        } else {
            const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user: authedUser }, error: userError } = await userSupabase.auth.getUser();
            if (userError || !authedUser) return json(401, { error: "Unauthorized" });
            user = { id: authedUser.id };
            // company_id DERIVADO DO JWT — nunca confiar no payload do client
            const { data: prof } = await adminSupabase
                .from("profiles")
                .select("company_id, nome, is_super_admin")
                .eq("id", authedUser.id)
                .single();
            profile = prof ?? null;
            companyId = prof?.company_id ?? null;
        }

        // Rate limit isolado: a auto-qualificação consome um balde por-empresa,
        // sem roubar a cota manual diária do dono.
        const rlBucket = serviceMode ? `whatsapp-copilot:auto:${companyId}` : `whatsapp-copilot:user:${user.id}`;
        const rlLimit = serviceMode ? AUTO_DAILY_LIMIT : DAILY_LIMIT_PER_USER;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return json(400, { error: "messages array is required" });
        }

        // ─── Tenant guard: chat_phone pertence ao user? ──────────────────────
        // (Pulado no modo serviço: a chamada é interna e confiável, e o lead novo
        //  ainda não tem mensagens sob o user_id do dono.)
        if (!serviceMode && contactPhone) {
            const owns = await validateChatOwnership(adminSupabase, user.id, contactPhone);
            if (!owns) {
                console.warn(
                    "[whatsapp-copilot] tenant guard rejected — user",
                    user.id, "tentou analisar chat_phone", contactPhone, "sem mensagens próprias",
                );
                return json(403, {
                    error: "Conversa não encontrada para este usuário",
                    code: "TENANT_MISMATCH",
                });
            }
        }

        // ─── EVA business context ────────────────────────────────────────────
        const evaContext = companyId
            ? await fetchEvaBusinessContext(adminSupabase, companyId)
            : null;
        const contextVersion = evaContext?.version ?? 0;

        // ─── Cache check ─────────────────────────────────────────────────────
        // F4E.4.2: cache válido apenas se messages_hash igual, analyzed_at < 60min
        // E cached_analysis.context_version_used === eva_business_context.version.
        // F4E.4.5: se `force=true`, pula esse bloco e vai direto pra OpenAI.
        const messagesHash = await hashMessages(messages);
        if (force) {
            console.log(`[whatsapp-copilot] cache bypass (force=true) user=${user.id}`);
        }
        if (!force && contactPhone) {
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
                    const cachedVersion = (cached.cached_analysis as Record<string, unknown>)
                        ?.context_version_used;
                    const versionMatches =
                        typeof cachedVersion === "number" && cachedVersion === contextVersion;

                    if (versionMatches) {
                        console.log(
                            "[whatsapp-copilot] cache HIT (version match)",
                            contactPhone, "v", contextVersion,
                        );
                        const peek = await peekRateLimit(
                            adminSupabase,
                            rlBucket,
                            rlLimit,
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
                    } else {
                        console.log(
                            "[whatsapp-copilot] cache STALE (context version changed)",
                            "old:", cachedVersion, "new:", contextVersion,
                        );
                    }
                }
            } catch (cacheErr) {
                console.warn("[whatsapp-copilot] cache lookup failed:", cacheErr);
            }
        }

        // ─── Rate limit peek ─────────────────────────────────────────────────
        const rateLimit = await peekRateLimit(
            adminSupabase,
            rlBucket,
            rlLimit,
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

        // ─── Build conversation text ─────────────────────────────────────────
        const conversationText = messages
            .slice(-MAX_MESSAGES)
            .map((msg) => {
                const sender = msg.sender === "me" ? "[Vendedor]" : "[Lead]";
                return `${sender}: ${msg.text}`;
            })
            .join("\n");

        // ─── EVA Memory (legado, preservado) ─────────────────────────────────
        let memoryContext = "";
        try {
            if (companyId) {
                const { data: memories } = await adminSupabase
                    .from("eva_memory")
                    .select("id, type, content, confidence, user_id")
                    .eq("company_id", companyId)
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
                        parts.push(`Sobre este vendedor (${profile?.nome || "voce"}):\n${sellerMems.map(formatMem).join("\n")}`);
                    }
                    if (companyMems.length > 0) {
                        parts.push(`Sobre a empresa:\n${companyMems.map(formatMem).join("\n")}`);
                    }
                    if (parts.length > 0) {
                        memoryContext = `\n\nMEMORIA DA EVA (use para personalizar tom e abordagem):\n${parts.join("\n\n")}`;
                    }
                    const memIds = memories.map((m: any) => m.id).filter(Boolean);
                    if (memIds.length > 0) {
                        adminSupabase.rpc("eva_touch_memories", { p_ids: memIds }).then(
                            () => {},
                            () => {},
                        );
                    }
                }
            }
        } catch (memErr) {
            console.warn("[whatsapp-copilot] memory fetch failed:", memErr);
        }

        // ─── EVA business context block (F4E.4.2) ────────────────────────────
        const contextBlock = buildContextBlock(evaContext);
        const contextEmpty = !evaContext || contextBlock.trim().length === 0;

        // PROSPECT.1 — bloco de objetivo opcional (ex.: prospecção fria → demo).
        // Orienta a resposta_sugerida sem mudar o schema nem o caráter assistido.
        const objectiveBlock = objective && objective.trim()
            ? `\n\nOBJETIVO DESTA CONVERSA: ${objective.trim()}\nDirecione a resposta_sugerida e a proxima_acao para esse objetivo, sem ser invasivo. Resolva objeção antes de avançar quando houver. Nunca prometa preço/condição fora do contexto da agência.`
            : "";

        const userPrompt = `Contato: ${contactName || "Desconhecido"}${contactPhone ? ` (${contactPhone})` : ""}

Conversa recente:
${conversationText}${memoryContext}${contextBlock}${objectiveBlock}

Analise a conversa e retorne o JSON estrito com sua análise e o objeto qualification.${
            contextEmpty
                ? " IMPORTANTE: o contexto da agência está vazio ou incompleto — adicione knowledge_gap type=agency_context."
                : ""
        }${
            memoryContext ? " Adapte o tom do draft conforme o estilo descrito na memória." : ""
        }`;

        // ─── OpenAI call ─────────────────────────────────────────────────────
        // F4E.4.5.2 (2026-05-21): F4E.5.2 expandiu o contexto (playbooks,
        // forbidden_promise, objections, faq, tone). Output do JSON também
        // cresce. Subindo max_completion_tokens 1000 → 2000 pra cobrir.
        // gpt-5.x consome reasoning tokens antes do conteúdo, então cap baixo
        // trunca o JSON e o parse falha com "Resposta invalida da IA".
        const modelUsed = "gpt-5.4-nano";
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: modelUsed,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
                max_completion_tokens: 2000,
                response_format: { type: "json_object" },
            }),
        });

        if (!openaiResponse.ok) {
            const errBody = await openaiResponse.text();
            console.error(`[whatsapp-copilot] ${modelUsed} failed (${openaiResponse.status}):`, errBody);
            return json(502, {
                error: "Erro ao consultar IA",
                code: "OPENAI_ERROR",
                openaiStatus: openaiResponse.status,
            });
        }

        const completion = await openaiResponse.json();
        const content = completion.choices?.[0]?.message?.content;
        const finishReason = completion.choices?.[0]?.finish_reason as string | undefined;
        const usage = completion.usage as Record<string, unknown> | undefined;
        if (!content) {
            console.error(
                `[whatsapp-copilot] empty content finish_reason=${finishReason} ` +
                `usage=${JSON.stringify(usage)}`,
            );
            return json(502, { error: "Resposta vazia da IA", finish_reason: finishReason });
        }

        let analysisRaw: Record<string, unknown>;
        try {
            const cleaned = String(content).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            analysisRaw = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error(
                `[whatsapp-copilot] Failed to parse GPT response ` +
                `finish_reason=${finishReason} usage=${JSON.stringify(usage)} ` +
                `content_len=${String(content).length} parseErr=${parseErr}`,
            );
            return json(502, {
                error: "Resposta invalida da IA",
                finish_reason: finishReason,
                content_length: String(content).length,
            });
        }

        // ─── Normalize qualification ─────────────────────────────────────────
        const qualification: Qualification = normalizeQualification(
            analysisRaw.qualification,
        );

        // Compose final analysis: campos legados + qualification + metadata cache
        const analysis: Record<string, unknown> = {
            ...analysisRaw,
            qualification,
            context_version_used: contextVersion,
            context_present: !contextEmpty,
        };

        // ─── Persistence ─────────────────────────────────────────────────────
        if (companyId && contactPhone) {
            try {
                const summaryText = [
                    analysis.sentiment,
                    analysis.nextAction ? `Próximo: ${analysis.nextAction}` : null,
                    Array.isArray(analysis.objections) && analysis.objections.length
                        ? `Objeções: ${(analysis.objections as string[]).slice(0, 2).join("; ")}`
                        : null,
                ].filter(Boolean).join(". ");

                const { error: upsertError } = await adminSupabase
                    .from("conversation_summaries")
                    .upsert(
                        {
                            company_id: companyId,
                            user_id: user.id,
                            chat_phone: contactPhone,
                            chat_name: contactName || null,
                            summary: summaryText || (analysis.sentiment as string) || "Conversa analisada",
                            temperature: (analysis.temperature as string) || null,
                            sentiment: (analysis.sentiment as string) || null,
                            stage_suggestion: (analysis.stage as string) || null,
                            next_action: (analysis.nextAction as string) || null,
                            strategy: Array.isArray(analysis.strategy) ? analysis.strategy : [],
                            objections: Array.isArray(analysis.objections) ? analysis.objections : [],
                            message_count: messages.length,
                            last_message_at: new Date().toISOString(),
                            last_draft: (analysis.draft as string) || null,
                            messages_hash: messagesHash,
                            cached_analysis: analysis,
                            qualification, // F4E.4.2 — shape estruturado
                            analyzed_at: new Date().toISOString(),
                        },
                        { onConflict: "user_id,chat_phone" },
                    );

                if (upsertError) {
                    console.error("[eva-persist] SUMMARY UPSERT FAILED:", upsertError.message);
                } else {
                    console.log("[eva-persist] ✅ summary upserted", contactPhone, "v", contextVersion);
                }

                // ─── EVA Memory learnings (legado, preservado) ───────────────
                if (Array.isArray(analysis.learnings) && (analysis.learnings as unknown[]).length > 0) {
                    const validTypes = ["fact", "preference", "tone_sample", "objection_pattern", "learning"];
                    const validLearnings = (analysis.learnings as Array<Record<string, unknown>>)
                        .filter((l) =>
                            l && typeof l.content === "string"
                            && (l.content as string).trim().length > 0
                            && validTypes.includes(l.type as string)
                        )
                        .slice(0, 3);

                    for (const l of validLearnings) {
                        const { error: memError } = await adminSupabase.rpc(
                            "eva_smart_insert_memory",
                            {
                                p_company_id: companyId,
                                p_user_id: l.about === "company" ? null : user.id,
                                p_type: l.type,
                                p_content: (l.content as string).trim().slice(0, 500),
                                p_source: "whatsapp",
                                p_confidence: typeof l.confidence === "number"
                                    ? Math.max(0, Math.min(1, l.confidence as number))
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

                // ─── Knowledge gaps INSERT/dedup (F4E.4.2) ───────────────────
                if (qualification.knowledge_gaps.length > 0) {
                    const result = await persistKnowledgeGaps(
                        adminSupabase,
                        companyId,
                        contactPhone,
                        qualification.knowledge_gaps,
                    );
                    console.log(
                        "[whatsapp-copilot] knowledge_gaps:",
                        result.inserted, "inserted,",
                        result.reinforced, "reinforced",
                    );
                }
            } catch (persistError) {
                console.error("[eva-persist] persistence THREW:", persistError);
            }
        } else {
            console.warn(
                "[eva-persist] SKIPPED — companyId:", !!companyId,
                "contactPhone:", !!contactPhone,
            );
        }

        // ─── Consume rate limit só depois do sucesso ─────────────────────────
        const consumed = await consumeRateLimit(
            adminSupabase,
            rlBucket,
            rlLimit,
            WINDOW_SECONDS,
        );

        return json(200, {
            success: true,
            analysis,
            model: modelUsed,
            tokens: completion.usage?.total_tokens || null,
            remaining: consumed.remaining,
            dailyLimit: DAILY_LIMIT_PER_USER,
            contextVersion,
            contextPresent: !contextEmpty,
        });
    } catch (error) {
        console.error("[whatsapp-copilot] error:", error);
        return json(500, { error: "Internal server error" });
    }
});
