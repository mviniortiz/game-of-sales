// LP.2.3 2026-05-25: "Para quem é" — título + framing curto + chips de segmento.
// LP.4 2026-06-09: chips viram letreiro contínuo (marquee CSS, pausa no hover,
// desliga em prefers-reduced-motion). Export mantido (PilaresSection).
// LP.5 2026-06-12: reveals por scroll (Rise) no lugar dos fades de mount.
import { Rise } from "./animation/Rise";

const SEGMENTOS = [
    "Tráfego pago",
    "Full service",
    "Social media",
    "Lançamentos",
    "Infoprodutos",
    "Agências B2B",
    "Consultorias comerciais",
    "Agências nichadas",
] as const;

const Chip = ({ label }: { label: string }) => (
    <span
        className="inline-flex items-center gap-3 px-6 py-3 mr-3 text-[14px] sm:text-[15px] whitespace-nowrap"
        style={{
            border: "1px solid var(--lp-line)",
            borderRadius: 8,
            color: "var(--lp-ink-70)",
            fontWeight: 500,
            background: "var(--lp-white)",
        }}
    >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--lp-blue)" }} />
        {label}
    </span>
);

export const PilaresSection = () => {
    return (
        <section className="lp-paper relative py-24 sm:py-28 overflow-hidden">
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Estação do fio */}
                <Rise>
                    <div className="lp-station mb-12 sm:mb-14">
                        <span className="lp-station-node" />
                        <span className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>
                            05 · para quem é
                        </span>
                        <span className="lp-station-rule" />
                    </div>
                </Rise>

                <Rise delay={0.08}>
                    <h2
                        className="font-satoshi"
                        style={{
                            fontWeight: 900,
                            fontSize: "clamp(1.9rem, 5vw, 3.1rem)",
                            lineHeight: 1.04,
                            letterSpacing: "-0.04em",
                            color: "var(--lp-ink)",
                            maxWidth: "720px",
                        }}
                    >
                        Feito para agências que vendem{" "}
                        <span className="lp-serif" style={{ color: "var(--lp-blue)", fontWeight: 500 }}>
                            por conversa
                        </span>
                        .
                    </h2>

                    <p
                        className="mt-5 max-w-xl"
                        style={{
                            fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                            color: "var(--lp-ink-70)",
                            fontWeight: 400,
                        }}
                    >
                        Se os seus leads chegam pelo WhatsApp e o time precisa responder rápido, qualificar melhor e não deixar follow-up morrer, o Vyzon foi feito pra você.
                    </p>
                </Rise>
            </div>

            {/* Letreiro de segmentos — full-bleed, conteúdo duplicado pro loop */}
            <div
                className="mt-12"
                style={{
                    borderTop: "1px solid var(--lp-line)",
                    borderBottom: "1px solid var(--lp-line)",
                    paddingTop: 14,
                    paddingBottom: 14,
                    overflow: "hidden",
                }}
            >
                <div className="lp-marquee" aria-hidden="false">
                    {[0, 1].map((dup) => (
                        <div key={dup} className="flex" aria-hidden={dup === 1}>
                            {SEGMENTOS.map((seg) => (
                                <Chip key={`${dup}-${seg}`} label={seg} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
