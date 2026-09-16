// eva-agent-loop
// Loop agéntico da EVA com autonomia GRADUADA (VYZON.AGENTS.3, 2026-08-21).
//
// Regras de autonomia (decisão de produto 2026-08-21):
//   - Tools INTERNAS executam sozinhas dentro do loop (ler contexto, mover
//     estágio, criar nota).
//   - Tool OUTBOUND NUNCA envia mensagem: grava rascunho status='pending' em
//     agent_suggestions (aprovar-e-enviar) e registra step approval_request.
//
// Invocação:
//   1. Usuário autenticado (JWT): company_id derivado do perfil.
//   2. Serviço (Bearer service_role ou x-cron-secret): exige company_id no body.
//
// Body: { company_id?, deal_id?, goal?, agent_key?, max_steps? }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPendingSuggestions } from "../_shared/whatsappApproval.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "gpt-5.4-mini";
const MAX_ITERATIONS = 6;
const MAX_COMPLETION_TOKENS = 2000;

// Limite diário de RUNS por empresa, por plano (espelha src/config/plans.ts).
// Piso free é interno: 5 runs/dia já cobre diagnóstico; trial conta como pro.
const PLAN_RUN_LIMIT: Record<string, number> = { free: 5, essential: 20, pro: 60, escala: 60 };

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
        };
    } catch (error) {
        console.warn("[eva-agent-loop] rate limit unavailable:", error);
        return { enabled: false, allowed: true, remaining: limit };
    }
}

type ToolDef = {
    tool_key: string;
    name: string;
    description: string;
    kind: "internal" | "outbound";
    parameters_schema: Record<string, unknown>;
};

type ChatMessage = Record<string, unknown>;

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `Você é Eva, agente comercial do Vyzon trabalhando para uma agência brasileira. Você opera com autonomia GRADUADA:

1. Tools internas você executa sozinha, sem pedir permissão: ler contexto do deal, atualizar estágio, criar nota.
2. Mensagem de SAÍDA para o lead (whatsapp/email) você NUNCA envia. Use draft_outbound_message pra deixar o rascunho na fila de aprovação. O humano aprova e envia.

Método de trabalho:
- Comece SEMPRE lendo o contexto (get_deal_context) antes de decidir qualquer ação.
- Aja pelo objetivo dado. Se não houver objetivo, faça diagnóstico: leia o contexto, avalie o momento do deal e registre uma nota curta com a análise.
- Movimente o estágio só quando a evidência do contexto justificar.
- Rascunho de mensagem: pt-BR, tom brasileiro de vender, direto, curto, sem emoji, sem corporativês, termina com UMA pergunta ou CTA claro. Nunca invente informação que não está no contexto. Nunca prometa preço ou resultado.
- Ao final, responda em texto curto (até 4 frases) resumindo o que fez e o que ficou pendente de aprovação.`;

/** Bloco de contexto do negócio injetado no system prompt.
 *
 *  LEARN.1 (2026-08-24): o loop rascunhava mensagem sem saber o que a empresa
 *  vende nem como ela escreve, enquanto o whatsapp-copilot já lia isso desde
 *  sempre. Resultado: o rascunho que chegava no WhatsApp do dono não tinha a voz
 *  dele. Truncado de propósito, este prompt já carrega contexto do deal. */
