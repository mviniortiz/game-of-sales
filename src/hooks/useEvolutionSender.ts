// ─────────────────────────────────────────────────────────────────────────────
// F4W.0.1 (2026-05-20) — useEvolutionSender
//
// Hook MINIMALISTA: faz só o necessário pra Inbox DB-first conviver com o
// envio via Evolution. Não busca chats, não busca mensagens, não inicia
// polling/dbFallback, não toca em selectedChatMessages.
//
// O hook completo `useEvolutionIntegration` continua existindo intocado pra
// telas legadas (Pulse) e pra eventual rollback de F4W.0 — ver INBOX_DB_SOURCE_ENABLED.
//
// API exposta:
//   - connected:        status booleano (1 check inicial; sem polling agressivo)
//   - connecting:       enquanto faz a primeira checagem
//   - error:            última falha de envio/status
//   - sendMessage(jid, text)
//   - sendAudioMessage(jid, base64)
//   - sendMediaMessage(jid, base64, mimetype, opts?)
//   - getAudioMedia(messageId)
//   - refreshStatus():  re-checa connected sob demanda (ex: depois de erro)
//
// Padrão de chamada: idêntico ao `useEvolutionIntegration` pra essas funções,
// então Inbox.tsx só troca o nome do hook.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

type ProxyAction =
    | "status"
    | "send"
    | "sendAudio"
    | "sendMedia"
    | "getMedia"
    | "logout"
    | "resyncWebhook";

interface AudioMediaResult {
    base64?: string;
    mimetype?: string;
}

interface SendMediaOpts {
    caption?: string;
    fileName?: string;
}

/** Permite mostrar a % real do upload e cancelar (AbortSignal). */
export interface SendMediaProgress {
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
}

// Upload rastreado (XHR) pro edge: dá evento de progresso (a % real) e cancelamento,
// que o supabase.functions.invoke (fetch) não expõe. Mesmo corpo do invokeProxy.
function uploadEvolutionMedia(
    url: string,
    anon: string,
    token: string,
    body: Record<string, unknown>,
    progress?: SendMediaProgress,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("apikey", anon);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && progress?.onProgress) progress.onProgress(e.loaded / e.total);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                progress?.onProgress?.(1);
                resolve();
            } else {
                let detail = `HTTP ${xhr.status}`;
                try { const b = JSON.parse(xhr.responseText); detail = b?.error || b?.message || detail; } catch { /* ignore */ }
                reject(new Error(detail));
            }
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao enviar a mídia."));
        xhr.onabort = () => reject(new DOMException("Envio cancelado", "AbortError"));
        if (progress?.signal) {
            if (progress.signal.aborted) { xhr.abort(); return; }
            progress.signal.addEventListener("abort", () => xhr.abort(), { once: true });
        }
        xhr.send(JSON.stringify(body));
    });
}

export interface UseEvolutionSender {
    connected: boolean;
    connecting: boolean;
    error: string | null;
    /** Última vez que o status da Evolution foi verificado (mount, refresh
     *  manual, focus). null antes da primeira checagem. */
    lastStatusCheckedAt: Date | null;
    sendMessage: (chatJid: string, text: string) => Promise<void>;
    sendAudioMessage: (chatJid: string, base64: string) => Promise<void>;
    sendMediaMessage: (
        chatJid: string,
        base64: string,
        mimetype: string,
        opts?: SendMediaOpts,
        progress?: SendMediaProgress,
    ) => Promise<void>;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    refreshStatus: () => Promise<boolean>;
    clearError: () => void;
    /** Desconecta o número (best-effort, otimista). */
    disconnect: () => Promise<void>;
    /** Re-aplica o webhook config (ex.: liga MESSAGES_UPDATE) sem reconectar. */
    resyncWebhook: () => Promise<void>;
}

/** Janela mínima entre refreshs on-focus pra evitar abuso (60s) */
const FOCUS_REFRESH_THROTTLE_MS = 60_000;

