import { motion } from "framer-motion";
import { ArrowRight, Check, Zap } from "lucide-react";

interface FinalCTAProps {
    onCTAClick: () => void;
}

export const FinalCTA = ({ onCTAClick }: FinalCTAProps) => {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
            {/* Deep ambient glow behind the card */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                }}
            />

            <motion.div
                className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background:
                        "linear-gradient(145deg, #0a1628 0%, #0d1f1a 40%, #071a14 100%)",
                    border: "1px solid rgba(16,185,129,0.18)",
                    boxShadow:
                        "0 0 0 1px rgba(16,185,129,0.06), 0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(16,185,129,0.06) inset",
                }}
            >
                {/* Decorative top-edge gradient line */}
                <div
                    className="absolute top-0 inset-x-0 h-px"
                    style={{
                        background:
                            "linear-gradient(90deg, transparent, rgba(16,185,129,0.5) 30%, rgba(20,184,166,0.4) 70%, transparent)",
                    }}
                />

                {/* Floating orb — top right */}
                <motion.div
                    className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Floating orb — bottom left */}
                <motion.div
                    className="absolute -bottom-24 -left-16 w-80 h-60 rounded-full pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
                        filter: "blur(50px)",
                    }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />

                {/* Content */}
                <div className="relative z-10 py-12 sm:py-20 px-5 sm:px-8 md:px-16 text-center">
                    {/* Eyebrow */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 mb-7"
                    >
                        <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        />
                        <span
                            className="text-xs text-emerald-400"
                            style={{ fontWeight: 600, letterSpacing: "0.12em" }}
                        >
                            COMECE AGORA
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h2
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.18, duration: 0.5 }}
                        className="text-white mb-6 max-w-3xl mx-auto"
                        style={{
                            fontWeight: 800,
                            fontSize: "clamp(1.6rem, 5vw, 3rem)",
                            lineHeight: 1.15,
                            letterSpacing: "-0.03em",
                        }}
                    >
                        Enquanto você lê isso,{" "}
                        <span
                            style={{
                                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            seu concorrente
                        </span>{" "}
                        já montou o ranking dele.
                    </motion.h2>

                    {/* Sub-copy */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.28 }}
                        className="mb-10 max-w-xl mx-auto"
                        style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", lineHeight: 1.7 }}
                    >
                        Configure em menos de 5 minutos. Seu time começa a competir hoje.
                    </motion.p>

                    {/* CTA buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.36 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
                    >
                        {/* Primary CTA */}
                        <motion.button
                            onClick={onCTAClick}
                            className="relative overflow-hidden flex items-center gap-2.5 px-6 sm:px-8 py-4 rounded-xl text-white group w-full sm:w-auto justify-center"
                            style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                boxShadow: "0 4px 24px rgba(16,185,129,0.35), 0 1px 4px rgba(0,0,0,0.3)",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                            }}
                            whileHover={{ scale: 1.03, boxShadow: "0 8px 32px rgba(16,185,129,0.45)" }}
                            whileTap={{ scale: 0.97 }}
                        >
                            {/* Shimmer */}
                            <motion.span
                                className="absolute inset-0 rounded-xl"
                                style={{
                                    background:
                                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)",
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
                            <span className="relative">Criar meu ranking agora</span>
                            <ArrowRight className="relative h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </motion.button>

                        {/* Secondary — scroll to pricing */}
                        <a
                            href="#pricing"
                            className="flex items-center gap-2 px-6 py-4 rounded-xl text-sm transition-all duration-200 w-full sm:w-auto justify-center"
                            style={{
                                color: "rgba(255,255,255,0.4)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                background: "rgba(255,255,255,0.03)",
                                fontWeight: 600,
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)";
                                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.14)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)";
                                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)";
                            }}
                        >
                            Ver planos e preços
                        </a>
                    </motion.div>

                    {/* Trust signals */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-7"
                    >
                        {[
                            "Setup em 5 minutos",
                            "Cancele quando quiser",
                            "Suporte via WhatsApp",
                        ].map((t) => (
                            <div
                                key={t}
                                className="flex items-center gap-1.5"
                                style={{ color: "rgba(255,255,255,0.22)", fontSize: "0.75rem", fontWeight: 500 }}
                            >
                                <Check className="h-3 w-3 text-emerald-500/50" strokeWidth={2.5} />
                                {t}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};
