// ─────────────────────────────────────────────────────────────────────────────
// EvaAssistColumn (EVA.INBOX.1, 2026-06-06) — a lateral da EVA como MÁQUINA
// DE RESPOSTA. A dor nº1 do vendedor é demorar pra escrever; a RESPOSTA
// SUGERIDA é o herói, contexto e próxima ação são insumo.
//
// Hierarquia (de cima pra baixo):
//   1. Header: <EvaEntity> + nome + 1 linha de estado do lead
//   2. ZONA DE RESPOSTA (herói) — dois estados:
//        CONFIA   → resposta pronta em card roxo, Enviar + Editar
//        SE CALA  → estado honesto + "descubra isto primeiro" (1-2 perguntas)
//   3. Contexto do lead — faixa de apoio (#F8FAFC)
//   4. Próxima ação — rodapé fino
//
// PRESENTATIONAL: dados via props (EvaAssistData), nenhum hook de dado real.
// A integração com useEvaInsight/Inbox vem DEPOIS da validação visual
// (preview em /eva-assist-preview).
//
// Loop de aprendizado: todo envio devolve um SuggestionOutcome via onSend —
// "accepted" (direto) ou "edited" (com delta). Quem integra pluga
// recordSuggestionFeedback (lib/eva/suggestionFeedback). Sem UI pra isso.
//
// REGRA FIXA: a EVA NUNCA envia sozinha. O selo "Você no controle" é um
// ESTADO (data-autonomy="human") que um dia vira o toggle de conceder
// autonomia por tipo de mensagem — mas a autonomia NÃO existe ainda.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CornerDownRight, MessageCircleQuestion, PencilLine, SendHorizonal } from "lucide-react";
import { EvaEntity } from "@/components/eva/EvaEntity";
import {
    buildSuggestionOutcome,
    type SuggestionOutcome,
} from "@/lib/eva/suggestionFeedback";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type EvaAssistTemperatura = "quente" | "morno" | "frio";

export interface EvaAssistContext {
    /** Resumo de 1-2 linhas do lead. */
    summary: string;
    score: number | null;
    temperatura: EvaAssistTemperatura | null;
    /** 2-3 chips de qualificação (decisor, orçamento, urgência…). */
    chips: string[];
}

export interface EvaAssistData {
    leadName: string;
    /** 1 linha de estado do lead no header ("Lead quente, pediu proposta há 12 min"). */
    stateLine: string;
    /** CONFIA ("suggest") ou SE CALA ("discover") — derivado de `confianca`. */
    mode: "suggest" | "discover";
    /** Resposta pronta (mode = suggest). */
    suggestion: string | null;
    /** 1-2 perguntas que destravam a sugestão (mode = discover). */
    questions: string[];
    context: EvaAssistContext;
    /** O que fazer depois de enviar. */
    nextAction: string;
}

export interface EvaAssistColumnProps {
    data: EvaAssistData;
    /**
     * Único caminho de envio — sempre disparado por clique humano.
     * `outcome` vem preenchido quando o texto nasceu de uma sugestão
     * (sinal de aprendizado); null quando foi pergunta de descoberta.
     */
    onSend: (text: string, outcome: SuggestionOutcome | null) => void;
    /** Embutida num host que já mostra o lead (CopilotSidebar): sem header. */
    hideHeader?: boolean;
}

const TEMP_META: Record<EvaAssistTemperatura, { label: string; dot: string }> = {
    quente: { label: "Quente", dot: "#E11D48" },
    morno: { label: "Morno", dot: "#D97706" },
    frio: { label: "Frio", dot: "#2563EB" },
};

// ─── Componente ─────────────────────────────────────────────────────────────

