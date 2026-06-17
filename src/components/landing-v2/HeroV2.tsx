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
            {/* aura azul na quebra inferior do hero — separa do que vem abaixo */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{ height: 260, background: "radial-gradient(58% 120% at 50% 100%, rgba(21,86,192,0.16), rgba(21,86,192,0.06) 38%, transparent 72%)" }}
            />
            <div className="relative z-10 mx-auto max-w-4xl px-5 pb-28 pt-32 text-center sm:pb-36 sm:pt-40">
                <h1
                    className="lp-display mx-auto max-w-4xl landing-fade-in-up-lg landing-delay-100"
                    style={{
                        fontSize: "clamp(3.5rem, 8vw, 6.5rem)",
                        lineHeight: 0.9,
                        letterSpacing: "-0.055em",
                        color: "#050505",
                    }}
                >
                    Um copiloto para
                    <br />
                    <span className="lp-serif" style={{ color: "#050505" }}>
                        cada conversa.
                    </span>
                </h1>

                <p
                    className="mx-auto mt-8 max-w-[560px] landing-fade-in-up landing-delay-200"
                    style={{ fontSize: "clamp(0.9375rem, 1.3vw, 1rem)", lineHeight: 1.55, color: "rgba(5,5,5,0.68)" }}
                >
                    A EVA acompanha os atendimentos da sua agência no WhatsApp, entende o contexto e sugere o próximo passo para seu time aprovar.
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
