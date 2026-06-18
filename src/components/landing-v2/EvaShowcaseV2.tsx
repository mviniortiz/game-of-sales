import evaFigure from "@/assets/landing-v2/eva-ethereal.webp";
import { ButtonV2 } from "./ButtonV2";
import { Reveal } from "./Reveal";

// LP.6 (v2) — card "Veja a EVA em ação". A figura da EVA é a PROTAGONISTA
// (visível, ocupa o card), com um gradiente só na base pra legibilidade; o
// texto + botão ficam embaixo, centralizados (sem texto sobre o rosto). Seção
// alta/generosa. Sem o mini-card de conversa (era fraco).
interface EvaShowcaseV2Props {
    onStartDemo: () => void;
}

export const EvaShowcaseV2 = ({ onStartDemo }: EvaShowcaseV2Props) => {
    return (
        <section id="eva" className="px-5 py-20 sm:py-28">
            <div className="mx-auto max-w-[1100px]">
                <Reveal>
                    <div
                        className="relative overflow-hidden rounded-[32px]"
                        style={{ border: "1px solid var(--lp-line)", backgroundColor: "#eaeef4" }}
                    >
                        <img
                            src={evaFigure}
                            alt="EVA, a camada de inteligência do Vyzon"
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                            style={{ objectPosition: "center 14%", opacity: 1 }}
                        />
                        {/* gradiente só na base: a figura aparece em cima, texto legível embaixo */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    "linear-gradient(to bottom, transparent 0%, transparent 44%, rgba(248,247,243,0.5) 70%, rgba(248,247,243,0.98) 100%)",
                            }}
                        />
                        <div className="relative z-10 flex min-h-[580px] flex-col items-center justify-end px-6 pb-14 pt-56 text-center sm:min-h-[860px] sm:pb-20 sm:pt-80">
                            <p className="lp-mono" style={{ color: "rgba(5,5,5,0.5)" }}>
                                EVA em ação
                            </p>
                            <h2
                                className="lp-display mt-3"
                                style={{
                                    fontSize: "clamp(2.2rem, 4.8vw, 3.6rem)",
                                    lineHeight: 1.03,
                                    letterSpacing: "-0.035em",
                                    color: "#050505",
                                }}
                            >
                                Veja a EVA em ação
                            </h2>
                            <p
                                className="mx-auto mt-4 max-w-lg"
                                style={{ fontSize: "1.05rem", lineHeight: 1.55, color: "rgba(5,5,5,0.7)" }}
                            >
                                Entenda como ela lê a conversa, sugere o próximo passo e mantém seu time no controle.
                            </p>
                            <div className="mt-7">
                                <ButtonV2 onClick={onStartDemo} variant="primary" showArrow>
                                    Ver demo
                                </ButtonV2>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
