import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Calendar,
    Check,
    CheckCheck,
    CheckCircle2,
    FileText,
    Loader2,
    Mic,
    Paperclip,
    RefreshCw,
    UserCheck,
    X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TemplatePicker } from "@/components/whatsapp/TemplatePicker";
import { EvaNode } from "@/components/landing/EvaNode";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioMessagePlayer } from "@/components/whatsapp/AudioMessagePlayer";
import { MediaMessageBubble } from "@/components/whatsapp/MediaMessageBubble";
import { AudioRecorder } from "@/components/whatsapp/AudioRecorder";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import type { Chat, MessageLine } from "@/hooks/useEvolutionAPI";
import { useProfilePic } from "@/hooks/useProfilePic";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// InboxConversation (F4C.2, 2026-05-19)
//
// Coluna central da Inbox Comercial. Renderiza:
//  - Empty state premium quando sem chat selecionado
//  - Header comercial com origem/status/score (mock Preview) + ações rápidas
//  - Thread de mensagens reais (text/audio/image/video) via componentes /whatsapp
//  - Sugestão EVA Preview acima do composer (mock contextual com Usar/Editar/Ignorar)
//  - Composer texto + áudio (AudioRecorder existente). Mídia placeholder até F4C.4.
//
// REGRA "EVA inside Vyzon": roxo só em selos/avatar ring. Azul Vyzon em ações
// e mensagens enviadas. Verde reservado pra status "Demo marcada"/qualificado.
// Nada se executa automaticamente — todas as ações dependem de clique do usuário.
// ─────────────────────────────────────────────────────────────────────────────

type LeadOrigin = "meta" | "google" | "instagram" | "indicacao" | "whatsapp";
type LeadStatus = "novo" | "qualificando" | "pronto" | "demo_marcada" | "parado";

const ORIGINS: LeadOrigin[] = ["meta", "google", "instagram", "indicacao", "whatsapp"];

const ORIGIN_META: Record<LeadOrigin, { label: string; color: string }> = {
    meta: { label: "Meta Ads", color: "#1877F2" },
    google: { label: "Google Ads", color: "#1D4ED8" },
    instagram: { label: "Instagram", color: "#7C3AED" },
    indicacao: { label: "Indicação", color: "#10B981" },
    whatsapp: { label: "WhatsApp", color: "#64748B" },
};

const STATUS_META: Record<LeadStatus, { label: string; bg: string; color: string }> = {
    novo: { label: "Novo", bg: "rgba(37,99,235,0.10)", color: "#1D4ED8" },
    qualificando: { label: "Qualificando", bg: "rgba(124,58,237,0.10)", color: "#6D28D9" },
    pronto: { label: "Pronto p/ humano", bg: "rgba(16,185,129,0.10)", color: "#047857" },
    demo_marcada: { label: "Demo marcada", bg: "rgba(245,158,11,0.10)", color: "#B45309" },
    parado: { label: "Parado", bg: "rgba(148,163,184,0.15)", color: "#64748B" },
};

// MOCK_F4C — Hash determinístico pra atribuir origem/status/score sem schema
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getLeadOrigin(seed: string): LeadOrigin {
    return ORIGINS[hashCode(seed) % ORIGINS.length];
}

function getLeadStatus(seed: string): LeadStatus {
    const pool: LeadStatus[] = [
        "novo", "novo", "novo",
        "qualificando", "qualificando",
        "pronto",
        "demo_marcada",
        "parado",
    ];
    return pool[hashCode(seed + "_status") % pool.length];
}

function getLeadScore(seed: string): number {
    // Score 25..95 — distribuição que parece "real" sem extremos absurdos
    return 25 + (hashCode(seed + "_score") % 71);
}

