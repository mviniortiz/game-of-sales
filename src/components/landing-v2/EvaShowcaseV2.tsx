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
                        className="overflow-hidden rounded-[32px]"
                        style={{ border: "1px solid var(--lp-line)", backgroundColor: "#eef2f7" }}
                    >
                        {/* A figura da EVA (cabeça aos ombros) aparece inteira, sem
                            zoom no rosto. A imagem é 1080x1350 mas o terço inferior é
                            só fundo branco — recortamos ele (object-cover + top) pra
                            não sobrar espaço morto. Sem gradiente/opacidade. */}
                        <div className="mx-auto w-full max-w-[660px] px-4 pt-6 sm:pt-10">
                            <div className="overflow-hidden rounded-[20px]" style={{ aspectRatio: "1080 / 950" }}>
                                <img
                                    src={evaFigure}
                                    alt="EVA, a camada de inteligência do Vyzon"
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    style={{ objectPosition: "center top" }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col items-center px-6 pb-14 pt-2 text-center sm:pb-16">
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
