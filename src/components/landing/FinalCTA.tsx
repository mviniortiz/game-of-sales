import { motion } from "framer-motion";
import { ArrowRight, Check, Zap, Calendar } from "lucide-react";

interface FinalCTAProps {
    onCTAClick: () => void;
    onScheduleDemoClick?: () => void;
}

export const FinalCTA = ({ onCTAClick, onScheduleDemoClick }: FinalCTAProps) => {
    return (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "#06080a" }}>
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

            <motion.div
                className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
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
                            fontWeight: 800,
                            fontSize: "clamp(1.6rem, 5vw, 3.25rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.045em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Seu time pode tá vendendo mais amanhã.
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
                        {/* Primary CTA */}
                        <motion.button
                            onClick={onCTAClick}
                            className="relative overflow-hidden flex items-center gap-2.5 px-6 sm:px-8 py-4 rounded-xl text-white group w-full sm:w-auto justify-center"
                            style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 4px 24px rgba(16,185,129,0.35), 0 16px 48px -8px rgba(16,185,129,0.2)",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                            }}
                            whileHover={{ scale: 1.03, boxShadow: "0 0 0 1px rgba(16,185,129,0.4), 0 8px 32px rgba(16,185,129,0.5), 0 24px 56px -8px rgba(16,185,129,0.3)" }}
                            whileTap={{ scale: 0.97 }}
                        >
                            {/* Shimmer */}
                            <motion.span
                                className="absolute inset-0 rounded-xl"
                                style={{
                                    background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)",
                                }}
                                animate={{ x: ["-120%", "220%"] }}
                                transition={{
                                    duration: 2.2,
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                    ease: "easeInOut",
                                }}
                            />
                            <Zap className="relative h-4 w-4" fill="currentColor" />
                            <span className="relative">Testar grátis por 14 dias</span>
                            <ArrowRight className="relative h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </motion.button>

                        {/* Secondary — schedule demo */}
                        <a
                            href="#agendar-demo"
                            className="flex items-center gap-2 px-6 py-4 rounded-xl text-sm transition-all duration-200 w-full sm:w-auto justify-center"
                            style={{
                                color: "rgba(16,185,129,0.8)",
                                background: "rgba(16,185,129,0.06)",
                                boxShadow: "0 0 0 1px rgba(16,185,129,0.15)",
                                fontWeight: 600,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(16,185,129,1)";
                                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 1px rgba(16,185,129,0.35)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(16,185,129,0.8)";
                                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 1px rgba(16,185,129,0.15)";
                            }}
                            onClick={(e) => {
                                if (onScheduleDemoClick) {
                                    e.preventDefault();
                                    onScheduleDemoClick();
                                }
                            }}
                        >
                            <Calendar className="h-4 w-4" />
                            Agendar demonstração
                        </a>
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
