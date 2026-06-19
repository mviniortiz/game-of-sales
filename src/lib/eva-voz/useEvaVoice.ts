import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// EVA VOZ — conversa por voz BIDIRECIONAL robusta com Gemini Live, reescrita do
// zero (separada do useGeminiLive da demo). Decisões de robustez:
// - Entrada de áudio via AudioWorklet com resample real pra 16kHz (o ScriptProcessor
//   + AudioContext 16kHz mal formado era o que derrubava a sessão antes).
// - HALF-DUPLEX por turno: o mic só transmite quando é a vez do usuário (a EVA não
//   está falando). Mata eco, auto-interrupção e o acúmulo de contexto que dava 1011.
// - contextWindowCompression: contexto nunca estoura em conversas longas.
// - systemInstruction ENXUTO (prompt grande dava 1011).
// - Reconexão automática com backoff se a sessão cair, sem deixar mudo.
// - Fallback por texto sempre disponível (sendText).

export type VoiceStatus = "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";
export type VoiceOrb = "listening" | "thinking" | "speaking";

interface VoiceOpts {
    systemInstruction: string;
    voiceName?: string;
    greeting?: string; // 1ª fala da EVA
}

const MODEL_FALLBACK = "gemini-2.5-flash-native-audio-preview-12-2025";

function bytesToBase64(bytes: Uint8Array): string {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(bin);
}
function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

