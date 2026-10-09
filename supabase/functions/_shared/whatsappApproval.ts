// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL.1 (2026-08-24) — Aprovar o rascunho da EVA pelo WhatsApp do dono.
//
// Medido antes de escrever isto: 162 de 175 agent_suggestions estavam 'pending'.
// A fila não andava porque aprovar exigia abrir o app. Aqui a aprovação vai até
// onde o dono já está: a EVA manda o rascunho no WhatsApp dele com um código
// curto, ele responde 1 (envia), 2 (descarta) ou escreve o texto corrigido.
//
// A regra de produto continua: NENHUMA mensagem sai sem decisão humana. Só muda
// a superfície onde a decisão acontece.
//
// Usado por: edge eva-approval (notificação), edge evolution-message-webhook
// (resposta do dono no próprio chat) e edge kapso-webhook (resposta do dono no
// número oficial da EVA).
//
// Dois canais entre a EVA e o dono:
//   - Número oficial da EVA (API oficial do WhatsApp, via Kapso), quando
//     EVA_WHATSAPP_PHONE_NUMBER_ID está configurado. O aviso chega como
//     mensagem de outro contato, com notificação, e tem botões Enviar e
//     Descartar.
//   - Sem ele, o próprio número do dono manda o aviso para ele mesmo.
// Nos dois casos a retomada para o lead sai do número do integrador. O número
// da EVA só conversa com o dono.

import { KAPSO_WHATSAPP, kapsoFetch } from "./kapso.ts";
// ─────────────────────────────────────────────────────────────────────────────

// Lidas dentro da função, não no topo: assim o parser de comandos deste mesmo
// arquivo pode ser importado pelos testes do front, que rodam em Node e não
// têm o global Deno.
function evolutionEnv(): { url?: string; key?: string } {
    const env = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env;
    return {
        url: env?.get("EVOLUTION_API_URL")?.replace(/\/+$/, ""),
        key: env?.get("EVOLUTION_API_KEY"),
    };
}

/** Toda mensagem que a EVA escreve no chat do dono começa assim. Serve de
 *  âncora visual e, principalmente, impede que a própria confirmação volte pelo
 *  webhook e seja lida como comando. */
export const EVA_PREFIX = "EVA";

export type ApprovalOutcome = {
    handled: boolean;
    action?: "sent" | "rejected" | "adjusted" | "help";
    suggestionId?: string;
    reply?: string;
    error?: string;
};

// ── Evolution ───────────────────────────────────────────────────────────────

