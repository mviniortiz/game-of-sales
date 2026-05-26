import { motion } from "framer-motion";
import {
    Check,
    X,
    Minus,
    Bot,
    MessageCircle,
    Link2,
    Trophy,
    DollarSign,
    HeartHandshake,
    Scale,
    PiggyBank,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LandingButton } from "./LandingButton";

const FAVICON = {
    kommo: "https://www.google.com/s2/favicons?domain=kommo.com&sz=64",
    rdstation: "https://www.google.com/s2/favicons?domain=rdstation.com&sz=64",
    pipedrive: "https://www.google.com/s2/favicons?domain=pipedrive.com&sz=64",
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
    kommo: Cell;
    rdstation: Cell;
    pipedrive: Cell;
}

const ROWS: readonly Row[] = [
    {
        icon: MessageCircle,
        feature: "EVA atende WhatsApp 24/7",
        vyzon: { level: "yes", text: "EVA respondendo no chat" },
        kommo: { level: "partial", text: "Salesbot por add-on" },
        rdstation: { level: "partial", text: "Conversas com chatbot" },
        pipedrive: { level: "no", text: "Sem WhatsApp nativo" },
    },
    {
        icon: Bot,
        feature: "IA conversacional com memória",
        vyzon: { level: "yes", text: "EVA em produção" },
        kommo: { level: "partial", text: "AI agents add-on pago" },
        rdstation: { level: "partial", text: "Chatbot de regras" },
        pipedrive: { level: "partial", text: "AI Assistant (sem WA)" },
    },
    {
        icon: Link2,
        feature: "Integrações com checkout BR",
        vyzon: { level: "yes", text: "Hotmart, Kiwify, MP nativos" },
        kommo: { level: "partial", text: "Via Zapier" },
        rdstation: { level: "partial", text: "Catálogo limitado" },
        pipedrive: { level: "partial", text: "Via Zapier" },
    },
    {
        icon: Trophy,
        feature: "Ranking gamificado pro time",
        vyzon: { level: "yes", text: "Ranking ao vivo nativo" },
        kommo: { level: "partial", text: "Pipeline view básico" },
        rdstation: { level: "partial", text: "Relatórios estáticos" },
        pipedrive: { level: "partial", text: "Leaderboard básico" },
    },
    {
        icon: DollarSign,
        feature: "Pricing em R$ (plano inicial)",
        vyzon: { level: "yes", text: "R$ 147/mês" },
        kommo: { level: "partial", text: "US$ 25/usuário*" },
        rdstation: { level: "partial", text: "R$ 1.349 + carteira*" },
        pipedrive: { level: "partial", text: "US$ 14/usuário*" },
    },
    {
        icon: HeartHandshake,
        feature: "Suporte humano em PT-BR",
        vyzon: { level: "yes", text: "WhatsApp humano" },
        kommo: { level: "yes", text: "Operação BR" },
        rdstation: { level: "yes", text: "Time BR" },
        pipedrive: { level: "no", text: "Inglês, fuso EUA" },
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
                    background: "rgba(21,86,192,0.15)",
                    border: "1px solid rgba(21,86,192,0.3)",
                }}
            >
                <Check style={{ width: size - 2, height: size - 2, color: "#2E78E0" }} strokeWidth={3} />
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
                background: "rgba(10,10,10,0.04)",
                border: "1px solid rgba(10,10,10,0.08)",
            }}
        >
            <X style={{ width: size - 2, height: size - 2, color: "rgba(10,10,10,0.5)" }} strokeWidth={2.5} />
        </span>
    );
};

const textColorFor = (level: Level, isVyzon: boolean) => {
    if (isVyzon) return "rgba(10,10,10,0.92)";
    if (level === "yes") return "rgba(10,10,10,0.72)";
    if (level === "partial") return "rgba(10,10,10,0.58)";
    return "rgba(10,10,10,0.4)";
};

interface ComparisonSectionProps {
    onCTAClick?: () => void;
}

