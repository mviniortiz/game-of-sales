// ─────────────────────────────────────────────────────────────────────────────
// ConversationalStudio (EVA.STUDIO.CONVO, 2026-06-09) — criar o agente
// CONVERSANDO, não preenchendo formulário.
//
// Visão (Markus): o gestor não tem conhecimento de produto pra preencher campos.
// Ele CONVERSA com a EVA (texto, VOZ ou arquivo) e ela entrevista — pergunta só
// o que precisa, uma coisa de cada vez — e MONTA o agente à direita, em tempo
// real. Padrão: Sierra Ghostwriter + Wispr Flow + conversational onboarding.
//
// Esta versão adiciona:
//   - "pensando" (typing indicator + delay) pra a resposta não ser brusca
//   - transcrição de voz real via Web Speech API (pt-BR)
//   - upload de arquivo (preferir imagem/JPG) que a EVA "lê"
//
// Composer: microfone + seta-pra-cima circular (estilo Claude, paleta Vyzon) +
// anexo — NUNCA avião/paper-plane.
//
// PRESENTATIONAL: conversa roteirizada no preview. A EVA real (perguntas
// adaptativas + montagem + OCR do arquivo) é a fase de integração.
//
// Acoplamento (EVA.STUDIO.JOURNEY): dentro da jornada o header é da casca
// (hideHeader) e o CTA final leva pro passo Provar (onProceed).
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState, useEffect, useCallback } from "react";
import { ArrowUp, Check, Mic, Paperclip, FileImage, X } from "lucide-react";
import { EvaEntity } from "@/components/eva/EvaEntity";

export interface ConversationalStudioProps {
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
    /** "Testar a EVA nos meus casos" → passo Provar da jornada. */
    onProceed?: () => void;
}

interface AgentField {
    key: string;
    label: string;
    value: string;
}

const AGENT_FIELDS: AgentField[] = [
    { key: "vende", label: "O que vende", value: "Tráfego pago (Meta + Google) · Social media" },
    { key: "icp", label: "Cliente ideal", value: "Negócios locais faturando a partir de R$ 50 mil/mês" },
    { key: "qualifica", label: "Como qualifica o lead", value: "Pergunta porte, segmento e quanto já investe hoje" },
    { key: "redline", label: "Linha vermelha", value: "Nunca prometer resultado garantido antes do diagnóstico" },
];

const EVA_TURNS: string[] = [
    "Oi! Eu monto a sua EVA de vendas só conversando, sem formulário nenhum. Me conta com as suas palavras: o que a sua agência vende?",
    "Boa. E pra quem você vende melhor? Tem um tipo de cliente que costuma fechar mais fácil?",
    "Entendi. Quando chega um lead novo, o que você precisa saber dele pra decidir se vale a pena seguir?",
    "Quase lá. Tem alguma coisa que eu NUNCA posso prometer ou falar pro lead?",
    "Pronto, montei a sua EVA. Olha à direita o que eu entendi. Se tiver algo torto, é só me dizer e eu ajusto.",
];

type Msg = { from: "eva" | "user"; text: string; attachment?: string };

// Tempo de "pensando" — proporcional ao tamanho da resposta, com piso/teto.
const thinkMs = (text: string) => Math.min(2200, Math.max(700, text.length * 14));