export function useEvolutionSender(): UseEvolutionSender {
    const { user } = useAuth();
    const { activeCompanyId } = useTenant();
    const userId = user?.id;

    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastStatusCheckedAt, setLastStatusCheckedAt] = useState<Date | null>(null);

    // Cache de áudio: messageId → data URI (espelha o do hook completo)
    const audioCache = useRef<Map<string, string>>(new Map());
    const lastFocusRefreshRef = useRef<number>(0);

    // ── Proxy comum pra Evolution edge function ───────────────────────────
    const invokeProxy = useCallback(
        async (action: ProxyAction, payload: Record<string, unknown> = {}) => {
            // Timeout defensivo: o servidor Evolution pode estar lento/fora; sem isto
            // a UI fica pendurada indefinidamente numa ação (ex.: logout, status).
            const invokePromise = supabase.functions.invoke("evolution-whatsapp", {
                body: {
                    action,
                    companyId: activeCompanyId,
                    ...payload,
                },
            });
            const response = (await Promise.race([
                invokePromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Tempo esgotado ao falar com o WhatsApp")), 15000)
                ),
            ])) as Awaited<typeof invokePromise>;
            if (response.error) {
                let detail = response.error.message;
                try {
                    const ctx = (response.error as { context?: { json?: () => Promise<unknown> } })
                        .context;
                    if (ctx && typeof ctx.json === "function") {
                        const body = (await ctx.json()) as { error?: string; message?: string };
                        detail = body?.error || body?.message || JSON.stringify(body);
                    }
                } catch {
                    /* ignore */
                }
                throw new Error(detail);
            }
            return response.data as unknown;
        },
        [activeCompanyId],
    );

    // ── Status check ───────────────────────────────────────────────────────
    const refreshStatus = useCallback(async (): Promise<boolean> => {
        try {
            const data = (await invokeProxy("status")) as { connected?: boolean } | null;
            const isOpen = data?.connected === true;
            setConnected(isOpen);
            setLastStatusCheckedAt(new Date());
            return isOpen;
        } catch (err) {
            console.warn("[EvolutionSender] status check failed:", err);
            // Falha no check NÃO seta lastStatusCheckedAt — UI deve sinalizar
            // "status incerto" em vez de cravar "desconectado".
            setConnected(false);
            return false;
        }
    }, [invokeProxy]);

    // ── Check inicial (1x) — sem polling. Re-check só sob demanda. ────────
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        setConnecting(true);
        refreshStatus().finally(() => {
            if (!cancelled) setConnecting(false);
        });
        return () => {
            cancelled = true;
        };
    }, [userId, refreshStatus]);

    // ── Refresh on window focus (throttled 60s) ───────────────────────────
    // Aproveita o user voltando à aba pra reverificar status sem polling.
    // Se o status não muda em <60s, nada acontece. Falha silenciosa: o catch
    // dentro de refreshStatus já cuida.
    useEffect(() => {
        if (!userId) return;
        const onFocus = () => {
            const now = Date.now();
            if (now - lastFocusRefreshRef.current < FOCUS_REFRESH_THROTTLE_MS) return;
            lastFocusRefreshRef.current = now;
            void refreshStatus();
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [userId, refreshStatus]);

    // ── Send text ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (chatJid: string, text: string) => {
            if (!chatJid || !text.trim()) return;
            setError(null);
            try {
                await invokeProxy("send", { chatId: chatJid, text: text.trim() });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Falha ao enviar mensagem.";
                setError(msg);
                throw err;
            }
        },
        [invokeProxy],
    );

    // ── Send audio ─────────────────────────────────────────────────────────
    const sendAudioMessage = useCallback(
        async (chatJid: string, base64: string) => {
            if (!chatJid || !base64) return;
            setError(null);
            try {
                await invokeProxy("sendAudio", {
                    chatId: chatJid,
                    mediaBase64: base64,
                    mimetype: "audio/webm",
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Falha ao enviar áudio.";
                setError(msg);
                throw err;
            }
        },
        [invokeProxy],
    );

    // ── Send media (image/video/document) ──────────────────────────────────
    const sendMediaMessage = useCallback(
        async (
            chatJid: string,
            base64: string,
            mimetype: string,
            opts?: SendMediaOpts,
            progress?: SendMediaProgress,
        ) => {
            if (!chatJid || !base64) return;
            setError(null);
            try {
                if (progress?.onProgress || progress?.signal) {
                    // Caminho com % real (XHR rastreado). Mesmo corpo do invokeProxy.
                    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-whatsapp`;
                    const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
                    const { data } = await supabase.auth.getSession();
                    const token = data.session?.access_token || anon;
                    await uploadEvolutionMedia(url, anon, token, {
                        action: "sendMedia",
                        companyId: activeCompanyId,
                        chatId: chatJid,
                        mediaBase64: base64,
                        mimetype,
                        caption: opts?.caption || undefined,
                        fileName: opts?.fileName || undefined,
                    }, progress);
                } else {
                    await invokeProxy("sendMedia", {
                        chatId: chatJid,
                        mediaBase64: base64,
                        mimetype,
                        caption: opts?.caption || undefined,
                        fileName: opts?.fileName || undefined,
                    });
                }
            } catch (err) {
                if ((err as DOMException)?.name === "AbortError") throw err; // cancelado: não é erro de UI
                const msg = err instanceof Error ? err.message : "Falha ao enviar mídia.";
                setError(msg);
                throw err;
            }
        },
        [invokeProxy, activeCompanyId],
    );

    // ── Get audio media (download via Evolution + cache) ───────────────────
    const getAudioMedia = useCallback(
        async (messageId: string): Promise<string | null> => {
            if (audioCache.current.has(messageId)) {
                return audioCache.current.get(messageId)!;
            }
            try {
                const data = (await invokeProxy("getMedia", { messageId })) as AudioMediaResult | null;
                if (data?.base64) {
                    const rawMime = data.mimetype || "audio/ogg";
                    const mimetype =
                        rawMime.includes("opus") || rawMime.includes("ogg")
                            ? "audio/ogg; codecs=opus"
                            : rawMime;
                    const dataUri = `data:${mimetype};base64,${data.base64}`;
                    audioCache.current.set(messageId, dataUri);
                    return dataUri;
                }
            } catch (err) {
                console.error("[EvolutionSender.getAudioMedia] error:", err);
            }
            return null;
        },
        [invokeProxy],
    );

    const clearError = useCallback(() => setError(null), []);

    // Desconecta o número. OTIMISTA: marca desconectado na hora (o servidor
    // Evolution pode estar lento/fora e a UI não pode travar). O logout roda em
    // background, best-effort — se falhar, o reconnect resolve de qualquer jeito.
    const disconnect = useCallback(async () => {
        setConnected(false);
        setLastStatusCheckedAt(new Date());
        void invokeProxy("logout").catch((err) =>
            console.warn("[EvolutionSender] logout best-effort falhou:", err),
        );
    }, [invokeProxy]);

    // Re-aplica o webhook config (eventos atuais, ex. MESSAGES_UPDATE) sem reconectar.
    const resyncWebhook = useCallback(async () => {
        await invokeProxy("resyncWebhook");
    }, [invokeProxy]);

    return {
        connected,
        connecting,
        error,
        lastStatusCheckedAt,
        sendMessage,
        sendAudioMessage,
        sendMediaMessage,
        getAudioMedia,
        refreshStatus,
        clearError,
        disconnect,
        resyncWebhook,
    };
}
