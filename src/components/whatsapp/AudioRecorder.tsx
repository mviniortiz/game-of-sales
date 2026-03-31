import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send } from "lucide-react";

export function AudioRecorder({
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
    const [bars, setBars] = useState<number[]>(new Array(28).fill(4));

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

            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.7;
            source.connect(analyser);
            analyserRef.current = analyser;
            audioCtxRef.current = audioCtx;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateBars = () => {
                analyser.getByteFrequencyData(dataArray);
                const newBars: number[] = [];
                const binCount = 28;
                const step = Math.floor(dataArray.length / binCount);
                for (let i = 0; i < binCount; i++) {
                    const val = dataArray[i * step] || 0;
                    newBars.push(Math.max(3, (val / 255) * 28));
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
                className="h-10 w-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all hover:scale-105 shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-3 bg-card/80 rounded-2xl border border-red-500/20 px-4 h-12 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                </span>
                <span className="text-[13px] text-red-400 font-bold tabular-nums w-10">{formatTime(elapsed)}</span>
                <div className="flex-1 flex items-center justify-center gap-[2px]">
                    {bars.map((h, i) => (
                        <div
                            key={i}
                            className="w-[3px] rounded-full bg-gradient-to-t from-red-500/40 to-red-400/80"
                            style={{ height: `${h}px`, transition: "height 80ms ease-out" }}
                        />
                    ))}
                </div>
            </div>
            <button
                onClick={stopAndSend}
                className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white transition-all shadow-lg shadow-emerald-500/25 hover:scale-105 shrink-0"
            >
                <Send className="h-4 w-4" />
            </button>
        </div>
    );
}
