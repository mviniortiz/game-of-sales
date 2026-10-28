// ─────────────────────────────────────────────────────────────────────────────
// atendente-responder (2026-10-28) — o modo atendente.
//
// ÚNICA exceção à regra "nada sai pro lead sem aprovação" (ver CLAUDE.md):
// responde sozinho, no WhatsApp da própria empresa, quem escreveu primeiro, e
// só sobre dúvidas e agendamento. Só roda em empresa com
// atendente_config.enabled, que só service_role e super admin ligam. Nunca
// inicia conversa, nunca faz prospecção nem follow-up de venda.
//
// Actions:
//   responder  (service_role; chamada pelos webhooks via _shared/atendenteHook)
//              { messageId } da mensagem recebida em channel_messages. Espera a
//              rajada acabar, aplica as travas de decidirResposta, roda o
//              Claude com as ferramentas de agenda e envia pela conexão da
//              conversa (Kapso, ou QR no Whatsmiau, que fala as rotas da
//              Evolution). Ao passar para o dono, avisa o
//              dono e pausa a conversa.
//   simular    (usuário da empresa) { companyId?, history, text } Mesmo motor,
//              sem WhatsApp: a tela de configuração usa para testar. Agenda de
//              verdade, com source='teste'. Funciona com a flag desligada.
//
// Modelo: só Claude (dado de saúde em clínicas e fisios), sem troca de
// provedor. ATENDENTE_MODEL troca o modelo sem deploy.
//
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//      ANTHROPIC_API_KEY, ATENDENTE_MODEL (opcional), KAPSO_API_KEY,
//      EVOLUTION_API_URL/KEY, EVA_WHATSAPP_PHONE_NUMBER_ID (aviso ao dono).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    ATENDENTE_TEMPLATE,
    avisoParaDono,
    configDaLinha,
    decidirResposta,
    ferramentasDoAtendente,
    historicoParaChat,
    horariosLivres,
    intervaloDoHorario,
    limparResposta,
    localParaUtc,
    promptDoAtendente,
    utcParaLocal,
    type AtendenteConfig,
    type Ocupado,
} from "../_shared/atendente.ts";
import { anthropicChat } from "../_shared/llmAnthropic.ts";
import { KAPSO_WHATSAPP, kapsoFetch } from "../_shared/kapso.ts";
import { isServiceCall } from "../_shared/serviceAuth.ts";
import { evaPhoneNumberId, evolutionRequest, normalizeNumber, templateParam } from "../_shared/whatsappApproval.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = Deno.env.get("ATENDENTE_MODEL") || "claude-haiku-5-5";

const MAX_PASSOS = 6;
const MAX_HISTORICO = 30;
/** Espera a pessoa terminar de digitar: rajada de mensagens vira uma resposta. */
const ESPERA_RAJADA_MS = 6000;
const ESPERA_OUTRA_RUN_MS = 60_000;
/** Tetos de custo e de conversa que saiu do trilho. */
const TETO_POR_CONVERSA_24H = 30;
const TETO_POR_EMPRESA_24H = 500;
const JANELA_ENVIO_MS = 30_000;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Agenda ──────────────────────────────────────────────────────────────────

/** O que está ocupado num dia. Ponto de ligação do Google Agenda: quando
 *  calendar_provider = 'google', somar aqui o freeBusy da agenda do dono. */
async function ocupadosDoDia(companyId: string, cfg: AtendenteConfig, iso: string): Promise<Ocupado[]> {
    const ini = localParaUtc(iso, 0, cfg.timezone).toISOString();
    const fim = localParaUtc(iso, 1440, cfg.timezone).toISOString();
    const { data, error } = await admin
        .from("atendente_agendamentos")
        .select("starts_at, ends_at")
        .eq("company_id", companyId)
        .eq("status", "confirmado")
        .lt("starts_at", fim)
        .gt("ends_at", ini);
    if (error) throw new Error(`agenda: ${error.message}`);
    return (data || []) as Ocupado[];
}

// ── Motor ───────────────────────────────────────────────────────────────────

