import { motion } from "framer-motion";
import { Link2, BarChart3, Trophy, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────
interface Step {
    number: string;
    icon: LucideIcon;
    badge: string;
    title: string;
    description: string;
    bullets: readonly string[];
}

const STEPS: readonly Step[] = [
    {
        number: "01",
        icon: Link2,
        badge: "Conecte",
        title: "Integre sua plataforma",
        description:
            "Cola o webhook da Kiwify, Greenn ou Hotmart. As vendas começam a cair automaticamente em segundos.",
        bullets: ["Kiwify", "Greenn", "Hotmart"],
    },
    {
        number: "02",
        icon: BarChart3,
        badge: "Configure",
        title: "Monte o pipeline e as metas",
        description:
            "Monta as etapas do seu funil, define meta individual e do time. Convide os vendedores — cada um com o login dele.",
        bullets: ["Pipeline customizável", "Metas individuais", "Convite por email"],
    },
    {
        number: "03",
        icon: Trophy,
        badge: "Resultado",
        title: "Acompanhe e escale",
        description:
            "Painel ao vivo, ranking gamificado, funil de calls e WhatsApp integrado. Tudo pra escalar vendas sem ficar microgerenciando.",
        bullets: ["Painel em tempo real", "Ranking gamificado", "WhatsApp com IA"],
    },
];

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.15 },
    },
};

const cardVariants = {
    hidden: { y: 24 },
    visible: {
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

// ─── StepCard ─────────────────────────────────────────────────────────────────
function StepCard({ step }: { step: Step }) {
    const Icon = step.icon;

    return (
        <motion.div
            variants={cardVariants}
            className="group relative flex flex-col flex-1 rounded-2xl p-5 sm:p-8"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
        >
            {/* Step number + icon */}
            <div className="mb-6 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-emerald-400 transition-colors" style={{ background: "rgba(16,185,129,0.1)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.15)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span
                    className="font-heading text-emerald-400/40"
                    style={{
                        fontWeight: "var(--fw-bold)",
                        fontSize: "0.8125rem",
                        letterSpacing: "0.04em",
                    }}
                >
                    {step.number}
                </span>
            </div>

            {/* Badge */}
            <span
                className="mb-3 inline-flex w-fit rounded-full px-3 py-0.5 text-[11px] text-emerald-400"
                style={{ border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.1)", fontWeight: "var(--fw-semibold)", letterSpacing: "0.02em" }}
            >
                {step.badge}
            </span>

            {/* Title */}
            <h3
                className="font-heading mb-2"
                style={{
                    color: "rgba(255,255,255,0.95)",
                    fontWeight: "var(--fw-bold)",
                    fontSize: "1.125rem",
                    lineHeight: 1.1,
                    letterSpacing: "-0.04em",
                }}
            >
                {step.title}
            </h3>

            {/* Description */}
            <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {step.description}
            </p>

            {/* Bullets */}
            <ul className="mt-auto flex flex-wrap gap-2">
                {step.bullets.map((b) => (
                    <li
                        key={b}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs"
                        style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontWeight: "var(--fw-semibold)" }}
                    >
                        <span className="h-1 w-1 rounded-full bg-emerald-400 flex-shrink-0" />
                        {b}
                    </li>
                ))}
            </ul>
        </motion.div>
    );
}

// ─── HowItWorks ───────────────────────────────────────────────────────────────
export const HowItWorks = () => {
    return (
        <section
            id="how-it-works"
            className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#06080a" }}
        >
            {/* Green spotlight from top */}
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                }}
            />
            <div className="relative max-w-5xl mx-auto">

                {/* Section header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ y: 20 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: "var(--fw-semibold)",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            border: "1px solid rgba(16,185,129,0.2)",
                            background: "rgba(16,185,129,0.1)",
                        }}
                    >
                        Como funciona
                    </span>

                    <h2
                        className="font-heading mb-4"
                        style={{
                            color: "rgba(255,255,255,0.95)",
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                        }}
                    >
                        Do zero ao painel em{" "}
                        <span className="text-emerald-400">5 minutos</span>
                    </h2>

                    <p className="max-w-md mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.35)" }}>
                        Sem treinamento. Sem consultoria. Sem dor de cabeça.
                    </p>
                </motion.div>

                {/* Connector line (desktop only) */}
                <div className="hidden lg:block relative max-w-3xl mx-auto mb-[-1px]">
                    <div className="absolute top-1/2 left-[16.66%] right-[16.66%] h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Step cards */}
                <motion.div
                    className="grid gap-4 sm:gap-6 md:grid-cols-3"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                >
                    {STEPS.map((step) => (
                        <StepCard key={step.number} step={step} />
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    className="text-center mt-14"
                    initial={{ y: 12 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                >
                    <p
                        className="text-sm mb-3"
                        style={{ color: "rgba(255,255,255,0.35)", fontWeight: "var(--fw-semibold)" }}
                    >
                        Mais rápido que uma reunião de alinhamento.
                    </p>
                    <a
                        href="#pricing"
                        className="inline-flex items-center gap-2 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
                        style={{ fontWeight: "var(--fw-semibold)" }}
                    >
                        Começar agora
                        <ArrowRight className="h-4 w-4" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
};
