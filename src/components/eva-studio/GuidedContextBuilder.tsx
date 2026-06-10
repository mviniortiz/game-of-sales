// ─────────────────────────────────────────────────────────────────────────────
// GuidedContextBuilder (EVA.STUDIO.F2, 2026-06-07) — a construção guiada que
// SUBSTITUI o formulário em branco.
//
// Abre com "olha o que eu entendi da sua operação": cards de sugestão (do
// pipeline generate-eva-context-suggestions, que JÁ existe pra docs), cada um
// com tipo + confiança + afirmação em linguagem simples + EVIDÊNCIA (trecho +
// fonte) + Confirmar / Corrigir / Descartar.
//
// REGRAS DE ALMA:
// - Nada vai pro eva_business_context sem confirmação manual (o callback
//   onResolve é o ÚNICO caminho; quem integra grava).
// - Correção vira aprendizado: quando o gestor corrige, o delta sai como
//   SuggestionOutcome (mesma lib do loop de edição do Inbox). Captura por
//   baixo; sem UI pra isso.
// - Lacunas acionáveis ordenadas por occurrenceCount ("me faltou em N
//   conversas") — backend eva_knowledge_gaps já tem o contador.
// - DOIS ESTADOS: com matéria-prima → sugestões; conta nova → "me dá um
//   texto que você já tem", NUNCA formulário em branco. As perguntas
//   uma-a-uma do estado vazio SÃO as lacunas (mesma UI, occurrenceCount 0).
//
// FONTE PLUGÁVEL: cada sugestão carrega `source` (string). Hoje só docs
// alimenta o pipeline; a função de inferência por CONVERSAS+CRM é o próximo
// passo (não construída — ver project_eva_studio_redesign).
//
// PRESENTATIONAL: dados via props, mock no preview. Integração depois da
// validação no browser.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, PencilLine } from "lucide-react";
import { EvaEntity } from "@/components/eva/EvaEntity";
import {
    buildSuggestionOutcome,
    type SuggestionOutcome,
} from "@/lib/eva/suggestionFeedback";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type ContextSuggestionType =
    | "agency"
    | "service"
    | "icp"
    | "playbook"
    | "tone"
    | "forbidden_promise"
    | "faq"
    | "objection";

export interface ContextSuggestion {
    id: string;
    type: ContextSuggestionType;
    /** 0..1 — vem do pipeline (abaixo de 0.5 nem chega aqui). */
    confidence: number;
    /** A afirmação em linguagem simples ("Vocês vendem X a partir de Y"). */
    statement: string;
    /** O trecho que sustenta a afirmação. */
    evidence: string;
    /** De onde veio ("da proposta que você colou") — fonte plugável. */
    source: string;
    /** Efeito concreto ao confirmar (causa e efeito visível). */
    effect?: string;
}

export interface ContextGap {
    id: string;
    /** A pergunta que destrava ("Quanto custa o pacote de social media?"). */
    question: string;
    /** O que fica travado sem essa resposta. */
    blocks: string;
    /** Quantas conversas sentiram essa falta (0 = pergunta essencial). */
    occurrenceCount: number;
}

export type SuggestionResolution =
    | { action: "confirm" }
    | { action: "correct"; correctedText: string; outcome: SuggestionOutcome }
    | { action: "dismiss" };

export interface GuidedContextBuilderProps {
    /** true = tem matéria-prima (sugestões); false = conta nova (colar texto). */
    hasSourceMaterial: boolean;
    suggestions: ContextSuggestion[];
    gaps: ContextGap[];
    /** ÚNICO caminho de escrita — quem integra grava no eva_business_context. */
    onResolve: (suggestion: ContextSuggestion, resolution: SuggestionResolution) => void;
    /** Confirmar em lote (alta confiança). Se ausente, cai em onResolve uma a uma. */
    onConfirmBatch?: (suggestions: ContextSuggestion[]) => void;
    onDefineGap: (gap: ContextGap, answer: string) => void;
    /** Conta nova: texto colado → pipeline de extração (já existe pra docs). */
    onSubmitText: (text: string) => void;
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
}

