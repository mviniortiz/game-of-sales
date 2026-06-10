import { Calendar } from "lucide-react";
import { LandingButton } from "./LandingButton";

// LP.4 2026-06-09: o fim do fio. Bookend do hero — papel com grade fina,
// momento tipográfico gigante e o último nó da página. CSS-only.
interface FinalCTAProps {
    onCTAClick: () => void;
    onScheduleDemoClick?: () => void;
    onSeePlansClick?: () => void;
}

export const FinalCTA = ({ onCTAClick, onScheduleDemoClick }: FinalCTAProps) => {
    void onCTAClick;
    return (
        <section className="lp-paper lp-paper--fine relative py-28 sm:py-36 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="relative max-w-4xl mx-auto text-center">
                {/* O fio chega ao último nó */}
                <div className="flex flex-col items-center mb-10 landing-fade-in-up" aria-hidden="true">
                    <div
                        className="h-16 w-px"
                        style={{
                            background:
                                "repeating-linear-gradient(180deg, var(--lp-line) 0 6px, transparent 6px 12px)",
                        }}
                    />
                    <span className="lp-station-node mt-2" />
                    <span className="lp-mono mt-3" style={{ color: "var(--lp-ink-55)" }}>
                        10 · comece agora
                    </span>
                </div>

                {/* Headline */}
                <h2
                    className="font-satoshi mb-6 mx-auto landing-fade-in-up landing-delay-100"
                    style={{
                        fontWeight: 900,
                        fontSize: "clamp(2rem, 6vw, 4rem)",
                        lineHeight: 1.0,
                        letterSpacing: "-0.045em",
                        color: "var(--lp-ink)",
                        maxWidth: "820px",
                    }}
                >
                    Veja como sua agência pode parar de perder oportunidades{" "}
                    <span className="lp-serif" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                        no WhatsApp.
                    </span>
                </h2>

                {/* Sub-copy */}
                <p
                    className="mb-10 max-w-xl mx-auto landing-fade-in-up landing-delay-200"
                    style={{
                        color: "var(--lp-ink-70)",
                        fontSize: "clamp(1rem, 1.8vw, 1.125rem)",
                        lineHeight: 1.65,
                    }}
                >
                    Agende uma demonstração personalizada e veja o Vyzon aplicado ao seu fluxo comercial.
                </p>

                {/* CTA */}
                <div className="flex justify-center landing-fade-in-up landing-delay-300">
                    <LandingButton
                        href="#agendar-demo"
                        onClick={(e) => {
                            if (onScheduleDemoClick) {
                                e.preventDefault();
                                onScheduleDemoClick();
                            }
                        }}
                        variant="primary"
                        size="lg"
                        icon={<Calendar className="h-4 w-4" />}
                        showArrow
                    >
                        Agendar demo gratuita
                    </LandingButton>
                </div>

                {/* Microcopy */}
                <p
                    className="lp-mono mt-7 landing-fade-in landing-delay-400"
                    style={{ color: "var(--lp-ink-55)", textTransform: "none", letterSpacing: "0.03em" }}
                >
                    Demo gratuita, personalizada para o contexto da sua agência.
                </p>
            </div>
        </section>
    );
};
