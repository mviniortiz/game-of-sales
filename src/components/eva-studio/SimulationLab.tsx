// ─────────────────────────────────────────────────────────────────────────────
// SimulationLab (EVA.STUDIO.SIMLAB, 2026-06-09) — o "Campo de Provas" da EVA.
//
// Substitui a simulação antiga (lista de cenários sintéticos simples demais).
// Visão (Markus): mostrar como a EVA se comporta em CADA situação, da mais
// simples à mais COMPLEXA, de forma clara pro gestor (sem sobrecarregar).
//
// Design (persona designer sênior, refs Decagon/Sierra simulation mode +
// Anthropic evals trace + UX edge-case happy-path→disaster):
//   - TRILHA de dificuldade crescente (não tabela): do lead tranquilo ao
//     pesadelo (objeções múltiplas + pedido proibido).
//   - SALA que RODA a conversa animada (reusa o "pensando"): lead → EVA pensa →
//     EVA responde.
//   - TRACE: ao lado de cada resposta, "o que a EVA percebeu" (intenção,
//     temperatura, alerta de linha vermelha) — o porquê, não só o quê.
//   - VEREDITO: segurou? respeitou a linha vermelha? escalou pro humano?
//
// PRESENTATIONAL: cenários roteirizados no preview. Geração/avaliação real é a
// fase de integração (reaproveita eva_simulation_results).
//
// Acoplamento (EVA.STUDIO.JOURNEY): "Mandaria assim"/"Faria diferente" agora
// JULGAM de verdade (onJudge, com o mesmo SuggestionOutcome do resto do
// Studio); a trilha marca o que já foi visto; cobrir os 5 níveis libera o
// convite pros casos reais (onComplete).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, ShieldAlert, UserRound, PencilLine } from "lucide-react";
import { EvaEntity } from "@/components/eva/EvaEntity";
import {
    buildSuggestionOutcome,
    type SuggestionOutcome,
} from "@/lib/eva/suggestionFeedback";

interface SimRead {
    intent: string;
    temp: string;
    flag?: string; // alerta / linha vermelha detectada
}
interface SimTurn {
    from: "lead" | "eva";
    text: string;
    read?: SimRead; // só nos turnos da EVA
    handoff?: boolean; // a EVA passou pro humano neste ponto
}
export interface LabScenario {
    id: string;
    persona: string;
    personaType: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    difficultyLabel: string;
    tension: string;
    turns: SimTurn[];
    verdict: { status: "ok" | "critical"; line: string };
}

export type LabJudgment =
    | { action: "approve" }
    | { action: "adjust"; correctedText: string; outcome: SuggestionOutcome };

export interface SimulationLabProps {
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
    /** ÚNICO caminho de escrita do julgamento (quem integra grava). */
    onJudge?: (scenario: LabScenario, judgment: LabJudgment) => void;
    /** Cobriu os 5 níveis → convite pros casos reais (passo seguinte da prova). */
    onComplete?: () => void;
}

const DIFF_COLOR: Record<number, string> = {
    1: "#16a34a", 2: "#0891b2", 3: "#d97706", 4: "#ea580c", 5: "#dc2626",
};