function getInitials(name: string) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(ts: string | undefined): string {
    if (!ts) return "";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// MOCK_F4C — Sugestão contextual da EVA. Pega último nome/snippet pra parecer real.
function buildEvaSuggestion(chat: Chat | null): string {
    if (!chat) return "";
    const firstName = chat.name?.split(" ")[0] || "";
    const greeting = firstName ? `${firstName}, ` : "";
    return `${greeting}posso te mostrar dois horários disponíveis para uma conversa rápida ainda essa semana?`;
}

// ─── Props ───────────────────────────────────────────────────────────────

interface InboxConversationProps {
    chat: Chat | null;
    messages: MessageLine[];
    onSendText: (chatId: string, text: string) => Promise<void> | void;
    onSendAudio?: (chatId: string, base64: string) => Promise<void> | void;
    onSendMedia?: (
        chatId: string,
        base64: string,
        mimetype: string,
        opts?: { caption?: string; fileName?: string },
    ) => Promise<void> | void;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    isLoading?: boolean;
    onBack?: () => void;
    /** F4W.4.1 — Refresh manual no header da conversa (útil em mobile). */
    onRefresh?: () => void;
    isRefreshing?: boolean;
    /** Estado da sessão WhatsApp: avisa no composer se desconectado. */
    connected?: boolean;
    /** Se o status já foi checado ao menos 1x (evita falso "desconectado" no load). */
    statusChecked?: boolean;
    /** Abre o fluxo de (re)conexão do número (QR). */
    onReconnect?: () => void;
    /** Mobile: abre a EVA (bottom sheet). No desktop a EVA é a coluna direita. */
    onOpenEva?: () => void;
    /** Texto que a EVA mandou pro composer ("Usar resposta"). Quando muda pra um
     *  valor não-nulo, vai pro campo de digitação; onInjectConsumed zera depois. */
    injectText?: string | null;
    onInjectConsumed?: () => void;
}

export function InboxConversation({
    chat,
    messages,
    onSendText,
    onSendAudio,
    onSendMedia,
    getAudioMedia,
    isLoading,
    onBack,
    onRefresh,
    isRefreshing,
    connected,
    statusChecked,
    onReconnect,
    onOpenEva,
    injectText,
    onInjectConsumed,
}: InboxConversationProps) {
    if (!chat) {
        return <EmptyConversation />;
    }

    return (
        <ConversationView
            chat={chat}
            connected={connected}
            statusChecked={statusChecked}
            onReconnect={onReconnect}
            onOpenEva={onOpenEva}
            injectText={injectText}
            onInjectConsumed={onInjectConsumed}
            messages={messages}
            onSendText={onSendText}
            onSendAudio={onSendAudio}
            onSendMedia={onSendMedia}
            getAudioMedia={getAudioMedia}
            isLoading={isLoading}
            onBack={onBack}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
        />
    );
}

// ─── Empty state premium ─────────────────────────────────────────────────

function EmptyConversation() {
    return (
        <div className="flex-1 flex items-center justify-center px-6" style={{ background: "#F4F7FB" }}>
            <div className="text-center max-w-sm">
                <EvaPhotoAvatar size="md" ring="subtle" className="mx-auto mb-4" />
                <h3
                    className="text-[15px] font-semibold mb-2"
                    style={{ color: "#0B1220", letterSpacing: "-0.015em" }}
                >
                    Selecione uma conversa para começar
                </h3>
                <p className="text-[12.5px]" style={{ color: "#64748B", lineHeight: 1.6 }}>
                    A EVA pode analisar o contexto, sugerir resposta e ajudar a mover o lead pro próximo passo.
                </p>
            </div>
        </div>
    );
}

// ─── ConversationView (chat selecionado) ─────────────────────────────────

interface PendingMedia {
    file: File;
    previewUrl: string;
    kind: "image" | "video" | "document";
}

type SendMediaFn = (
    chatId: string,
    base64: string,
    mimetype: string,
    opts?: { caption?: string; fileName?: string },
) => Promise<void> | void;

interface ConversationViewProps {
    chat: Chat;
    messages: MessageLine[];
    onSendText: (chatId: string, text: string) => Promise<void> | void;
    onSendAudio?: (chatId: string, base64: string) => Promise<void> | void;
    onSendMedia?: SendMediaFn;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    isLoading?: boolean;
    onBack?: () => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    connected?: boolean;
    statusChecked?: boolean;
    onReconnect?: () => void;
    onOpenEva?: () => void;
    injectText?: string | null;
    onInjectConsumed?: () => void;
}

// INBOX.MEDIA — limites e leitura de arquivo. 16MB é o teto prático do WhatsApp
// pra mídia comum; documentos vão até 100MB mas mantemos 16MB pra não estourar
// o payload base64 do edge function.
const MEDIA_MAX_BYTES = 16 * 1024 * 1024;

function fileKind(file: File): PendingMedia["kind"] {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "document";
}

// File → base64 PURO (sem o prefixo data:...;base64,) que o Evolution espera.
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const comma = result.indexOf(",");
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(file);
    });
}

