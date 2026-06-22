// ─────────────────────────────────────────────────────────────────────────────
// GuidedSimulationReplay (EVA.STUDIO.F3, 2026-06-08) — a PROVA DE CONFIANÇA que
// SUBSTITUI a aba de simulações sintéticas (EvaSimulationsTab + SCENARIOS).
//
// Não é sandbox de lead fictício: é REPLAY de conversa REAL que o gestor já
// viveu. A EVA pega o MOMENTO-CHAVE (o ponto onde o lead testou: preço,
// objeção, garantia) e mostra "olha como eu teria respondido aqui" — num caso
// onde o gestor já sabe como terminou.
//
// REGRAS DE ALMA:
// - ÂNCORA = desfecho real ("esse lead você perdeu, eu teria segurado"). A fala
//   do vendedor humano fica ESCONDIDA atrás de um opt-in ("ver o que foi
//   respondido na época") — força sem virar tribunal do próprio time.
// - Julgamento: "Mandaria essa" (approve) / "Faria diferente" (adjust → o delta
//   vira SuggestionOutcome, mesmo aprendizado do Inbox/F2) / "Inaceitável"
//   (redline — linha vermelha). Mais "pular".
// - TERMÔMETRO HONESTO: aprovação enche; correção marca afiação pendente e NÃO
//   enche; redline em caso CRÍTICO BLOQUEIA a ativação (hard-stop de linha
//   vermelha). Pode dizer "ainda não tá afiada" — nunca mente sobre prontidão.
// - ATIVAÇÃO = convite NÃO-BLOQUEANTE no pico de confiança → liga a EVA L2
//   (no integrado: eva_blueprints.approved_assisted, que JÁ existe). Em estado
//   morno o botão continua disponível (convite, não pedágio); só a linha
//   vermelha crítica trava.
//
// REAPROVEITA na integração (não reconstruir): eva_simulation_results
// (scenario_id text → cabe id de momento real), useEvaSimulationResults,
// eva_blueprints.approved_assisted. Mapa de result: approve→approved,
// adjust→needs_adjustment(+delta), redline→rejected(is_critical bloqueia).
//
// PRESENTATIONAL: dados via props, mock no preview. Geração dos momentos
// (job pré-computa momento + resposta hipotética) é a fase de integração.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Loader2, PencilLine, RefreshCw, ShieldAlert } from "lucide-react";
import { EvaEntity } from "@/components/eva/EvaEntity";
import {
    buildSuggestionOutcome,
    type SuggestionOutcome,
} from "@/lib/eva/suggestionFeedback";

// ─── Tipos ──────────────────────────────────────────────────────────────────

/** Desfecho real da conversa — a âncora de julgamento. */
export type ReplayOutcome = "lost" | "ghosted" | "won";

export interface ReplayMoment {
    id: string;
    /** Conversa real de origem — usada no integrado pra gravar o aprendizado. */
    conversationId?: string | null;
    /** Quem é o lead ("Marina · Clínica Odonto Sorriso"). */
    leadName: string;
    /** O tipo de tensão do momento ("Objeção de preço", "Pedido de garantia"). */
    tension: string;
    /** Linha vermelha: se a EVA escorregar aqui, a ativação trava. */
    critical?: boolean;
    outcome: ReplayOutcome;
    /** Como terminou de verdade ("Sumiu depois desta pergunta"). */
    outcomeDetail: string;
    /** O que rolou até o momento-chave (1-2 linhas de contexto). */
    context: string;
    /** A fala do lead que testou o vendedor. */
    leadMessage: string;
    /** Como a EVA teria respondido naquele ponto. */
    evaReply: string;
    /** O que o vendedor humano respondeu de fato — opt-in, escondido. */
    sellerReply?: string;
}

export type MomentJudgment =
    | { action: "approve" }
    | { action: "adjust"; correctedText: string; outcome: SuggestionOutcome }
    | { action: "redline" }
    | { action: "skip" };

