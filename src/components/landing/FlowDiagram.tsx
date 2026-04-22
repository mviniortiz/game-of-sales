import { motion } from "framer-motion";
import logoIcon from "@/assets/logo-icon.png";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import caktoLogo from "@/assets/integrations/cakto.webp";
import stripeLogo from "@/assets/integrations/stripe.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";

// ─── Data ────────────────────────────────────────────────────────────────────
// Coordinates are in SVG viewBox units (1000 × 600).

interface Source {
    id: string;
    name: string;
    logo: string;
    cy: number;
}

interface Destination {
    id: string;
    name: string;
    caption: string;
    accent: string;
    iconPath: React.ReactNode;
    cy: number;
}

const SOURCES: Source[] = [
    { id: "hotmart", name: "Hotmart", logo: hotmartLogo, cy: 100 },
    { id: "kiwify", name: "Kiwify", logo: kiwifyLogo, cy: 200 },
    { id: "cakto", name: "Cakto", logo: caktoLogo, cy: 300 },
    { id: "mercado-pago", name: "Mercado Pago", logo: mercadopagoLogo, cy: 400 },
    { id: "stripe", name: "Stripe", logo: stripeLogo, cy: 500 },
];

// Tiny inline icons — drawn in SVG so they scale perfectly.
const PipelineIcon = (
    <g strokeWidth={2} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="-8" y="-8" width="4.5" height="16" rx="1" />
        <rect x="-1.75" y="-8" width="4.5" height="10" rx="1" />
        <rect x="4.5" y="-8" width="4.5" height="6" rx="1" />
    </g>
);
const TrophyIcon = (
    <g strokeWidth={2} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -6 -6 H 6 V -2 A 6 6 0 0 1 -6 -2 Z" />
        <path d="M -6 -4 H -8 A 2 2 0 0 0 -10 -2 V 0 A 3 3 0 0 0 -6 2" />
        <path d="M 6 -4 H 8 A 2 2 0 0 1 10 -2 V 0 A 3 3 0 0 1 6 2" />
        <path d="M -3 4 H 3" />
        <path d="M 0 2 V 7" />
    </g>
);
const TargetIcon = (
    <g strokeWidth={2} stroke="currentColor" fill="none">
        <circle cx="0" cy="0" r="8" />
        <circle cx="0" cy="0" r="4" />
        <circle cx="0" cy="0" r="1" fill="currentColor" />
    </g>
);
const ChartIcon = (
    <g strokeWidth={2} stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -8 7 V -6" />
        <path d="M -8 7 H 8" />
        <rect x="-5" y="0" width="3" height="5" rx="0.5" />
        <rect x="0" y="-4" width="3" height="9" rx="0.5" />
        <rect x="5" y="-7" width="3" height="12" rx="0.5" />
    </g>
);

const DESTINATIONS: Destination[] = [
    { id: "pipeline", name: "Pipeline", caption: "Novo deal criado", accent: "#60a5fa", iconPath: PipelineIcon, cy: 120 },
    { id: "ranking", name: "Ranking", caption: "Vendedor sobe no pódio", accent: "#fbbf24", iconPath: TrophyIcon, cy: 240 },
    { id: "meta", name: "Meta", caption: "Progresso avança", accent: "#33FF9E", iconPath: TargetIcon, cy: 360 },
    { id: "dashboard", name: "Dashboard", caption: "Receita ao vivo", accent: "#a78bfa", iconPath: ChartIcon, cy: 480 },
];

// ─── Geometry ────────────────────────────────────────────────────────────────

const LOGO_SIZE = 56;
const LOGO_CX = 80;
const SOURCE_EXIT_X = LOGO_CX + LOGO_SIZE / 2;
const SOURCE_TURN_X = 290;
const HUB_ENTRY_X = 435;
const HUB_EXIT_X = 565;
const DEST_TURN_X = 710;
const DEST_ENTRY_X = 780;
const HUB_CENTER = { x: 500, y: 300 };

const DEST_CARD = { w: 180, h: 80 };

// Stepped path: exit horizontally, bend 90°, travel vertically, bend 90° again, enter target.
const steppedPath = (x1: number, y1: number, turnX: number, x2: number, y2: number): string =>
    `M ${x1} ${y1} H ${turnX} V ${y2} H ${x2}`;

