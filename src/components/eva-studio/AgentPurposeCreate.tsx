// ─────────────────────────────────────────────────────────────────────────────
// AgentPurposeCreate (EVA.STUDIO.F1) — criar agente é UMA decisão: escolher o
// especialista. A galeria lista os 4 agentes (Qualificação, Follow-up, Propostas,
// Reativação), cada um com a SUA cor (orb mesh). Clicar leva pro chat daquele
// agente (perguntas + campos + cor próprios — ver evaSpecialists + Journey).
//
// O medo que esta tela desarma: "vou configurar errado". Resposta: a conversa
// é guiada e "você revisa cada coisa antes de a EVA usar".
//
// PRESENTATIONAL: dados via props. onCreate cria o blueprint do Qualificador
// (runtime real); onPickSpecialist diz à jornada qual chat abrir.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { SPECIALISTS, SPECIALIST_ORDER, type SpecialistKey } from "@/lib/eva/evaSpecialists";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type AgentPurpose = "vender" | "suporte" | "pos_venda";

export interface AgentPurposeOption {
    purpose: AgentPurpose;
    /** false = card visível mas "Em breve" (não clicável). */
    available: boolean;
}

export interface AgentSourceInfo {
    key: "whatsapp" | "pipeline" | "docs";
    name: string;
    detail: string;
    /** true = a EVA já tem essa fonte hoje; false = depende do gestor. */
    available: boolean;
    /** Texto curto do estado ("conectado", "você cola depois"). */
    stateLabel: string;
}

export interface AgentPurposeCreateProps {
    purposes: AgentPurposeOption[];
    /** O que a EVA vai olhar pra montar o agente sozinha (painel pós-escolha). */
    sources: AgentSourceInfo[];
    /** Cria o blueprint do agente (hoje o Qualificador, "vender"). */
    onCreate: (purpose: AgentPurpose) => void;
    /** "Conversar com a EVA" no painel pós-escolha → construção guiada. */
    onProceed: (purpose: AgentPurpose) => void;
    /** Qual especialista o gestor escolheu — define o chat (cor + perguntas). */
    onPickSpecialist?: (key: SpecialistKey) => void;
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function AgentPurposeCreate({ purposes, sources, onCreate, onProceed, onPickSpecialist, hideHeader }: AgentPurposeCreateProps) {
    const [chosen, setChosen] = useState<SpecialistKey | null>(null);
    const chosenSpec = chosen ? SPECIALISTS[chosen] : null;

    const handleChoose = (key: SpecialistKey) => {
        setChosen(key);
        onPickSpecialist?.(key);
        // Qualificação é o agente com runtime real no Inbox → cria o blueprint.
        if (key === "qualificacao") onCreate("vender");
    };

    return (
        <div className="vz-agentcreate">
            {/* Header — orb do agente escolhido + pergunta única */}
            {!hideHeader && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                <EvaOrb variant={chosenSpec?.orb ?? "blue"} size={44} showVoice={false} state={chosen ? "thinking" : "idle"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-agentcreate-label">EVA Studio · Agentes especialistas</p>
                    <h1
                        className="vz-agentcreate-title"
                        style={{ marginTop: 2, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, letterSpacing: "-0.012em" }}
                    >
                        {chosenSpec ? `Montando o agente de ${chosenSpec.label}` : "Escolha um agente especialista"}
                    </h1>
                </div>
                <span className="vz-agentcreate-seal" title="A EVA propõe, você revisa. Nada acontece sem a sua aprovação.">
                    <span className="vz-agentcreate-seal-dot" />
                    Você no controle
                </span>
            </div>
            )}

            {chosen === null ? (
                <>
                    {/* A galeria de especialistas — cada um com a sua cor. */}
                    <div className="vz-agentcreate-grid vz-agentcreate-grid--2col">
                        {SPECIALIST_ORDER.map((key, i) => {
                            const s = SPECIALISTS[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleChoose(key)}
                                    className="vz-agentcreate-card vz-agentcreate-card--featured"
                                    style={{ animationDelay: `${i * 0.06}s` }}
                                >
                                    <span style={{ display: "block", marginBottom: 14 }}>
                                        <EvaOrb variant={s.orb} size={40} showVoice={false} />
                                    </span>
                                    <span className="vz-agentcreate-card-title" style={{ display: "block" }}>
                                        {s.label}
                                    </span>
                                    <span className="vz-agentcreate-card-desc" style={{ display: "block" }}>
                                        {s.desc}
                                    </span>
                                    <span className="vz-agentcreate-card-cta" style={{ color: s.accent }}>
                                        Criar agente
                                        <ArrowRight style={{ width: 12, height: 12 }} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="vz-agentcreate-promise">
                        Leva 1 minuto. Você revisa cada coisa antes de a EVA usar.
                    </p>
                </>
            ) : (
                /* Transparência como consequência da decisão: escolheu → "vou
                   olhar isto pra montar". */
                <div className="vz-agentcreate-building">
                    <p className="vz-agentcreate-sub">
                        Boa escolha. Pra montar esse agente, vou olhar:
                    </p>
                    <div style={{ marginTop: 10 }}>
                        {sources.map((s) => (
                            <div key={s.key} className="vz-agentcreate-source">
                                <Check
                                    style={{
                                        width: 13,
                                        height: 13,
                                        marginTop: 2,
                                        flexShrink: 0,
                                        color: s.available ? "#16A34A" : "#94A3B8",
                                    }}
                                    strokeWidth={2.6}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="vz-agentcreate-source-name">{s.name}</p>
                                    <p className="vz-agentcreate-source-detail">{s.detail}</p>
                                </div>
                                <span
                                    className="vz-agentcreate-source-state"
                                    style={{ color: s.available ? "#16A34A" : "#94A3B8" }}
                                >
                                    {s.stateLabel}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--primary"
                            onClick={() => onProceed("vender")}
                            style={{ background: chosenSpec?.accent, borderColor: chosenSpec?.accent }}
                        >
                            Conversar com a EVA
                            <ArrowRight style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                            type="button"
                            className="vz-evassist-btn vz-evassist-btn--ghost"
                            onClick={() => setChosen(null)}
                        >
                            Voltar
                        </button>
                    </div>
                    <p className="vz-agentcreate-promise" style={{ justifyContent: "flex-start", marginTop: 14 }}>
                        Nada vai pro ar sem passar por você.
                    </p>
                </div>
            )}
        </div>
    );
}
