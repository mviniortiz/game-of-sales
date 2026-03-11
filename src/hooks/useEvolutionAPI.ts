import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;
function useStableCallback<T extends AnyFn>(fn: T): T {
    const ref = useRef<T>(fn);
    ref.current = fn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
}

export interface Chat {
    id: string;
    name: string;
    unreadCount: number;
    profilePicUrl?: string;
    lastMessage?: {
        text: string;
        time: string;
        isMe: boolean;
    };
    phone?: string;
    isGroup: boolean;
}

export interface MessageLine {
    id: string;
    text: string;
    sender: "me" | "lead";
    time: string;
    timestamp: number;
    senderName?: string;
}


const extractNumberFromJid = (jid?: string | null) => {
    if (!jid) return "";
    return String(jid).split("@")[0].replace(/\D/g, "");
};

const safeTime = (timestampSeconds?: number) => {
    const dt = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date();
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const parseTextFromMessage = (msg: any): string | null => {
    // Try multiple message format variations (Evolution API v2.2 vs v2.3)
    const m = msg?.message;
    if (!m) {
        // v2.3.7 may put body/text at top level
        if (msg?.body) return msg.body;
        if (msg?.text) return msg.text;
        if (msg?.content) return typeof msg.content === "string" ? msg.content : null;
        return null;
    }

    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.buttonsResponseMessage?.selectedDisplayText) return m.buttonsResponseMessage.selectedDisplayText;
    if (m.listResponseMessage?.title) return m.listResponseMessage.title;
    if (m.templateButtonReplyMessage?.selectedDisplayText) return m.templateButtonReplyMessage.selectedDisplayText;
    if (m.imageMessage) return "📷 Imagem";
    if (m.audioMessage) return "🎤 Áudio";
    if (m.videoMessage) return "🎥 Vídeo";
    if (m.stickerMessage) return "🏷️ Sticker";
    if (m.documentMessage?.fileName) return `📎 ${m.documentMessage.fileName}`;
    if (m.documentMessage) return "📎 Documento";
    if (m.contactMessage?.displayName) return `👤 ${m.contactMessage.displayName}`;
    if (m.locationMessage) return "📍 Localização";
    if (m.liveLocationMessage) return "📍 Localização ao vivo";
    if (m.reactionMessage) return null; // skip reactions
    if (m.protocolMessage) return null; // skip protocol messages
    if (m.senderKeyDistributionMessage) return null; // skip key distribution

    return null; // return null instead of "unsupported" so we can filter
};

type ProxyAction = "status" | "connect" | "chats" | "messages" | "send" | "logout" | "profilePic" | "instances";

export interface SellerInstance {
    userId: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    connected: boolean;
}

