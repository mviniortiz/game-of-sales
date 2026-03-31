import React, { useState, useCallback, useEffect } from "react";
import { Loader2, Image, Film, Play } from "lucide-react";
import { MediaLightbox } from "./MediaLightbox";

export function MediaMessageBubble({
    messageId,
    mediaType,
    caption,
    isMe,
    getAudioMedia,
}: {
    messageId: string;
    mediaType: "image" | "video" | "sticker";
    caption?: string;
    isMe: boolean;
    getAudioMedia: (messageId: string) => Promise<string | null>;
}) {
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const loadMedia = useCallback(async () => {
        if (mediaSrc || loading || error) return;
        setLoading(true);
        try {
            const src = await getAudioMedia(messageId);
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
    }, [mediaSrc, loading, error, messageId, getAudioMedia]);

    useEffect(() => { loadMedia(); }, [loadMedia]);

    const isSticker = mediaType === "sticker";
    const isVideo = mediaType === "video";

    if (loading) {
        return (
            <div className={`flex flex-col gap-1.5 ${isSticker ? 'w-32' : 'w-56'}`}>
                <div className={`${isSticker ? 'h-32 w-32' : 'h-44 w-56'} rounded-xl bg-muted/15 flex items-center justify-center animate-pulse`}>
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
                </div>
                {caption && <p className={`text-[13px] leading-snug ${isMe ? 'text-white' : 'text-foreground/85'}`}>{caption}</p>}
            </div>
        );
    }

    if (error || !mediaSrc) {
        return (
            <div className={`flex flex-col gap-1.5 ${isSticker ? 'w-32' : 'w-56'}`}>
                <div className={`${isSticker ? 'h-32 w-32' : 'h-44 w-56'} rounded-xl bg-muted/10 border border-white/[0.06] flex flex-col items-center justify-center gap-1.5`}>
                    {isVideo ? <Film className="h-6 w-6 text-muted-foreground/25" /> : <Image className="h-6 w-6 text-muted-foreground/25" />}
                    <span className="text-[10px] text-muted-foreground/35">{isVideo ? "Vídeo" : "Imagem"} indisponível</span>
                </div>
                {caption && <p className={`text-[13px] leading-snug ${isMe ? 'text-white' : 'text-foreground/85'}`}>{caption}</p>}
            </div>
        );
    }

    return (
        <>
            <div className={`flex flex-col gap-1.5 ${isSticker ? '' : 'w-56'}`}>
                <div
                    className={`relative cursor-pointer group overflow-hidden ${isSticker ? 'w-32 h-32' : 'w-56 h-44 rounded-xl'}`}
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
