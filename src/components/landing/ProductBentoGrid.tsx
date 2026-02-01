import { motion } from "framer-motion";
import { Trophy, Zap, MessageCircle, Crown, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
};

const staggerContainer = {
    initial: {},
    whileInView: {
        transition: {
            staggerChildren: 0.15
        }
    }
};

export const ProductBentoGrid = () => {
    return (
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
            {/* Background gradient accents */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    {...fadeInUp}
                    className="text-center mb-16"
                >
                    <Badge className="mb-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                        <Zap className="h-3 w-3 mr-1" />
                        Arsenal Completo
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ferramentas Que <span className="text-indigo-400">Vendem Por Você</span>
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Cada funcionalidade foi pensada para <strong className="text-white">eliminar fricção</strong> e <strong className="text-white">acelerar fechamentos</strong>.
                    </p>
                </motion.div>

                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="whileInView"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {/* Card 1: Gamification - Rank #1 Badge */}
                    <motion.div
                        variants={fadeInUp}
                        className="group"
                    >
                        <div className="h-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 hover:border-amber-500/30 hover:bg-white/[0.07] transition-all duration-300">
                            {/* Visual: Rank Badge with Gold Glow */}
                            <div className="relative mb-6 flex justify-center">
                                <motion.div
                                    className="relative"
                                    animate={{
                                        boxShadow: [
                                            "0 0 20px rgba(245, 158, 11, 0.3)",
                                            "0 0 40px rgba(245, 158, 11, 0.5)",
                                            "0 0 20px rgba(245, 158, 11, 0.3)"
                                        ]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    style={{ borderRadius: "9999px" }}
                                >
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex flex-col items-center justify-center shadow-xl shadow-amber-500/30">
                                        <Crown className="h-6 w-6 text-amber-900 mb-1" />
                                        <span className="text-2xl font-bold text-amber-900">#1</span>
                                    </div>
                                    {/* Floating stars */}
                                    <motion.div
                                        className="absolute -top-2 -right-2"
                                        animate={{ rotate: [0, 15, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
                                    </motion.div>
                                    <motion.div
                                        className="absolute -bottom-1 -left-2"
                                        animate={{ rotate: [0, -15, 0] }}
                                        transition={{ duration: 2.5, repeat: Infinity }}
                                    >
                                        <Star className="h-4 w-4 text-amber-300" fill="currentColor" />
                                    </motion.div>
                                </motion.div>
                                {/* Mini avatar */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-700 border-2 border-amber-500 overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                        CM
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-2 text-center">Gamificação Neural</h3>
                            <p className="text-gray-400 text-sm leading-relaxed text-center">
                                Rankings em tempo real, sons de level-up e feedback visual instantâneo. Vicie seu time em vender.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 2: Real Time - Toast Notification */}
                    <motion.div
                        variants={fadeInUp}
                        className="group"
                    >
                        <div className="h-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all duration-300">
                            {/* Visual: Animated Toast */}
                            <div className="relative mb-6 h-32 flex items-center justify-center">
                                <motion.div
                                    className="bg-slate-800/90 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-4 shadow-xl shadow-emerald-500/10"
                                    initial={{ x: 50, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">💰 Venda Aprovada</p>
                                            <p className="text-emerald-400 font-bold">+ R$ 297,00</p>
                                        </div>
                                    </div>
                                </motion.div>
                                {/* Pulse effect */}
                                <motion.div
                                    className="absolute inset-0 m-auto w-32 h-16 rounded-xl bg-emerald-500/20 blur-xl"
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-2 text-center">Vendas em Tempo Real</h3>
                            <p className="text-gray-400 text-sm leading-relaxed text-center">
                                Sincronização via Webhook em segundos. Integrado com Kiwify, Greenn e Hotmart.
                            </p>
                        </div>
                    </motion.div>

                    {/* Card 3: WhatsApp Sidebar */}
                    <motion.div
                        variants={fadeInUp}
                        className="group"
                    >
                        <div className="h-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 hover:border-green-500/30 hover:bg-white/[0.07] transition-all duration-300">
                            {/* Visual: WhatsApp + Sidebar Mockup */}
                            <div className="relative mb-6 h-32 flex items-center justify-center gap-2">
                                {/* Chat bubble */}
                                <div className="bg-slate-800 rounded-xl p-3 w-32 shadow-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                            <MessageCircle className="h-3 w-3 text-white" />
                                        </div>
                                        <span className="text-xs text-white/70">WhatsApp</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 bg-slate-700 rounded w-full" />
                                        <div className="h-2 bg-slate-700 rounded w-3/4" />
                                        <div className="h-2 bg-green-500/30 rounded w-5/6" />
                                    </div>
                                </div>

                                {/* Sidebar preview */}
                                <motion.div
                                    className="bg-indigo-600/90 rounded-lg p-2 w-20 shadow-xl"
                                    initial={{ x: 10, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="text-[8px] text-white/80 mb-1 font-medium">Game Sales</div>
                                    <div className="space-y-1">
                                        <div className="h-1.5 bg-white/30 rounded w-full" />
                                        <div className="h-1.5 bg-white/30 rounded w-2/3" />
                                        <div className="flex items-center gap-1 mt-2">
                                            <Trophy className="h-2 w-2 text-amber-300" />
                                            <span className="text-[6px] text-amber-300">#3</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-2 text-center">Venda Sem Sair do Zap</h3>
                            <p className="text-gray-400 text-sm leading-relaxed text-center">
                                Extensão Chrome integrada. Veja ranking e registre vendas direto no navegador.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
