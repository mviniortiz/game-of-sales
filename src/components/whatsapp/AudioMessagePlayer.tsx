import React, { useState, useRef, useCallback } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { resolveWhatsAppMediaSrc } from "@/lib/whatsappMedia";

export function AudioMessagePlayer({
    messageId,
    audioUrl,
    duration,
    isMe,
    getAudioMedia,
    storagePath,
}: {
    messageId: string;
    audioUrl?: string;
    duration?: number;
    isMe: boolean;
    getAudioMedia: (messageId: string) => Promise<string | null>;
    /** INBOX.PERF.2 — media_ref.storage_path; quando presente, o áudio vem por
     *  signed URL do Storage (barato) em vez de base64 via edge getMedia. */
    storagePath?: string;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState(duration || 0);

    const loadMedia = useCallback(async () => {
        if (mediaSrc) return mediaSrc;
        setLoading(true);
        try {
            const src = await resolveWhatsAppMediaSrc(messageId, storagePath, getAudioMedia);
            if (src) {
                setMediaSrc(src);
                return src;
            }
        } catch (err) {
            console.error("[AudioPlayer] load error:", err);
        } finally {
            setLoading(false);
        }
        return null;
    }, [mediaSrc, messageId, storagePath, getAudioMedia]);

    const togglePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (playing) {
            audio.pause();
            setPlaying(false);
            return;
        }

        let src = mediaSrc;
        if (!src) {
            src = await loadMedia();
            if (!src) return;
        }

        if (audio.src !== src) {
            audio.src = src;
            await new Promise<void>((resolve) => {
                audio.oncanplay = () => resolve();
                audio.onerror = () => resolve();
                audio.load();
            });
        }

        try {
            await audio.play();
            setPlaying(true);
        } catch (err) {
            console.error("[AudioPlayer] play error:", err);
        }
    }, [playing, mediaSrc, loadMedia]);

    const handleTimeUpdate = useCallback(() => {
        const audio = audioRef.current;
        if (audio && audio.duration && isFinite(audio.duration)) {
            setProgress((audio.currentTime / audio.duration) * 100);
            if (!totalDuration) setTotalDuration(Math.round(audio.duration));
        }
    }, [totalDuration]);

    const handleEnded = useCallback(() => {
        setPlaying(false);
        setProgress(0);
    }, []);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration || !isFinite(audio.duration)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
        setProgress(pct * 100);
    }, []);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2.5 min-w-[180px]">
            <audio
                ref={audioRef}
                preload="none"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onLoadedMetadata={() => {
                    const audio = audioRef.current;
                    if (audio && audio.duration && isFinite(audio.duration) && !totalDuration) {
                        setTotalDuration(Math.round(audio.duration));
                    }
                }}
            />
            <button
                onClick={togglePlay}
                disabled={loading}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isMe
                        ? "bg-white/20 hover:bg-white/30 hover:scale-105"
                        : "bg-blue-600/15 hover:bg-blue-600/25 hover:scale-105"
                }`}
            >
                {loading ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${isMe ? "text-white" : "text-blue-600"}`} />
                ) : playing ? (
                    <Pause className={`w-4 h-4 ${isMe ? "text-white" : "text-blue-600"}`} />
                ) : (
                    <Play className={`w-4 h-4 ml-0.5 ${isMe ? "text-white" : "text-blue-600"}`} />
                )}
            </button>
            <div className="flex-1 min-w-0">
                <div
                    className={`h-[5px] rounded-full ${isMe ? "bg-white/20" : "bg-foreground/10"} cursor-pointer relative overflow-hidden`}
                    onClick={handleSeek}
                >
                    <div
                        className={`h-full rounded-full ${isMe ? "bg-white/70" : "bg-blue-600"} transition-[width] duration-100`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {totalDuration > 0 && (
                    <span className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"} mt-0.5 block`}>
                        {formatDuration(totalDuration)}
                    </span>
                )}
            </div>
        </div>
    );
}