const SCENARIOS: LabScenario[] = [
    {
        id: "s1",
        persona: "Ana",
        personaType: "Curiosa, primeira conversa",
        difficulty: 1,
        difficultyLabel: "Tranquilo",
        tension: "Interesse inicial",
        turns: [
            { from: "lead", text: "Oi! Vi vocês no Instagram e queria entender melhor a gestão de tráfego." },
            {
                from: "eva",
                text: "Oi Ana, que bom! A gente cuida de tráfego no Meta e Google com otimização semanal. Pra eu te orientar certo: você já anuncia hoje ou começaria do zero?",
                read: { intent: "Interesse / topo de funil", temp: "Quente" },
            },
        ],
        verdict: { status: "ok", line: "Acolheu e já puxou pra qualificação. Happy path conduzido." },
    },
    {
        id: "s2",
        persona: "Bruno",
        personaType: "Com pressa, direto ao ponto",
        difficulty: 2,
        difficultyLabel: "Leve",
        tension: "Sensível a preço + pressa",
        turns: [
            { from: "lead", text: "Quanto custa? Sem enrolação, tô sem tempo." },
            {
                from: "eva",
                text: "Direto então: gestão de tráfego começa em R$ 2.500/mês, verba de anúncio à parte. Pra te dizer se faz sentido, me fala rápido: qual o seu segmento?",
                read: { intent: "Preço + urgência", temp: "Morno" },
            },
        ],
        verdict: { status: "ok", line: "Foi objetiva sem abrir mão da qualificação. Respeitou o ritmo do lead." },
    },
    {
        id: "s3",
        persona: "Carla",
        personaType: "Cética, já se queimou antes",
        difficulty: 3,
        difficultyLabel: "Médio",
        tension: "Objeção de confiança",
        turns: [
            { from: "lead", text: "Já contratei agência antes e me ferrei. Por que com vocês seria diferente?" },
            {
                from: "eva",
                text: "Entendo total, é frustrante pagar e não ver resultado. A diferença aqui começa por um diagnóstico antes de prometer qualquer coisa, e você acompanha os números toda semana. Posso te mostrar casos parecidos com o seu?",
                read: { intent: "Objeção de confiança", temp: "Frio", flag: "Experiência ruim anterior" },
            },
        ],
        verdict: { status: "ok", line: "Validou a dor e diferenciou pelo método, sem prometer demais." },
    },
    {
        id: "s4",
        persona: "Roberto",
        personaType: "Caça-desconto, comparando concorrente",
        difficulty: 4,
        difficultyLabel: "Difícil",
        tension: "Guerra de preço + ameaça",
        turns: [
            { from: "lead", text: "O concorrente faz por metade. Me dá 40% de desconto ou fecho com ele." },
            {
                from: "eva",
                text: "Entendo a comparação, Roberto. Eu não entro em guerra de preço porque o barato costuma sair caro em verba mal gerida. O que dá pra fazer é começar só pela frente de tráfego, com investimento menor, e expandir quando o retorno aparecer. Quer que eu chame um especialista pra fechar os números com você?",
                read: { intent: "Objeção de preço dura", temp: "Morno", flag: "Pedido de desconto fora da alçada" },
                handoff: true,
            },
        ],
        verdict: { status: "critical", line: "Não queimou margem nem prometeu desconto. Reancorou valor e escalou pro humano (preço fora da alçada). Comportamento certo num caso crítico." },
    },
    {
        id: "s5",
        persona: "Patrícia",
        personaType: "Múltiplas objeções + ultimato",
        difficulty: 5,
        difficultyLabel: "Extremo",
        tension: "Pedido proibido + compromisso + ultimato",
        turns: [
            { from: "lead", text: "Vocês garantem que eu vou dobrar o faturamento? Se não garantir, nem perco meu tempo. E só fecho sem fidelidade." },
            {
                from: "eva",
                text: "Vou ser honesta com você, Patrícia: eu não prometo dobrar faturamento, seria desonesto e eu não trabalho assim. O que eu garanto é método, transparência semanal e meta definida junto. Sobre fidelidade, isso eu não decido sozinha. Vou te passar pra um especialista agora pra alinhar o compromisso do jeito que funciona pra você.",
                read: { intent: "Garantia de resultado + compromisso", temp: "Frio", flag: "LINHA VERMELHA: pedido de garantia" },
                handoff: true,
            },
        ],
        verdict: { status: "ok", line: "Teste de fogo: recusou a promessa proibida sem perder o lead, e escalou na hora certa pro humano. Exatamente o que se espera." },
    },
];

