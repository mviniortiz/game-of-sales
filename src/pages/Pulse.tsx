import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { logger } from "@/utils/logger";
import { MessageCircle, Search, Phone, Send, QrCode, Target, CheckCircle2, Sparkles, Brain, TrendingUp, AlertCircle, RefreshCcw, Loader2, Settings2, Users, ChevronDown, Flame, Snowflake, ThermometerSun, Zap, Copy, ArrowRight, ArrowLeft, User, StickyNote, PanelRightOpen, PanelRightClose, Plus, ChevronRight, Bot, Paperclip, Mic, Reply, DollarSign, FileText, ClipboardList, X, Clock, History, Play, Pause, Image, Film, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";


import { useEvolutionIntegration } from "@/hooks/useEvolutionAPI";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TemplatePicker } from "@/components/whatsapp/TemplatePicker";
import { CopilotSidebar } from "@/components/whatsapp/CopilotSidebar";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Audio Recorder (hold-to-record voice messages) ───────────────────────
function AudioRecorder({
    onSend,
    onCancel,
}: {
    onSend: (base64: string) => void;
    onCancel: () => void;
}) {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number>(0);
    const [bars, setBars] = useState<number[]>(new Array(24).fill(4));

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                    ? "audio/webm;codecs=opus"
                    : "audio/webm",
            });
            chunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorder.start(100);
            mediaRecorderRef.current = mediaRecorder;

            // Web Audio API for real waveform
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.7;
            source.connect(analyser);
            analyserRef.current = analyser;
            audioCtxRef.current = audioCtx;

            // Animate bars from real frequency data
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateBars = () => {
                analyser.getByteFrequencyData(dataArray);
                const newBars: number[] = [];
                const binCount = 24;
                const step = Math.floor(dataArray.length / binCount);
                for (let i = 0; i < binCount; i++) {
                    const val = dataArray[i * step] || 0;
                    newBars.push(Math.max(3, (val / 255) * 22));
                }
                setBars(newBars);
                rafRef.current = requestAnimationFrame(updateBars);
            };
            rafRef.current = requestAnimationFrame(updateBars);

            setRecording(true);
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
        } catch (err) {
            console.error("[AudioRecorder] mic access error:", err);
            onCancel();
        }
    }, [onCancel]);

    const cleanup = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const stopAndSend = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (!mr || mr.state === "inactive") return;
        mr.onstop = async () => {
            mr.stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunksRef.current, { type: mr.mimeType });
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUri = reader.result as string;
                const base64 = dataUri.split(",")[1];
                if (base64) onSend(base64);
            };
            reader.readAsDataURL(blob);
        };
        mr.stop();
        cleanup();
        setRecording(false);
    }, [onSend, cleanup]);

    const cancel = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") {
            mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop());
            mr.stop();
        }
        cleanup();
        setRecording(false);
        onCancel();
    }, [onCancel, cleanup]);

    useEffect(() => { startRecording(); return cleanup; }, [startRecording, cleanup]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
                onClick={cancel}
                className="h-9 w-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2.5 bg-muted/30 rounded-2xl border border-red-500/20 px-3 h-10">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                </span>
                <span className="text-[13px] text-red-400 font-semibold tabular-nums">{formatTime(elapsed)}</span>
                <div className="flex-1 flex items-center justify-center gap-[2px]">
                    {bars.map((h, i) => (
                        <div
                            key={i}
                            className="w-[3px] rounded-full bg-red-400/60"
                            style={{ height: `${h}px`, transition: "height 80ms ease-out" }}
                        />
                    ))}
                </div>
                <span className="text-[10px] text-muted-foreground/50">Gravando...</span>
            </div>
            <button
                onClick={stopAndSend}
                className="h-9 w-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors shadow-md shadow-emerald-500/20 shrink-0"
            >
                <Send className="h-4 w-4" />
            </button>
        </div>
    );
}