async function buildBusinessContext(companyId: string): Promise<string> {
    const { data } = await supabase
        .from("eva_business_context")
        .select("agency, services, icp, version")
        .eq("company_id", companyId)
        .maybeSingle();
    if (!data) return "";

    const agency = (data.agency ?? {}) as Record<string, any>;
    const icp = (data.icp ?? {}) as Record<string, any>;
    const services = Array.isArray(data.services) ? data.services : [];

    const linhas: string[] = [];
    const negocio = agency.descricao || agency.positioning || agency.description;
    if (negocio) linhas.push(`Negócio: ${String(negocio).slice(0, 400)}`);
    if (agency.tom_de_voz) linhas.push(`Tom de voz da empresa: ${String(agency.tom_de_voz).slice(0, 300)}`);

    const proibidas = [
        ...(Array.isArray(agency.promessas_proibidas) ? agency.promessas_proibidas : []),
        ...(Array.isArray(agency.palavras_proibidas) ? agency.palavras_proibidas : []),
    ].slice(0, 12);
    if (proibidas.length) linhas.push(`NUNCA escreva: ${proibidas.join("; ")}`);

    const nomes = services
        .map((s: any) => s?.nome || s?.name)
        .filter(Boolean)
        .slice(0, 8);
    if (nomes.length) linhas.push(`O que a empresa vende: ${nomes.join(", ")}`);

    const cliente = icp.descricao || icp.description;
    if (cliente) linhas.push(`Cliente ideal: ${String(cliente).slice(0, 300)}`);

    if (linhas.length === 0) return "";
    return `\n\nCONTEXTO DA EMPRESA (versão ${data.version ?? 1}). Use isto para escrever na voz dela e nunca contrarie:\n${linhas.join("\n")}`;
}

async function resolveOwnerUserId(companyId: string): Promise<string | null> {
    const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    return data?.id ?? null;
}

// ── Executor de tools ───────────────────────────────────────────────────────

type StepLogger = (
    kind: "llm_call" | "tool_call" | "approval_request" | "error",
    payload: {
        seq: number;
        runId: string;
        companyId: string;
        toolKey?: string;
        arguments?: unknown;
        output?: unknown;
        status?: "ok" | "error" | "denied";
        error?: string;
        durationMs?: number;
    },
) => Promise<void>;