/** Acima disso a sugestão é "só carimbar" (compacta + elegível pro lote). */
const HIGH_CONFIDENCE = 0.85;

const TYPE_LABEL: Record<ContextSuggestionType, string> = {
    agency: "Sobre a agência",
    service: "Serviço",
    icp: "Cliente ideal",
    playbook: "Jeito de vender",
    tone: "Tom de voz",
    forbidden_promise: "Promessa proibida",
    faq: "Pergunta frequente",
    objection: "Objeção",
};

function confidenceMeta(c: number): { label: string; dots: number } {
    if (c >= 0.85) return { label: "confiança alta", dots: 3 };
    if (c >= 0.65) return { label: "confiança média", dots: 2 };
    return { label: "leitura minha, confere", dots: 1 };
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function GuidedContextBuilder({
    hasSourceMaterial,
    suggestions,
    gaps,
    onResolve,
    onConfirmBatch,
    onDefineGap,
    onSubmitText,
    hideHeader,
}: GuidedContextBuilderProps) {
    // Sugestões já revisadas saem da fila (confirmada/corrigida/descartada)
    const [resolved, setResolved] = useState<Set<string>>(new Set());
    const pending = suggestions.filter((s) => !resolved.has(s.id));
    const reviewedCount = suggestions.length - pending.length;

    // A confiança organiza a tela: alta = carimbo (compacta, lote);
    // média = revisão com atenção (espaço cheio).
    const high = pending.filter((s) => s.confidence >= HIGH_CONFIDENCE);
    const review = pending.filter((s) => s.confidence < HIGH_CONFIDENCE);

    // Mapa da tela: o gestor sabe que as lacunas existem ANTES do scroll,
    // mas chega nelas depois da vitória das confirmações.
    const gapsRef = useRef<HTMLDivElement>(null);

    const handleResolve = (s: ContextSuggestion, r: SuggestionResolution) => {
        setResolved((prev) => new Set(prev).add(s.id));
        onResolve(s, r);
    };

    const handleConfirmAll = () => {
        setResolved((prev) => {
            const next = new Set(prev);
            for (const s of high) next.add(s.id);
            return next;
        });
        if (onConfirmBatch) {
            onConfirmBatch(high);
        } else {
            for (const s of high) onResolve(s, { action: "confirm" });
        }
    };

    if (!hasSourceMaterial) {
        return (
            <PasteFirstState gaps={gaps} onDefineGap={onDefineGap} onSubmitText={onSubmitText} hideHeader={hideHeader} />
        );
    }

    return (
        <div className="vz-ctxbuild">
            {/* Header */}
            {!hideHeader && (
            <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <EvaEntity size={44} state="idle" />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-agentcreate-label">Construção guiada</p>
                    <h1 className="vz-agentcreate-title" style={{ marginTop: 2, fontSize: 22 }}>
                        Olha o que eu entendi da sua operação
                    </h1>
                </div>
                <span className="vz-agentcreate-seal" title="Nada entra no contexto da EVA sem a sua confirmação.">
                    <span className="vz-agentcreate-seal-dot" />
                    Você no controle
                </span>
            </div>
            <p className="vz-agentcreate-sub" style={{ marginTop: 8, maxWidth: 560 }}>
                Confirma o que está certo, corrige o que não está. Cada correção me
                ensina a sugerir melhor.
            </p>
            </>
            )}

            {/* Mapa da tela: vitória primeiro, esforço depois — mas visível */}
            {(pending.length > 0 || gaps.length > 0) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B" }}>
                        {pending.length} {pending.length === 1 ? "sugestão" : "sugestões"} pra revisar
                        {gaps.length > 0 && ` · ${gaps.length} ${gaps.length === 1 ? "lacuna" : "lacunas"} pra preencher`}
                    </span>
                    {gaps.length > 0 && (
                        <button
                            type="button"
                            onClick={() => gapsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#92400E",
                                padding: "2px 4px",
                            }}
                        >
                            ver lacunas
                            <ArrowDown style={{ width: 10, height: 10 }} />
                        </button>
                    )}
                </div>
            )}

            {/* Confiança alta — só carimbar: compactas + lote */}
            {high.length > 0 && (
                <>
                    <div className="vz-ctxbuild-group-head">
                        <p className="vz-agentcreate-label">
                            Confiança alta · provavelmente é só confirmar
                        </p>
                        {high.length > 1 && (
                            <button type="button" className="vz-ctxbuild-batch" onClick={handleConfirmAll}>
                                <Check style={{ width: 12, height: 12 }} strokeWidth={2.6} />
                                Confirmar todas ({high.length})
                            </button>
                        )}
                    </div>
                    {high.map((s) => (
                        <SuggestionCard key={s.id} suggestion={s} compact onResolve={handleResolve} />
                    ))}
                </>
            )}

            {/* Confiança média — onde a atenção do gestor vale mais */}
            {review.length > 0 && (
                <>
                    <div className="vz-ctxbuild-group-head">
                        <p className="vz-agentcreate-label">Olha estas com cuidado</p>
                    </div>
                    {review.map((s) => (
                        <SuggestionCard key={s.id} suggestion={s} onResolve={handleResolve} />
                    ))}
                </>
            )}

            {pending.length === 0 && (
                <div
                    className="vz-ctxbuild-card"
                    style={{ textAlign: "center", padding: "26px 18px" }}
                >
                    <Check style={{ width: 18, height: 18, color: "#16A34A", margin: "0 auto 8px" }} strokeWidth={2.6} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0B1220" }}>
                        Tudo revisado por aqui.
                    </p>
                    <p style={{ fontSize: 11.5, color: "#64748B", marginTop: 3 }}>
                        Quando você colar um texto novo ou eu observar mais conversas,
                        trago novas sugestões.
                    </p>
                </div>
            )}

            {/* Lacunas acionáveis — depois das sugestões (vitória antes do
                esforço), mas anunciadas no mapa do topo */}
            <div ref={gapsRef}>
                {gaps.length > 0 && <GapsBlock gaps={gaps} onDefineGap={onDefineGap} />}
            </div>

            {/* Rodapé fixo — causa e efeito */}
            <div className="vz-ctxbuild-footer">
                <EvaEntity size={22} state="idle" />
                <p className="vz-ctxbuild-footer-text">
                    Cada item que você confirma deixa a EVA mais certeira na ordem da
                    lista do Inbox e nas respostas sugeridas.
                </p>
                <span className="vz-ctxbuild-footer-count">
                    {reviewedCount} de {suggestions.length} revisados
                </span>
            </div>
        </div>
    );
}