function ConversationView({
    chat,
    messages,
    onSendText,
    onSendAudio,
    onSendMedia,
    getAudioMedia,
    isLoading,
    onBack,
    onRefresh,
    isRefreshing,
    connected,
    statusChecked,
    onReconnect,
    onOpenEva,
    injectText,
    onInjectConsumed,
}: ConversationViewProps) {
    const [composer, setComposer] = useState("");
    const [sending, setSending] = useState(false);
    const [showAudio, setShowAudio] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(true);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
    const [mediaCaption, setMediaCaption] = useState("");
    const [sendingMedia, setSendingMedia] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // V1.0.1 — origin/status/score mock removidos do header (eram MOCK_F4C
    // baseados em hash determinístico do phone). Sem fonte real, esconde.
    const suggestion = buildEvaSuggestion(chat);

    // Auto-scroll pro fim quando mensagens mudam
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Quando troca de chat, reseta composer e sugestão
    useEffect(() => {
        setComposer("");
        setShowSuggestion(true);
        setShowAudio(false);
        setPendingMedia((prev) => {
            if (prev) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
        setMediaCaption("");
    }, [chat.id]);

    // "Usar resposta" da EVA: coloca o texto no composer (substitui o rascunho),
    // foca o campo e avisa o pai pra zerar. O humano revisa e envia (assistido).
    useEffect(() => {
        const t = (injectText || "").trim();
        if (!t) return;
        setComposer(t);
        onInjectConsumed?.();
        requestAnimationFrame(() => {
            const el = inputRef.current;
            if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        });
    }, [injectText, onInjectConsumed]);

    // Revoga o object URL do preview ao desmontar (evita leak de memória).
    useEffect(() => {
        return () => {
            setPendingMedia((prev) => {
                if (prev) URL.revokeObjectURL(prev.previewUrl);
                return null;
            });
        };
    }, []);

    const handleSend = useCallback(async () => {
        const text = composer.trim();
        if (!text || sending) return;
        setSending(true);
        setComposer("");
        try {
            await onSendText(chat.id, text);
        } catch {
            // Falhou o envio (o erro já foi mostrado lá em cima): devolve o texto
            // pro composer pra o usuário não perder o que escreveu.
            setComposer((cur) => (cur ? cur : text));
        } finally {
            setSending(false);
        }
    }, [composer, sending, chat.id, onSendText]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAudioSend = useCallback(async (base64: string) => {
        if (!onSendAudio || !chat.id) {
            setShowAudio(false);
            return;
        }
        setShowAudio(false);
        try {
            await onSendAudio(chat.id, base64);
        } catch (err) {
            console.error("[InboxConversation] audio send error:", err);
        }
    }, [onSendAudio, chat.id]);

    // INBOX.MEDIA — seleção de arquivo → preview (estilo WhatsApp).
    const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // permite re-selecionar o mesmo arquivo depois
        if (!file) return;
        if (file.size > MEDIA_MAX_BYTES) {
            console.warn("[InboxConversation] arquivo acima do limite de 16MB");
            return;
        }
        setPendingMedia((prev) => {
            if (prev) URL.revokeObjectURL(prev.previewUrl);
            return { file, previewUrl: URL.createObjectURL(file), kind: fileKind(file) };
        });
        setMediaCaption("");
    }, []);

    const handleMediaCancel = useCallback(() => {
        setPendingMedia((prev) => {
            if (prev) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
        setMediaCaption("");
    }, []);

    const handleMediaSend = useCallback(async () => {
        if (!pendingMedia || !onSendMedia || sendingMedia) return;
        setSendingMedia(true);
        try {
            const base64 = await fileToBase64(pendingMedia.file);
            await onSendMedia(chat.id, base64, pendingMedia.file.type || "application/octet-stream", {
                caption: mediaCaption.trim() || undefined,
                fileName: pendingMedia.file.name,
            });
            handleMediaCancel();
        } catch (err) {
            console.error("[InboxConversation] media send error:", err);
        } finally {
            setSendingMedia(false);
        }
    }, [pendingMedia, onSendMedia, sendingMedia, chat.id, mediaCaption, handleMediaCancel]);

    const handleUseSuggestion = () => {
        setComposer(suggestion);
        setShowSuggestion(false);
        inputRef.current?.focus();
    };

    const handleEditSuggestion = () => {
        setComposer(suggestion);
        setShowSuggestion(false);
        inputRef.current?.focus();
    };

    const handleIgnoreSuggestion = () => {
        setShowSuggestion(false);
    };

    return (
        <>
            <ConversationHeader
                chat={chat}
                onBack={onBack}
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
                onOpenEva={onOpenEva}
            />

            <MessageThread
                messages={messages}
                isLoading={isLoading}
                scrollRef={scrollRef}
                getAudioMedia={getAudioMedia}
            />

            {/* V1.0.1 — EvaSuggestionBox removido (sugestão era mock determinístico
                do nome do contato, não da IA). A análise real da EVA já vive no
                EvaPanel à direita via useEvaInsight. */}

            {/* INBOX.MEDIA — input escondido, sempre montado */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={handleFilePick}
            />

            {/* Aviso: WhatsApp desconectado — o envio vai falhar até reconectar.
                Só aparece depois do 1º check de status (evita flash no load). */}
            {statusChecked && connected === false && (
                <div
                    className="flex items-center gap-2 px-4 py-2 text-[12.5px]"
                    style={{ borderTop: "1px solid #FCD9B6", background: "#FFF7ED", color: "#9A3412" }}
                >
                    <span
                        style={{ width: 7, height: 7, borderRadius: 999, background: "#EA580C", flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                        WhatsApp desconectado. As mensagens não serão entregues até reconectar o número.
                    </span>
                    {onReconnect && (
                        <button
                            type="button"
                            onClick={onReconnect}
                            className="font-semibold rounded-full px-3 py-1 shrink-0"
                            style={{ background: "#080808", color: "#fff" }}
                        >
                            Reconectar
                        </button>
                    )}
                </div>
            )}

            {/* Composer */}
            {pendingMedia ? (
                <MediaPreviewBar
                    media={pendingMedia}
                    caption={mediaCaption}
                    onCaptionChange={setMediaCaption}
                    onSend={handleMediaSend}
                    onCancel={handleMediaCancel}
                    sending={sendingMedia}
                />
            ) : showAudio ? (
                <div
                    className="px-4 py-3"
                    style={{
                        borderTop: "1px solid #D9E2EC",
                        background: "#FFFFFF",
                    }}
                >
                    <AudioRecorder
                        onSend={handleAudioSend}
                        onCancel={() => setShowAudio(false)}
                    />
                </div>
            ) : (
                <Composer
                    inputRef={inputRef}
                    value={composer}
                    onChange={setComposer}
                    onSend={handleSend}
                    onKeyDown={handleKeyDown}
                    onOpenAudio={() => setShowAudio(true)}
                    onAttach={onSendMedia ? () => fileInputRef.current?.click() : undefined}
                    sending={sending}
                    canSendAudio={!!onSendAudio}
                    contactName={chat.name}
                    contactPhone={chat.phone}
                />
            )}
        </>
    );
}

// ─── Header comercial ────────────────────────────────────────────────────

function ConversationHeader({
    chat,
    onBack,
    onRefresh,
    isRefreshing,
    onOpenEva,
}: {
    chat: Chat;
    onBack?: () => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    onOpenEva?: () => void;
}) {
    const picUrl = useProfilePic(chat.phone, chat.profilePicUrl);
    return (
        <div
            className="px-4 sm:px-5 py-3.5 flex items-center gap-3"
            style={{
                borderBottom: "1px solid #D9E2EC",
                background: "#FFFFFF",
            }}
        >
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="h-8 w-8 -ml-1 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] transition-colors shrink-0"
                    aria-label="Voltar"
                >
                    <ArrowLeft className="h-4 w-4" style={{ color: "#475569" }} />
                </button>
            )}

            <Avatar className="h-10 w-10 shrink-0">
                {picUrl && <AvatarImage src={picUrl} alt={chat.name} />}
                <AvatarFallback
                    className="text-[12px] font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                >
                    {getInitials(chat.name)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                        className="text-[14px] font-semibold truncate"
                        style={{ color: "#0B1220" }}
                    >
                        {chat.name || chat.phone || "Sem nome"}
                    </span>
                    {chat.phone && (
                        <span
                            className="text-[11px] tabular-nums"
                            style={{ color: "#94A3B8" }}
                        >
                            · {chat.phone}
                        </span>
                    )}
                </div>
                {/* V1.0.1 — origem/status/score mock removidos. Apenas canal. */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                        className="inline-flex items-center gap-1 text-[10.5px]"
                        style={{ color: "#64748B" }}
                    >
                        <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: "#10B981" }}
                        />
                        WhatsApp
                    </span>
                </div>
            </div>

            {/* V1.0.1 — HeaderActions removidas (Assumir/Marcar demo/Mover p/
                pipeline eram botões mock que não tinham handler real). */}

            {/* Refresh (sempre visível) — F4W.4.1 */}
            {onRefresh && (
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Atualizar histórico"
                    title="Atualizar histórico"
                >
                    <RefreshCw
                        className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                        style={{ color: "#475569" }}
                    />
                </button>
            )}

            {/* EVA — mobile: no celular a EVA não tem coluna própria, então o
                acesso à análise dela vive aqui (abre o bottom sheet). */}
            {onOpenEva && (
                <button
                    type="button"
                    onClick={onOpenEva}
                    className="md:hidden h-8 pl-1.5 pr-2.5 rounded-full flex items-center gap-1.5 shrink-0 transition-colors"
                    style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.18)" }}
                    aria-label="Abrir análise da EVA"
                    title="Análise da EVA"
                >
                    <EvaNode size={14} color="#6D28D9" />
                    <span className="text-[12px] font-semibold" style={{ color: "#6D28D9" }}>EVA</span>
                </button>
            )}
        </div>
    );
}

function HeaderAction({ icon: Icon, label }: { icon: typeof UserCheck; label: string }) {
    return (
        <button
            type="button"
            title={`${label} · Preview`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] transition-colors"
            style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                color: "#475569",
                fontWeight: 500,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(37,99,235,0.06)";
                e.currentTarget.style.borderColor = "rgba(37,99,235,0.22)";
                e.currentTarget.style.color = "#1D4ED8";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F8FAFC";
                e.currentTarget.style.borderColor = "#E2E8F0";
                e.currentTarget.style.color = "#475569";
            }}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}

// ─── Thread de mensagens ─────────────────────────────────────────────────

function MessageThread({
    messages,
    isLoading,
    scrollRef,
    getAudioMedia,
}: {
    messages: MessageLine[];
    isLoading?: boolean;
    scrollRef: React.RefObject<HTMLDivElement>;
    getAudioMedia: (messageId: string) => Promise<string | null>;
}) {
    if (isLoading && messages.length === 0) {
        return (
            <div
                className="flex-1 flex items-center justify-center"
                style={{ background: "#F4F7FB" }}
            >
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#2563EB" }} />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div
                className="flex-1 flex items-center justify-center px-6"
                style={{ background: "#F4F7FB" }}
            >
                <p className="text-[12.5px] text-center" style={{ color: "#94A3B8" }}>
                    Sem mensagens ainda nesta conversa.
                </p>
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 sm:px-5 py-4"
            style={{ background: "#F4F7FB" }}
        >
            {/* F4C.3: limita largura interna da thread pra leitura confortável em ultrawide. */}
            <div className="max-w-[720px] mx-auto">
                {(() => {
                    // INBOX.UX — separadores de dia + agrupamento de bolhas do mesmo
                    // remetente em janela curta (estilo WhatsApp). Tudo derivado do
                    // próprio array (sem estado), barato.
                    const items: React.ReactNode[] = [];
                    let lastDay = "";
                    messages.forEach((msg, i) => {
                        const day = new Date(msg.timestamp * 1000).toDateString();
                        if (day !== lastDay) {
                            items.push(<DayDivider key={`day-${day}`} timestamp={msg.timestamp} />);
                            lastDay = day;
                        }
                        const prev = messages[i - 1];
                        const grouped =
                            !!prev &&
                            prev.sender === msg.sender &&
                            new Date(prev.timestamp * 1000).toDateString() === day &&
                            msg.timestamp - prev.timestamp < 120; // 2 min
                        items.push(
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                grouped={grouped}
                                getAudioMedia={getAudioMedia}
                            />,
                        );
                    });
                    return items;
                })()}
            </div>
        </div>
    );
}

// Separador de dia — pílula central (Hoje / Ontem / data).
function DayDivider({ timestamp }: { timestamp: number }) {
    const d = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const label = sameDay(d, today)
        ? "Hoje"
        : sameDay(d, yesterday)
        ? "Ontem"
        : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
    return (
        <div className="flex justify-center my-3">
            <span
                className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#E8EEF6", color: "#64748B", letterSpacing: "0.02em" }}
            >
                {label}
            </span>
        </div>
    );
}

// INBOX.PERF.1 — memoizado. A thread re-renderiza a cada tick de status/insert;
// sem memo, as 200 bolhas recalculam todas. O comparador olha só os campos que
// mudam a renderização da bolha e ignora a identidade de getAudioMedia (a
// função é estável em comportamento; comparar por identidade reabriria a cascata).
const MessageBubble = memo(function MessageBubble({
    message,
    grouped = false,
    getAudioMedia,
}: {
    message: MessageLine;
    grouped?: boolean;
    getAudioMedia: (messageId: string) => Promise<string | null>;
}) {
    const isMe = message.sender === "me";
    const isPending = message.pending === true;
    const hasMedia = message.mediaType === "image" || message.mediaType === "video" || message.mediaType === "sticker";
    const hasAudio = message.mediaType === "audio" || !!message.audioUrl;

    // Agrupamento estilo WhatsApp: bolhas consecutivas do mesmo remetente ficam
    // mais juntas e o "rabinho" (canto reto) só aparece na primeira do grupo.
    const tail = isMe
        ? { borderTopRightRadius: grouped ? 8 : 16, borderBottomRightRadius: 6 }
        : { borderTopLeftRadius: grouped ? 8 : 16, borderBottomLeftRadius: 6 };

    return (
        <div className={cn("flex", grouped ? "mt-0.5" : "mt-2.5", isMe ? "justify-end" : "justify-start")}>
            <div
                className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5"
                style={
                    isMe
                        ? {
                              background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                              color: "#FFFFFF",
                              ...tail,
                              boxShadow: "0 1px 2px rgba(37,99,235,0.18), 0 4px 12px -4px rgba(37,99,235,0.18)",
                              opacity: isPending ? 0.7 : 1,
                          }
                        : {
                              background: "#FFFFFF",
                              color: "#0B1220",
                              border: "1px solid #E2E8F0",
                              ...tail,
                              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                          }
                }
            >
                {hasMedia && (
                    <div className={message.text || message.mediaCaption ? "mb-1.5" : ""}>
                        <MediaMessageBubble
                            messageId={message.id}
                            mediaType={message.mediaType as "image" | "video" | "sticker"}
                            caption={undefined}
                            isMe={isMe}
                            getAudioMedia={getAudioMedia}
                        />
                    </div>
                )}

                {hasAudio && (
                    <div className={message.text ? "mb-1.5" : ""}>
                        <AudioMessagePlayer
                            messageId={message.id}
                            audioUrl={message.audioUrl}
                            duration={message.audioDuration}
                            isMe={isMe}
                            getAudioMedia={getAudioMedia}
                        />
                    </div>
                )}

                {message.text && (
                    <p
                        className="text-[13.5px] leading-snug whitespace-pre-wrap break-words"
                        style={{ color: isMe ? "#FFFFFF" : "#0B1220" }}
                    >
                        {message.text}
                    </p>
                )}

                {message.mediaCaption && !message.text && (
                    <p
                        className="text-[13.5px] leading-snug whitespace-pre-wrap break-words"
                        style={{ color: isMe ? "#FFFFFF" : "#0B1220" }}
                    >
                        {message.mediaCaption}
                    </p>
                )}

                <p
                    className="text-[10.5px] mt-1 tabular-nums flex items-center justify-end gap-0.5"
                    style={{ color: isMe ? "rgba(255,255,255,0.7)" : "#94A3B8" }}
                >
                    <span>{isPending ? "Enviando…" : formatTime(message.time)}</span>
                    {/* INBOX.STATUS — checks de entrega/leitura (só nas mensagens enviadas) */}
                    {isMe && !isPending && message.status && message.status !== "received" && message.status !== "queued" && (
                        message.status === "failed" ? (
                            <span title="Falha no envio" style={{ color: "#FCA5A5", fontWeight: 700 }}>!</span>
                        ) : message.status === "sent" ? (
                            <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.7)" }} />
                        ) : (
                            <CheckCheck
                                className="h-3 w-3"
                                strokeWidth={2.5}
                                style={{ color: message.status === "read" ? "#7DD3FC" : "rgba(255,255,255,0.7)" }}
                            />
                        )
                    )}
                </p>
            </div>
        </div>
    );
}, (prev, next) => {
    const a = prev.message;
    const b = next.message;
    // Re-renderiza só quando algo visível muda. getAudioMedia é ignorado de
    // propósito (estável em comportamento).
    return (
        prev.grouped === next.grouped &&
        a.id === b.id &&
        a.status === b.status &&
        a.text === b.text &&
        a.pending === b.pending &&
        a.time === b.time &&
        a.mediaType === b.mediaType &&
        a.audioUrl === b.audioUrl &&
        a.mediaCaption === b.mediaCaption
    );
});

// ─── Sugestão EVA Preview ────────────────────────────────────────────────

function EvaSuggestionBox({
    suggestion,
    onUse,
    onEdit,
    onIgnore,
}: {
    suggestion: string;
    onUse: () => void;
    onEdit: () => void;
    onIgnore: () => void;
}) {
    return (
        <div
            className="px-3 sm:px-5 pt-3 pb-1"
            style={{ background: "#F4F7FB" }}
        >
            <div className="max-w-[720px] mx-auto">
            <div
                className="rounded-xl px-4 py-3 flex items-start gap-3 relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.05), rgba(255,255,255,0.6))",
                    border: "1px solid rgba(124,58,237,0.22)",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px -4px rgba(124,58,237,0.08)",
                }}
            >
                <EvaPhotoAvatar size="xs" ring="subtle" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span
                            className="text-[10.5px] uppercase"
                            style={{
                                color: "#6D28D9",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                            }}
                        >
                            Sugestão EVA
                        </span>
                        <span
                            className="text-[9px] uppercase px-1.5 py-0.5 rounded"
                            style={{
                                background: "rgba(124,58,237,0.10)",
                                color: "#6D28D9",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                            }}
                        >
                            <EvaNode size={10} color="#6D28D9" className="inline -mt-px mr-0.5" />
                            Preview
                        </span>
                    </div>
                    <p
                        className="text-[12.5px] leading-snug mb-2"
                        style={{ color: "#0B1220" }}
                    >
                        {suggestion}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            type="button"
                            onClick={onUse}
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11.5px] font-semibold text-white transition-all hover:brightness-110"
                            style={{
                                background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                                boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
                            }}
                        >
                            Usar resposta
                            <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex items-center h-7 px-3 rounded-md text-[11.5px] font-medium transition-colors"
                            style={{
                                background: "transparent",
                                color: "#475569",
                                border: "1px solid #E2E8F0",
                            }}
                        >
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={onIgnore}
                            className="inline-flex items-center h-7 px-2.5 rounded-md text-[11.5px] font-medium transition-colors"
                            style={{
                                background: "transparent",
                                color: "#94A3B8",
                            }}
                            title="Esconder sugestão"
                        >
                            Ignorar
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}

