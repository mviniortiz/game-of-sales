import { motion } from "framer-motion";
import {
    Check,
    X,
    Minus,
    Clock,
    DollarSign,
    Link2,
    Trophy,
    MessageCircle,
    Bot,
    HeartHandshake,
    Target,
    ArrowRight,
    Scale,
    PiggyBank,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FAVICON = {
    pipedrive: "https://www.google.com/s2/favicons?domain=pipedrive.com&sz=64",
    hubspot: "https://www.google.com/s2/favicons?domain=hubspot.com&sz=64",
};

type Level = "yes" | "no" | "partial";

interface Cell {
    level: Level;
    text: string;
}

interface Row {
    icon: LucideIcon;
    feature: string;
    vyzon: Cell;
    pipedrive: Cell;
    hubspot: Cell;
}

const ROWS: readonly Row[] = [
    {
        icon: Clock,
        feature: "Setup em produção",
        vyzon: { level: "yes", text: "5 minutos" },
        pipedrive: { level: "partial", text: "1 – 3 dias" },
        hubspot: { level: "no", text: "1 – 4 semanas" },
    },
    {
        icon: DollarSign,
        feature: "Plano inicial (BR)",
        vyzon: { level: "yes", text: "R$ 147 / mês" },
        pipedrive: { level: "partial", text: "US$ 14+/usuário*" },
        hubspot: { level: "partial", text: "Grátis (Pro US$ 20+)*" },
    },
    {
        icon: Link2,
        feature: "Integrações BR nativas",
        vyzon: { level: "yes", text: "Hotmart, Kiwify, MP e +12" },
        pipedrive: { level: "partial", text: "Via Zapier" },
        hubspot: { level: "partial", text: "Via Zapier" },
    },
    {
        icon: Trophy,
        feature: "Ranking e gamificação",
        vyzon: { level: "yes", text: "Nativo, sem add-on" },
        pipedrive: { level: "partial", text: "Leaderboard básico" },
        hubspot: { level: "partial", text: "Só no Sales Pro+" },
    },
    {
        icon: MessageCircle,
        feature: "WhatsApp integrado",
        vyzon: { level: "yes", text: "Nativo + copiloto" },
        pipedrive: { level: "partial", text: "Integração paga" },
        hubspot: { level: "partial", text: "Integração paga" },
    },
    {
        icon: Bot,
        feature: "IA de vendas na conversa",
        vyzon: { level: "yes", text: "Copiloto em tempo real" },
        pipedrive: { level: "partial", text: "AI Assistant (sem WA)" },
        hubspot: { level: "partial", text: "Breeze por créditos" },
    },
    {
        icon: HeartHandshake,
        feature: "Suporte em português",
        vyzon: { level: "yes", text: "WhatsApp humano" },
        pipedrive: { level: "partial", text: "Inglês, fuso EUA/EU" },
        hubspot: { level: "partial", text: "Inglês, fuso EUA" },
    },
    {
        icon: Target,
        feature: "Feito pra time comercial BR",
        vyzon: { level: "yes", text: "Foco total" },
        pipedrive: { level: "no", text: "Produto global" },
        hubspot: { level: "no", text: "Produto global" },
    },
];

const LevelIcon = ({ level, size = 14 }: { level: Level; size?: number }) => {
    if (level === "yes") {
        return (
            <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{
                    width: size + 6,
                    height: size + 6,
                    background: "rgba(0,227,122,0.15)",
                    border: "1px solid rgba(0,227,122,0.3)",
                }}
            >
                <Check style={{ width: size - 2, height: size - 2, color: "#33FF9E" }} strokeWidth={3} />
            </span>
        );
    }
    if (level === "partial") {
        return (
            <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{
                    width: size + 6,
                    height: size + 6,
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.22)",
                }}
            >
                <Minus style={{ width: size - 2, height: size - 2, color: "#fbbf24" }} strokeWidth={3} />
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center justify-center rounded-full shrink-0"
            style={{
                width: size + 6,
                height: size + 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
            }}
        >
            <X style={{ width: size - 2, height: size - 2, color: "rgba(255,255,255,0.35)" }} strokeWidth={2.5} />
        </span>
    );
};

