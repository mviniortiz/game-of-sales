import { Reveal } from "./Reveal";

// LP.6 (v2) — proof strip editorial SEM testimonial (Claims Policy: nada de
// cliente/citação/métrica inventada). 3 colunas com top border fino, títulos
// serif e texto muted. Não é card — é uma faixa editorial de prova honesta.
const ITEMS = [
    { t: "Onde a conversa acontece", d: "A EVA trabalha no canal em que seus leads já falam com sua agência." },
    { t: "Aprovação humana", d: "Nenhuma sugestão é enviada sem o ok do seu time." },
    { t: "Playbook da agência", d: "Cada resposta segue o contexto, a oferta e o processo comercial da operação." },
];

export const ProofStripV2 = () => {
    return (
        <section className="px-5">
            <div className="mx-auto max-w-[1080px]">
                <div
                    className="grid gap-10 border-t py-14 sm:grid-cols-3 sm:gap-12 sm:py-20"
                    style={{ borderColor: "rgba(0,0,0,0.10)" }}
                >
                    {ITEMS.map((it, i) => (
                        <Reveal key={it.t} delay={i * 90}>
                            <p
                                className="lp-display"
                                style={{ fontSize: "clamp(1.5rem, 2.4vw, 1.85rem)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--lp-ink)" }}
                            >
                                {it.t}
                            </p>
                            <p className="mt-3 max-w-[300px]" style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "rgba(5,5,5,0.6)" }}>
                                {it.d}
                            </p>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};
