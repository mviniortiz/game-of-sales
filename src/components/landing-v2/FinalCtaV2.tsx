import { ButtonV2 } from "./ButtonV2";
import { Reveal } from "./Reveal";

// LP.6 (v2) — CTA final. Fundo escuro elegante (fecha a página com contraste),
// atmosfera azul/ciano quase invisível, headline serif, botão primário CLARO
// (no escuro o preto não serve) + secundário outline claro. Sem gradiente
// chamativo, sem imagem pesada.
interface FinalCtaV2Props {
    onScheduleDemoClick: () => void;
    onSecondaryClick: () => void;
}

export const FinalCtaV2 = ({ onScheduleDemoClick, onSecondaryClick }: FinalCtaV2Props) => {
    return (
        <section className="relative overflow-hidden px-5 py-28 sm:py-36" style={{ backgroundColor: "#0c0f16" }}>
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background: [
                        "radial-gradient(50% 90% at 30% 120%, rgba(47,128,237,0.16), transparent 66%)",
                        "radial-gradient(45% 85% at 72% 124%, rgba(56,189,248,0.12), transparent 68%)",
                    ].join(", "),
                }}
            />
            <Reveal className="relative z-10 mx-auto max-w-3xl text-center">
                <h2
                    className="lp-display"
                    style={{ fontSize: "clamp(2.1rem, 5vw, 3.6rem)", lineHeight: 1.04, letterSpacing: "-0.035em", color: "#F7F7F4" }}
                >
                    Dê à sua equipe um copiloto para cada conversa.
                </h2>
                <p className="mx-auto mt-6 max-w-xl" style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "rgba(255,255,255,0.66)" }}>
                    A EVA ajuda sua agência a entender atendimentos, sugerir próximos passos e manter o time no controle do processo comercial.
                </p>
                <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <ButtonV2 variant="light" onClick={onScheduleDemoClick} showArrow>
                        Agendar demo gratuita
                    </ButtonV2>
                    <ButtonV2 variant="ghostlight" onClick={onSecondaryClick}>
                        Ver como funciona
                    </ButtonV2>
                </div>
            </Reveal>
        </section>
    );
};
