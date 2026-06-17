import { Check } from "lucide-react";
import { ButtonV2 } from "./ButtonV2";
import { AnimatedMeshTile } from "./AnimatedMeshTile";
import { Reveal } from "./Reveal";
import { EvaNode } from "@/components/landing/EvaNode";

// LP.6 (v2) — "Comece em minutos", no espírito do "Get started in minutes" da
// handhold: passos numerados à esquerda + mock de painel à direita. Fluxo real
// do Vyzon: conecta WhatsApp/fontes → EVA lê e sugere → time aprova, pipeline anda.
interface HowItWorksV2Props {
    onStart: () => void;
}

const STEPS = [
    {
        n: "01",
        t: "Conecte seu WhatsApp e seus canais",
        d: "Ligamos a EVA aos canais onde seus atendimentos já acontecem.",
    },
    {
        n: "02",
        t: "Ajuste o playbook da agência",
        d: "Defina etapas, critérios, tom de voz e próximos passos comerciais.",
    },
    {
        n: "03",
        t: "Revise sugestões com seu time",
        d: "A EVA sugere respostas e ações. A aprovação continua com quem conduz a venda.",
    },
];

function PanelMock() {
    return (
        <div
            className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white"
            style={{ border: "1px solid var(--lp-line)", boxShadow: "0 30px 70px -34px rgba(13,20,33,0.5)" }}
        >
            <div className="flex">
                {/* sidebar */}
                <div className="hidden w-[120px] shrink-0 flex-col gap-1 p-3 sm:flex" style={{ background: "var(--lp-ink)" }}>
                    <div className="mb-2 flex items-center gap-1.5 px-1.5">
                        <EvaNode size={13} color="#fff" />
                        <span className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                            Vyzon
                        </span>
                    </div>
                    {["Conversas", "EVA", "Pipeline", "Fontes"].map((it, i) => (
                        <span
                            key={it}
                            className="rounded-md px-2 py-1.5 text-[11px]"
                            style={{
                                color: i === 3 ? "#fff" : "rgba(255,255,255,0.55)",
                                background: i === 3 ? "rgba(255,255,255,0.12)" : "transparent",
                                fontWeight: i === 3 ? 600 : 500,
                            }}
                        >
                            {it}
                        </span>
                    ))}
                </div>
                {/* conteúdo */}
                <div className="flex-1 p-4">
                    <p className="text-[13px]" style={{ color: "var(--lp-ink)", fontWeight: 700 }}>
                        Fontes da EVA
                    </p>
                    <p className="lp-mono mt-0.5 mb-3" style={{ color: "var(--lp-ink-40)" }}>
                        o que alimenta o contexto
                    </p>
                    <div className="flex flex-col gap-2">
                        <div
                            className="flex items-center justify-between rounded-lg px-3 py-2.5"
                            style={{ background: "rgba(0,138,82,0.07)", border: "1px solid rgba(0,138,82,0.25)" }}
                        >
                            <span className="text-[12.5px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                                WhatsApp
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--lp-live)", fontWeight: 600 }}>
                                <Check className="h-3 w-3" strokeWidth={3} />
                                conectado
                            </span>
                        </div>
                        <div
                            className="flex items-center justify-between rounded-lg px-3 py-2.5"
                            style={{ background: "rgba(13,20,33,0.02)", border: "1px solid var(--lp-line-soft)" }}
                        >
                            <span className="text-[12.5px]" style={{ color: "var(--lp-ink)", fontWeight: 600 }}>
                                Playbook comercial
                            </span>
                            <span className="lp-mono" style={{ color: "var(--lp-ink-40)" }}>
                                pronto
                            </span>
                        </div>
                        <div
                            className="rounded-lg px-3 py-2.5 text-[12px]"
                            style={{ background: "rgba(13,20,33,0.02)", border: "1px dashed var(--lp-line)", color: "var(--lp-ink-40)" }}
                        >
                            + Adicionar fonte
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const HowItWorksV2 = ({ onStart }: HowItWorksV2Props) => {
    return (
        <section className="px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-6xl">
                <Reveal>
                    <h2
                        className="lp-display max-w-2xl"
                        style={{
                            fontSize: "clamp(2rem, 4.6vw, 3.2rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.03em",
                            color: "#050505",
                        }}
                    >
                        Coloque a EVA para operar sem mudar seu processo.
                    </h2>
                    <p className="mt-5 max-w-xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(5,5,5,0.68)" }}>
                        Conecte seus canais, ajuste o playbook comercial e comece a revisar sugestões com seu time.
                    </p>
                </Reveal>
                <div className="mt-12 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="flex flex-col">
                        {STEPS.map((s) => (
                            <div key={s.n} className="border-t py-6" style={{ borderColor: "var(--lp-line)" }}>
                                <p className="lp-display" style={{ fontSize: "1.9rem", lineHeight: 1, color: "var(--lp-ink)" }}>
                                    {s.n}
                                </p>
                                <h3 className="mt-2.5" style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--lp-ink)" }}>
                                    {s.t}
                                </h3>
                                <p className="mt-1.5 max-w-md" style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "var(--lp-ink-55)" }}>
                                    {s.d}
                                </p>
                            </div>
                        ))}
                        <div className="mt-9">
                            <ButtonV2 onClick={onStart} variant="primary" showArrow>
                                Começar grátis
                            </ButtonV2>
                            <p className="mt-3 text-[12.5px]" style={{ color: "var(--lp-ink-40)" }}>
                                14 dias grátis · sem cartão
                            </p>
                        </div>
                    </div>
                    <AnimatedMeshTile variant="green" className="rounded-[24px] p-6 sm:p-12">
                        <PanelMock />
                    </AnimatedMeshTile>
                </div>
            </div>
        </section>
    );
};