export function EvaAssistColumn({ data, onSend, hideHeader }: EvaAssistColumnProps) {
    return (
        <div className="vz-evassist">
            {/* 1. Header — a entidade sinaliza o modo pela cor: roxo cheio quando
                tem sugestão, slate apagado quando está só escutando */}
            {!hideHeader && (
                <div className="vz-evassist-header">
                    <EvaEntity size={28} state={data.mode === "suggest" ? "idle" : "listening"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="vz-evassist-header-name">{data.leadName}</p>
                        <p className="vz-evassist-header-state">{data.stateLine}</p>
                    </div>
                </div>
            )}

            {/* 2. Zona de resposta — o herói */}
            {data.mode === "suggest" && data.suggestion ? (
                <SuggestZone suggestion={data.suggestion} onSend={onSend} />
            ) : (
                <DiscoverZone questions={data.questions} onSend={onSend} />
            )}

            {/* 3. Contexto do lead — faixa de apoio */}
            <div className="vz-evassist-context">
                <p className="vz-evassist-label">Contexto do lead</p>
                <p className="vz-evassist-context-summary">{data.context.summary}</p>
                <div className="vz-evassist-context-meta">
                    {data.context.score !== null && (
                        <span className="vz-evassist-score">Score {data.context.score}</span>
                    )}
                    {data.context.temperatura && (
                        <span className="vz-evassist-chip">
                            <span
                                className="vz-evassist-chip-dot"
                                style={{ background: TEMP_META[data.context.temperatura].dot }}
                            />
                            {TEMP_META[data.context.temperatura].label}
                        </span>
                    )}
                    {data.context.chips.slice(0, 3).map((chip) => (
                        <span key={chip} className="vz-evassist-chip">
                            {chip}
                        </span>
                    ))}
                </div>
            </div>

            {/* 4. Próxima ação — rodapé fino */}
            <div className="vz-evassist-next">
                <CornerDownRight
                    style={{ width: 13, height: 13, marginTop: 2, flexShrink: 0, color: "#534AB7" }}
                    strokeWidth={2.4}
                />
                <div style={{ minWidth: 0 }}>
                    <p className="vz-evassist-label" style={{ marginBottom: 2 }}>
                        Depois de enviar
                    </p>
                    <p className="vz-evassist-next-text">{data.nextAction}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Selo de controle (semente da escada de autonomia) ──────────────────────

function ControlSeal({ mode }: { mode: "suggest" | "discover" }) {
    // data-autonomy é o estado que um dia muda ("human" → autonomia concedida,
    // por tipo de mensagem, revogável). Hoje: fixo, sem toggle, sem lógica.
    // No SE CALA não há sugestão pra controlar — o selo diz o que a EVA está
    // fazendo naquele estado: escutando.
    const listening = mode === "discover";
    return (
        <span
            className={`vz-evassist-seal ${listening ? "vz-evassist-seal--listening" : ""}`}
            data-autonomy="human"
            title={
                listening
                    ? "A EVA está coletando contexto. Nada é enviado sem você."
                    : "A EVA sugere, você envia. Sempre tem um humano no envio."
            }
        >
            <span className="vz-evassist-seal-dot" />
            {listening ? "Em escuta" : "Você no controle"}
        </span>
    );
}

// ─── Estado CONFIA — resposta pronta ────────────────────────────────────────

function SuggestZone({
    suggestion,
    onSend,
}: {
    suggestion: string;
    onSend: EvaAssistColumnProps["onSend"];
}) {
    // null = sem edição; string = textarea aberta com o rascunho do vendedor
    const [draft, setDraft] = useState<string | null>(null);
    // Motion como informação (Fluid Functionalism): ao enviar, o card sobe
    // em direção à conversa antes de sumir — comunica "virou mensagem".
    // onSend só dispara no fim da animação (ou imediato com reduced-motion).
    const [sending, setSending] = useState(false);
    const reduceMotion = useReducedMotion();
    const editing = draft !== null;
    const textToSend = (draft ?? suggestion).trim();

    // Nova sugestão do pai = novo ciclo: zera rascunho e estado de envio.
    useEffect(() => {
        setDraft(null);
        setSending(false);
    }, [suggestion]);

    const fireSend = () => {
        // Loop de aprendizado: direto = accepted, editado = edited + delta.
        onSend(textToSend, buildSuggestionOutcome(suggestion, textToSend));
    };

    const handleSend = () => {
        if (!textToSend || sending) return;
        if (reduceMotion) {
            fireSend();
            return;
        }
        setSending(true);
    };

    return (
        <div className="vz-evassist-zone">
            <div className="vz-evassist-zone-head">
                <span className="vz-evassist-label">Resposta sugerida</span>
                <ControlSeal mode="suggest" />
            </div>
            <motion.div
                className="vz-evassist-hero"
                animate={sending ? { opacity: 0, y: -14, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                onAnimationComplete={() => {
                    if (sending) fireSend();
                }}
            >
                {editing ? (
                    <textarea
                        className="vz-evassist-hero-edit"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        aria-label="Editar resposta sugerida"
                    />
                ) : (
                    <p className="vz-evassist-hero-text">{suggestion}</p>
                )}
                <div className="vz-evassist-hero-actions">
                    <button
                        type="button"
                        className="vz-evassist-btn vz-evassist-btn--primary"
                        onClick={handleSend}
                        disabled={!textToSend}
                    >
                        <SendHorizonal style={{ width: 13, height: 13 }} />
                        Enviar
                    </button>
                    <button
                        type="button"
                        className="vz-evassist-btn vz-evassist-btn--ghost"
                        onClick={() => setDraft(editing ? null : suggestion)}
                    >
                        <PencilLine style={{ width: 13, height: 13 }} />
                        {editing ? "Descartar edição" : "Editar"}
                    </button>
                </div>
                <p className="vz-evassist-learn">
                    Se você editar, a EVA aprende seu jeito.
                </p>
            </motion.div>
        </div>
    );
}

// ─── Estado SE CALA — sem contexto, sem genérico ────────────────────────────

function DiscoverZone({
    questions,
    onSend,
}: {
    questions: string[];
    onSend: EvaAssistColumnProps["onSend"];
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const list = questions.slice(0, 2);

    const handleSend = () => {
        const text = draft?.trim();
        if (!text) return;
        // Pergunta de descoberta não tem sugestão pra comparar: sem outcome.
        onSend(text, null);
    };

    return (
        <div className="vz-evassist-zone">
            <div className="vz-evassist-zone-head">
                <span className="vz-evassist-label">Zona de resposta</span>
                <ControlSeal mode="discover" />
            </div>
            <div className="vz-evassist-quiet">
                {/* O silêncio é silencioso: 1 linha leve, sem caixa. */}
                <p className="vz-evassist-quiet-text">
                    Ainda não tenho contexto pra sugerir algo bom. Genérico só ia te
                    atrapalhar.
                </p>

                {/* O herói deste estado: descobrir é a ação útil agora. */}
                {list.length > 0 && (
                    <div className="vz-evassist-discover">
                        <p className="vz-evassist-label" style={{ marginBottom: 4 }}>
                            Descubra isto primeiro
                        </p>
                        {list.map((q) => (
                            <div key={q} className="vz-evassist-q">
                                <p className="vz-evassist-q-text">{q}</p>
                                <button
                                    type="button"
                                    className="vz-evassist-q-use"
                                    onClick={() => setDraft(q)}
                                >
                                    <MessageCircleQuestion style={{ width: 11, height: 11 }} />
                                    Perguntar
                                </button>
                            </div>
                        ))}

                        {draft !== null && (
                            <>
                                <textarea
                                    className="vz-evassist-hero-edit"
                                    style={{ marginTop: 10, minHeight: 72 }}
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    autoFocus
                                    aria-label="Pergunta a enviar"
                                />
                                <div className="vz-evassist-hero-actions">
                                    <button
                                        type="button"
                                        className="vz-evassist-btn vz-evassist-btn--primary"
                                        onClick={handleSend}
                                        disabled={!draft.trim()}
                                    >
                                        <SendHorizonal style={{ width: 13, height: 13 }} />
                                        Enviar
                                    </button>
                                    <button
                                        type="button"
                                        className="vz-evassist-btn vz-evassist-btn--ghost"
                                        onClick={() => setDraft(null)}
                                    >
                                        Descartar
                                    </button>
                                </div>
                            </>
                        )}

                        <p className="vz-evassist-learn" style={{ color: "#A16207" }}>
                            Responda 1 e eu já consigo sugerir.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