export async function evolutionRequest(
    path: string,
    init: RequestInit = {},
    timeoutMs = 15000,
): Promise<any> {
    const { url: apiUrl, key: apiKey } = evolutionEnv();
    if (!apiUrl || !apiKey) {
        throw new Error("Evolution API nao configurada (EVOLUTION_API_URL/EVOLUTION_API_KEY)");
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${apiUrl}${path}`, {
            ...init,
            signal: ctrl.signal,
            headers: {
                "Content-Type": "application/json",
                apikey: apiKey,
                ...(init.headers || {}),
            },
        });
        const raw = await res.text();
        let data: any = null;
        try {
            data = raw ? JSON.parse(raw) : null;
        } catch {
            data = raw;
        }
        if (!res.ok) {
            const msg = (data && typeof data === "object" && data.message) || raw || `HTTP ${res.status}`;
            throw Object.assign(new Error(String(msg)), { status: res.status });
        }
        return data;
    } finally {
        clearTimeout(timer);
    }
}

export function instanceNameFor(userId: string): string {
    return `wa_${userId.replace(/-/g, "")}`;
}

export function userIdFromInstance(instanceName: string): string | null {
    const hex = instanceName.replace(/^wa_/, "");
    if (!/^[0-9a-f]{32}$/i.test(hex)) return null;
    return [
        hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
        hex.slice(16, 20), hex.slice(20, 32),
    ].join("-");
}

export function digitsOnly(value: string): string {
    return String(value || "").replace(/\D/g, "");
}

/** Número pronto pro Evolution. Celular BR sem DDI recebe o 55; qualquer coisa
 *  já internacional passa intacta. */
export function normalizeNumber(raw: string): string | null {
    const digits = digitsOnly(raw);
    if (!digits) return null;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    if (digits.length >= 12) return digits;
    return null;
}

async function sendText(instanceName: string, number: string, text: string): Promise<void> {
    await evolutionRequest(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({ number, text, delay: 900, presence: "composing" }),
    }, 20000);
}

// ── Número oficial da EVA ───────────────────────────────────────────────────

function envGet(key: string): string | undefined {
    return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env?.get(key);
}

export function evaPhoneNumberId(): string | null {
    return envGet("EVA_WHATSAPP_PHONE_NUMBER_ID")?.trim() || null;
}

/** Celular BR com e sem o nono dígito. O WhatsApp identifica números antigos
 *  sem o 9, e o telefone do perfil costuma vir com ele. */
export function brNumberVariants(raw: string): string[] {
    const n = normalizeNumber(raw);
    if (!n) return [];
    const out = new Set([n]);
    if (n.startsWith("55") && n.length === 13 && n[4] === "9") out.add(n.slice(0, 4) + n.slice(5));
    if (n.startsWith("55") && n.length === 12 && /[6-9]/.test(n[4])) out.add(`${n.slice(0, 4)}9${n.slice(4)}`);
    return [...out];
}

export function sameNumber(a: string, b: string): boolean {
    const other = new Set(brNumberVariants(b));
    return brNumberVariants(a).some((v) => other.has(v));
}

/** Conversa com o número oficial da EVA não é lead: não entra na Inbox do
 *  cliente nem abre rastreio de orçamento. */
export function isEvaOfficialNumber(raw: string): boolean {
    const eva = envGet("EVA_WHATSAPP_NUMBER");
    return Boolean(eva && raw && sameNumber(raw, eva));
}

/** Parâmetro de template: a Meta recusa quebra de linha, tab e mais de quatro
 *  espaços seguidos. O corpo inteiro tem teto de 1024 caracteres. */
export function templateParam(value: string, max: number): string {
    const flat = String(value || "").replace(/\s+/g, " ").trim();
    return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export const EVA_TEMPLATE = "eva_rascunho_pronto";

/** Template de utilidade (aviso sobre a conta do próprio dono). Criado pela
 *  action setup_eva da edge kapso-whatsapp e aprovado pela Meta. Mudou o texto,
 *  muda o nome: template aprovado não aceita edição livre. */
export const EVA_TEMPLATE_DEFINITION = {
    name: EVA_TEMPLATE,
    language: "pt_BR",
    category: "UTILITY",
    parameter_format: "NAMED",
    components: [
        {
            type: "BODY",
            text: "Rascunho {{codigo}} pronto para {{lead}}.\n\nPor que agora: {{motivo}}\n\nMensagem sugerida:\n{{mensagem}}\n\nToque em Enviar, em Descartar, ou responda esta mensagem com o texto corrigido.",
            example: {
                body_text_named_params: [
                    { param_name: "codigo", example: "A2" },
                    { param_name: "lead", example: "Carlos Menezes" },
                    { param_name: "motivo", example: "2 dias sem resposta depois da proposta" },
                    { param_name: "mensagem", example: "Oi Carlos, tudo bem? Conseguiu olhar a proposta do sistema? Se ajudar, te mando a simulação com financiamento." },
                ],
            },
        },
        { type: "FOOTER", text: "Nada é enviado sem a sua aprovação." },
        { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Enviar" }, { type: "QUICK_REPLY", text: "Descartar" }] },
    ],
};

/** Aviso fora da janela de 24h: só sai como template. Os botões levam o código
 *  no payload, então o dono aprova sem digitar nada. Devolve o id da mensagem. */
async function sendDraftViaEva(
    phoneId: string,
    to: string,
    p: { code: string; contactName: string | null; why: string | null; text: string },
): Promise<string | null> {
    const res = await kapsoFetch(`${KAPSO_WHATSAPP}/${phoneId}/messages`, {
        method: "POST",
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: EVA_TEMPLATE,
                language: { code: "pt_BR" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", parameter_name: "codigo", text: p.code },
                            { type: "text", parameter_name: "lead", text: templateParam(p.contactName || "seu cliente", 60) },
                            { type: "text", parameter_name: "motivo", text: templateParam(p.why || "proposta sem resposta", 160) },
                            { type: "text", parameter_name: "mensagem", text: templateParam(p.text, 600) },
                        ],
                    },
                    { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: `${p.code} 1` }] },
                    { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: `${p.code} 2` }] },
                ],
            },
        }),
    });
    return res?.messages?.[0]?.id || null;
}

/** Texto livre: só vale dentro da janela de 24h, que a resposta do dono abre. */
async function sendTextViaEva(phoneId: string, to: string, text: string): Promise<void> {
    await kapsoFetch(`${KAPSO_WHATSAPP}/${phoneId}/messages`, {
        method: "POST",
        body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
    });
}

// ── Número do dono da instância ─────────────────────────────────────────────

/** Descobre o WhatsApp do dono da instância e cacheia em
 *  channel_connections.metadata.owner_jid. Ordem: cache, Evolution, telefone do
 *  perfil. Sem isso a EVA não tem pra onde mandar o rascunho. */
export async function resolveOwnerNumber(
    admin: any,
    instanceName: string,
): Promise<string | null> {
    const { data: conn } = await admin
        .from("channel_connections")
        .select("id, metadata")
        .eq("provider", "evolution")
        .eq("external_id", instanceName)
        .maybeSingle();

    const cached = conn?.metadata?.owner_jid ? normalizeNumber(String(conn.metadata.owner_jid)) : null;
    if (cached) return cached;

    let discovered: string | null = null;
    try {
        const res = await evolutionRequest(
            `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
            { method: "GET" },
            10000,
        );
        const list = Array.isArray(res) ? res : [res];
        for (const entry of list) {
            const jid = entry?.ownerJid || entry?.owner || entry?.instance?.owner || entry?.instance?.ownerJid;
            if (jid) {
                discovered = normalizeNumber(String(jid));
                if (discovered) break;
            }
        }
    } catch (err) {
        console.warn(`[approval] fetchInstances ${instanceName}:`, (err as Error)?.message);
    }

    if (!discovered) {
        const userId = userIdFromInstance(instanceName);
        if (userId) {
            const { data: profile } = await admin
                .from("profiles")
                .select("phone")
                .eq("id", userId)
                .maybeSingle();
            if (profile?.phone) discovered = normalizeNumber(String(profile.phone));
        }
    }

    if (discovered && conn?.id) {
        await admin
            .from("channel_connections")
            .update({ metadata: { ...(conn.metadata || {}), owner_jid: discovered } })
            .eq("id", conn.id);
    }
    return discovered;
}