type Contexto = {
    companyId: string;
    cfg: AtendenteConfig;
    conversationId: string | null;
    contactId: string | null;
    contactPhone: string | null;
    contactName: string | null;
    simulacao: boolean;
};

type Evento =
    | { type: "booking"; id: string; servico: string; data: string; hora: string; nome: string }
    | { type: "cancel"; id: string }
    | { type: "handoff"; motivo: string; resumo: string };

type Resultado = { reply: string; handoff: { motivo: string; resumo: string } | null; eventos: Evento[]; tools: string[]; usage: { input: number; output: number } };

/** Filtro dos agendamentos "desta pessoa": a conversa, ou na simulação os de teste. */
// deno-lint-ignore no-explicit-any
function dessaPessoa(q: any, ctx: Contexto) {
    return ctx.simulacao ? q.eq("source", "teste") : q.eq("conversation_id", ctx.conversationId);
}

async function executar(ctx: Contexto, nome: string, args: Record<string, unknown>): Promise<{ result: unknown; evento?: Evento }> {
    const { cfg, companyId } = ctx;
    switch (nome) {
        case "buscar_horarios": {
            const data = String(args.data || "");
            const ocupados = /^\d{4}-\d{2}-\d{2}$/.test(data) ? await ocupadosDoDia(companyId, cfg, data) : [];
            return { result: horariosLivres(cfg, data, String(args.servico || ""), ocupados) };
        }
        case "agendar": {
            const data = String(args.data || "");
            const hora = String(args.hora || "");
            const servicoId = String(args.servico || "");
            const nomeCliente = String(args.nome || "").trim();
            if (!nomeCliente) return { result: { erro: "Falta o nome para agendar." } };
            const intervalo = intervaloDoHorario(cfg, data, hora, servicoId);
            if (!intervalo) return { result: { erro: "Data, hora ou serviço inválido." } };
            const livres = horariosLivres(cfg, data, servicoId, await ocupadosDoDia(companyId, cfg, data));
            if (!livres.ok) return { result: livres };
            if (!livres.horarios.includes(hora)) return { result: { erro: "Esse horário não está livre.", horariosLivres: livres.horarios } };
            const { data: r, error } = await admin.rpc("atendente_reservar", {
                p_company_id: companyId,
                p_starts_at: intervalo.startsAt.toISOString(),
                p_ends_at: intervalo.endsAt.toISOString(),
                p_service_id: servicoId,
                p_service_label: intervalo.servico[1],
                p_customer_name: nomeCliente.slice(0, 120),
                p_customer_phone: ctx.contactPhone,
                p_conversation_id: ctx.conversationId,
                p_contact_id: ctx.contactId,
                p_source: ctx.simulacao ? "teste" : "atendente",
                p_notes: String(args.observacoes || "").slice(0, 500) || null,
            });
            if (error) throw new Error(`reserva: ${error.message}`);
            if (!r?.ok) return { result: { erro: r?.erro === "ocupado" ? "Esse horário acabou de ser ocupado." : "Não consegui marcar." } };
            const quando = utcParaLocal(intervalo.startsAt, cfg.timezone);
            return {
                result: { confirmado: true, id: r.id, servico: intervalo.servico[1], data: quando.data, diaDaSemana: quando.diaSemana, hora: quando.hora },
                evento: { type: "booking", id: r.id, servico: intervalo.servico[1], data: quando.data, hora: quando.hora, nome: nomeCliente },
            };
        }
        case "meus_agendamentos": {
            const q = admin
                .from("atendente_agendamentos")
                .select("id, service_label, starts_at")
                .eq("company_id", companyId)
                .eq("status", "confirmado")
                .gt("starts_at", new Date().toISOString())
                .order("starts_at")
                .limit(5);
            const { data, error } = await dessaPessoa(q, ctx);
            if (error) throw new Error(`agenda: ${error.message}`);
            return {
                result: {
                    agendamentos: (data || []).map((a: { id: string; service_label: string; starts_at: string }) => {
                        const l = utcParaLocal(a.starts_at, cfg.timezone);
                        return { id: a.id, servico: a.service_label, data: l.data, diaDaSemana: l.diaSemana, hora: l.hora };
                    }),
                },
            };
        }
        case "cancelar_agendamento": {
            const id = String(args.id || "");
            if (!/^[0-9a-f-]{36}$/i.test(id)) return { result: { erro: "Id inválido." } };
            const q = admin
                .from("atendente_agendamentos")
                .update({ status: "cancelado" })
                .eq("company_id", companyId)
                .eq("id", id)
                .eq("status", "confirmado");
            const { data, error } = await dessaPessoa(q, ctx).select("id");
            if (error) throw new Error(`cancelamento: ${error.message}`);
            if (!data?.length) return { result: { erro: "Não achei esse agendamento entre os seus." } };
            return { result: { cancelado: true }, evento: { type: "cancel", id } };
        }
        case "passar_para_dono": {
            const motivo = String(args.motivo || "pedido fora do padrão").slice(0, 200);
            const resumo = String(args.resumo || "").slice(0, 800);
            return { result: { ok: true, aviso: "O dono foi avisado e continua a conversa." }, evento: { type: "handoff", motivo, resumo } };
        }
        default:
            return { result: { erro: `Ferramenta desconhecida: ${nome}` } };
    }
}

