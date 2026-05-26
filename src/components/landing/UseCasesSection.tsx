import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart3,
    Users,
    Building2,
    Check,
    Workflow,
    Clock,
    Target,
    MessageCircle,
    Calendar,
    Sparkle,
    Brain,
    LineChart,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// F2.10 (2026-05-19) — UseCasesSection redesenhada.
// 3 personas (Gestor / Vendedor / Agência) com cards premium + mock CSS por
// tab. Foco no novo posicionamento de agência. SEM image generation —
// mocks são 100% HTML/CSS.
// ─────────────────────────────────────────────────────────────────────────────

type IconCmp = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface Case {
    icon: IconCmp;
    tag: string;
    title: string;
    description: string;
    cards: { icon: IconCmp; label: string }[];
}

const CASES: readonly Case[] = [
    {
        icon: BarChart3,
        tag: "Gestor",
        title: "Visibilidade sem cobrar no grupo.",
        description:
            "Veja prioridades, oportunidades paradas, gaps de contexto e performance comercial sem cobrar no grupo.",
        cards: [
            { icon: Workflow, label: "Prioridades do dia" },
            { icon: Clock, label: "Oportunidades paradas" },
            { icon: Target, label: "Performance comercial" },
        ],
    },
    {
        icon: Users,
        tag: "Vendedor",
        title: "Próximo passo claro em cada conversa.",
        description:
            "Abra a conversa certa, veja o resumo da EVA e saiba o próximo passo antes de responder.",
        cards: [
            { icon: Sparkle, label: "Resumo da EVA" },
            { icon: MessageCircle, label: "Conversa certa" },
            { icon: Calendar, label: "Próximo passo" },
        ],
    },
    {
        icon: Building2,
        tag: "Agência",
        title: "Conversa vira pipeline acompanhado.",
        description:
            "Padronize atendimento, reduza lead perdido e transforme conversa em pipeline acompanhado.",
        cards: [
            { icon: BarChart3, label: "Central de Comando" },
            { icon: Brain, label: "Memória Comercial" },
            { icon: LineChart, label: "Pipeline acompanhado" },
        ],
    },
] as const;

// ─── UseCasesSection ─────────────────────────────────────────────────────────
export const UseCasesSection = () => {
    const [active, setActive] = useState(0);

    return (
        <section
            className="relative py-28 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#F8FAFC" }}
        >
            {/* Glow azul no topo */}
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(37,99,235,0.07) 0%, transparent 70%)",
                }}
                aria-hidden
            />
            <div className="relative max-w-5xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-12 sm:mb-14"
                    initial={{ y: 20 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span
                        className="inline-flex items-center text-[10.5px] sm:text-[11px] uppercase rounded-full px-3 py-1 mb-5"
                        style={{
                            background: "rgba(37,99,235,0.08)",
                            border: "1px solid rgba(37,99,235,0.22)",
                            color: "#1D4ED8",
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                        }}
                    >
                        Para quem é
                    </span>
                    <h2
                        className="font-satoshi mb-4 mx-auto"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.85rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "#0B1220",
                            maxWidth: "720px",
                        }}
                    >
                        Cada pessoa enxerga{" "}
                        <span style={{ color: "#1D4ED8" }}>o que precisa fazer.</span>
                    </h2>
                    <p
                        className="max-w-xl mx-auto text-[15px] sm:text-[16px]"
                        style={{ color: "rgba(10,10,10,0.55)", lineHeight: 1.55 }}
                    >
                        O gestor vê gargalos. O vendedor vê próximos passos. A agência
                        ganha previsibilidade.
                    </p>
                </motion.div>

                {/* Tab selector */}
                <div className="flex justify-center mb-10 sm:mb-12 px-2">
                    <div
                        className="inline-flex gap-1 p-1 rounded-xl"
                        style={{
                            background: "#FFFFFF",
                            border: "1px solid #D9E2EC",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                        }}
                    >
                        {CASES.map((c, i) => {
                            const Icon = c.icon;
                            const isActive = active === i;
                            return (
                                <button
                                    key={c.tag}
                                    type="button"
                                    onClick={() => setActive(i)}
                                    className="relative flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-[13px] sm:text-[14px] whitespace-nowrap transition-colors"
                                    style={{
                                        fontWeight: 600,
                                        color: isActive ? "#FFFFFF" : "#475569",
                                    }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="usecase-pill"
                                            className="absolute inset-0 rounded-lg"
                                            style={{
                                                background:
                                                    "linear-gradient(135deg, #2563EB, #4A8CE8)",
                                                boxShadow:
                                                    "0 4px 12px -2px rgba(37,99,235,0.35)",
                                            }}
                                            transition={{
                                                type: "spring",
                                                bounce: 0.2,
                                                duration: 0.4,
                                            }}
                                        />
                                    )}
                                    <Icon
                                        className="relative h-3.5 w-3.5 sm:h-4 sm:w-4"
                                        strokeWidth={2.1}
                                    />
                                    <span className="relative">{c.tag}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {CASES.map((c, i) => {
                        if (i !== active) return null;
                        return (
                            <motion.div
                                key={c.tag}
                                className="max-w-3xl mx-auto"
                                initial={{ y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -12, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h3
                                    className="font-satoshi text-center mb-4"
                                    style={{
                                        fontWeight: 700,
                                        fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)",
                                        lineHeight: 1.18,
                                        letterSpacing: "-0.028em",
                                        color: "#0B1220",
                                    }}
                                >
                                    {c.title}
                                </h3>
                                <p
                                    className="text-center mb-9 leading-relaxed mx-auto max-w-lg text-[15px]"
                                    style={{ color: "rgba(10,10,10,0.55)" }}
                                >
                                    {c.description}
                                </p>

                                <ul className="grid sm:grid-cols-3 gap-4">
                                    {c.cards.map(({ icon: CardIcon, label }) => (
                                        <li
                                            key={label}
                                            className="rounded-2xl p-5 bg-white hover-lift"
                                            style={{
                                                border: "1px solid #D9E2EC",
                                                boxShadow:
                                                    "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
                                            }}
                                        >
                                            <div
                                                className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                                                style={{
                                                    background: "rgba(37,99,235,0.08)",
                                                    border: "1px solid rgba(37,99,235,0.16)",
                                                }}
                                            >
                                                <CardIcon
                                                    className="h-4.5 w-4.5 text-[#2563EB]"
                                                    strokeWidth={2.1}
                                                />
                                            </div>
                                            <p
                                                className="text-[14px] sm:text-[14.5px]"
                                                style={{
                                                    fontWeight: 600,
                                                    color: "#0B1220",
                                                    letterSpacing: "-0.01em",
                                                }}
                                            >
                                                {label}
                                            </p>
                                            <div
                                                className="mt-2.5 flex items-center gap-1.5 text-[11.5px]"
                                                style={{ color: "#059669", fontWeight: 600 }}
                                            >
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                                Disponível
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default UseCasesSection;
