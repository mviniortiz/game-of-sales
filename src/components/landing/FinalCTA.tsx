import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { LandingButton } from "./LandingButton";

// FinalCTA white-first com streaks azuis como bookend visual do Hero
// (mesma assinatura aurora vertical em dois tons de azul brand).
const STREAKS = [
    { left: 3, width: 70, opacity: 0.18, skew: -6, kind: "dark" },
    { left: 9, width: 40, opacity: 0.10, skew: -3, kind: "dark" },
    { left: 16, width: 95, opacity: 0.24, skew: -8, kind: "dark" },
    { left: 24, width: 55, opacity: 0.14, skew: 2, kind: "light" },
    { left: 31, width: 75, opacity: 0.18, skew: -5, kind: "dark" },
    { left: 39, width: 35, opacity: 0.08, skew: 4, kind: "dark" },
    { left: 47, width: 85, opacity: 0.20, skew: -7, kind: "light" },
    { left: 56, width: 50, opacity: 0.12, skew: 3, kind: "dark" },
    { left: 63, width: 75, opacity: 0.18, skew: -4, kind: "dark" },
    { left: 71, width: 45, opacity: 0.10, skew: 5, kind: "light" },
    { left: 78, width: 100, opacity: 0.24, skew: -9, kind: "dark" },
    { left: 87, width: 60, opacity: 0.14, skew: -2, kind: "dark" },
    { left: 94, width: 50, opacity: 0.12, skew: 6, kind: "dark" },
] as const;

interface FinalCTAProps {
    onCTAClick: () => void;
    onScheduleDemoClick?: () => void;
    onSeePlansClick?: () => void;
}

export const FinalCTA = ({ onCTAClick, onScheduleDemoClick }: FinalCTAProps) => {
    void onCTAClick;
    return (
        <section className="relative py-28 sm:py-36 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
            {/* Streaks layer — bookend do Hero */}
            <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden" aria-hidden="true">
                {STREAKS.map((s, i) => (
                    <div
                        key={i}
                        className="absolute top-0 origin-top"
                        style={{
                            left: `${s.left}%`,
                            width: `${s.width}px`,
                            height: "120%",
                            transform: `skewX(${s.skew}deg) translateY(-10%)`,
                            background: s.kind === "light"
                                ? `linear-gradient(180deg, rgba(74,140,232,${s.opacity * 0.95}) 0%, rgba(74,140,232,${s.opacity * 0.3}) 40%, transparent 78%)`
                                : `linear-gradient(180deg, rgba(21,86,192,${s.opacity}) 0%, rgba(21,86,192,${s.opacity * 0.35}) 45%, transparent 82%)`,
                            filter: "blur(14px)",
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="relative max-w-4xl mx-auto"
                initial={{ y: 32 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="relative z-10 text-center">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2 mb-7">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#1556C0" }}
                        />
                        <span
                            className="text-xs"
                            style={{
                                fontWeight: 600,
                                letterSpacing: "0.12em",
                                color: "rgba(10,10,10,0.55)",
                            }}
                        >
                            COMECE AGORA
                        </span>
                    </div>

                    {/* Headline */}
                    <h2
                        className="font-satoshi mb-6 max-w-3xl mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.8rem, 5.5vw, 3.75rem)",
                            lineHeight: 1.03,
                            letterSpacing: "-0.045em",
                            color: "#0A0A0A",
                        }}
                    >
                        Veja como sua agência pode parar de perder oportunidades{" "}
                        <span
                            style={{
                                fontWeight: 700,
                                background: "linear-gradient(135deg, #1556C0 0%, #2E78E0 45%, #1556C0 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            no WhatsApp.
                        </span>
                    </h2>

                    {/* Sub-copy */}
                    <p
                        className="mb-10 max-w-xl mx-auto"
                        style={{
                            color: "rgba(10,10,10,0.65)",
                            fontSize: "clamp(1rem, 1.8vw, 1.125rem)",
                            lineHeight: 1.65,
                        }}
                    >
                        Agende uma demonstração personalizada e veja o Vyzon aplicado ao seu fluxo comercial.
                    </p>

                    {/* CTA buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
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
                        className="mt-7"
                        style={{
                            color: "rgba(10,10,10,0.5)",
                            fontSize: "0.8125rem",
                            fontWeight: 500,
                        }}
                    >
                        Demo gratuita, personalizada para o contexto da sua agência.
                    </p>
                </div>
            </motion.div>
        </section>
    );
};