export const ComparisonSection = ({ onCTAClick }: ComparisonSectionProps) => {
    return (
        <section
            id="comparacao"
            className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#FFFFFF" }}
        >
            {/* Top spotlight */}
            <div
                className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(21,86,192,0.07) 0%, transparent 70%)",
                }}
            />
            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(10,10,10,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,0.08) 1px, transparent 1px)",
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
                        className="inline-flex items-center gap-1.5 text-xs text-blue-700 rounded-full px-4 py-1.5 mb-5"
                        style={{
                            fontWeight: "var(--fw-medium)",
                            letterSpacing: "0.06em",
                            background: "rgba(21,86,192,0.1)",
                            border: "1px solid rgba(21,86,192,0.2)",
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
                            color: "rgba(10,10,10,0.92)",
                        }}
                    >
                        Por que não{" "}
                        <span style={{ color: "rgba(10,10,10,0.58)" }}>Kommo</span>?{" "}
                        Por que não{" "}
                        <span style={{ color: "rgba(10,10,10,0.58)" }}>RD CRM</span>?
                    </h2>
                    <p
                        className="max-w-2xl mx-auto"
                        style={{
                            fontSize: "1.0625rem",
                            lineHeight: 1.6,
                            color: "rgba(10,10,10,0.55)",
                        }}
                    >
                        Ferramentas boas. Mas nenhuma resolve sozinha o WhatsApp da agência, o ranking do time e a integração com checkout BR. Aqui está a diferença que importa.
                    </p>
                </motion.div>

                {/* DESKTOP: table */}
                <div className="hidden md:block pt-4">
                    <div
                        className="relative rounded-2xl overflow-visible"
                        style={{
                            background: "rgba(10,10,10,0.025)",
                            border: "1px solid rgba(10,10,10,0.08)",
                            boxShadow: "0 0 0 1px rgba(10,10,10,0.03), 0 24px 80px -20px rgba(0,0,0,0.6)",
                        }}
                    >
                        {/* Recommended badge — floating above Vyzon column */}
                        <div
                            className="absolute z-20 pointer-events-none"
                            style={{
                                top: "-14px",
                                left: "calc(1.4/5.4 * 100%)",
                                width: "calc(1/5.4 * 100%)",
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full"
                                style={{
                                    background: "linear-gradient(135deg, #1556C0, #0E3E92)",
                                    color: "white",
                                    fontWeight: 800,
                                    letterSpacing: "0.1em",
                                    boxShadow: "0 6px 20px rgba(21,86,192,0.35), 0 0 0 3px rgba(6,8,10,1)",
                                }}
                            >
                                RECOMENDADO PRA VOCÊ
                            </div>
                        </div>

                        {/* Column headers */}
                        <div
                            className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] px-6 py-6 relative rounded-t-2xl overflow-hidden"
                            style={{
                                background: "rgba(10,10,10,0.03)",
                                borderBottom: "1px solid rgba(10,10,10,0.08)",
                            }}
                        >
                            <div className="flex items-center">
                                <span
                                    className="text-[10px] uppercase"
                                    style={{
                                        letterSpacing: "0.12em",
                                        color: "rgba(10,10,10,0.5)",
                                        fontWeight: 700,
                                    }}
                                >
                                    Recurso
                                </span>
                            </div>
                            {/* Vyzon header */}
                            <div className="flex items-center justify-center gap-2 relative z-10">
                                <img
                                    src="/favicon-32.png"
                                    alt=""
                                    className="h-5 w-5 rounded"
                                    loading="lazy"
                                />
                                <span
                                    className="font-heading text-lg"
                                    style={{
                                        fontWeight: 700,
                                        background: "linear-gradient(135deg, #2E78E0, #1556C0)",
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
                                    src={FAVICON.kommo}
                                    alt=""
                                    className="h-5 w-5 rounded"
                                    style={{ opacity: 0.85 }}
                                    loading="lazy"
                                />
                                <span
                                    className="text-base"
                                    style={{ color: "rgba(10,10,10,0.65)", fontWeight: 600, letterSpacing: "-0.01em" }}
                                >
                                    Kommo
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <img
                                    src={FAVICON.rdstation}
                                    alt=""
                                    className="h-5 w-5 rounded"
                                    style={{ opacity: 0.85 }}
                                    loading="lazy"
                                />
                                <span
                                    className="text-base"
                                    style={{ color: "rgba(10,10,10,0.65)", fontWeight: 600, letterSpacing: "-0.01em" }}
                                >
                                    RD CRM
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
                                    style={{ color: "rgba(10,10,10,0.65)", fontWeight: 600, letterSpacing: "-0.01em" }}
                                >
                                    Pipedrive
                                </span>
                            </div>

                            {/* Vyzon column highlight backdrop */}
                            <div
                                className="absolute top-0 bottom-0 pointer-events-none"
                                style={{
                                    left: "calc(1.2/4.2 * 100%)",
                                    width: "calc(1/4.2 * 100%)",
                                    background:
                                        "linear-gradient(to bottom, rgba(21,86,192,0.09), rgba(21,86,192,0.02))",
                                    borderLeft: "1px solid rgba(21,86,192,0.32)",
                                    borderRight: "1px solid rgba(21,86,192,0.32)",
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
                                        "linear-gradient(to bottom, rgba(21,86,192,0.06) 0%, rgba(21,86,192,0.03) 50%, rgba(21,86,192,0.06) 100%)",
                                    borderLeft: "1px solid rgba(21,86,192,0.32)",
                                    borderRight: "1px solid rgba(21,86,192,0.32)",
                                    borderBottom: "1px solid rgba(21,86,192,0.32)",
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
                                        className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] px-6 py-4 relative"
                                        style={{
                                            borderBottom: isLast ? "none" : "1px solid rgba(10,10,10,0.06)",
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                                style={{
                                                    background: "rgba(10,10,10,0.04)",
                                                    border: "1px solid rgba(10,10,10,0.08)",
                                                }}
                                            >
                                                <Icon
                                                    className="h-4 w-4"
                                                    style={{ color: "rgba(10,10,10,0.58)" }}
                                                    strokeWidth={1.8}
                                                />
                                            </div>
                                            <span
                                                className="text-sm"
                                                style={{
                                                    color: "rgba(10,10,10,0.85)",
                                                    fontWeight: 600,
                                                    letterSpacing: "-0.01em",
                                                }}
                                            >
                                                {row.feature}
                                            </span>
                                        </div>

                                        {(["vyzon", "kommo", "rdstation", "pipedrive"] as const).map((col) => {
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
                                    background: "rgba(10,10,10,0.03)",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                }}
                            >
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div
                                        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                        style={{
                                            background: "rgba(10,10,10,0.04)",
                                            border: "1px solid rgba(10,10,10,0.08)",
                                        }}
                                    >
                                        <Icon
                                            className="h-4 w-4"
                                            style={{ color: "rgba(10,10,10,0.6)" }}
                                            strokeWidth={1.8}
                                        />
                                    </div>
                                    <span
                                        className="text-sm"
                                        style={{
                                            color: "rgba(10,10,10,0.88)",
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
                                            "linear-gradient(135deg, rgba(21,86,192,0.08), rgba(21,86,192,0.02))",
                                        border: "1px solid rgba(21,86,192,0.22)",
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <LevelIcon level={row.vyzon.level} size={13} />
                                        <img
                                            src="/favicon-32.png"
                                            alt=""
                                            className="h-4 w-4 rounded"
                                            loading="lazy"
                                        />
                                        <span
                                            className="text-[11px]"
                                            style={{
                                                fontWeight: 700,
                                                background: "linear-gradient(135deg, #2E78E0, #1556C0)",
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
                                        style={{ color: "rgba(10,10,10,0.92)", fontWeight: 600 }}
                                    >
                                        {row.vyzon.text}
                                    </span>
                                </div>

                                {([
                                    { key: "kommo" as const, label: "Kommo" },
                                    { key: "rdstation" as const, label: "RD CRM" },
                                    { key: "pipedrive" as const, label: "Pipedrive" },
                                ]).map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <LevelIcon level={row[key].level} size={13} />
                                            <img
                                                src={FAVICON[key]}
                                                alt=""
                                                className="h-4 w-4 rounded"
                                                style={{ opacity: 0.8 }}
                                                loading="lazy"
                                            />
                                            <span
                                                className="text-[11px]"
                                                style={{ color: "rgba(10,10,10,0.58)", fontWeight: 600 }}
                                            >
                                                {label}
                                            </span>
                                        </div>
                                        <span
                                            className="text-[13px] text-right"
                                            style={{ color: textColorFor(row[key].level, false) }}
                                        >
                                            {row[key].text}
                                        </span>
                                    </div>
                                ))}
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
                                background: "rgba(21,86,192,0.08)",
                                border: "1px solid rgba(21,86,192,0.22)",
                            }}
                        >
                            <div
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0"
                                style={{
                                    background: "linear-gradient(135deg, #1556C0, #0E3E92)",
                                    boxShadow: "0 2px 8px rgba(21,86,192,0.4)",
                                }}
                            >
                                <PiggyBank className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                            </div>
                            <span
                                className="text-sm"
                                style={{ color: "rgba(10,10,10,0.82)", fontWeight: 500 }}
                            >
                                WhatsApp + EVA + ranking{" "}
                                <span className="text-blue-800" style={{ fontWeight: 700 }}>no mesmo plano</span>
                                {", sem add-on pago"}
                            </span>
                        </div>

                        <p
                            className="max-w-xl"
                            style={{
                                fontSize: "1rem",
                                lineHeight: 1.6,
                                color: "rgba(10,10,10,0.55)",
                            }}
                        >
                            Se a sua agência já roda no Kommo, RD ou Pipedrive e tá funcionando, ótimo. Continua. <span style={{ color: "rgba(10,10,10,0.82)", fontWeight: 500 }}>Mas se você ainda paga add-on por WhatsApp, add-on por IA e ainda assim lead morre no chat</span>, vale testar 14 dias.
                        </p>

                        <LandingButton
                            as="button"
                            onClick={onCTAClick}
                            variant="primary"
                            size="lg"
                            showArrow
                        >
                            Testar 14 dias grátis
                        </LandingButton>

                        <p
                            className="text-[11px] max-w-xl leading-relaxed"
                            style={{ color: "rgba(10,10,10,0.45)" }}
                        >
                            * Valores em USD convertidos à taxa do dia, sujeitos a câmbio. Informações de Kommo, RD Station CRM e Pipedrive consultadas nos sites oficiais em mai/2026 e podem mudar. Comparação feita de boa fé, confira as fontes antes de decidir.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
