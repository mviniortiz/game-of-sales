import { useState } from "react";
import { AnimatedMeshTile } from "./AnimatedMeshTile";
import { Reveal } from "./Reveal";
import { FEATURE_ROWS, type ShowcaseRow } from "./FeatureShowcase";

// LP.9 (v2) — seção "A EVA acompanha cada etapa". Cada bloco tem benefícios
// CLICÁVEIS: tocar num benefício troca o preview detalhado dentro do tile (mesh
// gradient + grain). Layout responsivo (empilha no mobile).
function FeatureRow({ row }: { row: ShowcaseRow }) {
    const [active, setActive] = useState(0);
    const { label, title, body, items, variant, reverse } = row;

    return (
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
            <Reveal className={reverse ? "lg:order-2" : ""}>
                <span className="inline-block rounded-full px-3 py-1 text-[12.5px]" style={{ background: "rgba(13,20,33,0.045)", color: "var(--lp-ink-55)", fontWeight: 500 }}>
                    {label}
                </span>
                <h3 className="lp-display mt-5" style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)", lineHeight: 1.12, letterSpacing: "-0.025em", color: "var(--lp-ink)" }}>
                    {title}
                </h3>
                <p className="mt-4 max-w-md" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "var(--lp-ink-70)" }}>
                    {body}
                </p>

                <div className="mt-7" role="tablist" aria-label={label}>
                    {items.map((it, i) => {
                        const on = i === active;
                        return (
                            <button
                                key={it.label}
                                type="button"
                                role="tab"
                                aria-selected={on}
                                onClick={() => setActive(i)}
                                className="flex w-full items-center gap-3 border-t py-3.5 text-left transition-colors hover:bg-[rgba(13,20,33,0.02)]"
                                style={{ borderColor: "var(--lp-line)" }}
                            >
                                <span className="h-5 w-[3px] shrink-0 rounded-full transition-all duration-300" style={{ background: on ? "var(--lp-blue)" : "transparent" }} />
                                <span className="flex-1 text-[15px] transition-colors" style={{ color: on ? "var(--lp-ink)" : "var(--lp-ink-55)", fontWeight: on ? 600 : 500 }}>
                                    {it.label}
                                </span>
                                <span className="shrink-0 text-[13px] transition-opacity duration-300" style={{ color: "var(--lp-blue)", opacity: on ? 1 : 0 }} aria-hidden="true">→</span>
                            </button>
                        );
                    })}
                </div>
                <p className="lp-mono mt-3" style={{ color: "var(--lp-ink-40)" }}>toque em cada item para ver na tela</p>
            </Reveal>

            <Reveal delay={90} className={reverse ? "lg:order-1" : ""}>
                <AnimatedMeshTile variant={variant} className="aspect-[5/4] rounded-[24px] p-5 sm:p-10">
                    <div key={active} className="vz-rise flex w-full justify-center">
                        {items[active].preview}
                    </div>
                </AnimatedMeshTile>
            </Reveal>
        </div>
    );
}

export const FeaturesV2 = () => {
    return (
        <section className="px-5 py-20 sm:py-28" style={{ backgroundColor: "var(--lp-paper)" }}>
            <div className="mx-auto max-w-6xl">
                <Reveal className="mb-16 max-w-2xl sm:mb-24">
                    <p className="lp-mono" style={{ color: "rgba(5,5,5,0.48)" }}>EVA</p>
                    <h2 className="lp-display mt-4" style={{ fontSize: "clamp(2rem, 4.6vw, 3.2rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}>
                        A EVA acompanha cada etapa da conversa
                    </h2>
                    <p className="mt-5 max-w-xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6, color: "rgba(5,5,5,0.68)" }}>
                        Da primeira mensagem ao fechamento, ela entende o contexto, sugere o próximo passo e não deixa nenhuma conversa ficar pra trás.
                    </p>
                </Reveal>
                <div className="flex flex-col gap-24 sm:gap-32">
                    {FEATURE_ROWS.map((row) => (
                        <FeatureRow key={row.label} row={row} />
                    ))}
                </div>
            </div>
        </section>
    );
};
