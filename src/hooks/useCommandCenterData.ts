// ─────────────────────────────────────────────────────────────────────────────
// F5C.1 (2026-05-20) — useCommandCenterData
//
// Agrega dados reais da operação comercial pra /inicio. Read-only, sem
// mutations, sem chamar edge functions, sem chamar Evolution/Meta, sem
// disparar análise nova de EVA. Apenas SELECTs em tabelas já existentes.
//
// Fontes consumidas (todas scope company_id):
//   - channel_conversations  → métricas + needsFollowUp + recent activity
//   - channel_messages       → recent activity (últimas 15)
//   - channel_contacts       → nome dos contatos
//   - conversation_summaries → hotLeads + eva highlights (qualification jsonb)
//   - deals                  → opportunitiesOpen + attention sem update
//   - eva_knowledge_gaps     → eva highlights "info faltando"
//   - agendamentos           → meetingsToday
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
// V1.0.2 — sanitização de nomes ruins (Pobre, Admin, JID, etc.) nos cards principais
import { getLeadLabel, sanitizeDisplayName } from "@/lib/displayName";

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export interface CommandCenterMetrics {
    activeConversations: number;
    unreadConversations: number;
    hotLeads: number;
    opportunitiesOpen: number;
    /** null = base/feature ainda não cobre */
    meetingsToday: number | null;
    needsFollowUp: number;
}

export interface AttentionItem {
    id: string;
    type:
        | "unread_conversation"
        | "hot_lead_waiting"
        | "stale_conversation"
        | "stale_deal"
        | "knowledge_gap";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    source: "channel" | "deal" | "summary" | "knowledge_gap";
    conversationId?: string;
    contactId?: string;
    dealId?: string;
    contactName?: string;
    phone?: string;
    createdAt?: string;
}

export interface RecentActivityItem {
    id: string;
    type: "message_inbound" | "message_outbound";
    title: string;
    description: string;
    timestamp: string;
    contactName?: string;
    conversationId?: string;
    dealId?: string;
}

export type EvaHighlightType =
    | "hot_leads_without_deal"
    | "meeting_intent_without_meeting"
    | "high_intent_unanswered"
    | "recurring_objection"
    | "missing_information"
    | "services_requested";

export interface EvaHighlight {
    id: string;
    type: EvaHighlightType;
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
    /** Mantido pra compat — espelha severity */
    confidence?: "high" | "medium" | "low";
    source: "summary" | "knowledge_gap";
    /** Quando faz sentido drilldown direto numa conversa específica */
    conversationId?: string;
    dealId?: string;
    /** Counters/listas auxiliares pra UI montar */
    count?: number;
    items?: string[];
}

export interface DailyPriority {
    id: string;
    title: string;
    description: string;
    /** Motivo curto pelo qual subiu pra essa prioridade */
    reason: string;
    priority: "critical" | "high" | "medium" | "low";
    /** Label do CTA. Usado mesmo quando href é null (UI mostra cinza). */
    actionLabel: string;
    href: string | null;
    source: "conversation" | "deal" | "eva" | "calendar";
    conversationId?: string;
    dealId?: string;
    contactName?: string;
    createdAt?: string;
    /** JID/telefone do contato — só em prioridades de conversa. Habilita o
     *  "Responder rápido" (envio direto via Evolution). */
    chatJid?: string;
}