export interface GuidedSimulationReplayProps {
    /** false = ainda não há conversas reais com desfecho suficientes (estado vazio). */
    hasReplays: boolean;
    moments: ReplayMoment[];
    /** ÚNICO caminho de escrita do julgamento (quem integra grava). */
    onJudge: (moment: ReplayMoment, judgment: MomentJudgment) => void;
    /** Liga a EVA L2 no Inbox (no integrado: approved_assisted). */
    onActivate: () => void;
    /** Julgamentos já persistidos (id do momento → ação), pra semear o termômetro. */
    initialJudgments?: Record<string, JudgeAction>;
    /** Dispara a geração de momentos a partir das conversas reais. */
    onRegenerate?: () => void;
    /** true enquanto a geração roda. */
    regenerating?: boolean;
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
}

/** Mínimo de momentos julgados antes de o convite esquentar de verdade. */
const MIN_JUDGED = 3;
/** Taxa de aprovação a partir da qual a EVA é considerada "afiada". */
const READY_RATE = 0.7;

type JudgeAction = MomentJudgment["action"];

const OUTCOME_META: Record<
    ReplayOutcome,
    { label: string; color: string; bg: string; border: string }
> = {
    lost: { label: "Perdido", color: "#DC2626", bg: "#FEF2F2", border: "rgba(220,38,38,0.22)" },
    ghosted: { label: "Sumiu", color: "#B45309", bg: "#FFF7E8", border: "rgba(217,119,6,0.28)" },
    won: { label: "Você fechou", color: "#15803D", bg: "#ECFDF3", border: "rgba(22,163,74,0.25)" },
};

// ─── Componente ─────────────────────────────────────────────────────────────

export function GuidedSimulationReplay({
    hasReplays,
    moments,
    onJudge,
    onActivate,
    initialJudgments,
    onRegenerate,
    regenerating,
    hideHeader,
}: GuidedSimulationReplayProps) {
    // action por momento já julgado (tira da fila + alimenta o termômetro).
    // Semeia com o que já foi persistido (reabrir a tela mantém o progresso).
    const [judged, setJudged] = useState<Map<string, JudgeAction>>(
        () => new Map(Object.entries(initialJudgments ?? {})),
    );

    const pending = moments.filter((m) => !judged.has(m.id));

    // ── Termômetro HONESTO ──
    const judgedMoments = moments.filter((m) => judged.has(m.id));
    const approved = judgedMoments.filter((m) => judged.get(m.id) === "approve");
    const adjusted = judgedMoments.filter((m) => judged.get(m.id) === "adjust");
    // Conta de prontidão: aprovação enche, correção não. "skip" não conta.
    const scored = judgedMoments.filter((m) => judged.get(m.id) !== "skip");
    const approvalRate = scored.length ? approved.length / scored.length : 0;
    // Linha vermelha: redline em caso crítico = hard-stop.
    const criticalRedlines = moments.filter(
        (m) => m.critical && judged.get(m.id) === "redline",
    );
    const blocked = criticalRedlines.length > 0;
    const enough = scored.length >= MIN_JUDGED;
    const ready = !blocked && enough && approvalRate >= READY_RATE;

    const readiness: "blocked" | "warming" | "ready" = blocked
        ? "blocked"
        : ready
            ? "ready"
            : "warming";
    const scorePct = Math.round(approvalRate * 100);

    const handleJudge = (m: ReplayMoment, j: MomentJudgment) => {
        setJudged((prev) => new Map(prev).set(m.id, j.action));
        onJudge(m, j);
    };

    if (!hasReplays) {
        return <EmptyReplayState onRegenerate={onRegenerate} regenerating={regenerating} hideHeader={hideHeader} />;
    }

    return (
        <div className="vz-ctxbuild">
            {/* Stagger de entrada dos momentos-chave. */}
            <style>{`
                @keyframes vzGsrRise {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .vz-gsr-rise { animation: vzGsrRise 0.42s cubic-bezier(0.22, 1, 0.36, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .vz-gsr-rise { animation: none !important; }
                }
            `}</style>
            {/* Header — mesma anatomia do F2 */}
            {!hideHeader && (
            <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <EvaEntity size={44} state="idle" />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-agentcreate-label">Prova de confiança</p>
                    <h1 className="vz-agentcreate-title" style={{ marginTop: 2, fontSize: 22 }}>
                        Eu nos seus casos reais
                    </h1>
                </div>
                <span
                    className="vz-agentcreate-seal"
                    title="Nada é enviado. Isto é só pra você ver como eu responderia antes de me soltar."
                >
                    <span className="vz-agentcreate-seal-dot" />
                    Você no controle
                </span>
            </div>
            <p className="vz-agentcreate-sub" style={{ marginTop: 8, maxWidth: 560 }}>
                Peguei conversas que você já viveu e o ponto onde o lead te testou.
                Olha como eu teria respondido. Você sabe como cada uma terminou.
            </p>
            </>
            )}

            {onRegenerate && (
                <button
                    type="button"
                    className="vz-simreplay-refresh"
                    onClick={onRegenerate}
                    disabled={regenerating}
                >
                    {regenerating ? (
                        <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                    ) : (
                        <RefreshCw style={{ width: 12, height: 12 }} />
                    )}
                    {regenerating ? "Procurando momentos…" : "Atualizar com novas conversas"}
                </button>
            )}

            {/* Fila de momentos */}
            {pending.map((m, i) => (
                <MomentCard key={m.id} moment={m} onJudge={handleJudge} index={i} />
            ))}

            {pending.length === 0 && (
                <div
                    className="vz-ctxbuild-card"
                    style={{ textAlign: "center", padding: "26px 18px" }}
                >
                    <Check
                        style={{ width: 18, height: 18, color: "#16A34A", margin: "0 auto 8px" }}
                        strokeWidth={2.6}
                    />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0B1220" }}>
                        Você revisou todos os momentos que eu separei.
                    </p>
                    <p style={{ fontSize: 11.5, color: "#64748B", marginTop: 3 }}>
                        Conforme novas conversas acontecem, trago mais casos pra você conferir.
                    </p>
                </div>
            )}

            {/* Painel de confiança + convite de ativação */}
            <ConfidencePanel
                readiness={readiness}
                scorePct={scorePct}
                scoredCount={scored.length}
                approvedCount={approved.length}
                adjustedCount={adjusted.length}
                criticalRedlines={criticalRedlines}
                onActivate={onActivate}
            />
        </div>
    );
}

