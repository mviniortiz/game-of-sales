// ─────────────────────────────────────────────────────────────────────────────
// F4W.4 (2026-05-20) — useChannelInbox
//
// Inbox lendo channel_* como fonte primária:
//   - channel_connections  → conexão default (evolution/whatsapp do user)
//   - channel_conversations → lista de chats
//   - channel_contacts     → metadados (phone, name, jid)
//   - channel_messages     → mensagens da conversa selecionada
//   - Realtime: INSERT em channel_messages filtrado por connection_id
//
// Shape exposto é compatível com useWhatsAppInboxDb (mesma Chat / MessageLine /
// PendingOutboundMessage), então a Inbox swap entre os dois sem refactor visual.
//
// Não envia mensagem. Não chama Evolution. Não escreve em whatsapp_messages.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import type { Chat, MediaType, MessageLine } from "@/hooks/useEvolutionAPI";

// ─── Constantes ─────────────────────────────────────────────────────────────

const CHATS_FETCH_LIMIT = 500;
const MESSAGES_FETCH_LIMIT = 200;
const REALTIME_DEBOUNCE_CHATS_MS = 500;
const REALTIME_DEBOUNCE_MESSAGES_MS = 300;
const PENDING_TTL_MS = 30_000;
// Resync de fallback do Inbox: o Realtime cobre o caminho rápido; este intervalo
// garante que a conversa aberta não congele se um evento se perder (igual ao Pulse).
const INBOX_RESYNC_MS = 15_000;

// ─── Rows ───────────────────────────────────────────────────────────────────

interface ConnectionRow {
    id: string;
    provider: string;
    channel_type: string;
    external_id: string;
    status: string;
    last_seen_at: string | null;
    metadata?: Record<string, unknown> | null;
}

interface ConversationRow {
    id: string;
    contact_id: string;
    deal_id: string | null;
    status: string;
    last_message_at: string | null;
    last_inbound_at: string | null;
    last_outbound_at: string | null;
    unread_count: number | null;
    channel_contacts: {
        external_contact_id: string;
        phone_e164: string | null;
        phone_tail: string | null;
        name: string | null;
        is_group: boolean;
        profile_pic_url: string | null;
    } | null;
}

interface LastMessageRow {
    conversation_id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    body: string | null;
    media_ref: Record<string, unknown> | null;
    message_timestamp: string;
}

