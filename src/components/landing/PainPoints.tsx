import { motion } from "framer-motion";
import { AlertTriangle, Clock, TrendingDown, ArrowDown } from "lucide-react";

const painPoints = [
    {
        icon: Clock,
        title: "Horas em planilhas",
        description: "Todo dia você perde tempo atualizando Excel. E ainda erra."
    },
    {
        icon: TrendingDown,
        title: "Time desmotivado",
        description: "Sem visibilidade das metas, ninguém sabe se está ganhando ou perdendo."
    },
    {
        icon: AlertTriangle,
        title: "Cobrança manual",
        description: "Você precisa lembrar todo mundo das metas. Todo. Santo. Dia."
    }
];

export const PainPoints = () => {
    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-950">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <p className="text-red-400/80 text-sm font-medium uppercase tracking-wider mb-3">
                        Isso parece familiar?
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-serif">
                        Gestão de vendas não deveria ser assim
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {painPoints.map((pain, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.5 }}
                            whileHover={{
                                scale: 1.03,
                                rotateX: 2,
                                rotateY: -2,
                                boxShadow: "0 0 30px rgba(239, 68, 68, 0.15)",
                            }}
                            className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-colors cursor-default"
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            <motion.div
                                className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"
                                whileHover={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 0.5 }}
                            >
                                <pain.icon className="h-6 w-6 text-red-400" />
                            </motion.div>
                            <h3 className="text-lg font-semibold text-white mb-2">{pain.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{pain.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Transition to solution - Visual Bridge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-16 flex flex-col items-center"
                >
                    {/* Animated arrow */}
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="mb-6"
                    >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-b from-red-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                            <ArrowDown className="h-5 w-5 text-white/60" />
                        </div>
                    </motion.div>

                    {/* Transition text */}
                    <div className="text-center max-w-md">
                        <p className="text-xl text-white font-medium mb-2 font-serif">
                            Existe uma forma <span className="text-emerald-400">melhor</span>.
                        </p>
                        <p className="text-gray-400 text-sm">
                            Um sistema que resolve esses 3 problemas em menos de 5 minutos.
                        </p>
                    </div>

                    {/* Visual gradient line to next section */}
                    <div className="mt-8 w-px h-16 bg-gradient-to-b from-emerald-500/50 to-transparent" />
                </motion.div>
            </div>
        </section>
    );
};