// ─── Media preview (estilo WhatsApp: prévia + legenda antes de enviar) ──────

function MediaPreviewBar({
    media,
    caption,
    onCaptionChange,
    onSend,
    onCancel,
    sending,
}: {
    media: PendingMedia;
    caption: string;
    onCaptionChange: (v: string) => void;
    onSend: () => void;
    onCancel: () => void;
    sending: boolean;
}) {
    const sizeKb = media.file.size / 1024;
    const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
    return (
        <div className="px-3 sm:px-5 py-3" style={{ borderTop: "1px solid #D9E2EC", background: "#FFFFFF" }}>
            <div className="max-w-[720px] mx-auto">
                <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "#F4F7FB", border: "1px solid #D9E2EC" }}>
                    {/* Prévia */}
                    <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 72, height: 72, background: "#E2E8F0" }}>
                        {media.kind === "image" ? (
                            <img src={media.previewUrl} alt={media.file.name} className="w-full h-full object-cover" />
                        ) : media.kind === "video" ? (
                            <video src={media.previewUrl} className="w-full h-full object-cover" muted />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <FileText className="h-7 w-7" style={{ color: "#64748B" }} />
                            </div>
                        )}
                    </div>

                    {/* Legenda + meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[12px] font-semibold truncate" style={{ color: "#0B1220" }}>
                                {media.file.name}
                            </p>
                            <span className="text-[10.5px] tabular-nums shrink-0" style={{ color: "#94A3B8" }}>
                                {sizeLabel}
                            </span>
                        </div>
                        <input
                            value={caption}
                            onChange={(e) => onCaptionChange(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
                            placeholder="Adicione uma legenda…"
                            autoFocus
                            className="w-full bg-white outline-none text-[13px] px-2.5 py-2 rounded-lg"
                            style={{ color: "#0B1220", border: "1px solid #D9E2EC" }}
                        />
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={onSend}
                            disabled={sending}
                            aria-label="Enviar mídia"
                            className="h-9 w-9 rounded-full flex items-center justify-center text-white transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)", boxShadow: "0 4px 12px -4px rgba(37,99,235,0.4)" }}
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.6} />}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={sending}
                            aria-label="Cancelar"
                            className="h-9 w-9 rounded-full flex items-center justify-center transition-colors hover:bg-white disabled:opacity-50"
                            style={{ color: "#64748B", border: "1px solid #D9E2EC" }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Composer ────────────────────────────────────────────────────────────

interface ComposerProps {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onOpenAudio: () => void;
    onAttach?: () => void;
    sending: boolean;
    canSendAudio: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement>;
    contactName?: string;
    contactPhone?: string;
}

function Composer({
    value,
    onChange,
    onSend,
    onKeyDown,
    onOpenAudio,
    onAttach,
    sending,
    canSendAudio,
    inputRef,
    contactName,
    contactPhone,
}: ComposerProps) {
    const { user, companyId } = useAuth();
    const [showTemplates, setShowTemplates] = useState(false);

    // Auto-cresce com o conteúdo (digitado OU injetado pela "Usar resposta" da
    // EVA), até um teto (~128px). Sem isto, texto longo virava uma caixa de 1
    // linha com scrollbar (as setas ▲▼). Só mostra scroll quando passa do teto.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
        el.style.overflowY = el.scrollHeight > 128 ? "auto" : "hidden";
    }, [value, inputRef]);

    // Insere o template no composer (anexa se já houver texto) e foca o input.
    const handleInsertTemplate = (text: string) => {
        onChange(value.trim() ? `${value.trim()} ${text}` : text);
        setShowTemplates(false);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    return (
        <div
            className="px-3 sm:px-5 py-3"
            style={{
                borderTop: "1px solid #D9E2EC",
                background: "#FFFFFF",
            }}
        >
            <div className="max-w-[720px] mx-auto">
            {showTemplates && (
                <TemplatePicker
                    companyId={companyId}
                    userId={user?.id}
                    onSelect={handleInsertTemplate}
                    onClose={() => setShowTemplates(false)}
                    contactName={contactName}
                    contactPhone={contactPhone}
                />
            )}
            <div
                className="flex items-end gap-2 rounded-xl px-2 py-2"
                style={{
                    background: "#F4F7FB",
                    border: "1px solid #D9E2EC",
                }}
            >
                <button
                    type="button"
                    onClick={onAttach}
                    disabled={!onAttach}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors shrink-0 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: "#64748B" }}
                    title={onAttach ? "Anexar imagem, vídeo ou documento" : "Anexo indisponível"}
                    aria-label="Anexar mídia"
                >
                    <Paperclip className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={() => setShowTemplates((v) => !v)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors shrink-0 hover:bg-white"
                    style={{ color: showTemplates ? "#2563EB" : "#94A3B8" }}
                    title="Templates de mensagem"
                    aria-label="Templates de mensagem"
                >
                    <FileText className="h-4 w-4" />
                </button>

                <textarea
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Responder como humano…"
                    rows={1}
                    className="flex-1 bg-transparent outline-none text-[13.5px] py-1.5 px-1 resize-none max-h-32"
                    style={{ color: "#0B1220", lineHeight: 1.45 }}
                />

                {canSendAudio && (
                    <button
                        type="button"
                        onClick={onOpenAudio}
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors shrink-0 hover:bg-white"
                        style={{ color: "#64748B" }}
                        title="Gravar áudio"
                        aria-label="Gravar áudio"
                    >
                        <Mic className="h-4 w-4" />
                    </button>
                )}

                {/* Enviar = seta-pra-cima circular (brand Vyzon, estilo Claude) */}
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!value.trim() || sending}
                    aria-label={sending ? "Enviando mensagem" : "Enviar mensagem"}
                    title="Enviar"
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    style={{
                        background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                        boxShadow: "0 4px 12px -4px rgba(37,99,235,0.4)",
                    }}
                >
                    {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
                    )}
                </button>
            </div>
            <p className="text-[10px] mt-1.5 px-2" style={{ color: "#94A3B8" }}>
                <kbd className="px-1 rounded" style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>Enter</kbd> envia ·{" "}
                <kbd className="px-1 rounded" style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>Shift+Enter</kbd> nova linha
            </p>
            </div>
        </div>
    );
};