// ── Código curto ────────────────────────────────────────────────────────────

// Sem I, O, 0 e 1: o dono digita de memória no WhatsApp e não pode errar por
// ambiguidade de fonte.
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_DIGITS = "23456789";

async function nextApprovalCode(admin: any, companyId: string): Promise<string> {
    const { data: taken } = await admin
        .from("agent_suggestions")
        .select("approval_code")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .not("approval_code", "is", null);
    const used = new Set((taken || []).map((r: any) => String(r.approval_code)));
    for (const letter of CODE_LETTERS) {
        for (const digit of CODE_DIGITS) {
            const code = `${letter}${digit}`;
            if (!used.has(code)) return code;
        }
    }
    // 192 rascunhos abertos na mesma empresa é cenário de bug, não de uso.
    throw new Error("sem codigo livre para aprovacao");
}

// ── Notificação ─────────────────────────────────────────────────────────────

function buildDraftMessage(params: {
    code: string;
    contactName: string | null;
    stage: string | null;
    why: string | null;
    text: string;
}): string {
    const linhas = [`${EVA_PREFIX} [${params.code}] rascunho pronto`, ""];
    if (params.contactName) linhas.push(`Lead: ${params.contactName}`);
    if (params.stage) linhas.push(`Etapa: ${params.stage}`);
    if (params.why) linhas.push(`Por que agora: ${params.why}`);
    linhas.push("", params.text, "");
    linhas.push(`Responda ${params.code} 1 para enviar, ${params.code} 2 para descartar, ou escreva o texto corrigido.`);
    return linhas.join("\n");
}

/** Janela de vida de um rascunho. Depois disso a EVA não leva mais pro dono:
 *  o contexto da conversa já mudou. */
const MAX_DRAFT_AGE_HOURS = 48;

/** Tentativas de entrega antes de desistir. Sessão de WhatsApp caída fica
 *  'active' no banco e falha em todo envio; sem teto o cron bate nela pra
 *  sempre. */
const MAX_NOTIFY_ATTEMPTS = 5;

/** Teto de rascunhos entregues por empresa a cada 24h. O gerador de follow-up
 *  produz dezenas de uma vez; despejar tudo junto é spam no dono e risco de ban
 *  no número. */
const MAX_NOTIFY_PER_COMPANY_PER_DAY = 5;

