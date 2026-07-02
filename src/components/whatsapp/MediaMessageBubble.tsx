import React, { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Image, Film, Play } from "lucide-react";
import { MediaLightbox } from "./MediaLightbox";
import { resolveWhatsAppMediaSrc } from "@/lib/whatsappMedia";

export function MediaMessageBubble({
    messageId,
    mediaType,
    caption,
    isMe,
    getAudioMedia,
    storagePath,
}: {
    messageId: string;
    mediaType: "image" | "video" | "sticker";
    caption?: string;
    isMe: boolean;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    /** INBOX.PERF.2 — media_ref.storage_path; quando presente, a mídia vem por
     *  signed URL do Storage (barato) em vez de base64 via edge getMedia. */
    storagePath?: string;
}) {
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    // INBOX.PERF.2 — lazy: só baixa quando a bolha entra no viewport. Antes,
    // abrir uma conversa com 30 mídias disparava 30 downloads base64 no mount.
    const [visible, setVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        if (typeof IntersectionObserver === "undefined") {
            setVisible(true); // ambiente sem IO (teste/browser antigo): eager
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            // Pré-carrega um pouco antes de entrar na tela (scroll suave).
            { rootMargin: "300px 0px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const loadMedia = useCallback(async () => {
        if (mediaSrc || loading || error) return;
        setLoading(true);
        try {
            const src = await resolveWhatsAppMediaSrc(messageId, storagePath, getAudioMedia);
            if (src) {
                setMediaSrc(src);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [mediaSrc, loading, error, messageId, storagePath, getAudioMedia]);

    useEffect(() => {
        if (visible) void loadMedia();
    }, [visible, loadMedia]);

    const isSticker = mediaType === "sticker";
    const isVideo = mediaType === "video";

    if (!visible || loading || (!error && !mediaSrc)) {
        return (
            <div ref={containerRef} className={`flex flex-col gap-1.5 ${isSticker ? 'w-32' : 'w-48 sm:w-56'}`}>
                <div className={`${isSticker ? 'h-32 w-32' : 'h-36 w-48 sm:h-44 sm:w-56'} rounded-xl bg-muted/15 flex items-center justify-center animate-pulse`}>
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
                </div>
                {caption && <p className={`text-[13px] leading-snug ${isMe ? 'text-white' : 'text-foreground/85'}`}>{caption}</p>}
            </div>
        );
    }

    if (error || !mediaSrc) {
        return (
            <div ref={containerRef} className={`flex flex-col gap-1.5 ${isSticker ? 'w-32' : 'w-48 sm:w-56'}`}>
                <div className={`${isSticker ? 'h-32 w-32' : 'h-36 w-48 sm:h-44 sm:w-56'} rounded-xl bg-muted/10 border border-white/[0.06] flex flex-col items-center justify-center gap-1.5`}>
                    {isVideo ? <Film className="h-6 w-6 text-muted-foreground/25" /> : <Image className="h-6 w-6 text-muted-foreground/25" />}
                    <span className="text-[10px] text-muted-foreground/35">{isVideo ? "Vídeo" : "Imagem"} indisponível</span>
                </div>
                {caption && <p className={`text-[13px] leading-snug ${isMe ? 'text-white' : 'text-foreground/85'}`}>{caption}</p>}
            </div>
        );
    }

    return (
        <>
            <div ref={containerRef} className={`flex flex-col gap-1.5 ${isSticker ? '' : 'w-48 sm:w-56'}`}>
                <div
                    className={`relative cursor-pointer group overflow-hidden ${isSticker ? 'w-32 h-32' : 'w-48 h-36 sm:w-56 sm:h-44 rounded-xl'}`}
                    onClick={() => setLightboxOpen(true)}
                >
                    {isVideo ? (
                        <>
                            <video src={mediaSrc} className="w-full h-full object-cover rounded-xl" muted preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-xl">
                                <div className="h-11 w-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="h-5 w-5 text-slate-900 ml-0.5" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <img
                            src={mediaSrc}
                            alt={caption || ""}
                            loading="lazy"
                            className={`w-full h-full object-cover ${isSticker ? '' : 'rounded-xl'} group-hover:scale-[1.03] transition-transform duration-300`}
                        />
                    )}
                </div>
                {caption && (
                    <p className={`text-[13px] leading-snug whitespace-pre-wrap break-words ${isMe ? 'text-white' : 'text-foreground/85'}`}>
                        {caption}
                    </p>
                )}
            </div>
            {lightboxOpen && (
                <MediaLightbox
                    src={mediaSrc}
                    type={isVideo ? "video" : "image"}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </>
    );
}