async function rodarAtendente(ctx: Contexto, historico: { role: "user" | "assistant"; content: string }[]): Promise<Resultado> {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    const tools = ferramentasDoAtendente(ctx.cfg);
    // deno-lint-ignore no-explicit-any
    const messages: any[] = [
        { role: "system", content: promptDoAtendente(ctx.cfg, { nomeContato: ctx.contactName, simulacao: ctx.simulacao }) },
        ...historico,
    ];
    const eventos: Evento[] = [];
    const usados: string[] = [];
    const usage = { input: 0, output: 0 };

    for (let passo = 0; passo < MAX_PASSOS; passo++) {
        const { status, text } = await anthropicChat(
            { messages, tools, max_tokens: 700 },
            MODEL,
            { apiKey, timeoutMs: 45_000, effort: "low", wantsJson: false },
        );
        if (status < 200 || status >= 300) throw new Error(`claude ${status}: ${text.slice(0, 200)}`);
        const completion = JSON.parse(text);
        usage.input += completion.usage?.prompt_tokens || 0;
        usage.output += completion.usage?.completion_tokens || 0;
        const msg = completion.choices?.[0]?.message;
        const calls = (msg?.tool_calls || []) as { id: string; function: { name: string; arguments: string } }[];
        messages.push({ role: "assistant", content: msg?.content ?? null, tool_calls: calls.length ? calls : undefined, provider_content: msg?.provider_content });

        if (!calls.length) {
            const handoff = eventos.find((e): e is Extract<Evento, { type: "handoff" }> => e.type === "handoff") || null;
            return { reply: limparResposta(msg?.content), handoff: handoff ? { motivo: handoff.motivo, resumo: handoff.resumo } : null, eventos, tools: usados, usage };
        }
        for (const call of calls) {
            let args: Record<string, unknown> = {};
            try {
                args = JSON.parse(call.function.arguments || "{}");
            } catch { /* args vazios */ }
            usados.push(call.function.name);
            const out = await executar(ctx, call.function.name, args);
            if (out.evento) eventos.push(out.evento);
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out.result) });
        }
    }
    // Loop sem fim: em vez de improvisar, passa para o dono.
    return {
        reply: "",
        handoff: { motivo: "o atendente não conseguiu concluir", resumo: "A conversa precisou de mais passos do que o atendente consegue. Leia as últimas mensagens." },
        eventos,
        tools: usados,
        usage,
    };
}

// ── Envio ───────────────────────────────────────────────────────────────────

type Conexao = { id: string; provider: string; external_id: string; metadata: Record<string, unknown> | null };
type Contato = { id: string; external_contact_id: string; phone_e164: string | null; name: string | null; is_group: boolean };

