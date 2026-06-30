import evaFigure from "@/assets/landing-v2/eva-showcase.webp";
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
                    {/* O card é 100% a cena panorâmica da EVA (2048x768): cobre todo
                        o espaço, sem fundo/moldura e sem corte (o card assume a
                        proporção da imagem). */}
                    <div className="overflow-hidden rounded-[32px]" style={{ border: "1px solid var(--lp-line)" }}>
                        <img
                            src={evaFigure}
                            alt="EVA, a camada de inteligência do Vyzon"
                            loading="lazy"
                            className="block w-full object-cover"
                            style={{ aspectRatio: "1600 / 600" }}
                        />
                    </div>
                    {/* texto + botão FORA do card, embaixo */}
                    <div className="mt-9 flex flex-col items-center text-center sm:mt-11">
                        <p className="lp-mono" style={{ color: "rgba(5,5,5,0.5)" }}>
                            Demonstração
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
                            Ela lê a conversa, aponta quem está pronto e sugere o próximo passo. Seu time mantém o controle do que vai pro lead.
                        </p>
                        <div className="mt-7">
                            <ButtonV2 onClick={onStartDemo} variant="primary" showArrow>
                                Ver demo
                            </ButtonV2>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
