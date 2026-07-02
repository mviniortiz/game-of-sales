import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from "react";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Check,
    CheckCheck,
    ChevronUp,
    FileText,
    Loader2,
    Mic,
    Paperclip,
    RefreshCw,
    X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TemplatePicker } from "@/components/whatsapp/TemplatePicker";
import { EvaNode } from "@/components/landing/EvaNode";
import { useEvaInsight } from "@/hooks/useEvaInsight";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioMessagePlayer } from "@/components/whatsapp/AudioMessagePlayer";
import { MediaMessageBubble } from "@/components/whatsapp/MediaMessageBubble";
import { AudioRecorder } from "@/components/whatsapp/AudioRecorder";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
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
        progress?: { onProgress?: (pct: number) => void; signal?: AbortSignal },
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
    /** Paginação: há histórico antigo pra carregar; ação que carrega a próxima página. */
    hasMoreMessages?: boolean;
    loadingOlder?: boolean;
    onLoadOlder?: () => void;
    /** TYPING — o contato desta conversa está digitando agora. */
    typing?: boolean;
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
    hasMoreMessages,
    loadingOlder,
    onLoadOlder,
    typing,
}: InboxConversationProps) {
    if (!chat) {
        return <EmptyConversation />;
    }

    return (
        <ConversationView
            chat={chat}
            typing={typing}
            connected={connected}
            statusChecked={statusChecked}
            onReconnect={onReconnect}
            onOpenEva={onOpenEva}
            injectText={injectText}
            onInjectConsumed={onInjectConsumed}
            hasMoreMessages={hasMoreMessages}
            loadingOlder={loadingOlder}
            onLoadOlder={onLoadOlder}
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
        <div className="flex-1 flex items-center justify-center px-6" style={{ background: "var(--ibx-paper)" }}>
            <div className="text-center max-w-sm">
                <EvaOrb variant="blue" state="idle" size={56} showVoice={false} className="mx-auto mb-4" />
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
    progress?: { onProgress?: (pct: number) => void; signal?: AbortSignal },
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
    hasMoreMessages?: boolean;
    loadingOlder?: boolean;
    onLoadOlder?: () => void;
    typing?: boolean;
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
    hasMoreMessages,
    loadingOlder,
    onLoadOlder,
    typing,
}: ConversationViewProps) {
    const [composer, setComposer] = useState("");
    const [sending, setSending] = useState(false);
    const [showAudio, setShowAudio] = useState(false);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
    const [mediaCaption, setMediaCaption] = useState("");
    const [sendingMedia, setSendingMedia] = useState(false);
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const uploadAbortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sugestão REAL da EVA inline na conversa (lê a análise salva; o react-query
    // compartilha o cache com o EvaPanel, sem disparar análise extra).
    const evaInsight = useEvaInsight({ chatPhone: chat.phone || chat.id, contactName: chat.name, messages });
    const evaSuggestionText: string = evaInsight.data
        ? (evaInsight.data.qualification?.resposta_sugerida || evaInsight.data.analysis?.draft || "")
        : "";
    const [suggestionDismissed, setSuggestionDismissed] = useState(false);

    // MOBILE — estado compacto da EVA pro botão do header virar um STATUS VIVO
    // (não uma pílula muda): "Lendo…", temperatura, ou "Análise pronta". É o que
    // faz o usuário perceber que ali tem algo a abrir.
    const evaHeaderState: EvaHeaderState = {
        analyzing: evaInsight.analyzing,
        hasAnalysis: evaInsight.hasAnalysis,
        temperature: evaInsight.data?.qualification?.temperatura
            ?? evaInsight.data?.analysis?.temperature
            ?? null,
        stale: evaInsight.isStaleByMessages || evaInsight.isStaleByContext,
        hasReply: !!evaSuggestionText,
    };

    // Auto-scroll pro fim SÓ quando chega mensagem nova no fim (ou troca de
    // conversa) — não ao prepender páginas antigas (paginação).
    const lastMsgIdRef = useRef<string | null>(null);
    const olderRestoreRef = useRef<{ height: number; top: number } | null>(null);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || olderRestoreRef.current != null) return;
        const lastId = messages[messages.length - 1]?.id ?? null;
        if (lastId !== lastMsgIdRef.current) {
            lastMsgIdRef.current = lastId;
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    // Preserva a posição de leitura ao carregar antigas (o conteúdo cresce no topo).
    useLayoutEffect(() => {
        const el = scrollRef.current;
        const info = olderRestoreRef.current;
        if (!el || !info) return;
        el.scrollTop = info.top + (el.scrollHeight - info.height);
        olderRestoreRef.current = null;
    }, [messages]);

    const handleLoadOlder = useCallback(() => {
        const el = scrollRef.current;
        olderRestoreRef.current = el ? { height: el.scrollHeight, top: el.scrollTop } : { height: 0, top: 0 };
        onLoadOlder?.();
    }, [onLoadOlder]);

    // Quando troca de chat, reseta composer e sugestão
    useEffect(() => {
        setComposer("");
        setShowAudio(false);
        setSuggestionDismissed(false);
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
        setUploadPct(0);
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        try {
            const base64 = await fileToBase64(pendingMedia.file);
            await onSendMedia(chat.id, base64, pendingMedia.file.type || "application/octet-stream", {
                caption: mediaCaption.trim() || undefined,
                fileName: pendingMedia.file.name,
            }, { onProgress: setUploadPct, signal: controller.signal });
            handleMediaCancel();
        } catch (err) {
            if ((err as DOMException)?.name !== "AbortError") {
                console.error("[InboxConversation] media send error:", err);
            }
        } finally {
            setSendingMedia(false);
            setUploadPct(null);
            uploadAbortRef.current = null;
        }
    }, [pendingMedia, onSendMedia, sendingMedia, chat.id, mediaCaption, handleMediaCancel]);

    // Cancela o upload em andamento (aborta o XHR). O finally limpa o estado.
    const handleUploadCancel = useCallback(() => {
        uploadAbortRef.current?.abort();
    }, []);

    return (
        <>
            <ConversationHeader
                chat={chat}
                onBack={onBack}
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
                onOpenEva={onOpenEva}
                eva={evaHeaderState}
                typing={typing}
            />

            <MessageThread
                messages={messages}
                isLoading={isLoading}
                scrollRef={scrollRef}
                getAudioMedia={getAudioMedia}
                hasMoreMessages={hasMoreMessages}
                loadingOlder={loadingOlder}
                onLoadOlder={handleLoadOlder}
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

            {/* Sugestão da EVA inline (balão no fim da conversa) — só quando há
                rascunho real e a conversa não está com mídia pendente. */}
            {evaSuggestionText && !suggestionDismissed && !pendingMedia && !showAudio && (
                <EvaInlineSuggestion
                    text={evaSuggestionText}
                    onUse={() => {
                        setComposer(evaSuggestionText);
                        setSuggestionDismissed(true);
                        requestAnimationFrame(() => {
                            const el = inputRef.current;
                            if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
                        });
                    }}
                    onDismiss={() => setSuggestionDismissed(true)}
                />
            )}

            {/* Composer */}
            {sendingMedia && pendingMedia ? (
                <UploadProgressCard
                    file={pendingMedia.file}
                    pct={uploadPct ?? 0}
                    onCancel={handleUploadCancel}
                />
            ) : pendingMedia ? (
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
                        borderTop: "1px solid var(--ibx-line)",
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

// MOBILE — sinal compacto da EVA pro botão do header. Sem coluna própria no
// celular, o botão precisa comunicar (a) que abre um painel e (b) que tem algo
// a abrir. Daí virar um status vivo em vez de uma pílula "EVA" muda.
interface EvaHeaderState {
    analyzing: boolean;
    hasAnalysis: boolean;
    temperature: "quente" | "morno" | "frio" | null;
    stale: boolean;
    hasReply: boolean;
}

const EVA_TEMP_LABEL: Record<NonNullable<EvaHeaderState["temperature"]>, string> = {
    quente: "Quente",
    morno: "Morno",
    frio: "Frio",
};
// Alinhado à paleta de risco da lista (coral/âmbar/slate).
const EVA_TEMP_COLOR: Record<NonNullable<EvaHeaderState["temperature"]>, string> = {
    quente: "#d85a30",
    morno: "#d97706",
    frio: "#64748b",
};

const EVA_HINT_KEY = "vyz_eva_mobile_hint_seen";

// Botão de acesso à EVA no header (só mobile). Status vivo + caret pra cima
// (afford de "abre um painel de baixo") + coachmark de 1ª vez explicando.
function EvaHeaderButton({ eva, onOpenEva }: { eva?: EvaHeaderState; onOpenEva: () => void }) {
    const [showHint, setShowHint] = useState(false);

    // Coachmark único: na 1ª vez que o usuário cai numa conversa no mobile,
    // aponta o botão e explica que ali está a análise. Some pra sempre depois.
    useEffect(() => {
        if (typeof window === "undefined") return;
        let seen = false;
        try { seen = window.localStorage.getItem(EVA_HINT_KEY) === "1"; } catch { /* storage bloqueado */ }
        if (seen) return;
        const t = window.setTimeout(() => setShowHint(true), 700);
        return () => window.clearTimeout(t);
    }, []);

    const dismissHint = () => {
        setShowHint(false);
        try { window.localStorage.setItem(EVA_HINT_KEY, "1"); } catch { /* ignora */ }
    };

    const handleOpen = () => {
        if (showHint) dismissHint();
        onOpenEva();
    };

    const analyzing = !!eva?.analyzing;
    const temp = eva?.temperature ?? null;
    const hasAnalysis = !!eva?.hasAnalysis;
    const stale = !!eva?.stale;

    // Rótulo do status: lendo → temperatura → análise pronta → convite cru.
    const label = analyzing
        ? "Lendo…"
        : temp
        ? EVA_TEMP_LABEL[temp]
        : hasAnalysis
        ? "Análise"
        : "EVA";
    const labelColor = !analyzing && temp ? EVA_TEMP_COLOR[temp] : "#6D28D9";

    return (
        <div className="md:hidden relative shrink-0">
            <button
                type="button"
                onClick={handleOpen}
                className="h-8 pl-1.5 pr-2 rounded-full flex items-center gap-1.5 transition-colors"
                style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.18)" }}
                aria-label="Abrir análise da EVA"
                title="Análise da EVA"
            >
                {analyzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#6D28D9" }} />
                ) : (
                    <EvaNode size={14} color="#6D28D9" />
                )}
                {/* Ponto de temperatura: prova visual de que a EVA leu (e o quê). */}
                {!analyzing && temp && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: EVA_TEMP_COLOR[temp] }} />
                )}
                <span className="text-[12px] font-semibold" style={{ color: labelColor }}>{label}</span>
                {/* Caret pra cima = "abre um painel de baixo" (bottom sheet). */}
                <ChevronUp className="h-3 w-3" style={{ color: "#9F7AEA" }} strokeWidth={2.5} />
                {/* Selo "desatualizada" — pulso âmbar discreto sobre o botão. */}
                {!analyzing && hasAnalysis && stale && (
                    <span
                        className="vz-eva-stale-dot absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
                        style={{ background: "#F59E0B", boxShadow: "0 0 0 2px #FFFFFF" }}
                    />
                )}
            </button>

            {/* Coachmark de 1ª vez: responde "como eu sei que isso abre a análise?" */}
            {showHint && (
                <div
                    className="vz-eva-coach absolute right-0 top-[calc(100%+8px)] z-30 w-[228px] rounded-xl p-3"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(109,40,217,0.20)",
                        boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 16px 36px -16px rgba(109,40,217,0.45)",
                    }}
                    role="dialog"
                    aria-label="Dica sobre a EVA"
                >
                    {/* Setinha apontando o botão */}
                    <span
                        className="absolute -top-1.5 right-5 h-3 w-3 rotate-45"
                        style={{ background: "#FFFFFF", borderLeft: "1px solid rgba(109,40,217,0.20)", borderTop: "1px solid rgba(109,40,217,0.20)" }}
                    />
                    <div className="flex items-start gap-2">
                        <EvaNode size={14} color="#6D28D9" className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold mb-0.5" style={{ color: "#0B1220" }}>
                                A análise da EVA fica aqui
                            </p>
                            <p className="text-[11px]" style={{ color: "#64748B", lineHeight: 1.45 }}>
                                Toque para ver a leitura da conversa e a resposta sugerida.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={dismissHint}
                            className="h-5 w-5 -mt-0.5 -mr-0.5 rounded flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--ibx-sunken)]"
                            style={{ color: "#94A3B8" }}
                            aria-label="Dispensar dica"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="mt-2.5 w-full h-8 rounded-lg text-[12px] font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
                        style={{ background: "linear-gradient(135deg, #6D28D9, #8B5CF6)", boxShadow: "0 6px 16px -8px rgba(109,40,217,0.5)" }}
                    >
                        Ver análise da EVA
                        <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function ConversationHeader({
    chat,
    onBack,
    onRefresh,
    isRefreshing,
    onOpenEva,
    eva,
    typing,
}: {
    chat: Chat;
    onBack?: () => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    onOpenEva?: () => void;
    eva?: EvaHeaderState;
    typing?: boolean;
}) {
    const picUrl = useProfilePic(chat.phone, chat.profilePicUrl);
    return (
        <div
            className="px-4 sm:px-5 py-3.5 flex items-center gap-3"
            style={{
                borderBottom: "1px solid var(--ibx-line)",
                background: "#FFFFFF",
            }}
        >
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="h-8 w-8 -ml-1 rounded-md flex items-center justify-center hover:bg-[var(--ibx-sunken)] transition-colors shrink-0"
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
                {/* V1.0.1 — origem/status/score mock removidos. Apenas canal.
                    TYPING — "digitando…" substitui o selo de canal quando o contato digita. */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {typing ? (
                        <span
                            className="inline-flex items-center gap-1.5 text-[10.5px] font-medium"
                            style={{ color: "#10B981" }}
                        >
                            digitando
                            <span className="vz-typing-dots inline-flex gap-[2px]">
                                <span className="vz-typing-dot" />
                                <span className="vz-typing-dot" />
                                <span className="vz-typing-dot" />
                            </span>
                        </span>
                    ) : (
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
                    )}
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
                    className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-[var(--ibx-sunken)] transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
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
                acesso à análise dela vive aqui (abre o bottom sheet). Status vivo
                + caret + coachmark de 1ª vez resolvem a descoberta. */}
            {onOpenEva && <EvaHeaderButton eva={eva} onOpenEva={onOpenEva} />}
        </div>
    );
}

// ─── Thread de mensagens ─────────────────────────────────────────────────

function MessageThread({
    messages,
    isLoading,
    scrollRef,
    getAudioMedia,
    hasMoreMessages,
    loadingOlder,
    onLoadOlder,
}: {
    messages: MessageLine[];
    isLoading?: boolean;
    scrollRef: React.RefObject<HTMLDivElement>;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    hasMoreMessages?: boolean;
    loadingOlder?: boolean;
    onLoadOlder?: () => void;
}) {
    if (isLoading && messages.length === 0) {
        return (
            <div
                className="flex-1 flex items-center justify-center"
                style={{ background: "var(--ibx-paper)" }}
            >
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#2563EB" }} />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div
                className="flex-1 flex items-center justify-center px-6"
                style={{ background: "var(--ibx-paper)" }}
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
            style={{ background: "var(--ibx-paper)" }}
        >
            {/* F4C.3: limita largura interna da thread pra leitura confortável em ultrawide. */}
            <div className="max-w-[720px] mx-auto">
                {/* Paginação: carrega o histórico mais antigo sob demanda (a thread
                    abre com a janela recente; isto evita puxar milhares de mensagens). */}
                {hasMoreMessages && (
                    <div className="flex justify-center pb-3">
                        <button
                            type="button"
                            onClick={onLoadOlder}
                            disabled={loadingOlder}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-60 hover:bg-white"
                            style={{ color: "#475569", background: "#FFFFFF", border: "1px solid var(--ibx-line)" }}
                        >
                            {loadingOlder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {loadingOlder ? "Carregando…" : "Carregar mensagens anteriores"}
                        </button>
                    </div>
                )}
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
                style={{ background: "var(--ibx-sunken)", color: "#64748B", letterSpacing: "0.02em" }}
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
                              boxShadow: "0 2px 8px -3px rgba(37,99,235,0.28)",
                              opacity: isPending ? 0.92 : 1,
                          }
                        : {
                              background: "#FFFFFF",
                              color: "#0B1220",
                              border: "1px solid var(--ibx-line)",
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
                            storagePath={message.mediaStoragePath}
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
                            storagePath={message.mediaStoragePath}
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
        a.mediaCaption === b.mediaCaption &&
        a.mediaStoragePath === b.mediaStoragePath
    );
});

// ─── Media preview (estilo WhatsApp: prévia + legenda antes de enviar) ──────

// Balão da EVA no FIM da conversa: a resposta sugerida aparece "no meio do chat"
// (não só no painel lateral). Visual de mensagem da EVA (roxo, rabinho à esquerda).
// "Usar resposta" joga no composer; o humano revisa e envia (assistido).
function EvaInlineSuggestion({ text, onUse, onDismiss }: { text: string; onUse: () => void; onDismiss: () => void }) {
    return (
        <div className="px-3 sm:px-5 pt-1 pb-1" style={{ background: "var(--ibx-paper)" }}>
            <div className="max-w-[720px] mx-auto">
                <div
                    className="overflow-hidden"
                    style={{
                        background: "#F7F5FE",
                        border: "1px solid rgba(124,58,237,0.18)",
                        borderRadius: "16px 16px 16px 5px",
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 28px -18px rgba(124,58,237,0.35)",
                        animation: "vz-evassist-in 0.3s cubic-bezier(0.22,1,0.36,1)",
                    }}
                >
                    <div className="flex items-center gap-1.5 px-3.5 pt-2.5">
                        <EvaNode size={12} color="#6D28D9" />
                        <span className="text-[10px] uppercase font-bold" style={{ color: "#6D28D9", letterSpacing: "0.08em" }}>
                            Sugestão da EVA
                        </span>
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="ml-auto h-5 w-5 rounded flex items-center justify-center transition-colors hover:bg-white"
                            style={{ color: "#94A3B8" }}
                            aria-label="Dispensar sugestão"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <p className="px-3.5 pt-1 pb-2 text-[12.5px]" style={{ color: "#1E1B2E", lineHeight: 1.5 }}>
                        {text}
                    </p>
                    <div className="px-3.5 pb-3 flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onUse}
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-semibold text-white transition-all"
                            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)", boxShadow: "0 6px 16px -8px rgba(37,99,235,0.5)" }}
                        >
                            <ArrowRight className="h-3.5 w-3.5" />
                            Usar resposta
                        </button>
                        <span className="text-[11px]" style={{ color: "#94A3B8" }}>você revisa antes de enviar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Cor do ícone por tipo de arquivo (planilha verde, PDF vermelho, etc.).
function fileTypeColor(file: File): string {
    const n = file.name.toLowerCase();
    if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv")) return "#16A34A";
    if (n.endsWith(".pdf")) return "#DC2626";
    if (n.endsWith(".doc") || n.endsWith(".docx")) return "#2563EB";
    if (n.endsWith(".ppt") || n.endsWith(".pptx")) return "#EA580C";
    if (file.type.startsWith("image/")) return "#7C3AED";
    if (file.type.startsWith("video/")) return "#0891B2";
    return "#64748B";
}
function fmtMB(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Card de upload com % REAL + cancelar (referência do Markus). Aparece enquanto
// o documento/mídia sobe; a barra reflete o progresso de upload de verdade.
function UploadProgressCard({ file, pct, onCancel }: { file: File; pct: number; onCancel: () => void }) {
    const p = Math.min(Math.max(pct, 0), 1);
    const loaded = Math.round(file.size * p);
    const ext = (file.name.split(".").pop() || "").toUpperCase().slice(0, 4);
    return (
        <div className="px-3 sm:px-5 py-3" style={{ borderTop: "1px solid var(--ibx-line)", background: "#FFFFFF" }}>
            <div className="max-w-[720px] mx-auto">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--ibx-sunken)", border: "1px solid var(--ibx-line)" }}>
                    <div
                        className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ background: fileTypeColor(file), fontSize: ext.length > 3 ? 8 : 9 }}
                    >
                        {ext || <FileText className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold truncate" style={{ color: "#0B1220" }}>{file.name}</span>
                            <button
                                type="button"
                                onClick={onCancel}
                                aria-label="Cancelar envio"
                                title="Cancelar"
                                className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-colors hover:bg-white"
                                style={{ color: "#64748B" }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="text-[11.5px] mt-0.5">
                            <span style={{ color: "#2563EB", fontWeight: 600 }}>Enviando {Math.round(p * 100)}%</span>
                            <span style={{ color: "#94A3B8" }}> · {fmtMB(loaded)} de {fmtMB(file.size)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ibx-sunken)" }}>
                            <div
                                className="h-full rounded-full transition-[width] duration-200 ease-out"
                                style={{ width: `${p * 100}%`, background: "linear-gradient(90deg, #2563EB, #4A8CE8)" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
        <div className="px-3 sm:px-5 py-3" style={{ borderTop: "1px solid var(--ibx-line)", background: "#FFFFFF" }}>
            <div className="max-w-[720px] mx-auto">
                <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "var(--ibx-sunken)", border: "1px solid var(--ibx-line)" }}>
                    {/* Prévia */}
                    <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 72, height: 72, background: "var(--ibx-sunken)" }}>
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
                            style={{ color: "#0B1220", border: "1px solid var(--ibx-line)" }}
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
                            style={{ color: "#64748B", border: "1px solid var(--ibx-line)" }}
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
    // O atalho (Enter envia / Shift+Enter) é ruído permanente pra quem já sabe;
    // só aparece quando o campo está focado. Renderiza sempre (reserva o espaço,
    // sem pulo de layout) e faz fade pela opacidade.
    const [focused, setFocused] = useState(false);

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
                borderTop: "1px solid var(--ibx-line)",
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
                    background: "var(--ibx-sunken)",
                    border: "1px solid var(--ibx-line)",
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
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
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
            <p
                className="text-[10px] mt-1.5 px-2 transition-opacity duration-200"
                style={{
                    color: "#94A3B8",
                    opacity: focused ? 1 : 0,
                    pointerEvents: focused ? "auto" : "none",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                aria-hidden={!focused}
            >
                <kbd className="px-1 rounded" style={{ background: "var(--ibx-sunken)", border: "1px solid var(--ibx-line)" }}>Enter</kbd> envia ·{" "}
                <kbd className="px-1 rounded" style={{ background: "var(--ibx-sunken)", border: "1px solid var(--ibx-line)" }}>Shift+Enter</kbd> nova linha
            </p>
            </div>
        </div>
    );
};
