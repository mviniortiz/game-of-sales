import { motion } from "framer-motion";
import { Check, Rocket, Calendar } from "lucide-react";
import { LandingButton } from "./LandingButton";

interface FinalCTAProps {
    onCTAClick: () => void;
    onScheduleDemoClick?: () => void;
}

export const FinalCTA = ({ onCTAClick, onScheduleDemoClick }: FinalCTAProps) => {
    return (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "var(--vyz-bg)" }}>
            {/* Fine grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                }}
            />
            {/* Green aurora glow */}
            <div
                className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(0,227,122,0.12) 0%, transparent 70%)",
                }}
            />

            <motion.div
                className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden"
                initial={{ y: 32 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.3), 0 40px 80px -16px rgba(0,0,0,0.4)",
                }}
            >
                {/* Content */}
                <div className="relative z-10 py-12 sm:py-20 px-5 sm:px-8 md:px-16 text-center">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2 mb-7">
                        <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        />
                        <span
                            className="text-xs text-emerald-400"
                            style={{ fontWeight: 600, letterSpacing: "0.12em" }}
                        >
                            COMECE AGORA
                        </span>
                    </div>

                    {/* Headline */}
                    <h2
                        className="font-heading mb-6 max-w-3xl mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.4rem, 4.5vw, 3.25rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.045em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Seu time pode estar vendendo mais amanhã.
                    </h2>

                    {/* Sub-copy */}
                    <p
                        className="mb-10 max-w-xl mx-auto"
                        style={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", lineHeight: 1.7 }}
                    >
                        Configura em 5 minutos. Cancela quando quiser — sem multa e sem burocracia.
                    </p>

                    {/* CTA buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        <LandingButton
                            href="/onboarding?plan=pro"
                            onClick={(e) => { e.preventDefault(); onCTAClick(); }}
                            variant="primary"
                            size="lg"
                            icon={<Rocket className="h-4 w-4" />}
                            showArrow
                        >
                            Testar grátis por 14 dias
                        </LandingButton>

                        <LandingButton
                            href="#agendar-demo"
                            onClick={(e) => {
                                if (onScheduleDemoClick) {
                                    e.preventDefault();
                                    onScheduleDemoClick();
                                }
                            }}
                            variant="secondary"
                            size="lg"
                            icon={<Calendar className="h-4 w-4" />}
                        >
                            Agendar demonstração
                        </LandingButton>
                    </div>

                    {/* Trust signals */}
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-7">
                        {[
                            "14 dias grátis pra testar",
                            "Cancela quando quiser",
                            "Suporte humano no WhatsApp",
                        ].map((t) => (
                            <div
                                key={t}
                                className="flex items-center gap-1.5"
                                style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", fontWeight: 500 }}
                            >
                                <Check className="h-3 w-3 text-emerald-500/60" strokeWidth={2.5} />
                                {t}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </section>
    );
};
