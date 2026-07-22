// ─────────────────────────────────────────────────────────────────────────────
// EvaStudioShell (EVA.STUDIO.SHELL, 2026-06-09) — a casca de JORNADA que
// substitui as 4 abas paralelas do EVA Studio.
//
// O problema que resolve (feedback Markus): entrar e "não saber dizer" onde está
// nem o que fazer, numa coluna vertical sem fim. A casca dá:
//   - UM cabeçalho só (os componentes de passo entram headless, hideHeader)
//   - um stepper Criar·Ensinar·Provar·Ativar com "você está aqui"
//   - uma lateral fina persistente (passos + estado da EVA) que ANCORA e quebra
//     a verticalidade
//
// PRESENTATIONAL: navegação e estado via props. O conteúdo de cada passo é
// children (F1/F2/F3/ativação entram aqui).
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";
import type { EvaOrbState } from "@/components/landing-v2/EvaOrb";
import { mapEvaOrbUiState } from "@/hooks/useEvaOrbCycle";

export type StudioStepKey = "criar" | "ensinar" | "provar" | "ativar";

export interface StudioStep {
    key: StudioStepKey;
    label: string;
    /** Frase curta do que se faz no passo. */
    sub: string;
}

export type StepStatus = "done" | "current" | "todo";

export interface EvaStudioShellProps {
    steps: StudioStep[];
    current: StudioStepKey;
    /** Passos já concluídos (viram ✓ e ficam clicáveis). */
    doneKeys: StudioStepKey[];
    onSelect: (key: StudioStepKey) => void;
    /** Barra de prontidão da EVA na lateral (0..1). */
    readiness?: { label: string; pct: number };
    /** Acesso secundário (Memória / Insights) — não competem com a jornada. */
    secondary?: { key: string; label: string; onClick: () => void; active?: boolean }[];
    /** Vista secundária aberta no conteúdo → esconde o rótulo do passo. */
    hideStepLabel?: boolean;
    /** Estado do orb do cabeçalho — reage ao passo atual (idle no Criar,
     *  analyzing/thinking ao Ensinar/Provar, speaking ao Ativar). */
    orbState?: EvaOrbState;
    children: ReactNode;
}

const STATUS_OF = (
    key: StudioStepKey,
    current: StudioStepKey,
    doneKeys: StudioStepKey[],
): StepStatus => (key === current ? "current" : doneKeys.includes(key) ? "done" : "todo");

export function EvaStudioShell({
    steps,
    current,
    doneKeys,
    onSelect,
    readiness,
    secondary,
    hideStepLabel,
    orbState = "idle",
    children,
}: EvaStudioShellProps) {
    const currentStep = steps.find((s) => s.key === current);
    const currentIdx = steps.findIndex((s) => s.key === current);
    const reachable = (key: StudioStepKey, i: number) =>
        doneKeys.includes(key) || i <= currentIdx;

    return (
        <div className="vz-studioshell">
            {/* ── Cabeçalho ÚNICO ── */}
            <div className="vz-studioshell-head">
                <EvaThinkingOrb
                    state={mapEvaOrbUiState(orbState)}
                    size={64}
                    displaySize={38}
                    theme="light"
                    agentKey="qualificacao"
                    aria-label="EVA Studio"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 className="vz-studioshell-title">EVA Studio</h1>
                    <p className="vz-studioshell-subtitle">
                        Montando sua EVA de vendas, um passo de cada vez.
                    </p>
                </div>
                <span className="vz-studioshell-stepcount">
                    Passo {currentIdx + 1} de {steps.length}
                </span>
            </div>

            {/* ── Stepper horizontal: você está aqui ── */}
            <div className="vz-studioshell-stepper">
                {steps.map((s, i) => {
                    const st = STATUS_OF(s.key, current, doneKeys);
                    return (
                        <div key={s.key} className="vz-studioshell-stepper-item">
                            {i > 0 && (
                                <span className={`vz-studioshell-stepper-line ${i <= currentIdx ? "vz-studioshell-stepper-line--on" : ""}`} />
                            )}
                            <button
                                type="button"
                                className={`vz-studioshell-stepper-node vz-studioshell-stepper-node--${st}`}
                                onClick={() => reachable(s.key, i) && onSelect(s.key)}
                                disabled={!reachable(s.key, i)}
                            >
                                <span className="vz-studioshell-stepper-dot">
                                    {st === "done" ? <Check style={{ width: 12, height: 12 }} strokeWidth={3} /> : i + 1}
                                </span>
                                <span className="vz-studioshell-stepper-label">{s.label}</span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── Corpo: lateral âncora + conteúdo do passo ── */}
            <div className="vz-studioshell-body">
                <aside className="vz-studioshell-rail">
                    <p className="vz-studioshell-rail-head">Sua jornada</p>
                    {steps.map((s, i) => {
                        const st = STATUS_OF(s.key, current, doneKeys);
                        return (
                            <button
                                key={s.key}
                                type="button"
                                className={`vz-studioshell-rail-item vz-studioshell-rail-item--${st}`}
                                onClick={() => reachable(s.key, i) && onSelect(s.key)}
                                disabled={!reachable(s.key, i)}
                            >
                                <span className="vz-studioshell-rail-mark">
                                    {st === "done" ? <Check style={{ width: 11, height: 11 }} strokeWidth={3} /> : i + 1}
                                </span>
                                <span style={{ minWidth: 0 }}>
                                    <span className="vz-studioshell-rail-label">{s.label}</span>
                                    <span className="vz-studioshell-rail-sub">{s.sub}</span>
                                </span>
                            </button>
                        );
                    })}

                    {readiness && (
                        <div className="vz-studioshell-readiness">
                            <div className="vz-studioshell-readiness-top">
                                <span>{readiness.label}</span>
                                <span className="vz-studioshell-readiness-pct">{Math.round(readiness.pct * 100)}%</span>
                            </div>
                            <div className="vz-studioshell-readiness-bar">
                                <div className="vz-studioshell-readiness-fill" style={{ width: `${Math.round(readiness.pct * 100)}%` }} />
                            </div>
                        </div>
                    )}

                    {secondary && secondary.length > 0 && (
                        <div className="vz-studioshell-secondary">
                            {secondary.map((x) => (
                                <button
                                    key={x.key}
                                    type="button"
                                    className={`vz-studioshell-secondary-link ${x.active ? "vz-studioshell-secondary-link--on" : ""}`}
                                    onClick={x.onClick}
                                >
                                    {x.label}
                                </button>
                            ))}
                        </div>
                    )}
                </aside>

                <section className="vz-studioshell-content">
                    {currentStep && !hideStepLabel && (
                        <p className="vz-studioshell-content-step">
                            {currentStep.label} · <span>{currentStep.sub}</span>
                        </p>
                    )}
                    {children}
                </section>
            </div>
        </div>
    );
}
