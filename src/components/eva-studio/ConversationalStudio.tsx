// ─────────────────────────────────────────────────────────────────────────────
// ConversationalStudio (EVA.STUDIO.CONVO) — criar o agente CONVERSANDO, não
// preenchendo formulário.
//
// Visão (Markus): o gestor não preenche campos — ele CONVERSA com a EVA (texto,
// VOZ ou arquivo) e ela entrevista, montando o agente à direita em tempo real.
//
// Cada agente especialista (qualificação, follow-up, propostas, reativação) tem
// o SEU chat: perguntas, campos e COR próprios (catálogo em evaSpecialists). A
// cor (orb + acentos) deixa claro com qual agente o gestor está falando.
//
// CONVERSA REAL via useEvaStudioChat → edge `eva-studio-chat`. Sem backend/key,
// cai num roteiro guiado e os campos viram o que o gestor digitou (nada fabricado).
//
// Composer: microfone (Web Speech API, pt-BR) + seta-pra-cima circular + anexo.
// Acoplamento (JOURNEY): header da casca (hideHeader); CTA → Provar (onProceed)
// e onComplete entrega os campos pra persistir no contexto da EVA.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, useEffect, useCallback } from "react";
import { ArrowUp, Check, Mic, Paperclip, FileImage, X, ArrowLeft, Loader2 } from "lucide-react";
import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";
import { useEvaStudioChat, type StudioFields } from "@/hooks/useEvaStudioChat";
import { useEvaPriorContext } from "@/hooks/useEvaPriorContext";
import { getSpecialist, type SpecialistKey } from "@/lib/eva/evaSpecialists";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationalStudioProps {
    /** Qual agente especialista está sendo montado (cor + perguntas + campos). */
    agentKey?: SpecialistKey;
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
    /** "Testar a EVA nos meus casos" → passo Provar da jornada. */
    onProceed?: () => void;
    /** Disparado quando a entrevista termina, com os campos montados. */
    onComplete?: (fields: StudioFields) => void;
}

