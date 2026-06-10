// ─────────────────────────────────────────────────────────────────────────────
// AgentPurposeCreate (EVA.STUDIO.F1, 2026-06-06) — criar agente é UMA decisão.
//
// "O que você quer que a EVA faça?" + 3 cards de propósito. Um clique cria.
// TODA configuração (tom, regras, campos) sai daqui e vai pra construção
// guiada (Frente 2): criar = escolher propósito, nada mais.
//
// O medo que esta tela desarma: "vou configurar errado e a EVA vai falar
// besteira". Resposta da tela: mostrar O QUE a EVA vai olhar pra montar
// sozinha + a promessa "você revisa cada coisa antes de a EVA usar".
//
// Calibragem (feedback 2026-06-07): a primeira tela pede UMA leitura só (os
// cards). O bloco "o que a EVA vai olhar" aparece DEPOIS da escolha, como
// consequência da decisão — transparência sem competir com os cards.
//
// PRESENTATIONAL: dados via props. Disponibilidade de propósito/fonte é
// decisão de quem integra (`available`); aqui não há lógica de negócio.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { ArrowRight, Check, HeartHandshake, LifeBuoy, Target } from "lucide-react";
import { EvaEntity } from "@/components/eva/EvaEntity";

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
    /** Dispara no clique do card — cria o agente. */
    onCreate: (purpose: AgentPurpose) => void;
    /** "Revisar o que a EVA entendeu" no painel pós-escolha → construção guiada. */
    onProceed: (purpose: AgentPurpose) => void;
    /** Dentro da casca de jornada (EvaStudioShell), o header é da casca. */
    hideHeader?: boolean;
}

const PURPOSE_META: Record<
    AgentPurpose,
    { title: string; desc: string; icon: typeof Target }
> = {
    vender: {
        title: "Vender",
        desc: "Qualifica leads novos, sugere respostas no Inbox e te avisa quem está pronto pra avançar.",
        icon: Target,
    },
    suporte: {
        title: "Dar suporte",
        desc: "Responde dúvidas comuns dos seus clientes e passa pra você o que não souber.",
        icon: LifeBuoy,
    },
    pos_venda: {
        title: "Pós-venda",
        desc: "Acompanha clientes ativos, percebe sinais de risco e sugere o próximo contato.",
        icon: HeartHandshake,
    },
};

// ─── Componente ─────────────────────────────────────────────────────────────

export function AgentPurposeCreate({ purposes, sources, onCreate, onProceed, hideHeader }: AgentPurposeCreateProps) {
    // Pós-escolha: a tela troca dos cards pro painel "vou olhar isto pra montar"
    const [chosen, setChosen] = useState<AgentPurpose | null>(null);

    const handleChoose = (purpose: AgentPurpose) => {
        setChosen(purpose);
        onCreate(purpose);
    };

    return (
        <div className="vz-agentcreate">
            {/* Header — entidade + pergunta única */}
            {!hideHeader && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                <EvaEntity size={44} state={chosen ? "thinking" : "idle"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="vz-agentcreate-label">EVA Studio</p>
                    <h1 className="vz-agentcreate-title" style={{ marginTop: 2 }}>
                        {chosen
                            ? `Montando seu agente de ${PURPOSE_META[chosen].title.toLowerCase()}`
                            : "O que você quer que a EVA faça?"}
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
                    {/* A decisão — e SÓ ela. Uma leitura, um clique. */}
                    <div className="vz-agentcreate-grid">
                        {purposes.map(({ purpose, available }, i) => {
                            const meta = PURPOSE_META[purpose];
                            const Icon = meta.icon;
                            return (
                                <button
                                    key={purpose}
                                    type="button"
                                    disabled={!available}
                                    onClick={() => available && handleChoose(purpose)}
                                    className={`vz-agentcreate-card ${
                                        available ? "vz-agentcreate-card--featured" : "vz-agentcreate-card--soon"
                                    }`}
                                    style={{ animationDelay: `${i * 0.06}s` }}
                                >
                                    {!available && <span className="vz-agentcreate-soon-badge">Em breve</span>}
                                    <span className="vz-agentcreate-card-icon">
                                        <Icon style={{ width: 18, height: 18 }} strokeWidth={2.2} />
                                    </span>
                                    <span className="vz-agentcreate-card-title" style={{ display: "block" }}>
                                        {meta.title}
                                    </span>
                                    <span className="vz-agentcreate-card-desc" style={{ display: "block" }}>
                                        {meta.desc}
                                    </span>
                                    {available && (
                                        <span className="vz-agentcreate-card-cta">
                                            Criar agente
                                            <ArrowRight style={{ width: 12, height: 12 }} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* A promessa que desarma o medo */}
                    <p className="vz-agentcreate-promise">
                        Leva 1 minuto. Você revisa cada coisa antes de a EVA usar.
                    </p>
                </>
            ) : (
                /* Transparência como consequência da decisão: escolheu → "vou
                   olhar isto pra montar". Nada de leitura prévia competindo. */
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
                            onClick={() => onProceed(chosen)}
                        >
                            Revisar o que a EVA entendeu
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