export const useEvolutionIntegration = () => {
    const { activeCompanyId } = useTenant();
    const { user } = useAuth();
    const userId = user?.id;
    const [targetUserId, setTargetUserId] = useState<string | null>(null);

    const effectiveUserId = targetUserId || userId;

    const [config, setConfig] = useState({
        managed: true,
        apiUrl: "",
        apiKey: "",
        instanceName: effectiveUserId ? `wa_${effectiveUserId.replace(/-/g, "")}` : "wa_instance",
    });

    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatMessages, setSelectedChatMessages] = useState<MessageLine[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newName = effectiveUserId ? `wa_${effectiveUserId.replace(/-/g, "")}` : null;
        if (newName) {
            setConfig((prev) => prev.instanceName === newName ? prev : { ...prev, instanceName: newName });
        }
    }, [effectiveUserId]);

    const clearPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    const clearError = () => setError(null);

    const updateConfig = () => {
        // Mantido por compatibilidade com a UI; no modo gerenciado não faz nada.
        setError(null);
    };

    const invokeProxy = useCallback(async (action: ProxyAction, payload: Record<string, any> = {}) => {
        const response = await supabase.functions.invoke("evolution-whatsapp", {
            body: {
                action,
                companyId: activeCompanyId,
                ...(targetUserId ? { targetUserId } : {}),
                ...payload,
            },
        });
        if (response.error) throw response.error;
        return response.data;
    }, [activeCompanyId, targetUserId]);

    const chatsLoadedOnceRef = useRef(false);

    const fetchChats = useCallback(async (forceLoad = false) => {
        if (!connected && !forceLoad) return;
        // Only show loading spinner on first load
        if (!chatsLoadedOnceRef.current) {
            setIsLoadingChats(true);
        }
        setError(null);
        try {
            const data = await invokeProxy("chats");
            const rawChats = Array.isArray(data?.chats)
                ? data.chats
                : Array.isArray(data?.chats?.records)
                    ? data.chats.records
                    : Array.isArray(data?.records)
                        ? data.records
                        : [];
            const seenPhones = new Set<string>();
            const transformed: Chat[] = rawChats
                .filter((c: any) => {
                    const jid = String(c?.remoteJid || c?.id || "");
                    if (!jid) return false;
                    // Filter out system/internal chats
                    if (jid.includes("@broadcast")) return false;    // status updates
                    if (jid.includes("@newsletter")) return false;   // channels
                    if (jid.startsWith("lid:")) return false;        // internal WhatsApp IDs
                    if (jid === "0@s.whatsapp.net") return false;    // system
                    // Deduplicate by phone number (same contact can appear with different JIDs)
                    const isGroup = jid.includes("@g.us");
                    if (!isGroup) {
                        const phone = extractNumberFromJid(jid);
                        if (phone && seenPhones.has(phone)) return false;
                        if (phone) seenPhones.add(phone);
                    }
                    return true;
                })
                .map((c: any) => {
                    const jid = c?.remoteJid || c?.id;
                    const isGroup = String(jid).includes("@g.us");
                    const number = isGroup ? "" : extractNumberFromJid(jid);
                    const lastMsg = c?.lastMessage;
                    const lastText = (lastMsg ? parseTextFromMessage(lastMsg) : null)
                        || lastMsg?.body
                        || lastMsg?.text
                        || "Mensagem recente";

                    // For contacts: pushName > name > contactName > number
                    // For groups: subject > name > pushName > "Grupo"
                    const contactName = isGroup
                        ? (c.subject || c.name || c.pushName || "Grupo")
                        : (c.pushName || c.name || c.contactName || c.verifiedName || (number || "Contato"));

                    return {
                        id: jid,
                        name: contactName,
                        unreadCount: Number(c.unreadCount || 0),
                        profilePicUrl: c.profilePicUrl || c.profilePictureUrl || undefined,
                        lastMessage: {
                            text: lastText,
                            time: safeTime(c.updatedAt ? Math.floor(new Date(c.updatedAt).getTime() / 1000) : c.timestamp || c.conversationTimestamp),
                            isMe: lastMsg?.key?.fromMe || false,
                        },
                        phone: number ? `+${number}` : undefined,
                        isGroup,
                    };
                });
            chatsLoadedOnceRef.current = true;
            setChats(transformed);

            // Lazy-fetch profile pictures for chats that don't have one
            const chatsWithoutPic = transformed.filter(c => !c.profilePicUrl && c.phone);
            if (chatsWithoutPic.length > 0) {
                // Fetch in background, update as they come in (max 10 to avoid rate limits)
                const toFetch = chatsWithoutPic.slice(0, 10);
                Promise.allSettled(
                    toFetch.map(async (chat) => {
                        try {
                            const number = chat.phone!.replace(/\D/g, "");
                            const res = await invokeProxy("profilePic", { number });
                            if (res?.profilePicUrl) {
                                return { id: chat.id, url: res.profilePicUrl };
                            }
                        } catch { /* ignore */ }
                        return null;
                    })
                ).then((results) => {
                    const updates = results
                        .map(r => r.status === "fulfilled" ? r.value : null)
                        .filter(Boolean) as { id: string; url: string }[];
                    if (updates.length > 0) {
                        setChats(prev => prev.map(c => {
                            const upd = updates.find(u => u.id === c.id);
                            return upd ? { ...c, profilePicUrl: upd.url } : c;
                        }));
                    }
                });
            }
        } catch (err) {
            console.error("Fetch chats error", err);
            setError("Falha ao carregar conversas do WhatsApp.");
        } finally {
            setIsLoadingChats(false);
        }
    }, [connected, invokeProxy]);

    const checkConnectionState = useCallback(async () => {
        try {
            const data = await invokeProxy("status");
            const isOpen = data?.connected === true;
            // Only update state if values actually changed
            setConnected(prev => prev === isOpen ? prev : isOpen);
            setConnecting(prev => {
                const next = !isOpen && ["connecting"].includes(String(data?.state || "").toLowerCase());
                return prev === next ? prev : next;
            });
            if (isOpen) {
                setQrCodeBase64(prev => prev === null ? prev : null);
                setError(prev => prev === null ? prev : null);
            }
            return isOpen;
        } catch (err: any) {
            console.error("Error checking WhatsApp state:", err);
            setConnected(prev => prev === false ? prev : false);
            setConnecting(prev => prev === false ? prev : false);
            setError(err?.message || "Falha ao verificar conexão do WhatsApp.");
            return false;
        }
    }, [invokeProxy]);

    const connect = useCallback(async () => {
        clearPolling();
        setConnecting(true);
        setError(null);
        try {
            const statusOpen = await checkConnectionState();
            if (statusOpen) {
                await fetchChats(true);
                return;
            }

            const data = await invokeProxy("connect");
            if (data?.connected) {
                setConnected(true);
                setConnecting(false);
                setQrCodeBase64(null);
                await fetchChats(true);
                return;
            }

            if (data?.qrCodeBase64) {
                setQrCodeBase64(data.qrCodeBase64);
            }

            pollingIntervalRef.current = setInterval(async () => {
                const open = await checkConnectionState();
                if (open) {
                    clearPolling();
                    setConnecting(false);
                    await fetchChats(true);
                }
            }, 3000);
        } catch (err: any) {
            console.error("Connect WhatsApp error", err);
            setConnecting(false);
            setError(err?.message || "Erro ao gerar QR Code do WhatsApp.");
        }
    }, [checkConnectionState, fetchChats, invokeProxy]);

    const logout = useCallback(async () => {
        clearPolling();
        try {
            await invokeProxy("logout");
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            setConnected(false);
            setConnecting(false);
            setQrCodeBase64(null);
            setChats([]);
            setSelectedChatMessages([]);
            chatsLoadedOnceRef.current = false;
            lastMsgSignatureRef.current = "";
        }
    }, [invokeProxy]);

    // Track last message IDs to avoid unnecessary re-renders on polling
    const lastMsgSignatureRef = useRef<string>("");

    const fetchMessages = useCallback(async (chatId: string, isPolling = false) => {
        if (!connected || !chatId) return;
        // Only show loading spinner on first load, not on background polling
        if (!isPolling) {
            setIsLoadingMessages(true);
            setError(null);
        }
        try {
            const data = await invokeProxy("messages", { chatId, limit: 50 });

            const raw = Array.isArray(data?.messages)
                ? data.messages
                : Array.isArray(data?.messages?.records)
                    ? data.messages.records
                    : Array.isArray(data?.records)
                        ? data.records
                        : Array.isArray(data)
                            ? data
                            : [];

            const seen = new Set<string>();
            const messages: MessageLine[] = raw
                .map((msg: any) => {
                    const text = parseTextFromMessage(msg);
                    if (!text) return null;

                    const ts = Number(msg?.messageTimestamp || msg?.timestamp || 0);
                    const date = ts ? new Date(ts * 1000) : new Date();
                    const fromMe = msg?.key?.fromMe ?? msg?.fromMe ?? false;

                    // Build a stable ID: prefer API key, fall back to content-based hash
                    const id = msg?.key?.id || msg?.id || `msg_${ts}_${fromMe ? "me" : "lead"}_${text.slice(0, 32)}`;

                    // Deduplicate by message ID
                    if (seen.has(id)) return null;
                    seen.add(id);

                    return {
                        id,
                        text,
                        sender: (fromMe ? "me" : "lead") as "me" | "lead",
                        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        timestamp: ts || date.getTime() / 1000,
                        senderName: msg?.pushName || msg?.participant || undefined,
                    };
                })
                .filter((m): m is MessageLine => m !== null)
                .sort((a, b) => a.timestamp - b.timestamp);

            // Only update state if messages actually changed (prevents unnecessary re-renders)
            const signature = messages.map(m => m.id).join(",");
            if (signature !== lastMsgSignatureRef.current) {
                lastMsgSignatureRef.current = signature;
                // Replace API messages and remove any optimistic temp_ messages
                // that now have a real counterpart from the server
                setSelectedChatMessages(prev => {
                    const tempMessages = prev.filter(m => m.id.startsWith("temp_"));
                    if (tempMessages.length === 0) return messages;
                    // Keep temp messages only if no real "me" message with similar timestamp exists
                    const kept = tempMessages.filter(tm => {
                        return !messages.some(rm =>
                            rm.sender === "me" &&
                            rm.text === tm.text &&
                            Math.abs(rm.timestamp - tm.timestamp) < 60
                        );
                    });
                    return [...messages, ...kept].sort((a, b) => a.timestamp - b.timestamp);
                });
            }
        } catch (err) {
            if (!isPolling) {
                console.error("Fetch messages error", err);
                setError("Falha ao carregar mensagens deste contato.");
            }
        } finally {
            if (!isPolling) {
                setIsLoadingMessages(false);
            }
        }
    }, [connected, invokeProxy]);

    const sendMessage = useCallback(async (chatId: string, text: string) => {
        if (!connected || !chatId || !text.trim()) {
            console.warn("[sendMessage] blocked:", { connected, chatId: !!chatId, text: !!text.trim() });
            return;
        }

        const optimistic: MessageLine = {
            id: `temp_${Date.now()}`,
            text: text.trim(),
            sender: "me",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: Date.now() / 1000,
        };

        setSelectedChatMessages((prev) => [...prev, optimistic]);
        setError(null);

        try {
            const result = await invokeProxy("send", { chatId, text: text.trim() });
            console.log("[sendMessage] success:", result?.success);
        } catch (err: any) {
            console.error("[sendMessage] error:", err?.message || err);
            setSelectedChatMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError(err?.message || "Falha ao enviar mensagem.");
        }
    }, [connected, invokeProxy]);

    // Stable callbacks that never change identity — prevents useEffect re-triggers
    const stableCheckConnection = useStableCallback(checkConnectionState);
    const stableFetchChats = useStableCallback(fetchChats);
    const stableFetchMessages = useStableCallback(fetchMessages);

    const refreshConnection = useCallback(async () => {
        const open = await stableCheckConnection();
        if (open) {
            // Pass forceLoad=true because React state `connected` hasn't
            // been flushed yet after checkConnectionState set it.
            await stableFetchChats(true);
        }
    }, [stableCheckConnection, stableFetchChats]);

    const setTargetUser = useCallback((sellerId: string | null) => {
        setTargetUserId(sellerId);
        // Reset state when switching users
        setConnected(false);
        setConnecting(false);
        setQrCodeBase64(null);
        setChats([]);
        setSelectedChatMessages([]);
        chatsLoadedOnceRef.current = false;
        lastMsgSignatureRef.current = "";
        setError(null);
    }, []);

    const fetchInstances = useCallback(async (): Promise<SellerInstance[]> => {
        try {
            const data = await invokeProxy("instances");
            return data?.sellers || [];
        } catch (err) {
            console.error("Fetch instances error", err);
            return [];
        }
    }, [invokeProxy]);

    useEffect(() => {
        if (!activeCompanyId || !effectiveUserId) return;
        refreshConnection();
        return () => clearPolling();
        // Re-run when activeCompanyId or effectiveUserId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCompanyId, effectiveUserId]);

    return {
        config,
        updateConfig,
        connecting,
        connected,
        qrCodeBase64,
        error,
        clearError,
        connect,
        logout,
        chats,
        selectedChatMessages,
        isLoadingChats,
        isLoadingMessages,
        fetchMessages: stableFetchMessages,
        sendMessage,
        fetchChats: stableFetchChats,
        refreshConnection,
        checkConnectionState: stableCheckConnection,
        targetUserId,
        setTargetUser,
        fetchInstances,
    };
};
