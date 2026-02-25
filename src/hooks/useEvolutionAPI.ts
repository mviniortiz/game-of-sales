import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

// Interfaces based on Evolution API
export interface Chat {
    id: string; // The remote JID (e.g., 5511999999999@s.whatsapp.net)
    name: string;
    unreadCount: number;
    profilePicUrl?: string;
    lastMessage?: {
        text: string;
        time: string;
        isMe: boolean;
    };
    // Mock CRM data for now, since this comes from WhatsApp
    status?: string;
    term?: string;
    value?: string;
    score?: number;
    phone?: string;
}

export interface MessageLine {
    id: string;
    text: string;
    sender: 'me' | 'lead';
    time: string;
}

export const useEvolutionIntegration = () => {
    // Retrieve configuration from local storage or ENV
    const [config, setConfig] = useState({
        apiUrl: localStorage.getItem('evolution_api_url') || import.meta.env.VITE_EVOLUTION_API_URL || '',
        apiKey: localStorage.getItem('evolution_api_key') || import.meta.env.VITE_EVOLUTION_API_KEY || '',
        instanceName: localStorage.getItem('evolution_instance_name') || 'gos_sales_instance',
    });

    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatMessages, setSelectedChatMessages] = useState<MessageLine[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Save config
    const updateConfig = (apiUrl: string, apiKey: string, instanceName: string) => {
        localStorage.setItem('evolution_api_url', apiUrl);
        localStorage.setItem('evolution_api_key', apiKey);
        localStorage.setItem('evolution_instance_name', instanceName);
        setConfig({ apiUrl, apiKey, instanceName });
    };

    const getHeaders = () => ({
        headers: {
            apikey: config.apiKey,
            'Content-Type': 'application/json',
        }
    });

    const checkConnectionState = async () => {
        if (!config.apiUrl || !config.apiKey) return;
        try {
            const response = await axios.get(
                `${config.apiUrl}/instance/connectionState/${config.instanceName}`,
                getHeaders()
            );
            const state = response.data?.instance?.state || response.data?.state;

            if (state === 'open') {
                setConnected(true);
                setQrCodeBase64(null);
                setConnecting(false);
                fetchChats();
                return true;
            } else if (state === 'connecting') {
                setConnecting(true);
            } else {
                setConnected(false);
            }
            return false;
        } catch (err: any) {
            // Ignore 404s (instance not found)
            if (err.response?.status !== 404) {
                console.error("Error checking state:", err);
            }
            setConnected(false);
            return false;
        }
    };

    const connect = async () => {
        if (!config.apiUrl || !config.apiKey) {
            setError("Por favor, configure a URL e API Key da Evolution API.");
            return;
        }
        setError(null);
        setConnecting(true);

        try {
            // Check state first
            const isOpen = await checkConnectionState();
            if (isOpen) return;

            // Create instance (if it doesn't exist)
            try {
                const createRes = await axios.post(
                    `${config.apiUrl}/instance/create`,
                    {
                        instanceName: config.instanceName,
                        qrcode: true,
                    },
                    getHeaders()
                );

                if (createRes.data?.qrcode?.base64) {
                    setQrCodeBase64(createRes.data.qrcode.base64);
                } else if (createRes.data?.hash) {
                    // Try fetch base64 using connect endpoint as fallback
                    const connectRes = await axios.get(`${config.apiUrl}/instance/connect/${config.instanceName}`, getHeaders());
                    if (connectRes.data?.base64) setQrCodeBase64(connectRes.data.base64);
                }
            } catch (createErr: any) {
                // If instance already exists, just trigger connect
                if (createErr.response?.data?.error?.includes('already exists') || createErr.response?.status === 400 || createErr.response?.status === 403) {
                    const connectRes = await axios.get(`${config.apiUrl}/instance/connect/${config.instanceName}`, getHeaders());
                    if (connectRes.data?.base64) {
                        setQrCodeBase64(connectRes.data.base64);
                    }
                } else {
                    throw createErr;
                }
            }

            // Start polling for connection state
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(async () => {
                const connectedNow = await checkConnectionState();
                if (connectedNow) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                }
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.response?.message || err.message || "Erro ao conectar. Verifique as credenciais.");
            setConnecting(false);
        }
    };

    const logout = async () => {
        if (!config.apiUrl || !config.apiKey) return;
        try {
            await axios.delete(`${config.apiUrl}/instance/logout/${config.instanceName}`, getHeaders());
            setConnected(false);
            setChats([]);
            setQrCodeBase64(null);
        } catch (err) {
            console.error("Logout error", err);
        }
    };

    const fetchChats = async () => {
        if (!config.apiUrl || !config.apiKey || !connected) return;
        setIsLoadingChats(true);
        try {
            const response = await axios.get(`${config.apiUrl}/chat/findChats/${config.instanceName}`, getHeaders());
            const realChats = response.data;

            // Transform Evolution API chats to our UI format
            if (Array.isArray(realChats)) {
                const transformedChats: Chat[] = realChats
                    .filter(c => !c.id.includes('@g.us')) // Ignore groups for this inbox by default
                    .map(c => {
                        const lastMsgTime = new Date(c.timestamp ? c.timestamp * 1000 : Date.now());

                        return {
                            id: c.id,
                            name: c.name || c.id.split('@')[0],
                            unreadCount: c.unreadCount || 0,
                            profilePicUrl: c.profilePictureUrl || undefined,
                            lastMessage: {
                                text: "Mensagem recebida", // Note: Evolution's findChats doesn't always bring the last snippet easily
                                time: lastMsgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                isMe: false,
                            },
                            // Mock CRM data placeholders
                            status: Math.random() > 0.5 ? "Quente" : "Morno",
                            term: Math.random() > 0.5 ? "Negociação" : "Prospecção",
                            score: Math.floor(Math.random() * 40) + 60,
                            phone: `+${c.id.split('@')[0]}`,
                        };
                    });

                setChats(transformedChats);
            }
        } catch (err) {
            console.error("Fetch chats error", err);
        } finally {
            setIsLoadingChats(false);
        }
    };

    const fetchMessages = async (chatId: string) => {
        if (!config.apiUrl || !config.apiKey || !connected) return;
        try {
            // Find messages for this contact. Usually POST /chat/findMessages/{instanceName}
            const response = await axios.post(`${config.apiUrl}/chat/findMessages/${config.instanceName}`, {
                where: {
                    key: {
                        remoteJid: chatId
                    }
                },
                "options": {
                    "limit": 50,
                    "orderBy": { "messageTimestamp": "asc" }
                }
            }, getHeaders());

            if (response.data && response.data.records) {
                const sorted = response.data.records;
                const formattedMessages: MessageLine[] = sorted.map((msg: any) => {
                    let textMsg = "";
                    if (msg.message?.conversation) textMsg = msg.message.conversation;
                    else if (msg.message?.extendedTextMessage?.text) textMsg = msg.message.extendedTextMessage.text;
                    else if (msg.message?.imageMessage) textMsg = "📷 Imagem";
                    else if (msg.message?.audioMessage) textMsg = "🎤 Áudio";
                    else if (msg.message?.videoMessage) textMsg = "🎥 Vídeo";
                    else textMsg = "Mensagem não suportada";

                    const msgDate = new Date(msg.messageTimestamp * 1000);
                    return {
                        id: msg.key.id,
                        text: textMsg,
                        sender: msg.key.fromMe ? 'me' : 'lead',
                        time: msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                });
                setSelectedChatMessages(formattedMessages);
            } else if (response.data && Array.isArray(response.data)) {
                // alternative payload structure mapping
                const formattedMessages = response.data.map(msg => ({
                    id: msg.key?.id || Math.random().toString(),
                    text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || "Mensagem",
                    sender: msg.key?.fromMe ? 'me' as const : 'lead' as const,
                    time: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Agora"
                }));
                setSelectedChatMessages(formattedMessages);
            }

        } catch (err) {
            console.error("Fetch messages error", err);
            // Optionally set empty or mock if fails to keep the UI working
        }
    };

    const sendMessage = async (chatId: string, text: string) => {
        if (!config.apiUrl || !config.apiKey || !connected) return;

        // Optimistic UI update
        const optimisticMsg: MessageLine = {
            id: `temp_${Date.now()}`,
            text,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSelectedChatMessages(prev => [...prev, optimisticMsg]);

        try {
            await axios.post(`${config.apiUrl}/message/sendText/${config.instanceName}`, {
                number: chatId,
                text: text
            }, getHeaders());
        } catch (err) {
            console.error("Error sending message", err);
            // If failed, could remove the optimistic update or mark as failed
            setSelectedChatMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setError("Falha ao enviar mensagem.");
        }
    };

    useEffect(() => {
        checkConnectionState();
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [config.apiUrl, config.apiKey, config.instanceName]);

    return {
        config,
        updateConfig,
        connecting,
        connected,
        qrCodeBase64,
        error,
        connect,
        logout,
        chats,
        selectedChatMessages,
        isLoadingChats,
        fetchMessages,
        sendMessage,
        fetchChats
    };
};