export type NotifyResult = {
    notified: number;
    skipped: Array<{ id: string; reason: string }>;
};

/** Manda pro WhatsApp do dono os rascunhos pendentes ainda não notificados. */
export async function notifyPendingSuggestions(
    admin: any,
    opts: { companyId?: string | null; suggestionId?: string | null; limit?: number } = {},
): Promise<NotifyResult> {
    const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
    // Rascunho velho não sai. Um follow-up escrito há três dias chega errado no
    // lead, e sem esta janela qualquer fila parada viraria disparo em massa na
    // primeira vez que o cron rodar.
    const maxAge = new Date(Date.now() - MAX_DRAFT_AGE_HOURS * 60 * 60 * 1000).toISOString();
    let query = admin
        .from("agent_suggestions")
        .select("id, company_id, deal_id, kind, suggestion, input_summary, created_at, notify_attempts")
        .eq("status", "pending")
        .is("notified_at", null)
        .gte("created_at", maxAge)
        .lt("notify_attempts", MAX_NOTIFY_ATTEMPTS)
        .in("kind", ["outbound_message", "followup", "objection", "proposal"])
        .order("created_at", { ascending: true })
        .limit(limit);

    if (opts.suggestionId) query = query.eq("id", opts.suggestionId);
    if (opts.companyId) query = query.eq("company_id", opts.companyId);

    const { data: pending, error } = await query;
    if (error) throw new Error(`leitura da fila falhou: ${error.message}`);

    const result: NotifyResult = { notified: 0, skipped: [] };

    // Sessão caída derruba o lote inteiro daquele número. Sem isto, uma
    // instância morta consome uma chamada à Evolution por rascunho da fila.
    const instanciasMortas = new Set<string>();
    const evaPhone = evaPhoneNumberId();

    // Cota diária por empresa, consultada uma vez e mantida em memória durante
    // a rodada.
    const cotaUsada = new Map<string, number>();
    async function cotaRestante(companyId: string): Promise<number> {
        if (!cotaUsada.has(companyId)) {
            const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count } = await admin
                .from("agent_suggestions")
                .select("id", { count: "exact", head: true })
                .eq("company_id", companyId)
                .eq("notify_channel", "whatsapp")
                .gte("notified_at", desde);
            cotaUsada.set(companyId, count ?? 0);
        }
        return MAX_NOTIFY_PER_COMPANY_PER_DAY - (cotaUsada.get(companyId) ?? 0);
    }

    for (const s of (pending || []) as any[]) {
        if ((await cotaRestante(s.company_id)) <= 0) {
            result.skipped.push({ id: s.id, reason: "cota diaria da empresa atingida" });
            continue;
        }
        const draftText = String(s.suggestion?.message_text || "").trim();
        if (!draftText) {
            result.skipped.push({ id: s.id, reason: "sem message_text" });
            continue;
        }
        if (!s.deal_id) {
            result.skipped.push({ id: s.id, reason: "sem deal" });
            continue;
        }

        const { data: deal } = await admin
            .from("deals")
            .select("id, user_id, customer_name, account_name, customer_phone, stage")
            .eq("id", s.deal_id)
            .maybeSingle();
        if (!deal?.user_id) {
            result.skipped.push({ id: s.id, reason: "deal sem dono" });
            continue;
        }

        const instanceName = instanceNameFor(deal.user_id);
        if (instanciasMortas.has(instanceName)) {
            result.skipped.push({ id: s.id, reason: "sessao do whatsapp caiu nesta rodada" });
            continue;
        }
        const { data: conn } = await admin
            .from("channel_connections")
            .select("status")
            .eq("provider", "evolution")
            .eq("external_id", instanceName)
            .maybeSingle();
        if (!conn || conn.status !== "active") {
            result.skipped.push({ id: s.id, reason: "whatsapp do dono desconectado" });
            continue;
        }

        const ownerNumber = await resolveOwnerNumber(admin, instanceName);
        if (!ownerNumber) {
            await admin
                .from("agent_suggestions")
                .update({
                    notify_error: "numero do dono desconhecido",
                    notify_attempts: (s.notify_attempts ?? 0) + 1,
                })
                .eq("id", s.id);
            result.skipped.push({ id: s.id, reason: "numero do dono desconhecido" });
            continue;
        }

        try {
            const code = await nextApprovalCode(admin, s.company_id);
            const contactName = s.suggestion?.contact_name || deal.customer_name || deal.account_name || null;
            const why = s.suggestion?.suggestion_text || null;
            let messageId: string | null = null;
            if (evaPhone) {
                messageId = await sendDraftViaEva(evaPhone, ownerNumber, { code, contactName, why, text: draftText });
            } else {
                const text = buildDraftMessage({ code, contactName, stage: deal.stage || null, why, text: draftText });
                await sendText(instanceName, ownerNumber, text);
            }
            await admin
                .from("agent_suggestions")
                .update({
                    approval_code: code,
                    notified_at: new Date().toISOString(),
                    notify_channel: "whatsapp",
                    notify_message_id: messageId,
                    notify_error: null,
                })
                .eq("id", s.id);
            result.notified += 1;
            cotaUsada.set(s.company_id, (cotaUsada.get(s.company_id) ?? 0) + 1);
        } catch (err) {
            const msg = (err as Error)?.message || "falha desconhecida";
            const tentativas = (s.notify_attempts ?? 0) + 1;
            // "Connection Closed" e afins: o socket do número caiu, e nenhum
            // outro rascunho deste dono vai passar nesta rodada.
            if (!evaPhone && /connection closed|socket|not connected|closed/i.test(msg)) {
                instanciasMortas.add(instanceName);
            }
            await admin
                .from("agent_suggestions")
                .update({ notify_error: msg.slice(0, 300), notify_attempts: tentativas })
                .eq("id", s.id);
            result.skipped.push({
                id: s.id,
                reason: tentativas >= MAX_NOTIFY_ATTEMPTS ? `desistindo apos ${tentativas}: ${msg}` : msg,
            });
        }
    }

    return result;
}

