import { LandingButton } from "./LandingButton";
import { Rise } from "./animation/Rise";

// LP.1 2026-05-25: seção repurposed de "Agent Studio" para "Solução".
// LP.3 2026-06-09: absorve os resultados da CentralComercialSection (removida).
// LP.4 2026-06-09: vira a "sala de comando" — única banda ink da página.
// Módulos como cartões de console numerados, hairlines brancas, sem glow.
// LP.5 2026-06-12: reveals por scroll (Rise) e módulos que acendem no hover
// (.lp-console-card) — o console responde ao operador.
const MODULES = [
    {
        n: "01",
        title: "Inbox Comercial",
        body: "Centralize conversas e responda antes do lead esfriar.",
        note: "conversas: 1 lugar",
    },
    {
        n: "02",
        title: "EVA Comercial",
        body: "Analisa intenção, fit, urgência e objeções, e aponta quem está pronto pra avançar.",
        note: "leitura assistida",
    },
    {
        n: "03",
        title: "Pipeline Contextual",
        body: "Cada oportunidade carrega a conversa e a próxima ação. Nenhum follow-up fica esquecido.",
        note: "conversa anexada",
    },
    {
        n: "04",
        title: "Central de Comando",
        body: "Mostra o que precisa de atenção hoje, sem depender de cobrança no grupo.",
        note: "atenção do dia",
    },
] as const;

interface AgentStudioSectionProps {
    onCTAClick?: () => void;
}

export const AgentStudioSection = ({ onCTAClick }: AgentStudioSectionProps) => {
    return (
        <section className="lp-ink-band relative overflow-hidden">
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-24 sm:pb-28">
                {/* Estação do fio (versão clara) */}
                <Rise>
                    <div className="lp-station mb-12 sm:mb-16">
                        <span className="lp-station-node" style={{ background: "#FAF9F5", boxShadow: "0 0 0 4px rgba(250,249,245,0.16)" }} />
                        <span className="lp-mono" style={{ color: "rgba(250,249,245,0.6)" }}>
                            03 · como o vyzon resolve
                        </span>
                        <span className="lp-station-rule" style={{ background: "rgba(250,249,245,0.18)" }} />
                    </div>
                </Rise>

                {/* Header assimétrico */}
                <Rise delay={0.08}>
                <div className="relative mb-14 sm:mb-16">
                    <span
                        className="lp-index absolute -top-8 right-0 hidden md:block"
                        style={{ fontSize: "clamp(8rem, 18vw, 13rem)" }}
                        aria-hidden="true"
                    >
                        03
                    </span>
                    <h2
                        className="font-satoshi relative mb-6"
                        style={{
                            fontSize: "clamp(2rem, 5.5vw, 3.6rem)",
                            lineHeight: 1.02,
                            letterSpacing: "-0.045em",
                            color: "#FAF9F5",
                            fontWeight: 900,
                            maxWidth: "760px",
                        }}
                    >
                        Uma Central Comercial para organizar{" "}
                        <span className="lp-serif" style={{ fontWeight: 400, color: "#7FA8E8" }}>
                            conversa, prioridade e pipeline
                        </span>
                        .
                    </h2>

                    <p
                        className="mb-9"
                        style={{
                            fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                            color: "rgba(250,249,245,0.66)",
                            fontWeight: 400,
                            maxWidth: "640px",
                        }}
                    >
                        O Vyzon reúne a operação comercial da agência em um fluxo simples: conversa entra, EVA analisa, o time aprova o próximo passo e a oportunidade segue no pipeline.
                    </p>

                    <LandingButton
                        as="button"
                        onClick={onCTAClick}
                        variant="primary"
                        size="lg"
                        showArrow
                        className="lp-press--light"
                    >
                        Agendar demonstração
                    </LandingButton>
                </div>
                </Rise>

                {/* Cartões de console */}
                <Rise delay={0.12}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "rgba(250,249,245,0.14)", border: "1px solid rgba(250,249,245,0.14)" }}>
                    {MODULES.map(({ n, title, body, note }) => (
                        <div
                            key={title}
                            className="lp-console-card p-7 sm:p-9"
                        >
                            <div className="flex items-baseline justify-between gap-3 mb-5">
                                <span className="lp-mono" style={{ color: "#7FA8E8", fontSize: 13 }}>
                                    {n}
                                </span>
                                <span className="lp-mono lp-console-note" style={{ color: "rgba(250,249,245,0.35)", textTransform: "none", letterSpacing: "0.03em" }}>
                                    {note}
                                </span>
                            </div>
                            <h3
                                className="font-satoshi mb-2.5"
                                style={{
                                    fontSize: "clamp(1.25rem, 2.2vw, 1.5rem)",
                                    lineHeight: 1.2,
                                    letterSpacing: "-0.025em",
                                    color: "#FAF9F5",
                                    fontWeight: 700,
                                }}
                            >
                                {title}
                            </h3>
                            <p
                                className="text-sm sm:text-[15px]"
                                style={{
                                    lineHeight: 1.6,
                                    color: "rgba(250,249,245,0.62)",
                                    fontWeight: 400,
                                }}
                            >
                                {body}
                            </p>
                        </div>
                    ))}
                </div>
                </Rise>
            </div>
        </section>
    );
};
