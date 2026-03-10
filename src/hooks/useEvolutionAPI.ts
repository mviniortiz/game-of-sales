import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

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
    status?: string;
    term?: string;
    value?: string;
    score?: number;
    phone?: string;
}

export interface MessageLine {
    id: string;
    text: string;
    sender: "me" | "lead";
    time: string;
}

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const stableMockMeta = (id: string) => {
    const seed = hashString(id);
    const statusOptions = ["Quente", "Morno", "Frio"] as const;
    const termOptions = ["Prospecção", "Negociação", "Follow-up"] as const;
    return {
        status: statusOptions[seed % statusOptions.length],
        term: termOptions[seed % termOptions.length],
        score: 60 + (seed % 41),
    };
};

const extractNumberFromJid = (jid?: string | null) => {
    if (!jid) return "";
    return String(jid).split("@")[0].replace(/\D/g, "");
};

const safeTime = (timestampSeconds?: number) => {
    const dt = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date();
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const parseTextFromMessage = (msg: any) => {
    if (msg?.message?.conversation) return msg.message.conversation;
    if (msg?.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
    if (msg?.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
    if (msg?.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
    if (msg?.message?.imageMessage) return "📷 Imagem";
    if (msg?.message?.audioMessage) return "🎤 Áudio";
    if (msg?.message?.videoMessage) return "🎥 Vídeo";
    if (msg?.message?.documentMessage?.fileName) return `📎 ${msg.message.documentMessage.fileName}`;
    return "Mensagem não suportada";
};

type ProxyAction = "status" | "connect" | "chats" | "messages" | "send" | "logout";

export const useEvolutionIntegration = () => {
    const { activeCompanyId } = useTenant();
    const [config, setConfig] = useState({
        managed: true,
        apiUrl: "",
        apiKey: "",
        instanceName: activeCompanyId ? `wa_${activeCompanyId.replace(/-/g, "")}` : "wa_instance",
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
        setConfig((prev) => ({
            ...prev,
            instanceName: activeCompanyId ? `wa_${activeCompanyId.replace(/-/g, "")}` : prev.instanceName,
        }));
    }, [activeCompanyId]);

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
                ...payload,
            },
        });
        if (response.error) throw response.error;
        return response.data;
    }, [activeCompanyId]);

    const fetchChats = useCallback(async () => {
        if (!connected) return;
        setIsLoadingChats(true);
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
            const transformed: Chat[] = rawChats
                .filter((c: any) => c?.id && !String(c.id).includes("@g.us"))
                .map((c: any) => {
                    const number = extractNumberFromJid(c.id);
                    const meta = stableMockMeta(c.id);
                    return {
                        id: c.id,
                        name: c.name || c.pushName || number || "Contato",
                        unreadCount: Number(c.unreadCount || 0),
                        profilePicUrl: c.profilePictureUrl || c.profilePicUrl || undefined,
                        lastMessage: {
                            text: c?.lastMessage?.text || c?.conversation?.text || "Mensagem recente",
                            time: safeTime(c.timestamp || c.conversationTimestamp),
                            isMe: false,
                        },
                        status: meta.status,
                        term: meta.term,
                        score: meta.score,
                        phone: number ? `+${number}` : undefined,
                    };
                });
            setChats(transformed);
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
            setConnected(isOpen);
            setConnecting(!isOpen && ["connecting"].includes(String(data?.state || "").toLowerCase()));
            if (isOpen) {
                setQrCodeBase64(null);
                setError(null);
            }
            return isOpen;
        } catch (err: any) {
            console.error("Error checking WhatsApp state:", err);
            setConnected(false);
            setConnecting(false);
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
                await fetchChats();
                return;
            }

            const data = await invokeProxy("connect");
            if (data?.connected) {
                setConnected(true);
                setConnecting(false);
                setQrCodeBase64(null);
                await fetchChats();
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
                    await fetchChats();
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
        }
    }, [invokeProxy]);

    const fetchMessages = useCallback(async (chatId: string) => {
        if (!connected || !chatId) return;
        setIsLoadingMessages(true);
        setError(null);
        try {
            const data = await invokeProxy("messages", { chatId, limit: 50 });
            const raw = Array.isArray(data?.messages)
                ? data.messages
                : Array.isArray(data?.messages?.records)
                    ? data.messages.records
                    : Array.isArray(data?.records)
                        ? data.records
                        : [];

            const messages: MessageLine[] = raw.map((msg: any, idx: number) => {
                const date = msg?.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date();
                return {
                    id: msg?.key?.id || `msg_${idx}_${date.getTime()}`,
                    text: parseTextFromMessage(msg),
                    sender: msg?.key?.fromMe ? "me" : "lead",
                    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                };
            });

            setSelectedChatMessages(messages);
        } catch (err) {
            console.error("Fetch messages error", err);
            setError("Falha ao carregar mensagens deste contato.");
        } finally {
            setIsLoadingMessages(false);
        }
    }, [connected, invokeProxy]);

    const sendMessage = useCallback(async (chatId: string, text: string) => {
        if (!connected || !chatId || !text.trim()) return;

        const optimistic: MessageLine = {
            id: `temp_${Date.now()}`,
            text: text.trim(),
            sender: "me",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setSelectedChatMessages((prev) => [...prev, optimistic]);
        setError(null);

        try {
            await invokeProxy("send", { chatId, text: text.trim() });
        } catch (err) {
            console.error("Send message error", err);
            setSelectedChatMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError("Falha ao enviar mensagem.");
        }
    }, [connected, invokeProxy]);

    const refreshConnection = useCallback(async () => {
        const open = await checkConnectionState();
        if (open) {
            await fetchChats();
        }
    }, [checkConnectionState, fetchChats]);

    useEffect(() => {
        if (!activeCompanyId) return;
        refreshConnection();
        return () => clearPolling();
    }, [activeCompanyId, refreshConnection]);

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
        fetchMessages,
        sendMessage,
        fetchChats,
        refreshConnection,
        checkConnectionState,
    };
};