// ── Leitura da resposta do dono ─────────────────────────────────────────────

function stripAccents(value: string): string {
    // NFD separa o acento da letra; fora do ASCII sobra só a marca combinante,
    // então "não" e "nao" viram a mesma chave de comparação.
    return value.normalize("NFD").replace(/[^\x00-\x7F]/g, "");
}

const SEND_WORDS = new Set([
    "1", "ok", "okay", "sim", "s", "envia", "enviar", "manda", "mandar",
    "pode", "pode enviar", "vai", "aprovar", "aprovado", "aprova",
]);
const REJECT_WORDS = new Set([
    "2", "nao", "n", "descarta", "descartar", "cancela", "cancelar",
    "pula", "pular", "nao envia", "nao enviar",
]);

export type ParsedCommand = {
    code: string | null;
    intent: "send" | "reject" | "replace" | "none";
    replacement?: string;
};

export function parseOwnerCommand(rawText: string): ParsedCommand {
    const raw = String(rawText || "").trim();
    if (!raw) return { code: null, intent: "none" };

    // Nunca reagir à própria confirmação da EVA voltando pelo webhook.
    if (stripAccents(raw).toLowerCase().startsWith(EVA_PREFIX.toLowerCase())) {
        return { code: null, intent: "none" };
    }

    let rest = raw;
    let code: string | null = null;
    // O código pode vir cru (A2), entre colchetes ([A2]) ou colado num
    // separador (A2:). Depois dele tem que vir fim de texto ou separador, senão
    // "A2B" viraria código A2 mais lixo.
    const codeMatch = rest.match(/^\s*\[?([A-Za-z][2-9])\]?(?=$|[\s,.:;\-])[\s,.:;\-]*/);
    if (codeMatch) {
        code = codeMatch[1].toUpperCase();
        rest = rest.slice(codeMatch[0].length).trim();
    }

    const normalized = stripAccents(rest).toLowerCase().replace(/[.!]+$/, "").trim();

    if (!normalized) return { code, intent: "none" };
    if (SEND_WORDS.has(normalized)) return { code, intent: "send" };
    if (REJECT_WORDS.has(normalized)) return { code, intent: "reject" };
    // Texto corrido só vira correção quando tem cara de mensagem, não de recado
    // solto no chat pessoal.
    if (rest.length >= 12) return { code, intent: "replace", replacement: rest };
    return { code, intent: "none" };
}

/** Processa a resposta do dono no próprio chat. Devolve handled=false quando o
 *  texto não é comando: nesse caso o webhook segue o fluxo normal e a anotação
 *  pessoal dele continua intacta. */
