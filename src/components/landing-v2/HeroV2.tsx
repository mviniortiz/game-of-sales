import { ButtonV2 } from "./ButtonV2";
import { HeroConversa } from "./HeroConversa";

// LP.6→LP.9 — HERO editorial: tipografia, CTA e UMA prova encenada
// (HeroConversa). Sem fita, sem partículas, sem badges; wash radial sutil.
interface HeroV2Props {
    onScheduleDemoClick: () => void;
    onSecondaryClick: () => void;
}

export const HeroV2 = ({ onSecondaryClick }: HeroV2Props) => {
    return (
        <section className="relative overflow-hidden" style={{ backgroundColor: "var(--lp-paper)" }}>
            {/* aura azul da hero em formato de DISCO radial (grande, estático)
                centrado na base: wash de cor (glow) + campo de pontos. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 bottom-0"
                style={{
                    width: "min(1320px, 128vw)", aspectRatio: "1",
                    transform: "translate(-50%, 50%)",
                    background: "radial-gradient(circle at center, rgba(21,86,192,0.12), rgba(21,86,192,0.04) 40%, transparent 64%)",
                }}
            />
            <div className="relative z-10 mx-auto max-w-4xl px-5 pb-14 pt-24 text-center sm:pb-16 sm:pt-24">
                <h1
                    className="lp-display mx-auto max-w-3xl landing-fade-in-up-lg landing-delay-100"
                    style={{
                        fontSize: "clamp(1.9rem, 5.4vw, 4rem)",
                        lineHeight: 1.05,
                        letterSpacing: "-0.04em",
                        color: "#050505",
                        textWrap: "balance",
                    }}
                >
                    Sua agência responde lead
                    <br />
                    <span className="lp-serif" style={{ color: "#050505" }}>
                        sem abrir sistema nenhum.
                    </span>
                </h1>

                <p
                    className="mx-auto mt-8 max-w-[560px] landing-fade-in-up landing-delay-200"
                    style={{ fontSize: "clamp(0.9375rem, 1.3vw, 1rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.68)" }}
                >
                    A EVA lê cada conversa do WhatsApp, abre a oportunidade no funil e te manda a próxima mensagem pronta no seu WhatsApp. Você responde 1 e ela sai.
                </p>

                <div className="mt-9 flex justify-center landing-fade-in-up landing-delay-300">
                    <ButtonV2 onClick={onSecondaryClick} variant="primary" showArrow>
                        Ver a EVA em ação
                    </ButtonV2>
                </div>

                {/* LP.9 — a prova: conversa → sugestão → aprovação → enviada. */}
                <div className="mt-12 landing-fade-in-up landing-delay-400">
                    <HeroConversa />
                </div>
            </div>
        </section>
    );
};
