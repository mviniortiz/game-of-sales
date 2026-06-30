import { ButtonV2 } from "./ButtonV2";

// LP.6 (landing v2) — HERO editorial e LIMPO: só tipografia, CTAs e muito
// espaço negativo. Sem fita, sem partículas, sem avatar/cards/badges.
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
                    background: "radial-gradient(circle at center, rgba(21,86,192,0.20), rgba(21,86,192,0.06) 40%, transparent 64%)",
                }}
            />
            <div
                aria-hidden="true"
                className="vz-hero-dots pointer-events-none absolute left-1/2 bottom-0"
                style={{
                    width: "min(1240px, 122vw)", aspectRatio: "1",
                    backgroundImage: "radial-gradient(circle, rgba(21,86,192,0.36) 1.6px, transparent 1.7px)",
                    backgroundSize: "20px 20px",
                    WebkitMaskImage: "radial-gradient(circle at center, #000 0%, rgba(0,0,0,0.42) 38%, transparent 60%)",
                    maskImage: "radial-gradient(circle at center, #000 0%, rgba(0,0,0,0.42) 38%, transparent 60%)",
                }}
            />
            <div className="relative z-10 mx-auto max-w-4xl px-5 pb-28 pt-32 text-center sm:pb-36 sm:pt-40">
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
                    Pare de perder lead
                    <br />
                    <span className="lp-serif" style={{ color: "#050505" }}>
                        no WhatsApp.
                    </span>
                </h1>

                <p
                    className="mx-auto mt-8 max-w-[560px] landing-fade-in-up landing-delay-200"
                    style={{ fontSize: "clamp(0.9375rem, 1.3vw, 1rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.68)" }}
                >
                    A EVA lê cada atendimento, aponta quem está pronto pra fechar e sugere o próximo passo. Seu time aprova e envia.
                </p>

                <div className="mt-9 flex justify-center landing-fade-in-up landing-delay-300">
                    <ButtonV2 onClick={onSecondaryClick} variant="primary" showArrow>
                        Ver a EVA em ação
                    </ButtonV2>
                </div>
            </div>
        </section>
    );
};