/** Envia pela mesma conexão da conversa e devolve o id da mensagem. */
async function enviarParaCliente(conn: Conexao, contato: Contato, texto: string): Promise<string | null> {
    const numero = normalizeNumber(contato.phone_e164 || "");
    if (!numero) throw new Error("contato sem telefone");
    if (conn.provider === "meta_cloud" && conn.metadata?.transport === "kapso") {
        const res = await kapsoFetch(`${KAPSO_WHATSAPP}/${conn.external_id}/messages`, {
            method: "POST",
            body: JSON.stringify({ messaging_product: "whatsapp", to: numero, type: "text", text: { body: texto } }),
        });
        return res?.messages?.[0]?.id || null;
    }
    if (conn.provider === "evolution") {
        const res = await evolutionRequest(`/message/sendText/${conn.external_id}`, {
            method: "POST",
            body: JSON.stringify({ number: numero, text: texto, delay: 900, presence: "composing" }),
        }, 20000);
        return res?.key?.id || null;
    }
    throw new Error(`canal não suportado: ${conn.provider}`);
}

/** Grava a resposta na conversa já marcada como do atendente; o eco do
 *  webhook cai no mesmo provider_message_id e não duplica. */
async function gravarEnviada(companyId: string, conn: Conexao, contato: Contato, providerMessageId: string, texto: string) {
    const { error } = await admin.rpc("ingest_channel_message", {
        p_company_id: companyId,
        p_provider: conn.provider,
        p_channel_type: "whatsapp",
        p_payload: {
            connection: { external_id: conn.external_id, metadata: {} },
            contact: { external_id: contato.external_contact_id, name: null, phone_e164: contato.phone_e164, is_group: false, metadata: {} },
            message: {
                provider_message_id: providerMessageId,
                direction: "outbound",
                message_type: "text",
                body: texto,
                media_ref: {},
                status: "sent",
                sent_by_user_id: null,
                message_timestamp: new Date().toISOString(),
                metadata: { sent_by: "atendente", chat_phone: contato.phone_e164 },
            },
            raw_payload: null,
        },
    });
    if (error) console.warn("[atendente] resposta não gravada no Inbox:", error.message);
}

/** Aviso de "passei pra você" no WhatsApp pessoal do dono. Pelo número oficial
 *  da EVA: texto livre se a janela de 24h estiver aberta, senão o template. Sem
 *  número da EVA e com Evolution, sai da própria instância. Devolve o erro. */
