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
import { ArrowUp, Check, Mic, Paperclip, FileImage, X, ArrowLeft } from "lucide-react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { useEvaStudioChat, type StudioFields } from "@/hooks/useEvaStudioChat";
import { getSpecialist, type SpecialistKey } from "@/lib/eva/evaSpecialists";

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
    const chat = useEvaStudioChat(spec.key);
    const { messages, fieldsView, filledCount, total, thinking, done } = chat;

    const [input, setInput] = useState("");
    const [recording, setRecording] = useState(false);
    const [attachment, setAttachment] = useState<string | null>(null);
    const [speechOk, setSpeechOk] = useState(true);
    // Recap: quando a entrevista fecha, a EVA recapitula e o gestor confirma
    // ANTES de entregar os campos (onComplete). "confirmed" = já gravou.
    const [recapConfirmed, setRecapConfirmed] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<unknown>(null);
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

    // ── Transcrição de voz (Web Speech API, pt-BR) ──
    const toggleRecording = useCallback(() => {
        const SR = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
        const Ctor = (SR.SpeechRecognition || SR.webkitSpeechRecognition) as (new () => {
            lang: string; interimResults: boolean; continuous: boolean;
            onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
            onend: () => void; onerror: () => void; start: () => void; stop: () => void;
        }) | undefined;
        if (!Ctor) { setSpeechOk(false); return; }

        if (recording) {
            (recognitionRef.current as { stop: () => void } | null)?.stop();
            return;
        }
        const rec = new Ctor();
        rec.lang = "pt-BR";
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (e) => {
            let txt = "";
            for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
            setInput(txt);
        };
        rec.onend = () => { setRecording(false); recognitionRef.current = null; };
        rec.onerror = () => { setRecording(false); recognitionRef.current = null; };
        recognitionRef.current = rec;
        rec.start();
        setRecording(true);
    }, [recording]);

    useEffect(() => () => { (recognitionRef.current as { stop: () => void } | null)?.stop(); }, []);

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
                    <EvaOrb variant={spec.orb} size={36} showVoice={false} state={thinking ? "analyzing" : "idle"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 className="vz-convo-title">Vamos montar a sua EVA de {spec.label.toLowerCase()}</h1>
                        <p className="vz-convo-sub">Sem formulário. Você fala ou escreve, e eu construo.</p>
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
                                    <span className="vz-convo-ava"><EvaOrb variant={spec.orb} size={26} showVoice={false} state="idle" /></span>
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
                                <span className="vz-convo-ava"><EvaOrb variant={spec.orb} size={26} showVoice={false} state="analyzing" /></span>
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
                            title="Falar em vez de digitar"
                            aria-label="Gravar áudio"
                        >
                            <Mic style={{ width: 16, height: 16 }} />
                        </button>
                        <textarea
                            className="vz-convo-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                            }}
                            placeholder={done ? "Quer ajustar algo? Me fala…" : recording ? "Ouvindo… fala naturalmente" : "Responde com as suas palavras, ou toque no microfone"}
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
                            <span className="vz-convo-recdot" /> Transcrevendo sua fala em tempo real
                        </p>
                    ) : !speechOk ? (
                        <p className="vz-convo-rechint" style={{ color: "#94a3b8" }}>
                            Seu navegador não suporta voz aqui. Tente no Chrome, ou digite/anexe um material.
                        </p>
                    ) : (
                        <p className="vz-convo-hint">Dica: pra anexar material, manda em imagem (JPG/PNG) que eu leio melhor.</p>
                    )}
                </div>

                {/* ── O agente nascendo ── */}
                <aside className="vz-convo-agent">
                    <div className="vz-convo-agent-head">
                        <span style={{ flexShrink: 0, lineHeight: 0 }}>
                            <EvaOrb variant={spec.orb} size={30} showVoice={false} state={thinking ? "analyzing" : "idle"} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="vz-convo-agent-kicker">Sua EVA de vendas</p>
                            <p className="vz-convo-agent-name">{spec.role}</p>
                        </div>
                        <span
                            className={`vz-convo-agent-status ${recapConfirmed ? "vz-convo-agent-status--done" : ""}`}
                            style={recapConfirmed ? { color: accent } : undefined}
                        >
                            {recapConfirmed ? "pronta" : showRecap ? "confere comigo" : thinking ? "pensando…" : "montando…"}
                        </span>
                    </div>

                    <div className="vz-convo-agent-prog">
                        <div className="vz-convo-agent-prog-fill vz-cvs-prog-fill" style={{ width: `${(filledCount / total) * 100}%`, background: accent }} />
                    </div>

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
                                            {on ? f.value : "a EVA ainda vai te perguntar"}
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
                                        <EvaOrb variant={spec.orb} size={18} showVoice={false} state="idle" />
                                    </span>
                                    Montei a sua EVA de {spec.label.toLowerCase()} assim:
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
                                    Confirmar e gravar
                                    <Check style={{ width: 14, height: 14 }} strokeWidth={2.6} />
                                </button>
                                <button
                                    type="button"
                                    className="vz-evassist-btn vz-evassist-btn--ghost"
                                    onClick={reopenForAdjust}
                                >
                                    <ArrowLeft style={{ width: 13, height: 13 }} />
                                    Quero ajustar
                                </button>
                            </div>
                        </div>
                    )}

                    {recapConfirmed && (
                        <button type="button" className="vz-convo-agent-cta" onClick={onProceed} style={{ background: accent, marginTop: 16 }}>
                            Testar a EVA nos meus casos
                            <ArrowUp style={{ width: 14, height: 14, transform: "rotate(90deg)" }} />
                        </button>
                    )}
                </aside>
            </div>
        </div>
    );
}