export function ConversationalStudio({ agentKey = "qualificacao", hideHeader, onProceed, onComplete }: ConversationalStudioProps = {}) {
    const spec = getSpecialist(agentKey);
    const accent = spec.accent;
    const prior = useEvaPriorContext();
    const chat = useEvaStudioChat(spec.key, prior);
    const { messages, fieldsView, filledCount, total, thinking, done } = chat;

    const [input, setInput] = useState("");
    const [recording, setRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [attachment, setAttachment] = useState<string | null>(null);
    const [micError, setMicError] = useState<string | null>(null);
    // Recap: quando a entrevista fecha, a EVA recapitula e o gestor confirma
    // ANTES de entregar os campos (onComplete). "confirmed" = já gravou.
    const [recapConfirmed, setRecapConfirmed] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const completedRef = useRef(false);

    // A entrevista terminou, mas só vira "concluída de verdade" após o recap.
    const showRecap = done && !recapConfirmed;

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, thinking]);

    // Entrega os campos montados uma vez — SÓ depois de o gestor confirmar o recap.
    const confirmRecap = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        setRecapConfirmed(true);
        onComplete?.(chat.fields);
    }, [chat.fields, onComplete]);

    // "Quero ajustar" reabre a conversa: volta a aceitar mensagens.
    const reopenForAdjust = useCallback(() => {
        chat.reopen();
    }, [chat]);

    const handleSend = () => {
        const text = input.trim();
        if ((!text && !attachment) || done || thinking) return;
        const att = attachment ?? undefined;
        setInput("");
        setAttachment(null);
        void chat.send(text, att);
    };

    // ── Transcrição de voz PRÓPRIA (MediaRecorder + edge eva-transcribe/Whisper) ──
    // Estável em Chrome/Firefox/Safari/mobile: grava o áudio, manda pra nossa edge
    // e devolve o texto. Não depende mais da Web Speech API (Chrome-only/Google).
    const pickMime = (): string => {
        const MR = typeof MediaRecorder !== "undefined" ? MediaRecorder : null;
        if (!MR) return "";
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
        for (const c of candidates) {
            try { if (MR.isTypeSupported(c)) return c; } catch { /* ignore */ }
        }
        return "";
    };

    const transcribe = useCallback(async (blob: Blob, mime: string) => {
        setTranscribing(true);
        try {
            const dataUri: string = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onloadend = () => resolve(r.result as string);
                r.onerror = () => reject(r.error);
                r.readAsDataURL(blob);
            });
            const base64 = dataUri.split(",")[1] || "";
            if (!base64) { setMicError("Não captei áudio. Tenta de novo, falando um pouco mais."); return; }

            const { data, error } = await supabase.functions.invoke("eva-transcribe", {
                body: { audioBase64: base64, mime, language: "pt" },
            });
            if (error || !data?.ok || typeof data.text !== "string" || !data.text.trim()) {
                setMicError((data && data.message) || "Não consegui transcrever agora. Pode digitar que funciona igual.");
                return;
            }
            const text = data.text.trim();
            // Acrescenta ao que já está escrito (permite ditar em pedaços).
            setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
        } catch {
            setMicError("Não consegui transcrever agora. Pode digitar que funciona igual.");
        } finally {
            setTranscribing(false);
        }
    }, []);

    const toggleRecording = useCallback(async () => {
        // Já gravando → para; o onstop dispara a transcrição.
        if (recording) {
            mediaRecorderRef.current?.stop();
            return;
        }
        if (transcribing) return;

        const MR = typeof MediaRecorder !== "undefined" ? MediaRecorder : null;
        if (!MR || !navigator.mediaDevices?.getUserMedia) {
            setMicError("Seu navegador não suporta gravar áudio aqui. Pode digitar ou anexar um material.");
            return;
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setMicError("O microfone está bloqueado. Libera no cadeado do navegador (ao lado do endereço) e tenta de novo.");
            return;
        }

        setMicError(null);
        const mime = pickMime();
        let rec: MediaRecorder;
        try {
            rec = mime ? new MR(stream, { mimeType: mime }) : new MR(stream);
        } catch {
            stream.getTracks().forEach((t) => t.stop());
            setMicError("Não consegui iniciar a gravação. Tenta de novo, ou digite/anexe um material.");
            return;
        }

        chunksRef.current = [];
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            mediaRecorderRef.current = null;
            setRecording(false);
            const usedMime = rec.mimeType || mime || "audio/webm";
            const blob = new Blob(chunksRef.current, { type: usedMime });
            chunksRef.current = [];
            if (blob.size < 1200) { setMicError("Não captei áudio. Toca, fala e toca de novo pra transcrever."); return; }
            void transcribe(blob, usedMime);
        };
        rec.onerror = () => {
            stream.getTracks().forEach((t) => t.stop());
            mediaRecorderRef.current = null;
            setRecording(false);
            setMicError("Falha ao gravar o áudio. Tenta de novo, ou digite/anexe um material.");
        };

        mediaRecorderRef.current = rec;
        try {
            rec.start();
            setRecording(true);
        } catch {
            stream.getTracks().forEach((t) => t.stop());
            mediaRecorderRef.current = null;
            setMicError("Não consegui iniciar a gravação. Tenta de novo, ou digite/anexe um material.");
        }
    }, [recording, transcribing, transcribe]);

    useEffect(() => () => {
        try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
    }, []);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setAttachment(f.name);
        e.target.value = "";
    };

    return (
        <div
            className={`vz-convo ${hideHeader ? "vz-convo--embedded" : ""}`}
            style={{ ["--convo-accent"]: accent } as React.CSSProperties}
        >
            {/* Polimento: agente "nascendo" suave (barra com easing, check pop,
                valor extraído surgindo) + recap antes de gravar. */}
            <style>{`
                .vz-cvs-prog-fill {
                    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
                }
                @keyframes vzCvsCheckPop {
                    0%   { transform: scale(0.4); opacity: 0; }
                    60%  { transform: scale(1.12); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes vzCvsValueIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .vz-cvs-mark--pop {
                    animation: vzCvsCheckPop 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .vz-cvs-value {
                    transition: color 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .vz-cvs-value--on {
                    animation: vzCvsValueIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes vzCvsRecapIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .vz-cvs-recap {
                    animation: vzCvsRecapIn 0.44s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .vz-cvs-recap-row {
                    animation: vzCvsValueIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .vz-cvs-prog-fill { transition: none; }
                    .vz-cvs-mark--pop,
                    .vz-cvs-value--on,
                    .vz-cvs-recap,
                    .vz-cvs-recap-row { animation: none !important; }
                }
            `}</style>
            {!hideHeader && (
                <div className="vz-convo-head">
                    <EvaThinkingOrb
                        state={thinking ? "working" : "listening"}
                        size={64}
                        displaySize={36}
                        theme="light"
                        agentKey={spec.key}
                        aria-label={spec.role}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 className="vz-convo-title">Me conta como a sua agência vende</h1>
                        <p className="vz-convo-sub">
                            Quatro perguntas curtas. Depois a EVA sugere no Inbox e você aprova cada mensagem.
                        </p>
                    </div>
                </div>
            )}

            <div className="vz-convo-body">
                {/* ── Conversa ── */}
                <div className="vz-convo-chat">
                    <div className="vz-convo-stream" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`vz-convo-row vz-convo-row--${m.from}`}>
                                {m.from === "eva" && (
                                    <span className="vz-convo-ava">
                                        <EvaThinkingOrb state="listening" size={20} displaySize={26} theme="light" agentKey={spec.key} aria-hidden />
                                    </span>
                                )}
                                <div
                                    className={`vz-convo-bubble vz-convo-bubble--${m.from}`}
                                    style={m.from === "user" ? { background: accent, borderColor: accent } : undefined}
                                >
                                    {m.attachment && (
                                        <span className="vz-convo-attach-chip">
                                            <FileImage style={{ width: 13, height: 13 }} />
                                            {m.attachment}
                                        </span>
                                    )}
                                    {m.text}
                                </div>
                            </div>
                        ))}

                        {/* ── Pensando ── */}
                        {thinking && (
                            <div className="vz-convo-row vz-convo-row--eva">
                                <span className="vz-convo-ava">
                                    <EvaThinkingOrb state="working" size={20} displaySize={26} theme="light" agentKey={spec.key} aria-hidden />
                                </span>
                                <div className="vz-convo-bubble vz-convo-bubble--eva vz-convo-typing">
                                    <span className="vz-convo-typing-dot" />
                                    <span className="vz-convo-typing-dot" />
                                    <span className="vz-convo-typing-dot" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* anexo selecionado, aguardando envio */}
                    {attachment && (
                        <div className="vz-convo-pending-attach">
                            <FileImage style={{ width: 14, height: 14, color: accent }} />
                            <span style={{ flex: 1, minWidth: 0 }}>{attachment}</span>
                            <button type="button" onClick={() => setAttachment(null)} aria-label="Remover anexo">
                                <X style={{ width: 13, height: 13 }} />
                            </button>
                        </div>
                    )}

                    {/* ── Composer: anexo + voz + seta-pra-cima ── */}
                    <div className={`vz-convo-composer ${recording ? "vz-convo-composer--rec" : ""}`}>
                        <button
                            type="button"
                            className="vz-convo-attach"
                            onClick={() => fileRef.current?.click()}
                            title="Enviar um material (manda em imagem/JPG)"
                            aria-label="Anexar arquivo"
                        >
                            <Paperclip style={{ width: 16, height: 16 }} />
                        </button>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFile} />
                        <button
                            type="button"
                            className={`vz-convo-mic ${recording ? "vz-convo-mic--on" : ""}`}
                            onClick={toggleRecording}
                            disabled={transcribing || done}
                            title={recording ? "Tocar pra transcrever" : "Falar em vez de digitar"}
                            aria-label={recording ? "Parar e transcrever" : "Gravar áudio"}
                        >
                            {transcribing
                                ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                                : <Mic style={{ width: 16, height: 16 }} />}
                        </button>
                        <textarea
                            className="vz-convo-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                            }}
                            placeholder={done ? "Quer ajustar algo? Me fala…" : recording ? "Gravando… toque no microfone pra transcrever" : transcribing ? "Transcrevendo sua fala…" : "Responda em 1–2 frases…"}
                            rows={1}
                            disabled={done}
                        />
                        <button
                            type="button"
                            className="vz-convo-send"
                            onClick={handleSend}
                            disabled={(!input.trim() && !attachment) || thinking || done}
                            aria-label="Enviar"
                            style={{ background: accent }}
                        >
                            <ArrowUp style={{ width: 18, height: 18 }} strokeWidth={2.6} />
                        </button>
                    </div>
                    {recording ? (
                        <p className="vz-convo-rechint">
                            <span className="vz-convo-recdot" /> Gravando… toque no microfone pra eu transcrever
                        </p>
                    ) : transcribing ? (
                        <p className="vz-convo-rechint">
                            <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Transcrevendo sua fala…
                        </p>
                    ) : micError ? (
                        <p className="vz-convo-rechint" style={{ color: "#dc2626" }} role="alert">
                            {micError}
                        </p>
                    ) : done ? (
                        <p className="vz-convo-hint">Confira o resumo à direita antes de seguir.</p>
                    ) : (
                        <p className="vz-convo-hint">
                            Pergunta {Math.min(filledCount + 1, total)} de {total}. Pode digitar ou usar o microfone.
                        </p>
                    )}
                </div>

                {/* ── O agente nascendo ── */}
                <aside className="vz-convo-agent">
                    <div className="vz-convo-agent-head">
                        <span style={{ flexShrink: 0, lineHeight: 0 }}>
                            <EvaThinkingOrb
                                state={thinking ? "working" : "listening"}
                                size={20}
                                displaySize={30}
                                theme="light"
                                agentKey={spec.key}
                                aria-hidden
                            />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="vz-convo-agent-kicker">Montando agora</p>
                            <p className="vz-convo-agent-name">Qualificador</p>
                        </div>
                        <span
                            className={`vz-convo-agent-status ${recapConfirmed ? "vz-convo-agent-status--done" : ""}`}
                            style={recapConfirmed ? { color: accent } : undefined}
                        >
                            {recapConfirmed
                                ? "pronta"
                                : showRecap
                                ? "confira"
                                : thinking
                                ? "pensando…"
                                : `${filledCount}/${total}`}
                        </span>
                    </div>

                    <div className="vz-convo-agent-prog">
                        <div className="vz-convo-agent-prog-fill vz-cvs-prog-fill" style={{ width: `${(filledCount / total) * 100}%`, background: accent }} />
                    </div>
                    {!showRecap && !recapConfirmed && (
                        <p className="vz-convo-hint" style={{ margin: "8px 0 0" }}>
                            {filledCount >= total
                                ? "Tudo preenchido. Confira o resumo abaixo."
                                : `Faltam ${total - filledCount} ${total - filledCount === 1 ? "resposta" : "respostas"}.`}
                        </p>
                    )}

                    {prior.ready && filledCount > 0 && messages.length <= 1 && (
                        <p
                            className="vz-convo-hint"
                            style={{ margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6 }}
                        >
                            <Check style={{ width: 12, height: 12, color: accent }} strokeWidth={3} />
                            Já aproveitei o que vocês configuraram. Confira ou ajuste o que precisar.
                        </p>
                    )}

                    <div className="vz-convo-fields">
                        {fieldsView.map((f, i) => {
                            const on = f.value.trim().length > 0;
                            return (
                                <div key={f.key} className={`vz-convo-field ${on ? "vz-convo-field--on" : ""}`}>
                                    <span
                                        key={on ? "on" : "off"}
                                        className={`vz-convo-field-mark ${on ? "vz-cvs-mark--pop" : ""}`}
                                        style={on ? { background: accent, borderColor: accent } : undefined}
                                    >
                                        {on ? <Check style={{ width: 12, height: 12 }} strokeWidth={3} /> : i + 1}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <p className="vz-convo-field-label">{f.label}</p>
                                        <p
                                            key={f.value || "empty"}
                                            className={`vz-convo-field-value vz-cvs-value ${on ? "vz-cvs-value--on" : ""}`}
                                            style={on ? { color: "var(--vyz-text-strong, #0B1220)" } : undefined}
                                        >
                                            {on ? f.value : "ainda não perguntou"}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* RECAP antes de gravar: a EVA recapitula e o gestor confirma.
                        Só após confirmar o onComplete dispara (via confirmRecap). */}
                    {showRecap && (
                        <div className="vz-cvs-recap" style={{ marginTop: 16 }}>
                            <div
                                style={{
                                    borderRadius: 10,
                                    border: "1px solid var(--vyz-border-subtle, #E2E8F0)",
                                    background: "var(--vyz-surface-2, #FBFCFE)",
                                    padding: "14px 14px 12px",
                                }}
                            >
                                <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--vyz-text-strong, #0B1220)" }}>
                                    <span style={{ lineHeight: 0 }}>
                                        <EvaThinkingOrb state="listening" size={20} displaySize={18} theme="light" agentKey={spec.key} aria-hidden />
                                    </span>
                                    Confira o que a EVA entendeu:
                                </p>
                                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                                    {fieldsView.map((f, i) => {
                                        const has = f.value.trim().length > 0;
                                        return (
                                            <div
                                                key={f.key}
                                                className="vz-cvs-recap-row"
                                                style={{ animationDelay: `${0.06 + i * 0.06}s` }}
                                            >
                                                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--vyz-text-muted, #64748B)" }}>
                                                    {f.label}
                                                </p>
                                                <p style={{ fontSize: 12.5, color: has ? "var(--vyz-text-primary, #1E293B)" : "var(--vyz-text-muted, #94A3B8)", marginTop: 1 }}>
                                                    {has ? f.value : "—"}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                                <button
                                    type="button"
                                    className="vz-convo-agent-cta"
                                    onClick={confirmRecap}
                                    style={{ background: "#0B1220", flex: 1 }}
                                >
                                    Confirmar e seguir
                                    <Check style={{ width: 14, height: 14 }} strokeWidth={2.6} />
                                </button>
                                <button
                                    type="button"
                                    className="vz-evassist-btn vz-evassist-btn--ghost"
                                    onClick={reopenForAdjust}
                                >
                                    <ArrowLeft style={{ width: 13, height: 13 }} />
                                    Ajustar
                                </button>
                            </div>
                        </div>
                    )}

                    {recapConfirmed && (
                        <button type="button" className="vz-convo-agent-cta" onClick={onProceed} style={{ background: accent, marginTop: 16 }}>
                            Provar com um caso
                            <ArrowUp style={{ width: 14, height: 14, transform: "rotate(90deg)" }} />
                        </button>
                    )}
                </aside>
            </div>
        </div>
    );
}
