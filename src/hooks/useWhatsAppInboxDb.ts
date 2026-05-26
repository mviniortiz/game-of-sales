// ─────────────────────────────────────────────────────────────────────────────
// F4W.0 (2026-05-20) — useWhatsAppInboxDb
//
// Inbox DB-first: lê chats e mensagens diretamente de public.whatsapp_messages
// em vez de chamar Evolution em tempo real. Evolution continua usado pra
// envio/status/reconexão via useEvolutionIntegration (não substitui).
//
// Comportamento:
//   - Lista de chats: agrupada por chat_jid, com última mensagem
//   - Mensagens da conversa: ORDER BY message_timestamp ASC, cap 200
//   - Realtime: subscribe a INSERTs em whatsapp_messages do user; refetch
//     incremental quando chega mensagem da conversa aberta + bump da lista
//   - Shape compatível com Chat / MessageLine (zero refactor em UI)
//
// Não envia mensagem. Não chama Evolution. Não escreve em channel_*.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import type { Chat, MessageLine, MediaType } from "@/hooks/useEvolutionAPI";

// ─── Shape do row de whatsapp_messages relevante pra Inbox ──────────────────

interface WaMessageRow {
    id: string;
    chat_jid: string;
    chat_phone: string;
    contact_name: string | null;
    is_group: boolean;
    direction: "inbound" | "outbound";
    message_type: string;
    body: string | null;
    media_url: string | null;
    media_mimetype: string | null;
    media_caption: string | null;
    audio_duration: number | null;
    message_timestamp: string;
    deal_id: string | null;
}

// ─── Helpers de normalização ────────────────────────────────────────────────

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
    if (messageType === "sticker") return "sticker";
    if (messageType === "document") return "document";
    // Algumas integrações marcam o tipo só pelo mimetype
    if (mimetype?.startsWith("image/")) return "image";
    if (mimetype?.startsWith("video/")) return "video";
    if (mimetype?.startsWith("audio/")) return "audio";
    return null;
}

function rowToChat(row: WaMessageRow): Chat {
    const phone = row.chat_phone;
    const name = (row.contact_name && row.contact_name.trim()) || (phone ? `+${phone}` : "Contato");
    const ts = row.message_timestamp;
    const text =
        row.body ||
        row.media_caption ||
        (row.message_type === "audio" ? "[áudio]" : null) ||
        (row.message_type === "image" ? "[imagem]" : null) ||
        (row.message_type === "video" ? "[vídeo]" : null) ||
        (row.message_type === "document" ? "[documento]" : null) ||
        "";
    return {
        id: row.chat_jid,
        chatJid: row.chat_jid,
        name,
        unreadCount: 0,
        phone: phone ? `+${phone}` : undefined,
        isGroup: Boolean(row.is_group),
        lastMessage: {
            text,
            time: timeLabel(ts),
            isMe: row.direction === "outbound",
        },
    };
}