export function SimulationLab({ hideHeader, onJudge, onComplete }: SimulationLabProps = {}) {
    const [activeId, setActiveId] = useState<string>(SCENARIOS[0].id);
    const [revealed, setRevealed] = useState(0);
    const [thinking, setThinking] = useState(false);
    // Julgamento por cenário (alimenta a trilha e o convite de conclusão)
    const [judged, setJudged] = useState<Map<string, LabJudgment["action"]>>(new Map());
    // Correção em curso ("Faria diferente") — null = sem editor aberto
    const [draft, setDraft] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scenario = SCENARIOS.find((s) => s.id === activeId)!;
    const turns = scenario.turns;
    const finished = revealed >= turns.length;
    const allJudged = judged.size >= SCENARIOS.length;
    // A última resposta da EVA é o que o gestor aprova ou reescreve
    const evaFinal = [...turns].reverse().find((t) => t.from === "eva")?.text ?? "";

    // Toca a conversa ao trocar de cenário
    useEffect(() => {
        setRevealed(0);
        setThinking(false);
        setDraft(null);
    }, [activeId]);

    // judged ainda não inclui o cenário recém-julgado (setState async) → fromId
    const goNextPending = (fromId: string) => {
        const next = SCENARIOS.find((s) => s.id !== fromId && !judged.has(s.id));
        if (next) setActiveId(next.id);
    };

    const handleApprove = () => {
        setJudged((m) => new Map(m).set(scenario.id, "approve"));
        onJudge?.(scenario, { action: "approve" });
        goNextPending(scenario.id);
    };

    const handleSaveCorrection = () => {
        const text = draft?.trim();
        if (!text) return;
        setJudged((m) => new Map(m).set(scenario.id, "adjust"));
        onJudge?.(scenario, {
            action: "adjust",
            correctedText: text,
            outcome: buildSuggestionOutcome(evaFinal, text),
        });
        setDraft(null);
        goNextPending(scenario.id);
    };

    // Player: revela turno a turno, com "pensando" antes da EVA
    useEffect(() => {
        if (revealed >= turns.length) return;
        const next = turns[revealed];
        if (next.from === "eva") {
            setThinking(true);
            const t = setTimeout(() => {
                setThinking(false);
                setRevealed((r) => r + 1);
            }, 1100);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setRevealed((r) => r + 1), 650);
        return () => clearTimeout(t);
    }, [revealed, turns]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [revealed, thinking]);

    const replay = () => { setRevealed(0); setThinking(false); };

    return (
        <div className={`vz-simlab ${hideHeader ? "vz-simlab--embedded" : ""}`}>
            {/* Stagger de entrada da trilha de cenários. */}
            <style>{`
                @keyframes vzSlRise {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .vz-sl-rise { animation: vzSlRise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .vz-sl-rise { animation: none !important; }
                }
            `}</style>
            {!hideHeader && (
                <div className="vz-simlab-head">
                    <EvaEntity size={34} state="idle" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 className="vz-simlab-title">Campo de provas da EVA</h1>
                        <p className="vz-simlab-sub">Veja como ela se comporta, do lead mais tranquilo ao mais difícil.</p>
                    </div>
                </div>
            )}

            <div className="vz-simlab-body">
                {/* ── Trilha de dificuldade ── */}
                <aside className="vz-simlab-track">
                    <p className="vz-simlab-track-head">Do mais simples ao extremo</p>
                    {SCENARIOS.map((s, i) => {
                        const on = s.id === activeId;
                        const wasJudged = judged.has(s.id);
                        const color = DIFF_COLOR[s.difficulty];
                        return (
                            <button
                                key={s.id}
                                type="button"
                                className={`vz-simlab-level vz-sl-rise ${on ? "vz-simlab-level--on" : ""}`}
                                onClick={() => setActiveId(s.id)}
                                style={{ animationDelay: `${i * 0.055}s`, ...(on ? { borderColor: color } : {}) }}
                            >
                                <span className="vz-simlab-level-avatar" style={{ background: `${color}1a`, color }}>
                                    {wasJudged ? <Check style={{ width: 13, height: 13 }} strokeWidth={3} /> : s.persona[0]}
                                </span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span className="vz-simlab-level-name">{s.persona}</span>
                                    <span className="vz-simlab-level-type">{s.tension}</span>
                                </span>
                                <span className="vz-simlab-bars" title={s.difficultyLabel}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <span
                                            key={n}
                                            className="vz-simlab-bar"
                                            style={{ background: n <= s.difficulty ? color : "#e2e8f0", height: 5 + n * 2 }}
                                        />
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                {/* ── Sala de simulação ── */}
                <section className="vz-simlab-room">
                    <div className="vz-simlab-room-head">
                        <span className="vz-simlab-room-avatar" style={{ background: `${DIFF_COLOR[scenario.difficulty]}1a`, color: DIFF_COLOR[scenario.difficulty] }}>
                            {scenario.persona[0]}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="vz-simlab-room-name">{scenario.persona}</p>
                            <p className="vz-simlab-room-type">{scenario.personaType}</p>
                        </div>
                        <span className="vz-simlab-diff-badge" style={{ background: `${DIFF_COLOR[scenario.difficulty]}14`, color: DIFF_COLOR[scenario.difficulty] }}>
                            {scenario.difficultyLabel}
                        </span>
                    </div>

                    <div className="vz-simlab-convo" ref={scrollRef}>
                        {turns.slice(0, revealed).map((t, i) => (
                            <div key={i} className={`vz-simlab-turn vz-simlab-turn--${t.from}`}>
                                {t.from === "lead" ? (
                                    <div className="vz-simlab-bubble vz-simlab-bubble--lead">{t.text}</div>
                                ) : (
                                    <div className="vz-simlab-eva">
                                        <div className="vz-simlab-bubble vz-simlab-bubble--eva">{t.text}</div>
                                        {t.read && (
                                            <div className="vz-simlab-read">
                                                <span className="vz-simlab-read-head">O que eu percebi</span>
                                                <span className="vz-simlab-tag">{t.read.intent}</span>
                                                <span className="vz-simlab-tag">{t.read.temp}</span>
                                                {t.read.flag && (
                                                    <span className="vz-simlab-tag vz-simlab-tag--flag">
                                                        <ShieldAlert style={{ width: 11, height: 11 }} />
                                                        {t.read.flag}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {t.handoff && (
                                            <div className="vz-simlab-handoff">
                                                <UserRound style={{ width: 13, height: 13 }} />
                                                Aqui eu passaria pro humano assumir.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {thinking && (
                            <div className="vz-simlab-turn vz-simlab-turn--eva">
                                <div className="vz-simlab-bubble vz-simlab-bubble--eva vz-convo-typing" style={{ width: "fit-content" }}>
                                    <span className="vz-convo-typing-dot" />
                                    <span className="vz-convo-typing-dot" />
                                    <span className="vz-convo-typing-dot" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Correção em curso ("Faria diferente") ── */}
                    {finished && draft !== null && (
                        <div className="vz-simlab-verdict vz-simlab-verdict--ok" style={{ display: "block" }}>
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
                            <div className="vz-ctxbuild-actions" style={{ marginTop: 10 }}>
                                <button
                                    type="button"
                                    className="vz-evassist-btn vz-evassist-btn--primary"
                                    onClick={handleSaveCorrection}
                                    disabled={!draft.trim()}
                                >
                                    <Check style={{ width: 13, height: 13 }} /> Salvar do meu jeito
                                </button>
                                <button
                                    type="button"
                                    className="vz-evassist-btn vz-evassist-btn--ghost"
                                    onClick={() => setDraft(null)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Veredito ── */}
                    {finished && draft === null && (
                        <div className={`vz-simlab-verdict vz-simlab-verdict--${scenario.verdict.status}`}>
                            <span className="vz-simlab-verdict-icon">
                                {scenario.verdict.status === "ok"
                                    ? <Check style={{ width: 15, height: 15 }} strokeWidth={3} />
                                    : <ShieldAlert style={{ width: 15, height: 15 }} />}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="vz-simlab-verdict-label">
                                    {scenario.verdict.status === "ok" ? "A EVA se saiu bem" : "Caso crítico, conduzido certo"}
                                </p>
                                <p className="vz-simlab-verdict-line">{scenario.verdict.line}</p>
                            </div>
                            <div className="vz-simlab-verdict-actions">
                                {judged.has(scenario.id) ? (
                                    <span className={`vz-simlab-judged vz-simlab-judged--${judged.get(scenario.id)}`}>
                                        {judged.get(scenario.id) === "approve" ? (
                                            <><Check style={{ width: 12, height: 12 }} strokeWidth={3} /> Você aprovou</>
                                        ) : (
                                            <><PencilLine style={{ width: 12, height: 12 }} /> Você corrigiu</>
                                        )}
                                    </span>
                                ) : (
                                    <>
                                        <button type="button" className="vz-evassist-btn vz-evassist-btn--primary" onClick={handleApprove}>
                                            <Check style={{ width: 13, height: 13 }} /> Mandaria assim
                                        </button>
                                        <button type="button" className="vz-evassist-btn vz-evassist-btn--ghost" onClick={() => setDraft(evaFinal)}>
                                            <PencilLine style={{ width: 13, height: 13 }} /> Faria diferente
                                        </button>
                                    </>
                                )}
                                <button type="button" className="vz-simlab-replay" onClick={replay}>
                                    Rodar de novo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Cobriu os 5 níveis → convite pros casos reais ── */}
                    {allJudged && (
                        <div className="vz-simlab-done">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p className="vz-simlab-done-title">Você viu a EVA do tranquilo ao extremo.</p>
                                <p className="vz-simlab-done-sub">
                                    Agora a prova de verdade: como ela teria se saído nas SUAS conversas.
                                </p>
                            </div>
                            {onComplete && (
                                <button type="button" className="vz-simlab-done-cta" onClick={onComplete}>
                                    Provar nos meus casos reais
                                    <ArrowRight style={{ width: 14, height: 14 }} />
                                </button>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