function makeExecutor(
    companyId: string,
    ownerUserId: string | null,
    logStep: StepLogger,
) {
    let seq = 0;

    async function execute(toolKey: string, args: Record<string, unknown>): Promise<unknown> {
        seq += 1;
        const startedAt = Date.now();
        try {
            const result = await dispatch(toolKey, args);
            await logStep("tool_call", {
                seq, runId: "", companyId, toolKey,
                arguments: args, output: result, status: "ok",
                durationMs: Date.now() - startedAt,
            });
            return result;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await logStep("tool_call", {
                seq, runId: "", companyId, toolKey,
                arguments: args, status: "error", error: msg,
                durationMs: Date.now() - startedAt,
            });
            return { error: msg };
        }
    }

    async function assertDeal(dealId: string): Promise<Record<string, any>> {
        const { data: deal, error } = await supabase
            .from("deals")
            .select("*")
            .eq("id", dealId)
            .eq("company_id", companyId)
            .maybeSingle();
        if (error) throw new Error(`deal lookup failed: ${error.message}`);
        if (!deal) throw new Error("deal nao encontrado nesta empresa");
        return deal;
    }

    async function dispatch(toolKey: string, args: Record<string, unknown>): Promise<unknown> {
        switch (toolKey) {
            case "get_deal_context": {
                const deal = await assertDeal(String(args.deal_id));
                const [notes, activities, pending] = await Promise.all([
                    supabase
                        .from("deal_notes")
                        .select("content, created_at")
                        .eq("deal_id", deal.id)
                        .order("created_at", { ascending: false })
                        .limit(5),
                    supabase
                        .from("deal_activities")
                        .select("activity_type, description, created_at")
                        .eq("deal_id", deal.id)
                        .order("created_at", { ascending: false })
                        .limit(10),
                    supabase
                        .from("agent_suggestions")
                        .select("id, kind, created_at")
                        .eq("deal_id", deal.id)
                        .eq("status", "pending"),
                ]);
                return {
                    deal: {
                        id: deal.id,
                        title: deal.title,
                        stage: deal.stage,
                        value: deal.value,
                        customer_name: deal.customer_name,
                        account_name: deal.account_name,
                        customer_phone: deal.customer_phone,
                        customer_email: deal.customer_email,
                        lead_source: deal.lead_source,
                        notes: deal.notes ?? null,
                        sla_breach_at: deal.sla_breach_at,
                        updated_at: deal.updated_at,
                    },
                    recent_notes: notes.data ?? [],
                    recent_activities: activities.data ?? [],
                    pending_suggestions: pending.count ?? (pending.data?.length ?? 0),
                };
            }

            case "update_deal_stage": {
                const deal = await assertDeal(String(args.deal_id));
                const stage = String(args.stage ?? "").trim();
                if (!stage) throw new Error("stage obrigatorio");
                if (stage === deal.stage) return { ok: true, unchanged: true, stage };
                const { error } = await supabase
                    .from("deals")
                    .update({ stage })
                    .eq("id", deal.id)
                    .eq("company_id", companyId);
                if (error) throw new Error(error.message);
                await supabase.from("deal_activities").insert({
                    deal_id: deal.id,
                    company_id: companyId,
                    user_id: ownerUserId,
                    activity_type: "stage_changed",
                    description: `EVA moveu o estagio para ${stage}`,
                    old_value: String(deal.stage ?? ""),
                    new_value: stage,
                });
                return { ok: true, from: deal.stage, to: stage };
            }

            case "create_deal_note": {
                const deal = await assertDeal(String(args.deal_id));
                const content = String(args.content ?? "").trim().slice(0, 500);
                if (!content) throw new Error("content obrigatorio");
                const { error } = await supabase.from("deal_notes").insert({
                    deal_id: deal.id,
                    company_id: companyId,
                    user_id: ownerUserId,
                    content: `[EVA] ${content}`,
                });
                if (error) throw new Error(error.message);
                return { ok: true };
            }

            case "draft_outbound_message": {
                // GUARDRAIL GRADUADO: nunca envia. Só rascunho pending.
                const deal = await assertDeal(String(args.deal_id));
                const channel = String(args.channel ?? "whatsapp");
                const messageText = String(args.message_text ?? "").trim();
                if (!messageText) throw new Error("message_text obrigatorio");
                const suggestionText = String(args.suggestion_text ?? "").trim() || "Rascunho gerado pela EVA.";
                const { data: inserted, error } = await supabase
                    .from("agent_suggestions")
                    .insert({
                        company_id: companyId,
                        agent_key: "eva",
                        kind: channel === "email" ? "outbound_message" : "followup",
                        deal_id: deal.id,
                        input_summary: {
                            channel,
                            stage: deal.stage,
                            trigger: "agent_loop",
                        },
                        suggestion: {
                            channel,
                            message_text: messageText,
                            contact_name: deal.customer_name ?? deal.account_name ?? null,
                            contact_phone: deal.customer_phone ?? null,
                            contact_email: deal.customer_email ?? null,
                        },
                        status: "pending",
                    })
                    .select("id")
                    .single();
                if (error) throw new Error(error.message);
                seq += 1;
                await logStep("approval_request", {
                    seq, runId: "", companyId, toolKey,
                    arguments: { channel }, output: { suggestion_id: inserted.id },
                    status: "ok",
                });

                // APPROVAL.1 — leva o rascunho pro WhatsApp do dono na hora.
                // Best-effort: se o WhatsApp estiver fora, o cron
                // eva-approval-notify tenta de novo nos próximos 10 minutos.
                let notifiedNow = false;
                if (channel === "whatsapp") {
                    try {
                        const notify = await notifyPendingSuggestions(supabase, {
                            suggestionId: inserted.id,
                            limit: 1,
                        });
                        notifiedNow = notify.notified > 0;
                    } catch (notifyErr) {
                        console.warn("[agent-loop] notificacao de aprovacao falhou:", (notifyErr as Error)?.message);
                    }
                }

                return {
                    ok: true,
                    suggestion_id: inserted.id,
                    status: "pending_approval",
                    notified_owner: notifiedNow,
                    note: notifiedNow
                        ? "Rascunho no WhatsApp do dono. Sai so se ele aprovar."
                        : "Rascunho na fila. Envia so apos aprovacao humana.",
                };
            }

            case "create_deal": {
                const customerName = String(args.customer_name ?? "").trim();
                if (!customerName) throw new Error("customer_name obrigatorio");
                if (!ownerUserId) throw new Error("run sem usuario dono: nao da pra atribuir o card");

                const phone = args.customer_phone ? String(args.customer_phone).replace(/\D/g, "") : null;

                // Telefone é a chave real de duplicata: o mesmo lead volta a
                // falar e não pode virar dois cards.
                if (phone) {
                    const { data: existing } = await supabase
                        .from("deals")
                        .select("id, title, stage")
                        .eq("company_id", companyId)
                        .ilike("customer_phone", `%${phone.slice(-8)}`)
                        .limit(1)
                        .maybeSingle();
                    if (existing) {
                        return { ok: true, deal_id: existing.id, created: false, note: "deal ja existia para este telefone" };
                    }
                }

                const { data: created, error } = await supabase
                    .from("deals")
                    .insert({
                        title: String(args.title ?? customerName).slice(0, 160),
                        customer_name: customerName,
                        customer_phone: phone,
                        stage: String(args.stage ?? "qualification"),
                        notes: args.notes ? String(args.notes).slice(0, 1000) : null,
                        lead_source: "whatsapp",
                        source: "eva",
                        user_id: ownerUserId,
                        company_id: companyId,
                    })
                    .select("id")
                    .single();
                if (error) throw new Error(error.message);
                return { ok: true, deal_id: created.id, created: true };
            }

            case "mark_deal_lost": {
                const deal = await assertDeal(String(args.deal_id));
                const reason = String(args.loss_reason ?? "").trim();
                if (!reason) throw new Error("loss_reason obrigatorio");
                const { error } = await supabase
                    .from("deals")
                    .update({ stage: "closed_lost", loss_reason: reason.slice(0, 300), probability: 0 })
                    .eq("id", deal.id)
                    .eq("company_id", companyId);
                if (error) throw new Error(error.message);
                return { ok: true, from: deal.stage, to: "closed_lost" };
            }

            case "schedule_followup": {
                const deal = await assertDeal(String(args.deal_id));
                const title = String(args.title ?? "").trim();
                if (!title) throw new Error("title obrigatorio");
                const remindAt = new Date(String(args.remind_at ?? ""));
                if (Number.isNaN(remindAt.getTime())) throw new Error("remind_at invalido (use ISO 8601)");
                if (remindAt.getTime() <= Date.now()) throw new Error("remind_at precisa ser no futuro");

                const userId = deal.user_id ?? ownerUserId;
                if (!userId) throw new Error("deal sem dono: nao da pra criar lembrete");

                const { data: created, error } = await supabase
                    .from("follow_up_reminders")
                    .insert({
                        deal_id: deal.id,
                        user_id: userId,
                        company_id: companyId,
                        title: title.slice(0, 160),
                        description: args.description ? String(args.description).slice(0, 500) : null,
                        remind_at: remindAt.toISOString(),
                    })
                    .select("id")
                    .single();
                if (error) throw new Error(error.message);
                return { ok: true, reminder_id: created.id, remind_at: remindAt.toISOString() };
            }

            case "log_deal_activity": {
                const deal = await assertDeal(String(args.deal_id));
                const activityType = String(args.activity_type ?? "");
                const allowed = new Set([
                    "note_added", "call_made", "email_sent", "meeting_scheduled", "field_updated",
                ]);
                if (!allowed.has(activityType)) {
                    throw new Error(`activity_type invalido. Use: ${[...allowed].join(", ")}`);
                }
                const userId = deal.user_id ?? ownerUserId;
                if (!userId) throw new Error("deal sem dono: nao da pra registrar atividade");

                const { error } = await supabase.from("deal_activities").insert({
                    deal_id: deal.id,
                    company_id: companyId,
                    user_id: userId,
                    activity_type: activityType,
                    description: String(args.description ?? "").slice(0, 500) || null,
                    metadata: { by: "eva" },
                });
                if (error) throw new Error(error.message);
                return { ok: true };
            }

            case "get_conversation_summary": {
                const dealId = args.deal_id ? String(args.deal_id) : null;
                const chatPhone = args.chat_phone ? String(args.chat_phone).replace(/\D/g, "") : null;
                if (!dealId && !chatPhone) throw new Error("informe deal_id ou chat_phone");

                let query = supabase
                    .from("conversation_summaries")
                    .select("summary, temperature, sentiment, next_action, objections, stage_suggestion, message_count, last_message_at")
                    .eq("company_id", companyId)
                    .order("last_message_at", { ascending: false })
                    .limit(1);
                query = dealId ? query.eq("deal_id", dealId) : query.ilike("chat_phone", `%${chatPhone!.slice(-8)}`);

                const { data, error } = await query.maybeSingle();
                if (error) throw new Error(error.message);
                if (!data) return { ok: true, found: false, note: "nenhuma leitura de conversa para este lead" };
                return { ok: true, found: true, ...data };
            }

            case "list_deals_needing_attention": {
                const staleDays = Math.min(Math.max(Number(args.stale_days) || 3, 1), 60);
                const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
                const { data, error } = await supabase
                    .from("deals")
                    .select("id, title, customer_name, stage, updated_at, customer_phone")
                    .eq("company_id", companyId)
                    .not("stage", "in", "(closed_won,closed_lost)")
                    .lt("updated_at", cutoff)
                    .order("updated_at", { ascending: true })
                    .limit(Math.min(Number(args.limit) || 10, 25));
                if (error) throw new Error(error.message);
                return { ok: true, stale_days: staleDays, deals: data ?? [] };
            }

            default:
                throw new Error(`tool desconhecida: ${toolKey}`);
        }
    }

    return execute;
}