function rowToMessage(row: WaMessageRow): MessageLine {
    const text = row.body || row.media_caption || "";
    return {
        id: row.id,
        text,
        sender: row.direction === "outbound" ? "me" : "lead",
        time: timeLabel(row.message_timestamp),
        timestamp: Math.floor(new Date(row.message_timestamp).getTime() / 1000),
        senderName: row.contact_name || undefined,
        audioDuration: row.audio_duration ?? undefined,
        mediaType: mediaTypeOf(row.message_type, row.media_mimetype),
        mediaCaption: row.media_caption ?? undefined,
        mediaMimetype: row.media_mimetype ?? undefined,
    };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface PendingOutboundMessage {
    /** Stable id local (não persistido) */
    localId: string;
    chatJid: string;
    text: string;
    /** epoch ms */
    sentAt: number;
}

interface UseWhatsAppInboxDbReturn {
    chats: Chat[];
    selectedChatMessages: MessageLine[];
    isLoadingChats: boolean;
    isLoadingMessages: boolean;
    chatsError: string | null;
    messagesError: string | null;
    fetchMessages: (chatJid: string) => Promise<void>;
    refetchChats: () => Promise<void>;
    /** Refresh manual disparado pelo botão "Atualizar histórico" — bypassa
     *  debounce, dispara chats + (se houver chat selecionado) mensagens. */
    refreshAll: (chatJid?: string | null) => Promise<void>;
    /** Adiciona uma mensagem outbound temporária na thread enquanto webhook
     *  + Realtime não confirmam. Não persistida no banco. Some quando a real
     *  chega. */
    appendPendingMessage: (chatJid: string, text: string) => void;
    /** F4W.4.3 — sincronizar o id selecionado antes de qualquer fetch. */
    setSelectedConversationId: (chatJid: string | null) => void;
    chatsLoadedOnce: boolean;
    source: "db";
    /** True quando a primeira leitura não trouxe nenhuma row (banco vazio). */
    isEmpty: boolean;
    /** Quando os chats foram carregados pela última vez (mount + refetch). */
    lastChatsLoadedAt: Date | null;
}

const CHATS_FETCH_LIMIT = 500;
const MESSAGES_FETCH_LIMIT = 200;
const REALTIME_DEBOUNCE_CHATS_MS = 500;
const REALTIME_DEBOUNCE_MESSAGES_MS = 300;
/** Mensagem pendente é descartada se ficar mais de N ms sem confirmação
 *  (defesa contra orfãos quando o webhook falha em chegar). */
const PENDING_TTL_MS = 30_000;

export interface UseWhatsAppInboxDbOptions {
    /** F4W.4.1 — quando false, hook fica inerte: não faz fetch inicial,
     *  não assina Realtime, não roda GC. Usado pela Inbox channel-first
     *  pra deferir o legacy até o channel falhar. */
    enabled?: boolean;
}

export function useWhatsAppInboxDb(opts: UseWhatsAppInboxDbOptions = {}): UseWhatsAppInboxDbReturn {
    const { enabled = true } = opts;
    const { user } = useAuth();
    const { activeCompanyId } = useTenant();
    const userId = user?.id;

    const [chats, setChats] = useState<Chat[]>([]);
    const [persistedMessages, setPersistedMessages] = useState<MessageLine[]>([]);
    const [pendingByChat, setPendingByChat] = useState<Record<string, PendingOutboundMessage[]>>({});
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [chatsError, setChatsError] = useState<string | null>(null);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [chatsLoadedOnce, setChatsLoadedOnce] = useState(false);
    const [isEmpty, setIsEmpty] = useState(false);
    const [lastChatsLoadedAt, setLastChatsLoadedAt] = useState<Date | null>(null);
    const selectedChatJidRef = useRef<string | null>(null);

    // ── Debounce timers (cleanup on unmount) ──────────────────────────────
    const chatsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // F4W.4.3 — consistency refs (espelha useChannelInbox)
    const lastChatMsgAtRef = useRef<Map<string, string>>(new Map());
    const lastThreadTsRef = useRef<{ jid: string | null; ts: string | null }>({
        jid: null, ts: null,
    });
    const lastConsistencyCheckRef = useRef<{ jid: string; newest: string } | null>(null);
    const fetchMessagesRef = useRef<((chatJid: string) => Promise<void>) | null>(null);

    // ── Carrega lista de chats ─────────────────────────────────────────────
    const refetchChats = useCallback(async () => {
        if (!userId) return;
        setIsLoadingChats(true);
        setChatsError(null);
        try {
            // RLS já garante isolamento por user/company. Filtramos por user_id
            // explícito porque whatsapp_messages tem rows de vários users dentro
            // da mesma company (cada vendedor com seu número).
            const { data, error } = await supabase
                .from("whatsapp_messages")
                .select(
                    "id, chat_jid, chat_phone, contact_name, is_group, direction, message_type, body, media_url, media_mimetype, media_caption, audio_duration, message_timestamp, deal_id",
                )
                .eq("user_id", userId)
                .order("message_timestamp", { ascending: false })
                .limit(CHATS_FETCH_LIMIT);
            if (error) throw error;

            const rows = (data || []) as unknown as WaMessageRow[];
            const byChat = new Map<string, Chat>();
            const lastMsgByChat = new Map<string, string>();
            for (const row of rows) {
                if (!row.chat_jid) continue;
                if (row.chat_jid.includes("@broadcast") || row.chat_jid.includes("@newsletter")) continue;
                // F4W.4.4 — só conta como "última" se a thread fosse renderizar
                const renderable =
                    row.body || row.media_url || row.media_caption || row.audio_duration;
                if (!renderable) continue;
                if (!byChat.has(row.chat_jid)) {
                    byChat.set(row.chat_jid, rowToChat(row));
                    lastMsgByChat.set(row.chat_jid, row.message_timestamp);
                }
            }
            const list = Array.from(byChat.values());
            setChats(list);
            setIsEmpty(list.length === 0);
            setChatsLoadedOnce(true);
            setLastChatsLoadedAt(new Date());

            // F4W.4.3 — atualiza index + consistency check sidebar-vs-thread
            for (const [jid, ts] of lastMsgByChat) {
                lastChatMsgAtRef.current.set(jid, ts);
            }
            const selectedJid = selectedChatJidRef.current;
            if (selectedJid) {
                const newest = lastChatMsgAtRef.current.get(selectedJid);
                const threadEntry = lastThreadTsRef.current;
                const threadLast = threadEntry.jid === selectedJid ? threadEntry.ts : null;
                const isBehind = !!newest && (!threadLast || newest > threadLast);
                const last = lastConsistencyCheckRef.current;
                const alreadyTried =
                    !!last && last.jid === selectedJid && last.newest === newest;
                if (isBehind && !alreadyTried) {
                    lastConsistencyCheckRef.current = { jid: selectedJid, newest: newest! };
                    if (import.meta.env.DEV) {
                        console.log(
                            `[InboxDb] consistency_fetch chat_jid=${selectedJid} ` +
                            `sidebar_ts=${newest} thread_ts=${threadLast ?? "none"}`,
                        );
                    }
                    void fetchMessagesRef.current?.(selectedJid);
                }
            }

            if (import.meta.env.DEV) {
                console.log(
                    `[InboxDb] source=db chats_count=${list.length} last_loaded_at=${new Date().toISOString()}`,
                );
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[InboxDb] refetchChats error:", msg);
            setChatsError(msg);
        } finally {
            setIsLoadingChats(false);
        }
    }, [userId]);

    // ── Carrega mensagens de uma conversa ──────────────────────────────────
    const fetchMessages = useCallback(
        async (chatJid: string) => {
            if (!userId || !chatJid) return;
            selectedChatJidRef.current = chatJid;
            setIsLoadingMessages(true);
            setMessagesError(null);
            try {
                // F4W.4.4 — DESC LIMIT + reverse no client (mesma técnica do channel)
                const { data, error } = await supabase
                    .from("whatsapp_messages")
                    .select(
                        "id, chat_jid, chat_phone, contact_name, is_group, direction, message_type, body, media_url, media_mimetype, media_caption, audio_duration, message_timestamp, deal_id",
                    )
                    .eq("user_id", userId)
                    .eq("chat_jid", chatJid)
                    .order("message_timestamp", { ascending: false })
                    .limit(MESSAGES_FETCH_LIMIT);
                if (error) throw error;
                const rows = (data || []) as unknown as WaMessageRow[];
                const messages = rows
                    .filter((r) => r.body || r.media_url || r.media_caption || r.audio_duration)
                    .reverse()
                    .map(rowToMessage);
                // Se mudou de chat enquanto a query rolava, descarta
                if (selectedChatJidRef.current !== chatJid) return;
                setPersistedMessages(messages);

                // F4W.4.3 — registra último timestamp do thread
                const lastMsg = messages[messages.length - 1];
                if (lastMsg) {
                    const iso = new Date(lastMsg.timestamp * 1000).toISOString();
                    lastThreadTsRef.current = { jid: chatJid, ts: iso };
                } else {
                    lastThreadTsRef.current = { jid: chatJid, ts: null };
                }

                // Reconcilia pending: remove qualquer pending desse chat cujo
                // body bata com uma outbound persistida (heurística simples
                // texto+sender). Sem deps externas; sem confiar em timestamp
                // exato porque a Evolution pode shiftar segundos.
                setPendingByChat((prev) => {
                    const current = prev[chatJid];
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
                    return { ...prev, [chatJid]: stillPending };
                });

                if (import.meta.env.DEV) {
                    console.log(
                        `[InboxDb] source=db selected_messages_count=${messages.length} last_message_at=${
                            messages[messages.length - 1]?.timestamp ?? "none"
                        }`,
                    );
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[InboxDb] fetchMessages error:", msg);
                setMessagesError(msg);
            } finally {
                setIsLoadingMessages(false);
            }
        },
        [userId],
    );

    // F4W.4.3 — mantém ref pro consistency check de refetchChats
    fetchMessagesRef.current = fetchMessages;

    // F4W.4.3 — setSelectedConversationId: sincroniza ref antes do fetch
    const setSelectedConversationId = useCallback(
        (chatJid: string | null) => {
            const prev = selectedChatJidRef.current;
            selectedChatJidRef.current = chatJid;
            if (prev !== chatJid) {
                lastConsistencyCheckRef.current = null;
                lastThreadTsRef.current = { jid: chatJid, ts: null };
            }
        },
        [],
    );

    // ── Debounced wrappers: usados pelo Realtime pra agrupar bursts ────────
    const scheduleRefetchChats = useCallback(() => {
        if (chatsDebounceRef.current) clearTimeout(chatsDebounceRef.current);
        chatsDebounceRef.current = setTimeout(() => {
            chatsDebounceRef.current = null;
            void refetchChats();
        }, REALTIME_DEBOUNCE_CHATS_MS);
    }, [refetchChats]);

    const scheduleFetchMessages = useCallback(
        (chatJid: string) => {
            if (messagesDebounceRef.current) clearTimeout(messagesDebounceRef.current);
            messagesDebounceRef.current = setTimeout(() => {
                messagesDebounceRef.current = null;
                // Se durante o debounce o user trocou de chat, descarta
                if (selectedChatJidRef.current !== chatJid) return;
                void fetchMessages(chatJid);
            }, REALTIME_DEBOUNCE_MESSAGES_MS);
        },
        [fetchMessages],
    );

    // ── Refresh manual: bypassa debounce, dispara tudo agora ───────────────
    const refreshAll = useCallback(
        async (chatJid?: string | null) => {
            if (chatsDebounceRef.current) {
                clearTimeout(chatsDebounceRef.current);
                chatsDebounceRef.current = null;
            }
            if (messagesDebounceRef.current) {
                clearTimeout(messagesDebounceRef.current);
                messagesDebounceRef.current = null;
            }
            const tasks: Promise<void>[] = [refetchChats()];
            if (chatJid) tasks.push(fetchMessages(chatJid));
            await Promise.all(tasks);
        },
        [refetchChats, fetchMessages],
    );

    // ── Append pending outbound (UI-only, sem banco) ───────────────────────
    const appendPendingMessage = useCallback((chatJid: string, text: string) => {
        if (!chatJid || !text.trim()) return;
        const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setPendingByChat((prev) => {
            const existing = prev[chatJid] ?? [];
            // Janela: expira pending velho do mesmo chat
            const now = Date.now();
            const fresh = existing.filter((p) => now - p.sentAt < PENDING_TTL_MS);
            return {
                ...prev,
                [chatJid]: [
                    ...fresh,
                    { localId, chatJid, text: text.trim(), sentAt: now },
                ],
            };
        });
    }, []);

    // ── Carga inicial dos chats ────────────────────────────────────────────
    useEffect(() => {
        if (!enabled || !userId) return;
        void refetchChats();
    }, [enabled, userId, refetchChats]);

    // ── Realtime: subscribe em INSERTs do user ─────────────────────────────
    useEffect(() => {
        if (!enabled || !userId) return;
        const channel = supabase
            .channel(`vyzon-inbox-db-${userId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "whatsapp_messages" },
                (payload: { new: Record<string, unknown> }) => {
                    const row = payload?.new as Partial<WaMessageRow> | undefined;
                    if (!row || row.user_id !== userId) return;

                    // Atualiza mensagens se for da conversa aberta — DEBOUNCED
                    if (row.chat_jid && row.chat_jid === selectedChatJidRef.current) {
                        scheduleFetchMessages(row.chat_jid);
                    }
                    // Refetch da lista — DEBOUNCED (burst de webhook não vira N requests)
                    scheduleRefetchChats();
                },
            )
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, scheduleFetchMessages, scheduleRefetchChats]);

    // ── Cleanup timers no unmount ──────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (chatsDebounceRef.current) clearTimeout(chatsDebounceRef.current);
            if (messagesDebounceRef.current) clearTimeout(messagesDebounceRef.current);
        };
    }, []);

    // ── Garbage-collect pendings expirados periodicamente ──────────────────
    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(() => {
            const now = Date.now();
            setPendingByChat((prev) => {
                let changed = false;
                const next: Record<string, PendingOutboundMessage[]> = {};
                for (const [jid, list] of Object.entries(prev)) {
                    const fresh = list.filter((p) => now - p.sentAt < PENDING_TTL_MS);
                    if (fresh.length !== list.length) changed = true;
                    if (fresh.length > 0) next[jid] = fresh;
                }
                return changed ? next : prev;
            });
        }, 5_000);
        return () => clearInterval(interval);
    }, [enabled]);

    // activeCompanyId pode mudar (super_admin tenant switch) → recarrega
    useEffect(() => {
        if (!enabled || !chatsLoadedOnce) return;
        void refetchChats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCompanyId, enabled]);

    // ── Merge pending na thread renderizada ────────────────────────────────
    // Pending vira MessageLine[] no fim da thread quando o chat selecionado
    // ainda não recebeu a outbound real do webhook.
    const selectedJid = selectedChatJidRef.current;
    const pendingForSelected = selectedJid ? pendingByChat[selectedJid] || [] : [];
    const pendingLines: MessageLine[] = pendingForSelected.map((p) => ({
        id: p.localId,
        text: p.text,
        sender: "me",
        time: new Date(p.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Math.floor(p.sentAt / 1000),
        pending: true,
    }));
    const selectedChatMessages: MessageLine[] = pendingLines.length
        ? [...persistedMessages, ...pendingLines]
        : persistedMessages;

    return {
        chats,
        selectedChatMessages,
        isLoadingChats,
        isLoadingMessages,
        chatsError,
        messagesError,
        fetchMessages,
        refetchChats,
        refreshAll,
        appendPendingMessage,
        setSelectedConversationId,
        chatsLoadedOnce,
        source: "db",
        isEmpty,
        lastChatsLoadedAt,
    };
}