// ─── Card de momento-chave ──────────────────────────────────────────────────

function MomentCard({
    moment,
    onJudge,
    index = 0,
}: {
    moment: ReplayMoment;
    onJudge: (m: ReplayMoment, j: MomentJudgment) => void;
    /** Posição na fila — alimenta o stagger de entrada. */
    index?: number;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const [showSeller, setShowSeller] = useState(false);
    const editing = draft !== null;
    const oc = OUTCOME_META[moment.outcome];

    const handleSaveCorrection = () => {
        const text = draft?.trim();
        if (!text) return;
        onJudge(moment, {
            action: "adjust",
            correctedText: text,
            outcome: buildSuggestionOutcome(moment.evaReply, text),
        });
    };

    return (
        <div
            className="vz-simreplay-card vz-gsr-rise"
            style={{ animationDelay: `${Math.min(index, 8) * 0.055}s` }}
        >
            {/* Cabeçalho: lead + tensão + etiqueta de desfecho */}
            <div className="vz-simreplay-head">
                <div style={{ minWidth: 0 }}>
                    <p className="vz-simreplay-lead">{moment.leadName}</p>
                    <p className="vz-simreplay-tension">
                        {moment.tension}
                        {moment.critical && (
                            <span className="vz-simreplay-critical" title="Caso crítico: se eu escorregar aqui, a ativação fica travada até você resolver.">
                                <ShieldAlert style={{ width: 11, height: 11 }} />
                                crítico
                            </span>
                        )}
                    </p>
                </div>
                <span
                    className="vz-simreplay-outcome"
                    style={{ color: oc.color, background: oc.bg, borderColor: oc.border }}
                >
                    {oc.label}
                </span>
            </div>

            <p className="vz-simreplay-context">{moment.context}</p>

            {/* O lead testou */}
            <div className="vz-simreplay-bubble vz-simreplay-bubble--lead">
                <span className="vz-simreplay-bubble-label">O lead te disse</span>
                {moment.leadMessage}
            </div>

            {/* Como a EVA teria respondido (ou correção em curso) */}
            {editing ? (
                <>
                    <textarea
                        className="vz-ctxbuild-edit"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        aria-label="Corrigir a resposta da EVA"
                    />
                    <p className="vz-ctxbuild-learn">
                        Do seu jeito. Sua correção me ensina, a próxima resposta vem melhor.
                    </p>
                </>
            ) : (
                <div className="vz-simreplay-bubble vz-simreplay-bubble--eva">
                    <span className="vz-simreplay-bubble-label">Eu teria respondido</span>
                    {moment.evaReply}
                </div>
            )}

            {/* Âncora: o desfecho real — sem acusar o vendedor */}
            {!editing && (
                <div
                    className="vz-simreplay-anchor"
                    style={{ background: oc.bg, borderColor: oc.border, color: oc.color }}
                >
                    {moment.outcomeDetail}
                </div>
            )}

            {/* Opt-in: a fala do vendedor na época, escondida por padrão */}
            {!editing && moment.sellerReply && (
                <div className="vz-simreplay-seller">
                    <button
                        type="button"
                        className="vz-simreplay-seller-toggle"
                        onClick={() => setShowSeller((v) => !v)}
                        aria-expanded={showSeller}
                    >
                        <ChevronDown
                            style={{
                                width: 12,
                                height: 12,
                                transform: showSeller ? "rotate(180deg)" : "none",
                                transition: "transform 0.18s ease",
                            }}
                        />
                        {showSeller ? "esconder o que foi respondido na época" : "ver o que foi respondido na época"}
                    </button>
                    {showSeller && <p className="vz-simreplay-seller-text">{moment.sellerReply}</p>}
                </div>
            )}

            {/* Julgamento */}
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
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--primary"
                            onClick={() => onJudge(moment, { action: "approve" })}
                        >
                            <Check style={{ width: 13, height: 13 }} />
                            Mandaria essa
                        </button>
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--ghost"
                            onClick={() => setDraft(moment.evaReply)}
                        >
                            <PencilLine style={{ width: 13, height: 13 }} />
                            Faria diferente
                        </button>
                        {/* Linha vermelha: discreta, mas é o que trava em caso crítico */}
                        <button
                            type="button"
                            className="vz-simreplay-redline"
                            onClick={() => onJudge(moment, { action: "redline" })}
                            title="A resposta cruzou uma linha que não pode (ex: promessa proibida)."
                        >
                            Inaceitável
                        </button>
                        <button
                            type="button"
                            className="vz-ctxbuild-dismiss"
                            onClick={() => onJudge(moment, { action: "skip" })}
                        >
                            Pular
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Painel de confiança + convite de ativação ─────────────────────────────

function ConfidencePanel({
    readiness,
    scorePct,
    scoredCount,
    approvedCount,
    adjustedCount,
    criticalRedlines,
    onActivate,
}: {
    readiness: "blocked" | "warming" | "ready";
    scorePct: number;
    scoredCount: number;
    approvedCount: number;
    adjustedCount: number;
    criticalRedlines: ReplayMoment[];
    onActivate: () => void;
}) {
    const barColor =
        readiness === "ready" ? "#16A34A" : readiness === "blocked" ? "#DC2626" : "#D97706";

    // O convite muda de TOM, mas só a linha vermelha TRAVA (não-bloqueante p/ qualidade).
    const headline =
        readiness === "ready"
            ? "Pode me soltar com confiança."
            : readiness === "blocked"
                ? "Tem uma linha vermelha pra resolver antes."
                : "Ainda não estou afiada o suficiente.";

    const reason =
        readiness === "ready"
            ? "Você aprovou a maioria dos casos que eu já errei antes. Quando quiser, passo a responder no Inbox (sempre pra você aprovar antes de enviar)."
            : readiness === "blocked"
                ? `Eu escorreguei num caso crítico (${criticalRedlines.map((m) => m.tension).join(", ")}). Me corrija ali e a porta abre.`
                : `Revisei ${scoredCount} ${scoredCount === 1 ? "caso" : "casos"} com você${adjustedCount > 0 ? `, e em ${adjustedCount} você faria diferente` : ""}. Vê mais alguns antes de me soltar, assim eu vou no Inbox mais certeira.`;

    return (
        <div
            className={`vz-simreplay-panel vz-simreplay-panel--${readiness}`}
            style={{ marginTop: 28 }}
        >
            <div className="vz-simreplay-panel-top">
                <EvaEntity size={30} state={readiness === "ready" ? "done" : readiness === "blocked" ? "alert" : "idle"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-simreplay-panel-headline">{headline}</p>
                    <p className="vz-simreplay-panel-reason">{reason}</p>
                </div>
                <span className="vz-simreplay-panel-score" style={{ color: barColor }}>
                    {scorePct}%
                </span>
            </div>

            <div className="vz-simreplay-bar">
                <div
                    className="vz-simreplay-bar-fill"
                    style={{ width: `${scorePct}%`, background: barColor }}
                />
            </div>
            <p className="vz-simreplay-bar-meta">
                {approvedCount} de {scoredCount || 0} aprovados · uso assistido, nunca autônomo
            </p>

            {/* Convite: travado só em linha vermelha; morno é convite honesto, não pedágio */}
            {readiness === "blocked" ? (
                <button type="button" className="vz-simreplay-activate" disabled>
                    <ShieldAlert style={{ width: 15, height: 15 }} />
                    Resolva o caso crítico pra liberar
                </button>
            ) : readiness === "ready" ? (
                <button
                    type="button"
                    className="vz-simreplay-activate vz-simreplay-activate--ready"
                    onClick={onActivate}
                >
                    Deixar a EVA responder no Inbox
                    <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
            ) : (
                <button
                    type="button"
                    className="vz-simreplay-activate vz-simreplay-activate--soft"
                    onClick={onActivate}
                >
                    Soltar mesmo assim
                    <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
            )}
        </div>
    );
}

// ─── Estado vazio — ainda não vivi conversas suas o suficiente ──────────────

function EmptyReplayState({
    onRegenerate,
    regenerating,
    hideHeader,
}: {
    onRegenerate?: () => void;
    regenerating?: boolean;
    hideHeader?: boolean;
}) {
    return (
        <div className="vz-ctxbuild">
            {!hideHeader && (
            <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <EvaEntity size={44} state="listening" />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-agentcreate-label">Prova de confiança</p>
                    <h1 className="vz-agentcreate-title" style={{ marginTop: 2, fontSize: 22 }}>
                        Ainda não vivi conversas suas o bastante
                    </h1>
                </div>
                <span
                    className="vz-agentcreate-seal"
                    style={{ borderColor: "#DDE4EC", color: "#64748B" }}
                    title="Sem conversas com desfecho ainda. Assim que houver, eu monto o replay."
                >
                    <span className="vz-agentcreate-seal-dot" style={{ background: "#94A3B8" }} />
                    Observando
                </span>
            </div>
            <p className="vz-agentcreate-sub" style={{ marginTop: 8, maxWidth: 560 }}>
                Pra te provar que pode confiar em mim, eu preciso te mostrar nos seus
                próprios casos, não em exemplos inventados. Isso exige conversas reais
                que já terminaram (um lead que fechou, um que sumiu).
            </p>
            </>
            )}

            <div className="vz-simreplay-empty">
                <p className="vz-agentcreate-label">O que destrava esta tela</p>
                <ul className="vz-simreplay-empty-list">
                    <li>
                        <span className="vz-simreplay-empty-dot" />
                        Conversas do WhatsApp ligadas ao seu pipeline, com desfecho
                        (ganho ou perdido).
                    </li>
                    <li>
                        <span className="vz-simreplay-empty-dot" />
                        Pelo menos um punhado de leads que passaram por um momento de
                        tensão (preço, objeção, garantia).
                    </li>
                </ul>
                <p className="vz-agentcreate-sub" style={{ marginTop: 12, fontSize: 12 }}>
                    Assim que isso existir, eu separo os momentos sozinha e te chamo aqui.
                    Enquanto isso, vale ensinar meu contexto na construção guiada.
                </p>
                {onRegenerate && (
                    <button
                        type="button"
                        className="vz-evassist-btn vz-evassist-btn--primary"
                        style={{ marginTop: 16 }}
                        onClick={onRegenerate}
                        disabled={regenerating}
                    >
                        {regenerating ? (
                            <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                        ) : (
                            <RefreshCw style={{ width: 13, height: 13 }} />
                        )}
                        {regenerating ? "Procurando nas suas conversas…" : "Procurar momentos agora"}
                    </button>
                )}
            </div>
        </div>
    );
}
