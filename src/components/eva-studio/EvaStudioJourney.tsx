// ─────────────────────────────────────────────────────────────────────────────
// EvaStudioJourney (EVA.STUDIO.JOURNEY, 2026-06-09) — o ACOPLAMENTO: a jornada
// completa do novo EVA Studio, juntando as peças que antes viviam soltas no
// preview (chat conversacional + campo de provas) com a casca e as frentes
// já validadas.
//
//   Criar   → AgentPurposeCreate (1 decisão, 3 propósitos)
//   Ensinar → ConversationalStudio (conversar = caminho principal)
//             + GuidedContextBuilder (revisar o que a EVA extraiu)
//   Provar  → SimulationLab (campo de provas: do tranquilo ao extremo)
//             + GuidedSimulationReplay (seus casos reais: termômetro + gate)
//   Ativar  → confirmação final (no integrado: status → approved_assisted)
//
// Regras do fluxo:
//   - O CTA do chat ("Testar a EVA nos meus casos") leva DIRETO pro Provar.
//   - Cobrir os 5 níveis do campo de provas convida pros casos reais — mas é
//     o replay real (com linha vermelha) que LIBERA a ativação.
//   - Prontidão na lateral é honesta: cresce com passo concluído e com
//     julgamento feito, não com clique de navegação.
//
// Vistas secundárias (não competem com a jornada): Memória ("tudo que eu sei
// e de onde veio") e Insights ("o que melhorar antes de ativar") abrem pela
// lateral por cima do passo atual, com volta explícita pra jornada. O conteúdo
// entra como ReactNode (memoryContent/insightsContent) — quem integra passa
// EvaMemoryTab/EvaInsightsTab reais; o preview passa mocks.
//
// Animação (EVA.STUDIO.MOTION): cada troca de passo/vista remonta o palco
// (.vz-journey-stage, key) → entrada fade+slide. Os MODOS dentro de um passo
// ficam MONTADOS e escondidos ([hidden]) — alternar Conversar↔Revisar ou
// Campo↔Casos reais não perde a conversa nem os julgamentos já feitos.
//
// PRESENTATIONAL: dados e escrita 100% via props (quem integra grava).
// ─────────────────────────────────────────────────────────────────────────────
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";
import type { EvaOrbState } from "@/components/landing-v2/EvaOrb";
import {
    AgentPurposeCreate,
    type AgentPurpose,
    type AgentPurposeOption,
    type AgentSourceInfo,
} from "./AgentPurposeCreate";
import {
    GuidedContextBuilder,
    type ContextGap,
    type ContextSuggestion,
    type SuggestionResolution,
} from "./GuidedContextBuilder";
import {
    GuidedSimulationReplay,
    type MomentJudgment,
    type ReplayMoment,
} from "./GuidedSimulationReplay";
import { ConversationalStudio } from "./ConversationalStudio";
import { SimulationLab, type LabJudgment, type LabScenario } from "./SimulationLab";
import { EvaStudioShell, type StudioStepKey } from "./EvaStudioShell";
import { getSpecialist, type SpecialistKey } from "@/lib/eva/evaSpecialists";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type TeachMode = "conversa" | "revisao";
type ProveMode = "campo" | "reais";

export interface EvaStudioJourneyProps {
    // Criar
    purposes: AgentPurposeOption[];
    sources: AgentSourceInfo[];
    onCreate: (purpose: AgentPurpose) => void;
    // Ensinar
    hasSourceMaterial: boolean;
    suggestions: ContextSuggestion[];
    gaps: ContextGap[];
    onResolve: (s: ContextSuggestion, r: SuggestionResolution) => void;
    onConfirmBatch?: (batch: ContextSuggestion[]) => void;
    onDefineGap: (gap: ContextGap, answer: string) => void;
    onSubmitText: (text: string) => void;
    // Provar
    hasReplays: boolean;
    moments: ReplayMoment[];
    onJudge: (m: ReplayMoment, j: MomentJudgment) => void;
    onLabJudge?: (s: LabScenario, j: LabJudgment) => void;
    /** Julgamentos do replay já persistidos (semeia termômetro + prontidão). */
    replayInitialJudgments?: Record<string, MomentJudgment["action"]>;
    /** Dispara a geração de momentos a partir das conversas reais. */
    onRegenerateReplays?: () => void;
    regeneratingReplays?: boolean;
    // Ativar
    onActivate: () => void;
    // Vistas secundárias (lateral): conteúdo pronto, renderizado por cima do passo
    memoryContent?: ReactNode;
    insightsContent?: ReactNode;
    /** Analytics da EVA — vista transversal (não é etapa da jornada). */
    analyticsContent?: ReactNode;
    /** Retomar a jornada de onde parou (no integrado vem do blueprint). */
    initialStep?: StudioStepKey;
    /** EVA já aprovada (approved_assisted) → painel Ativar em estado "ativa". */
    initialActivated?: boolean;
    /** Modo default do Ensinar ("revisao" no integrado enquanto o chat é prévia). */
    initialTeachMode?: TeachMode;
    /** Selo no pill do chat (ex. "prévia") enquanto a EVA conversacional não é real. */
    chatBadge?: string;
}