// ── Serve ───────────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    try {
        if (!OPENAI_API_KEY) return json(500, { error: "OPENAI_API_KEY nao configurada" });

        const authHeader = req.headers.get("Authorization") ?? "";
        const cronSecret = req.headers.get("x-cron-secret");
        const isServiceCall = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
        const isCronCall = Boolean(EVA_CRON_SECRET && cronSecret && cronSecret === EVA_CRON_SECRET);

        // O corpo do request só pode ser lido uma vez: reler devolve stream
        // consumido e derruba goal/deal_id no silêncio do catch.
        const body = await req.json().catch(() => ({} as Record<string, unknown>));

        let companyId: string | null = null;
        if (isServiceCall || isCronCall) {
            companyId = (body.company_id as string) ?? null;
            if (!companyId) return json(400, { error: "service call requer company_id" });
        } else {
            if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
            const userSupabase = createClient(SUPABASE_URL, ANON_KEY, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user }, error } = await userSupabase.auth.getUser();
            if (error || !user) return json(401, { error: "Unauthorized" });
            const { data: prof } = await supabase
                .from("profiles")
                .select("company_id")
                .eq("id", user.id)
                .single();
            companyId = prof?.company_id ?? null;
            if (!companyId) return json(403, { error: "sem empresa vinculada" });
        }

        const goal = body.goal as string | undefined;
        const dealId = body.deal_id as string | undefined;
        const agentKey = (body.agent_key as string) ?? "eva";
        const maxSteps: number = Math.min(Number(body.max_steps) || MAX_ITERATIONS, MAX_ITERATIONS);

        // Catálogo ativo vem do banco (fonte de verdade), não de constantes.
        const { data: toolsData, error: toolsErr } = await supabase
            .from("agent_tools")
            .select("tool_key, name, description, kind, parameters_schema")
            .eq("enabled", true);
        if (toolsErr) return json(500, { error: `catalogo falhou: ${toolsErr.message}` });
        const tools = (toolsData ?? []) as ToolDef[];
        if (tools.length === 0) return json(500, { error: "catalogo vazio" });

        // Run aberto antes do loop; steps apontam pra ele via update por seq.
        const { data: run, error: runErr } = await supabase
            .from("agent_runs")
            .insert({
                company_id: companyId,
                agent_key: agentKey,
                source: isServiceCall || isCronCall ? "api" : "manual",
                deal_id: dealId ?? null,
                goal: goal ?? null,
                input: { deal_id: dealId ?? null, goal: goal ?? null },
                model: MODEL,
            })
            .select("id")
            .single();
        if (runErr || !run) return json(500, { error: `run falhou: ${runErr?.message}` });
        const runId = run.id;

        let stepSeq = 0;
        const logStep: StepLogger = async (kind, p) => {
            stepSeq += 1;
            await supabase.from("agent_steps").insert({
                run_id: runId,
                company_id: p.companyId,
                seq: stepSeq,
                kind,
                tool_key: p.toolKey ?? null,
                arguments: p.arguments ?? null,
                output: p.output ?? null,
                status: p.status ?? "ok",
                error: p.error ?? null,
                duration_ms: p.durationMs ?? null,
            }).then(() => {}, () => {});
        };

        const ownerUserId = await resolveOwnerUserId(companyId);
        const executeTool = makeExecutor(companyId, ownerUserId, logStep);

        const openaiTools = tools.map((t) => ({
            type: "function",
            function: {
                name: t.tool_key,
                description: `[${t.kind}] ${t.description}`,
                parameters: t.parameters_schema,
            },
        }));

        const businessContext = await buildBusinessContext(companyId);

        const messages: ChatMessage[] = [
            { role: "system", content: `${SYSTEM_PROMPT}${businessContext}` },
            {
                role: "user",
                content: [
                    dealId ? `Deal alvo: ${dealId}` : "Nenhum deal especificado.",
                    goal ? `Objetivo deste run: ${goal}` : "Objetivo: diagnostico e proximo passo.",
                    "Execute com autonomia graduada: interno voce faz, saida pro lead vira rascunho.",
                ].join("\n"),
            },
        ];

        let tokensPrompt = 0;
        let tokensCompletion = 0;
        let iterations = 0;
        let finalText = "";
        let loopError: string | null = null;

        while (iterations < maxSteps) {
            iterations += 1;
            const llmStart = Date.now();
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages,
                    tools: openaiTools,
                    max_completion_tokens: MAX_COMPLETION_TOKENS,
                }),
            });
            if (!res.ok) {
                loopError = `openai ${res.status}: ${(await res.text()).slice(0, 300)}`;
                break;
            }
            const completion = await res.json();
            tokensPrompt += completion.usage?.prompt_tokens ?? 0;
            tokensCompletion += completion.usage?.completion_tokens ?? 0;
            await logStep("llm_call", {
                seq: iterations, runId, companyId,
                output: {
                    iteration: iterations,
                    tool_calls: completion.choices?.[0]?.message?.tool_calls?.length ?? 0,
                    duration_ms: Date.now() - llmStart,
                },
            });

            const msg = completion.choices?.[0]?.message;
            if (!msg) {
                loopError = "resposta vazia da IA";
                break;
            }

            const toolCalls = msg.tool_calls ?? [];
            if (toolCalls.length === 0) {
                finalText = String(msg.content ?? "");
                messages.push({ role: "assistant", content: finalText });
                break;
            }

            messages.push({
                role: "assistant",
                content: msg.content ?? null,
                tool_calls: toolCalls,
            });

            for (const call of toolCalls) {
                const fnName = call.function?.name ?? "";
                const tool = tools.find((t) => t.tool_key === fnName);
                let result: unknown;
                if (!tool) {
                    result = { error: `tool nao catalogada: ${fnName}` };
                    await logStep("error", {
                        seq: iterations, runId, companyId, toolKey: fnName,
                        status: "denied", error: "tool fora do catalogo",
                    });
                } else {
                    let parsedArgs: Record<string, unknown> = {};
                    try {
                        parsedArgs = JSON.parse(call.function?.arguments ?? "{}");
                    } catch {
                        parsedArgs = {};
                    }
                    result = await executeTool(fnName, parsedArgs);
                }
                messages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(result).slice(0, 4000),
                });
            }
        }

        if (iterations >= maxSteps && !finalText && !loopError) {
            loopError = `teto de iteracoes (${maxSteps}) atingido sem resposta final`;
        }

        const status = loopError ? "failed" : "succeeded";
        await supabase
            .from("agent_runs")
            .update({
                status,
                result: finalText ? { summary: finalText } : null,
                error: loopError,
                tokens_prompt: tokensPrompt,
                tokens_completion: tokensCompletion,
                steps_used: iterations,
                finished_at: new Date().toISOString(),
            })
            .eq("id", runId);

        return json(loopError ? 502 : 200, {
            ok: !loopError,
            run_id: runId,
            status,
            iterations,
            summary: finalText || null,
            error: loopError,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[eva-agent-loop] fatal", msg);
        return json(500, { error: msg });
    }
});