export function ConversationalStudio({ hideHeader, onProceed }: ConversationalStudioProps = {}) {
    const [messages, setMessages] = useState<Msg[]>([{ from: "eva", text: EVA_TURNS[0] }]);
    const [revealed, setRevealed] = useState(0);
    const [input, setInput] = useState("");
    const [recording, setRecording] = useState(false);
    const [thinking, setThinking] = useState(false);
    const [attachment, setAttachment] = useState<string | null>(null);
    const [speechOk, setSpeechOk] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<unknown>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const done = revealed >= AGENT_FIELDS.length;

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, thinking]);

    // ── A EVA "pensa" antes de responder (não brusca) ──
    const evaReply = useCallback((nextRevealed: number, extra?: string) => {
        const evaNext = extra ?? EVA_TURNS[nextRevealed];
        if (!evaNext) return;
        setThinking(true);
        const t = setTimeout(() => {
            setThinking(false);
            setMessages((m) => [...m, { from: "eva", text: evaNext }]);
            if (!extra) setRevealed(nextRevealed);
        }, thinkMs(evaNext));
        return () => clearTimeout(t);
    }, []);

    const handleSend = () => {
        const text = input.trim();
        if ((!text && !attachment) || done || thinking) return;
        const sent: Msg = { from: "user", text: text || "(material enviado)", attachment: attachment ?? undefined };
        setInput("");
        setAttachment(null);
        setMessages((m) => [...m, sent]);
        evaReply(Math.min(revealed + 1, AGENT_FIELDS.length));
    };

    // ── Transcrição de voz (Web Speech API, pt-BR) ──
    const toggleRecording = () => {
        const SR = (window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown });
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
    };

    useEffect(() => () => { (recognitionRef.current as { stop: () => void } | null)?.stop(); }, []);

    // ── Upload de arquivo (preferir imagem/JPG; a EVA "lê") ──
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setAttachment(f.name);
        e.target.value = "";
        // a EVA reconhece o material e acelera (extração simulada no preview)
        setMessages((m) => [...m, { from: "user", text: "", attachment: f.name }]);
        evaReply(0, "Recebi seu material, já tô lendo. Vou extrair o que der daqui e te confirmar item por item, pode deixar.");
        setAttachment(null);
    };

    return (
        <div className={`vz-convo ${hideHeader ? "vz-convo--embedded" : ""}`}>
            {!hideHeader && (
                <div className="vz-convo-head">
                    <EvaEntity size={34} state={thinking ? "thinking" : done ? "done" : "idle"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 className="vz-convo-title">Vamos montar a sua EVA</h1>
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
                                    <span className="vz-convo-ava"><EvaEntity size={26} state="idle" /></span>
                                )}
                                <div className={`vz-convo-bubble vz-convo-bubble--${m.from}`}>
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
                                <span className="vz-convo-ava"><EvaEntity size={26} state="thinking" /></span>
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
                            <FileImage style={{ width: 14, height: 14, color: "#7c3aed" }} />
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
                        />
                        <button
                            type="button"
                            className="vz-convo-send"
                            onClick={handleSend}
                            disabled={(!input.trim() && !attachment) || thinking}
                            aria-label="Enviar"
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
                        <div>
                            <p className="vz-convo-agent-kicker">Sua EVA de vendas</p>
                            <p className="vz-convo-agent-name">Agente de qualificação</p>
                        </div>
                        <span className={`vz-convo-agent-status ${done ? "vz-convo-agent-status--done" : ""}`}>
                            {done ? "pronta" : thinking ? "pensando…" : "montando…"}
                        </span>
                    </div>

                    <div className="vz-convo-agent-prog">
                        <div className="vz-convo-agent-prog-fill" style={{ width: `${(revealed / AGENT_FIELDS.length) * 100}%` }} />
                    </div>

                    <div className="vz-convo-fields">
                        {AGENT_FIELDS.map((f, i) => {
                            const on = i < revealed;
                            return (
                                <div key={f.key} className={`vz-convo-field ${on ? "vz-convo-field--on" : ""}`}>
                                    <span className="vz-convo-field-mark">
                                        {on ? <Check style={{ width: 12, height: 12 }} strokeWidth={3} /> : i + 1}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                        <p className="vz-convo-field-label">{f.label}</p>
                                        <p className="vz-convo-field-value">
                                            {on ? f.value : "a EVA ainda vai te perguntar"}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {done && (
                        <button type="button" className="vz-convo-agent-cta" onClick={onProceed}>
                            Testar a EVA nos meus casos
                            <ArrowUp style={{ width: 14, height: 14, transform: "rotate(90deg)" }} />
                        </button>
                    )}
                </aside>
            </div>
        </div>
    );
}
