import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

export const ImpactMetrics = () => {
    return (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900/50 border-y border-white/5">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Metric 1: Trophy */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0, duration: 0.5, type: "spring", bounce: 0.3 }}
                    >
                        <motion.div
                            className="text-4xl sm:text-5xl font-bold text-amber-400 mb-2"
                            animate={{ rotate: [0, -5, 5, -5, 0] }}
                            transition={{ delay: 1, duration: 0.6, ease: "easeInOut" }}
                        >
                            🏆
                        </motion.div>
                        <div className="text-sm text-gray-400 uppercase tracking-wide">
                            Mais motivação
                        </div>
                    </motion.div>

                    {/* Metric 2: ZERO */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.15, duration: 0.5, type: "spring", bounce: 0.3 }}
                    >
                        <div className="text-4xl sm:text-5xl font-bold text-white mb-2 font-serif">
                            ZERO
                        </div>
                        <div className="text-sm text-gray-400 uppercase tracking-wide">
                            Tempo gasto em planilhas
                        </div>
                    </motion.div>

                    {/* Metric 3: < 5 min (animated counter) */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.5, type: "spring", bounce: 0.3 }}
                    >
                        <div className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2">
                            {"< "}
                            <AnimatedCounter
                                target={5}
                                duration={1.2}
                                className="inline"
                            />
                            {" min"}
                        </div>
                        <div className="text-sm text-gray-400 uppercase tracking-wide">
                            Setup e integração
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
