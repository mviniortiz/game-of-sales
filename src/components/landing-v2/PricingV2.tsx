import { Check } from "lucide-react";
import { ButtonV2 } from "./ButtonV2";
import { Reveal } from "./Reveal";

// LP.6 (v2) — planos. SEM preço numérico (decisão: "Sob consulta" discreto).
// 3 cards calmos, borda fina, central com leve destaque (sem badge "popular").
// Título da seção em serif; cards em sans. CTA pill preto.
interface PricingV2Props {
    onCTAClick: () => void;
    onContactClick: () => void;
}

const PLANS = [
    {
        name: "Start",
        desc: "Para validar a EVA em uma frente comercial.",
        items: [
            "1 canal de atendimento",
            "Sugestões assistidas pela EVA",
            "Aprovação humana antes do envio",
            "Visão básica das conversas",
        ],
        cta: "Agendar demo",
        featured: false,
    },
    {
        name: "Operação",
        desc: "Para organizar atendimento, qualificação e próximos passos.",
        items: [
            "Central comercial com WhatsApp",
            "Playbooks comerciais da agência",
            "Sugestões de resposta e follow-up",
            "Pipeline e acompanhamento do time",
        ],
        cta: "Agendar demo",
        featured: true,
    },
    {
        name: "Scale",
        desc: "Para operações com múltiplos fluxos, canais e regras comerciais.",
        items: [
            "Múltiplos fluxos comerciais",
            "Automações e integrações avançadas",
            "Regras por etapa da jornada",
            "Suporte para implantação",
        ],
        cta: "Falar com vendas",
        featured: false,
    },
];

export const PricingV2 = ({ onCTAClick, onContactClick }: PricingV2Props) => {
    return (
        <section id="pricing" className="px-5 py-24 sm:py-32" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-[1080px]">
                <Reveal className="max-w-2xl">
                    <h2
                        className="lp-display"
                        style={{ fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
                    >
                        Planos para cada estágio da operação comercial
                    </h2>
                    <p className="mt-5 max-w-xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(5,5,5,0.68)" }}>
                        Comece validando a EVA em uma frente comercial e evolua para uma operação completa com automações, playbooks e acompanhamento do time.
                    </p>
                </Reveal>

                <Reveal delay={100} className="mt-14 grid gap-5 lg:grid-cols-3">
                    {PLANS.map((p) => (
                        <div
                            key={p.name}
                            className="flex flex-col rounded-2xl p-7"
                            style={{
                                background: "var(--lp-white)",
                                border: p.featured ? "1px solid rgba(5,5,5,0.2)" : "1px solid var(--lp-line)",
                            }}
                        >
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--lp-ink)", letterSpacing: "-0.01em" }}>
                                {p.name}
                            </h3>
                            <p className="mt-2 text-[13px]" style={{ color: "rgba(5,5,5,0.46)", fontWeight: 500 }}>
                                Sob consulta
                            </p>
                            <p className="mt-4 text-[14.5px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.55 }}>
                                {p.desc}
                            </p>
                            <ul className="mt-6 mb-8 flex flex-col gap-3">
                                {p.items.map((it) => (
                                    <li key={it} className="flex items-start gap-2.5 text-[14px]" style={{ color: "var(--lp-ink)" }}>
                                        <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} style={{ color: "rgba(5,5,5,0.4)" }} />
                                        <span>{it}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto">
                                <ButtonV2
                                    variant={p.featured ? "primary" : "secondary"}
                                    onClick={p.cta === "Falar com vendas" ? onContactClick : onCTAClick}
                                    className="w-full"
                                >
                                    {p.cta}
                                </ButtonV2>
                            </div>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
};