export function useEvaVoice() {
    const [status, setStatus] = useState<VoiceStatus>("idle");
    const [orb, setOrb] = useState<VoiceOrb>("listening");
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [evaText, setEvaText] = useState("");
    const [userText, setUserText] = useState("");
    const [micReady, setMicReady] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionRef = useRef<any>(null);
    const wsOpenRef = useRef(false);
    const intentionalRef = useRef(false);
    const retryRef = useRef(0);
    const optsRef = useRef<VoiceOpts | null>(null);

    const outCtxRef = useRef<AudioContext | null>(null);
    const playHeadRef = useRef(0);
    const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const micCtxRef = useRef<AudioContext | null>(null);
    const micNodeRef = useRef<AudioWorkletNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const evaBufRef = useRef("");
    const userBufRef = useRef("");
    const lastSpeakerRef = useRef<"user" | "eva" | "">("");
    const orbRef = useRef<VoiceOrb>("listening");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connectRef = useRef<((o: VoiceOpts, retry?: boolean) => void) | null>(null);

    // half-duplex: liga/desliga o envio do mic conforme a vez
    const setMicEnabled = (on: boolean) => {
        micNodeRef.current?.port.postMessage({ type: "enable", value: on });
    };
    // muda o estado do orb E sincroniza o mic (só transmite quando é a vez do usuário)
    const applyOrb = (s: VoiceOrb) => {
        if (orbRef.current === s) return; // evita re-render/postMessage a cada chunk
        orbRef.current = s;
        setOrb(s);
        setMicEnabled(s === "listening");
    };

    const stopPlayback = () => {
        sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
        sourcesRef.current = [];
        if (outCtxRef.current) playHeadRef.current = outCtxRef.current.currentTime;
    };

    const playChunk = (b64: string) => {
        const ctx = outCtxRef.current;
        if (!ctx) return;
        const bytes = base64ToBytes(b64);
        const len = Math.floor(bytes.byteLength / 2);
        const i16 = new Int16Array(bytes.buffer, bytes.byteOffset, len);
        const f32 = new Float32Array(len);
        for (let i = 0; i < len; i++) f32[i] = i16[i] / 32768;
        const buf = ctx.createBuffer(1, len, 24000);
        buf.copyToChannel(f32, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const t = Math.max(ctx.currentTime, playHeadRef.current);
        src.start(t);
        playHeadRef.current = t + buf.duration;
        sourcesRef.current.push(src);
        src.onended = () => { sourcesRef.current = sourcesRef.current.filter((s) => s !== src); };
    };

    const teardownAudio = () => {
        try { micNodeRef.current?.disconnect(); } catch { /* noop */ }
        micNodeRef.current = null;
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        try { micCtxRef.current?.close(); } catch { /* noop */ }
        micCtxRef.current = null;
        stopPlayback();
        try { outCtxRef.current?.close(); } catch { /* noop */ }
        outCtxRef.current = null;
    };

    const disconnect = useCallback(() => {
        intentionalRef.current = true;
        wsOpenRef.current = false;
        try { sessionRef.current?.close?.(); } catch { /* noop */ }
        sessionRef.current = null;
        teardownAudio();
        setStatus("ended");
        setOrb("listening");
    }, []);

    const sendText = useCallback((text: string) => {
        const t = text.trim();
        if (!t || !sessionRef.current) return;
        try {
            applyOrb("thinking");
            sessionRef.current.sendClientContent({ turns: [{ role: "user", parts: [{ text: t }] }], turnComplete: true });
            userBufRef.current = "";
            setUserText("");
        } catch { /* noop */ }
    }, []);

    const startMic = async (Ctx: typeof AudioContext) => {
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        } catch {
            setMicReady(false);
            return; // sem mic: ainda dá pra conversar por texto
        }
        if (!sessionRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        micStreamRef.current = stream;
        const micCtx = new Ctx(); // taxa NATIVA (não forçar 16k — fonte do bug antigo)
        await micCtx.resume().catch(() => undefined);
        micCtxRef.current = micCtx;
        try {
            await micCtx.audioWorklet.addModule("/eva-voz/mic-worklet.js");
        } catch {
            setMicReady(false);
            return;
        }
        if (!sessionRef.current) return;
        const node = new AudioWorkletNode(micCtx, "eva-mic-worklet");
        micNodeRef.current = node;
        node.port.onmessage = (e) => {
            if (!sessionRef.current || !wsOpenRef.current) return;
            const pcm = e.data as Int16Array;
            const b64 = bytesToBase64(new Uint8Array(pcm.buffer));
            try { sessionRef.current.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } }); } catch { /* noop */ }
        };
        const srcNode = micCtx.createMediaStreamSource(stream);
        srcNode.connect(node);
        // worklet não precisa ir pro destino (não queremos ouvir o próprio mic)
        setMicReady(true);
        // sincroniza com o estado atual: se a saudação já terminou (listening),
        // abre o mic agora (corrige a corrida node-pronto vs turnComplete).
        setMicEnabled(orbRef.current === "listening");
    };

    const connect = useCallback(async (opts: VoiceOpts, isRetry = false) => {
        optsRef.current = opts;
        setErrorReason(null);
        setStatus(isRetry ? "reconnecting" : "connecting");
        orbRef.current = "thinking";
        setOrb("thinking");
        wsOpenRef.current = false;
        intentionalRef.current = false;
        if (!isRetry) retryRef.current = 0;
        evaBufRef.current = ""; userBufRef.current = ""; lastSpeakerRef.current = "";
        setEvaText(""); setUserText("");
        try {
            const { data } = await supabase.functions.invoke("gemini-live-token", { body: {} });
            if (!data?.ok) { setErrorReason(data?.reason || "no_token"); setStatus("error"); return; }
            const token = data.token as string;
            const model = (data.model as string) || MODEL_FALLBACK;

            const { GoogleGenAI } = await import("@google/genai");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ai: any = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const outCtx = new Ctx({ sampleRate: 24000 });
            outCtxRef.current = outCtx;
            playHeadRef.current = outCtx.currentTime;
            outCtx.resume().catch(() => undefined);

            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: ["AUDIO"],
                    systemInstruction: opts.systemInstruction,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voiceName || "Achernar" } } },
                    thinkingConfig: { thinkingBudget: 0 },
                    contextWindowCompression: { slidingWindow: {} },
                    realtimeInputConfig: {
                        automaticActivityDetection: {
                            startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
                            endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                            prefixPaddingMs: 300,
                            silenceDurationMs: 800,
                        },
                    },
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => { wsOpenRef.current = true; setStatus("live"); },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onmessage: (msg: any) => {
                        const sc = msg.serverContent;
                        if (sc?.interrupted) { stopPlayback(); applyOrb("listening"); }
                        if (sc?.modelTurn?.parts) {
                            for (const p of sc.modelTurn.parts) {
                                if (p.inlineData?.data) {
                                    applyOrb("speaking"); // half-duplex: cala o mic enquanto ela fala
                                    playChunk(p.inlineData.data);
                                }
                            }
                        }
                        const it = sc?.inputTranscription?.text as string | undefined;
                        const ot = sc?.outputTranscription?.text as string | undefined;
                        if (it) {
                            const clean = it.replace(/<[^>]*>/g, "").replace(/\[[^\]]*\]/g, "");
                            if (clean.trim() || userBufRef.current) {
                                if (lastSpeakerRef.current !== "user") { evaBufRef.current = ""; userBufRef.current = ""; lastSpeakerRef.current = "user"; }
                                userBufRef.current += clean;
                                setUserText(userBufRef.current);
                            }
                        }
                        if (ot) {
                            if (lastSpeakerRef.current !== "eva") { userBufRef.current = ""; evaBufRef.current = ""; lastSpeakerRef.current = "eva"; }
                            evaBufRef.current += ot;
                            setEvaText(evaBufRef.current);
                        }
                        if (sc?.turnComplete) {
                            applyOrb("listening"); // devolve a vez ao usuário
                        }
                    },
                    onerror: () => { wsOpenRef.current = false; },
                    onclose: () => {
                        wsOpenRef.current = false;
                        if (!intentionalRef.current && retryRef.current < 3) {
                            retryRef.current += 1;
                            setStatus("reconnecting");
                            window.setTimeout(() => { if (optsRef.current) connectRef.current?.(optsRef.current, true); }, 500 * retryRef.current);
                            return;
                        }
                        if (!intentionalRef.current) { setStatus((s) => (s === "error" ? s : "ended")); }
                    },
                },
            });
            sessionRef.current = session;

            // saudação: a EVA fala primeiro; o mic abre quando ela terminar (turnComplete)
            const greet = opts.greeting || "Cumprimente em uma frase calorosa e pergunte como pode ajudar.";
            try { session.sendClientContent({ turns: [{ role: "user", parts: [{ text: greet }] }], turnComplete: true }); } catch { /* noop */ }

            // microfone via AudioWorklet (não bloqueia a fala da EVA)
            await startMic(Ctx);
            retryRef.current = 0; // conexão estável: zera o orçamento de retry
        } catch (e) {
            console.error("[useEvaVoice] connect error", e);
            if (!intentionalRef.current && retryRef.current < 3) {
                retryRef.current += 1;
                setStatus("reconnecting");
                window.setTimeout(() => { if (optsRef.current) connectRef.current?.(optsRef.current, true); }, 500 * retryRef.current);
                return;
            }
            setErrorReason("exception");
            setStatus("error");
            teardownAudio();
        }
    }, []);

    connectRef.current = connect as unknown as (o: VoiceOpts, retry?: boolean) => void;

    return { status, orb, errorReason, evaText, userText, micReady, connect, disconnect, sendText };
}
