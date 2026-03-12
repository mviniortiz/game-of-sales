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

export type MediaType = "image" | "video" | "audio" | "sticker" | "document" | null;

export interface MessageLine {
    id: string;
    text: string;
    sender: "me" | "lead";
    time: string;
    timestamp: number;
    senderName?: string;
    /** For audio messages: base64 data URI or remote URL */
    audioUrl?: string;
    /** Audio duration in seconds (from audioMessage.seconds) */
    audioDuration?: number;
    /** Type of media attachment */
    mediaType?: MediaType;
    /** Caption for image/video messages */
    mediaCaption?: string;
    /** Mimetype of the media */
    mediaMimetype?: string;
}


const extractNumberFromJid = (jid?: string | null) => {
    if (!jid) return "";
    return String(jid).split("@")[0].replace(/\D/g, "");
};

/**
 * Detects WhatsApp LID (Linked ID) JIDs that aren't real phone numbers.
 * LIDs can appear as "lid:NUMBER", "NUMBER@lid", or as fake phone-format
 * JIDs with numbers that don't match valid E.164 patterns.
 *
 * WhatsApp LIDs are internal identifiers that sometimes leak through as
 * regular-looking JIDs (e.g. 38049769644279@s.whatsapp.net).
 */
const isLidJid = (jid: string): boolean => {
    if (jid.startsWith("lid:")) return true;
    if (jid.includes("@lid")) return true;

    const digits = jid.split("@")[0].replace(/\D/g, "");
    if (!digits) return false;

    // E.164 phone numbers are max 15 digits, but real-world max is ~13
    if (digits.length > 15) return true;
    // Numbers starting with 0 aren't valid international phone numbers
    if (digits.startsWith("0") && digits.length > 1) return true;

    // Validate against known country code + number length patterns
    // Brazil (55): 12-13 digits total (55 + 2 DDD + 8-9 number)
    if (digits.startsWith("55")) return digits.length < 12 || digits.length > 13;
    // USA/Canada (1): 11 digits
    if (digits.startsWith("1")) return digits.length !== 11;
    // For other country codes: if > 13 digits, very likely a LID
    // (most real international numbers are 7-13 digits)
    if (digits.length > 13) return true;

    return false;
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

/** Extract audio metadata from a raw Evolution API message */
const extractAudioInfo = (msg: any): { url?: string; duration?: number } | null => {
    const audio = msg?.message?.audioMessage;
    if (!audio) return null;
    const url = audio.url || audio.mediaUrl || msg?.mediaUrl || undefined;
    const duration = Number(audio.seconds || audio.duration || 0) || undefined;
    return { url, duration };
};

/** Extract media type, caption and mimetype from a raw Evolution API message */
const extractMediaInfo = (msg: any): { type: MediaType; caption?: string; mimetype?: string } => {
    const m = msg?.message;
    if (!m) return { type: null };
    if (m.imageMessage) return {
        type: "image",
        caption: m.imageMessage.caption || undefined,
        mimetype: m.imageMessage.mimetype || "image/jpeg",
    };
    if (m.videoMessage) return {
        type: "video",
        caption: m.videoMessage.caption || undefined,
        mimetype: m.videoMessage.mimetype || "video/mp4",
    };
    if (m.audioMessage) return {
        type: "audio",
        mimetype: m.audioMessage.mimetype || "audio/ogg",
    };
    if (m.stickerMessage) return {
        type: "sticker",
        mimetype: m.stickerMessage.mimetype || "image/webp",
    };
    if (m.documentMessage) return {
        type: "document",
        caption: m.documentMessage.fileName || undefined,
        mimetype: m.documentMessage.mimetype || "application/octet-stream",
    };
    return { type: null };
};

type ProxyAction = "status" | "connect" | "chats" | "messages" | "send" | "sendMedia" | "sendAudio" | "logout" | "profilePic" | "instances" | "getMedia";

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
    const pollingInProgress = useRef(false);

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
        if (response.error) {
            // Try to read error body from FunctionsHttpError context
            let detail = response.error.message;
            try {
                const ctx = (response.error as any).context;
                if (ctx && typeof ctx.json === "function") {
                    const body = await ctx.json();
                    detail = body?.error || body?.message || JSON.stringify(body);
                    console.error(`[invokeProxy] ${action} failed:`, detail, body);
                } else {
                    console.error(`[invokeProxy] ${action} failed:`, detail, response.data);
                }
            } catch {
                console.error(`[invokeProxy] ${action} failed (no body):`, detail);
            }
            throw new Error(detail);
        }
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
            // Debug: log raw JIDs to identify LID patterns
            if (rawChats.length > 0) {
                console.log("[WhatsApp] Raw chat JIDs:", rawChats.slice(0, 30).map((c: any) => ({
                    jid: c?.remoteJid || c?.id,
                    name: c?.pushName || c?.name,
                    lid: c?.lid || c?.lidJid || undefined,
                })));
            }
            const seenPhones = new Set<string>();
            const seenNames = new Set<string>();
            const transformed: Chat[] = rawChats
                .filter((c: any) => {
                    const jid = String(c?.remoteJid || c?.id || "");
                    if (!jid) return false;
                    // Filter out system/internal chats
                    if (jid.includes("@broadcast")) return false;    // status updates
                    if (jid.includes("@newsletter")) return false;   // channels
                    if (jid === "0@s.whatsapp.net") return false;    // system
                    if (isLidJid(jid)) return false;                 // WhatsApp LID (not real phone)
                    // Also check raw chat properties for LID indicators
                    if (c?.lid || c?.lidJid) return false;
                    // Deduplicate by phone number (same contact can appear with different JIDs)
                    const isGroup = jid.includes("@g.us");
                    if (!isGroup) {
                        const phone = extractNumberFromJid(jid);
                        if (phone && seenPhones.has(phone)) return false;
                        if (phone) seenPhones.add(phone);
                        // Also deduplicate by pushName for LIDs that slip through
                        // (same contact may appear under both phone JID and LID JID)
                        const name = String(c?.pushName || "").trim().toLowerCase();
                        if (name && name !== "contato" && seenNames.has(name)) {
                            console.warn(`[WhatsApp] Duplicate contact filtered: jid=${jid} name=${name}`);
                            return false;
                        }
                        if (name) seenNames.add(name);
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
                if (pollingInProgress.current) return;
                pollingInProgress.current = true;
                try {
                    const open = await checkConnectionState();
                    if (open) {
                        clearPolling();
                        setConnecting(false);
                        await fetchChats(true);
                    }
                } finally {
                    pollingInProgress.current = false;
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

    // Map phone JID → LID JID (discovered from message remoteJidAlt)
    const lidMapRef = useRef<Map<string, string>>(new Map());

    const extractRawMessages = (data: any): any[] => {
        if (Array.isArray(data?.messages)) return data.messages;
        if (Array.isArray(data?.messages?.records)) return data.messages.records;
        if (Array.isArray(data?.records)) return data.records;
        if (Array.isArray(data)) return data;
        return [];
    };

    const parseRawToMessages = (raw: any[]): MessageLine[] => {
        const seen = new Set<string>();
        return raw
            .map((msg: any) => {
                const text = parseTextFromMessage(msg);
                if (!text) return null;

                const ts = Number(msg?.messageTimestamp || msg?.timestamp || 0);
                const date = ts ? new Date(ts * 1000) : new Date();
                const fromMe = msg?.key?.fromMe ?? msg?.fromMe ?? false;

                const id = msg?.key?.id || msg?.id || `msg_${ts}_${fromMe ? "me" : "lead"}_${text.slice(0, 32)}`;
                if (seen.has(id)) return null;
                seen.add(id);

                const audioInfo = extractAudioInfo(msg);
                const mediaInfo = extractMediaInfo(msg);

                return {
                    id,
                    text,
                    sender: (fromMe ? "me" : "lead") as "me" | "lead",
                    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    timestamp: ts || date.getTime() / 1000,
                    senderName: msg?.pushName || msg?.participant || undefined,
                    audioUrl: audioInfo?.url,
                    audioDuration: audioInfo?.duration,
                    mediaType: mediaInfo.type,
                    mediaCaption: mediaInfo.caption,
                    mediaMimetype: mediaInfo.mimetype,
                };
            })
            .filter((m): m is MessageLine => m !== null);
    };

    const fetchMessages = useCallback(async (chatId: string, isPolling = false) => {
        if (!connected || !chatId) return;
        if (!isPolling) {
            setIsLoadingMessages(true);
            setError(null);
        }
        try {
            // 1. Fetch messages for the primary JID (phone number)
            const data = await invokeProxy("messages", { chatId, limit: 50 });
            const raw = extractRawMessages(data);

            // 2. Discover LID alt JID from message keys (e.g. remoteJidAlt: "123@lid")
            if (!chatId.includes("@g.us") && !chatId.includes("@lid")) {
                for (const msg of raw) {
                    const altJid = msg?.key?.remoteJidAlt;
                    if (altJid && String(altJid).includes("@lid")) {
                        lidMapRef.current.set(chatId, altJid);
                        break;
                    }
                }
            }

            // 3. If there's a known LID for this chat, also fetch messages from it
            //    Messages received FROM the contact often live under the LID JID
            const lidJid = lidMapRef.current.get(chatId);
            let lidRaw: any[] = [];
            if (lidJid) {
                try {
                    const lidData = await invokeProxy("messages", { chatId: lidJid, limit: 50 });
                    lidRaw = extractRawMessages(lidData);
                } catch {
                    // LID fetch failed — not critical, continue with phone JID messages only
                }
            }

            // 4. Merge both sets and deduplicate
            const allRaw = [...raw, ...lidRaw];
            const messages = parseRawToMessages(allRaw)
                .sort((a, b) => a.timestamp - b.timestamp);

            // Only update state if messages actually changed
            const signature = messages.map(m => m.id).join(",");
            if (signature !== lastMsgSignatureRef.current) {
                lastMsgSignatureRef.current = signature;
                setSelectedChatMessages(prev => {
                    const tempMessages = prev.filter(m => m.id.startsWith("temp_"));
                    if (tempMessages.length === 0) return messages;
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

    const sendMediaMessage = useCallback(async (
        chatId: string,
        base64: string,
        mimetype: string,
        opts?: { caption?: string; fileName?: string }
    ) => {
        if (!connected || !chatId || !base64) return;

        const isImage = mimetype.startsWith("image/");
        const isVideo = mimetype.startsWith("video/");
        const label = isImage ? "📷 Imagem" : isVideo ? "🎥 Vídeo" : `📎 ${opts?.fileName || "Documento"}`;

        const optimistic: MessageLine = {
            id: `temp_${Date.now()}`,
            text: opts?.caption || label,
            sender: "me",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: Date.now() / 1000,
            mediaType: isImage ? "image" : isVideo ? "video" : "document",
        };

        setSelectedChatMessages((prev) => [...prev, optimistic]);
        setError(null);

        try {
            console.log("[sendMedia] calling proxy:", { chatId, mimetype, base64Length: base64.length, fileName: opts?.fileName });
            const result = await invokeProxy("sendMedia", {
                chatId,
                mediaBase64: base64,
                mimetype,
                caption: opts?.caption || undefined,
                fileName: opts?.fileName || undefined,
            });
            console.log("[sendMedia] success:", result);
        } catch (err: any) {
            console.error("[sendMedia] error:", err?.message || err, err);
            setSelectedChatMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError(err?.message || "Falha ao enviar mídia.");
        }
    }, [connected, invokeProxy]);

    const sendAudioMessage = useCallback(async (chatId: string, base64: string) => {
        if (!connected || !chatId || !base64) return;

        const optimistic: MessageLine = {
            id: `temp_${Date.now()}`,
            text: "🎤 Áudio",
            sender: "me",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: Date.now() / 1000,
            mediaType: "audio",
        };

        setSelectedChatMessages((prev) => [...prev, optimistic]);
        setError(null);

        try {
            console.log("[sendAudio] calling proxy:", { chatId, base64Length: base64.length });
            const result = await invokeProxy("sendAudio", { chatId, mediaBase64: base64, mimetype: "audio/webm" });
            console.log("[sendAudio] success:", result);
        } catch (err: any) {
            console.error("[sendAudio] error:", err?.message || err, err);
            setSelectedChatMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError(err?.message || "Falha ao enviar áudio.");
        }
    }, [connected, invokeProxy]);

    // Audio media cache: messageId → data URI
    const audioCache = useRef<Map<string, string>>(new Map());

    const getAudioMedia = useCallback(async (messageId: string): Promise<string | null> => {
        // Return cached if available
        if (audioCache.current.has(messageId)) {
            return audioCache.current.get(messageId)!;
        }
        try {
            const data = await invokeProxy("getMedia", { messageId });
            console.log("[getAudioMedia] response:", {
                hasBase64: !!data?.base64,
                base64Length: data?.base64?.length,
                base64Start: data?.base64?.slice(0, 40),
                mimetype: data?.mimetype,
                keys: data ? Object.keys(data) : [],
            });
            if (data?.base64) {
                const rawMime = data.mimetype || "audio/ogg";
                // Normalize mimetype for browser compatibility
                // WhatsApp audio is typically opus in ogg container
                const mimetype = rawMime.includes("opus") || rawMime.includes("ogg")
                    ? "audio/ogg; codecs=opus"
                    : rawMime;
                const dataUri = `data:${mimetype};base64,${data.base64}`;
                audioCache.current.set(messageId, dataUri);
                return dataUri;
            }
        } catch (err) {
            console.error("[getAudioMedia] error:", err);
        }
        return null;
    }, [invokeProxy]);

    // Stable callbacks that never change identity — prevents useEffect re-triggers
    const stableCheckConnection = useStableCallback(checkConnectionState);
    const stableFetchChats = useStableCallback(fetchChats);
    const stableFetchMessages = useStableCallback(fetchMessages);
    const stableGetAudioMedia = useStableCallback(getAudioMedia);

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
        getAudioMedia: stableGetAudioMedia,
        sendMediaMessage,
        sendAudioMessage,
    };
};
