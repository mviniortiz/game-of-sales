import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link2, BarChart3, Trophy, ArrowRight } from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
    {
        number: "01",
        icon: Link2,
        iconColor: "text-emerald-600",
        ringColor: "border-emerald-500/40",
        glowColor: "rgba(16,185,129,0.15)",
        badge: "Conecte",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        title: "Integre sua plataforma",
        description:
            "Cole o webhook da Kiwify, Greenn ou Hotmart. As vendas começam a entrar automaticamente em segundos.",
        bullets: ["Kiwify", "Greenn", "Hotmart"],
        delay: 0,
    },
    {
        number: "02",
        icon: BarChart3,
        iconColor: "text-emerald-600",
        ringColor: "border-emerald-500/40",
        glowColor: "rgba(16,185,129,0.15)",
        badge: "Configure",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        title: "Monte seu pipeline e metas",
        description:
            "Crie os estágios do seu funil, defina metas individuais e do time. Convide seus vendedores — cada um com seu login.",
        bullets: ["Pipeline customizável", "Metas individuais", "Convite por email"],
        delay: 0.15,
    },
    {
        number: "03",
        icon: Trophy,
        iconColor: "text-amber-600",
        ringColor: "border-amber-500/40",
        glowColor: "rgba(245,158,11,0.15)",
        badge: "Resultado",
        badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        title: "Acompanhe e escale",
        description:
            "Dashboard ao vivo, ranking gamificado, funil de calls e WhatsApp integrado. Tudo que você precisa para escalar vendas sem microgerenciar.",
        bullets: ["Dashboard em tempo real", "Ranking gamificado", "WhatsApp IA"],
        delay: 0.3,
    },
] as const;

