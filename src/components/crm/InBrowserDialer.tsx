import { useState, useEffect, useRef, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InBrowserDialerProps {
    dealId: string;
    customerPhone: string;
    customerName: string;
    callId: string | null;
    onCallStarted?: (callId: string) => void;
    onCallEnded?: () => void;
    onError?: (error: string) => void;
}

type DialerStatus =
    | "idle"
    | "fetching-token"
    | "ready"
    | "connecting"
    | "ringing"
    | "connected"
    | "disconnected"
    | "error";

const STATUS_LABELS: Record<DialerStatus, string> = {
    idle: "Preparando...",
    "fetching-token": "Obtendo token...",
    ready: "Pronto para ligar",
    connecting: "Conectando...",
    ringing: "Chamando...",
    connected: "Em chamada",
    disconnected: "Chamada encerrada",
    error: "Erro na conexão",
};

const STATUS_COLORS: Record<DialerStatus, string> = {
    idle: "text-slate-400",
    "fetching-token": "text-slate-400",
    ready: "text-emerald-400",
    connecting: "text-amber-400",
    ringing: "text-amber-400",
    connected: "text-emerald-400",
    disconnected: "text-slate-400",
    error: "text-red-400",
};

export default function InBrowserDialer({
    dealId,
    customerPhone,
    customerName,
    callId: externalCallId,
    onCallStarted,
    onCallEnded,
    onError,
}: InBrowserDialerProps) {
    const [status, setStatus] = useState<DialerStatus>("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const deviceRef = useRef<Device | null>(null);
    const activeCallRef = useRef<Call | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callIdRef = useRef<string | null>(externalCallId);

    // Format duration as MM:SS
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // Cleanup timer
    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Start duration timer
    const startTimer = useCallback(() => {
        stopTimer();
        setDuration(0);
        timerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
        }, 1000);
    }, [stopTimer]);

    // Initialize Twilio Device on mount
    useEffect(() => {
        let cancelled = false;

        async function init() {
            setStatus("fetching-token");

            try {
                const { data, error } = await supabase.functions.invoke("twilio-generate-token", {
                    body: {},
                });

                if (cancelled) return;

                if (error || !data?.token) {
                    const msg = data?.error || error?.message || "Falha ao obter token";
                    setStatus("error");
                    setErrorMessage(msg);
                    onError?.(msg);
                    return;
                }

                const device = new Device(data.token, {
                    codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
                    enableRingingState: true,
                });

                device.on("registered", () => {
                    if (!cancelled) setStatus("ready");
                });

                device.on("error", (err) => {
                    console.error("[InBrowserDialer] device error:", err);
                    if (!cancelled) {
                        setStatus("error");
                        setErrorMessage(err.message || "Erro no dispositivo");
                    }
                });

                device.on("tokenWillExpire", async () => {
                    // Refresh token before it expires
                    try {
                        const { data: refreshData } = await supabase.functions.invoke("twilio-generate-token", { body: {} });
                        if (refreshData?.token) {
                            device.updateToken(refreshData.token);
                        }
                    } catch (e) {
                        console.warn("[InBrowserDialer] token refresh failed:", e);
                    }
                });

                await device.register();
                deviceRef.current = device;

                if (!cancelled) setStatus("ready");
            } catch (err: any) {
                if (!cancelled) {
                    const msg = err?.message || "Erro ao inicializar";
                    setStatus("error");
                    setErrorMessage(msg);
                    onError?.(msg);
                }
            }
        }

        init();

        return () => {
            cancelled = true;
            stopTimer();
            if (activeCallRef.current) {
                try { activeCallRef.current.disconnect(); } catch { /* noop */ }
            }
            if (deviceRef.current) {
                try { deviceRef.current.destroy(); } catch { /* noop */ }
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Make the call
    const handleCall = useCallback(async () => {
        if (!deviceRef.current || status !== "ready") return;

        setStatus("connecting");
        setErrorMessage(null);

        try {
            // Create call record in DB first
            let currentCallId = callIdRef.current;
            if (!currentCallId) {
                const { data: initiateData, error: initiateError } = await supabase.functions.invoke("deal-call-initiate", {
                    body: {
                        dealId,
                        mode: "webrtc",
                        customerPhone,
                    },
                });

                if (initiateError || !initiateData?.call?.id) {
                    throw new Error(initiateData?.error || initiateError?.message || "Falha ao criar registro da chamada");
                }

                currentCallId = initiateData.call.id;
                callIdRef.current = currentCallId;
                onCallStarted?.(currentCallId);
            }

            // Connect via WebRTC
            const call = await deviceRef.current.connect({
                params: {
                    callId: currentCallId!,
                    customerPhone,
                    conference: `deal-call-${currentCallId}`,
                },
            });

            activeCallRef.current = call;

            call.on("ringing", () => {
                setStatus("ringing");
            });

            call.on("accept", () => {
                setStatus("connected");
                startTimer();
            });

            call.on("disconnect", () => {
                setStatus("disconnected");
                stopTimer();
                activeCallRef.current = null;
                onCallEnded?.();
            });

            call.on("cancel", () => {
                setStatus("disconnected");
                stopTimer();
                activeCallRef.current = null;
                onCallEnded?.();
            });

            call.on("error", (err) => {
                console.error("[InBrowserDialer] call error:", err);
                setStatus("error");
                setErrorMessage(err.message || "Erro na chamada");
                stopTimer();
                activeCallRef.current = null;
            });
        } catch (err: any) {
            const msg = err?.message || "Erro ao conectar";
            setStatus("error");
            setErrorMessage(msg);
            onError?.(msg);
        }
    }, [status, dealId, customerPhone, startTimer, stopTimer, onCallStarted, onCallEnded, onError]);

    // Hang up
    const handleHangup = useCallback(() => {
        if (activeCallRef.current) {
            activeCallRef.current.disconnect();
            activeCallRef.current = null;
        }
        stopTimer();
        setStatus("disconnected");
        onCallEnded?.();
    }, [stopTimer, onCallEnded]);

    // Toggle mute
    const handleToggleMute = useCallback(() => {
        if (activeCallRef.current) {
            const newMuted = !isMuted;
            activeCallRef.current.mute(newMuted);
            setIsMuted(newMuted);
        }
    }, [isMuted]);

    const isCallActive = status === "connecting" || status === "ringing" || status === "connected";
    const canCall = status === "ready";
    const showTimer = status === "connected" || (status === "disconnected" && duration > 0);

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                        status === "connected" ? "bg-emerald-400 animate-pulse" :
                        status === "ringing" || status === "connecting" ? "bg-amber-400 animate-pulse" :
                        status === "error" ? "bg-red-400" :
                        "bg-slate-500"
                    }`} />
                    <span className={`text-sm font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                    </span>
                </div>
                {showTimer && (
                    <span className="text-sm font-mono text-slate-300">{formatDuration(duration)}</span>
                )}
            </div>

            {/* Contact info */}
            <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm text-white font-medium">{customerName}</p>
                <p className="text-xs text-slate-400">{customerPhone}</p>
            </div>

            {/* Error message */}
            {errorMessage && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">{errorMessage}</p>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
                {!isCallActive && status !== "disconnected" && (
                    <Button
                        onClick={handleCall}
                        disabled={!canCall}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-full h-14 w-14 p-0"
                    >
                        {status === "fetching-token" || status === "idle" ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <Phone className="h-6 w-6" />
                        )}
                    </Button>
                )}

                {isCallActive && (
                    <>
                        <Button
                            onClick={handleToggleMute}
                            variant="outline"
                            className={`rounded-full h-12 w-12 p-0 border-slate-600 ${
                                isMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "text-slate-300 hover:text-white"
                            }`}
                        >
                            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>

                        <Button
                            onClick={handleHangup}
                            className="bg-red-500 hover:bg-red-400 text-white rounded-full h-14 w-14 p-0"
                        >
                            <PhoneOff className="h-6 w-6" />
                        </Button>
                    </>
                )}

                {status === "disconnected" && (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                callIdRef.current = null;
                                setStatus("ready");
                                setDuration(0);
                            }}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:text-white"
                        >
                            <Phone className="h-4 w-4 mr-2" />
                            Ligar novamente
                        </Button>
                    </div>
                )}
            </div>

            {/* Audio indicator */}
            {status === "connected" && (
                <div className="flex items-center justify-center gap-1">
                    <Volume2 className="h-3 w-3 text-emerald-400" />
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="w-1 bg-emerald-400 rounded-full animate-pulse"
                                style={{
                                    height: `${8 + Math.random() * 12}px`,
                                    animationDelay: `${i * 0.15}s`,
                                    animationDuration: `${0.6 + Math.random() * 0.4}s`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
