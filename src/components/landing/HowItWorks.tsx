import { motion } from "framer-motion";
import { Trophy, Check, ArrowRight, MoveRight } from "lucide-react";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
};

export const HowItWorks = () => {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    {...fadeInUp}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        3 Passos Para <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Dominar</span>
                    </h2>
                    <p className="text-lg text-gray-400">
                        De zero a vendedor campeão em minutos.
                    </p>
                </motion.div>

                {/* Vertical Timeline */}
                <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute left-8 md:left-1/2 md:-translate-x-0.5 top-0 h-full w-0.5 bg-gradient-to-b from-indigo-500 via-emerald-500 to-amber-500 opacity-30" />

                    {/* Step 1: Conecte - Toggle Switch */}
                    <motion.div
                        {...fadeInUp}
                        className="relative flex flex-col md:flex-row items-start md:items-center gap-6 mb-16"
                    >
                        {/* Left content (on md+) */}
                        <div className="md:w-1/2 md:text-right md:pr-12 order-2 md:order-1">
                            <h3 className="text-xl font-semibold text-white mb-2">Conecte</h3>
                            <p className="text-gray-400">
                                Integre Kiwify, Greenn ou Hotmart em segundos. Basta copiar o webhook.
                            </p>
                        </div>

                        {/* Center icon/animation */}
                        <div className="relative z-10 order-1 md:order-2">
                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                                {/* Toggle Switch Animation */}
                                <div className="relative w-10 h-5 bg-slate-700 rounded-full p-0.5">
                                    <motion.div
                                        className="w-4 h-4 rounded-full"
                                        initial={{ x: 0, backgroundColor: "#64748b" }}
                                        whileInView={{ x: 20, backgroundColor: "#22c55e" }}
                                        transition={{ delay: 0.5, duration: 0.3, type: "spring" }}
                                        viewport={{ once: true }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full"
                                        initial={{ backgroundColor: "transparent" }}
                                        whileInView={{ backgroundColor: "rgba(34, 197, 94, 0.3)" }}
                                        transition={{ delay: 0.5, duration: 0.3 }}
                                        viewport={{ once: true }}
                                    />
                                </div>
                            </div>
                            {/* Pulse ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-indigo-500"
                                initial={{ scale: 1, opacity: 0.5 }}
                                whileInView={{ scale: 1.5, opacity: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                viewport={{ once: true }}
                            />
                        </div>

                        {/* Right content (placeholder on md+) */}
                        <div className="md:w-1/2 md:pl-12 hidden md:block order-3" />
                    </motion.div>

                    {/* Step 2: Venda - Kanban Card Moving */}
                    <motion.div
                        {...fadeInUp}
                        transition={{ delay: 0.1 }}
                        className="relative flex flex-col md:flex-row items-start md:items-center gap-6 mb-16"
                    >
                        {/* Left placeholder */}
                        <div className="md:w-1/2 md:pr-12 hidden md:block order-1" />

                        {/* Center icon/animation */}
                        <div className="relative z-10 order-1 md:order-2">
                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 overflow-hidden">
                                {/* Mini Kanban Card */}
                                <div className="relative w-10 h-8">
                                    {/* Card container */}
                                    <motion.div
                                        className="absolute top-1 left-0 w-4 h-6 bg-slate-600 rounded-sm flex items-center justify-center"
                                        initial={{ x: 0 }}
                                        whileInView={{ x: 24 }}
                                        transition={{ delay: 0.8, duration: 0.5, type: "spring" }}
                                        viewport={{ once: true }}
                                    >
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                                    </motion.div>
                                    {/* Arrow indicator */}
                                    <motion.div
                                        className="absolute top-2.5 left-5"
                                        initial={{ opacity: 1 }}
                                        whileInView={{ opacity: 0 }}
                                        transition={{ delay: 1.2, duration: 0.2 }}
                                        viewport={{ once: true }}
                                    >
                                        <MoveRight className="h-3 w-3 text-emerald-400" />
                                    </motion.div>
                                </div>
                            </div>
                        </div>

                        {/* Right content */}
                        <div className="md:w-1/2 md:text-left md:pl-12 order-2 md:order-3">
                            <h3 className="text-xl font-semibold text-white mb-2">Venda</h3>
                            <p className="text-gray-400">
                                Cada venda aprovada atualiza o ranking automaticamente. Zero trabalho manual.
                            </p>
                        </div>
                    </motion.div>

                    {/* Step 3: Comemore - Trophy Unlocking */}
                    <motion.div
                        {...fadeInUp}
                        transition={{ delay: 0.2 }}
                        className="relative flex flex-col md:flex-row items-start md:items-center gap-6"
                    >
                        {/* Left content */}
                        <div className="md:w-1/2 md:text-right md:pr-12 order-2 md:order-1">
                            <h3 className="text-xl font-semibold text-white mb-2">Comemore</h3>
                            <p className="text-gray-400">
                                Conquistas desbloqueadas, ranking atualizado e seu time motivado.
                            </p>
                        </div>

                        {/* Center icon/animation */}
                        <div className="relative z-10 order-1 md:order-2">
                            <motion.div
                                className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/20"
                                whileInView={{
                                    boxShadow: [
                                        "0 10px 40px -15px rgba(245, 158, 11, 0.2)",
                                        "0 10px 60px -15px rgba(245, 158, 11, 0.5)",
                                        "0 10px 40px -15px rgba(245, 158, 11, 0.2)"
                                    ]
                                }}
                                transition={{ delay: 1, duration: 1.5, repeat: 2 }}
                                viewport={{ once: true }}
                            >
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 1, duration: 0.3, type: "spring" }}
                                    viewport={{ once: true }}
                                >
                                    <Trophy className="h-6 w-6 text-amber-400" />
                                </motion.div>
                            </motion.div>

                            {/* Particle bursts */}
                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1.5 h-1.5 bg-amber-400 rounded-full"
                                    style={{
                                        top: "50%",
                                        left: "50%",
                                        marginTop: "-3px",
                                        marginLeft: "-3px",
                                    }}
                                    initial={{
                                        x: 0,
                                        y: 0,
                                        opacity: 0,
                                        scale: 0
                                    }}
                                    whileInView={{
                                        x: Math.cos(angle * Math.PI / 180) * 35,
                                        y: Math.sin(angle * Math.PI / 180) * 35,
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0]
                                    }}
                                    transition={{
                                        delay: 1.1 + i * 0.02,
                                        duration: 0.6,
                                        ease: "easeOut"
                                    }}
                                    viewport={{ once: true }}
                                />
                            ))}
                        </div>

                        {/* Right placeholder */}
                        <div className="md:w-1/2 md:pl-12 hidden md:block order-3" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