// ─── HowItWorks ───────────────────────────────────────────────────────────────
export const HowItWorks = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });
    const lineScaleY = useTransform(scrollYProgress, [0.1, 0.8], [0, 1]);

    return (
        <section
            ref={sectionRef}
            id="how-it-works"
            className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden"
        >
            {/* Background glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />

            <div className="max-w-5xl mx-auto relative z-10">

                {/* Section header */}
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="inline-block text-label text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "var(--ls-widest)" }}
                    >
                        COMO FUNCIONA
                    </span>

                    <h2 className="font-heading text-3xl sm:text-4xl text-gray-900 mb-4 tracking-tight font-bold">
                        Do zero ao dashboard em{" "}
                        <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                            5 minutos
                        </span>
                    </h2>

                    <p
                        className="text-body text-gray-400 max-w-xl mx-auto"
                        style={{ fontSize: "1.0625rem" }}
                    >
                        Sem treinamento. Sem consultoria. Sem dor de cabeça.
                    </p>
                </motion.div>

                {/* Timeline */}
                <div className="relative">

                    {/* Vertical connecting line — scroll-driven */}
                    <div className="absolute left-8 md:left-1/2 md:-translate-x-px top-8 bottom-8 w-px overflow-hidden">
                        <div className="absolute inset-0 bg-gray-100" />
                        <motion.div
                            className="absolute top-0 left-0 right-0 origin-top"
                            style={{
                                background:
                                    "linear-gradient(to bottom, #10b981, #10b981 70%, #f59e0b)",
                                scaleY: lineScaleY,
                                height: "100%",
                            }}
                        />
                    </div>

                    {STEPS.map((step, i) => {
                        const Icon = step.icon;
                        const isRight = i % 2 === 0; // alternates: left, right, left

                        return (
                            <motion.div
                                key={step.number}
                                className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 ${i < STEPS.length - 1 ? "mb-20" : ""
                                    }`}
                                initial={{ opacity: 0, y: 32 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{
                                    duration: 0.55,
                                    delay: step.delay,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                            >
                                {/* ── Card content: left side on desktop ── */}
                                <div
                                    className={`md:w-1/2 ${isRight
                                            ? "md:pr-14 md:text-right order-2 md:order-1"
                                            : "md:pl-14 md:text-left order-2 md:order-3"
                                        }`}
                                >
                                    {/* Card */}
                                    <motion.div
                                        className="relative p-6 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm"
                                        style={{
                                            boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px -20px rgba(0,0,0,0.4)`,
                                        }}
                                        whileHover={{
                                            boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 20px 40px -20px rgba(0,0,0,0.5), 0 0 60px -20px ${step.glowColor}`,
                                            y: -4,
                                        }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        {/* Subtle top glow line */}
                                        <div
                                            className="absolute top-0 left-6 right-6 h-px rounded-full"
                                            style={{
                                                background: `linear-gradient(90deg, transparent, ${step.iconColor === "text-amber-600"
                                                        ? "rgba(245,158,11,0.4)"
                                                        : "rgba(16,185,129,0.4)"
                                                    }, transparent)`,
                                            }}
                                        />

                                        {/* Badge */}
                                        <span
                                            className={`inline-block text-label text-[10px] border rounded-full px-2.5 py-0.5 mb-4 ${step.badgeColor}`}
                                        >
                                            {step.badge}
                                        </span>

                                        {/* Title */}
                                        <h3
                                            className="text-gray-900 mb-2"
                                            style={{
                                                fontWeight: "var(--fw-bold)",
                                                fontSize: "1.125rem",
                                                lineHeight: "var(--lh-snug)",
                                            }}
                                        >
                                            {step.title}
                                        </h3>

                                        {/* Description */}
                                        <p
                                            className="text-body text-gray-400 text-sm mb-4"
                                        >
                                            {step.description}
                                        </p>

                                        {/* Bullets */}
                                        <ul className={`flex flex-wrap gap-2 ${isRight ? "md:justify-end" : ""}`}>
                                            {step.bullets.map((b) => (
                                                <li
                                                    key={b}
                                                    className="flex items-center gap-1.5 text-xs text-gray-500"
                                                    style={{ fontWeight: "var(--fw-medium)" }}
                                                >
                                                    <span
                                                        className={`w-1 h-1 rounded-full flex-shrink-0 ${step.iconColor === "text-amber-600"
                                                                ? "bg-amber-400"
                                                                : "bg-emerald-400"
                                                            }`}
                                                    />
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                </div>

                                {/* ── Center node ── */}
                                <div className="relative z-10 order-1 md:order-2 flex-shrink-0">
                                    {/* Outer ring */}
                                    <motion.div
                                        className={`w-16 h-16 rounded-full border-2 ${step.ringColor} bg-white flex flex-col items-center justify-center shadow-xl`}
                                        whileInView={{
                                            boxShadow: [
                                                `0 0 0 0 ${step.glowColor}`,
                                                `0 0 30px 8px ${step.glowColor}`,
                                                `0 0 0 0 ${step.glowColor}`,
                                            ],
                                        }}
                                        transition={{
                                            delay: step.delay + 0.4,
                                            duration: 1.4,
                                            repeat: 0,
                                        }}
                                        viewport={{ once: true }}
                                    >
                                        <Icon
                                            className={`h-5 w-5 ${step.iconColor}`}
                                            strokeWidth={2}
                                        />
                                        <span
                                            className={`${step.iconColor} mt-0.5`}
                                            style={{
                                                fontWeight: "var(--fw-black)",
                                                fontSize: "0.6rem",
                                                letterSpacing: "0.05em",
                                                opacity: 0.6,
                                            }}
                                        >
                                            {step.number}
                                        </span>
                                    </motion.div>

                                    {/* Pulse ring on enter */}
                                    <motion.div
                                        className={`absolute inset-0 rounded-full border ${step.ringColor}`}
                                        initial={{ scale: 1, opacity: 0.6 }}
                                        whileInView={{ scale: 1.7, opacity: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: step.delay + 0.3, duration: 0.8 }}
                                    />
                                </div>

                                {/* ── Empty side for alternating layout ── */}
                                <div
                                    className={`hidden md:block md:w-1/2 ${isRight ? "order-3" : "order-1"
                                        }`}
                                />
                            </motion.div>
                        );
                    })}
                </div>

                {/* Bottom CTA nudge */}
                <motion.div
                    className="text-center mt-16"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                >
                    <p
                        className="text-gray-400 text-sm mb-3"
                        style={{ fontWeight: "var(--fw-light)" }}
                    >
                        Mais rápido que uma reunião de alinhamento
                    </p>
                    <motion.a
                        href="#pricing"
                        className="inline-flex items-center gap-2 text-emerald-600 text-sm hover:text-emerald-500 transition-colors"
                        style={{ fontWeight: "var(--fw-semibold)" }}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                    >
                        Começar agora
                        <ArrowRight className="h-4 w-4" />
                    </motion.a>
                </motion.div>
            </div>
        </section>
    );
};