type AsideView = "memoria" | "insights" | "analytics";

/** Handle imperativo: deixa quem integra navegar a jornada de fora (ex.: o
 *  "Ir para Ensinar" do painel Analytics fecha a vista e abre o passo Ensinar). */
export interface EvaStudioJourneyHandle {
    /** Fecha qualquer vista secundária e leva pro passo informado. */
    goToStep: (key: StudioStepKey) => void;
}

const ASIDE_META: Record<AsideView, { title: string; sub: string }> = {
    memoria: { title: "Memória da EVA", sub: "Tudo que eu sei hoje, e de onde cada coisa veio." },
    insights: { title: "Insights da EVA", sub: "O que melhorar antes de me soltar no Inbox." },
    analytics: { title: "Analytics da EVA", sub: "O que a EVA fez no período: confiança, resultado e o que ensinar." },
};

const STEPS = [
    { key: "criar" as StudioStepKey, label: "Criar", sub: "Escolher o propósito" },
    { key: "ensinar" as StudioStepKey, label: "Ensinar", sub: "Conversar e construir o contexto" },
    { key: "provar" as StudioStepKey, label: "Provar", sub: "Testar do simples ao extremo" },
    { key: "ativar" as StudioStepKey, label: "Ativar", sub: "Soltar no Inbox, você no controle" },
];

const ORDER: StudioStepKey[] = ["criar", "ensinar", "provar", "ativar"];

// O orb do cabeçalho reage ao passo (EvaOrb não tem 'configuring'/'ready' →
// mapeia pro vocabulário disponível: idle → thinking → analyzing → speaking).
const STEP_ORB: Record<StudioStepKey, EvaOrbState> = {
    criar: "idle",
    ensinar: "thinking",
    provar: "analyzing",
    ativar: "speaking",
};

// ─── Componente ─────────────────────────────────────────────────────────────