const textColorFor = (level: Level, isVyzon: boolean) => {
    if (isVyzon) return "rgba(255,255,255,0.95)";
    if (level === "yes") return "rgba(255,255,255,0.75)";
    if (level === "partial") return "rgba(255,255,255,0.55)";
    return "rgba(255,255,255,0.38)";
};

interface ComparisonSectionProps {
    onCTAClick?: () => void;
}

export const ComparisonSection = ({ onCTAClick }: ComparisonSectionProps) => {
    return (
        <section
            id="comparacao"
            className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#06080a" }}
        >
            {/* Top spotlight */}
            <div
                className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,227,122,0.07) 0%, transparent 70%)",
                }}
            />
            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ y: 16 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                    <span
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: "var(--fw-medium)",
                            letterSpacing: "0.06em",
                            background: "rgba(0,227,122,0.1)",
                            border: "1px solid rgba(0,227,122,0.2)",
                        }}
                    >
                        <Scale className="h-3 w-3" />
                        COMPARAÇÃO HONESTA
                    </span>
                    <h2
                        className="font-heading mb-4"
                        style={{
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Por que não{" "}
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>Pipedrive</span>?{" "}
                        Por que não{" "}
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>HubSpot</span>?
                    </h2>
                    <p
                        className="max-w-2xl mx-auto"
                        style={{
                            fontSize: "1.0625rem",
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,0.5)",
                        }}
                    >
                        Ferramentas excelentes. Feitas pra outro mercado.
                        Se seu time comercial vende no Brasil, aqui tá a diferença.
                    </p>
                </motion.div>

                {/* DESKTOP: table */}
                <div className="hidden md:block pt-4">
                    <div
                        className="relative rounded-2xl overflow-visible"
                        style={{
                            background: "rgba(255,255,255,0.015)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 24px 80px -20px rgba(0,0,0,0.6)",
                        }}
                    >
                        {/* Recommended badge — floating above Vyzon column */}
                        <div
                            className="absolute z-20 pointer-events-none"
                            style={{
                                top: "-14px",
                                left: "calc(1.2/4.2 * 100%)",
                                width: "calc(1/4.2 * 100%)",
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full"
                                style={{
                                    background: "linear-gradient(135deg, #00E37A, #00B289)",
                                    color: "white",
                                    fontWeight: 800,
                                    letterSpacing: "0.1em",
                                    boxShadow: "0 6px 20px rgba(0,227,122,0.35), 0 0 0 3px rgba(6,8,10,1)",
                                }}
                            >
                                RECOMENDADO PRA VOCÊ
                            </div>
                        </div>

                        {/* Column headers */}
                        <div
                            className="grid grid-cols-[1.2fr_1fr_1fr_1fr] px-6 py-6 relative rounded-t-2xl overflow-hidden"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="flex items-center">
                                <span
                                    className="text-[10px] uppercase"
                                    style={{
                                        letterSpacing: "0.12em",
                                        color: "rgba(255,255,255,0.35)",
                                        fontWeight: 700,
                                    }}
                                >
                                    Recurso
                                </span>
                            </div>
                            {/* Vyzon header */}
                            <div className="flex items-center justify-center relative z-10">
                                <span
                                    className="font-heading text-lg"
                                    style={{
                                        fontWeight: 800,
                                        background: "linear-gradient(135deg, #33FF9E, #00E37A)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        letterSpacing: "-0.02em",
                                    }}
                                >
                                    Vyzon
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <img
                                    src={FAVICON.pipedrive}
                                    alt=""
                                    className="h-5 w-5 rounded"
                                    style={{ opacity: 0.85 }}
                                    loading="lazy"
                                />
                                <span
                                    className="text-base"
                                    style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "-0.01em" }}
                                >
                                    Pipedrive
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <img
                                    src={FAVICON.hubspot}
                                    alt=""
                                    className="h-5 w-5 rounded"
                                    style={{ opacity: 0.85 }}
                                    loading="lazy"
                                />
                                <span
                                    className="text-base"
                                    style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "-0.01em" }}
                                >
                                    HubSpot
                                </span>
                            </div>

                            {/* Vyzon column highlight backdrop */}
                            <div
                                className="absolute top-0 bottom-0 pointer-events-none"
                                style={{
                                    left: "calc(1.2/4.2 * 100%)",
                                    width: "calc(1/4.2 * 100%)",
                                    background:
                                        "linear-gradient(to bottom, rgba(0,227,122,0.09), rgba(0,227,122,0.02))",
                                    borderLeft: "1px solid rgba(0,227,122,0.32)",
                                    borderRight: "1px solid rgba(0,227,122,0.32)",
                                }}
                            />
                        </div>

                        {/* Rows */}
                        <div className="relative">
                            {/* Vyzon column emerald glow + borders spanning full table body */}
                            <div
                                className="absolute top-0 bottom-0 pointer-events-none"
                                style={{
                                    left: "calc(1.2/4.2 * 100%)",
                                    width: "calc(1/4.2 * 100%)",
                                    background:
                                        "linear-gradient(to bottom, rgba(0,227,122,0.06) 0%, rgba(0,227,122,0.03) 50%, rgba(0,227,122,0.06) 100%)",
                                    borderLeft: "1px solid rgba(0,227,122,0.32)",
                                    borderRight: "1px solid rgba(0,227,122,0.32)",
                                    borderBottom: "1px solid rgba(0,227,122,0.32)",
                                    borderBottomLeftRadius: "16px",
                                    borderBottomRightRadius: "16px",
                                }}
                            />

                            {ROWS.map((row, i) => {
                                const Icon = row.icon;
                                const isLast = i === ROWS.length - 1;
                                return (
                                    <motion.div
                                        key={row.feature}
                                        initial={{ y: 10 }}
                                        whileInView={{ y: 0 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        transition={{
                                            duration: 0.4,
                                            delay: i * 0.04,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
                                        className="grid grid-cols-[1.2fr_1fr_1fr_1fr] px-6 py-4 relative"
                                        style={{
                                            borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                                style={{
                                                    background: "rgba(255,255,255,0.03)",
                                                    border: "1px solid rgba(255,255,255,0.06)",
                                                }}
                                            >
                                                <Icon
                                                    className="h-4 w-4"
                                                    style={{ color: "rgba(255,255,255,0.55)" }}
                                                    strokeWidth={1.8}
                                                />
                                            </div>
                                            <span
                                                className="text-sm"
                                                style={{
                                                    color: "rgba(255,255,255,0.88)",
                                                    fontWeight: 600,
                                                    letterSpacing: "-0.01em",
                                                }}
                                            >
                                                {row.feature}
                                            </span>
                                        </div>

                                        {(["vyzon", "pipedrive", "hubspot"] as const).map((col) => {
                                            const cell = row[col];
                                            const isVyzon = col === "vyzon";
                                            return (
                                                <div
                                                    key={col}
                                                    className="flex items-center justify-center gap-2 px-2 relative"
                                                >
                                                    <LevelIcon level={cell.level} />
                                                    <span
                                                        className="text-sm text-center"
                                                        style={{
                                                            color: textColorFor(cell.level, isVyzon),
                                                            fontWeight: isVyzon ? 600 : 500,
                                                        }}
                                                    >
                                                        {cell.text}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* MOBILE: feature cards */}
                <div className="md:hidden space-y-3">
                    {ROWS.map((row, i) => {
                        const Icon = row.icon;
                        return (
                            <motion.div
                                key={row.feature}
                                initial={{ y: 8 }}
                                whileInView={{ y: 0 }}
                                viewport={{ once: true, margin: "-30px" }}
                                transition={{ duration: 0.35, delay: i * 0.03 }}
                                className="rounded-2xl p-4"
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div
                                        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <Icon
                                            className="h-4 w-4"
                                            style={{ color: "rgba(255,255,255,0.6)" }}
                                            strokeWidth={1.8}
                                        />
                                    </div>
                                    <span
                                        className="text-sm"
                                        style={{
                                            color: "rgba(255,255,255,0.92)",
                                            fontWeight: 600,
                                            letterSpacing: "-0.01em",
                                        }}
                                    >
                                        {row.feature}
                                    </span>
                                </div>

                                {/* Vyzon featured */}
                                <div
                                    className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-1.5"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, rgba(0,227,122,0.08), rgba(0,227,122,0.02))",
                                        border: "1px solid rgba(0,227,122,0.22)",
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <LevelIcon level={row.vyzon.level} size={13} />
                                        <span
                                            className="text-[11px]"
                                            style={{
                                                fontWeight: 700,
                                                background: "linear-gradient(135deg, #33FF9E, #00E37A)",
                                                WebkitBackgroundClip: "text",
                                                WebkitTextFillColor: "transparent",
                                                letterSpacing: "-0.01em",
                                            }}
                                        >
                                            Vyzon
                                        </span>
                                    </div>
                                    <span
                                        className="text-[13px] text-right"
                                        style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}
                                    >
                                        {row.vyzon.text}
                                    </span>
                                </div>

                                {/* Pipedrive */}
                                <div className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <LevelIcon level={row.pipedrive.level} size={13} />
                                        <img
                                            src={FAVICON.pipedrive}
                                            alt=""
                                            className="h-4 w-4 rounded"
                                            style={{ opacity: 0.8 }}
                                            loading="lazy"
                                        />
                                        <span
                                            className="text-[11px]"
                                            style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}
                                        >
                                            Pipedrive
                                        </span>
                                    </div>
                                    <span
                                        className="text-[13px] text-right"
                                        style={{ color: textColorFor(row.pipedrive.level, false) }}
                                    >
                                        {row.pipedrive.text}
                                    </span>
                                </div>

                                {/* HubSpot */}
                                <div className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <LevelIcon level={row.hubspot.level} size={13} />
                                        <img
                                            src={FAVICON.hubspot}
                                            alt=""
                                            className="h-4 w-4 rounded"
                                            style={{ opacity: 0.8 }}
                                            loading="lazy"
                                        />
                                        <span
                                            className="text-[11px]"
                                            style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}
                                        >
                                            HubSpot
                                        </span>
                                    </div>
                                    <span
                                        className="text-[13px] text-right"
                                        style={{ color: textColorFor(row.hubspot.level, false) }}
                                    >
                                        {row.hubspot.text}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer CTA */}
                <div className="mt-12 text-center">
                    <motion.div
                        initial={{ y: 10 }}
                        whileInView={{ y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="inline-flex flex-col items-center gap-5"
                    >
                        {/* Savings pill */}
                        <div
                            className="inline-flex items-center gap-2.5 rounded-full px-4 py-2"
                            style={{
                                background: "rgba(0,227,122,0.08)",
                                border: "1px solid rgba(0,227,122,0.22)",
                            }}
                        >
                            <div
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0"
                                style={{
                                    background: "linear-gradient(135deg, #00E37A, #00B289)",
                                    boxShadow: "0 2px 8px rgba(0,227,122,0.4)",
                                }}
                            >
                                <PiggyBank className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                            </div>
                            <span
                                className="text-sm"
                                style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}
                            >
                                Em média você economiza{" "}
                                <span className="text-emerald-300" style={{ fontWeight: 700 }}>R$ 400/mês</span>
                                {" "}e{" "}
                                <span className="text-emerald-300" style={{ fontWeight: 700 }}>3 semanas de setup</span>
                            </span>
                        </div>

                        <p
                            className="max-w-xl"
                            style={{
                                fontSize: "1rem",
                                lineHeight: 1.6,
                                color: "rgba(255,255,255,0.5)",
                            }}
                        >
                            Se o seu time já usa Pipedrive ou HubSpot e tá funcionando, ótimo. Continua. <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>Mas se você tem um time comercial no Brasil e ainda tá forçando um CRM que não foi feito pra cá</span>, vale testar.
                        </p>

                        <button
                            onClick={onCTAClick}
                            className="group relative inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm text-white rounded-xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, #00E37A, #00B289)",
                                boxShadow:
                                    "0 0 0 1px rgba(0,227,122,0.3), 0 4px 20px rgba(0,227,122,0.28)",
                                fontWeight: 600,
                            }}
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <span className="relative">Testar 14 dias grátis</span>
                            <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <p
                            className="text-[11px] max-w-xl leading-relaxed"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                            * Valores em USD convertidos à taxa do dia, sujeitos a câmbio. Informações de Pipedrive e HubSpot consultadas nos sites oficiais em abr/2026 e podem mudar. Comparação feita de boa fé, confira as fontes antes de decidir.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