async function avisarDono(cfg: AtendenteConfig, ownerPhone: string | null, conn: Conexao, contato: Contato, motivo: string, resumo: string): Promise<string | null> {
    const destino = normalizeNumber(ownerPhone || "");
    if (!destino) return "sem owner_alert_phone na config";
    const texto = avisoParaDono({ negocio: cfg.business_name, contato: contato.name, telefone: contato.phone_e164, motivo, resumo });
    const evaId = evaPhoneNumberId();
    if (evaId) {
        try {
            await kapsoFetch(`${KAPSO_WHATSAPP}/${evaId}/messages`, {
                method: "POST",
                body: JSON.stringify({ messaging_product: "whatsapp", to: destino, type: "text", text: { body: texto } }),
            });
            return null;
        } catch (e) {
            console.warn("[atendente] aviso em texto falhou, tentando template:", (e as Error).message.slice(0, 160));
        }
        try {
            await kapsoFetch(`${KAPSO_WHATSAPP}/${evaId}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: destino,
                    type: "template",
                    template: {
                        name: ATENDENTE_TEMPLATE,
                        language: { code: "pt_BR" },
                        components: [{
                            type: "body",
                            parameters: [
                                { type: "text", parameter_name: "negocio", text: templateParam(cfg.business_name || "sua empresa", 60) },
                                { type: "text", parameter_name: "cliente", text: templateParam([contato.name, contato.phone_e164 ? `+${contato.phone_e164}` : null].filter(Boolean).join(" · ") || "um cliente", 80) },
                                { type: "text", parameter_name: "motivo", text: templateParam(motivo, 160) },
                            ],
                        }],
                    },
                }),
            });
            return null;
        } catch (e) {
            return `aviso pelo número da EVA falhou: ${(e as Error).message.slice(0, 200)}`;
        }
    }
    if (conn.provider === "evolution") {
        try {
            await evolutionRequest(`/message/sendText/${conn.external_id}`, { method: "POST", body: JSON.stringify({ number: destino, text: texto }) }, 20000);
            return null;
        } catch (e) {
            return `aviso pela instância falhou: ${(e as Error).message.slice(0, 200)}`;
        }
    }
    return "sem número da EVA configurado para avisar o dono";
}

// ── responder ───────────────────────────────────────────────────────────────

async function fecharRun(runId: string, patch: Record<string, unknown>) {
    await admin.from("atendente_runs").update({ ...patch, finished_at: new Date().toISOString() }).eq("id", runId);
}

async function responder(messageId: string): Promise<Response> {
    const { data: msg } = await admin
        .from("channel_messages")
        .select("id, company_id, connection_id, conversation_id, contact_id, direction, message_type, body, message_timestamp")
        .eq("id", messageId)
        .maybeSingle();
    if (!msg || msg.direction !== "inbound") return json(404, { error: "mensagem recebida não encontrada" });

    const { data: cfgRow } = await admin.from("atendente_config").select("*").eq("company_id", msg.company_id).maybeSingle();
    if (!cfgRow?.enabled) return json(200, { skipped: "desligado" });
    const cfg = configDaLinha(cfgRow);

    const { data: run, error: runErr } = await admin
        .from("atendente_runs")
        .insert({ company_id: msg.company_id, conversation_id: msg.conversation_id, inbound_message_id: msg.id, model: MODEL })
        .select("id")
        .single();
    // unique em inbound_message_id: reenvio do webhook não responde duas vezes.
    if (runErr || !run) return json(200, { skipped: "duplicado" });

    try {
        await dormir(ESPERA_RAJADA_MS);
        const { data: ultima } = await admin
            .from("channel_messages")
            .select("id")
            .eq("conversation_id", msg.conversation_id)
            .eq("direction", "inbound")
            .order("message_timestamp", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (ultima && ultima.id !== msg.id) {
            await fecharRun(run.id, { status: "skipped", skip_reason: "mensagem_mais_nova" });
            return json(200, { skipped: "mensagem_mais_nova" });
        }

        // Outra resposta em andamento na mesma conversa: espera ela sair para ler o histórico com ela.
        const limite = Date.now() + ESPERA_OUTRA_RUN_MS;
        while (Date.now() < limite) {
            const { data: outra } = await admin
                .from("atendente_runs")
                .select("id")
                .eq("conversation_id", msg.conversation_id)
                .eq("status", "running")
                .neq("id", run.id)
                .gt("started_at", new Date(Date.now() - 2 * ESPERA_OUTRA_RUN_MS).toISOString())
                .limit(1)
                .maybeSingle();
            if (!outra) break;
            await dormir(2000);
        }

        const [{ data: conn }, { data: contato }, { data: conversa }, { data: canal }] = await Promise.all([
            admin.from("channel_connections").select("id, provider, external_id, metadata").eq("id", msg.connection_id).maybeSingle(),
            admin.from("channel_contacts").select("id, external_contact_id, phone_e164, name, is_group").eq("id", msg.contact_id).maybeSingle(),
            admin.from("atendente_conversas").select("*").eq("conversation_id", msg.conversation_id).maybeSingle(),
            admin.from("channel_conversations").select("last_outbound_at").eq("id", msg.conversation_id).maybeSingle(),
        ]);
        if (!conn || !contato) {
            await fecharRun(run.id, { status: "skipped", skip_reason: "sem_conexao_ou_contato" });
            return json(200, { skipped: "sem_conexao_ou_contato" });
        }

        // Sem linha ainda: tudo que saiu antes do atendente existir foi o dono.
        // É isso que garante "só quem escreve primeiro": cliente que já conversa
        // com o dono continua com o dono.
        const estado = conversa || { estado: "ativo" as const, pausado_em: null, dono_respondeu_em: canal?.last_outbound_at || null };
        const decisao = decidirResposta({
            enabled: true,
            isGroup: contato.is_group,
            temTelefone: Boolean(normalizeNumber(contato.phone_e164 || "")),
            mensagemEm: msg.message_timestamp,
            conversa: estado,
            retomarAposHoras: Number(cfgRow.resume_after_hours) || 24,
        });
        if (!decisao.responder) {
            await fecharRun(run.id, { status: "skipped", skip_reason: decisao.motivo });
            return json(200, { skipped: decisao.motivo });
        }

        const desde = new Date(Date.now() - 86_400_000).toISOString();
        const [{ count: daConversa }, { count: daEmpresa }] = await Promise.all([
            admin.from("atendente_runs").select("id", { count: "exact", head: true }).eq("conversation_id", msg.conversation_id).in("status", ["replied", "handoff"]).gt("started_at", desde),
            admin.from("atendente_runs").select("id", { count: "exact", head: true }).eq("company_id", msg.company_id).in("status", ["replied", "handoff"]).gt("started_at", desde),
        ]);
        if ((daEmpresa || 0) >= TETO_POR_EMPRESA_24H) {
            await fecharRun(run.id, { status: "skipped", skip_reason: "teto_empresa" });
            return json(200, { skipped: "teto_empresa" });
        }

        const ctx: Contexto = {
            companyId: msg.company_id,
            cfg,
            conversationId: msg.conversation_id,
            contactId: contato.id,
            contactPhone: normalizeNumber(contato.phone_e164 || ""),
            contactName: contato.name,
            simulacao: false,
        };

        // Reação, localização e o que a Meta não classifica não pedem resposta.
        if (!["text", "audio", "image", "video", "document"].includes(msg.message_type)) {
            await fecharRun(run.id, { status: "skipped", skip_reason: `tipo_${msg.message_type}` });
            return json(200, { skipped: `tipo_${msg.message_type}` });
        }

        let resultado: Resultado;
        const negocio = cfg.business_name || "a equipe";
        if ((daConversa || 0) >= TETO_POR_CONVERSA_24H) {
            resultado = { reply: `Vou passar sua conversa para ${negocio}, que continua com você por aqui.`, handoff: { motivo: "conversa longa demais para o atendente", resumo: "Passou do limite de respostas automáticas em 24h." }, eventos: [], tools: [], usage: { input: 0, output: 0 } };
        } else if (msg.message_type !== "text") {
            // Sem transcrição de propósito: áudio de saúde mal transcrito não pode virar agendamento.
            resultado = conversa?.pediu_texto
                ? { reply: `Vou passar sua mensagem para ${negocio}, que te responde por aqui.`, handoff: { motivo: `mandou ${msg.message_type}`, resumo: "A pessoa mandou áudio ou arquivo, que o atendente não lê." }, eventos: [], tools: [], usage: { input: 0, output: 0 } }
                : { reply: "Por aqui eu consigo ler só mensagem escrita. Pode me mandar por texto?", handoff: null, eventos: [], tools: [], usage: { input: 0, output: 0 } };
        } else {
            const { data: msgs } = await admin
                .from("channel_messages")
                .select("direction, body, message_type, message_timestamp")
                .eq("conversation_id", msg.conversation_id)
                .gt("message_timestamp", desde)
                .order("message_timestamp", { ascending: false })
                .limit(MAX_HISTORICO);
            resultado = await rodarAtendente(ctx, historicoParaChat((msgs || []).reverse()));
        }

        const reply = resultado.reply || (resultado.handoff ? `Vou passar sua conversa para ${negocio}, que continua com você por aqui.` : "");
        const base = { conversation_id: msg.conversation_id, company_id: msg.company_id };
        let enviadoId: string | null = null;
        if (reply) {
            await admin.from("atendente_conversas").upsert(
                { ...base, enviando_ate: new Date(Date.now() + JANELA_ENVIO_MS).toISOString(), ...(decisao.retomar ? { estado: "ativo", motivo: null } : {}) },
                { onConflict: "conversation_id" },
            );
            enviadoId = await enviarParaCliente(conn as Conexao, contato as Contato, reply);
            const { data: atual } = await admin.from("atendente_conversas").select("bot_message_ids").eq("conversation_id", msg.conversation_id).maybeSingle();
            const ids = [...(atual?.bot_message_ids || []), ...(enviadoId ? [enviadoId] : [])].slice(-50);
            await admin.from("atendente_conversas").update({ bot_message_ids: ids, enviando_ate: null, ...(msg.message_type !== "text" ? { pediu_texto: true } : {}) }).eq("conversation_id", msg.conversation_id);
            if (enviadoId) await gravarEnviada(msg.company_id, conn as Conexao, contato as Contato, enviadoId, reply);
        }

        if (resultado.handoff) {
            const erroAviso = await avisarDono(cfg, cfgRow.owner_alert_phone, conn as Conexao, contato as Contato, resultado.handoff.motivo, resultado.handoff.resumo);
            if (erroAviso) console.warn("[atendente] aviso ao dono:", erroAviso);
            await admin.from("atendente_conversas").upsert(
                { ...base, estado: "com_dono", motivo: resultado.handoff.motivo, resumo: resultado.handoff.resumo, pausado_em: new Date().toISOString(), aviso_dono_erro: erroAviso },
                { onConflict: "conversation_id" },
            );
        }

        await fecharRun(run.id, {
            status: resultado.handoff ? "handoff" : enviadoId ? "replied" : "skipped",
            skip_reason: resultado.handoff || enviadoId ? null : "sem_resposta",
            tools_used: resultado.tools,
            input_tokens: resultado.usage.input,
            output_tokens: resultado.usage.output,
        });
        return json(200, { ok: true, replied: Boolean(enviadoId), handoff: Boolean(resultado.handoff), eventos: resultado.eventos });
    } catch (e) {
        const erro = (e as Error).message.slice(0, 500);
        console.error("[atendente] erro:", erro);
        await fecharRun(run.id, { status: "error", error: erro });
        return json(500, { error: erro });
    }
}

// ── simular ─────────────────────────────────────────────────────────────────

async function simular(req: Request, body: { companyId?: string; history?: unknown; text?: string }): Promise<Response> {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });
    const { data: profile } = await admin.from("profiles").select("company_id, is_super_admin").eq("id", user.id).maybeSingle();
    if (!profile) return json(403, { error: "Profile not found" });
    const companyId = profile.is_super_admin ? body.companyId || profile.company_id : profile.company_id;
    if (!companyId) return json(400, { error: "companyId is required" });

    const { data: cfgRow } = await admin.from("atendente_config").select("*").eq("company_id", companyId).maybeSingle();
    if (!cfgRow) return json(404, { error: "Configure o atendente antes de testar." });

    const texto = String(body.text || "").trim().slice(0, 600);
    if (!texto) return json(400, { error: "Mensagem vazia" });
    const anterior = Array.isArray(body.history)
        ? (body.history as { role?: string; content?: string }[])
            .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-MAX_HISTORICO)
            .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 1500) }))
        : [];
    const historico = [...anterior, { role: "user" as const, content: texto }];

    const resultado = await rodarAtendente(
        { companyId, cfg: configDaLinha(cfgRow), conversationId: null, contactId: null, contactPhone: null, contactName: null, simulacao: true },
        historico,
    );
    const reply = resultado.reply || (resultado.handoff ? `Vou passar sua conversa para ${cfgRow.business_name || "a equipe"}.` : "");
    return json(200, { reply, handoff: resultado.handoff, eventos: resultado.eventos, history: [...historico, { role: "assistant", content: reply }] });
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "method not allowed" });
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "invalid json" });
    }
    try {
        if (body.action === "responder") {
            if (!isServiceCall(req)) return json(401, { error: "Unauthorized" });
            if (typeof body.messageId !== "string") return json(400, { error: "messageId is required" });
            return await responder(body.messageId);
        }
        if (body.action === "simular") return await simular(req, body as { companyId?: string; history?: unknown; text?: string });
        return json(400, { error: "action inválida" });
    } catch (e) {
        console.error("[atendente]", body.action, (e as Error).message);
        return json(500, { error: "O atendente teve um problema agora." });
    }
});