// ─── Card de sugestão ───────────────────────────────────────────────────────

function SuggestionCard({
    suggestion,
    compact = false,
    onResolve,
}: {
    suggestion: ContextSuggestion;
    /** Alta confiança: card enxuto, evidência em 1 linha — é só carimbar. */
    compact?: boolean;
    onResolve: (s: ContextSuggestion, r: SuggestionResolution) => void;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const editing = draft !== null;
    const conf = confidenceMeta(suggestion.confidence);

    const handleSaveCorrection = () => {
        const text = draft?.trim();
        if (!text) return;
        // O delta da correção é o sinal de aprendizado (mesma lib do Inbox).
        onResolve(suggestion, {
            action: "correct",
            correctedText: text,
            outcome: buildSuggestionOutcome(suggestion.statement, text),
        });
    };

    return (
        <div className={`vz-ctxbuild-card ${compact ? "vz-ctxbuild-card--compact" : ""}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="vz-ctxbuild-type">{TYPE_LABEL[suggestion.type]}</span>
                <span className="vz-ctxbuild-conf" title={`Confiança ${Math.round(suggestion.confidence * 100)}%`}>
                    {[1, 2, 3].map((d) => (
                        <span
                            key={d}
                            className={`vz-ctxbuild-conf-dot ${d <= conf.dots ? "vz-ctxbuild-conf-dot--on" : ""}`}
                        />
                    ))}
                    {conf.label}
                </span>
            </div>

            {editing ? (
                <>
                    <textarea
                        className="vz-ctxbuild-edit"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        aria-label="Corrigir afirmação"
                    />
                    <p className="vz-ctxbuild-learn">Sua correção me ensina. A próxima sugestão vem melhor.</p>
                </>
            ) : (
                <p className="vz-ctxbuild-statement">{suggestion.statement}</p>
            )}

            {compact && !editing ? (
                <div className="vz-ctxbuild-evidence" title={`“${suggestion.evidence}” — ${suggestion.source}`}>
                    <span className="vz-ctxbuild-evidence-clamp">“{suggestion.evidence}”</span>
                    <span className="vz-ctxbuild-evidence-source">{suggestion.source}</span>
                </div>
            ) : (
                <div className="vz-ctxbuild-evidence">
                    “{suggestion.evidence}”
                    <span className="vz-ctxbuild-evidence-source">{suggestion.source}</span>
                </div>
            )}

            <div className="vz-ctxbuild-actions">
                {editing ? (
                    <>
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--primary"
                            onClick={handleSaveCorrection}
                            disabled={!draft?.trim()}
                        >
                            <Check style={{ width: 13, height: 13 }} />
                            Salvar correção
                        </button>
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--ghost"
                            onClick={() => setDraft(null)}
                        >
                            Cancelar
                        </button>
                    </>
                ) : (
                    <>
                        {/* No grupo compacto o caminho rápido é o "Confirmar todas";
                            o individual desce um degrau (soft) pra não brigar. */}
                        <button
                            type="button"
                            className={`vz-evassist-btn ${compact ? "vz-evassist-btn--soft" : "vz-evassist-btn--primary"}`}
                            onClick={() => onResolve(suggestion, { action: "confirm" })}
                        >
                            <Check style={{ width: 13, height: 13 }} />
                            Confirmar
                        </button>
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--ghost"
                            onClick={() => setDraft(suggestion.statement)}
                        >
                            <PencilLine style={{ width: 13, height: 13 }} />
                            Corrigir
                        </button>
                        <button
                            type="button"
                            className="vz-ctxbuild-dismiss"
                            onClick={() => onResolve(suggestion, { action: "dismiss" })}
                        >
                            Descartar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Lacunas acionáveis ─────────────────────────────────────────────────────

function GapsBlock({
    gaps,
    onDefineGap,
    subdued = false,
}: {
    gaps: ContextGap[];
    onDefineGap: (gap: ContextGap, answer: string) => void;
    /** Conta nova: as perguntas são plano B — botões recuados pro caminho
     *  do texto colado vencer claramente. */
    subdued?: boolean;
}) {
    const [openId, setOpenId] = useState<string | null>(null);
    const [answer, setAnswer] = useState("");
    const [definedIds, setDefinedIds] = useState<Set<string>>(new Set());
    const visible = [...gaps]
        .filter((g) => !definedIds.has(g.id))
        .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    if (visible.length === 0) return null;

    const handleSave = (gap: ContextGap) => {
        const text = answer.trim();
        if (!text) return;
        onDefineGap(gap, text);
        setDefinedIds((prev) => new Set(prev).add(gap.id));
        setOpenId(null);
        setAnswer("");
    };

    return (
        <div className="vz-ctxbuild-gaps">
            <p className="vz-agentcreate-label" style={{ marginBottom: 2 }}>
                Isto eu não consegui descobrir sozinha
            </p>
            {visible.map((gap) => {
                const open = openId === gap.id;
                return (
                    <div key={gap.id} className="vz-ctxbuild-gap">
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="vz-ctxbuild-gap-q">{gap.question}</p>
                                <p className="vz-ctxbuild-gap-meta">
                                    {gap.occurrenceCount > 0
                                        ? `Me faltou em ${gap.occurrenceCount} ${gap.occurrenceCount === 1 ? "conversa" : "conversas"} · trava: ${gap.blocks}`
                                        : `Pergunta essencial · destrava: ${gap.blocks}`}
                                </p>
                            </div>
                            {!open && (
                                <button
                                    type="button"
                                    className={`vz-ctxbuild-gap-define ${subdued ? "vz-ctxbuild-gap-define--lite" : ""}`}
                                    onClick={() => {
                                        setOpenId(gap.id);
                                        setAnswer("");
                                    }}
                                >
                                    Definir agora
                                </button>
                            )}
                        </div>
                        {open && (
                            <>
                                <textarea
                                    className="vz-ctxbuild-edit"
                                    style={{ minHeight: 56, borderColor: "rgba(217,119,6,0.35)" }}
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Responde do seu jeito, eu estruturo."
                                    autoFocus
                                    aria-label={gap.question}
                                />
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <button
                                        type="button"
                                        className="vz-evassist-btn vz-evassist-btn--primary"
                                        onClick={() => handleSave(gap)}
                                        disabled={!answer.trim()}
                                    >
                                        <Check style={{ width: 13, height: 13 }} />
                                        Salvar
                                    </button>
                                    <button
                                        type="button"
                                        className="vz-evassist-btn vz-evassist-btn--ghost"
                                        onClick={() => setOpenId(null)}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Estado conta nova — atalho generoso, nunca formulário em branco ────────

function PasteFirstState({
    gaps,
    onDefineGap,
    onSubmitText,
    hideHeader,
}: {
    gaps: ContextGap[];
    onDefineGap: (gap: ContextGap, answer: string) => void;
    onSubmitText: (text: string) => void;
    hideHeader?: boolean;
}) {
    const [text, setText] = useState("");

    return (
        <div className="vz-ctxbuild">
            {!hideHeader && (
            <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <EvaEntity size={44} state="listening" />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-agentcreate-label">Construção guiada</p>
                    <h1 className="vz-agentcreate-title" style={{ marginTop: 2, fontSize: 22 }}>
                        Ainda não vi a sua operação
                    </h1>
                </div>
                {/* Não é "em escuta" (não há nada chegando pra escutar) — a
                    honestidade do selo: ela está pronta, esperando o gestor. */}
                <span
                    className="vz-agentcreate-seal"
                    style={{ borderColor: "#DDE4EC", color: "#64748B" }}
                    title="Sem dado ainda. Assim que você colar um texto, eu começo."
                >
                    <span className="vz-agentcreate-seal-dot" style={{ background: "#94A3B8" }} />
                    Pronta pra aprender
                </span>
            </div>
            <p className="vz-agentcreate-sub" style={{ marginTop: 8, maxWidth: 560 }}>
                Eu ainda não tenho de onde entender o seu negócio. Você resolve isso em
                30 segundos:
            </p>
            </>
            )}

            {/* O herói: colar qualquer texto. Atalho generoso, não pedágio —
                o pipeline de extração já existe e faz o trabalho pesado. */}
            <div className="vz-ctxbuild-paste">
                <p className="vz-agentcreate-label">Me dá um texto que você já tem</p>
                <p className="vz-agentcreate-sub" style={{ marginTop: 4, fontSize: 12 }}>
                    Proposta, página do site, pitch, até uma mensagem que você manda pra
                    lead. Qualquer coisa serve. Cola aqui e em segundos vira cards do
                    tipo "vocês vendem X por Y", prontos pra você só confirmar.
                </p>
                <textarea
                    className="vz-ctxbuild-paste-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Cola aqui…"
                    aria-label="Texto da sua operação"
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                    <button
                        type="button"
                        className="vz-evassist-btn vz-evassist-btn--primary"
                        onClick={() => text.trim() && onSubmitText(text.trim())}
                        disabled={!text.trim()}
                    >
                        Extrair contexto disto
                        <ArrowRight style={{ width: 13, height: 13 }} />
                    </button>
                    <p className="vz-ctxbuild-learn" style={{ marginTop: 0 }}>
                        Nada entra sem você confirmar item por item.
                    </p>
                </div>
            </div>

            {/* O que sobrar vem como pergunta, uma de cada vez (mesma UI de lacunas) */}
            {gaps.length > 0 && (
                <>
                    <p
                        className="vz-agentcreate-sub"
                        style={{ marginTop: 24, fontSize: 12 }}
                    >
                        Ou, se preferir, responde uma pergunta de cada vez:
                    </p>
                    <GapsBlock gaps={gaps} onDefineGap={onDefineGap} subdued />
                </>
            )}
        </div>
    );
}
