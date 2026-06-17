import { Reveal } from "./Reveal";
import { AgentBuilderCard } from "./AgentBuilderCard";

// LP.6 (v2) — "Crie especialistas para cada etapa da conversa". Mensagem: no
// Vyzon a EVA assume PAPÉIS especializados (qualificação, follow-up, propostas)
// usando o playbook da agência, sempre com aprovação humana. Card grande à
// esquerda = AgentBuilderCard (lead cola a URL → edge gera o blueprint da EVA)
// e 3 cards à direita.
interface SpecialistAgentsV2Props {
    onCTAClick: () => void;
}

const RIGHT = [
    {
        t: "Qualificação",
        d: "Identifica intenção, contexto e estágio do lead antes de sugerir o próximo passo.",
    },
    {
        t: "Follow-up",
        d: "Ajuda seu time a retomar conversas no momento certo, com abordagem alinhada ao histórico.",
    },
    {
        t: "Propostas e próximos passos",
        d: "Transforma o playbook comercial da agência em sugestões práticas para avançar cada oportunidade.",
    },
];

export const SpecialistAgentsV2 = ({ onCTAClick }: SpecialistAgentsV2Props) => {
    return (
        <section className="px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-6xl">
                <Reveal className="mb-12 max-w-2xl sm:mb-16">
                    <h2
                        className="lp-display"
                        style={{ fontSize: "clamp(2rem, 4.6vw, 3.2rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
                    >
                        Crie especialistas para cada etapa da conversa
                    </h2>
                    <p className="mt-5 max-w-xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(5,5,5,0.68)" }}>
                        No Vyzon, a EVA pode assumir papéis específicos para qualificar leads, sugerir follow-ups, preparar próximos passos e apoiar seu time em cada momento da jornada comercial.
                    </p>
                </Reveal>

                <div className="grid gap-5 lg:grid-cols-2">
                    {/* ── Card grande interativo (URL → blueprint da EVA) ── */}
                    <Reveal>
                        <AgentBuilderCard onCTAClick={onCTAClick} />
                    </Reveal>

                    {/* ── 3 cards empilhados ──────────────────────── */}
                    <Reveal delay={100}>
                        <div className="flex h-full flex-col gap-5">
                            {RIGHT.map((c) => (
                                <div
                                    key={c.t}
                                    className="vz-soft-card flex-1 rounded-2xl p-6 sm:p-7"
                                    style={{ background: "var(--lp-white)", border: "1px solid var(--lp-line)" }}
                                >
                                    <h3 style={{ fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--lp-ink)" }}>
                                        {c.t}
                                    </h3>
                                    <p className="mt-2.5 max-w-sm" style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "rgba(5,5,5,0.62)" }}>
                                        {c.d}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
};