interface ChannelMessageRow {
    id: string;
    conversation_id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    body: string | null;
    media_ref: Record<string, unknown> | null;
    message_timestamp: string;
    metadata: Record<string, unknown> | null;
    status?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeLabel(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function mediaTypeOf(messageType: string, mimetype: string | null): MediaType {
    if (messageType === "image") return "image";
    if (messageType === "video") return "video";
    if (messageType === "audio") return "audio";
    if (messageType === "document") return "document";
    if (mimetype?.startsWith("image/")) return "image";
    if (mimetype?.startsWith("video/")) return "video";
    if (mimetype?.startsWith("audio/")) return "audio";
    return null;
}

// F4W.4.4 — função compartilhada: o que sidebar mostra como "última mensagem"
// e o que a thread renderiza precisam usar a MESMA regra. Senão a sidebar
// pode apontar pra uma row que o thread descarta, e nunca convergem.
function isRenderableMessage(row: {
    message_type: string;
    body: string | null;
    media_ref?: Record<string, unknown> | null;
}): boolean {
    if (row.message_type === "unknown" || row.message_type === "reaction") {
        const mr = row.media_ref || {};
        return Boolean(row.body || mr["url"] || mr["caption"] || mr["duration"]);
    }
    return true;
}

function lastMessageText(row: LastMessageRow | undefined): string {
    if (!row) return "";
    const caption = (row.media_ref?.["caption"] as string | undefined) || null;
    if (row.body) return row.body;
    if (caption) return caption;
    switch (row.message_type) {
        case "audio":    return "[áudio]";
        case "image":    return "[imagem]";
        case "video":    return "[vídeo]";
        case "document": return "[documento]";
        case "location": return "[localização]";
        case "contacts": return "[contato]";
        default:         return "";
    }
}

function rowsToChat(conv: ConversationRow, lastMsg?: LastMessageRow): Chat {
    const ct = conv.channel_contacts;
    const externalContactId = ct?.external_contact_id || "";
    const phoneE164 = ct?.phone_e164 || null;
    const name =
        (ct?.name && ct.name.trim()) ||
        (phoneE164 ? `+${phoneE164}` : externalContactId) ||
        "Contato";
    const ts = lastMsg?.message_timestamp || conv.last_message_at || new Date().toISOString();
    return {
        id: conv.id, // conversation_id é o identificador da seleção
        chatJid: externalContactId, // pra envio via Evolution Sender
        conversationId: conv.id, // V1.1 — explícito p/ vínculo de deal
        dealId: conv.deal_id, // V1.1 — estado do vínculo
        name,
        unreadCount: conv.unread_count ?? 0,
        profilePicUrl: ct?.profile_pic_url || undefined,
        phone: phoneE164 ? `+${phoneE164}` : undefined,
        isGroup: Boolean(ct?.is_group),
        lastMessage: lastMsg
            ? {
                  text: lastMessageText(lastMsg),
                  time: timeLabel(ts),
                  at: new Date(ts).getTime(), // epoch p/ ordenação + tempo de espera da lista priorizada
                  isMe: lastMsg.direction === "outbound",
              }
            : {
                  text: "",
                  time: timeLabel(ts),
                  at: new Date(ts).getTime(),
                  isMe: false,
              },
    };
}

function rowToMessage(row: ChannelMessageRow): MessageLine {
    const mediaRef = row.media_ref || {};
    const caption  = (mediaRef["caption"] as string | undefined) || undefined;
    const mimetype = (mediaRef["mimetype"] as string | undefined) || undefined;
    const duration = (mediaRef["duration"] as number | undefined) || undefined;
    const text = row.body || caption || "";
    const senderName = (row.metadata?.["sender_name"] as string | undefined) || undefined;
    return {
        id: row.id,
        text,
        sender: row.direction === "outbound" ? "me" : "lead",
        time: timeLabel(row.message_timestamp),
        timestamp: Math.floor(new Date(row.message_timestamp).getTime() / 1000),
        senderName,
        audioDuration: duration,
        mediaType: mediaTypeOf(row.message_type, mimetype || null),
        mediaCaption: caption,
        mediaMimetype: mimetype,
        status: (row.status as MessageLine["status"]) || undefined,
    };
}

// ─── Pending outbound (UI-only) ─────────────────────────────────────────────

export interface ChannelPendingOutbound {
    localId: string;
    conversationId: string;
    text: string;
    sentAt: number;
}

// ─── Hook return type ───────────────────────────────────────────────────────

export interface UseChannelInbox {
    chats: Chat[];
    selectedChatMessages: MessageLine[];
    isLoadingChats: boolean;
    isLoadingMessages: boolean;
    /** Paginação: há mais histórico antigo pra carregar na conversa aberta. */
    messagesHasMore: boolean;
    /** Carregando uma página mais antiga. */
    loadingOlder: boolean;
    /** Carrega a próxima página de mensagens mais antigas (prepend). */
    loadOlderMessages: () => Promise<void>;
    /** TYPING — jid do contato digitando agora (null = ninguém). */
    typingJid: string | null;
    chatsError: string | null;
    messagesError: string | null;
    fetchMessages: (conversationId: string) => Promise<void>;
    refetchChats: () => Promise<void>;
    refreshAll: (conversationId?: string | null) => Promise<void>;
    appendPendingMessage: (conversationId: string, text: string) => void;
    /** F4W.4.1 — zera unread_count quando o user abre a conversa. No-op se
     *  já estiver em 0. RLS UPDATE de channel_conversations protege tenant. */
    markConversationAsRead: (conversationId: string) => Promise<void>;
    /** F4W.4.3 — sincronizar o id selecionado **antes** de qualquer fetch.
     *  Permite que o Realtime decida atualizar a thread aberta sem esperar
     *  fetchMessages rodar primeiro. */
    setSelectedConversationId: (conversationId: string | null) => void;
    chatsLoadedOnce: boolean;
    isEmpty: boolean;
    source: "channel";
    /** Id da conexão escolhida (provider=evolution, channel_type=whatsapp). */
    connectionId: string | null;
    /** F4W.7.1 — connection row resolvida (status/provider/metadata/last_seen_at). */
    connection: ConnectionRow | null;
    /** Erro fatal/inelegibilidade da source channel (ex: nenhuma connection
     *  encontrada). Inbox.tsx usa pra decidir fallback. */
    error: string | null;
    lastChatsLoadedAt: Date | null;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useChannelInbox(): UseChannelInbox {
    const { user } = useAuth();
    const { activeCompanyId } = useTenant();
    const userId = user?.id;

    const [connectionId, setConnectionId] = useState<string | null>(null);
    // F4W.7.1 — expõe a connection row resolvida (fonte única do status WhatsApp)
    const [connection, setConnection] = useState<ConnectionRow | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [persistedMessages, setPersistedMessages] = useState<MessageLine[]>([]);
    // Paginação: a janela recente (persistedMessages) é gerida pelo fetch/realtime/
    // resync; as páginas mais ANTIGAS ficam separadas (só crescem, resetam ao trocar
    // de conversa) pra o resync ao vivo não apagá-las.
    const [olderMessages, setOlderMessages] = useState<MessageLine[]>([]);
    const [messagesHasMore, setMessagesHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    // TYPING — jid do contato "digitando…" agora (efêmero, via Realtime broadcast).
    const [typingJid, setTypingJid] = useState<string | null>(null);
    const [pendingByConv, setPendingByConv] = useState<Record<string, ChannelPendingOutbound[]>>({});
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [chatsError, setChatsError] = useState<string | null>(null);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [chatsLoadedOnce, setChatsLoadedOnce] = useState(false);
    const [isEmpty, setIsEmpty] = useState(false);
    const [lastChatsLoadedAt, setLastChatsLoadedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedConversationIdRef = useRef<string | null>(null);
    const chatsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // F4W.4.3 — refs pra consistency check sidebar-vs-thread
    /** conversation_id → last_message_at (ISO) vindo da sidebar */
    const lastConvMsgAtRef = useRef<Map<string, string>>(new Map());
    /** Último timestamp persistido no thread aberto (ISO derivado de
     *  messages[last].timestamp). null quando thread vazio. */
    const lastThreadTsRef = useRef<{ convId: string | null; ts: string | null }>({
        convId: null, ts: null,
    });
    /** Guard pra não disparar consistency-fetch em loop quando o filter do
     *  thread descarta a "última" mensagem da sidebar (ex: reaction sem body). */
    const lastConsistencyCheckRef = useRef<{ convId: string; newest: string } | null>(null);
    /** Forward ref pra fetchMessages (declarado depois de refetchChats) */
    const fetchMessagesRef = useRef<((conversationId: string) => Promise<void>) | null>(null);

    // ── Derived: instance name esperado (wa_<userId sem hifens>) ──────────
    const expectedInstanceName = useMemo(() => {
        if (!userId) return null;
        return `wa_${userId.replace(/-/g, "")}`;
    }, [userId]);

    // ── 1. Descobre connection_id ──────────────────────────────────────────
    // F4W.4.1 — lookup endurecido pra multi-vendedor:
    //   (1) metadata->>'user_id' == userId  — futura tag explícita
    //   (2) external_id derivado wa_<userId sem hifens>
    //   (3) fallback company-wide SÓ se houver exatamente 1 active connection
    //   (4) erro explícito multiple_connections_no_user_match
    useEffect(() => {
        if (!userId || !activeCompanyId || !expectedInstanceName) return;
        let cancelled = false;
        (async () => {
            try {
                // (1) metadata->>'user_id'
                const { data: byMeta, error: e0 } = await supabase
                    .from("channel_connections")
                    .select("id, provider, channel_type, external_id, status, last_seen_at, metadata")
                    .eq("company_id", activeCompanyId)
                    .eq("provider", "evolution")
                    .eq("channel_type", "whatsapp")
                    .filter("metadata->>user_id", "eq", userId)
                    .maybeSingle<ConnectionRow>();
                if (e0) throw e0;
                if (cancelled) return;
                if (byMeta?.id) {
                    setConnectionId(byMeta.id);
                    setConnection(byMeta);
                    setError(null);
                    return;
                }

                // (2) external_id derivado
                const { data: byInstance, error: e1 } = await supabase
                    .from("channel_connections")
                    .select("id, provider, channel_type, external_id, status, last_seen_at, metadata")
                    .eq("provider", "evolution")
                    .eq("external_id", expectedInstanceName)
                    .maybeSingle<ConnectionRow>();
                if (e1) throw e1;
                if (cancelled) return;
                if (byInstance?.id) {
                    setConnectionId(byInstance.id);
                    setConnection(byInstance);
                    setError(null);
                    return;
                }

                // (3)/(4) Inspeciona connections da company
                const { data: list, error: e2 } = await supabase
                    .from("channel_connections")
                    .select("id, provider, channel_type, external_id, status, last_seen_at, metadata")
                    .eq("company_id", activeCompanyId)
                    .eq("provider", "evolution")
                    .eq("channel_type", "whatsapp")
                    .in("status", ["active", "pending"])
                    .order("last_seen_at", { ascending: false, nullsFirst: false });
                if (e2) throw e2;
                if (cancelled) return;

                const all = (list || []) as ConnectionRow[];
                if (all.length === 0) {
                    setConnectionId(null);
                    setConnection(null);
                    setError("no_connection_for_company");
                    return;
                }
                if (all.length === 1) {
                    // Caso natural single-vendedor: usa a única
                    setConnectionId(all[0].id);
                    setConnection(all[0]);
                    setError(null);
                    return;
                }
                // Múltiplas e nenhuma bateu com o user: NÃO escolhe silenciosamente
                console.warn(
                    "[ChannelInbox] multiple connections, none match user_id/instance",
                    { userId, expectedInstanceName, candidates: all.map((c) => c.external_id) },
                );
                setConnectionId(null);
                setConnection(null);
                setError("multiple_connections_no_user_match");
            } catch (err) {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[ChannelInbox] connection lookup failed:", msg);
                setError(msg);
                setConnectionId(null);
                setConnection(null);
            }
        })();
        return () => { cancelled = true; };
    }, [userId, activeCompanyId, expectedInstanceName]);

    // ── 2. refetchChats: conversations + contacts + last message ──────────
    const refetchChats = useCallback(async () => {
        if (!connectionId) return;
        setIsLoadingChats(true);
        setChatsError(null);
        try {
            // 2.1 — conversas + contatos (join via FK channel_contacts)
            const { data: convs, error: convErr } = await supabase
                .from("channel_conversations")
                .select(`
                    id, contact_id, deal_id, status,
                    last_message_at, last_inbound_at, last_outbound_at, unread_count,
                    channel_contacts:contact_id (
                        external_contact_id, phone_e164, phone_tail, name, is_group, profile_pic_url
                    )
                `)
                .eq("connection_id", connectionId)
                .order("last_message_at", { ascending: false, nullsFirst: false })
                .limit(CHATS_FETCH_LIMIT);
            if (convErr) throw convErr;

            const convRows = (convs || []) as unknown as ConversationRow[];
            const filtered = convRows.filter((c) => {
                const jid = c.channel_contacts?.external_contact_id || "";
                if (!jid) return false;
                if (jid.includes("@broadcast") || jid.includes("@newsletter")) return false;
                return true;
            });

            // 2.2 — última mensagem de cada conversa (1 query batched)
            const convIds = filtered.map((c) => c.id);
            const lastMap = new Map<string, LastMessageRow>();
            if (convIds.length > 0) {
                // Buscamos as últimas N=500 mensagens ordenadas DESC e pegamos
                // a primeira por conversation_id no client.
                const { data: msgs, error: msgErr } = await supabase
                    .from("channel_messages")
                    .select("conversation_id, direction, message_type, body, media_ref, message_timestamp")
                    .in("conversation_id", convIds)
                    .order("message_timestamp", { ascending: false })
                    .limit(CHATS_FETCH_LIMIT * 3);
                if (msgErr) throw msgErr;
                const msgRows = (msgs || []) as unknown as LastMessageRow[];
                // F4W.4.4 — só considera "última" se ela for renderizável pela
                // thread. Senão sidebar e thread divergem sem solução.
                for (const m of msgRows) {
                    if (!isRenderableMessage(m)) continue;
                    if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
                }
            }

            const list = filtered.map((c) => rowsToChat(c, lastMap.get(c.id)));
            setChats(list);
            setIsEmpty(list.length === 0);
            setChatsLoadedOnce(true);
            setLastChatsLoadedAt(new Date());

            // F4W.4.3 — registra last_message_at de cada conv e dispara
            // consistency check se a conv selecionada está atrás
            for (const c of filtered) {
                if (c.last_message_at) {
                    lastConvMsgAtRef.current.set(c.id, c.last_message_at);
                }
            }
            const selectedId = selectedConversationIdRef.current;
            if (selectedId) {
                const newest = lastConvMsgAtRef.current.get(selectedId);
                const threadEntry = lastThreadTsRef.current;
                const threadLast =
                    threadEntry.convId === selectedId ? threadEntry.ts : null;
                const isBehind = !!newest && (!threadLast || newest > threadLast);
                const last = lastConsistencyCheckRef.current;
                const alreadyTried =
                    !!last && last.convId === selectedId && last.newest === newest;
                if (isBehind && !alreadyTried) {
                    lastConsistencyCheckRef.current = {
                        convId: selectedId, newest: newest!,
                    };
                    if (import.meta.env.DEV) {
                        console.log(
                            `[ChannelInbox] consistency_fetch conversation_id=${selectedId} ` +
                            `sidebar_ts=${newest} thread_ts=${threadLast ?? "none"}`,
                        );
                    }
                    void fetchMessagesRef.current?.(selectedId);
                }
            }

            if (import.meta.env.DEV) {
                console.log(
                    `[ChannelInbox] source=channel chats_count=${list.length} ` +
                    `connection_id=${connectionId} loaded_at=${new Date().toISOString()}`,
                );
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[ChannelInbox] refetchChats error:", msg);
            setChatsError(msg);
        } finally {
            setIsLoadingChats(false);
        }
    }, [connectionId]);

    // ── 3. fetchMessages de uma conversa ──────────────────────────────────
    const fetchMessages = useCallback(
        async (conversationId: string) => {
            if (!conversationId) return;
            // Trocou de conversa → zera as páginas antigas carregadas (a recente
            // é recarregada abaixo). No resync da MESMA conversa, preserva.
            const convChanged = selectedConversationIdRef.current !== conversationId;
            selectedConversationIdRef.current = conversationId;
            if (convChanged) { setOlderMessages([]); setMessagesHasMore(false); }
            setIsLoadingMessages(true);
            setMessagesError(null);
            try {
                // F4W.4.4 — busca DESC pra trazer as 200 mais RECENTES, depois
                // reverte no client pra renderizar em ordem cronológica natural.
                // Antes era ASC LIMIT 200 → conversas longas ficavam congeladas
                // nas mensagens mais antigas.
                const { data, error: e } = await supabase
                    .from("channel_messages")
                    .select("id, conversation_id, direction, message_type, body, media_ref, message_timestamp, metadata, status")
                    .eq("conversation_id", conversationId)
                    .order("message_timestamp", { ascending: false })
                    .limit(MESSAGES_FETCH_LIMIT);
                if (e) throw e;
                const rows = (data || []) as unknown as ChannelMessageRow[];
                const messages = rows
                    .filter(isRenderableMessage)
                    .reverse()  // ← DESC → ASC pra renderização
                    .map(rowToMessage);
                if (selectedConversationIdRef.current !== conversationId) return;
                setPersistedMessages(messages);
                // Janela cheia → provavelmente há mais histórico antigo pra paginar.
                // Só (re)decide no load inicial da conversa; depois o loadOlder manda.
                if (convChanged) setMessagesHasMore(rows.length >= MESSAGES_FETCH_LIMIT);

                // F4W.4.3 — registra último timestamp do thread pra consistency check
                const lastMsg = messages[messages.length - 1];
                if (lastMsg) {
                    const iso = new Date(lastMsg.timestamp * 1000).toISOString();
                    lastThreadTsRef.current = { convId: conversationId, ts: iso };
                } else {
                    lastThreadTsRef.current = { convId: conversationId, ts: null };
                }

                // Reconcilia pending
                setPendingByConv((prev) => {
                    const current = prev[conversationId];
                    if (!current || current.length === 0) return prev;
                    const persistedOutboundTexts = new Set(
                        messages
                            .filter((m) => m.sender === "me")
                            .map((m) => (m.text || "").trim()),
                    );
                    const stillPending = current.filter(
                        (p) => !persistedOutboundTexts.has(p.text.trim()),
                    );
                    if (stillPending.length === current.length) return prev;
                    return { ...prev, [conversationId]: stillPending };
                });

                if (import.meta.env.DEV) {
                    console.log(
                        `[ChannelInbox] source=channel selected_messages_count=${messages.length} ` +
                        `last_ts=${messages[messages.length - 1]?.timestamp ?? "none"}`,
                    );
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[ChannelInbox] fetchMessages error:", msg);
                setMessagesError(msg);
            } finally {
                setIsLoadingMessages(false);
            }
        },
        [],
    );

    // F4W.4.3 — mantém o ref sincronizado pra fetchMessages do refetchChats
    fetchMessagesRef.current = fetchMessages;

    // ── 3b. Paginação: carrega a página ANTERIOR (mais antiga) sob demanda ──────
    const loadOlderMessages = useCallback(async () => {
        const convId = selectedConversationIdRef.current;
        if (!convId || loadingOlder || !messagesHasMore) return;
        // Âncora = a mensagem mais antiga já carregada (antigas, senão a janela recente).
        const anchor = olderMessages[0] ?? persistedMessages[0];
        if (!anchor) return;
        const beforeIso = new Date(anchor.timestamp * 1000).toISOString();
        setLoadingOlder(true);
        try {
            const { data, error: e } = await supabase
                .from("channel_messages")
                .select("id, conversation_id, direction, message_type, body, media_ref, message_timestamp, metadata, status")
                .eq("conversation_id", convId)
                .lt("message_timestamp", beforeIso)
                .order("message_timestamp", { ascending: false })
                .limit(MESSAGES_FETCH_LIMIT);
            if (e) throw e;
            if (selectedConversationIdRef.current !== convId) return;
            const rows = (data || []) as unknown as ChannelMessageRow[];
            const older = rows.filter(isRenderableMessage).reverse().map(rowToMessage);
            if (older.length < MESSAGES_FETCH_LIMIT) setMessagesHasMore(false);
            if (older.length > 0) {
                setOlderMessages((prev) => {
                    const seen = new Set(prev.map((m) => m.id));
                    const fresh = older.filter((m) => !seen.has(m.id));
                    return [...fresh, ...prev];
                });
            }
        } catch (err) {
            console.error("[ChannelInbox] loadOlderMessages error:", err instanceof Error ? err.message : err);
        } finally {
            setLoadingOlder(false);
        }
    }, [loadingOlder, messagesHasMore, olderMessages, persistedMessages]);

    // F4W.4.3 — setSelectedConversationId exposto: Inbox sincroniza o ref
    // *antes* de fetchMessages rodar. Crítico pra Realtime decidir atualizar
    // a thread aberta sem race condition.
    const setSelectedConversationId = useCallback(
        (conversationId: string | null) => {
            const prev = selectedConversationIdRef.current;
            selectedConversationIdRef.current = conversationId;
            if (prev !== conversationId) {
                // Thread mudou — reseta guard de consistency e timestamp do thread
                lastConsistencyCheckRef.current = null;
                lastThreadTsRef.current = { convId: conversationId, ts: null };
            }
        },
        [],
    );

    // ── 4. Debounced wrappers (usados pelo Realtime) ──────────────────────
    const scheduleRefetchChats = useCallback(() => {
        if (chatsDebounceRef.current) clearTimeout(chatsDebounceRef.current);
        chatsDebounceRef.current = setTimeout(() => {
            chatsDebounceRef.current = null;
            void refetchChats();
        }, REALTIME_DEBOUNCE_CHATS_MS);
    }, [refetchChats]);

    const scheduleFetchMessages = useCallback(
        (conversationId: string) => {
            if (messagesDebounceRef.current) clearTimeout(messagesDebounceRef.current);
            messagesDebounceRef.current = setTimeout(() => {
                messagesDebounceRef.current = null;
                if (selectedConversationIdRef.current !== conversationId) return;
                void fetchMessages(conversationId);
            }, REALTIME_DEBOUNCE_MESSAGES_MS);
        },
        [fetchMessages],
    );

    // ── 5. refreshAll (bypassa debounce) ──────────────────────────────────
    const refreshAll = useCallback(
        async (conversationId?: string | null) => {
            if (chatsDebounceRef.current) {
                clearTimeout(chatsDebounceRef.current);
                chatsDebounceRef.current = null;
            }
            if (messagesDebounceRef.current) {
                clearTimeout(messagesDebounceRef.current);
                messagesDebounceRef.current = null;
            }
            const tasks: Promise<void>[] = [refetchChats()];
            if (conversationId) tasks.push(fetchMessages(conversationId));
            await Promise.all(tasks);
        },
        [refetchChats, fetchMessages],
    );

    // ── 6a. Mark as read ──────────────────────────────────────────────────
    const markConversationAsRead = useCallback(async (conversationId: string) => {
        if (!conversationId) return;
        // Otimista: zera local primeiro pra UI responder
        let hadUnread = false;
        setChats((prev) => {
            let changed = false;
            const next = prev.map((c) => {
                if (c.id === conversationId && c.unreadCount > 0) {
                    changed = true;
                    hadUnread = true;
                    return { ...c, unreadCount: 0 };
                }
                return c;
            });
            return changed ? next : prev;
        });
        if (!hadUnread) return; // sem necessidade de update DB
        try {
            const { error: e } = await supabase
                .from("channel_conversations")
                .update({ unread_count: 0 })
                .eq("id", conversationId)
                .gt("unread_count", 0);
            if (e && import.meta.env.DEV) {
                console.warn("[ChannelInbox] mark read failed:", e.message);
            }
        } catch (err) {
            if (import.meta.env.DEV) {
                console.warn("[ChannelInbox] mark read unexpected:", err);
            }
            // Não reverter o estado otimista — UI consistente vale mais
            // que perfeito sync; próximo refetchChats reconcilia.
        }
    }, []);

    // ── 6. Pending outbound (UI-only) ─────────────────────────────────────
    const appendPendingMessage = useCallback((conversationId: string, text: string) => {
        if (!conversationId || !text.trim()) return;
        const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setPendingByConv((prev) => {
            const existing = prev[conversationId] ?? [];
            const now = Date.now();
            const fresh = existing.filter((p) => now - p.sentAt < PENDING_TTL_MS);
            return {
                ...prev,
                [conversationId]: [
                    ...fresh,
                    { localId, conversationId, text: text.trim(), sentAt: now },
                ],
            };
        });
    }, []);

    // ── 6b. PERF (INBOX.PERF.1) — update incremental vindo do Realtime ────────
    // Em vez de re-buscar 200 mensagens a cada evento, aplicamos a row do
    // payload direto no estado. O consistency check no refetchChats (debounced)
    // continua de rede de segurança caso algo divirja.
    const normalizeRow = (row: Partial<ChannelMessageRow>): ChannelMessageRow => {
        const r = { ...row } as ChannelMessageRow;
        if (typeof (r.media_ref as unknown) === "string") {
            try { r.media_ref = JSON.parse(r.media_ref as unknown as string); } catch { r.media_ref = {}; }
        }
        if (typeof (r.metadata as unknown) === "string") {
            try { r.metadata = JSON.parse(r.metadata as unknown as string); } catch { r.metadata = {}; }
        }
        return r;
    };

    // INSERT: anexa a mensagem nova mantendo ordem cronológica. Retorna false
    // se não conseguiu aplicar (→ caller faz fallback pro fetch completo).
    const applyRealtimeInsert = useCallback((raw: Partial<ChannelMessageRow>): boolean => {
        try {
            const row = normalizeRow(raw);
            if (!row.id || !row.conversation_id) return false;
            if (!isRenderableMessage(row)) return true; // nada a renderizar, sem refetch
            const msg = rowToMessage(row);
            setPersistedMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev; // dedupe
                const next = [...prev];
                let i = next.length;
                while (i > 0 && next[i - 1].timestamp > msg.timestamp) i--;
                next.splice(i, 0, msg);
                return next;
            });
            const iso = new Date(row.message_timestamp).toISOString();
            const prevRef = lastThreadTsRef.current;
            if (!prevRef || prevRef.convId !== row.conversation_id || !prevRef.ts || iso > prevRef.ts) {
                lastThreadTsRef.current = { convId: row.conversation_id, ts: iso };
            }
            // Reconcilia pending quando o outbound recém-enviado chega persistido.
            if (msg.sender === "me") {
                const convId = row.conversation_id;
                const t = (msg.text || "").trim();
                setPendingByConv((prev) => {
                    const current = prev[convId];
                    if (!current || current.length === 0) return prev;
                    const stillPending = current.filter((p) => p.text.trim() !== t);
                    if (stillPending.length === current.length) return prev;
                    return { ...prev, [convId]: stillPending };
                });
            }
            return true;
        } catch (e) {
            if (import.meta.env.DEV) console.warn("[ChannelInbox] applyRealtimeInsert failed:", e);
            return false;
        }
    }, []);

    // UPDATE: só muda status (entregue/lido) — patch in-place, sem refetch.
    const applyRealtimeStatusUpdate = useCallback((raw: Partial<ChannelMessageRow>): void => {
        const id = raw?.id;
        const status = raw?.status;
        if (!id || !status) return;
        setPersistedMessages((prev) => {
            let changed = false;
            const next = prev.map((m) => {
                if (m.id === id && m.status !== status) {
                    changed = true;
                    return { ...m, status: status as MessageLine["status"] };
                }
                return m;
            });
            return changed ? next : prev;
        });
    }, []);

    // ── 7. Carga inicial dos chats ────────────────────────────────────────
    useEffect(() => {
        if (!connectionId) return;
        void refetchChats();
    }, [connectionId, refetchChats]);

    // ── 8. Realtime ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!connectionId) return;
        const channel = supabase
            .channel(`vyzon-channel-inbox-${connectionId}`)
            .on(
                "postgres_changes",
                {
                    // INBOX.STATUS — "*" captura INSERT (msg nova) E UPDATE (mudança
                    // de status: entregue/lido), pros checks atualizarem ao vivo.
                    event: "*",
                    schema: "public",
                    table: "channel_messages",
                    filter: `connection_id=eq.${connectionId}`,
                },
                (payload: { eventType?: string; new: Record<string, unknown>; old?: Record<string, unknown> }) => {
                    const row = payload?.new as Partial<ChannelMessageRow> | undefined;
                    const convId = row?.conversation_id as string | undefined;
                    if (!convId) {
                        if (import.meta.env.DEV) {
                            console.warn("[ChannelInbox] realtime_event missing conversation_id");
                        }
                        scheduleRefetchChats();
                        return;
                    }
                    const isSelected = convId === selectedConversationIdRef.current;

                    // UPDATE = mudança de status (entregue/lido). Patch in-place na
                    // thread aberta; NÃO mexe na sidebar (status não reordena lista).
                    if (payload?.eventType === "UPDATE") {
                        if (isSelected) applyRealtimeStatusUpdate(row);
                        return;
                    }

                    // INSERT = mensagem nova. Anexa direto do payload (sem refetch
                    // de 200 linhas); só cai pro fetch completo se não der pra aplicar.
                    if (isSelected) {
                        const applied = applyRealtimeInsert(row);
                        if (!applied) scheduleFetchMessages(convId);
                    }
                    // Sidebar: reordena + unread (debounced; consistency check embutido).
                    scheduleRefetchChats();
                },
            )
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionId]);

    // ── 8a. TYPING — "digitando…" do contato (Realtime broadcast efêmero) ─────
    // O webhook retransmite o presence.update do WhatsApp pra wa-typing:<instância>.
    // Guarda só o jid de quem está digitando; some sozinho após 8s sem update.
    const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        const inst = connection?.external_id;
        if (!inst) return;
        const ch = supabase
            .channel(`wa-typing:${inst}`)
            .on("broadcast", { event: "typing" }, (msg) => {
                const p = (msg.payload || {}) as { jid?: string; typing?: boolean };
                if (!p.jid) return;
                if (p.typing) {
                    setTypingJid(p.jid);
                    if (typingClearRef.current) clearTimeout(typingClearRef.current);
                    typingClearRef.current = setTimeout(() => setTypingJid(null), 8000);
                } else {
                    setTypingJid((cur) => (cur === p.jid ? null : cur));
                }
            })
            .subscribe();
        return () => {
            if (typingClearRef.current) clearTimeout(typingClearRef.current);
            void supabase.removeChannel(ch);
        };
    }, [connection?.external_id]);

    // ── 8b. Resync de fallback (rede de segurança do Realtime) ────────────
    // O Realtime pode PERDER eventos (websocket dropa, aba volta do background,
    // evento não entregue). Sem fallback, mensagens novas da conversa ABERTA não
    // aparecem até trocar de chat — foi o "travou em 12:17" reportado, com a
    // sessão viva e o webhook gravando normalmente. Espelha o resync do Pulse.
    // Pausa quando a aba está oculta pra não gastar à toa.
    useEffect(() => {
        if (!connectionId) return;
        const id = setInterval(() => {
            if (typeof document !== "undefined" && document.hidden) return;
            void refreshAll(selectedConversationIdRef.current);
        }, INBOX_RESYNC_MS);
        return () => clearInterval(id);
    }, [connectionId, refreshAll]);

    // ── 9. Cleanup timers no unmount ──────────────────────────────────────
    useEffect(() => {
        return () => {
            if (chatsDebounceRef.current) clearTimeout(chatsDebounceRef.current);
            if (messagesDebounceRef.current) clearTimeout(messagesDebounceRef.current);
        };
    }, []);

    // ── 10. GC pending expirados ──────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setPendingByConv((prev) => {
                let changed = false;
                const next: Record<string, ChannelPendingOutbound[]> = {};
                for (const [convId, list] of Object.entries(prev)) {
                    const fresh = list.filter((p) => now - p.sentAt < PENDING_TTL_MS);
                    if (fresh.length !== list.length) changed = true;
                    if (fresh.length > 0) next[convId] = fresh;
                }
                return changed ? next : prev;
            });
        }, 5_000);
        return () => clearInterval(interval);
    }, []);

    // ── 11. Merge pending na thread renderizada ───────────────────────────
    const selectedConvId = selectedConversationIdRef.current;
    const pendingForSelected = selectedConvId ? pendingByConv[selectedConvId] || [] : [];
    const pendingLines: MessageLine[] = pendingForSelected.map((p) => ({
        id: p.localId,
        text: p.text,
        sender: "me",
        time: new Date(p.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Math.floor(p.sentAt / 1000),
        pending: true,
    }));
    // Antigas (paginadas) + janela recente + pendentes. Dedup defensivo por id
    // (older é sempre estritamente mais antigo, mas garante contra sobreposição).
    const baseMessages: MessageLine[] = olderMessages.length
        ? (() => {
            const seen = new Set(olderMessages.map((m) => m.id));
            return [...olderMessages, ...persistedMessages.filter((m) => !seen.has(m.id))];
        })()
        : persistedMessages;
    const selectedChatMessages: MessageLine[] = pendingLines.length
        ? [...baseMessages, ...pendingLines]
        : baseMessages;

    return {
        chats,
        selectedChatMessages,
        isLoadingChats,
        isLoadingMessages,
        messagesHasMore,
        loadingOlder,
        loadOlderMessages,
        typingJid,
        chatsError,
        messagesError,
        fetchMessages,
        refetchChats,
        refreshAll,
        appendPendingMessage,
        markConversationAsRead,
        setSelectedConversationId,
        chatsLoadedOnce,
        isEmpty,
        source: "channel",
        connectionId,
        connection,
        error,
        lastChatsLoadedAt,
    };
}