export async function handleOwnerCommand(
    admin: any,
    params: {
        instanceName: string;
        companyId: string | null;
        ownerNumber: string;
        text: string;
        /** Por onde a EVA responde ao dono. Padrão: o chat dele com ele mesmo. */
        replyVia?: (text: string) => Promise<void>;
        /** Rascunho já identificado (resposta citando o aviso). */
        targetSuggestionId?: string | null;
    },
): Promise<ApprovalOutcome> {
    const { instanceName, companyId, ownerNumber } = params;
    if (!companyId) return { handled: false };
    const reply = params.replyVia ?? ((t: string) => replyOwner(instanceName, ownerNumber, t));

    const parsed = parseOwnerCommand(params.text);
    if (parsed.intent === "none" && !parsed.code) return { handled: false };

    // Alvo: pelo código, ou a única pendente notificada nas últimas 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let target: any = null;

    if (params.targetSuggestionId && !parsed.code) {
        const { data } = await admin
            .from("agent_suggestions")
            .select("id, company_id, deal_id, suggestion, approval_code")
            .eq("id", params.targetSuggestionId)
            .eq("company_id", companyId)
            .eq("status", "pending")
            .maybeSingle();
        if (!data) {
            await reply("Esse rascunho já foi resolvido ou expirou. Não enviei nada.");
            return { handled: true, action: "help" };
        }
        target = data;
    } else if (parsed.code) {
        const { data } = await admin
            .from("agent_suggestions")
            .select("id, company_id, deal_id, suggestion, approval_code")
            .eq("company_id", companyId)
            .eq("status", "pending")
            .eq("approval_code", parsed.code)
            .maybeSingle();
        if (!data) {
            await reply(`Não achei o rascunho ${parsed.code}. Ele já foi resolvido ou expirou.`);
            return { handled: true, action: "help" };
        }
        target = data;
    } else {
        const { data } = await admin
            .from("agent_suggestions")
            .select("id, company_id, deal_id, suggestion, approval_code")
            .eq("company_id", companyId)
            .eq("status", "pending")
            .not("notified_at", "is", null)
            .gte("notified_at", since)
            .order("notified_at", { ascending: false })
            .limit(2);
        const rows = (data || []) as any[];
        if (rows.length === 0) return { handled: false };
        if (rows.length > 1) {
            await reply("Tem mais de um rascunho aberto. Responda com o código na frente, por exemplo: A2 1",
            );
            return { handled: true, action: "help" };
        }
        target = rows[0];
    }

    if (parsed.intent === "none") {
        await reply(`Rascunho ${target.approval_code}: responda 1 para enviar, 2 para descartar, ou escreva o texto corrigido.`,
        );
        return { handled: true, action: "help", suggestionId: target.id };
    }

    if (parsed.intent === "reject") {
        await admin
            .from("agent_suggestions")
            .update({
                status: "rejected",
                resolved_at: new Date().toISOString(),
                resolved_via: "whatsapp",
                approval_code: null,
            })
            .eq("id", target.id);
        await reply("Descartado. Não enviei nada.");
        return { handled: true, action: "rejected", suggestionId: target.id };
    }

    // send ou replace: daqui pra baixo a mensagem sai de verdade.
    const finalText = parsed.intent === "replace"
        ? String(parsed.replacement || "").trim()
        : String(target.suggestion?.message_text || "").trim();
    if (!finalText) {
        await reply("O rascunho está vazio. Não enviei nada.");
        return { handled: true, action: "help", suggestionId: target.id };
    }

    const { data: deal } = await admin
        .from("deals")
        .select("id, user_id, customer_name, account_name, customer_phone")
        .eq("id", target.deal_id)
        .maybeSingle();

    const leadRaw = target.suggestion?.contact_phone || deal?.customer_phone || "";
    const leadNumber = normalizeNumber(String(leadRaw));
    if (!leadNumber) {
        await reply("Esse lead está sem telefone. Não consegui enviar.");
        return { handled: true, action: "help", suggestionId: target.id, error: "lead sem telefone" };
    }

    // Mesma blindagem anti-ban do envio manual: teto por instância e por alvo.
    const [instanceOk, targetOk] = await Promise.all([
        admin.rpc("consume_rate_limit", { p_bucket: `wa-out:${instanceName}`, p_limit: 25, p_window_seconds: 60 }),
        admin.rpc("consume_rate_limit", { p_bucket: `wa-out:${instanceName}:${leadNumber}`, p_limit: 12, p_window_seconds: 60 }),
    ]);
    if (instanceOk?.data === false || targetOk?.data === false) {
        await reply("Muitas mensagens em sequência agora. Espere um minuto e responda de novo.");
        return { handled: true, action: "help", suggestionId: target.id, error: "rate_limited" };
    }

    try {
        await sendText(instanceName, leadNumber, finalText);
    } catch (err) {
        const msg = (err as Error)?.message || "falha no envio";
        await reply(`Não consegui enviar: ${msg}`);
        return { handled: true, action: "help", suggestionId: target.id, error: msg };
    }

    const ownerUserId = userIdFromInstance(instanceName);
    await admin
        .from("agent_suggestions")
        .update({
            status: parsed.intent === "replace" ? "adjusted" : "sent",
            applied_payload: { text: finalText, to: leadNumber, via: "whatsapp" },
            resolved_at: new Date().toISOString(),
            resolved_via: "whatsapp",
            resolved_by: ownerUserId,
            approval_code: null,
        })
        .eq("id", target.id);

    const quem = deal?.customer_name || deal?.account_name || "o lead";
    await reply(`Enviado para ${quem}.`);
    return {
        handled: true,
        action: parsed.intent === "replace" ? "adjusted" : "sent",
        suggestionId: target.id,
    };
}

