import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// LP.7 (v2) — hook da conversa por voz ao vivo com Gemini Live API. Pega um
// token efêmero (edge gemini-live-token), conecta via @google/genai (WebSocket),
// captura o microfone em PCM16 16kHz, reproduz o áudio dela (24kHz), trata
// interrupção (barge-in) e os tool calls (ela "abre" telas da demo). Tudo é
// PoC: precisa de GEMINI_API_KEY no Supabase + permissão de microfone.

export type LiveStatus = "idle" | "connecting" | "live" | "ended" | "error";
export type LiveOrbState = "thinking" | "speaking" | "listening";

interface ConnectOpts {
    systemInstruction: string;
    voiceName?: string;
    tools?: unknown[];
    kickoff?: string; // turno inicial pra EVA começar a falar sozinha
    onToolCall?: (name: string, args: Record<string, unknown>) => unknown;
    onCaption?: (text: string, role: "user" | "eva") => void;
    captureMic?: boolean; // capturar a voz de entrada (off por padrão — vide tour guiado)
}

const LIVE_MODEL_FALLBACK = "gemini-2.5-flash-native-audio-preview-12-2025";

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

export function useGeminiLive() {
    const [status, setStatus] = useState<LiveStatus>("idle");
    const [orbState, setOrbState] = useState<LiveOrbState>("thinking");
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [userText, setUserText] = useState("");
    const [evaText, setEvaText] = useState("");
    const [turns, setTurns] = useState<{ role: "user" | "eva"; text: string }[]>([]);
    const [micOn, setMicOn] = useState(false);
    const turnsRef = useRef<{ role: "user" | "eva"; text: string }[]>([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionRef = useRef<any>(null);
    const wsOpenRef = useRef(false); // WS do Live realmente OPEN (evita send em socket morto)
    const gotAudioRef = useRef(false);   // a EVA já produziu áudio nesta sessão?
    const retryRef = useRef(0);          // tentativas de reconexão (token novo) já feitas
    const intentionalRef = useRef(false); // disconnect proposital (não reconectar)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connectFnRef = useRef<((opts: any, retry?: boolean) => void) | null>(null);
    const micCtxRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const procRef = useRef<ScriptProcessorNode | null>(null);
    const outCtxRef = useRef<AudioContext | null>(null);
    const playHeadRef = useRef(0);
    const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const mutedRef = useRef(false);
    const userBufRef = useRef("");
    const evaBufRef = useRef("");
    const lastSpeakerRef = useRef<"user" | "eva" | "">("");
    // fila de revelação da legenda: cada delta de transcrição é exibido só quando
    // o áudio correspondente é OUVIDO (agora + lead de reprodução).
    const evaRevealRef = useRef<{ text: string; at: number }[]>([]);
    const evaRafRef = useRef<number | null>(null);

    const pushTurn = (role: "user" | "eva", text: string) => {
        const t = text.trim();
        if (!t) return;
        turnsRef.current = [...turnsRef.current, { role, text: t }].slice(-8);
        setTurns(turnsRef.current);
    };

    const stopPlayback = () => {
        sourcesRef.current.forEach((s) => {
            try { s.stop(); } catch { /* noop */ }
        });
        sourcesRef.current = [];
        if (outCtxRef.current) playHeadRef.current = outCtxRef.current.currentTime;
    };

    // revela a legenda no RITMO da reprodução: cada delta tem um "at" (quando o
    // áudio dele é ouvido); um rAF vai liberando os que já venceram.
    const pumpEvaReveal = () => {
        const now = performance.now();
        const q = evaRevealRef.current;
        let changed = false;
        while (q.length && q[0].at <= now) { evaBufRef.current += q.shift()!.text; changed = true; }
        if (changed) setEvaText(evaBufRef.current);
        evaRafRef.current = q.length ? requestAnimationFrame(pumpEvaReveal) : null;
    };
    const clearEvaReveal = () => {
        evaRevealRef.current = [];
        if (evaRafRef.current !== null) { cancelAnimationFrame(evaRafRef.current); evaRafRef.current = null; }
    };

    const playChunk = (b64: string) => {
        const ctx = outCtxRef.current;
        if (!ctx) return;
        const bytes = base64ToBytes(b64);
        const len = Math.floor(bytes.byteLength / 2);
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, len);
        const f32 = new Float32Array(len);
        for (let i = 0; i < len; i++) f32[i] = int16[i] / 32768;
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

    // captura do microfone (PCM16 16kHz → sendRealtimeInput). Extraída pra poder
    // LIGAR/DESLIGAR em runtime pelo botão de mic (estilo Handhold), em vez de só
    // no connect. Idempotente: não reabre se já está capturando.
    const startMic = useCallback(() => {
        if (micStreamRef.current || !sessionRef.current) return;
        navigator.mediaDevices
            .getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
            .then((stream) => {
                if (!sessionRef.current) { stream.getTracks().forEach((t) => t.stop()); return; } // já desconectou
                micStreamRef.current = stream;
                setMicOn(true);
                const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                const micCtx = new Ctx({ sampleRate: 16000 });
                micCtx.resume().catch(() => undefined);
                micCtxRef.current = micCtx;
                const srcNode = micCtx.createMediaStreamSource(stream);
                const proc = micCtx.createScriptProcessor(1024, 1, 1);
                procRef.current = proc;
                proc.onaudioprocess = (ev) => {
                    if (!sessionRef.current || !wsOpenRef.current) return;
                    const input = ev.inputBuffer.getChannelData(0);
                    const pcm = new Int16Array(input.length);
                    for (let i = 0; i < input.length; i++) {
                        const s = Math.max(-1, Math.min(1, input[i]));
                        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                    }
                    const b64 = bytesToBase64(new Uint8Array(pcm.buffer));
                    try { sessionRef.current.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } }); } catch { /* noop */ }
                };
                const sink = micCtx.createGain();
                sink.gain.value = 0;
                srcNode.connect(proc);
                proc.connect(sink);
                sink.connect(micCtx.destination);
            })
            .catch(() => { setMicOn(false); });
    }, []);

    const stopMic = useCallback(() => {
        try { procRef.current?.disconnect(); } catch { /* noop */ }
        procRef.current = null;
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        try { micCtxRef.current?.close(); } catch { /* noop */ }
        micCtxRef.current = null;
        setMicOn(false);
    }, []);

    // liga/desliga a captura do microfone em runtime (botão de mic).
    const setMicEnabled = useCallback((on: boolean) => { if (on) startMic(); else stopMic(); }, [startMic, stopMic]);

    const disconnect = useCallback(() => {
        intentionalRef.current = true;
        wsOpenRef.current = false;
        try { sessionRef.current?.close?.(); } catch { /* noop */ }
        sessionRef.current = null;
        stopMic();
        clearEvaReveal();
        stopPlayback();
        try { outCtxRef.current?.close(); } catch { /* noop */ }
        outCtxRef.current = null;
    }, [stopMic]);

    const setMuted = useCallback((m: boolean) => {
        mutedRef.current = m;
        if (m) stopPlayback();
    }, []);

    // Quanto áudio (ms) ainda está na fila pra tocar — i.e., o quanto a fala que a
    // pessoa OUVE está atrasada em relação ao que o modelo já gerou. A demo usa
    // isso pra trocar de tela no instante em que ela OUVE a transição, não quando
    // o modelo emite o tool call (que vem adiantado).
    const playbackLeadMs = useCallback(() => {
        const ctx = outCtxRef.current;
        if (!ctx) return 0;
        return Math.max(0, (playHeadRef.current - ctx.currentTime) * 1000);
    }, []);

    // envia uma pergunta por TEXTO pra EVA (a resposta vem por voz + transcrição).
    const sendText = useCallback((text: string) => {
        const t = text.trim();
        if (!t || !sessionRef.current) return;
        try {
            sessionRef.current.sendClientContent({ turns: [{ role: "user", parts: [{ text: t }] }], turnComplete: true });
            pushTurn("user", t); // texto digitado não gera inputTranscription — registramos aqui
        } catch { /* noop */ }
    }, []);

    // cutuca a EVA pra CONTINUAR (sem registrar na transcrição) — usado quando o
    // turno dela encerra no meio do tour e ela fica esperando.
    const nudge = useCallback((text: string) => {
        if (!sessionRef.current) return;
        try { sessionRef.current.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true }); } catch { /* noop */ }
    }, []);

    const connect = useCallback(async (opts: ConnectOpts, isRetry = false) => {
        setErrorReason(null);
        setStatus("connecting");
        setOrbState("thinking");
        wsOpenRef.current = false;
        gotAudioRef.current = false;
        intentionalRef.current = false;
        if (!isRetry) retryRef.current = 0;
        mutedRef.current = false;
        userBufRef.current = ""; evaBufRef.current = ""; lastSpeakerRef.current = "";
        turnsRef.current = [];
        clearEvaReveal();
        setUserText(""); setEvaText(""); setTurns([]);
        try {
            // 1. token efêmero
            const { data } = await supabase.functions.invoke("gemini-live-token", { body: {} });
            if (!data?.ok) {
                setErrorReason(data?.reason || "no_token");
                setStatus("error");
                return;
            }
            const token = data.token as string;
            const model = (data.model as string) || LIVE_MODEL_FALLBACK;

            // SDK (dynamic import — fora do bundle inicial). O microfone NÃO é
            // pedido aqui (era await ANTES da conexão e travava a fala se o
            // prompt de permissão fosse ignorado) — é capturado depois, sem bloquear.
            const { GoogleGenAI } = await import("@google/genai");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ai: any = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });

            // 4. saída de áudio @24kHz. NÃO damos await no resume: sem user
            // activation válida (o connect roda segundos após o clique), o
            // resume() pode ficar PENDENTE e travar a conexão inteira → a EVA
            // nunca conecta. Resumimos em background e na 1ª interação (gesture).
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const outCtx = new Ctx({ sampleRate: 24000 });
            outCtxRef.current = outCtx;
            playHeadRef.current = outCtx.currentTime;
            outCtx.resume().catch(() => undefined);
            if (outCtx.state !== "running") {
                const resumeOnGesture = () => {
                    outCtx.resume().catch(() => undefined);
                    if (outCtx.state === "running") {
                        ["pointerdown", "touchstart", "keydown"].forEach((ev) => window.removeEventListener(ev, resumeOnGesture));
                    }
                };
                ["pointerdown", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, resumeOnGesture, { passive: true }));
            }

            // 5. conexão Live
            const session = await ai.live.connect({
                model,
                config: {
                    responseModalities: ["AUDIO"],
                    systemInstruction: opts.systemInstruction,
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voiceName || "Sulafat" } } },
                    // thinking OFF: sem isso o native-audio gasta o turno "pensando"
                    // (latência ruim + raciocínio vazando); validado: 1ª fala em ~1.7s.
                    thinkingConfig: { thinkingBudget: 0 },
                    // comprime o histórico (janela deslizante) pra o contexto não
                    // estourar ao longo do tour (defesa extra contra o erro 1011).
                    contextWindowCompression: { slidingWindow: {} },
                    // VAD de BAIXA sensibilidade: ruído de fundo / eco da própria
                    // EVA NÃO interrompem a fala dela (era o que a deixava muda);
                    // voz real e clara ainda faz barge-in. + silêncio maior pra
                    // confirmar fim de fala.
                    realtimeInputConfig: {
                        automaticActivityDetection: {
                            startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
                            endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                            prefixPaddingMs: 300,
                            silenceDurationMs: 1000,
                        },
                    },
                    ...(opts.tools ? { tools: opts.tools } : {}),
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => { wsOpenRef.current = true; setStatus("live"); setOrbState("listening"); },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onmessage: (message: any) => {
                        const sc = message.serverContent;
                        if (sc?.interrupted) { stopPlayback(); clearEvaReveal(); setOrbState("listening"); }
                        if (sc?.modelTurn?.parts) {
                            for (const p of sc.modelTurn.parts) {
                                if (p.inlineData?.data) {
                                    gotAudioRef.current = true;
                                    if (!mutedRef.current) playChunk(p.inlineData.data);
                                    setOrbState("speaking");
                                }
                            }
                        }
                        // transcrição vem em deltas — acumular por turno (reseta
                        // o buffer de cada lado quando o falante muda)
                        const it = sc?.inputTranscription?.text as string | undefined;
                        const ot = sc?.outputTranscription?.text as string | undefined;
                        if (it) {
                            // limpa marcadores não-verbais que o ASR emite com ruído
                            // de fundo (ex "<noise>", "[silence]") — senão viram um
                            // "turno do usuário" fantasma que abre o chat e trava o tour.
                            const clean = it.replace(/<[^>]*>/g, "").replace(/\[[^\]]*\]/g, "");
                            if (clean.trim() || userBufRef.current) {
                                if (lastSpeakerRef.current !== "user") {
                                    if (evaBufRef.current.trim()) { pushTurn("eva", evaBufRef.current); setEvaText(""); }
                                    clearEvaReveal();
                                    userBufRef.current = "";
                                    lastSpeakerRef.current = "user";
                                }
                                userBufRef.current += clean;
                                setUserText(userBufRef.current);
                            }
                        }
                        if (ot) {
                            if (lastSpeakerRef.current !== "eva") {
                                if (userBufRef.current.trim()) { pushTurn("user", userBufRef.current); setUserText(""); }
                                evaBufRef.current = "";
                                clearEvaReveal();
                                lastSpeakerRef.current = "eva";
                            }
                            // exibe este trecho quando o áudio dele for OUVIDO (agora + lead)
                            const ctx = outCtxRef.current;
                            const lead = ctx ? Math.max(0, (playHeadRef.current - ctx.currentTime) * 1000) : 0;
                            evaRevealRef.current.push({ text: ot, at: performance.now() + lead });
                            if (evaRafRef.current === null) evaRafRef.current = requestAnimationFrame(pumpEvaReveal);
                        }
                        if (sc?.turnComplete) setOrbState("listening");
                        if (message.toolCall?.functionCalls?.length) {
                            // BLINDAGEM: a Live API trava o turno se uma tool call
                            // ficar sem resposta. Garantimos que TODA call recebe
                            // resposta mesmo se o handler lançar.
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const functionResponses = message.toolCall.functionCalls.map((fc: any) => {
                                let result: unknown = "ok";
                                try { result = opts.onToolCall?.(fc.name, fc.args || {}) ?? "ok"; }
                                catch (err) { console.error("[useGeminiLive] onToolCall error", err); }
                                return { id: fc.id, name: fc.name, response: { result } };
                            });
                            try { session.sendToolResponse({ functionResponses }); } catch { /* noop */ }
                        }
                    },
                    onerror: () => { wsOpenRef.current = false; },
                    onclose: () => {
                        wsOpenRef.current = false;
                        // reconecta (token NOVO) se a sessão caiu ANTES da EVA
                        // falar e não foi um fim proposital — cobre erro 1011
                        // transitório do servidor sem deixar a demo muda.
                        if (!gotAudioRef.current && !intentionalRef.current && retryRef.current < 2) {
                            retryRef.current += 1;
                            window.setTimeout(() => connectFnRef.current?.(opts, true), 600);
                            return;
                        }
                        setStatus((s) => (s === "error" ? s : "ended"));
                    },
                },
            });
            sessionRef.current = session;

            // kickoff opcional (faz a EVA começar sozinha)
            if (opts.kickoff) {
                try { session.sendClientContent({ turns: [{ role: "user", parts: [{ text: opts.kickoff }] }], turnComplete: true }); } catch { /* noop */ }
            }

            // microfone DESLIGADO por padrão: o áudio de entrada acumulava
            // transcrição no contexto e derrubava a sessão (erro 1011) no meio do
            // tour. A EVA narra/conduz sozinha; quem quiser FALAR liga o mic pelo
            // botão (setMicEnabled) — captura sob demanda, sem travar o tour.
            if (opts.captureMic) startMic();
        } catch (e) {
            console.error("[useGeminiLive] connect error", e);
            setErrorReason("exception");
            setStatus("error");
            disconnect();
        }
    }, [disconnect, startMic]);

    // ref pro connect poder reconectar a si mesmo (retry no onclose)
    connectFnRef.current = connect as unknown as (opts: ConnectOpts, retry?: boolean) => void;

    return { status, orbState, errorReason, userText, evaText, turns, micOn, connect, disconnect, setMuted, setMicEnabled, sendText, nudge, playbackLeadMs };
}
