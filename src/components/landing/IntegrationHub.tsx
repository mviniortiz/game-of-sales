import { motion, useAnimationFrame } from "framer-motion";
import {
    MessageCircle,
    Globe,
    Headphones,
    BarChart3,
    CreditCard,
} from "lucide-react";

import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.png";
import greennLogo from "@/assets/integrations/greenn.png";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.png";
import gameSalesLogo from "@/assets/logo-only.png";

interface ItemCardProps {
    item: {
        name: string;
        logo?: string;
        icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
        color?: string;
        hasLogo: boolean;
    };
    delay: number;
}

const ItemCard = ({ item, delay }: ItemCardProps) => {
    const Icon = item.icon;
    return (
        <motion.div
            className="px-3 sm:px-4 py-2.5 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center sm:justify-start gap-2 hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.3 }}
            whileHover={{ scale: 1.03, y: -2 }}
        >
            {item.hasLogo ? (
                <img src={item.logo} alt={item.name} className="w-5 h-5 object-contain" />
            ) : (
                Icon && <Icon className="w-4 h-4" style={{ color: item.color }} />
            )}
            <span className="text-sm font-medium text-gray-300">{item.name}</span>
        </motion.div>
    );
};

export const IntegrationHub = () => {
    const leftItems = [
        { name: "Kiwify", logo: kiwifyLogo, hasLogo: true },
        { name: "Greenn", logo: greennLogo, hasLogo: true },
    ];

    const rightItems = [
        { name: "Hotmart", logo: hotmartLogo, hasLogo: true },
        { name: "Stripe", icon: CreditCard, color: "#10b981", hasLogo: false },
        { name: "Website", icon: Globe, color: "#10b981", hasLogo: false },
    ];

    const bottomItems = [
        { name: "WhatsApp", icon: MessageCircle, color: "#25d366", hasLogo: false },
        { name: "Suporte", icon: Headphones, color: "#ec4899", hasLogo: false },
        { name: "Analytics", icon: BarChart3, color: "#06b6d4", hasLogo: false },
    ];

    return (
        <section className="py-20 sm:py-28 px-4 relative overflow-hidden bg-slate-950">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-serif">
                        A solução que{" "}
                        <span className="text-emerald-400">
                            unifica tudo
                        </span>
                    </h2>
                </motion.div>

                {/* Mobile layout */}
                <div className="md:hidden space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900 border border-white/10"
                                style={{ boxShadow: "0 0 20px rgba(16, 185, 129, 0.18)" }}
                            >
                                <img src={gameSalesLogo} alt="Game Sales" className="w-7 h-7 object-contain" />
                            </div>
                            <div className="text-left">
                                <p className="text-white text-sm font-semibold">Game Sales</p>
                                <p className="text-xs text-gray-400">Centraliza vendas, pagamentos e operação</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <p className="text-xs font-semibold text-emerald-400 mb-2">Vendas</p>
                            <div className="space-y-2">
                                {leftItems.map((item, i) => (
                                    <ItemCard key={item.name} item={item} delay={0.1 + i * 0.05} />
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-3">
                            <p className="text-xs font-semibold text-pink-400 mb-2">Pagamentos</p>
                            <div className="space-y-2">
                                {rightItems.map((item, i) => (
                                    <ItemCard key={item.name} item={item} delay={0.2 + i * 0.05} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                        <p className="text-xs font-semibold text-orange-400 mb-2 text-center">Operação</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {bottomItems.map((item, i) => (
                                <ItemCard key={item.name} item={item} delay={0.3 + i * 0.05} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop mind map */}
                <div className="relative hidden md:grid grid-cols-[1fr_auto_1fr] gap-x-8 items-center justify-items-center">

                    {/* === LEFT COLUMN === */}
                    <div className="flex flex-col items-end gap-4 relative">
                        {/* Branch label */}
                        <motion.span
                            className="absolute -right-12 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Vendas
                        </motion.span>

                        {leftItems.map((item, i) => (
                            <div key={item.name} className="relative">
                                {/* Line to card */}
                                <motion.div
                                    className="absolute right-full top-1/2 h-[2px] bg-gradient-to-r from-emerald-400 to-emerald-500"
                                    style={{ width: "60px", marginRight: "-4px" }}
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                                />
                                <ItemCard item={item} delay={0.5 + i * 0.1} />
                            </div>
                        ))}
                    </div>

                    {/* === CENTER HUB === */}
                    <div className="relative py-8">
                        {/* Main horizontal line going left */}
                        <motion.div
                            className="absolute right-full top-1/2 h-[2px] w-16 bg-gradient-to-r from-emerald-300 to-emerald-500"
                            style={{ marginRight: "12px" }}
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        />

                        {/* Main horizontal line going right */}
                        <motion.div
                            className="absolute left-full top-1/2 h-[2px] w-16 bg-gradient-to-l from-pink-300 to-pink-500"
                            style={{ marginLeft: "12px" }}
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        />

                        {/* Vertical line going down */}
                        <motion.div
                            className="absolute top-full left-1/2 -translate-x-1/2 w-[2px] h-24 bg-gradient-to-b from-orange-400 to-orange-500"
                            style={{ marginTop: "12px" }}
                            initial={{ scaleY: 0 }}
                            whileInView={{ scaleY: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        />

                        {/* Hub circles */}
                        <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", delay: 0.1 }}
                            className="relative"
                        >
                            <motion.div
                                className="absolute inset-[-16px] rounded-full border-2 border-emerald-500/30"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="absolute inset-[-28px] rounded-full border border-emerald-500/20" />
                            <div
                                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-slate-900 border border-white/10"
                                style={{ boxShadow: "0 0 30px rgba(16, 185, 129, 0.25)" }}
                            >
                                <img src={gameSalesLogo} alt="Game Sales" className="w-12 h-12 sm:w-14 sm:h-14 object-contain" />
                            </div>
                        </motion.div>
                    </div>

                    {/* === RIGHT COLUMN === */}
                    <div className="flex flex-col items-start gap-4 relative">
                        {/* Branch label */}
                        <motion.span
                            className="absolute -left-16 top-1/2 -translate-y-1/2 text-xs font-semibold text-pink-500"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Pagamentos
                        </motion.span>

                        {rightItems.map((item, i) => (
                            <div key={item.name} className="relative">
                                {/* Line to card */}
                                <motion.div
                                    className="absolute left-full top-1/2 h-[2px] bg-gradient-to-l from-pink-400 to-pink-500"
                                    style={{ width: "60px", marginLeft: "-4px", right: "100%" }}
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                                />
                                <ItemCard item={item} delay={0.5 + i * 0.1} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* === BOTTOM SECTION === */}
                <div className="relative mt-20 flex flex-col items-center">
                    {/* Branch label */}
                    <motion.span
                        className="text-xs font-semibold text-orange-500 mb-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                    >
                        Operação
                    </motion.span>

                    {/* Horizontal spreading lines */}
                    <div className="relative w-full max-w-lg mb-4">
                        <svg className="w-full h-8" viewBox="0 0 400 32" preserveAspectRatio="xMidYMid meet">
                            {/* Center vertical stub coming from above */}
                            <motion.line
                                x1="200" y1="0" x2="200" y2="16"
                                stroke="#f97316"
                                strokeWidth="2"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4, duration: 0.3 }}
                            />
                            {/* Curved branches */}
                            <motion.path
                                d="M 200 16 Q 120 16 80 32"
                                stroke="#f97316"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                            />
                            <motion.path
                                d="M 200 16 Q 200 24 200 32"
                                stroke="#f97316"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.55, duration: 0.4 }}
                            />
                            <motion.path
                                d="M 200 16 Q 280 16 320 32"
                                stroke="#f97316"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                whileInView={{ pathLength: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.6, duration: 0.4 }}
                            />
                        </svg>
                    </div>

                    {/* Bottom cards row */}
                    <div className="flex gap-4 justify-center flex-wrap">
                        {bottomItems.map((item, i) => (
                            <ItemCard key={item.name} item={item} delay={0.7 + i * 0.1} />
                        ))}
                    </div>
                </div>

                {/* Footer text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1 }}
                    className="text-center mt-12 text-gray-500 text-sm"
                >
                    Vendas integradas automaticamente • Zero trabalho manual
                </motion.p>
            </div>
        </section>
    );
};

export default IntegrationHub;