export const EvaStudioJourney = forwardRef<EvaStudioJourneyHandle, EvaStudioJourneyProps>(function EvaStudioJourney({
    purposes,
    sources,
    onCreate,
    hasSourceMaterial,
    suggestions,
    gaps,
    onResolve,
    onConfirmBatch,
    onDefineGap,
    onSubmitText,
    hasReplays,
    moments,
    onJudge,
    onLabJudge,
    replayInitialJudgments,
    onRegenerateReplays,
    regeneratingReplays,
    onActivate,
    memoryContent,
    insightsContent,
    analyticsContent,
    initialStep,
    initialActivated,
    initialTeachMode,
    chatBadge,
}: EvaStudioJourneyProps, ref) {
    const [step, setStep] = useState<StudioStepKey>(initialStep ?? "criar");
    const [doneKeys, setDoneKeys] = useState<StudioStepKey[]>(() =>
        initialActivated ? [...ORDER] : initialStep ? ORDER.slice(0, ORDER.indexOf(initialStep)) : [],
    );
    const [teachMode, setTeachMode] = useState<TeachMode>(initialTeachMode ?? "conversa");
    // Agente especialista escolhido na galeria — define o chat (cor + perguntas).
    const [chosenAgent, setChosenAgent] = useState<SpecialistKey>("qualificacao");
    const [proveMode, setProveMode] = useState<ProveMode>("campo");
    // Contadores honestos pra barra de prontidão (sessão atual; o persistido
    // entra via replayInitialJudgments — novos julgamentos são sempre de
    // momentos pendentes, então somar não duplica)
    const [labJudged, setLabJudged] = useState(0);
    const [replayJudged, setReplayJudged] = useState(0);
    const [activated, setActivated] = useState(!!initialActivated);
    // Vista secundária aberta por cima do passo atual (null = jornada)
    const [aside, setAside] = useState<AsideView | null>(null);
    // Vista em saída: fica no DOM enquanto faz o fade-out, depois some
    const [closingAside, setClosingAside] = useState<AsideView | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fecha a vista secundária com fade-out (~0.2s) antes de remover do DOM.
    // reduced-motion / sem vista aberta → remoção imediata.
    const closeAside = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        if (aside) {
            setClosingAside(aside);
            closeTimer.current = setTimeout(() => setClosingAside(null), 200);
        }
        setAside(null);
    };
    // Limpa o timer pendente ao desmontar (evita setState fora do ciclo de vida)
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    const persistedReplayCount = useMemo(
        () => Object.values(replayInitialJudgments ?? {}).filter((a) => a !== "skip").length,
        [replayInitialJudgments],
    );

    const markDone = (key: StudioStepKey) =>
        setDoneKeys((d) => (d.includes(key) ? d : [...d, key]));

    // Saída direta pra um passo: a vista some na hora (o palco já remonta no passo)
    const snapAsideClosed = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setAside(null);
        setClosingAside(null);
    };

    const advance = (from: StudioStepKey, to: StudioStepKey) => {
        markDone(from);
        setStep(to);
        snapAsideClosed();
    };

    // Clicar num passo (stepper/lateral) sempre volta pra jornada
    const selectStep = (key: StudioStepKey) => {
        setStep(key);
        snapAsideClosed();
    };

    // Navegação imperativa de fora (ex.: painel Analytics → "Ir para Ensinar").
    // Marca como concluídos os passos anteriores ao destino, pra ele ficar
    // alcançável pelo stepper (reachable depende de doneKeys/índice atual).
    useImperativeHandle(ref, () => ({
        goToStep: (key: StudioStepKey) => {
            const target = ORDER.indexOf(key);
            if (target > 0) {
                setDoneKeys((d) => {
                    const next = [...d];
                    for (const k of ORDER.slice(0, target)) if (!next.includes(k)) next.push(k);
                    return next;
                });
            }
            selectStep(key);
        },
    }), []);

    // ── Prontidão: passo concluído + julgamento feito enchem; clique não ──
    const totalReplayJudged = replayJudged + persistedReplayCount;
    const readinessPct = activated
        ? 1
        : Math.min(
              0.95,
              0.05 +
                  (doneKeys.includes("criar") ? 0.15 : 0) +
                  (doneKeys.includes("ensinar") ? 0.25 : 0) +
                  Math.min(labJudged / 5, 1) * 0.15 +
                  (moments.length ? Math.min(totalReplayJudged / moments.length, 1) * 0.35 : 0),
          );

    // ── Wrappers que contam antes de repassar pra quem grava ──
    const handleLabJudge = (s: LabScenario, j: LabJudgment) => {
        setLabJudged((n) => n + 1);
        onLabJudge?.(s, j);
    };
    const handleReplayJudge = (m: ReplayMoment, j: MomentJudgment) => {
        if (j.action !== "skip") setReplayJudged((n) => n + 1);
        onJudge(m, j);
    };

    return (
        <EvaStudioShell
            steps={STEPS}
            current={step}
            doneKeys={doneKeys}
            onSelect={selectStep}
            readiness={{ label: "Prontidão da EVA", pct: readinessPct }}
            hideStepLabel={aside !== null}
            orbState={aside ? "analyzing" : STEP_ORB[step]}
            secondary={(["memoria", "insights", "analytics"] as AsideView[])
                .filter((v) => (v === "memoria" ? memoryContent : v === "insights" ? insightsContent : analyticsContent))
                .map((v) => ({
                    key: v,
                    label: v === "memoria" ? "Memória" : v === "insights" ? "Insights" : "Analytics",
                    active: aside === v,
                    onClick: () => {
                        if (aside === v) {
                            closeAside();
                        } else {
                            // Abrir outra vista cancela qualquer fade-out em curso
                            if (closeTimer.current) clearTimeout(closeTimer.current);
                            setClosingAside(null);
                            setAside(v);
                        }
                    },
                }))}
        >
            {/* Palco: a key remonta a cada troca de passo/vista → entrada animada.
                Durante o fade-out da vista (closingAside) a key fica estável pra
                não trazer o passo pra baixo antes de a vista sumir. */}
            <div key={aside ?? (closingAside ? `closing-${closingAside}` : step)} className="vz-journey-stage">
                {/* ── Vista secundária por cima do passo (Memória / Insights) ── */}
                {(aside || closingAside) && (() => {
                    const view = aside ?? closingAside!;
                    return (
                        <div className={`vz-journey-aside ${closingAside && !aside ? "vz-journey-aside--closing" : ""}`}>
                            <button type="button" className="vz-journey-back" onClick={closeAside}>
                                <ArrowLeft style={{ width: 13, height: 13 }} />
                                Voltar pra jornada
                            </button>
                            <div className="vz-journey-aside-head">
                                <h2 className="vz-journey-aside-title">{ASIDE_META[view].title}</h2>
                                <p className="vz-journey-aside-sub">{ASIDE_META[view].sub}</p>
                            </div>
                            {view === "memoria" ? memoryContent : view === "insights" ? insightsContent : analyticsContent}
                        </div>
                    );
                })()}

                {/* ── Criar ── */}
                {!aside && !closingAside && step === "criar" && (
                    <AgentPurposeCreate
                        hideHeader
                        purposes={purposes}
                        sources={sources}
                        onCreate={onCreate}
                        onPickSpecialist={setChosenAgent}
                        onProceed={() => advance("criar", "ensinar")}
                    />
                )}

                {/* ── Ensinar: conversar (principal) ou revisar o extraído ──
                    Modos montados e escondidos: alternar não perde a conversa */}
                {!aside && !closingAside && step === "ensinar" && (
                    <>
                        <div className="vz-studiomode" role="tablist" aria-label="Como ensinar a EVA">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={teachMode === "conversa"}
                                className={`vz-studiomode-btn ${teachMode === "conversa" ? "vz-studiomode-btn--on" : ""}`}
                                onClick={() => setTeachMode("conversa")}
                            >
                                Conversar com a EVA
                                {chatBadge && <span className="vz-studiomode-tag">{chatBadge}</span>}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={teachMode === "revisao"}
                                className={`vz-studiomode-btn ${teachMode === "revisao" ? "vz-studiomode-btn--on" : ""}`}
                                onClick={() => setTeachMode("revisao")}
                            >
                                Revisar o que ela extraiu
                                {suggestions.length + gaps.length > 0 && (
                                    <span className="vz-studiomode-badge">{suggestions.length + gaps.length}</span>
                                )}
                            </button>
                        </div>

                        {/* Cross-fade entre Conversar↔Revisar: ambos montados
                            (preserva conversa/julgamentos), só anima opacity/transform */}
                        <div className="vz-modeswap">
                            <div
                                className={`vz-modeswap-pane ${teachMode === "conversa" ? "vz-modeswap-pane--on" : "vz-modeswap-pane--off"}`}
                                aria-hidden={teachMode !== "conversa"}
                            >
                                <ConversationalStudio
                                    hideHeader
                                    agentKey={chosenAgent}
                                    onProceed={() => advance("ensinar", "provar")}
                                    onComplete={(fields) => {
                                        // Fecha o ciclo: o que a conversa montou vira material
                                        // pro contexto da EVA (a etapa Revisar mostra como sugestões).
                                        const spec = getSpecialist(chosenAgent);
                                        const text = spec.fields
                                            .map((f) => (fields[f.key] ? `${f.label}: ${fields[f.key]}` : ""))
                                            .filter(Boolean)
                                            .join("\n");
                                        if (text) onSubmitText(text);
                                    }}
                                />
                            </div>
                            <div
                                className={`vz-modeswap-pane ${teachMode === "revisao" ? "vz-modeswap-pane--on" : "vz-modeswap-pane--off"}`}
                                aria-hidden={teachMode !== "revisao"}
                            >
                                <GuidedContextBuilder
                                    hideHeader
                                    hasSourceMaterial={hasSourceMaterial}
                                    suggestions={suggestions}
                                    gaps={gaps}
                                    onResolve={onResolve}
                                    onConfirmBatch={onConfirmBatch}
                                    onDefineGap={onDefineGap}
                                    onSubmitText={onSubmitText}
                                />
                                <div className="vz-journey-footnav">
                                    <button
                                        type="button"
                                        className="vz-journey-footnav-btn"
                                        onClick={() => advance("ensinar", "provar")}
                                    >
                                        Continuar: provar a EVA
                                        <ArrowRight style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── Provar: campo de provas (aquecimento) → casos reais (gate) ──
                    Modos montados e escondidos: voltar não zera os julgamentos */}
                {!aside && !closingAside && step === "provar" && (
                    <>
                        <div className="vz-studiomode" role="tablist" aria-label="Como provar a EVA">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={proveMode === "campo"}
                                className={`vz-studiomode-btn ${proveMode === "campo" ? "vz-studiomode-btn--on" : ""}`}
                                onClick={() => setProveMode("campo")}
                            >
                                Campo de provas
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={proveMode === "reais"}
                                className={`vz-studiomode-btn ${proveMode === "reais" ? "vz-studiomode-btn--on" : ""}`}
                                onClick={() => setProveMode("reais")}
                            >
                                Seus casos reais
                                {moments.length > 0 && (
                                    <span className="vz-studiomode-badge">{moments.length}</span>
                                )}
                            </button>
                        </div>

                        {/* Cross-fade entre Campo↔Casos reais: ambos montados
                            (voltar não zera os julgamentos), só anima opacity/transform */}
                        <div className="vz-modeswap">
                            <div
                                className={`vz-modeswap-pane ${proveMode === "campo" ? "vz-modeswap-pane--on" : "vz-modeswap-pane--off"}`}
                                aria-hidden={proveMode !== "campo"}
                            >
                                <SimulationLab
                                    hideHeader
                                    onJudge={handleLabJudge}
                                    onComplete={() => setProveMode("reais")}
                                />
                            </div>
                            <div
                                className={`vz-modeswap-pane ${proveMode === "reais" ? "vz-modeswap-pane--on" : "vz-modeswap-pane--off"}`}
                                aria-hidden={proveMode !== "reais"}
                            >
                                <GuidedSimulationReplay
                                    hideHeader
                                    hasReplays={hasReplays}
                                    moments={moments}
                                    initialJudgments={replayInitialJudgments}
                                    onJudge={handleReplayJudge}
                                    onActivate={() => advance("provar", "ativar")}
                                    onRegenerate={onRegenerateReplays}
                                    regenerating={regeneratingReplays}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* ── Ativar ── */}
                {!aside && !closingAside && step === "ativar" && (
                    <div className={`vz-simreplay-panel vz-simreplay-panel--ready vz-journey-activate ${activated ? "vz-journey-activate--on" : ""}`}>
                        <div className="vz-simreplay-panel-top">
                            <span className={`vz-journey-activate-orb ${activated ? "vz-journey-activate-orb--on" : ""}`}>
                                <EvaThinkingOrb
                                    state={activated ? "composing" : "working"}
                                    size={64}
                                    displaySize={52}
                                    theme="light"
                                    agentKey="qualificacao"
                                    aria-hidden
                                />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="vz-simreplay-panel-headline">
                                    {activated
                                        ? "A EVA está ativa no seu Inbox."
                                        : "A EVA está pronta pra te ajudar no Inbox."}
                                </p>
                                <p className="vz-simreplay-panel-reason">
                                    {activated
                                        ? "A partir de agora ela sugere respostas nas suas conversas. Nada sai sem você aprovar, e cada correção sua continua ensinando."
                                        : "Você criou, ensinou e provou. Agora a EVA passa a sugerir respostas no Inbox, sempre pra você aprovar antes de enviar."}
                                </p>
                            </div>
                        </div>
                        {!activated && (
                            <button
                                type="button"
                                className="vz-simreplay-activate vz-simreplay-activate--ready"
                                style={{ marginTop: 16 }}
                                onClick={() => {
                                    setActivated(true);
                                    markDone("ativar");
                                    onActivate();
                                }}
                            >
                                Ativar a EVA no Inbox
                            </button>
                        )}
                    </div>
                )}
            </div>
        </EvaStudioShell>
    );
});
