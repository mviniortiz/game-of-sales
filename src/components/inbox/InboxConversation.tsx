import { useState, useRef, useEffect, useCallback } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Loader2,
    Mic,
    MoreHorizontal,
    Paperclip,
    RefreshCw,
    Send,
    Sparkles,
    UserCheck,
    X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioMessagePlayer } from "@/components/whatsapp/AudioMessagePlayer";
import { MediaMessageBubble } from "@/components/whatsapp/MediaMessageBubble";
import { AudioRecorder } from "@/components/whatsapp/AudioRecorder";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import type { Chat, MessageLine } from "@/hooks/useEvolutionAPI";
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
    getAudioMedia: (messageId: string) => Promise<string | null>;
    isLoading?: boolean;
    onBack?: () => void;
    /** F4W.4.1 — Refresh manual no header da conversa (útil em mobile). */
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function InboxConversation({
    chat,
    messages,
    onSendText,
    onSendAudio,
    getAudioMedia,
    isLoading,
    onBack,
    onRefresh,
    isRefreshing,
}: InboxConversationProps) {
    if (!chat) {
        return <EmptyConversation />;
    }

    return (
        <ConversationView
            chat={chat}
            messages={messages}
            onSendText={onSendText}
            onSendAudio={onSendAudio}
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

interface ConversationViewProps {
    chat: Chat;
    messages: MessageLine[];
    onSendText: (chatId: string, text: string) => Promise<void> | void;
    onSendAudio?: (chatId: string, base64: string) => Promise<void> | void;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    isLoading?: boolean;
    onBack?: () => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

function ConversationView({
    chat,
    messages,
    onSendText,
    onSendAudio,
    getAudioMedia,
    isLoading,
    onBack,
    onRefresh,
    isRefreshing,
}: ConversationViewProps) {
    const [composer, setComposer] = useState("");
    const [sending, setSending] = useState(false);
    const [showAudio, setShowAudio] = useState(false);
    const [showSuggestion, setShowSuggestion] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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
    }, [chat.id]);

    const handleSend = useCallback(async () => {
        const text = composer.trim();
        if (!text || sending) return;
        setSending(true);
        setComposer("");
        try {
            await onSendText(chat.id, text);
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

            {/* Composer */}
            {showAudio ? (
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
                    sending={sending}
                    canSendAudio={!!onSendAudio}
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
}: {
    chat: Chat;
    onBack?: () => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}) {
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
                {chat.profilePicUrl && <AvatarImage src={chat.profilePicUrl} alt={chat.name} />}
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

            {/* Ações rápidas — mobile (menu compacto) */}
            <button
                type="button"
                className="md:hidden h-8 w-8 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] transition-colors shrink-0"
                aria-label="Mais ações"
                title="Mais ações (Preview)"
            >
                <MoreHorizontal className="h-4 w-4" style={{ color: "#475569" }} />
            </button>
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
            {/* F4C.3: limita largura interna da thread pra leitura confortável em ultrawide.
                Coluna central inteira continua flex-1 — só o conteúdo afina. */}
            <div className="max-w-[720px] mx-auto space-y-2.5">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} getAudioMedia={getAudioMedia} />
                ))}
            </div>
        </div>
    );
}

function MessageBubble({
    message,
    getAudioMedia,
}: {
    message: MessageLine;
    getAudioMedia: (messageId: string) => Promise<string | null>;
}) {
    const isMe = message.sender === "me";
    const isPending = message.pending === true;
    const hasMedia = message.mediaType === "image" || message.mediaType === "video" || message.mediaType === "sticker";
    const hasAudio = message.mediaType === "audio" || !!message.audioUrl;

    return (
        <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
            <div
                className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5"
                style={
                    isMe
                        ? {
                              background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                              color: "#FFFFFF",
                              borderBottomRightRadius: 6,
                              boxShadow: "0 1px 2px rgba(37,99,235,0.18), 0 4px 12px -4px rgba(37,99,235,0.18)",
                              opacity: isPending ? 0.7 : 1,
                          }
                        : {
                              background: "#FFFFFF",
                              color: "#0B1220",
                              border: "1px solid #E2E8F0",
                              borderBottomLeftRadius: 6,
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
                    className="text-[10.5px] mt-1 tabular-nums text-right"
                    style={{ color: isMe ? "rgba(255,255,255,0.7)" : "#94A3B8" }}
                >
                    {isPending ? "Enviando…" : formatTime(message.time)}
                </p>
            </div>
        </div>
    );
}

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
                            <Sparkles className="h-2.5 w-2.5 inline -mt-px mr-0.5" />
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

// ─── Composer ────────────────────────────────────────────────────────────

interface ComposerProps {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onOpenAudio: () => void;
    sending: boolean;
    canSendAudio: boolean;
    inputRef: React.RefObject<HTMLTextAreaElement>;
}

function Composer({
    value,
    onChange,
    onSend,
    onKeyDown,
    onOpenAudio,
    sending,
    canSendAudio,
    inputRef,
}: ComposerProps) {
    return (
        <div
            className="px-3 sm:px-5 py-3"
            style={{
                borderTop: "1px solid #D9E2EC",
                background: "#FFFFFF",
            }}
        >
            <div className="max-w-[720px] mx-auto">
            <div
                className="flex items-end gap-2 rounded-xl px-2 py-2"
                style={{
                    background: "#F4F7FB",
                    border: "1px solid #D9E2EC",
                }}
            >
                <button
                    type="button"
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors shrink-0 hover:bg-white"
                    style={{ color: "#94A3B8" }}
                    title="Anexar mídia (em breve)"
                    aria-label="Anexar mídia"
                >
                    <Paperclip className="h-4 w-4" />
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

                <button
                    type="button"
                    onClick={onSend}
                    disabled={!value.trim() || sending}
                    className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    style={{
                        background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                        boxShadow: "0 4px 12px -4px rgba(37,99,235,0.4)",
                    }}
                >
                    {sending ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Enviando
                        </>
                    ) : (
                        <>
                            <Send className="h-3.5 w-3.5" />
                            Enviar
                        </>
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