const sourcePaths = SOURCES.map((s) =>
    steppedPath(SOURCE_EXIT_X, s.cy, SOURCE_TURN_X, HUB_ENTRY_X, HUB_CENTER.y),
);
const destPaths = DESTINATIONS.map((d) =>
    steppedPath(HUB_EXIT_X, HUB_CENTER.y, DEST_TURN_X, DEST_ENTRY_X, d.cy),
);

// Timing
const LOOP_DURATION = 4.2; // seconds

// ─── Component ───────────────────────────────────────────────────────────────

export const FlowDiagram = () => {
    return (
        <section
            id="flow"
            className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#06080a" }}
        >
            {/* Top green spotlight */}
            <div
                className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        EM TEMPO REAL
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
                        O que acontece{" "}
                        <span className="text-emerald-400">quando cai uma venda</span>
                    </h2>
                    <p
                        className="max-w-xl mx-auto"
                        style={{
                            fontSize: "1.0625rem",
                            lineHeight: 1.6,
                            color: "rgba(255,255,255,0.5)",
                        }}
                    >
                        Webhook chega, Vyzon processa e o time inteiro fica sabendo — antes do
                        vendedor tomar café.
                    </p>
                </motion.div>

                {/* The diagram */}
                <div className="relative rounded-3xl overflow-hidden"
                    style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.005))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 32px 80px -24px rgba(0,0,0,0.6)",
                    }}
                >
                    {/* Desktop SVG */}
                    <svg
                        viewBox="0 0 1000 600"
                        className="hidden md:block w-full h-auto"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <defs>
                            {/* Glow filter for the hub */}
                            <filter id="hubGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="8" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>

                            {/* Particle glow */}
                            <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
                                <feGaussianBlur stdDeviation="3" />
                            </filter>

                            {/* Hub gradient */}
                            <radialGradient id="hubFill" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(0,227,122,0.22)" />
                                <stop offset="60%" stopColor="rgba(0,227,122,0.1)" />
                                <stop offset="100%" stopColor="rgba(0,227,122,0.02)" />
                            </radialGradient>

                            {/* Source paths — registered with ids so particles can reference them */}
                            {sourcePaths.map((d, i) => (
                                <path key={`srcpath-${i}`} id={`flow-src-path-${i}`} d={d} />
                            ))}
                            {destPaths.map((d, i) => (
                                <path key={`destpath-${i}`} id={`flow-dest-path-${i}`} d={d} />
                            ))}
                        </defs>

                        {/* Draw static dashed tracks */}
                        <g>
                            {sourcePaths.map((d, i) => (
                                <path
                                    key={`src-stroke-${i}`}
                                    d={d}
                                    fill="none"
                                    stroke="rgba(0,227,122,0.16)"
                                    strokeWidth="1.2"
                                    strokeDasharray="2 5"
                                />
                            ))}
                            {destPaths.map((d, i) => (
                                <path
                                    key={`dest-stroke-${i}`}
                                    d={d}
                                    fill="none"
                                    stroke="rgba(0,227,122,0.16)"
                                    strokeWidth="1.2"
                                    strokeDasharray="2 5"
                                />
                            ))}
                        </g>

                        {/* One-shot draw-in trace on viewport entry */}
                        <motion.g
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-60px" }}
                            variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.08 } },
                            }}
                        >
                            {[...sourcePaths, ...destPaths].map((d, i) => (
                                <motion.path
                                    key={`trace-${i}`}
                                    d={d}
                                    fill="none"
                                    stroke="#33FF9E"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    variants={{
                                        hidden: { pathLength: 0, opacity: 0 },
                                        visible: {
                                            pathLength: 1,
                                            opacity: [0, 0.85, 0],
                                            transition: { duration: 1.4, times: [0, 0.45, 1], ease: [0.22, 1, 0.36, 1] },
                                        },
                                    }}
                                />
                            ))}
                        </motion.g>

                        {/* Source tiles — logos only */}
                        {SOURCES.map((s) => (
                            <g key={s.id} transform={`translate(${LOGO_CX - LOGO_SIZE / 2}, ${s.cy - LOGO_SIZE / 2})`}>
                                <rect
                                    x="0"
                                    y="0"
                                    width={LOGO_SIZE}
                                    height={LOGO_SIZE}
                                    rx="12"
                                    fill="rgba(255,255,255,0.96)"
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth="1"
                                />
                                <image
                                    href={s.logo}
                                    x="10"
                                    y="10"
                                    width={LOGO_SIZE - 20}
                                    height={LOGO_SIZE - 20}
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    <title>{s.name}</title>
                                </image>
                            </g>
                        ))}

                        {/* Vyzon hub */}
                        <g>
                            {/* Radar ping — expanding outward (no bounce) */}
                            <circle cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="75" fill="none" stroke="rgba(0,227,122,0.4)" strokeWidth="1">
                                <animate attributeName="r" from="75" to="108" dur="3.6s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.5;0" dur="3.6s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="75" fill="none" stroke="rgba(0,227,122,0.4)" strokeWidth="1">
                                <animate attributeName="r" from="75" to="108" dur="3.6s" begin="1.8s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.5;0" dur="3.6s" begin="1.8s" repeatCount="indefinite" />
                            </circle>
                            {/* Glow backdrop */}
                            <circle cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="78" fill="url(#hubFill)" filter="url(#hubGlow)" />
                            {/* Core circle */}
                            <circle
                                cx={HUB_CENTER.x}
                                cy={HUB_CENTER.y}
                                r="65"
                                fill="#0b0f14"
                                stroke="rgba(0,227,122,0.45)"
                                strokeWidth="1.5"
                            />
                            {/* Inner highlight ring */}
                            <circle
                                cx={HUB_CENTER.x}
                                cy={HUB_CENTER.y}
                                r="60"
                                fill="none"
                                stroke="rgba(0,227,122,0.15)"
                                strokeWidth="0.8"
                            />
                            {/* Vyzon logo */}
                            <image
                                href={logoIcon}
                                x={HUB_CENTER.x - 28}
                                y={HUB_CENTER.y - 28}
                                width="56"
                                height="56"
                                preserveAspectRatio="xMidYMid meet"
                            />
                            <text
                                x={HUB_CENTER.x}
                                y={HUB_CENTER.y + 32}
                                textAnchor="middle"
                                fill="rgba(0,227,122,0.9)"
                                fontSize="9"
                                fontWeight="700"
                                style={{ letterSpacing: "0.2em" }}
                            >
                                CORE · LIVE
                            </text>
                        </g>

                        {/* Destination cards */}
                        {DESTINATIONS.map((d) => (
                            <g key={d.id} transform={`translate(${DEST_ENTRY_X}, ${d.cy - DEST_CARD.h / 2})`}>
                                <rect
                                    x="0"
                                    y="0"
                                    width={DEST_CARD.w}
                                    height={DEST_CARD.h}
                                    rx="14"
                                    fill="rgba(255,255,255,0.025)"
                                    stroke="rgba(255,255,255,0.07)"
                                    strokeWidth="1"
                                />
                                {/* Accent bar */}
                                <rect
                                    x="0"
                                    y="0"
                                    width="3"
                                    height={DEST_CARD.h}
                                    rx="1.5"
                                    fill={d.accent}
                                    opacity="0.6"
                                />
                                {/* Icon circle */}
                                <g transform="translate(34, 40)" color={d.accent}>
                                    <circle cx="0" cy="0" r="18" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                                    {d.iconPath}
                                </g>
                                <text
                                    x="66"
                                    y="32"
                                    fill="rgba(255,255,255,0.95)"
                                    fontSize="15"
                                    fontWeight="600"
                                    style={{ letterSpacing: "-0.01em" }}
                                >
                                    {d.name}
                                </text>
                                <text
                                    x="66"
                                    y="52"
                                    fill="rgba(255,255,255,0.45)"
                                    fontSize="11"
                                    fontWeight="500"
                                >
                                    {d.caption}
                                </text>
                                <text
                                    x="66"
                                    y="67"
                                    fill={d.accent}
                                    fontSize="10"
                                    fontWeight="600"
                                    style={{ letterSpacing: "0.03em" }}
                                >
                                    atualizado agora
                                </text>
                            </g>
                        ))}

                        {/* Animated particles — SOURCE → HUB */}
                        {SOURCES.map((_, i) => (
                            <g key={`src-particle-${i}`}>
                                {/* Trailing glow */}
                                <circle r="6" fill="#33FF9E" opacity="0.35" filter="url(#particleGlow)">
                                    <animateMotion
                                        dur={`${LOOP_DURATION}s`}
                                        repeatCount="indefinite"
                                        begin={`${i * (LOOP_DURATION / SOURCES.length)}s`}
                                        rotate="auto"
                                    >
                                        <mpath href={`#flow-src-path-${i}`} />
                                    </animateMotion>
                                </circle>
                                {/* Core dot */}
                                <circle r="3.2" fill="#33FF9E">
                                    <animateMotion
                                        dur={`${LOOP_DURATION}s`}
                                        repeatCount="indefinite"
                                        begin={`${i * (LOOP_DURATION / SOURCES.length)}s`}
                                    >
                                        <mpath href={`#flow-src-path-${i}`} />
                                    </animateMotion>
                                </circle>
                            </g>
                        ))}

                        {/* Animated particles — HUB → DESTINATION.
                             Offset by half loop so they feel like they "exit" after hub pulses. */}
                        {DESTINATIONS.map((d, i) => (
                            <g key={`dest-particle-${i}`}>
                                <circle r="6" fill={d.accent} opacity="0.35" filter="url(#particleGlow)">
                                    <animateMotion
                                        dur={`${LOOP_DURATION}s`}
                                        repeatCount="indefinite"
                                        begin={`${LOOP_DURATION / 2 + i * (LOOP_DURATION / DESTINATIONS.length)}s`}
                                    >
                                        <mpath href={`#flow-dest-path-${i}`} />
                                    </animateMotion>
                                </circle>
                                <circle r="3.2" fill={d.accent}>
                                    <animateMotion
                                        dur={`${LOOP_DURATION}s`}
                                        repeatCount="indefinite"
                                        begin={`${LOOP_DURATION / 2 + i * (LOOP_DURATION / DESTINATIONS.length)}s`}
                                    >
                                        <mpath href={`#flow-dest-path-${i}`} />
                                    </animateMotion>
                                </circle>
                            </g>
                        ))}
                    </svg>

                    {/* MOBILE version: stacked, simplified */}
                    <div className="md:hidden p-6">
                        <div className="flex flex-col items-stretch gap-3">
                            {/* Sources row (horizontal scroll) */}
                            <div className="mb-2">
                                <p
                                    className="text-[10px] uppercase mb-2 text-center"
                                    style={{
                                        letterSpacing: "0.15em",
                                        color: "rgba(255,255,255,0.35)",
                                        fontWeight: 700,
                                    }}
                                >
                                    Checkouts
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {SOURCES.map((s, idx) => (
                                        <div
                                            key={s.id}
                                            className="flex items-center gap-2 rounded-xl pl-2 pr-2.5 py-2"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.07)",
                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                                            }}
                                        >
                                            <div
                                                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                                style={{ background: "rgba(255,255,255,0.95)" }}
                                            >
                                                <img src={s.logo} alt={s.name} className="max-w-[70%] max-h-[70%] object-contain" />
                                            </div>
                                            <span
                                                className="text-[11px]"
                                                style={{ color: "rgba(255,255,255,0.92)", fontWeight: 600 }}
                                            >
                                                {s.name}
                                            </span>
                                            <span className="relative flex w-1.5 h-1.5 ml-0.5" aria-hidden="true">
                                                <span
                                                    className="absolute inset-0 rounded-full bg-emerald-400 animate-ping"
                                                    style={{ opacity: 0.5, animationDelay: `${idx * 0.2}s` }}
                                                />
                                                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Motion-path + pathLength draw-in */}
                            <svg viewBox="0 0 24 72" className="w-6 h-16 mx-auto block" aria-hidden="true">
                                <path
                                    id="mobile-flow-path-1"
                                    d="M 12 4 L 12 68"
                                    fill="none"
                                    stroke="rgba(0,227,122,0.22)"
                                    strokeWidth="1.2"
                                    strokeDasharray="2 4"
                                />
                                <motion.path
                                    d="M 12 4 L 12 68"
                                    fill="none"
                                    stroke="#33FF9E"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0.6 }}
                                    whileInView={{
                                        pathLength: 1,
                                        transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
                                    }}
                                    viewport={{ once: true, margin: "-40px" }}
                                />
                                <circle r="2.5" fill="#33FF9E">
                                    <animateMotion dur="2.4s" repeatCount="indefinite">
                                        <mpath href="#mobile-flow-path-1" />
                                    </animateMotion>
                                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.4s" repeatCount="indefinite" />
                                </circle>
                            </svg>

                            {/* Vyzon hub */}
                            <div
                                className="relative rounded-2xl py-6 px-4 text-center"
                                style={{
                                    background: "linear-gradient(135deg, rgba(0,227,122,0.14), rgba(0,227,122,0.04))",
                                    border: "1px solid rgba(0,227,122,0.35)",
                                    boxShadow: "0 0 0 1px rgba(0,227,122,0.1), 0 20px 48px -20px rgba(0,227,122,0.35)",
                                }}
                            >
                                <ThemeLogo iconOnly className="h-10 w-auto mx-auto mb-2" />
                                <p
                                    className="text-[10px]"
                                    style={{
                                        color: "rgba(0,227,122,0.9)",
                                        fontWeight: 700,
                                        letterSpacing: "0.2em",
                                    }}
                                >
                                    CORE · LIVE
                                </p>
                            </div>

                            {/* Motion-path + pathLength draw-in (mirrored curve, staggered) */}
                            <svg viewBox="0 0 24 72" className="w-6 h-16 mx-auto block" aria-hidden="true">
                                <path
                                    id="mobile-flow-path-2"
                                    d="M 12 4 L 12 68"
                                    fill="none"
                                    stroke="rgba(0,227,122,0.22)"
                                    strokeWidth="1.2"
                                    strokeDasharray="2 4"
                                />
                                <motion.path
                                    d="M 12 4 L 12 68"
                                    fill="none"
                                    stroke="#33FF9E"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0.6 }}
                                    whileInView={{
                                        pathLength: 1,
                                        transition: { duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] },
                                    }}
                                    viewport={{ once: true, margin: "-40px" }}
                                />
                                <circle r="2.5" fill="#33FF9E">
                                    <animateMotion dur="2.4s" repeatCount="indefinite" begin="1.2s">
                                        <mpath href="#mobile-flow-path-2" />
                                    </animateMotion>
                                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.4s" repeatCount="indefinite" begin="1.2s" />
                                </circle>
                            </svg>

                            {/* Destinations */}
                            <div>
                                <p
                                    className="text-[10px] uppercase mb-2 text-center"
                                    style={{
                                        letterSpacing: "0.15em",
                                        color: "rgba(255,255,255,0.35)",
                                        fontWeight: 700,
                                    }}
                                >
                                    Acontece em paralelo
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {DESTINATIONS.map((d, idx) => (
                                        <div
                                            key={d.id}
                                            className="relative rounded-xl p-3 overflow-hidden"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.07)",
                                                borderLeft: `3px solid ${d.accent}`,
                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-1.5">
                                                <svg viewBox="-12 -12 24 24" className="w-5 h-5" color={d.accent}>
                                                    {d.iconPath}
                                                </svg>
                                                <span className="relative flex w-1.5 h-1.5 mt-1" aria-hidden="true">
                                                    <span
                                                        className="absolute inset-0 rounded-full animate-ping"
                                                        style={{ background: d.accent, opacity: 0.5, animationDelay: `${idx * 0.3}s` }}
                                                    />
                                                    <span
                                                        className="relative w-1.5 h-1.5 rounded-full"
                                                        style={{ background: d.accent }}
                                                    />
                                                </span>
                                            </div>
                                            <p
                                                className="text-[13px] mb-0.5"
                                                style={{ color: "rgba(255,255,255,0.95)", fontWeight: 600 }}
                                            >
                                                {d.name}
                                            </p>
                                            <p
                                                className="text-[10px] mb-1.5"
                                                style={{ color: "rgba(255,255,255,0.45)" }}
                                            >
                                                {d.caption}
                                            </p>
                                            <span
                                                className="text-[9px]"
                                                style={{
                                                    color: d.accent,
                                                    fontWeight: 700,
                                                    letterSpacing: "0.12em",
                                                }}
                                            >
                                                ATUALIZADO AGORA
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footnote */}
                <div className="mt-8 text-center">
                    <p
                        className="text-sm"
                        style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}
                    >
                        Latência média do webhook até o painel:{" "}
                        <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                            menos de 2 segundos
                        </span>
                        .
                    </p>
                </div>
            </div>
        </section>
    );
};
