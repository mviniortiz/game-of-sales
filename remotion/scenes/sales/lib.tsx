import React from "react";
import { interpolate } from "remotion";

// ============================================
// FONTS — matches production (Satoshi + Inter)
// ============================================
export const fontStyles = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

export const FONTS = {
    // Heading — Satoshi (same as landing + system)
    heading: "'Satoshi', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    // Body — Inter
    sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    // Mono — JetBrains Mono
    mono: "'JetBrains Mono', ui-monospace, monospace",
};

// ============================================
// BRAND PALETTE — LIGHT MODE
// ============================================
export const C = {
    // Page surfaces (light mode)
    deep: "#f8fafc",      // slate-50
    night: "#f1f5f9",     // slate-100
    slate: "#e2e8f0",     // slate-200
    ink: "#cbd5e1",       // slate-300

    // Text
    text: "#0f172a",      // slate-900 — primary text
    text2: "#334155",     // slate-700 — secondary
    text3: "#64748b",     // slate-500 — muted
    text4: "#94a3b8",     // slate-400 — faint

    // Accent colors (slightly desaturated for light bg)
    em300: "#6ee7b7",
    em400: "#34d399",
    em500: "#10b981",
    em600: "#059669",
    em700: "#047857",
    gold300: "#fcd34d",
    gold400: "#fbbf24",
    gold500: "#f59e0b",
    gold600: "#d97706",
    vio400: "#a78bfa",
    vio500: "#8b5cf6",
    vio600: "#7c3aed",
    blue: "#3b82f6",
    red: "#ef4444",
    pink: "#ec4899",

    // WhatsApp LIGHT theme
    wa: "#25D366",         // brand green
    waBg: "#efeae2",       // chat background (classic beige)
    waPanel: "#f0f2f5",    // header/composer panel
    waBubbleIn: "#ffffff", // incoming bubble
    waBubbleOut: "#d9fdd3",// outgoing bubble (light green)
    waText: "#111b21",     // WA text color

    // Lines / overlays (dark on light)
    line: "rgba(15,23,42,0.08)",
    line2: "rgba(15,23,42,0.14)",
    faint: "rgba(15,23,42,0.5)",
    mute: "rgba(15,23,42,0.65)",
};

// ============================================
// HELPERS
// ============================================
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const fadeInOut = (frame: number, duration: number, fadeIn = 15, fadeOut = 15) => {
    const a = interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" });
    const b = interpolate(frame, [duration - fadeOut, duration], [1, 0], { extrapolateLeft: "clamp" });
    return Math.min(a, b);
};

export const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Pure count-up (not a hook despite the "use" prefix — kept for backwards compat)
export const useCountUp = (frame: number, target: number, start = 0, end = 60) => {
    const t = clamp01((frame - start) / (end - start));
    return Math.round(target * easeOut(t));
};

// ============================================
// SCENE BACKGROUND — LIGHT MODE
// ============================================
export const SceneBG: React.FC<{ frame: number; tint?: "emerald" | "violet" | "gold" | "neutral" }> = ({ frame, tint = "emerald" }) => {
    const tints = {
        emerald: { a: "rgba(16,185,129,0.14)", b: "rgba(52,211,153,0.08)" },
        violet: { a: "rgba(139,92,246,0.16)", b: "rgba(167,139,250,0.09)" },
        gold: { a: "rgba(251,191,36,0.16)", b: "rgba(245,158,11,0.09)" },
        neutral: { a: "rgba(99,102,241,0.12)", b: "rgba(59,130,246,0.08)" },
    }[tint];

    return (
        <>
            {/* Base light gradient */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(135deg, #ffffff 0%, #f8fafc 35%, #f1f5f9 70%, #e2e8f0 100%)",
                }}
            />
            {/* Animated color orbs (tint) */}
            <div
                style={{
                    position: "absolute",
                    top: "6%",
                    left: "4%",
                    width: 700,
                    height: 700,
                    background: `radial-gradient(circle, ${tints.a} 0%, transparent 65%)`,
                    borderRadius: "50%",
                    filter: "blur(90px)",
                    transform: `translate(${Math.sin(frame / 50) * 30}px, ${Math.cos(frame / 40) * 20}px)`,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "8%",
                    right: "6%",
                    width: 600,
                    height: 600,
                    background: `radial-gradient(circle, ${tints.b} 0%, transparent 65%)`,
                    borderRadius: "50%",
                    filter: "blur(80px)",
                    transform: `translate(${Math.cos(frame / 45) * 25}px, ${Math.sin(frame / 35) * 20}px)`,
                }}
            />
            {/* Subtle dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(15,23,42,0.08) 1.2px, transparent 1.2px)`,
                    backgroundSize: "42px 42px",
                    maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
                }}
            />
            {/* Soft vignette (edge darken) */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 55%, rgba(15,23,42,0.06) 100%)",
                    pointerEvents: "none",
                }}
            />
        </>
    );
};

// ============================================
// REUSABLE: SECTION HEADER OVERLAY
// ============================================
export const SectionHeader: React.FC<{
    frame: number;
    eyebrow: string;
    title: string;
    accent?: string;
    align?: "left" | "center";
}> = ({ frame, eyebrow, title, accent = C.em600, align = "left" }) => {
    const eyeOpacity = interpolate(frame, [5, 22], [0, 1], { extrapolateRight: "clamp" });
    const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });
    const titleY = interpolate(frame, [12, 30], [22, 0], { extrapolateRight: "clamp" });

    return (
        <div style={{ textAlign: align as any }}>
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: accent,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                    fontFamily: FONTS.sans,
                    opacity: eyeOpacity,
                }}
            >
                <span
                    style={{
                        display: "inline-block",
                        width: 28,
                        height: 2,
                        background: accent,
                        borderRadius: 2,
                    }}
                />
                {eyebrow}
            </div>
            <div
                style={{
                    fontSize: 56,
                    fontWeight: 800,
                    fontFamily: FONTS.heading,
                    color: C.text,
                    lineHeight: 1.05,
                    letterSpacing: -1.5,
                    marginTop: 14,
                    opacity: titleOpacity,
                    transform: `translateY(${titleY}px)`,
                }}
            >
                {title}
            </div>
        </div>
    );
};

// ============================================
// REUSABLE: GLASS CARD (light)
// ============================================
export const Glass: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div
        style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)",
            border: "1px solid rgba(15,23,42,0.08)",
            backdropFilter: "blur(20px)",
            borderRadius: 18,
            boxShadow: "0 20px 60px -20px rgba(15,23,42,0.18), 0 2px 8px -2px rgba(15,23,42,0.06)",
            ...style,
        }}
    >
        {children}
    </div>
);

// ============================================
// REUSABLE: AVATAR
// ============================================
export const Avatar: React.FC<{ name: string; size?: number; gradient?: [string, string] }> = ({
    name,
    size = 36,
    gradient = ["#10b981", "#059669"],
}) => {
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase();
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: size * 0.4,
                fontFamily: FONTS.sans,
                flexShrink: 0,
                boxShadow: `0 6px 16px -3px ${gradient[1]}66, 0 2px 4px rgba(15,23,42,0.08)`,
            }}
        >
            {initials}
        </div>
    );
};
