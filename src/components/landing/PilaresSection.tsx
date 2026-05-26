import { Building2 } from "lucide-react";

// LP.2.3 2026-05-25: "Para quem é" — título + framing curto + chips de segmento
// (os chips vieram do hero, que foi enxugado). Export mantido (PilaresSection)
// pra não tocar o import da LandingPage.
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

export const PilaresSection = () => {
    return (
        <section className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
            <div className="relative max-w-3xl mx-auto text-center landing-fade-in-up">
                <span
                    className="inline-flex items-center gap-2 text-[11px] rounded-full px-4 py-1.5 mb-6"
                    style={{
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                        background: "rgba(10,10,10,0.04)",
                        color: "rgba(10,10,10,0.6)",
                        border: "1px solid rgba(10,10,10,0.08)",
                    }}
                >
                    <Building2 className="h-3 w-3" strokeWidth={2} />
                    Para quem é
                </span>

                <h2
                    className="font-satoshi mx-auto"
                    style={{
                        fontWeight: 700,
                        fontSize: "clamp(1.9rem, 5vw, 3rem)",
                        lineHeight: 1.05,
                        letterSpacing: "-0.04em",
                        color: "#0A0A0A",
                        maxWidth: "720px",
                    }}
                >
                    Feito para agências que vendem <span style={{ color: "rgba(10,10,10,0.5)" }}>por conversa</span>.
                </h2>

                <p
                    className="mt-5 mx-auto max-w-xl"
                    style={{
                        fontSize: "clamp(0.95rem, 1.8vw, 1.125rem)",
                        lineHeight: 1.65,
                        color: "rgba(10,10,10,0.6)",
                        fontWeight: 400,
                    }}
                >
                    Se os seus leads chegam pelo WhatsApp e o time precisa responder rápido, qualificar melhor e não deixar follow-up morrer, o Vyzon foi feito pra você.
                </p>

                {/* Chips de segmento */}
                <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                    {SEGMENTOS.map((seg) => (
                        <span
                            key={seg}
                            className="inline-flex items-center rounded-full px-4 py-2 text-[13px] sm:text-[14px] hover-lift"
                            style={{
                                background: "rgba(10,10,10,0.025)",
                                border: "1px solid rgba(10,10,10,0.1)",
                                color: "rgba(10,10,10,0.72)",
                                fontWeight: 500,
                                letterSpacing: "-0.005em",
                            }}
                        >
                            {seg}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
};