export interface CommandCenterData {
    metrics: CommandCenterMetrics;
    attentionItems: AttentionItem[];
    recentActivity: RecentActivityItem[];
    evaHighlights: EvaHighlight[];
    dailyPriorities: DailyPriority[];
    /** Conjunto COMPLETO de ações pendentes (antes do corte de top-5). Usado quando
     *  um filtro está ativo, pra revelar além das 5 do dia. */
    dailyPrioritiesAll: DailyPriority[];
    lastUpdatedAt: Date;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const ATTENTION_LIMIT = 8;
const RECENT_ACTIVITY_LIMIT = 12;
const EVA_HIGHLIGHTS_LIMIT = 6;
const DAILY_PRIORITY_LIMIT = 5;
const STALE_DEAL_DAYS = 7;
const STALE_CONVERSATION_HOURS = 24;

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfTodayIso(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function endOfTodayIso(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
}

function hoursAgo(h: number): string {
    return new Date(Date.now() - h * 3600_000).toISOString();
}

function daysAgo(d: number): string {
    return new Date(Date.now() - d * 86400_000).toISOString();
}

function describeMessage(row: {
    direction: string;
    message_type: string;
    body: string | null;
}): string {
    if (row.direction === "outbound") {
        if (row.body) return "Resposta enviada";
        return "Mensagem enviada";
    }
    switch (row.message_type) {
        case "audio":    return "Áudio recebido";
        case "image":    return "Imagem recebida";
        case "video":    return "Vídeo recebido";
        case "document": return "Documento recebido";
        case "location": return "Localização recebida";
        case "contacts": return "Contato recebido";
        default:         return "Nova mensagem";
    }
}

// ─── Helpers defensivos pra qualification jsonb ─────────────────────────────
// O schema do whatsapp-copilot evoluiu (PT-BR vs EN, snake vs camel). Aceita
// alias em vez de quebrar quando o shape variar.

type Qualification = Record<string, unknown> | null | undefined;

function pickString(q: Qualification, keys: string[]): string | null {
    if (!q || typeof q !== "object") return null;
    for (const k of keys) {
        const v = (q as Record<string, unknown>)[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
}

function pickNumber(q: Qualification, keys: string[]): number | null {
    if (!q || typeof q !== "object") return null;
    for (const k of keys) {
        const v = (q as Record<string, unknown>)[k];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
    }
    return null;
}

export function getQualificationScore(q: Qualification): number | null {
    return pickNumber(q, ["score", "lead_score", "pontuacao", "pontuação"]);
}

export function getQualificationTemperature(q: Qualification): string | null {
    return pickString(q, ["temperatura", "temperature", "temp"]);
}

export function getQualificationIntent(q: Qualification): string | null {
    return pickString(q, ["intencao", "intenção", "intention", "intent"]);
}

export function getQualificationObjection(q: Qualification): string | null {
    return pickString(q, ["objecao", "objeção", "objection", "objection_text"]);
}

export function getQualificationService(q: Qualification): string | null {
    return pickString(q, [
        "servico_interesse",
        "serviço_interesse",
        "service",
        "interested_service",
        "service_of_interest",
    ]);
}

export function isHotQualification(q: Qualification): boolean {
    const t = (getQualificationTemperature(q) || "").toLowerCase();
    if (t === "quente" || t === "hot" || t === "alta") return true;
    const score = getQualificationScore(q);
    if (typeof score === "number" && score >= 75) return true;
    return false;
}

export function hasMeetingIntent(q: Qualification): boolean {
    const i = (getQualificationIntent(q) || "").toLowerCase();
    if (!i) return false;
    return (
        i.includes("reuni") ||
        i.includes("reunião") ||
        i.includes("demo") ||
        i.includes("meeting") ||
        i.includes("agendar") ||
        i.includes("call")
    );
}

function isHighIntent(q: Qualification): boolean {
    if (isHotQualification(q)) return true;
    const i = (getQualificationIntent(q) || "").toLowerCase();
    if (i.includes("alto") || i.includes("alta") || i.includes("high") || i.includes("strong")) return true;
    return false;
}

function normalizePhone(p: string | null | undefined): string | null {
    if (!p) return null;
    return p.replace(/[^\d]/g, "") || null;
}

// ─── Queries ────────────────────────────────────────────────────────────────

async function fetchCommandCenterData(companyId: string): Promise<CommandCenterData> {
    // Roda tudo em paralelo
    const [
        convsRes,
        recentMsgsRes,
        dealsRes,
        summariesRes,
        gapsRes,
        meetingsRes,
        upcomingMeetingsRes,
    ] = await Promise.all([
        // 1. Conversas (precisamos do detalhe pra calcular várias métricas)
        supabase
            .from("channel_conversations")
            .select(`
                id, contact_id, status, unread_count,
                last_message_at, last_inbound_at, last_outbound_at,
                deal_id,
                channel_contacts:contact_id (
                    external_contact_id, phone_e164, name
                )
            `)
            .eq("company_id", companyId)
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(500),
        // 2. Últimas mensagens (recent activity)
        supabase
            .from("channel_messages")
            .select(`
                id, conversation_id, direction, message_type, body, message_timestamp,
                channel_contacts:contact_id ( name )
            `)
            .eq("company_id", companyId)
            .order("message_timestamp", { ascending: false })
            .limit(RECENT_ACTIVITY_LIMIT),
        // 3. Deals (oportunidades + atenção)
        supabase
            .from("deals")
            .select("id, title, stage, customer_name, customer_phone, updated_at, value, is_hot")
            .eq("company_id", companyId)
            .not("stage", "in", "(closed_won,closed_lost)")
            .order("updated_at", { ascending: false })
            .limit(200),
        // 4. Summaries com qualification (hotLeads + EVA highlights)
        supabase
            .from("conversation_summaries")
            .select("chat_phone, qualification, analyzed_at")
            .eq("company_id", companyId)
            .not("qualification", "is", null)
            .order("analyzed_at", { ascending: false })
            .limit(200),
        // 5. Knowledge gaps abertos
        supabase
            .from("eva_knowledge_gaps")
            .select("id, source_type, gap_description, occurrence_count, status, detected_at")
            .eq("company_id", companyId)
            .eq("status", "open")
            .order("occurrence_count", { ascending: false })
            .limit(20),
        // 6. Meetings de hoje (count)
        supabase
            .from("agendamentos")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("data_agendamento", startOfTodayIso())
            .lt("data_agendamento", endOfTodayIso()),
        // 7. F5C.3 — agendamentos próximos 14 dias (cross-reference de meeting intent)
        supabase
            .from("agendamentos")
            .select("cliente_nome, data_agendamento")
            .eq("company_id", companyId)
            .gte("data_agendamento", startOfTodayIso())
            .lt("data_agendamento", new Date(Date.now() + 14 * 86400_000).toISOString())
            .limit(200),
    ]);

    if (convsRes.error) throw convsRes.error;
    if (recentMsgsRes.error) throw recentMsgsRes.error;
    if (dealsRes.error) throw dealsRes.error;
    if (summariesRes.error) throw summariesRes.error;
    // gaps e meetings podem falhar silenciosamente se tabela/permissão problema
    if (gapsRes.error && import.meta.env.DEV) console.warn("[CommandCenter] gaps query failed:", gapsRes.error.message);
    if (meetingsRes.error && import.meta.env.DEV) console.warn("[CommandCenter] meetings query failed:", meetingsRes.error.message);

    type ConvRow = {
        id: string;
        contact_id: string;
        status: string;
        unread_count: number | null;
        last_message_at: string | null;
        last_inbound_at: string | null;
        last_outbound_at: string | null;
        deal_id: string | null;
        channel_contacts: {
            external_contact_id: string;
            phone_e164: string | null;
            name: string | null;
        } | null;
    };
    type MsgRow = {
        id: string;
        conversation_id: string;
        direction: string;
        message_type: string;
        body: string | null;
        message_timestamp: string;
        channel_contacts: { name: string | null } | null;
    };
    type DealRow = {
        id: string;
        title: string | null;
        stage: string;
        customer_name: string | null;
        customer_phone: string | null;
        updated_at: string;
        value: number | null;
        is_hot: boolean | null;
    };
    type SummaryRow = {
        chat_phone: string;
        qualification: Qualification;
        analyzed_at: string;
    };
    type GapRow = {
        id: string;
        source_type: string | null;
        gap_description: string | null;
        occurrence_count: number | null;
        status: string;
        detected_at: string;
    };

    const convs    = (convsRes.data ?? []) as unknown as ConvRow[];
    const msgs     = (recentMsgsRes.data ?? []) as unknown as MsgRow[];
    const deals    = (dealsRes.data ?? []) as DealRow[];
    const summaries = (summariesRes.data ?? []) as unknown as SummaryRow[];
    const gaps     = (gapsRes.data ?? []) as GapRow[];
    const meetingsCount = meetingsRes.count ?? null;
    const upcomingMeetings = (upcomingMeetingsRes.data ?? []) as Array<{
        cliente_nome: string | null;
        data_agendamento: string;
    }>;

    // ── Métricas ───────────────────────────────────────────────────────────
    const activeConversations = convs.filter((c) => c.status === "open").length;
    const unreadConversations = convs.filter((c) => (c.unread_count ?? 0) > 0).length;

    const hotLeads = summaries.filter((s) => isHotQualification(s.qualification)).length;
    const opportunitiesOpen = deals.length;

    // needsFollowUp: última inbound sem outbound posterior OU conversa parada
    // com unread > 0 há > 24h
    const staleHoursIso = hoursAgo(STALE_CONVERSATION_HOURS);
    const needsFollowUp = convs.filter((c) => {
        if (!c.last_inbound_at) return false;
        const noResponse =
            !c.last_outbound_at || c.last_inbound_at > c.last_outbound_at;
        const stale =
            (c.unread_count ?? 0) > 0 && c.last_message_at && c.last_message_at < staleHoursIso;
        return noResponse || stale;
    }).length;

    const metrics: CommandCenterMetrics = {
        activeConversations,
        unreadConversations,
        hotLeads,
        opportunitiesOpen,
        meetingsToday: meetingsCount,
        needsFollowUp,
    };

    // ── Index de qualification por phone (sem + e com +) ──────────────────
    const qualByPhone = new Map<string, SummaryRow>();
    for (const s of summaries) {
        if (!s.chat_phone) continue;
        const noPlus = s.chat_phone.replace(/^\+/, "");
        qualByPhone.set(s.chat_phone, s);
        qualByPhone.set(noPlus, s);
        qualByPhone.set("+" + noPlus, s);
    }

    // ── Attention items ────────────────────────────────────────────────────
    const attention: AttentionItem[] = [];

    // (a) Conversas não-lidas, top N por last_inbound_at recente
    const unreadSorted = convs
        .filter((c) => (c.unread_count ?? 0) > 0)
        .sort((a, b) => (b.last_inbound_at || "").localeCompare(a.last_inbound_at || ""))
        .slice(0, 3);
    for (const c of unreadSorted) {
        const phone = c.channel_contacts?.phone_e164 || c.channel_contacts?.external_contact_id;
        const qual = phone ? qualByPhone.get(phone) || qualByPhone.get("+" + phone) : null;
        const isHot = qual && isHotQualification(qual.qualification);
        // V1.0.2 — sanitiza nome também aqui (attentionItems entra na mesma Central)
        const safeName = sanitizeDisplayName(c.channel_contacts?.name);
        const contactWord = safeName ?? "um contato";
        attention.push({
            id: `unread-${c.id}`,
            type: isHot ? "hot_lead_waiting" : "unread_conversation",
            title: isHot
                ? `${safeName ?? "Lead quente"} aguardando resposta`
                : `${c.unread_count} mensagem${(c.unread_count ?? 0) > 1 ? "s" : ""} não lida${(c.unread_count ?? 0) > 1 ? "s" : ""} de ${contactWord}`,
            description: isHot
                ? "EVA marcou como temperatura quente; não recebeu resposta ainda."
                : c.last_inbound_at
                    ? `Última mensagem em ${new Date(c.last_inbound_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`
                    : "Sem timestamp da última mensagem.",
            priority: isHot ? "high" : "medium",
            source: isHot ? "summary" : "channel",
            conversationId: c.id,
            contactId: c.contact_id,
            dealId: c.deal_id || undefined,
            contactName: safeName ?? undefined,
            phone: c.channel_contacts?.phone_e164 || undefined,
            createdAt: c.last_inbound_at || c.last_message_at || undefined,
        });
    }

    // (b) Deals parados (sem update há > 7 dias)
    const staleDealCutoff = daysAgo(STALE_DEAL_DAYS);
    const staleDeals = deals
        .filter((d) => d.updated_at < staleDealCutoff)
        .slice(0, 3);
    for (const d of staleDeals) {
        attention.push({
            id: `stale-deal-${d.id}`,
            type: "stale_deal",
            title: `${d.title || d.customer_name || "Oportunidade"} sem atualização há ${Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400_000)} dias`,
            description: `Stage atual: ${d.stage}. Definir próxima ação ou descartar.`,
            priority: d.is_hot ? "high" : "medium",
            source: "deal",
            dealId: d.id,
            contactName: d.customer_name || undefined,
            phone: d.customer_phone || undefined,
            createdAt: d.updated_at,
        });
    }

    // (c) Knowledge gaps com mais ocorrências
    for (const g of gaps.slice(0, 2)) {
        attention.push({
            id: `gap-${g.id}`,
            type: "knowledge_gap",
            title: g.gap_description?.slice(0, 80) || `Lacuna ${g.source_type || "desconhecida"}`,
            description: `Apareceu ${g.occurrence_count ?? 1}× nas conversas analisadas pela EVA.`,
            priority: (g.occurrence_count ?? 0) >= 3 ? "medium" : "low",
            source: "knowledge_gap",
            createdAt: g.detected_at,
        });
    }

    // Ordena por prioridade depois timestamp desc
    const priorityRank: Record<AttentionItem["priority"], number> = { high: 0, medium: 1, low: 2 };
    attention.sort((a, b) => {
        const p = priorityRank[a.priority] - priorityRank[b.priority];
        if (p !== 0) return p;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    const attentionItems = attention.slice(0, ATTENTION_LIMIT);

    // ── Recent activity ────────────────────────────────────────────────────
    // V1.0.2 — sanitiza nome do contato pra não vazar "Para Pobre" / "De Suporte"
    const recentActivity: RecentActivityItem[] = msgs.map((m) => {
        const safeName = sanitizeDisplayName(m.channel_contacts?.name);
        return {
            id: m.id,
            type: m.direction === "outbound" ? "message_outbound" : "message_inbound",
            title: describeMessage(m),
            description: safeName
                ? (m.direction === "outbound" ? `Para ${safeName}` : `De ${safeName}`)
                : "",
            timestamp: m.message_timestamp,
            contactName: safeName ?? undefined,
            conversationId: m.conversation_id,
        };
    });

    // ── F5C.3 — EVA Manager Readouts ──────────────────────────────────────
    // 6 tipos. Sempre derivados de dados persistidos. Cada tipo no máximo
    // 1 card. Ordem do array vira ordem de exibição.
    const highlights: EvaHighlight[] = [];

    // Index: conversa por phone (sem '+') pra cruzar com summaries
    const convByPhoneDigits = new Map<string, ConvRow>();
    for (const c of convs) {
        const e164 = c.channel_contacts?.phone_e164;
        const ext  = c.channel_contacts?.external_contact_id;
        const dig1 = normalizePhone(e164 || null);
        const dig2 = normalizePhone(ext  || null);
        if (dig1) convByPhoneDigits.set(dig1, c);
        if (dig2) convByPhoneDigits.set(dig2, c);
    }

    // (1) hot_leads_without_deal — qualificação quente, conversa sem deal_id
    {
        const candidates: Array<{ summary: SummaryRow; conv: ConvRow | undefined }> = [];
        for (const s of summaries) {
            if (!isHotQualification(s.qualification)) continue;
            const dig = normalizePhone(s.chat_phone);
            const conv = dig ? convByPhoneDigits.get(dig) : undefined;
            if (!conv) continue;
            if (conv.deal_id) continue;
            candidates.push({ summary: s, conv });
        }
        if (candidates.length > 0) {
            const first = candidates[0];
            highlights.push({
                id: "hl-hot-without-deal",
                type: "hot_leads_without_deal",
                title: `${candidates.length} ${candidates.length === 1 ? "lead quente" : "leads quentes"} sem oportunidade aberta`,
                description: "Temperatura alta detectada pela EVA, mas o lead ainda não virou deal no pipeline.",
                severity: "high",
                confidence: "high",
                source: "summary",
                count: candidates.length,
                conversationId: candidates.length === 1 ? first.conv?.id : undefined,
            });
        }
    }

    // (2) meeting_intent_without_meeting — pedido de reunião, sem agendamento futuro
    {
        const upcomingNamesNorm = new Set(
            upcomingMeetings
                .map((m) => (m.cliente_nome || "").trim().toLowerCase())
                .filter((s) => s.length > 0),
        );
        const pending: Array<{ summary: SummaryRow; conv: ConvRow | undefined }> = [];
        for (const s of summaries) {
            if (!hasMeetingIntent(s.qualification)) continue;
            const dig = normalizePhone(s.chat_phone);
            const conv = dig ? convByPhoneDigits.get(dig) : undefined;
            const contactName = conv?.channel_contacts?.name?.trim().toLowerCase();
            // Cross-reference: se já existe agendamento na próxima 14d com o mesmo
            // cliente_nome (heurística — agendamentos não tem chat_phone), considera
            // já marcado.
            if (contactName && upcomingNamesNorm.has(contactName)) continue;
            pending.push({ summary: s, conv });
        }
        if (pending.length > 0) {
            highlights.push({
                id: "hl-meeting-pending",
                type: "meeting_intent_without_meeting",
                title: `${pending.length} ${pending.length === 1 ? "lead pediu" : "leads pediram"} reunião sem agendamento`,
                description: "Sinal explícito de intenção de reunião/demo sem evento futuro encontrado na agenda.",
                severity: "high",
                confidence: "medium",
                source: "summary",
                count: pending.length,
                conversationId: pending.length === 1 ? pending[0].conv?.id : undefined,
            });
        }
    }

    // (3) high_intent_unanswered — intenção alta + última msg do lead sem resposta
    {
        const candidates: Array<{ conv: ConvRow }> = [];
        for (const c of convs) {
            if (!c.last_inbound_at) continue;
            const noResponse =
                !c.last_outbound_at || c.last_inbound_at > c.last_outbound_at;
            if (!noResponse) continue;
            const phone = c.channel_contacts?.phone_e164 || c.channel_contacts?.external_contact_id;
            const dig = normalizePhone(phone || null);
            const summary = dig ? summaries.find((s) => normalizePhone(s.chat_phone) === dig) : undefined;
            if (!summary || !isHighIntent(summary.qualification)) continue;
            candidates.push({ conv: c });
        }
        if (candidates.length > 0) {
            candidates.sort((a, b) =>
                (b.conv.last_inbound_at || "").localeCompare(a.conv.last_inbound_at || ""),
            );
            highlights.push({
                id: "hl-high-intent-unanswered",
                type: "high_intent_unanswered",
                title: `${candidates.length} ${candidates.length === 1 ? "lead com alta intenção" : "leads com alta intenção"} sem resposta`,
                description: "EVA classificou como intenção forte e o lead falou por último — janela quente.",
                severity: "high",
                confidence: "high",
                source: "summary",
                count: candidates.length,
                conversationId: candidates.length === 1 ? candidates[0].conv.id : undefined,
            });
        }
    }

    // (4) recurring_objection — agrupa objeções (top 3) — só mostra se houver recorrência
    {
        const objCount = new Map<string, number>();
        for (const s of summaries) {
            const o = getQualificationObjection(s.qualification);
            if (!o) continue;
            const key = o.toLowerCase();
            objCount.set(key, (objCount.get(key) ?? 0) + 1);
        }
        const top = Array.from(objCount.entries())
            .filter(([, n]) => n >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        if (top.length > 0) {
            const items = top.map(([key, n]) => {
                const sample = key.length > 40 ? key.slice(0, 40) + "…" : key;
                return `${sample} (${n}×)`;
            });
            highlights.push({
                id: "hl-recurring-objection",
                type: "recurring_objection",
                title: "Objeções recorrentes detectadas",
                description: items.join(" · "),
                severity: "medium",
                confidence: "medium",
                source: "summary",
                items,
                count: top.length,
            });
        }
    }

    // (5) missing_information — knowledge_gaps abertos
    if (gaps.length > 0) {
        const totalOcc = gaps.reduce((acc, g) => acc + (g.occurrence_count ?? 0), 0);
        highlights.push({
            id: "hl-missing-info",
            type: "missing_information",
            title: `${gaps.length} ${gaps.length === 1 ? "lacuna" : "lacunas"} no contexto da EVA`,
            description: `Reincidência total: ${totalOcc}×. Resolva no contexto da EVA pra ela responder melhor.`,
            severity: "medium",
            confidence: "high",
            source: "knowledge_gap",
            count: gaps.length,
        });
    }

    // (6) services_requested — top 3 serviços citados
    {
        const svcCount = new Map<string, number>();
        for (const s of summaries) {
            const v = getQualificationService(s.qualification);
            if (!v) continue;
            const key = v.toLowerCase();
            svcCount.set(key, (svcCount.get(key) ?? 0) + 1);
        }
        const top = Array.from(svcCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        if (top.length > 0) {
            const items = top.map(([k, n]) => `${k} (${n}×)`);
            highlights.push({
                id: "hl-services-requested",
                type: "services_requested",
                title: "Serviços mais pedidos pelos leads",
                description: items.join(" · "),
                severity: "low",
                confidence: "medium",
                source: "summary",
                items,
                count: top.length,
            });
        }
    }

    // Ordena por severity high > medium > low (estável dentro do mesmo nível)
    const sevRank: Record<EvaHighlight["severity"], number> = { high: 0, medium: 1, low: 2 };
    highlights.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

    const evaHighlights = highlights.slice(0, EVA_HIGHLIGHTS_LIMIT);

    // ── F5C.4 — Prioridades do Dia ─────────────────────────────────────────
    // Reusa dados já agregados (attentionItems + evaHighlights + raw) e produz
    // uma lista deduplicada limitada a 5.
    const dailyRank: Record<DailyPriority["priority"], number> = {
        critical: 0, high: 1, medium: 2, low: 3,
    };
    const dailyMap = new Map<string, DailyPriority>();

    function addPriority(p: DailyPriority) {
        const existing = dailyMap.get(p.id);
        if (!existing || dailyRank[p.priority] < dailyRank[existing.priority]) {
            dailyMap.set(p.id, p);
        }
    }

    // Helpers locais ----------------------------------------------------------
    const dealById = new Map<string, DealRow>();
    for (const d of deals) dealById.set(d.id, d);

    // Lookup conv por phone digits (reusa convByPhoneDigits do bloco anterior)
    // Lookup summary por phone digits
    const summaryByPhoneDigits = new Map<string, SummaryRow>();
    for (const s of summaries) {
        const dig = normalizePhone(s.chat_phone);
        if (dig) summaryByPhoneDigits.set(dig, s);
    }

    function convKey(convId: string) { return `conv:${convId}`; }
    function dealKey(dealId: string) { return `deal:${dealId}`; }
    function topicKey(t: string)     { return `topic:${t}`; }

    // ── CRITICAL ──────────────────────────────────────────────────────────
    // 1a. high_intent_unanswered — conv com alta intenção + lead falou por último
    for (const c of convs) {
        if (!c.id) continue; // V1.0.2 — defensivo: sem id, sem deep link válido
        if (!c.last_inbound_at) continue;
        const noResponse =
            !c.last_outbound_at || c.last_inbound_at > c.last_outbound_at;
        if (!noResponse) continue;
        const phone = c.channel_contacts?.phone_e164 || c.channel_contacts?.external_contact_id;
        const dig = normalizePhone(phone || null);
        const s = dig ? summaryByPhoneDigits.get(dig) : undefined;
        if (!s || !isHighIntent(s.qualification)) continue;
        const safeName = sanitizeDisplayName(c.channel_contacts?.name);
        addPriority({
            id: convKey(c.id),
            title: `Responda ${safeName ?? "este lead"} agora`,
            description: c.last_inbound_at
                ? `Última mensagem recebida há ${Math.max(1, Math.floor((Date.now() - new Date(c.last_inbound_at).getTime()) / 3600_000))}h.`
                : "Lead falou por último; sem resposta sua ainda.",
            reason: "Alta intenção segundo a EVA, sem resposta",
            priority: "critical",
            actionLabel: "Abrir conversa",
            href: `/inbox?conversationId=${c.id}`,
            source: "conversation",
            conversationId: c.id,
            contactName: safeName ?? undefined,
            createdAt: c.last_inbound_at || c.last_message_at || undefined,
        });
    }

    // 1b. hot lead com unread > 0
    for (const c of convs) {
        if (!c.id) continue;
        if ((c.unread_count ?? 0) <= 0) continue;
        const phone = c.channel_contacts?.phone_e164 || c.channel_contacts?.external_contact_id;
        const dig = normalizePhone(phone || null);
        const s = dig ? summaryByPhoneDigits.get(dig) : undefined;
        if (!s || !isHotQualification(s.qualification)) continue;
        const safeName = sanitizeDisplayName(c.channel_contacts?.name);
        addPriority({
            id: convKey(c.id),
            title: safeName
                ? `Lead quente com mensagem pendente: ${safeName}`
                : `Lead quente com mensagem pendente`,
            description: `${c.unread_count} ${(c.unread_count ?? 0) === 1 ? "mensagem não lida" : "mensagens não lidas"}.`,
            reason: "Lead quente + unread > 0",
            priority: "critical",
            actionLabel: "Abrir conversa",
            href: `/inbox?conversationId=${c.id}`,
            source: "conversation",
            conversationId: c.id,
            contactName: safeName ?? undefined,
            createdAt: c.last_inbound_at || c.last_message_at || undefined,
        });
    }

    // 1c. lead quente sem oportunidade e sem resposta
    for (const s of summaries) {
        if (!isHotQualification(s.qualification)) continue;
        const dig = normalizePhone(s.chat_phone);
        const c = dig ? convByPhoneDigits.get(dig) : undefined;
        if (!c || !c.id) continue;
        if (c.deal_id) continue;
        const noResponse =
            !c.last_outbound_at ||
            (!!c.last_inbound_at && c.last_inbound_at > c.last_outbound_at);
        if (!noResponse) continue;
        const safeName = sanitizeDisplayName(c.channel_contacts?.name);
        addPriority({
            id: convKey(c.id),
            title: `${safeName ?? "Lead quente"} sem oportunidade aberta`,
            description: "Conversa quente, sem deal no pipeline e sem resposta sua recente.",
            reason: "Hot lead sem deal + sem resposta",
            priority: "critical",
            actionLabel: "Abrir conversa",
            href: `/inbox?conversationId=${c.id}`,
            source: "conversation",
            conversationId: c.id,
            contactName: safeName ?? undefined,
            createdAt: c.last_inbound_at || c.last_message_at || undefined,
        });
    }

    // ── HIGH ──────────────────────────────────────────────────────────────
    // 2a. meeting_intent_without_meeting — usa o mesmo cross-reference do highlight
    {
        const upcomingNamesNorm = new Set(
            upcomingMeetings
                .map((m) => (m.cliente_nome || "").trim().toLowerCase())
                .filter((s) => s.length > 0),
        );
        for (const s of summaries) {
            if (!hasMeetingIntent(s.qualification)) continue;
            const dig = normalizePhone(s.chat_phone);
            const c = dig ? convByPhoneDigits.get(dig) : undefined;
            const contactName = c?.channel_contacts?.name?.trim().toLowerCase();
            if (contactName && upcomingNamesNorm.has(contactName)) continue;
            if (!c || !c.id) continue;
            const safeName = sanitizeDisplayName(c.channel_contacts?.name);
            addPriority({
                id: convKey(c.id),
                title: `${safeName ?? "Lead"} pediu reunião — sem agendamento`,
                description: "Intenção de demo/reunião identificada pela EVA; nenhuma data marcada na agenda.",
                reason: "Meeting intent sem agendamento futuro",
                priority: "high",
                actionLabel: "Abrir conversa",
                href: `/inbox?conversationId=${c.id}`,
                source: "conversation",
                conversationId: c.id,
                contactName: safeName ?? undefined,
                createdAt: c.last_inbound_at || c.last_message_at || undefined,
            });
        }
    }

    // 2b. stale_deal com is_hot=true
    const staleDealCutoffIso = daysAgo(STALE_DEAL_DAYS);
    for (const d of deals) {
        if (d.updated_at >= staleDealCutoffIso) continue;
        if (!d.is_hot) continue;
        addPriority({
            id: dealKey(d.id),
            title: `Deal quente parado: ${d.title || d.customer_name || "Oportunidade"}`,
            description: `Stage atual: ${d.stage}. Sem atualização há ${Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400_000)}d.`,
            reason: "Stale deal marcado como quente",
            priority: "high",
            actionLabel: "Ver oportunidade",
            href: `/deals/${d.id}`,
            source: "deal",
            dealId: d.id,
            contactName: d.customer_name || undefined,
            createdAt: d.updated_at,
        });
    }

    // 2c. conv sem resposta há > 24h
    // V1.0.2 — fonte do bug "Pobre sem resposta há mais de 24h". Sanitiza
    // nome do contato: se for nome de grupo / JID / suporte / etc, vira "Lead".
    const staleConvCutoffIso = hoursAgo(STALE_CONVERSATION_HOURS);
    for (const c of convs) {
        if (!c.id) continue;
        if (!c.last_inbound_at) continue;
        const noResponse =
            !c.last_outbound_at || c.last_inbound_at > c.last_outbound_at;
        if (!noResponse) continue;
        if (c.last_inbound_at >= staleConvCutoffIso) continue;
        const leadLabel = getLeadLabel(c.channel_contacts?.name);
        const safeName = sanitizeDisplayName(c.channel_contacts?.name);
        addPriority({
            id: convKey(c.id),
            title: `${leadLabel} sem resposta há mais de 24h`,
            description: c.last_inbound_at
                ? `Última mensagem em ${new Date(c.last_inbound_at).toLocaleDateString("pt-BR")}.`
                : "Conversa parada com lead falando por último.",
            reason: "Inbound > 24h sem resposta",
            priority: "high",
            actionLabel: "Abrir conversa",
            href: `/inbox?conversationId=${c.id}`,
            source: "conversation",
            conversationId: c.id,
            contactName: safeName ?? undefined,
            createdAt: c.last_inbound_at || undefined,
        });
    }

    // ── MEDIUM ────────────────────────────────────────────────────────────
    // 3a. stale_deal comum
    for (const d of deals) {
        if (d.updated_at >= staleDealCutoffIso) continue;
        if (d.is_hot) continue; // já entrou como high
        addPriority({
            id: dealKey(d.id),
            title: `${d.title || d.customer_name || "Oportunidade"} sem atualização`,
            description: `Stage: ${d.stage}. Última atividade ${Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400_000)}d atrás.`,
            reason: "Deal parado há mais de 7d",
            priority: "medium",
            actionLabel: "Ver oportunidade",
            href: `/deals/${d.id}`,
            source: "deal",
            dealId: d.id,
            contactName: d.customer_name || undefined,
            createdAt: d.updated_at,
        });
    }

    // 3b. recurring_objection com count agregado >= 3
    {
        const objCount = new Map<string, number>();
        for (const s of summaries) {
            const o = getQualificationObjection(s.qualification);
            if (!o) continue;
            objCount.set(o.toLowerCase(), (objCount.get(o.toLowerCase()) ?? 0) + 1);
        }
        const totalRecurring = Array.from(objCount.values())
            .filter((n) => n >= 3)
            .reduce((a, b) => a + b, 0);
        if (totalRecurring >= 3) {
            addPriority({
                id: topicKey("recurring_objection"),
                title: "Objeção recorrente nas conversas",
                description: "EVA detectou a mesma objeção em vários leads. Pode valer um ajuste de pitch ou material.",
                reason: "Padrão repetido em >=3 conversas",
                priority: "medium",
                actionLabel: "Abrir Inbox",
                href: "/inbox",
                source: "eva",
            });
        }
    }

    // 3c. missing_information com occurrence_count >= 3
    {
        const heavyGap = gaps.find((g) => (g.occurrence_count ?? 0) >= 3);
        if (heavyGap) {
            addPriority({
                id: topicKey("missing_info_heavy"),
                title: "Lacuna no contexto da EVA com alta reincidência",
                description: heavyGap.gap_description?.slice(0, 90) || "Resolva no contexto pra a EVA responder melhor.",
                reason: `Reincidência ${heavyGap.occurrence_count}×`,
                priority: "medium",
                actionLabel: "Resolver contexto",
                href: "/configuracoes/eva?tab=contexto",
                source: "eva",
            });
        }
    }

    // ── LOW ───────────────────────────────────────────────────────────────
    // 4a. services_requested
    {
        const svcCount = new Map<string, number>();
        for (const s of summaries) {
            const v = getQualificationService(s.qualification);
            if (!v) continue;
            svcCount.set(v.toLowerCase(), (svcCount.get(v.toLowerCase()) ?? 0) + 1);
        }
        const totalSvc = Array.from(svcCount.values()).reduce((a, b) => a + b, 0);
        if (totalSvc >= 2) {
            addPriority({
                id: topicKey("services_requested"),
                title: "Serviços mais pedidos nos últimos dias",
                description: "Padrão de demanda detectado. Veja se a oferta atual responde bem.",
                reason: "Sinais de mercado agregados",
                priority: "low",
                actionLabel: null as unknown as string,
                href: null,
                source: "eva",
            });
        }
    }

    // 4b. gaps menores (occurrence_count < 3)
    {
        const smallGap = gaps.find((g) => (g.occurrence_count ?? 0) < 3);
        if (smallGap) {
            addPriority({
                id: topicKey("missing_info_small"),
                title: "Lacuna pontual no contexto da EVA",
                description: smallGap.gap_description?.slice(0, 90) || "Pequeno gap detectado uma vez.",
                reason: "Reincidência baixa",
                priority: "low",
                actionLabel: "Resolver contexto",
                href: "/configuracoes/eva?tab=contexto",
                source: "eva",
            });
        }
    }

    // 4c. conv parada sem sinal de alta intenção
    for (const c of convs) {
        if (!c.id) continue;
        if (!c.last_inbound_at) continue;
        const noResponse =
            !c.last_outbound_at || c.last_inbound_at > c.last_outbound_at;
        if (!noResponse) continue;
        if (c.last_inbound_at >= staleConvCutoffIso) continue; // só >24h
        const phone = c.channel_contacts?.phone_e164 || c.channel_contacts?.external_contact_id;
        const dig = normalizePhone(phone || null);
        const s = dig ? summaryByPhoneDigits.get(dig) : undefined;
        if (s && isHighIntent(s.qualification)) continue; // pulou (já em high/critical)
        const leadLabel = getLeadLabel(c.channel_contacts?.name);
        const safeName = sanitizeDisplayName(c.channel_contacts?.name);
        addPriority({
            id: convKey(c.id),
            title: `Conversa parada: ${leadLabel}`,
            description: "Sem alta intenção sinalizada, mas o lead falou por último há mais de 24h.",
            reason: "Conversa parada, baixa prioridade",
            priority: "low",
            actionLabel: "Abrir conversa",
            href: `/inbox?conversationId=${c.id}`,
            source: "conversation",
            conversationId: c.id,
            contactName: safeName ?? undefined,
            createdAt: c.last_inbound_at || undefined,
        });
    }

    // V1.0.2 — barreira global anti-CTA quebrado:
    // qualquer priority com source="conversation" só sobrevive se houver
    // conversationId que exista em channel_conversations (company já filtrada
    // na query lá em cima). Protege contra qualquer site que esqueça de
    // validar id no futuro.
    const validConvIds = new Set(convs.map((c) => c.id).filter(Boolean));
    const convById = new Map(convs.map((c) => [c.id, c]));
    const dailyAll = Array.from(dailyMap.values())
        .filter((p) => {
            if (p.source !== "conversation") return true;
            if (!p.conversationId) return false;
            return validConvIds.has(p.conversationId);
        })
        .map((p) => ({
            ...p,
            // chatJid pra prioridades de conversa (habilita Responder rápido).
            chatJid:
                p.source === "conversation" && p.conversationId
                    ? convById.get(p.conversationId)?.channel_contacts?.external_contact_id ||
                      convById.get(p.conversationId)?.channel_contacts?.phone_e164 ||
                      undefined
                    : undefined,
            actionLabel: p.actionLabel || "—",
            // se href aponta pra inbox mas id deixou de existir (defensivo redundante),
            // remove o link pra UI não mostrar CTA quebrado
            href:
                p.source === "conversation" &&
                p.conversationId &&
                !validConvIds.has(p.conversationId)
                    ? null
                    : p.href,
        }));

    dailyAll.sort((a, b) => {
        const pr = dailyRank[a.priority] - dailyRank[b.priority];
        if (pr !== 0) return pr;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    const dailyPriorities = dailyAll.slice(0, DAILY_PRIORITY_LIMIT);

    return {
        metrics,
        attentionItems,
        recentActivity,
        evaHighlights,
        dailyPriorities,
        dailyPrioritiesAll: dailyAll.slice(0, 25),
        lastUpdatedAt: new Date(),
    };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCommandCenterData() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const query = useQuery({
        queryKey: ["command-center", effectiveCompanyId],
        enabled: !!effectiveCompanyId,
        staleTime: 30_000,
        queryFn: () => fetchCommandCenterData(effectiveCompanyId!),
    });

    return useMemo(
        () => ({
            loading: query.isLoading,
            isFetching: query.isFetching,
            error: query.error instanceof Error ? query.error.message : null,
            lastUpdatedAt: query.data?.lastUpdatedAt ?? null,
            metrics: query.data?.metrics ?? null,
            attentionItems: query.data?.attentionItems ?? [],
            recentActivity: query.data?.recentActivity ?? [],
            evaHighlights: query.data?.evaHighlights ?? [],
            dailyPriorities: query.data?.dailyPriorities ?? [],
            dailyPrioritiesAll: query.data?.dailyPrioritiesAll ?? [],
            refetch: query.refetch,
        }),
        [query],
    );
}