// ── Resposta do dono no número oficial da EVA ───────────────────────────────

const EVA_OI = "Oi! Aqui é a EVA, do Vyzon. Quando uma proposta ficar sem resposta, eu te mando aqui a retomada pronta para você aprovar.";

/** O número da EVA é público: qualquer pessoa pode escrever "A2 1" nele. Só
 *  vira comando o que vem do número dono de uma conexão do Vyzon, e só sobre
 *  rascunho da empresa dessa conexão. */
export async function handleEvaInbound(
    admin: any,
    params: { from: string; text: string; contextMessageId?: string | null },
): Promise<ApprovalOutcome> {
    const phoneId = evaPhoneNumberId();
    const from = normalizeNumber(params.from);
    if (!phoneId || !from) return { handled: false };
    const reply = async (t: string) => {
        try {
            await sendTextViaEva(phoneId, from, t);
        } catch (err) {
            console.warn("[eva] resposta ao dono falhou:", (err as Error)?.message);
        }
    };

    // owner_jid fica em cache desde o primeiro aviso (resolveOwnerNumber).
    const { data: conns } = await admin
        .from("channel_connections")
        .select("external_id, company_id, metadata")
        .eq("provider", "evolution")
        .not("metadata->>owner_jid", "is", null);
    const minhas = ((conns || []) as any[]).filter((c) => sameNumber(String(c.metadata?.owner_jid || ""), from));
    if (minhas.length === 0) {
        await reply("Oi! Aqui é a EVA, do Vyzon. Não encontrei uma conta ligada a este número.");
        return { handled: true, action: "help" };
    }

    let alvo = minhas[0];
    let targetSuggestionId: string | null = null;
    if (params.contextMessageId) {
        // Citou o aviso: o rascunho vem pelo id da mensagem, sem precisar de código.
        const { data: s } = await admin
            .from("agent_suggestions")
            .select("id, company_id")
            .eq("notify_message_id", params.contextMessageId)
            .maybeSingle();
        const dona = s && minhas.find((c) => c.company_id === s.company_id);
        if (dona) {
            alvo = dona;
            targetSuggestionId = s.id;
        }
    } else if (minhas.length > 1) {
        // Dono de mais de uma empresa: vale a do aviso mais recente.
        const { data: ultimo } = await admin
            .from("agent_suggestions")
            .select("company_id")
            .in("company_id", minhas.map((c) => c.company_id))
            .eq("status", "pending")
            .not("notified_at", "is", null)
            .order("notified_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        alvo = minhas.find((c) => c.company_id === ultimo?.company_id) || alvo;
    }

    const outcome = await handleOwnerCommand(admin, {
        instanceName: alvo.external_id,
        companyId: alvo.company_id,
        ownerNumber: from,
        text: params.text,
        replyVia: reply,
        targetSuggestionId,
    });
    if (outcome.handled) return outcome;
    await reply(EVA_OI);
    return { handled: true, action: "help" };
}

async function replyOwner(instanceName: string, ownerNumber: string, text: string): Promise<void> {
    try {
        await sendText(instanceName, ownerNumber, `${EVA_PREFIX} ${text}`);
    } catch (err) {
        console.warn("[approval] resposta ao dono falhou:", (err as Error)?.message);
    }
}
