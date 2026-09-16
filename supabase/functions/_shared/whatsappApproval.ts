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
// Usado por: edge eva-approval (notificação) e edge evolution-message-webhook
// (leitura da resposta do dono no próprio chat).
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

async function evolutionRequest(
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
            const text = buildDraftMessage({
                code,
                contactName: s.suggestion?.contact_name || deal.customer_name || deal.account_name || null,
                stage: deal.stage || null,
                why: s.suggestion?.suggestion_text || null,
                text: draftText,
            });
            await sendText(instanceName, ownerNumber, text);
            await admin
                .from("agent_suggestions")
                .update({
                    approval_code: code,
                    notified_at: new Date().toISOString(),
                    notify_channel: "whatsapp",
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
            if (/connection closed|socket|not connected|closed/i.test(msg)) {
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
    params: { instanceName: string; companyId: string | null; ownerNumber: string; text: string },
): Promise<ApprovalOutcome> {
    const { instanceName, companyId, ownerNumber } = params;
    if (!companyId) return { handled: false };

    const parsed = parseOwnerCommand(params.text);
    if (parsed.intent === "none" && !parsed.code) return { handled: false };

    // Alvo: pelo código, ou a única pendente notificada nas últimas 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let target: any = null;

    if (parsed.code) {
        const { data } = await admin
            .from("agent_suggestions")
            .select("id, company_id, deal_id, suggestion, approval_code")
            .eq("company_id", companyId)
            .eq("status", "pending")
            .eq("approval_code", parsed.code)
            .maybeSingle();
        if (!data) {
            await replyOwner(instanceName, ownerNumber, `Nao achei o rascunho ${parsed.code}. Ele ja foi resolvido ou expirou.`);
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
            await replyOwner(
                instanceName,
                ownerNumber,
                "Tem mais de um rascunho aberto. Responda com o codigo na frente, por exemplo: A2 1",
            );
            return { handled: true, action: "help" };
        }
        target = rows[0];
    }

    if (parsed.intent === "none") {
        await replyOwner(
            instanceName,
            ownerNumber,
            `Rascunho ${target.approval_code}: responda 1 para enviar, 2 para descartar, ou escreva o texto corrigido.`,
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
        await replyOwner(instanceName, ownerNumber, "Descartado. Nao enviei nada.");
        return { handled: true, action: "rejected", suggestionId: target.id };
    }

    // send ou replace: daqui pra baixo a mensagem sai de verdade.
    const finalText = parsed.intent === "replace"
        ? String(parsed.replacement || "").trim()
        : String(target.suggestion?.message_text || "").trim();
    if (!finalText) {
        await replyOwner(instanceName, ownerNumber, "O rascunho esta vazio. Nao enviei nada.");
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
        await replyOwner(instanceName, ownerNumber, "Esse lead esta sem telefone. Nao consegui enviar.");
        return { handled: true, action: "help", suggestionId: target.id, error: "lead sem telefone" };
    }

    // Mesma blindagem anti-ban do envio manual: teto por instância e por alvo.
    const [instanceOk, targetOk] = await Promise.all([
        admin.rpc("consume_rate_limit", { p_bucket: `wa-out:${instanceName}`, p_limit: 25, p_window_seconds: 60 }),
        admin.rpc("consume_rate_limit", { p_bucket: `wa-out:${instanceName}:${leadNumber}`, p_limit: 12, p_window_seconds: 60 }),
    ]);
    if (instanceOk?.data === false || targetOk?.data === false) {
        await replyOwner(instanceName, ownerNumber, "Muitas mensagens em sequencia agora. Espere um minuto e responda de novo.");
        return { handled: true, action: "help", suggestionId: target.id, error: "rate_limited" };
    }

    try {
        await sendText(instanceName, leadNumber, finalText);
    } catch (err) {
        const msg = (err as Error)?.message || "falha no envio";
        await replyOwner(instanceName, ownerNumber, `Nao consegui enviar: ${msg}`);
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
    await replyOwner(instanceName, ownerNumber, `Enviado para ${quem}.`);
    return {
        handled: true,
        action: parsed.intent === "replace" ? "adjusted" : "sent",
        suggestionId: target.id,
    };
}

async function replyOwner(instanceName: string, ownerNumber: string, text: string): Promise<void> {
    try {
        await sendText(instanceName, ownerNumber, `${EVA_PREFIX} ${text}`);
    } catch (err) {
        console.warn("[approval] resposta ao dono falhou:", (err as Error)?.message);
    }
}