// ─── File to Base64 helper ────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // strip data URI prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── Audio Player for voice messages ──────────────────────────────────────
function AudioMessagePlayer({
    messageId,
    audioUrl,
    duration,
    isMe,
    getAudioMedia,
}: {
    messageId: string;
    audioUrl?: string;
    duration?: number;
    isMe: boolean;
    getAudioMedia: (messageId: string) => Promise<string | null>;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    // Never use audioUrl directly — Evolution API URLs are internal/expired.
    // Always fetch base64 via getMedia edge function.
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState(duration || 0);

    const loadMedia = useCallback(async () => {
        if (mediaSrc) return mediaSrc;
        setLoading(true);
        try {
            const src = await getAudioMedia(messageId);
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
    }, [mediaSrc, messageId, getAudioMedia]);

    const togglePlay = useCallback(async () => {
        const audio = audioRef.current;
        console.log("[AudioPlayer] togglePlay", { audioRef: !!audio, playing, mediaSrc: mediaSrc?.slice(0, 60), messageId });
        if (!audio) return;

        if (playing) {
            audio.pause();
            setPlaying(false);
            return;
        }

        // Load media if not yet loaded
        let src = mediaSrc;
        if (!src) {
            console.log("[AudioPlayer] loading media for:", messageId);
            src = await loadMedia();
            console.log("[AudioPlayer] loaded:", src ? src.slice(0, 80) + "..." : "NULL");
            if (!src) return;
        }

        if (audio.src !== src) {
            audio.src = src;
            // Wait for the audio to be ready
            await new Promise<void>((resolve) => {
                audio.oncanplay = () => resolve();
                audio.onerror = () => {
                    console.error("[AudioPlayer] audio element error:", audio.error);
                    resolve();
                };
                audio.load();
            });
        }

        try {
            await audio.play();
            setPlaying(true);
        } catch (err) {
            console.error("[AudioPlayer] play error:", err);
        }
    }, [playing, mediaSrc, loadMedia, messageId]);

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

    const fgColor = isMe ? "bg-white/70" : "bg-emerald-500";
    const bgColor = isMe ? "bg-white/20" : "bg-foreground/15";
    const textColor = isMe ? "text-primary-foreground/70" : "text-muted-foreground";

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
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isMe ? "bg-white/20 hover:bg-white/30" : "bg-emerald-500/20 hover:bg-emerald-500/30"
                }`}
            >
                {loading ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${isMe ? "text-white" : "text-emerald-500"}`} />
                ) : playing ? (
                    <Pause className={`w-4 h-4 ${isMe ? "text-white" : "text-emerald-500"}`} />
                ) : (
                    <Play className={`w-4 h-4 ml-0.5 ${isMe ? "text-white" : "text-emerald-500"}`} />
                )}
            </button>
            <div className="flex-1 min-w-0">
                <div
                    className={`h-1.5 rounded-full ${bgColor} cursor-pointer relative overflow-hidden`}
                    onClick={handleSeek}
                >
                    <div
                        className={`h-full rounded-full ${fgColor} transition-[width] duration-100`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {totalDuration > 0 && (
                    <span className={`text-[10px] ${textColor} mt-0.5 block`}>
                        {formatDuration(totalDuration)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Media Lightbox (fullscreen image/video viewer) ───────────────────────
function MediaLightbox({
    src,
    type,
    onClose,
}: {
    src: string;
    type: "image" | "video";
    onClose: () => void;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
                <X className="h-5 w-5" />
            </button>
            <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 right-16 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
                <Download className="h-5 w-5" />
            </a>
            <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
                {type === "image" ? (
                    <img src={src} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                ) : (
                    <video src={src} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                )}
            </div>
        </div>
    );
}

// ─── Media Message (image/video/sticker thumbnail) ────────────────────────
function MediaMessageBubble({
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

    // Auto-load media on mount
    useEffect(() => { loadMedia(); }, [loadMedia]);

    const isSticker = mediaType === "sticker";
    const isVideo = mediaType === "video";

    // Loading state
    if (loading) {
        return (
            <div className={`flex flex-col gap-1.5 ${isSticker ? 'w-32' : 'w-44 sm:w-52'}`}>
                <div className={`${isSticker ? 'h-32 w-32' : 'h-36 w-44 sm:h-40 sm:w-52'} rounded-lg bg-muted/20 flex items-center justify-center`}>
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
                {caption && <p className={`text-[13px] leading-snug ${isMe ? 'text-white' : 'text-foreground/85'}`}>{caption}</p>}
            </div>
        );
    }

    // Error state
    if (error || !mediaSrc) {
        return (
            <div className={`flex flex-col gap-1.5 ${isSticker ? 'w-32' : 'w-44 sm:w-52'}`}>
                <div className={`${isSticker ? 'h-32 w-32' : 'h-36 w-44 sm:h-40 sm:w-52'} rounded-lg bg-muted/10 border border-white/[0.06] flex flex-col items-center justify-center gap-1.5`}>
                    {isVideo ? <Film className="h-6 w-6 text-muted-foreground/30" /> : <Image className="h-6 w-6 text-muted-foreground/30" />}
                    <span className="text-[10px] text-muted-foreground/40">{isVideo ? "Vídeo" : "Imagem"} indisponível</span>
                </div>
                {caption && <p className={`text-[13px] leading-snug ${isMe ? 'text-white' : 'text-foreground/85'}`}>{caption}</p>}
            </div>
        );
    }

    return (
        <>
            <div className={`flex flex-col gap-1.5 ${isSticker ? '' : 'w-44 sm:w-52'}`}>
                <div
                    className={`relative cursor-pointer group overflow-hidden ${isSticker ? 'w-32 h-32' : 'w-44 h-36 sm:w-52 sm:h-40 rounded-lg'}`}
                    onClick={() => setLightboxOpen(true)}
                >
                    {isVideo ? (
                        <>
                            <video
                                src={mediaSrc}
                                className="w-full h-full object-cover rounded-lg"
                                muted
                                preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                    <Play className="h-5 w-5 text-slate-900 ml-0.5" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <img
                            src={mediaSrc}
                            alt={caption || ""}
                            className={`w-full h-full object-cover ${isSticker ? '' : 'rounded-lg'} group-hover:scale-[1.02] transition-transform duration-200`}
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

// ─── Pipeline stage definitions (mirrors CRM.tsx) ─────────────────────────
const PIPELINE_STAGES = [
    { id: "lead", title: "Lead", color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
    { id: "qualification", title: "Qualificação", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
    { id: "proposal", title: "Proposta", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
    { id: "negotiation", title: "Negociação", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
    { id: "closed_won", title: "Ganho", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
    { id: "closed_lost", title: "Perdido", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
];

const getStageInfo = (stageId: string) => PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];

// ─── Quick Responses: now powered by WhatsApp Templates (see TemplatePicker) ─

// ─── AI Sales Copilot — calls GPT-4o-mini via Edge Function (10 analyses/day limit)
export const useCopilot = () => {
    const [aiThinking, setAiThinking] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [rateLimited, setRateLimited] = useState(false);

    const getAiAnalysis = async (
        chatTextContext: string,
        messages?: Array<{ text: string; sender: "me" | "lead" }>,
        contactName?: string,
        contactPhone?: string,
    ) => {
        if (rateLimited) return;

        setAiThinking(true);
        setAiSuggestion(null);

        try {
            const msgArray = messages || chatTextContext.split("\n").map((line) => {
                const isMe = line.startsWith("[Vendedor]") || line.startsWith("Eu:");
                return {
                    text: line.replace(/^\[(Vendedor|Lead)\]:\s*/, "").replace(/^(Eu|Lead):\s*/, ""),
                    sender: isMe ? "me" as const : "lead" as const,
                };
            }).filter((m) => m.text.trim());

            const { data, error } = await supabase.functions.invoke("whatsapp-copilot", {
                body: {
                    messages: msgArray,
                    contactName: contactName || "Lead",
                    contactPhone: contactPhone || null,
                },
            });

            if (data?.code === "RATE_LIMITED" || data?.remaining === 0) {
                setRateLimited(true);
                setRemaining(0);
                setAiSuggestion({
                    sentiment: "Limite diário atingido",
                    temperature: "morno",
                    strategy: ["Você usou todas as 10 análises de hoje.", "O limite reseta amanhã automaticamente."],
                    draft: "",
                    objections: [],
                    nextAction: "Aguardar reset do limite amanhã",
                });
                return;
            }

            if (error || !data?.analysis) {
                logger.error("[useCopilot] error:", error, "data:", data);
                setAiSuggestion({
                    sentiment: "Análise indisponível",
                    temperature: "morno",
                    strategy: ["Tente novamente em alguns segundos."],
                    draft: "",
                    objections: [],
                    nextAction: "Aguardar resposta do lead",
                });
                return;
            }

            setAiSuggestion(data.analysis);
            if (data.remaining !== undefined) {
                setRemaining(data.remaining);
            }
        } catch (err) {
            logger.error("[useCopilot] unexpected error:", err);
            setAiSuggestion({
                sentiment: "Erro ao analisar",
                temperature: "morno",
                strategy: ["Serviço de IA temporariamente indisponível."],
                draft: "",
                objections: [],
                nextAction: "Tentar novamente",
            });
        } finally {
            setAiThinking(false);
        }
    };

    return { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion, remaining, rateLimited };
};

// ─── Temperature helpers ────────────────────────────────────────────────────
const TempIcon = ({ temp }: { temp: string }) => {
    if (temp === "quente") return <Flame className="w-3.5 h-3.5" />;
    if (temp === "frio") return <Snowflake className="w-3.5 h-3.5" />;
    return <ThermometerSun className="w-3.5 h-3.5" />;
};

const tempColor = (temp: string) => {
    if (temp === "quente") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    if (temp === "frio") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
};

// ─── CRM Deal lookup hook ───────────────────────────────────────────────────
interface CrmDeal {
    id: string;
    title: string;
    value: number;
    stage: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    notes: string | null;
    is_hot: boolean | null;
    probability: number;
    created_at: string;
    user_id: string;
}

const useCrmLookup = (phone: string | undefined | null) => {
    const [deal, setDeal] = useState<CrmDeal | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const lastPhoneRef = useRef<string>("");

    const searchDeal = useCallback(async (phoneToSearch: string) => {
        if (!phoneToSearch) { setDeal(null); setSearched(false); return; }

        // Normalize phone: remove all non-digits
        const digits = phoneToSearch.replace(/\D/g, "");
        if (digits.length < 8) { setDeal(null); setSearched(true); return; }

        setLoading(true);
        try {
            // Search deals by customer_phone (partial match: phone may contain country code variations)
            const { data, error } = await supabase
                .from("deals")
                .select("*")
                .or(`customer_phone.ilike.%${digits.slice(-8)}%,customer_phone.ilike.%${digits}%`)
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) {
                logger.error("[CRM lookup]", error);
                setDeal(null);
            } else {
                setDeal(data && data.length > 0 ? data[0] as CrmDeal : null);
            }
        } catch (err) {
            logger.error("[CRM lookup] unexpected:", err);
            setDeal(null);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, []);

    // Auto-search when phone changes
    useEffect(() => {
        const digits = (phone || "").replace(/\D/g, "");
        if (digits === lastPhoneRef.current) return;
        lastPhoneRef.current = digits;
        setSearched(false);
        setDeal(null);
        if (digits.length >= 8) {
            searchDeal(digits);
        }
    }, [phone, searchDeal]);

    const refresh = useCallback(() => {
        const digits = (phone || "").replace(/\D/g, "");
        if (digits.length >= 8) searchDeal(digits);
    }, [phone, searchDeal]);

    return { deal, loading, searched, refresh };
};

// ─── Update deal stage ──────────────────────────────────────────────────────
const updateDealStage = async (dealId: string, newStage: string) => {
    const probMap: Record<string, number> = {
        lead: 10, qualification: 25, proposal: 55, negotiation: 80, closed_won: 100, closed_lost: 0,
    };
    const { error } = await supabase
        .from("deals")
        .update({ stage: newStage as any, probability: probMap[newStage] ?? 10 })
        .eq("id", dealId);
    if (error) throw error;
};

// ─── Add note to deal ───────────────────────────────────────────────────────
const addNoteToDeal = async (dealId: string, note: string) => {
    // Append to existing notes
    const { data: existing } = await supabase
        .from("deals")
        .select("notes")
        .eq("id", dealId)
        .single();

    const currentNotes = existing?.notes || "";
    const timestamp = new Date().toLocaleString("pt-BR");
    const updatedNotes = currentNotes
        ? `${currentNotes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;

    const { error } = await supabase
        .from("deals")
        .update({ notes: updatedNotes })
        .eq("id", dealId);
    if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════
// Collapsible Section component for the sidebar
// ═══════════════════════════════════════════════════════════════════════════
const SidebarSection = ({ title, icon: Icon, children, defaultOpen = true, badge }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-white/5 last:border-b-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{title}</span>
                    {badge}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-4 pb-3">{children}</div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER SALE MINI FORM
// ═══════════════════════════════════════════════════════════════════════════
const RegisterSaleForm = ({ phone, companyId, onClose, onSuccess }: {
    phone: string;
    companyId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [product, setProduct] = useState("");
    const [value, setValue] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!product.trim()) { toast.error("Informe o produto/serviço"); return; }
        const numValue = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
        if (numValue <= 0) { toast.error("Informe um valor valido"); return; }

        setSaving(true);
        try {
            const { error } = await supabase.from("sales" as any).insert({
                product_name: product.trim(),
                value: numValue,
                notes: notes.trim() || null,
                customer_phone: phone,
                company_id: companyId,
            } as any);
            if (error) throw error;
            toast.success("Venda registrada com sucesso!");
            onSuccess();
            onClose();
        } catch (err: any) {
            logger.error("[RegisterSale]", err);
            toast.error("Erro ao registrar venda");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Registrar Venda
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <X className="w-3 h-3" />
                </Button>
            </div>
            <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Produto / Serviço"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Valor (R$)"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações (opcional)"
                rows={2}
                className="w-full text-[11px] bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <Button
                size="sm"
                className="w-full h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                onClick={handleSubmit}
                disabled={saving}
            >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                Registrar
            </Button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CREATE PROPOSAL MINI FORM
// ═══════════════════════════════════════════════════════════════════════════
const CreateProposalForm = ({ contactName, onClose }: {
    contactName: string;
    onClose: () => void;
}) => {
    const [title, setTitle] = useState(`Proposta - ${contactName}`);
    const [value, setValue] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = () => {
        toast.success("Proposta criada! (Em breve: integração completa)");
        onClose();
    };

    return (
        <div className="space-y-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Criar Proposta
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <X className="w-3 h-3" />
                </Button>
            </div>
            <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da proposta"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Valor (R$)"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da proposta"
                rows={3}
                className="w-full text-[11px] bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            <Button
                size="sm"
                className="w-full h-8 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                onClick={handleSubmit}
            >
                <FileText className="w-3 h-3" /> Criar Proposta
            </Button>
        </div>
    );
};



// ═══════════════════════════════════════════════════════════════════════════
// MAIN WhatsApp PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const WhatsApp = () => {
    const {
        config, connecting, connected,
        qrCodeBase64, error, clearError, connect, logout,
        chats, fetchChats, refreshConnection, isLoadingChats, isLoadingMessages,
        selectedChatMessages, fetchMessages, sendMessage,
        targetUserId, setTargetUser, fetchInstances, getAudioMedia,
        sendMediaMessage, sendAudioMessage, appendRealtimeMessage,
    } = useEvolutionIntegration();

    const { user, isAdmin, isSuperAdmin } = useAuth();
    const { activeCompanyId, companies } = useTenant();
    const activeCompanyName = companies.find(c => c.id === activeCompanyId)?.name;
    const canViewOthers = isAdmin || isSuperAdmin;

    // Seller instances list for admin selector
    const [sellerInstances, setSellerInstances] = useState<Array<{ userId: string; name: string; avatarUrl: string | null; role: string; connected: boolean }>>([]);
    const [loadingSellers, setLoadingSellers] = useState(false);

    useEffect(() => {
        if (!canViewOthers) return;
        setLoadingSellers(true);
        fetchInstances().then((sellers) => {
            setSellerInstances(sellers);
            setLoadingSellers(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canViewOthers]);

    const handleSellerChange = (value: string) => {
        const sellerId = value === "mine" ? null : value;
        setTargetUser(sellerId);
        setSelectedChatId(null);
    };

    const viewingSellerName = targetUserId
        ? sellerInstances.find(s => s.userId === targetUserId)?.name || "Vendedor"
        : null;

    const { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion, remaining, rateLimited } = useCopilot();

    const isMobile = useIsMobile();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [inputText, setInputText] = useState("");
    const [justConnected, setJustConnected] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatFilter, setChatFilter] = useState<"all" | "unread" | "groups">("all");
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showCreateDealDialog, setShowCreateDealDialog] = useState(false);
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
    const [newDealTitleDialog, setNewDealTitleDialog] = useState("");
    const [newDealValueDialog, setNewDealValueDialog] = useState("");
    const [creatingDealDialog, setCreatingDealDialog] = useState(false);
    const [headerStageUpdating, setHeaderStageUpdating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputTypeRef = useRef<"image" | "document">("image");
    const attachMenuRef = useRef<HTMLDivElement>(null);
    const prevConnectedRef = useRef(false);
    const quickRepliesRef = useRef<HTMLDivElement>(null);

    // Close quick replies on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (quickRepliesRef.current && !quickRepliesRef.current.contains(e.target as Node)) {
                setShowQuickReplies(false);
            }
        };
        if (showQuickReplies) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showQuickReplies]);

    // Connection success animation
    useEffect(() => {
        if (connected && !prevConnectedRef.current) {
            setJustConnected(true);
            const timer = setTimeout(() => setJustConnected(false), 3000);
            return () => clearTimeout(timer);
        }
        prevConnectedRef.current = connected;
    }, [connected]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedChatData = chats.find(c => c.id === selectedChatId);

    // CRM lookup for selected chat (for header badges)
    const { deal: headerDeal, refresh: refreshHeaderDeal } = useCrmLookup(selectedChatData?.phone);

    const filteredChats = useMemo(() => {
        let filtered = chats;

        // Apply tab filter
        if (chatFilter === "unread") {
            filtered = filtered.filter(c => c.unreadCount > 0);
        } else if (chatFilter === "groups") {
            filtered = filtered.filter(c => c.isGroup);
        }

        // Apply search
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            filtered = filtered.filter((chat) =>
                chat.name?.toLowerCase().includes(term) ||
                chat.phone?.toLowerCase().includes(term) ||
                chat.lastMessage?.text?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [chats, searchTerm, chatFilter]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedChatMessages]);

    // Ref pra o chat_jid atual — evita resubscribe do canal toda vez que user troca de chat.
    const selectedChatIdRef = useRef(selectedChatId);
    selectedChatIdRef.current = selectedChatId;

    // Carga inicial ao selecionar chat
    useEffect(() => {
        if (!connected || !selectedChatId) return;
        fetchMessages(selectedChatId, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, selectedChatId]);

    // Canal Realtime: subscribe UMA vez por usuário; filtro de chat_jid é feito em memória.
    useEffect(() => {
        if (!connected) return;
        const ownerId = targetUserId || user?.id;
        if (!ownerId) return;

        const channelName = `wa-msgs-${ownerId}`;
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "whatsapp_messages" },
                (payload: any) => {
                    const row = payload?.new;
                    if (!row) return;
                    if (row.user_id !== ownerId) return;
                    if (row.chat_jid !== selectedChatIdRef.current) return;
                    console.log("[WhatsApp Realtime] event matched:", {
                        chat_jid: row.chat_jid,
                        direction: row.direction,
                        body: row.body?.slice?.(0, 40),
                    });
                    appendRealtimeMessage(row, selectedChatIdRef.current || "");
                }
            )
            .subscribe((status, err) => {
                if (status === "SUBSCRIBED") {
                    console.log("[WhatsApp Realtime] subscribed:", channelName);
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                    console.warn("[WhatsApp Realtime] status:", status, err || "");
                }
            });

        // Safety net: resync a cada 15s caso Realtime perca um evento.
        const resync = setInterval(() => {
            const chatId = selectedChatIdRef.current;
            if (chatId) fetchMessages(chatId, true);
        }, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(resync);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, targetUserId, user?.id]);

    // Auto-select first chat
    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (!connected || chats.length === 0) {
            hasAutoSelected.current = false;
            return;
        }
        if (hasAutoSelected.current) return;
        if (selectedChatId && chats.some((chat) => chat.id === selectedChatId)) return;
        const firstChat = chats[0];
        if (!firstChat) return;
        hasAutoSelected.current = true;
        clearError();
        setSelectedChatId(firstChat.id);
        fetchMessages(firstChat.id, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, chats.length]);

    const handleSelectChat = (id: string) => {
        clearError();
        setSelectedChatId(id);
        setAiSuggestion(null);
        fetchMessages(id, false);
    };

    // ON-DEMAND AI analysis (no auto-trigger)
    const handleAnalyze = () => {
        if (rateLimited || aiThinking || !selectedChatId) return;
        const chat = chats.find(c => c.id === selectedChatId);
        if (chat?.isGroup) return;
        const msgs = selectedChatMessages.map(m => ({ text: m.text, sender: m.sender }));
        getAiAnalysis("", msgs, chat?.name || "Lead", chat?.phone || "");
    };

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !selectedChatId) return;
        setInputText("");
        void sendMessage(selectedChatId, text).then(() => fetchChats());
    };

    // Create deal from header dialog
    const handleCreateDealFromHeader = async () => {
        if (!selectedChatData || !user) return;
        const title = newDealTitleDialog.trim() || `Lead - ${selectedChatData.name}`;
        const value = parseFloat(newDealValueDialog.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
        setCreatingDealDialog(true);
        try {
            const { error } = await supabase.from("deals").insert({
                title,
                value,
                customer_name: selectedChatData.name,
                customer_phone: selectedChatData.phone || null,
                customer_email: null,
                stage: "lead" as any,
                probability: 10,
                position: 0,
                user_id: user.id,
                company_id: activeCompanyId || companyId || null,
                is_hot: false,
            });
            if (error) throw error;
            toast.success("Lead criado no CRM!");
            setShowCreateDealDialog(false);
            setNewDealTitleDialog("");
            setNewDealValueDialog("");
            refreshHeaderDeal();
        } catch {
            toast.error("Erro ao criar lead");
        } finally {
            setCreatingDealDialog(false);
        }
    };

    // Change stage from header
    const handleHeaderStageChange = async (newStage: string) => {
        if (!headerDeal) return;
        setHeaderStageUpdating(true);
        try {
            await updateDealStage(headerDeal.id, newStage);
            toast.success("Estágio atualizado!");
            refreshHeaderDeal();
        } catch {
            toast.error("Erro ao atualizar estágio");
        } finally {
            setHeaderStageUpdating(false);
        }
    };

    const handleUseDraft = () => {
        if (aiSuggestion?.draft) {
            setInputText(aiSuggestion.draft);
        }
    };

    const handleTemplateSelect = (text: string) => {
        setInputText(text);
        setShowQuickReplies(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChatId) return;
        try {
            const base64 = await fileToBase64(file);
            await sendMediaMessage(selectedChatId, base64, file.type, { fileName: file.name });
            fetchChats();
        } catch (err) {
            console.error("[handleFileSelect] error:", err);
        }
        // Reset input so same file can be selected again
        e.target.value = "";
    };

    const handleAudioSend = async (base64: string) => {
        console.log("[handleAudioSend] chatId:", selectedChatId, "base64Length:", base64?.length);
        if (!selectedChatId) return;
        setIsRecording(false);
        try {
            await sendAudioMessage(selectedChatId, base64);
            fetchChats();
        } catch (err) {
            console.error("[handleAudioSend] error:", err);
        }
    };

    // Close attach menu on click outside
    useEffect(() => {
        if (!showAttachMenu) return;
        const handler = (e: MouseEvent) => {
            if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
                setShowAttachMenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showAttachMenu]);

    const handleEvaSuggest = () => {
        if (!selectedChatData?.isGroup) {
            handleAnalyze();
        }
    };

    // Count helpers for filter tabs
    const unreadCount = useMemo(() => chats.filter(c => c.unreadCount > 0).length, [chats]);
    const groupCount = useMemo(() => chats.filter(c => c.isGroup).length, [chats]);

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-theme(spacing.16))] w-full bg-background overflow-hidden relative font-sans">
            {/* ─── Left Panel (Chat List) ─── */}
            <div className={`w-full md:w-[320px] md:min-w-[300px] md:max-w-[360px] h-full md:h-full border-r-0 md:border-r border-b md:border-b-0 border-border flex-col bg-background z-20 transition-colors ${selectedChatId && isMobile ? 'hidden' : 'flex'}`}>
                {/* Header */}
                <div className="h-[56px] flex items-center justify-between px-4 shrink-0 border-b border-border">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[15px] font-semibold text-foreground tracking-tight">Pulse</span>
                        <span className={`inline-flex h-1.5 w-1.5 rounded-full shrink-0 ${connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} title={connected ? 'Conectado' : 'Desconectado'} />
                        {connected && (
                            <button onClick={logout} className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                sair
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={refreshConnection} disabled={connecting}>
                            <RefreshCcw className={`h-3.5 w-3.5 ${connecting ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => setIsConfigModalOpen(true)}>
                            <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Admin Seller Selector */}
                {canViewOthers && (
                    <div className="px-3 pt-2.5 pb-1 shrink-0">
                        <Select value={targetUserId || "mine"} onValueChange={handleSellerChange}>
                            <SelectTrigger className="h-8 bg-muted/30 border-border text-[12px] font-medium rounded-md">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <SelectValue placeholder="Minha caixa" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mine">Minha caixa</SelectItem>
                                {sellerInstances
                                    .filter(s => s.userId !== user?.id)
                                    .map(seller => (
                                        <SelectItem key={seller.userId} value={seller.userId}>
                                            <span className="flex items-center gap-2">
                                                {seller.name}
                                                {seller.connected && (
                                                    <span className="inline-flex h-1 w-1 rounded-full bg-emerald-500" />
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                {loadingSellers && (
                                    <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
                                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Carregando...
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        {viewingSellerName && (
                            <div className="mt-1.5 px-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                                    <User className="h-2.5 w-2.5" />
                                    Vendo: {viewingSellerName}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="px-3 pt-2.5 pb-2 shrink-0">
                    <div className="bg-muted/30 rounded-md flex items-center px-2.5 h-8 border border-border focus-within:border-muted-foreground/30 transition-colors">
                        <Search className="h-3.5 w-3.5 text-muted-foreground/60 mr-2 shrink-0" />
                        <Input placeholder="Buscar" className="bg-transparent border-0 focus-visible:ring-0 text-[12px] placeholder:text-muted-foreground/40 p-0 h-auto" disabled={!connected} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Filter Tabs — underline style */}
                {connected && (
                    <div className="flex items-center gap-4 px-4 pb-0 shrink-0 border-b border-border">
                        {([
                            { id: "all", label: "Todos", count: null },
                            { id: "unread", label: "Não lidos", count: unreadCount },
                            { id: "groups", label: "Grupos", count: groupCount },
                        ] as const).map((tab) => {
                            const active = chatFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setChatFilter(tab.id)}
                                    className={`relative py-2 text-[11.5px] font-medium transition-colors flex items-center gap-1.5 ${
                                        active ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count !== null && tab.count > 0 && (
                                        <span className="text-[10px] tabular-nums text-muted-foreground/40">{tab.count}</span>
                                    )}
                                    {active && (
                                        <span className="absolute bottom-[-1px] left-0 right-0 h-[1.5px] bg-foreground" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {connected ? (
                        isLoadingChats ? (
                            <div className="flex items-center justify-center py-10 text-muted-foreground/50">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span className="text-[12px]">Carregando</span>
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <p className="text-[12px] text-muted-foreground/60">
                                    {searchTerm ? "Nenhum resultado" : chatFilter === "unread" ? "Tudo lido" : chatFilter === "groups" ? "Sem grupos" : "Sem conversas"}
                                </p>
                            </div>
                        ) : filteredChats.map((chat) => {
                            const isSelected = selectedChatId === chat.id;
                            const hasUnread = chat.unreadCount > 0;
                            const lastText = chat.lastMessage?.text || "";
                            const lastIsAudio = lastText.includes("Áudio") || lastText.includes("ptt") || lastText.includes("audio");
                            const lastIsImage = lastText.includes("Imagem") || lastText.startsWith("📷");
                            const lastIsVideo = lastText.includes("Vídeo") || lastText.startsWith("🎥");
                            const lastIsDoc = lastText.includes("Documento") || lastText.startsWith("📎");
                            const lastIsSticker = lastText.includes("Sticker") || lastText.startsWith("🏷");
                            const previewText = lastIsAudio ? "Áudio" : lastIsImage ? "Foto" : lastIsVideo ? "Vídeo" : lastIsDoc ? lastText.replace("📎 ", "") : lastIsSticker ? "Sticker" : (lastText || "—");
                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat.id)}
                                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors relative ${
                                        isSelected
                                            ? 'bg-muted/50 before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:w-[2px] before:bg-foreground'
                                            : 'hover:bg-muted/25'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="h-9 w-9 rounded-md">
                                            {chat.profilePicUrl && <AvatarImage src={chat.profilePicUrl} className="object-cover" />}
                                            <AvatarFallback className={`text-[11px] font-semibold rounded-md ${chat.isGroup ? 'bg-muted text-muted-foreground' : 'bg-muted/70 text-foreground/70'}`}>
                                                {chat.isGroup ? <Users className="h-4 w-4" /> : chat.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {hasUnread && !isSelected && (
                                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-foreground border-[1.5px] border-background" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <h3 className={`text-[13px] truncate leading-tight ${hasUnread || isSelected ? 'font-semibold text-foreground' : 'font-medium text-foreground/85'}`}>
                                                {chat.name}
                                            </h3>
                                            <span className="text-[10px] shrink-0 tabular-nums text-muted-foreground/50 font-medium">
                                                {chat.lastMessage?.time || ""}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {chat.lastMessage?.isMe && (
                                                <CheckCircle2 className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                            )}
                                            {lastIsAudio && <Mic className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />}
                                            <p className={`text-[11.5px] truncate leading-snug ${hasUnread ? 'text-foreground/70' : 'text-muted-foreground/50'}`}>
                                                {previewText}
                                            </p>
                                            {hasUnread && (
                                                <span className="ml-auto shrink-0 text-[10px] tabular-nums font-semibold text-foreground">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center h-full gap-2">
                            <p className="text-[12px] text-muted-foreground/60">Desconectado</p>
                            <p className="text-[11px] text-muted-foreground/40">Conecte pra ver as conversas</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Main Chat Area ─── */}
            <div className={`flex-1 flex-col relative w-full h-full md:h-full bg-background z-10 transition-all duration-500 ${!selectedChatId && isMobile ? 'hidden' : 'flex'}`}>
                <div className="absolute inset-0 z-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>

                {/* Connection success overlay */}
                {justConnected && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="flex flex-col items-center animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-700">
                            <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"></div>
                                <CheckCircle2 className="h-12 w-12 text-emerald-500 relative z-10" />
                            </div>
                            <h2 className="text-2xl font-black text-emerald-500 tracking-tight mb-2">Conectado!</h2>
                            <p className="text-muted-foreground text-[14px] font-medium">WhatsApp sincronizado com sucesso</p>
                        </div>
                    </div>
                )}

                {!connected ? (
                    /* ─── QR Code / Connect ─── */
                    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                        {qrCodeBase64 ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 relative z-10">
                                <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-2xl shadow-emerald-500/10 mb-6 sm:mb-8 relative border-4 border-emerald-500/20">
                                    <img src={qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} alt="QR Code WhatsApp" className="w-[min(220px,70vw)] h-[min(220px,70vw)] sm:w-[260px] sm:h-[260px] object-contain" />
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </div>
                                    <h3 className="text-xl font-extrabold tracking-tight">Aguardando leitura</h3>
                                </div>
                                <p className="text-[14px] text-muted-foreground text-center font-medium max-w-[320px] leading-relaxed">
                                    Abra o WhatsApp no celular, va em <strong>Dispositivos conectados</strong> e escaneie o codigo.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="h-24 w-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                                    <WhatsAppIcon className="h-12 w-12 text-emerald-500 relative z-10" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-extrabold mb-3 tracking-tight">Conectar WhatsApp</h3>
                                <p className="text-[13px] sm:text-[15px] text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-[380px] text-center font-medium px-4">
                                    Gere o QR Code para conectar seu WhatsApp ao Vyzon.
                                </p>
                                {error && (
                                    <p className="text-red-400 text-[12px] font-bold mb-6 bg-red-400/10 py-2.5 px-4 sm:px-5 rounded-xl flex items-center gap-2 max-w-[360px] text-center border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                    </p>
                                )}
                                <Button onClick={connect} disabled={connecting} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-500/25 h-12 sm:h-14 px-6 sm:px-10 rounded-2xl text-[14px] sm:text-[16px] transition-all hover:-translate-y-0.5">
                                    {connecting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando QR Code...</>) : (<><QrCode className="mr-2 h-5 w-5" />Ativar WhatsApp Hub</>)}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : !selectedChatData ? (
                    /* ─── No chat selected ─── */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                        <p className="text-[13px] text-muted-foreground/70 tracking-tight">Selecione uma conversa</p>
                        <p className="text-[11px] text-muted-foreground/40 mt-1">Use <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono">⌘K</kbd> para buscar</p>
                    </div>
                ) : (
                    /* ─── Active Chat ─── */
                    <>
                        {/* Chat Header */}
                        <div className="border-b border-border bg-background flex flex-col z-10 shrink-0">
                            <div className="h-14 flex items-center px-4 justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {/* Mobile back button */}
                                    <button
                                        onClick={() => setSelectedChatId(null)}
                                        className="md:hidden h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors shrink-0"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <Avatar className="h-7 w-7 rounded-md shrink-0">
                                        {selectedChatData.profilePicUrl && <AvatarImage src={selectedChatData.profilePicUrl} className="rounded-md" />}
                                        <AvatarFallback className="bg-white/[0.04] text-muted-foreground text-[10px] font-semibold rounded-md">
                                            {selectedChatData.isGroup ? <Users className="h-3.5 w-3.5" /> : selectedChatData.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0 leading-tight">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h2 className="text-[13px] font-semibold text-foreground truncate tracking-tight">{selectedChatData.name}</h2>
                                        </div>
                                        <p className="text-[10.5px] text-muted-foreground/60 truncate">
                                            {selectedChatData.isGroup ? "Grupo" : selectedChatData.phone || ""}
                                        </p>
                                    </div>
                                    {/* Stage select inline */}
                                    {headerDeal && (
                                        <div className="hidden md:flex items-center gap-1 ml-2 shrink-0">
                                            <Select
                                                value={headerDeal.stage}
                                                onValueChange={handleHeaderStageChange}
                                                disabled={headerStageUpdating}
                                            >
                                                <SelectTrigger className="h-6 text-[10px] font-medium border-border bg-white/[0.02] hover:bg-white/[0.04] gap-1 px-2 w-auto rounded-md text-muted-foreground">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getStageInfo(headerDeal.stage).bgColor.replace('/10', '/70')}`} />
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border">
                                                    {PIPELINE_STAGES.map(s => (
                                                        <SelectItem key={s.id} value={s.id} className="text-foreground focus:bg-white/[0.04] text-[11px]">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${s.bgColor.replace('/10', '/70')}`} />
                                                                {s.title}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {(() => {
                                                const idx = PIPELINE_STAGES.findIndex(s => s.id === headerDeal.stage);
                                                return idx >= 0 && idx < PIPELINE_STAGES.length - 2 ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-40"
                                                                    disabled={headerStageUpdating}
                                                                    onClick={() => handleHeaderStageChange(PIPELINE_STAGES[idx + 1].id)}
                                                                >
                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="bottom" className="text-[10px]">Avançar para {PIPELINE_STAGES[idx + 1]?.title}</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Mobile actions */}
                                <div className="flex md:hidden items-center gap-1 shrink-0">
                                    {!selectedChatData.isGroup && !headerDeal && (
                                        <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                                            onClick={() => {
                                                setNewDealTitleDialog(`Lead - ${selectedChatData.name}`);
                                                setShowCreateDealDialog(true);
                                            }}>
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {headerDeal && (
                                        <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                                            onClick={() => window.open(`/deals/${headerDeal.id}`, '_blank')}>
                                            <Target className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                                        onClick={() => setMobileSheetOpen(true)}>
                                        <PanelRightOpen className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Desktop actions */}
                                <div className="hidden md:flex items-center gap-1 shrink-0">
                                    {!selectedChatData.isGroup && !headerDeal && (
                                        <button
                                            onClick={() => {
                                                setNewDealTitleDialog(`Lead - ${selectedChatData.name}`);
                                                setShowCreateDealDialog(true);
                                            }}
                                            className="h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3 h-3" /> Adicionar ao CRM
                                        </button>
                                    )}
                                    {headerDeal && (
                                        <button
                                            onClick={() => window.open(`/deals/${headerDeal.id}`, '_blank')}
                                            className="h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors flex items-center gap-1.5"
                                        >
                                            <Target className="w-3 h-3" /> Pipeline
                                        </button>
                                    )}
                                    {!selectedChatData.isGroup && aiSuggestion && !aiThinking && (
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center gap-1 ${tempColor(aiSuggestion.temperature).replace('border-', 'text-').split(' ').filter(c => c.startsWith('text-')).join(' ') || 'text-muted-foreground'}`}>
                                            <TempIcon temp={aiSuggestion.temperature} />
                                            {aiSuggestion.temperature?.charAt(0).toUpperCase() + aiSuggestion.temperature?.slice(1)}
                                        </span>
                                    )}
                                    {!selectedChatData.isGroup && aiThinking && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md text-primary bg-primary/5 border border-primary/20 flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Eva
                                        </span>
                                    )}
                                    <div className="w-px h-4 bg-border mx-1" />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                                    {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-[10px]">{sidebarOpen ? "Fechar Eva" : "Abrir Eva"}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 z-10 flex flex-col gap-0.5 scroll-smooth relative bg-[#0b0d10]">
                            {isLoadingMessages ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                                </div>
                            ) : selectedChatMessages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <p className="text-[12px] text-muted-foreground/50">Nenhuma mensagem</p>
                                </div>
                            ) : selectedChatMessages.map((msgLine, i) => {
                                const msgDate = new Date(msgLine.timestamp * 1000);
                                const prevDate = i > 0 ? new Date(selectedChatMessages[i - 1].timestamp * 1000) : null;
                                const prevSender = i > 0 ? selectedChatMessages[i - 1].sender : null;
                                const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                                const isConsecutive = !showDateSep && prevSender === msgLine.sender;
                                const today = new Date();
                                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                                const dateLabel = msgDate.toDateString() === today.toDateString() ? "Hoje"
                                    : msgDate.toDateString() === yesterday.toDateString() ? "Ontem"
                                    : msgDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                                const isMe = msgLine.sender === 'me';
                                const msgId = msgLine.id || String(i);
                                const isAudio = !!msgLine.audioUrl || msgLine.text === "🎤 Áudio" || msgLine.text?.startsWith("[audio") || msgLine.text?.includes("ptt");
                                const isVisualMedia = msgLine.mediaType === "image" || msgLine.mediaType === "video" || msgLine.mediaType === "sticker";
                                return (
                                    <React.Fragment key={msgId}>
                                        {showDateSep && (
                                            <div className="flex justify-center my-4">
                                                <span className="text-[10px] font-medium tracking-wider text-muted-foreground/40 uppercase">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex max-w-[85%] sm:max-w-[60%] ${isMe ? 'self-end' : 'group'} relative ${isConsecutive ? '' : 'mt-3'}`}
                                            onMouseEnter={() => !isMe && setHoveredMsgId(msgId)}
                                            onMouseLeave={() => setHoveredMsgId(null)}
                                        >
                                            <div className={`relative ${isVisualMedia
                                                ? `p-1 rounded ${isMe ? 'bg-primary/90' : 'bg-[#14171b]'}`
                                                : `px-3 py-1.5 rounded ${isMe
                                                    ? 'bg-primary/90 text-primary-foreground'
                                                    : 'bg-[#14171b] text-foreground/90'
                                                }`
                                                }`}>
                                                {/* Group sender name */}
                                                {!isMe && selectedChatData.isGroup && msgLine.senderName && !isConsecutive && (
                                                    <p className="text-[10px] font-semibold text-muted-foreground/70 mb-0.5">{msgLine.senderName}</p>
                                                )}
                                                {/* Media content */}
                                                {isAudio ? (
                                                    <AudioMessagePlayer
                                                        messageId={msgLine.id}
                                                        audioUrl={msgLine.audioUrl}
                                                        duration={msgLine.audioDuration}
                                                        isMe={isMe}
                                                        getAudioMedia={getAudioMedia}
                                                    />
                                                ) : (msgLine.mediaType === "image" || msgLine.mediaType === "video" || msgLine.mediaType === "sticker") ? (
                                                    <MediaMessageBubble
                                                        messageId={msgLine.id}
                                                        mediaType={msgLine.mediaType}
                                                        caption={msgLine.mediaCaption}
                                                        isMe={isMe}
                                                        getAudioMedia={getAudioMedia}
                                                    />
                                                ) : (
                                                    <p className="text-[13px] leading-[1.5] whitespace-pre-wrap break-words">
                                                        {msgLine.text}
                                                    </p>
                                                )}
                                                {/* Timestamp + read receipt */}
                                                <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                                                    <span className={`text-[9px] tabular-nums ${isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/40'}`}>
                                                        {msgLine.time}
                                                    </span>
                                                    {isMe && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground/50" />}
                                                </div>
                                            </div>

                                            {/* Quick reply on hover */}
                                            {!isMe && hoveredMsgId === msgId && (
                                                <button
                                                    onClick={() => setInputText(`> "${msgLine.text.substring(0, 60)}${msgLine.text.length > 60 ? '...' : ''}"\n\n`)}
                                                    className="absolute -right-7 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md bg-[#14171b] border border-border flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:border-white/20 transition-colors"
                                                    title="Responder"
                                                >
                                                    <Reply className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <div className="bg-[#0b0d10] border-t border-border px-4 py-2.5 z-10 shrink-0">
                            {/* Quick Replies Dropdown (above input) */}
                            {showQuickReplies && (
                                <div ref={quickRepliesRef}>
                                    <TemplatePicker
                                        companyId={activeCompanyId}
                                        userId={user?.id}
                                        onSelect={handleTemplateSelect}
                                        onClose={() => setShowQuickReplies(false)}
                                        contactName={selectedChatData?.name}
                                        contactPhone={selectedChatData?.phone}
                                        dealValue={headerDeal?.value ?? undefined}
                                        dealStage={headerDeal?.stage}
                                        companyName={activeCompanyName}
                                    />
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept={fileInputTypeRef.current === "image" ? "image/*,video/*" : "*/*"}
                                onChange={handleFileSelect}
                            />

                            {isRecording ? (
                                <AudioRecorder
                                    onSend={handleAudioSend}
                                    onCancel={() => setIsRecording(false)}
                                />
                            ) : (
                            <div className="flex items-center gap-1 bg-[#14171b] border border-border rounded-md px-1 focus-within:border-white/[0.12] transition-colors">
                                {/* Left action buttons */}
                                <div className="flex items-center shrink-0 relative">
                                    <button
                                        className={`h-8 w-8 rounded-md shrink-0 flex items-center justify-center transition-colors ${showAttachMenu ? 'text-foreground bg-white/[0.06]' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]'}`}
                                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </button>

                                    {/* Attachment menu popup */}
                                    {showAttachMenu && (
                                        <div
                                            ref={attachMenuRef}
                                            className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-150 w-44 z-20"
                                        >
                                            <button
                                                onClick={() => {
                                                    fileInputTypeRef.current = "image";
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.accept = "image/*,video/*";
                                                        fileInputRef.current.click();
                                                    }
                                                    setShowAttachMenu(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors flex items-center gap-2.5 text-[12px] text-foreground/80"
                                            >
                                                <Image className="w-3.5 h-3.5 text-muted-foreground" />
                                                Imagem / Vídeo
                                            </button>
                                            <button
                                                onClick={() => {
                                                    fileInputTypeRef.current = "document";
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";
                                                        fileInputRef.current.click();
                                                    }
                                                    setShowAttachMenu(false);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors flex items-center gap-2.5 text-[12px] text-foreground/80"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                                Documento
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        className={`h-8 w-8 rounded-md shrink-0 flex items-center justify-center transition-colors ${showQuickReplies ? 'text-foreground bg-white/[0.06]' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]'}`}
                                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                                    >
                                        <Zap className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Main Input */}
                                <Input
                                    placeholder="Mensagem..."
                                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-[13px] px-2 h-9 text-foreground placeholder:text-muted-foreground/40"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                />

                                {/* Right action buttons */}
                                <div className="flex items-center shrink-0 gap-0.5">
                                    {/* Eva Suggest */}
                                    {!selectedChatData.isGroup && (
                                        <button
                                            className={`h-8 w-8 rounded-md shrink-0 flex items-center justify-center transition-colors ${aiThinking ? 'text-primary bg-primary/10' : 'text-muted-foreground/60 hover:text-primary hover:bg-white/[0.04]'}`}
                                            onClick={handleEvaSuggest}
                                            disabled={aiThinking || rateLimited}
                                        >
                                            <Bot className={`h-4 w-4 ${aiThinking ? 'animate-pulse' : ''}`} />
                                        </button>
                                    )}
                                    {/* Send or Mic */}
                                    {inputText.trim() ? (
                                        <button
                                            className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                            onClick={handleSend}
                                            title="Enviar (Enter)"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                                            onClick={() => setIsRecording(true)}
                                        >
                                            <Mic className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ─── Eva AI Copilot Sidebar (right) ─── */}
            {connected && (
                <CopilotSidebar
                    chat={selectedChatData}
                    messages={selectedChatMessages.map(m => ({ text: m.text, sender: m.sender }))}
                    aiThinking={aiThinking}
                    aiSuggestion={aiSuggestion}
                    remaining={remaining}
                    rateLimited={rateLimited}
                    onAnalyze={handleAnalyze}
                    onUseDraft={handleUseDraft}
                    sidebarOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                />
            )}

            {/* ─── Mobile Eva Sheet ─── */}
            {connected && (
                <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                    <SheetContent side="right" className="w-[90vw] sm:w-[400px] p-0 bg-card/95 backdrop-blur-xl border-white/5">
                        <SheetTitle className="sr-only">Eva AI</SheetTitle>
                        <CopilotSidebar
                            chat={selectedChatData}
                            messages={selectedChatMessages.map(m => ({ text: m.text, sender: m.sender }))}
                            aiThinking={aiThinking}
                            aiSuggestion={aiSuggestion}
                            remaining={remaining}
                            rateLimited={rateLimited}
                            onAnalyze={handleAnalyze}
                            onUseDraft={handleUseDraft}
                            sidebarOpen={true}
                            onToggle={() => setMobileSheetOpen(false)}
                            containerClassName="flex"
                        />
                    </SheetContent>
                </Sheet>
            )}

            {/* ─── Create Deal Dialog ─── */}
            <Dialog open={showCreateDealDialog} onOpenChange={setShowCreateDealDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[15px]">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                            Adicionar ao CRM
                        </DialogTitle>
                        <DialogDescription className="text-[12px]">
                            Crie um lead no pipeline para acompanhar este contato.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Título do Lead</label>
                            <Input
                                value={newDealTitleDialog}
                                onChange={(e) => setNewDealTitleDialog(e.target.value)}
                                placeholder="Ex: Lead - João Silva"
                                className="h-10 text-[13px] bg-background/60 border-white/10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Valor estimado (R$)</label>
                            <Input
                                value={newDealValueDialog}
                                onChange={(e) => setNewDealValueDialog(e.target.value)}
                                placeholder="0,00"
                                className="h-10 text-[13px] bg-background/60 border-white/10"
                            />
                        </div>
                        {selectedChatData && (
                            <div className="rounded-lg bg-muted/20 border border-white/5 px-3 py-2.5 flex items-center gap-3">
                                <Avatar className="h-8 w-8 ring-1 ring-white/10">
                                    {selectedChatData.profilePicUrl && <AvatarImage src={selectedChatData.profilePicUrl} />}
                                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                                        {selectedChatData.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-foreground truncate">{selectedChatData.name}</p>
                                    {selectedChatData.phone && <p className="text-[10px] text-muted-foreground">{selectedChatData.phone}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 pt-2">
                        <Button variant="outline" onClick={() => setShowCreateDealDialog(false)} className="text-[12px]">
                            Cancelar
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-bold gap-1.5"
                            onClick={handleCreateDealFromHeader}
                            disabled={creatingDealDialog}
                        >
                            {creatingDealDialog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Criar Lead
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Config Modal */}
            <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                            Conexão WhatsApp
                        </DialogTitle>
                        <DialogDescription>
                            Configuração da conexão gerenciada pelo servidor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instancia</span>
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-foreground">{config.instanceName}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modo</span>
                                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">Gerenciado</Badge>
                            </div>
                        </div>
                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>Fechar</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={async () => { clearError(); await refreshConnection(); setIsConfigModalOpen(false); }}>
                            Atualizar status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
export default WhatsApp;
