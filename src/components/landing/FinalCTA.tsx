import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface FinalCTAProps {
    onCTAClick: () => void;
}

export const FinalCTA = ({ onCTAClick }: FinalCTAProps) => {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
            <motion.div
                className="relative overflow-hidden rounded-3xl bg-indigo-950 border border-indigo-500/30 mx-auto max-w-6xl py-16 px-6 text-center isolate"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                {/* Background glow */}
                <div className="absolute w-[500px] h-[300px] bg-indigo-500/30 blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" />

                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                    Sua equipe ainda <span className="text-amber-400">não</span> está jogando no{" "}
                    <span className="text-indigo-400">modo fácil</span>?
                </h2>

                <p className="text-lg text-indigo-200 mb-8 max-w-2xl mx-auto">
                    Pare de deixar dinheiro na mesa. O Game Sales se paga na primeira venda recuperada.
                </p>

                <motion.button
                    className="relative overflow-hidden bg-white text-indigo-900 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl text-lg shadow-xl inline-flex items-center gap-2 group"
                    onClick={onCTAClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{
                        boxShadow: [
                            "0 0 20px rgba(99, 102, 241, 0.3)",
                            "0 0 40px rgba(99, 102, 241, 0.5)",
                            "0 0 20px rgba(99, 102, 241, 0.3)",
                        ],
                    }}
                    transition={{
                        boxShadow: {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        },
                        scale: { duration: 0.2 },
                    }}
                >
                    {/* Shimmer effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: "easeInOut",
                        }}
                    />
                    <span className="relative z-10">Começar Teste Grátis</span>
                    <ArrowRight className="relative z-10 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </motion.div>
        </section>
    );
};
