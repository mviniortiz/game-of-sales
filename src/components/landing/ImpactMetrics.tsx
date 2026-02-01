import { motion } from "framer-motion";

const metrics = [
    {
        label: "Aumento Médio de Vendas",
        value: "+27%",
        color: "text-indigo-400"
    },
    {
        label: "Tempo Gasto em Planilhas",
        value: "ZERO",
        color: "text-white"
    },
    {
        label: "Setup e Integração",
        value: "< 5 min",
        color: "text-amber-400"
    }
];

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
                    {metrics.map((metric, index) => (
                        <motion.div
                            key={index}
                            className="text-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                        >
                            <div className={`text-4xl sm:text-5xl font-bold ${metric.color} mb-2`}>
                                {metric.value}
                            </div>
                            <div className="text-sm text-gray-400 uppercase tracking-wide">
                                {metric.label}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
