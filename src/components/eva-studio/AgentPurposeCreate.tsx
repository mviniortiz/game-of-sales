// ─────────────────────────────────────────────────────────────────────────────
// AgentPurposeCreate (EVA.STUDIO.F1) — 1 decisão clara: começar pelo Qualificador.
// Os outros agentes aparecem como visão (Em breve), sem competir pelo clique.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";
import { SPECIALISTS, SPECIALIST_ORDER, type SpecialistKey } from "@/lib/eva/evaSpecialists";

export type AgentPurpose = "vender" | "suporte" | "pos_venda";

export interface AgentPurposeOption {
    purpose: AgentPurpose;
    available: boolean;
}

export interface AgentSourceInfo {
    key: "whatsapp" | "pipeline" | "docs";
    name: string;
    detail: string;
    available: boolean;
    stateLabel: string;
}

export interface AgentPurposeCreateProps {
    purposes: AgentPurposeOption[];
    sources: AgentSourceInfo[];
    onCreate: (purpose: AgentPurpose) => void;
    onProceed: (purpose: AgentPurpose) => void;
    onPickSpecialist?: (key: SpecialistKey) => void;
    hideHeader?: boolean;
}

export function AgentPurposeCreate({ sources, onCreate, onProceed, onPickSpecialist, hideHeader }: AgentPurposeCreateProps) {
    const [chosen, setChosen] = useState<SpecialistKey | null>(null);
    const chosenSpec = chosen ? SPECIALISTS[chosen] : null;
    const live = SPECIALISTS.qualificacao;
    const soonKeys = SPECIALIST_ORDER.filter((k) => SPECIALISTS[k].comingSoon);

    const handleChoose = (key: SpecialistKey) => {
        setChosen(key);
        onPickSpecialist?.(key);
        if (key === "qualificacao") onCreate("vender");
    };

    return (
        <div className="vz-agentcreate">
            <style>{`
                @keyframes vzApcGalleryOut {
                    from { opacity: 1; transform: translateY(0); }
                    to   { opacity: 0; transform: translateY(-8px); }
                }
                @keyframes vzApcPanelIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.985); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .vz-apc-building {
                    animation: vzApcPanelIn 0.46s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .vz-apc-source-row {
                    animation: vzApcPanelIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .vz-apc-building,
                    .vz-apc-source-row { animation: none !important; }
                }
            `}</style>

            {!hideHeader && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                    <EvaThinkingOrb
                        state={chosen ? "working" : "listening"}
                        size={64}
                        displaySize={44}
                        theme="light"
                        agentKey={chosenSpec?.key ?? "qualificacao"}
                        aria-hidden
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="vz-agentcreate-label">EVA Studio</p>
                        <h1
                            className="vz-agentcreate-title"
                            style={{ marginTop: 2, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, letterSpacing: "-0.012em" }}
                        >
                            {chosenSpec
                                ? `Montando: ${chosenSpec.label}`
                                : "Comece pelo Qualificador"}
                        </h1>
                    </div>
                    <span className="vz-agentcreate-seal" title="A EVA sugere. Você aprova. Nada sai sozinho.">
                        <span className="vz-agentcreate-seal-dot" />
                        Você aprova cada mensagem
                    </span>
                </div>
            )}

            {chosen === null ? (
                <>
                    <p className="vz-agentcreate-intro">
                        A EVA lê o WhatsApp e sugere a próxima resposta. Você revisa e envia.
                        Hoje o agente ao vivo é o Qualificador.
                    </p>

                    {/* Herói: única ação real */}
                    <button
                        type="button"
                        onClick={() => handleChoose("qualificacao")}
                        className="vz-agentcreate-card vz-agentcreate-card--hero"
                    >
                        <div className="vz-agentcreate-hero-top">
                            <EvaThinkingOrb
                                state="listening"
                                size={64}
                                displaySize={48}
                                theme="light"
                                agentKey="qualificacao"
                                aria-hidden
                            />
                            <span className="vz-agentcreate-live-badge">Disponível agora</span>
                        </div>
                        <span className="vz-agentcreate-card-title" style={{ display: "block", fontSize: 18 }}>
                            {live.label}
                        </span>
                        <span className="vz-agentcreate-card-desc" style={{ display: "block", fontSize: 13.5, maxWidth: 520 }}>
                            {live.desc}
                        </span>
                        <span className="vz-agentcreate-card-cta" style={{ color: live.accent, fontSize: 13.5 }}>
                            Começar com Qualificação
                            <ArrowRight style={{ width: 14, height: 14 }} />
                        </span>
                    </button>

                    {/* Visão futura: sem competir pelo clique */}
                    <p className="vz-agentcreate-soon-label">Em breve, outros agentes</p>
                    <div className="vz-agentcreate-soon-row">
                        {soonKeys.map((key) => {
                            const s = SPECIALISTS[key];
                            return (
                                <div
                                    key={key}
                                    className="vz-agentcreate-card vz-agentcreate-card--soon"
                                    aria-disabled="true"
                                >
                                    <span className="vz-agentcreate-soon-badge">Em breve</span>
                                    <span style={{ display: "block", marginBottom: 10 }}>
                                        <EvaThinkingOrb
                                            state="listening"
                                            size={20}
                                            displaySize={28}
                                            theme="light"
                                            agentKey={s.key}
                                            aria-hidden
                                        />
                                    </span>
                                    <span className="vz-agentcreate-card-title" style={{ display: "block" }}>
                                        {s.label}
                                    </span>
                                    <span className="vz-agentcreate-card-desc" style={{ display: "block" }}>
                                        {s.desc}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <p className="vz-agentcreate-promise">
                        Nada é enviado ao lead sem a sua aprovação.
                    </p>
                </>
            ) : (
                <div className="vz-agentcreate-building vz-apc-building">
                    <p className="vz-agentcreate-sub">
                        Vou montar o Qualificador com o que já existe na sua operação:
                    </p>
                    <div style={{ marginTop: 10 }}>
                        {sources.map((s, i) => (
                            <div
                                key={s.key}
                                className="vz-agentcreate-source vz-apc-source-row"
                                style={{ animationDelay: `${0.12 + i * 0.06}s` }}
                            >
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
                            Conversar e configurar
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
                        Em poucos minutos a EVA fica pronta pra sugerir no Inbox.
                    </p>
                </div>
            )}
        </div>
    );
}
